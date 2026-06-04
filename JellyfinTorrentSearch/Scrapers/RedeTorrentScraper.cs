using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using HtmlAgilityPack;
using Microsoft.Extensions.Logging;

namespace JellyfinTorrentSearch.Scrapers;

/// <summary>
/// Scraper para sites brasileiros de Torrent usando WordPress 
/// (Como ComandoTorrents, RedeTorrent, etc).
/// </summary>
public class RedeTorrentScraper
{
    private readonly ILogger _logger;
    private readonly HttpClient _httpClient;

    public RedeTorrentScraper(ILogger logger, IHttpClientFactory httpClientFactory)
    {
        _logger = logger;
        _httpClientFactory = httpClientFactory.CreateClient("TorrentSearch_RedeTorrent");
        _httpClient.DefaultRequestHeaders.UserAgent.ParseAdd(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
        _httpClient.Timeout = TimeSpan.FromSeconds(20);
    }

    /// <summary>
    /// Busca torrents em um site WordPress brasileiro genérico.
    /// </summary>
    public async Task<List<TorrentResult>> SearchAsync(string query, string domain, int maxResults = 10, CancellationToken ct = default)
    {
        var baseUrl = domain.StartsWith("http") ? domain : $"https://{domain}";
        var searchUrl = $"{baseUrl}/?s={Uri.EscapeDataString(query)}";
        var results = new List<TorrentResult>();

        _logger.LogInformation("[TorrentSearch] Buscando na RedeTorrent: {Url}", searchUrl);

        try
        {
            var html = await _httpClient.GetStringAsync(searchUrl, ct);
            var doc = new HtmlDocument();
            doc.LoadHtml(html);

            // Em temas WP padrão, os posts estão em tags <article> ou <div class="post">
            var articles = doc.DocumentNode.SelectNodes("//article | //div[contains(@class,'post')] | //div[contains(@class,'item')]");
            
            if (articles == null)
            {
                _logger.LogWarning("[TorrentSearch] Nenhum resultado na RedeTorrent para: {Query}", query);
                return results;
            }

            var tasks = new List<Task>();
            var semaphore = new SemaphoreSlim(3); // Evita ban no IP limitando requests simultâneos

            foreach (var article in articles.Take(maxResults))
            {
                var titleNode = article.SelectSingleNode(".//h2/a | .//h1/a | .//h3/a");
                if (titleNode == null) continue;

                var title = HtmlEntity.DeEntitize(titleNode.InnerText.Trim());
                var detailUrl = titleNode.GetAttributeValue("href", "");

                if (string.IsNullOrEmpty(detailUrl)) continue;

                var result = new TorrentResult
                {
                    Title = title,
                    DetailUrl = detailUrl,
                    SourceName = "RedeTorrent/BR",
                    IsPtBr = true, // Assumimos que o site inteiro é PT-BR
                    Quality = ExtractQuality(title),
                    Language = ExtractLanguage(title),
                    Seeders = 100,  // Sites WP não mostram seeders na busca
                    Leechers = 10,
                    SizeFormatted = "A verificar"
                };

                results.Add(result);

                tasks.Add(Task.Run(async () =>
                {
                    await semaphore.WaitAsync(ct);
                    try
                    {
                        await FetchDetailsAsync(result, ct);
                    }
                    finally
                    {
                        semaphore.Release();
                    }
                }, ct));
            }

            await Task.WhenAll(tasks);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[TorrentSearch] Erro ao buscar na RedeTorrent: {Error}", ex.Message);
        }

        // Remove os que não conseguimos pegar o Magnet
        return results.Where(r => !string.IsNullOrEmpty(r.MagnetUri)).ToList();
    }

    private async Task FetchDetailsAsync(TorrentResult result, CancellationToken ct)
    {
        try
        {
            var html = await _httpClient.GetStringAsync(result.DetailUrl, ct);
            var doc = new HtmlDocument();
            doc.LoadHtml(html);

            // Pega o primeiro link magnet que encontrar
            var magnetNode = doc.DocumentNode.SelectSingleNode("//a[starts-with(@href,'magnet:')]");
            if (magnetNode != null)
            {
                result.MagnetUri = magnetNode.GetAttributeValue("href", "");
            }

            // Tenta achar o tamanho do arquivo no texto (Padrão: "Tamanho: 2.5 GB")
            var sizeMatch = Regex.Match(html, @"Tamanho[^\d]*(\d+(?:[\.,]\d+)?\s*(?:GB|MB|KB))", RegexOptions.IgnoreCase);
            if (sizeMatch.Success)
            {
                result.SizeFormatted = sizeMatch.Groups[1].Value.Trim();
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug("[TorrentSearch] Erro ao extrair magnet de {Url}: {Error}", result.DetailUrl, ex.Message);
        }
    }

    private static string ExtractQuality(string title)
    {
        var patterns = new (string Pattern, string Label)[]
        {
            (@"4K|2160p", "4K"),
            (@"1080p", "1080p"),
            (@"720p", "720p"),
            (@"WEB-?DL|WEBRip", "WEB-DL"),
            (@"Blu-?Ray|BDRip", "BluRay")
        };
        var matches = patterns.Where(p => Regex.IsMatch(title, p.Pattern, RegexOptions.IgnoreCase)).Select(p => p.Label);
        return string.Join(" ", matches) is { Length: > 0 } res ? res : "N/A";
    }

    private static string ExtractLanguage(string title)
    {
        if (Regex.IsMatch(title, @"DUAL", RegexOptions.IgnoreCase)) return "Dual Áudio";
        if (Regex.IsMatch(title, @"LEGENDADO", RegexOptions.IgnoreCase)) return "Legendado";
        return "Dublado";
    }
}
