using MediaBrowser.Model.Plugins;

namespace JellyfinTorrentSearch;

/// <summary>
/// Configurações do plugin.
/// </summary>
public class PluginConfiguration : BasePluginConfiguration
{
    /// <summary>
    /// Domínio do 1337x (pode mudar de tempos em tempos).
    /// </summary>
    public string X1337Domain { get; set; } = "1337x.to";

    /// <summary>
    /// Máximo de resultados por busca.
    /// </summary>
    public int MaxResults { get; set; } = 40;

    /// <summary>
    /// Filtrar apenas PT-BR por padrão.
    /// </summary>
    public bool PtBrOnly { get; set; } = false;

    /// <summary>
    /// URL do qBittorrent (opcional, para download direto).
    /// </summary>
    public string QBitUrl { get; set; } = string.Empty;

    /// <summary>
    /// Usuário do qBittorrent.
    /// </summary>
    public string QBitUser { get; set; } = "admin";

    /// <summary>
    /// Senha do qBittorrent.
    /// </summary>
    public string QBitPassword { get; set; } = string.Empty;

    /// <summary>
    /// Pasta de download padrão.
    /// </summary>
    public string DownloadPath { get; set; } = string.Empty;
}
