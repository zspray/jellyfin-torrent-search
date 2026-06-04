/**
 * Jellyfin Torrent Search - Backend Proxy
 * 
 * Servidor Express que atua como proxy entre o plugin Jellyfin
 * e o Jackett para busca de torrents, com integração opcional
 * com qBittorrent para downloads diretos.
 */

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

// Carrega variáveis de ambiente do .env
require('./envLoader');

const app = express();
const PORT = process.env.PORT || 3333;

// ============================================
// Middleware
// ============================================

app.use(express.json());
app.use(cors({
    origin: process.env.JELLYFIN_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true
}));

// Serve arquivos estáticos do plugin
app.use('/plugin', express.static(path.join(__dirname, '..', 'plugin')));

// ============================================
// Rotas
// ============================================

/**
 * GET /api/health
 * Verifica se o servidor está ativo
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        jackett: process.env.JACKETT_URL || 'não configurado',
        timestamp: new Date().toISOString()
    });
});

/**
 * GET /api/search?q=Nome+do+Filme&category=movies
 * Busca torrents via Jackett
 * 
 * Query params:
 *   q        - Termo de busca (obrigatório)
 *   category - Categoria: movies, tv, anime (padrão: movies)
 *   indexer  - ID do indexador específico (padrão: all)
 *   limit    - Limite de resultados (padrão: 50)
 */
