using System;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using JellyfinTorrentSearch.Scrapers;
using MediaBrowser.Controller.Library;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace JellyfinTorrentSearch.Api;

/// <summary>
/// Controller da API de busca de torrents.
/// Endpoints acessíveis diretamente pela UI do Jellyfin.
/// </summary>
[ApiController]
[Route("Torrents")]
[Authorize]
public class TorrentSearchController : ControllerBase
{
    private readonly ILogger<TorrentSearchController> _logger;
    private readonly IHttpClientFactory _httpClientFactory;

    public TorrentSearchController(
        ILogger<TorrentSearchController> logger,
        IHttpClientFactory httpClientFactory)
    {
        _logger = logger;
        _httpClientFactory = httpClientFactory;
    }

    /// <summary>
    /// Busca torrents no 1337x.
    /// </summary>
    /// <param name="query">Termo de busca.</param>
    /// <param name="category">Categoria: Movies, TV, Anime (padrão: Movies).</param>
    /// <response code="200">Lista de torrents encontrados.</response>
    [HttpGet("Search")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Search(
        [FromQuery, Required] string query,
        [FromQuery] string category = "Movies",
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return BadRequest(new { error = "Parâmetro 'query' é obrigatório." });
        }

        var config = Plugin.Instance?.Configuration;
        var maxResults = config?.MaxResults ?? 40;

        var tasks = new List<Task<List<TorrentResult>>>();
        
        // 1337x Scraper
        var scraper1337 = new X1337Scraper(_logger, _httpClientFactory);
        tasks.Add(scraper1337.SearchAsync(query, category, maxResults, ct));

        // RedeTorrent Scraper
        if (config == null || config.UseRedeTorrent)
        {
            var redeScraper = new RedeTorrentScraper(_logger, _httpClientFactory);
            var redeDomain = config?.RedeTorrentDomain ?? "redetorrent.com";
            tasks.Add(redeScraper.SearchAsync(query, redeDomain, 10, ct));
        }

        var resultsArrays = await Task.WhenAll(tasks);
        var results = resultsArrays.SelectMany(x => x).ToList();

        // Ordena: PT-BR primeiro, depois por seeders (RedeTorrent sempre tem IsPtBr=true e seeders altos artificiais para ficar no topo)
        results = results
            .OrderByDescending(r => r.IsPtBr)
            .ThenByDescending(r => r.Seeders)
            .ToList();

        // Filtra só PT-BR se configurado
        if (config?.PtBrOnly == true)
        {
            results = results.Where(r => r.IsPtBr).ToList();
        }

        return Ok(new
        {
            query,
            total = results.Count,
            ptBrCount = results.Count(r => r.IsPtBr),
            results
        });
    }

    /// <summary>
    /// Envia um torrent para o qBittorrent.
    /// </summary>
    [HttpPost("Download")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Download([FromBody] DownloadRequest request, CancellationToken ct = default)
    {
        var config = Plugin.Instance?.Configuration;

        if (string.IsNullOrEmpty(config?.QBitUrl))
        {
            return BadRequest(new { error = "qBittorrent não configurado. Vá em Painel > Plugins > Torrent Search PT-BR." });
        }

        if (string.IsNullOrEmpty(request.MagnetUri) && string.IsNullOrEmpty(request.DownloadUrl))
        {
            return BadRequest(new { error = "magnetUri ou downloadUrl é obrigatório." });
        }

        try
        {
            var client = _httpClientFactory.CreateClient("TorrentSearch");

            // 1. Login no qBittorrent
            var loginContent = new FormUrlEncodedContent(new[]
            {
                new System.Collections.Generic.KeyValuePair<string, string>("username", config.QBitUser ?? "admin"),
                new System.Collections.Generic.KeyValuePair<string, string>("password", config.QBitPassword ?? "")
            });

            var loginRes = await client.PostAsync($"{config.QBitUrl}/api/v2/auth/login", loginContent, ct);
            var cookie = loginRes.Headers.GetValues("Set-Cookie").FirstOrDefault();

            if (string.IsNullOrEmpty(cookie))
            {
                return StatusCode(502, new { error = "Falha ao autenticar no qBittorrent." });
            }

            // 2. Adiciona o torrent
            var addContent = new FormUrlEncodedContent(new[]
            {
                new System.Collections.Generic.KeyValuePair<string, string>("urls", request.MagnetUri ?? request.DownloadUrl ?? ""),
                new System.Collections.Generic.KeyValuePair<string, string>("savepath", request.SavePath ?? config.DownloadPath ?? "")
            });

            using var addRequest = new HttpRequestMessage(HttpMethod.Post, $"{config.QBitUrl}/api/v2/torrents/add")
            {
                Content = addContent
            };
            addRequest.Headers.Add("Cookie", cookie);

            var addRes = await client.SendAsync(addRequest, ct);

            if (addRes.IsSuccessStatusCode)
            {
                _logger.LogInformation("[TorrentSearch] Torrent enviado ao qBittorrent");
                return Ok(new { success = true, message = "Torrent adicionado ao qBittorrent!" });
            }

            return StatusCode(502, new { error = $"qBittorrent retornou: {addRes.StatusCode}" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[TorrentSearch] Erro ao enviar torrent");
            return StatusCode(500, new { error = ex.Message });
        }
    }
}

/// <summary>
/// Request body para download de torrent.
/// </summary>
public class DownloadRequest
{
    public string? MagnetUri { get; set; }
    public string? DownloadUrl { get; set; }
    public string? SavePath { get; set; }
}
