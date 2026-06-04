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
/// Scraper para o site 1337x - busca e extrai informações de torrents.
/// </summary>
public class X1337Scraper
{
    private readonly ILogger _logger;
    private readonly HttpClient _httpClient;

    public X1337Scraper(ILogger logger, IHttpClientFactory httpClientFactory)
    {
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient("TorrentSearch");
        _httpClient.DefaultRequestHeaders.UserAgent.ParseAdd(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
        _httpClient.Timeout = TimeSpan.FromSeconds(20);
    }

    /// <summary>
    /// Busca torrents no 1337x.
    /// </summary>
    public async Task<List<TorrentResult>> SearchAsync(string query, string category = "Movies", int maxResults = 40, CancellationToken ct = default)
    {
        var config = Plugin.Instance?.Configuration;
        var domain = config?.X1337Domain ?? "1337x.to";
        var baseUrl = $"https://{domain}";

        // Categorias válidas do 1337x
        var categoryPath = category.ToLowerInvariant() switch
        {
            "movies" or "filmes" => "Movies",
            "tv" or "series" or "séries" => "TV",
            "anime" => "Anime",
            _ => ""
        };

        var searchUrl = string.IsNullOrEmpty(categoryPath)
            ? $"{baseUrl}/search/{Uri.EscapeDataString(query)}/1/"
            : $"{baseUrl}/category-search/{Uri.EscapeDataString(query)}/{categoryPath}/1/";

        _logger.LogInformation("[TorrentSearch] Buscando: {Query} em {Url}", query, searchUrl);

        var results = new List<TorrentResult>();

        try
        {
            var html = await _httpClient.GetStringAsync(searchUrl, ct);
            var doc = new HtmlDocument();
            doc.LoadHtml(html);

            var rows = doc.DocumentNode.SelectNodes("//table[contains(@class,'table-list')]//tbody//tr");
            if (rows == null)
            {
                _logger.LogWarning("[TorrentSearch] Nenhum resultado encontrado para: {Query}", query);
                return results;
            }

            var tasks = new List<Task>();
            var semaphore = new SemaphoreSlim(5); // Máximo 5 requests paralelos

            foreach (var row in rows.Take(maxResults))
            {
                try
                {
                    var nameCell = row.SelectSingleNode(".//td[contains(@class,'coll-1')]");
                    var linkNode = nameCell?.SelectNodes(".//a")?
                        .FirstOrDefault(a => a.GetAttributeValue("href", "").StartsWith("/torrent/"));

                    if (linkNode == null) continue;

                    var title = HtmlEntity.DeEntitize(linkNode.InnerText.Trim());
                    var detailPath = linkNode.GetAttributeValue("href", "");

                    var seedNode = row.SelectSingleNode(".//td[contains(@class,'coll-2')]");
                    var leechNode = row.SelectSingleNode(".//td[contains(@class,'coll-3')]");
                    var sizeNode = row.SelectSingleNode(".//td[contains(@class,'coll-4')]");

                    // O size às vezes contém um span oculto, pegar só o texto principal
                    var sizeText = sizeNode?.SelectSingleNode(".//text()")?.InnerText.Trim() ?? "N/A";

                    int.TryParse(seedNode?.InnerText.Trim(), out var seeders);
                    int.TryParse(leechNode?.InnerText.Trim(), out var leechers);

                    var result = new TorrentResult
                    {
                        Title = title,
                        DetailUrl = baseUrl + detailPath,
                        Seeders = seeders,
                        Leechers = leechers,
                        SizeFormatted = sizeText,
                        Quality = ExtractQuality(title),
                        Language = ExtractLanguage(title),
                        IsPtBr = IsPtBr(title)
                    };

                    results.Add(result);

                    // Busca magnet link em paralelo
                    tasks.Add(Task.Run(async () =>
                    {
                        await semaphore.WaitAsync(ct);
                        try
                        {
                            await FetchMagnetAsync(result, ct);
                        }
                        finally
                        {
                            semaphore.Release();
                        }
                    }, ct));
                }
                catch (Exception ex)
                {
                    _logger.LogDebug("[TorrentSearch] Erro ao parsear linha: {Error}", ex.Message);
                }
            }

            await Task.WhenAll(tasks);

            // Ordena: PT-BR primeiro, depois por seeders
            results = results
                .OrderByDescending(r => r.IsPtBr)
                .ThenByDescending(r => r.Seeders)
                .ToList();

            _logger.LogInformation("[TorrentSearch] Encontrados {Total} resultados ({PtBr} PT-BR)",
                results.Count, results.Count(r => r.IsPtBr));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[TorrentSearch] Erro na busca: {Error}", ex.Message);
        }

        return results;
    }

    /// <summary>
    /// Busca o magnet link na página de detalhes do torrent.
    /// </summary>
    private async Task FetchMagnetAsync(TorrentResult result, CancellationToken ct)
    {
        try
        {
            var html = await _httpClient.GetStringAsync(result.DetailUrl, ct);
            var doc = new HtmlDocument();
            doc.LoadHtml(html);

            // Busca link magnet
            var magnetNode = doc.DocumentNode.SelectSingleNode("//a[starts-with(@href,'magnet:')]");
            if (magnetNode != null)
            {
                result.MagnetUri = magnetNode.GetAttributeValue("href", "");
            }

            // Tenta extrair hash do magnet para fallback
            if (string.IsNullOrEmpty(result.MagnetUri))
            {
                var hashNode = doc.DocumentNode.SelectSingleNode("//*[contains(@class,'infohash')]//span");
                if (hashNode != null)
                {
                    var hash = hashNode.InnerText.Trim();
                    result.MagnetUri = $"magnet:?xt=urn:btih:{hash}&dn={Uri.EscapeDataString(result.Title)}";
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug("[TorrentSearch] Falha ao buscar magnet de {Url}: {Error}",
                result.DetailUrl, ex.Message);
        }
    }

    /// <summary>
    /// Extrai informação de qualidade do título.
    /// </summary>
    private static string ExtractQuality(string title)
    {
        var patterns = new (string Pattern, string Label)[]
        {
            (@"4K|2160p", "4K"),
            (@"1080p", "1080p"),
            (@"720p", "720p"),
            (@"480p", "480p"),
            (@"WEB-?DL", "WEB-DL"),
            (@"WEB-?Rip", "WEBRip"),
            (@"Blu-?Ray|BDRip|BRRip", "BluRay"),
            (@"REMUX", "REMUX"),
            (@"HDRip", "HDRip"),
            (@"HDTV", "HDTV"),
            (@"CAMRip|CAM\b|TS\b|HDTS", "CAM")
        };

        var matches = patterns
            .Where(p => Regex.IsMatch(title, p.Pattern, RegexOptions.IgnoreCase))
            .Select(p => p.Label);

        return string.Join(" ", matches) is { Length: > 0 } result ? result : "N/A";
    }

    /// <summary>
    /// Extrai informação de idioma do título.
    /// </summary>
    private static string ExtractLanguage(string title)
    {
        var langs = new List<string>();
        if (Regex.IsMatch(title, @"DUAL", RegexOptions.IgnoreCase)) langs.Add("Dual Áudio");
        if (Regex.IsMatch(title, @"DUBLADO|NACIONAL", RegexOptions.IgnoreCase)) langs.Add("Dublado");
        if (Regex.IsMatch(title, @"LEGENDADO", RegexOptions.IgnoreCase)) langs.Add("Legendado");
        if (langs.Count == 0 && Regex.IsMatch(title, @"PT-BR|PTBR|PORTUGUESE", RegexOptions.IgnoreCase))
            langs.Add("PT-BR");

        return langs.Count > 0 ? string.Join(", ", langs) : "Inglês";
    }

    /// <summary>
    /// Verifica se o torrent é PT-BR.
    /// </summary>
    private static bool IsPtBr(string title) =>
        Regex.IsMatch(title, @"DUAL|DUBLADO|NACIONAL|PT-BR|PTBR|LEGENDADO|PORTUGUESE|BRASILEIRO",
            RegexOptions.IgnoreCase);
}

/// <summary>
/// Modelo de resultado de torrent.
/// </summary>
public class TorrentResult
{
    public string Title { get; set; } = string.Empty;
    public string SourceName { get; set; } = "1337x";
    public string DetailUrl { get; set; } = string.Empty;
    public string MagnetUri { get; set; } = string.Empty;
    public int Seeders { get; set; }
    public int Leechers { get; set; }
    public string SizeFormatted { get; set; } = "N/A";
    public string Quality { get; set; } = "N/A";
    public string Language { get; set; } = "Inglês";
    public bool IsPtBr { get; set; }
}
