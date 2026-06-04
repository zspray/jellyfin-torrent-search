# 🎬 Jellyfin Torrent Search PT-BR

[![Build & Release](https://github.com/zspray/jellyfin-torrent-search/actions/workflows/release.yml/badge.svg)](https://github.com/zspray/jellyfin-torrent-search/actions)

Plugin para o Jellyfin que busca torrents **PT-BR** (dublado, legendado, dual áudio) diretamente da interface, sem nenhuma dependência externa.

![Screenshot](https://img.shields.io/badge/Jellyfin-10.10+-00A4DC?style=for-the-badge&logo=jellyfin&logoColor=white)
![.NET](https://img.shields.io/badge/.NET-8.0-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)

---

## ✨ Funcionalidades

- 🇧🇷 **Prioridade PT-BR** — Resultados dublados/legendados aparecem primeiro
- 🔍 **Busca integrada** — Botão "Buscar Torrents" nas páginas de filmes/séries
- 🏷️ **Badges de qualidade** — 4K, 1080p, 720p, BluRay, WEB-DL, REMUX
- 🧲 **Magnet links** — Copie para a área de transferência com um clique
- 📥 **qBittorrent** — Envio direto para download (opcional)
- ⚡ **Zero dependências** — Não precisa de Jackett, Prowlarr ou backend externo
- 🎨 **UI premium** — Design moderno com animações e filtros rápidos

## 📦 Instalação

### Via Catálogo do Jellyfin (Recomendado)

1. No Jellyfin, vá em **Painel de Controle → Plugins → Repositórios**
2. Clique em **➕ (Adicionar)**
3. Preencha:
   - **Nome:** `Torrent Search PT-BR`
   - **URL:** `https://raw.githubusercontent.com/zspray/jellyfin-torrent-search/main/manifest.json`
4. Clique em **Salvar**
5. Vá na aba **Catálogo**, encontre "Torrent Search PT-BR" e clique em **Instalar**
6. Reinicie o Jellyfin

### Instalação Manual

1. Baixe o `.zip` da [última release](https://github.com/zspray/jellyfin-torrent-search/releases/latest)
2. Extraia os arquivos na pasta de plugins do Jellyfin:
   - **Windows:** `C:\ProgramData\Jellyfin\Server\plugins\TorrentSearch\`
   - **Linux:** `/var/lib/jellyfin/plugins/TorrentSearch/`
   - **Docker/ZimaOS:** `/config/plugins/TorrentSearch/`
3. Reinicie o Jellyfin

## 🔧 Configuração

Após instalar, vá em **Painel de Controle → Plugins → Torrent Search PT-BR**:

| Opção | Descrição | Padrão |
|---|---|---|
| Domínio 1337x | Endereço do site (mude se o domínio mudar) | `1337x.to` |
| Máx. resultados | Quantidade de resultados por busca | `40` |
| Apenas PT-BR | Filtrar somente resultados em português | Desativado |
| qBittorrent URL | URL do qBittorrent para downloads diretos | — |
| qBittorrent User/Pass | Credenciais do qBittorrent | — |

## 🚀 Como Usar

1. Abra qualquer filme ou série no Jellyfin
2. Clique no botão **🧲 Buscar Torrents**
3. Use os filtros (PT-BR, 1080p, 4K, 720p)
4. Copie o magnet link ou envie direto pro qBittorrent

> **Dica:** Adicione "dublado" ou "dual" ao nome para encontrar mais resultados PT-BR.

## 🛠️ Compilar do Código-Fonte

```bash
# Requer .NET 8 SDK
cd JellyfinTorrentSearch
dotnet publish -c Release -o ../dist
```

Os arquivos para instalação ficam na pasta `dist/`.

## 📄 Licença

MIT