app.get('/api/search', async (req, res) => {
    try {
        const { q, category, indexer, limit } = req.query;

        if (!q) {
            return res.status(400).json({ error: 'Parâmetro "q" é obrigatório' });
        }

        const jackettUrl = process.env.JACKETT_URL;
        const apiKey = process.env.JACKETT_API_KEY;

        if (!jackettUrl || !apiKey || apiKey === 'SUA_API_KEY_AQUI') {
            return res.status(500).json({
                error: 'Jackett não configurado. Edite o arquivo .env com a URL e API Key do Jackett.'
            });
        }

        // Mapeia categorias para IDs do Torznab
        const categoryMap = {
            movies: '2000',      // Movies
            tv: '5000',          // TV
            anime: '5070',       // Anime
            all: ''
        };

        const selectedIndexer = indexer || 'all';
        const categoryId = categoryMap[category] || categoryMap.movies;
        const maxResults = Math.min(parseInt(limit) || 50, 100);

        // Monta a URL da API do Jackett
        let searchUrl = `${jackettUrl}/api/v2.0/indexers/${selectedIndexer}/results?apikey=${apiKey}&Query=${encodeURIComponent(q)}`;

        if (categoryId) {
            searchUrl += `&Category%5B%5D=${categoryId}`;
        }

        console.log(`[BUSCA] Pesquisando: "${q}" | Categoria: ${category || 'movies'} | Indexador: ${selectedIndexer}`);

        const response = await fetch(searchUrl, {
            timeout: 30000,
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Jackett retornou status ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        let results = data.Results || [];

        // Filtra e formata os resultados
        results = results
            .map(item => ({
                title: item.Title || 'Sem título',
                tracker: item.Tracker || item.TrackerId || 'Desconhecido',
                size: item.Size || 0,
                sizeFormatted: formatBytes(item.Size || 0),
                seeders: item.Seeders || 0,
                leechers: item.Peers || 0,
                magnetUri: item.MagnetUri || null,
                downloadUrl: item.Link || null,
                guid: item.Guid || null,
                publishDate: item.PublishDate || null,
                category: item.CategoryDesc || 'N/A',
                imdbId: item.Imdb || null,
                quality: extractQuality(item.Title || ''),
                language: extractLanguage(item.Title || ''),
                isPtBr: isPtBr(item.Title || '')
            }))
            .sort((a, b) => {
                // Prioriza PT-BR, depois por seeders
                if (a.isPtBr && !b.isPtBr) return -1;
                if (!a.isPtBr && b.isPtBr) return 1;
                return b.seeders - a.seeders;
            })
            .slice(0, maxResults);

        const ptBrCount = results.filter(r => r.isPtBr).length;
        console.log(`[BUSCA] Encontrados: ${results.length} resultados (${ptBrCount} PT-BR)`);

        res.json({
            query: q,
            total: results.length,
            ptBrCount,
            results
        });

    } catch (error) {
        console.error('[ERRO] Falha na busca:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/indexers
 * Lista indexadores configurados no Jackett
 */
app.get('/api/indexers', async (req, res) => {
    try {
        const jackettUrl = process.env.JACKETT_URL;
        const apiKey = process.env.JACKETT_API_KEY;

        if (!jackettUrl || !apiKey || apiKey === 'SUA_API_KEY_AQUI') {
            return res.status(500).json({ error: 'Jackett não configurado' });
        }

        const response = await fetch(`${jackettUrl}/api/v2.0/indexers?apikey=${apiKey}`, {
            timeout: 10000
        });

        const indexers = await response.json();

        const formatted = indexers
            .filter(i => i.configured)
            .map(i => ({
                id: i.id,
                name: i.name,
                type: i.type,
                language: i.language,
                categories: (i.caps || []).map(c => c.Name).slice(0, 5)
            }));

        res.json({ indexers: formatted });

    } catch (error) {
        console.error('[ERRO] Falha ao listar indexadores:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/download
 * Envia um torrent para o qBittorrent
 * 
 * Body:
 *   magnetUri   - Link magnet (preferido)
 *   downloadUrl - URL do .torrent (alternativa)
 *   savePath    - Pasta de destino (opcional)
 */
app.post('/api/download', async (req, res) => {
    try {
        const { magnetUri, downloadUrl, savePath } = req.body;

        if (!magnetUri && !downloadUrl) {
            return res.status(400).json({ error: 'magnetUri ou downloadUrl é obrigatório' });
        }

        const qbitUrl = process.env.QBIT_URL;
        const qbitUser = process.env.QBIT_USER;
        const qbitPass = process.env.QBIT_PASS;

        if (!qbitUrl) {
            return res.status(500).json({
                error: 'qBittorrent não configurado. Edite o arquivo .env.'
            });
        }

        // 1. Faz login no qBittorrent
        const loginRes = await fetch(`${qbitUrl}/api/v2/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `username=${encodeURIComponent(qbitUser || 'admin')}&password=${encodeURIComponent(qbitPass || 'adminadmin')}`
        });

        const cookie = loginRes.headers.get('set-cookie');
        if (!cookie) {
            throw new Error('Falha ao autenticar no qBittorrent');
        }

        // 2. Adiciona o torrent
        const formData = new URLSearchParams();
        if (magnetUri) {
            formData.append('urls', magnetUri);
        } else {
            formData.append('urls', downloadUrl);
        }

        if (savePath || process.env.DOWNLOAD_PATH) {
            formData.append('savepath', savePath || process.env.DOWNLOAD_PATH);
        }

        const addRes = await fetch(`${qbitUrl}/api/v2/torrents/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookie
            },
            body: formData.toString()
        });

        if (addRes.ok) {
            const torrentName = magnetUri
                ? decodeURIComponent(magnetUri.match(/dn=([^&]+)/)?.[1] || 'torrent')
                : 'torrent';

            console.log(`[DOWNLOAD] Torrent adicionado: ${torrentName}`);
            res.json({
                success: true,
                message: `Torrent adicionado ao qBittorrent: ${torrentName}`
            });
        } else {
            throw new Error(`qBittorrent retornou status ${addRes.status}`);
        }

    } catch (error) {
        console.error('[ERRO] Falha no download:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/downloads/status
 * Retorna status dos downloads ativos no qBittorrent
 */
app.get('/api/downloads/status', async (req, res) => {
    try {
        const qbitUrl = process.env.QBIT_URL;
        const qbitUser = process.env.QBIT_USER;
        const qbitPass = process.env.QBIT_PASS;

        if (!qbitUrl) {
            return res.status(500).json({ error: 'qBittorrent não configurado' });
        }

        // Login
        const loginRes = await fetch(`${qbitUrl}/api/v2/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `username=${encodeURIComponent(qbitUser || 'admin')}&password=${encodeURIComponent(qbitPass || 'adminadmin')}`
        });

        const cookie = loginRes.headers.get('set-cookie');
        if (!cookie) throw new Error('Falha ao autenticar');

        // Busca torrents ativos
        const torrentsRes = await fetch(`${qbitUrl}/api/v2/torrents/info?filter=active`, {
            headers: { 'Cookie': cookie }
        });

        const torrents = await torrentsRes.json();

        const formatted = torrents.map(t => ({
            name: t.name,
            progress: Math.round(t.progress * 100),
            dlspeed: formatBytes(t.dlspeed) + '/s',
            size: formatBytes(t.size),
            state: translateState(t.state),
            eta: t.eta > 0 ? formatTime(t.eta) : 'N/A'
        }));

        res.json({ downloads: formatted });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// Funções auxiliares
// ============================================

/**
 * Formata bytes para string legível
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Formata tempo em segundos para string legível
 */
function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

/**
 * Extrai qualidade do título do torrent
 */
function extractQuality(title) {
    const patterns = [
        { regex: /4K|2160p/i, label: '4K' },
        { regex: /1080p/i, label: '1080p' },
        { regex: /720p/i, label: '720p' },
        { regex: /480p/i, label: '480p' },
        { regex: /HDTV/i, label: 'HDTV' },
        { regex: /WEB-?DL/i, label: 'WEB-DL' },
        { regex: /WEB-?Rip/i, label: 'WEBRip' },
        { regex: /Blu-?Ray|BDRip|BRRip/i, label: 'BluRay' },
        { regex: /HDRip/i, label: 'HDRip' },
        { regex: /CAMRip|CAM|TS|HDTS/i, label: 'CAM' },
        { regex: /REMUX/i, label: 'REMUX' }
    ];

    const matches = patterns.filter(p => p.regex.test(title));
    return matches.map(m => m.label).join(' ') || 'N/A';
}

/**
 * Extrai informação de idioma do título
 */
function extractLanguage(title) {
    const upper = title.toUpperCase();
    const langs = [];

    if (/DUAL|DUBLADO|NACIONAL|PT-BR|PTBR|PORTUGUESE|LEGENDADO/i.test(title)) {
        if (/DUAL/i.test(title)) langs.push('Dual Áudio');
        if (/DUBLADO|NACIONAL/i.test(title)) langs.push('Dublado');
        if (/LEGENDADO/i.test(title)) langs.push('Legendado');
        if (/PT-BR|PTBR/i.test(title) && langs.length === 0) langs.push('PT-BR');
    }

    return langs.length > 0 ? langs.join(', ') : 'Inglês';
}

/**
 * Verifica se o torrent é PT-BR (dublado, legendado ou dual)
 */
function isPtBr(title) {
    return /DUAL|DUBLADO|NACIONAL|PT-BR|PTBR|LEGENDADO|PORTUGUESE|BRASILEIRO/i.test(title);
}

/**
 * Traduz estados do qBittorrent
 */
function translateState(state) {
    const states = {
        'downloading': '⬇️ Baixando',
        'uploading': '⬆️ Enviando',
        'pausedDL': '⏸️ Pausado',
        'pausedUP': '✅ Completo',
        'stalledDL': '⏳ Aguardando',
        'stalledUP': '✅ Semeando',
        'checkingDL': '🔍 Verificando',
        'queuedDL': '📋 Na fila',
        'error': '❌ Erro'
    };
    return states[state] || state;
}

// ============================================
// Inicialização
// ============================================

app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║     🎬 Jellyfin Torrent Search - Backend        ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  Servidor: http://localhost:${PORT}                 ║`);
    console.log(`║  Jackett:  ${(process.env.JACKETT_URL || 'NÃO CONFIGURADO').padEnd(37)}║`);
    console.log(`║  Jellyfin: ${(process.env.JELLYFIN_URL || 'NÃO CONFIGURADO').padEnd(37)}║`);
    console.log(`║  qBit:     ${(process.env.QBIT_URL || 'NÃO CONFIGURADO').padEnd(37)}║`);
    console.log('╠══════════════════════════════════════════════════╣');
    console.log('║  Plugin:   /plugin/jellyfin-torrent-search.js   ║');
    console.log('║  API:      /api/search?q=nome+do+filme          ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
});
