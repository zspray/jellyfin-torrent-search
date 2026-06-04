using System;
using System.Collections.Generic;
using Jellyfin.Data.Enums;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

namespace JellyfinTorrentSearch;

/// <summary>
/// Plugin principal - Busca de Torrents PT-BR.
/// </summary>
public class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = this;
    }

    /// <inheritdoc />
    public override string Name => "Torrent Search PT-BR";

    /// <inheritdoc />
    public override string Description => "Busca torrents PT-BR (dublado/legendado) diretamente do Jellyfin via 1337x.";

    /// <inheritdoc />
    public override Guid Id => new("a1b2c3d4-e5f6-7890-abcd-ef1234567890");

    /// <summary>
    /// Instância estática do plugin.
    /// </summary>
    public static Plugin? Instance { get; private set; }

    /// <inheritdoc />
    public IEnumerable<PluginPageInfo> GetPages()
    {
        return new[]
        {
            new PluginPageInfo
            {
                Name = "TorrentSearchConfig",
                EmbeddedResourcePath = "JellyfinTorrentSearch.Web.configPage.html",
                DisplayName = "Torrent Search PT-BR"
            },
            new PluginPageInfo
            {
                Name = "TorrentSearchJs",
                EmbeddedResourcePath = "JellyfinTorrentSearch.Web.torrentSearch.js"
            }
        };
    }
}
