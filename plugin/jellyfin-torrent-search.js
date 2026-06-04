/**
 * Jellyfin Torrent Search Plugin - PT-BR
 * 
 * Script injetável no Jellyfin Web UI que adiciona um botão
 * "Buscar Torrents" nas páginas de filmes e séries.
 * 
 * Uso: Injete via plugin "Custom JavaScript" ou manualmente no index.html
 */

(function () {
    'use strict';

    // ==========================================
    // CONFIGURAÇÃO - Altere conforme necessário
    // ==========================================
    const CONFIG = {
        BACKEND_URL: 'http://localhost:3333',
        ACCENT_COLOR: '#7B2FF7',
        ACCENT_GRADIENT: 'linear-gradient(135deg, #7B2FF7, #C850C0, #FF6B9D)',
        DARK_BG: '#0D0D1A',
        CARD_BG: '#1A1A2E',
        SURFACE_BG: '#16213E',
        TEXT_PRIMARY: '#E8E8F0',
        TEXT_SECONDARY: '#9A9ABF',
        BORDER_COLOR: '#2A2A4A'
    };

    // ==========================================
    // ESTILOS CSS
    // ==========================================
    function injectStyles() {
        if (document.getElementById('jts-styles')) return;
        const style = document.createElement('style');
        style.id = 'jts-styles';
        style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

            .jts-btn {
                display: inline-flex; align-items: center; gap: 8px;
                padding: 10px 20px; border: none; border-radius: 12px;
                background: ${CONFIG.ACCENT_GRADIENT};
                color: #fff; font-family: 'Inter', sans-serif; font-weight: 600;
                font-size: 14px; cursor: pointer; transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(123,47,247,0.3);
                margin: 8px 4px;
            }
            .jts-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 25px rgba(123,47,247,0.5); }
            .jts-btn:active { transform: translateY(0); }
            .jts-btn svg { width: 18px; height: 18px; }

            /* OVERLAY / MODAL */
            .jts-overlay {
                position: fixed; inset: 0; z-index: 99999;
                background: rgba(0,0,0,0.85); backdrop-filter: blur(10px);
                display: flex; justify-content: center; align-items: flex-start;
                padding: 40px 20px; overflow-y: auto;
                animation: jts-fadeIn 0.3s ease;
            }
            @keyframes jts-fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes jts-slideUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }

            .jts-modal {
                width: 100%; max-width: 900px;
                background: ${CONFIG.DARK_BG};
                border: 1px solid ${CONFIG.BORDER_COLOR};
                border-radius: 20px; overflow: hidden;
                box-shadow: 0 25px 80px rgba(0,0,0,0.6);
                animation: jts-slideUp 0.4s ease;
                font-family: 'Inter', sans-serif;
            }

            /* HEADER */
            .jts-header {
                background: ${CONFIG.ACCENT_GRADIENT};
                padding: 24px 28px; display: flex;
                justify-content: space-between; align-items: center;
            }
            .jts-header h2 {
                margin: 0; color: #fff; font-size: 20px;
                font-weight: 700; display: flex; align-items: center; gap: 10px;
            }
            .jts-close {
                background: rgba(255,255,255,0.2); border: none;
                width: 36px; height: 36px; border-radius: 50%;
                color: #fff; font-size: 20px; cursor: pointer;
                display: flex; align-items: center; justify-content: center;
                transition: background 0.2s;
            }
            .jts-close:hover { background: rgba(255,255,255,0.35); }

            /* SEARCH BAR */
            .jts-search-bar {
                padding: 20px 28px; display: flex; gap: 10px;
                border-bottom: 1px solid ${CONFIG.BORDER_COLOR};
                flex-wrap: wrap;
            }
            .jts-search-input {
                flex: 1; min-width: 200px; padding: 12px 16px;
                background: ${CONFIG.SURFACE_BG};
                border: 1px solid ${CONFIG.BORDER_COLOR};
                border-radius: 10px; color: ${CONFIG.TEXT_PRIMARY};
                font-size: 14px; font-family: 'Inter', sans-serif;
                outline: none; transition: border-color 0.2s;
            }
            .jts-search-input:focus { border-color: ${CONFIG.ACCENT_COLOR}; }
            .jts-search-input::placeholder { color: ${CONFIG.TEXT_SECONDARY}; }

            .jts-select {
                padding: 12px 14px; background: ${CONFIG.SURFACE_BG};
                border: 1px solid ${CONFIG.BORDER_COLOR};
                border-radius: 10px; color: ${CONFIG.TEXT_PRIMARY};
                font-size: 13px; font-family: 'Inter', sans-serif;
                cursor: pointer; outline: none;
            }

            .jts-search-btn {
                padding: 12px 24px; border: none; border-radius: 10px;
                background: ${CONFIG.ACCENT_GRADIENT}; color: #fff;
                font-weight: 600; font-size: 14px; cursor: pointer;
                font-family: 'Inter', sans-serif;
                transition: opacity 0.2s;
            }
            .jts-search-btn:hover { opacity: 0.9; }
            .jts-search-btn:disabled { opacity: 0.5; cursor: not-allowed; }

            /* FILTERS */
            .jts-filters {
                padding: 12px 28px; display: flex; gap: 8px;
                border-bottom: 1px solid ${CONFIG.BORDER_COLOR};
                flex-wrap: wrap; align-items: center;
            }
            .jts-filter-chip {
                padding: 6px 14px; border-radius: 20px; font-size: 12px;
                border: 1px solid ${CONFIG.BORDER_COLOR};
                background: transparent; color: ${CONFIG.TEXT_SECONDARY};
                cursor: pointer; transition: all 0.2s;
                font-family: 'Inter', sans-serif;
            }
            .jts-filter-chip.active {
                background: ${CONFIG.ACCENT_COLOR};
                border-color: ${CONFIG.ACCENT_COLOR};
                color: #fff;
            }
            .jts-filter-chip:hover { border-color: ${CONFIG.ACCENT_COLOR}; }

            .jts-stats {
                margin-left: auto; font-size: 12px;
                color: ${CONFIG.TEXT_SECONDARY};
            }

            /* RESULTS */
            .jts-results { padding: 16px 28px 28px; }

            .jts-result-card {
                background: ${CONFIG.CARD_BG};
                border: 1px solid ${CONFIG.BORDER_COLOR};
                border-radius: 14px; padding: 16px 20px;
                margin-bottom: 10px; transition: all 0.2s;
                cursor: default;
            }
            .jts-result-card:hover {
                border-color: ${CONFIG.ACCENT_COLOR};
                transform: translateX(4px);
                box-shadow: 0 4px 20px rgba(123,47,247,0.15);
            }

            .jts-result-top {
                display: flex; justify-content: space-between;
                align-items: flex-start; gap: 12px; margin-bottom: 10px;
            }
            .jts-result-title {
                font-size: 14px; font-weight: 600;
                color: ${CONFIG.TEXT_PRIMARY};
                line-height: 1.4; flex: 1;
                word-break: break-word;
            }
            .jts-result-title.ptbr::before {
                content: '🇧🇷'; margin-right: 6px;
            }

            .jts-badges { display: flex; gap: 6px; flex-wrap: wrap; flex-shrink: 0; }
            .jts-badge {
                padding: 3px 8px; border-radius: 6px; font-size: 11px;
                font-weight: 600; white-space: nowrap;
            }
            .jts-badge-quality { background: rgba(123,47,247,0.2); color: #B57BFF; }
            .jts-badge-lang { background: rgba(46,213,115,0.15); color: #2ED573; }
            .jts-badge-cam { background: rgba(255,71,87,0.15); color: #FF4757; }

            .jts-result-meta {
                display: flex; gap: 16px; align-items: center;
                flex-wrap: wrap;
            }
            .jts-meta-item {
                display: flex; align-items: center; gap: 4px;
                font-size: 12px; color: ${CONFIG.TEXT_SECONDARY};
            }
            .jts-meta-item .seed { color: #2ED573; font-weight: 600; }
            .jts-meta-item .leech { color: #FF4757; font-weight: 600; }

            .jts-result-actions { margin-left: auto; display: flex; gap: 6px; }
            .jts-dl-btn {
                padding: 6px 14px; border: none; border-radius: 8px;
                font-size: 12px; font-weight: 600; cursor: pointer;
                font-family: 'Inter', sans-serif; transition: all 0.2s;
            }
            .jts-dl-magnet {
                background: rgba(123,47,247,0.15); color: #B57BFF;
            }
            .jts-dl-magnet:hover { background: rgba(123,47,247,0.3); }
            .jts-dl-qbit {
                background: rgba(46,213,115,0.15); color: #2ED573;
            }
            .jts-dl-qbit:hover { background: rgba(46,213,115,0.3); }

            /* LOADING & EMPTY */
            .jts-loading {
                text-align: center; padding: 60px 20px;
                color: ${CONFIG.TEXT_SECONDARY};
            }
            .jts-spinner {
                width: 40px; height: 40px; margin: 0 auto 16px;
                border: 3px solid ${CONFIG.BORDER_COLOR};
                border-top-color: ${CONFIG.ACCENT_COLOR};
                border-radius: 50%;
                animation: jts-spin 0.8s linear infinite;
            }
            @keyframes jts-spin { to { transform: rotate(360deg); } }

            .jts-empty {
                text-align: center; padding: 50px 20px;
                color: ${CONFIG.TEXT_SECONDARY};
            }
            .jts-empty-icon { font-size: 48px; margin-bottom: 12px; }
            .jts-error { color: #FF4757; }

            /* TOAST */
            .jts-toast {
                position: fixed; bottom: 30px; right: 30px;
                z-index: 999999; padding: 14px 22px;
                border-radius: 12px; color: #fff;
                font-family: 'Inter', sans-serif; font-size: 14px;
                font-weight: 500; box-shadow: 0 8px 30px rgba(0,0,0,0.4);
                animation: jts-slideUp 0.3s ease;
            }
            .jts-toast-success { background: linear-gradient(135deg, #2ED573, #1E90FF); }
            .jts-toast-error { background: linear-gradient(135deg, #FF4757, #FF6B81); }
            .jts-toast-info { background: ${CONFIG.ACCENT_GRADIENT}; }
        `;
        document.head.appendChild(style);
    }

    // ==========================================
    // UI BUILDER
    // ==========================================

    const MAGNET_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>`;

    function showToast(msg, type) {
        const old = document.querySelector('.jts-toast');
        if (old) old.remove();
        const t = document.createElement('div');
        t.className = `jts-toast jts-toast-${type || 'info'}`;
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 4000);
    }

    function openModal(movieTitle) {
        if (document.querySelector('.jts-overlay')) return;

        const overlay = document.createElement('div');
        overlay.className = 'jts-overlay';
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        overlay.innerHTML = `
            <div class="jts-modal">
                <div class="jts-header">
                    <h2>🔍 Buscar Torrents</h2>
                    <button class="jts-close" title="Fechar">✕</button>
                </div>
                <div class="jts-search-bar">
                    <input class="jts-search-input" type="text" placeholder="Nome do filme ou série..."
                           value="${escapeHtml(movieTitle || '')}">
                    <select class="jts-select" id="jts-category">
                        <option value="movies">🎬 Filmes</option>
                        <option value="tv">📺 Séries</option>
                        <option value="anime">🎌 Anime</option>
                        <option value="all">📁 Tudo</option>
                    </select>
                    <button class="jts-search-btn">Buscar</button>
                </div>
                <div class="jts-filters" style="display:none;">
                    <span style="font-size:12px;color:${CONFIG.TEXT_SECONDARY};margin-right:4px;">Filtrar:</span>
                    <button class="jts-filter-chip active" data-filter="all">Todos</button>
                    <button class="jts-filter-chip" data-filter="ptbr">🇧🇷 PT-BR</button>
                    <button class="jts-filter-chip" data-filter="1080p">1080p</button>
                    <button class="jts-filter-chip" data-filter="4k">4K</button>
                    <button class="jts-filter-chip" data-filter="720p">720p</button>
                    <span class="jts-stats"></span>
                </div>
                <div class="jts-results">
                    <div class="jts-empty">
                        <div class="jts-empty-icon">🎬</div>
                        <p>Digite o nome do filme e clique em <b>Buscar</b></p>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Event listeners
        const closeBtn = overlay.querySelector('.jts-close');
        const searchInput = overlay.querySelector('.jts-search-input');
        const searchBtn = overlay.querySelector('.jts-search-btn');
        const categorySelect = overlay.querySelector('#jts-category');
        const filtersDiv = overlay.querySelector('.jts-filters');
        const resultsDiv = overlay.querySelector('.jts-results');
        const statsSpan = overlay.querySelector('.jts-stats');

        let allResults = [];

        closeBtn.addEventListener('click', () => overlay.remove());

        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escHandler); }
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') doSearch();
        });

        searchBtn.addEventListener('click', doSearch);

        // Filter chips
        filtersDiv.addEventListener('click', (e) => {
            const chip = e.target.closest('.jts-filter-chip');
            if (!chip) return;
            filtersDiv.querySelectorAll('.jts-filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            renderResults(allResults, chip.dataset.filter);
        });

        async function doSearch() {
            const query = searchInput.value.trim();
            if (!query) return;

            const category = categorySelect.value;
            searchBtn.disabled = true;
            searchBtn.textContent = 'Buscando...';

            resultsDiv.innerHTML = `
                <div class="jts-loading">
                    <div class="jts-spinner"></div>
                    <p>Pesquisando torrents PT-BR para "<b>${escapeHtml(query)}</b>"...</p>
                </div>
            `;

            try {
                const resp = await fetch(
                    `${CONFIG.BACKEND_URL}/api/search?q=${encodeURIComponent(query)}&category=${category}`
                );

                if (!resp.ok) {
                    const err = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
                    throw new Error(err.error || `HTTP ${resp.status}`);
                }

                const data = await resp.json();
                allResults = data.results || [];

                filtersDiv.style.display = allResults.length > 0 ? 'flex' : 'none';
                statsSpan.textContent = `${data.total} resultados (${data.ptBrCount} PT-BR)`;

                // Reset filter
                filtersDiv.querySelectorAll('.jts-filter-chip').forEach(c => c.classList.remove('active'));
                filtersDiv.querySelector('[data-filter="all"]').classList.add('active');

                renderResults(allResults, 'all');

            } catch (err) {
                resultsDiv.innerHTML = `
                    <div class="jts-empty jts-error">
                        <div class="jts-empty-icon">❌</div>
                        <p><b>Erro na busca:</b> ${escapeHtml(err.message)}</p>
                        <p style="font-size:12px;margin-top:8px;">Verifique se o backend está rodando em ${CONFIG.BACKEND_URL}</p>
                    </div>
                `;
            } finally {
                searchBtn.disabled = false;
                searchBtn.textContent = 'Buscar';
            }
        }

        function renderResults(results, filter) {
            let filtered = results;

            if (filter === 'ptbr') filtered = results.filter(r => r.isPtBr);
            else if (filter === '1080p') filtered = results.filter(r => r.quality.includes('1080p'));
            else if (filter === '4k') filtered = results.filter(r => r.quality.includes('4K'));
            else if (filter === '720p') filtered = results.filter(r => r.quality.includes('720p'));

            if (filtered.length === 0) {
                resultsDiv.innerHTML = `
                    <div class="jts-empty">
                        <div class="jts-empty-icon">😕</div>
                        <p>Nenhum resultado encontrado${filter !== 'all' ? ' para esse filtro' : ''}</p>
                    </div>
                `;
                return;
            }

            resultsDiv.innerHTML = filtered.map((r, i) => `
                <div class="jts-result-card" style="animation-delay:${i * 0.03}s">
                    <div class="jts-result-top">
                        <div class="jts-result-title ${r.isPtBr ? 'ptbr' : ''}">${escapeHtml(r.title)}</div>
                        <div class="jts-badges">
                            ${r.quality !== 'N/A' ? `<span class="jts-badge ${r.quality === 'CAM' ? 'jts-badge-cam' : 'jts-badge-quality'}">${r.quality}</span>` : ''}
                            ${r.isPtBr ? `<span class="jts-badge jts-badge-lang">${escapeHtml(r.language)}</span>` : ''}
                        </div>
                    </div>
                    <div class="jts-result-meta">
                        <span class="jts-meta-item">📦 ${r.sizeFormatted}</span>
                        <span class="jts-meta-item">⬆️ <span class="seed">${r.seeders}</span></span>
                        <span class="jts-meta-item">⬇️ <span class="leech">${r.leechers}</span></span>
                        <span class="jts-meta-item">🌐 ${escapeHtml(r.tracker)}</span>
                        <div class="jts-result-actions">
                            ${r.magnetUri ? `<button class="jts-dl-btn jts-dl-magnet" data-magnet="${encodeURIComponent(r.magnetUri)}" title="Copiar Magnet Link">🧲 Magnet</button>` : ''}
                            ${r.magnetUri || r.downloadUrl ? `<button class="jts-dl-btn jts-dl-qbit" data-magnet="${encodeURIComponent(r.magnetUri || '')}" data-url="${encodeURIComponent(r.downloadUrl || '')}" title="Enviar pro qBittorrent">⬇️ Baixar</button>` : ''}
                        </div>
                    </div>
                </div>
            `).join('');

            // Action buttons
            resultsDiv.querySelectorAll('.jts-dl-magnet').forEach(btn => {
                btn.addEventListener('click', () => {
                    const magnet = decodeURIComponent(btn.dataset.magnet);
                    navigator.clipboard.writeText(magnet).then(() => {
                        showToast('🧲 Magnet link copiado!', 'success');
                    }).catch(() => {
                        // Fallback: abre o magnet diretamente
                        window.open(magnet, '_blank');
                        showToast('🧲 Magnet link aberto!', 'info');
                    });
                });
            });

            resultsDiv.querySelectorAll('.jts-dl-qbit').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const magnet = decodeURIComponent(btn.dataset.magnet);
                    const url = decodeURIComponent(btn.dataset.url);
                    btn.disabled = true;
                    btn.textContent = '⏳...';

                    try {
                        const resp = await fetch(`${CONFIG.BACKEND_URL}/api/download`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                magnetUri: magnet || undefined,
                                downloadUrl: url || undefined
                            })
                        });

                        const data = await resp.json();
                        if (data.success) {
                            showToast('✅ Torrent enviado pro qBittorrent!', 'success');
                            btn.textContent = '✅ Enviado';
                        } else {
                            throw new Error(data.error);
                        }
                    } catch (err) {
                        showToast('❌ Erro: ' + err.message, 'error');
                        btn.textContent = '⬇️ Baixar';
                        btn.disabled = false;
                    }
                });
            });
        }

        // Auto-search if title was provided
        if (movieTitle) {
            setTimeout(doSearch, 300);
        }
    }

    function escapeHtml(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    // ==========================================
    // JELLYFIN INTEGRATION
    // ==========================================

    function getItemTitle() {
        // Try multiple selectors used by different Jellyfin versions
        const selectors = [
            '.itemName .parentNameLast',
            'h3.itemName',
            '.itemName',
            '[data-type="OriginalTitle"]',
            'h1'
        ];
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el && el.textContent.trim()) return el.textContent.trim();
        }
        return '';
    }

    function tryInjectButton() {
        // Don't inject if already present
        if (document.querySelector('#jts-trigger-btn')) return;

        // Look for the button area on item detail pages
        const buttonContainers = [
            '.mainDetailButtons',
            '.detailButtons',
            '.itemDetailPage .detailSection .mainDetailButtons',
            '.itemMiscInfo'
        ];

        let container = null;
        for (const sel of buttonContainers) {
            container = document.querySelector(sel);
            if (container) break;
        }

        if (!container) return;

        const btn = document.createElement('button');
        btn.id = 'jts-trigger-btn';
        btn.className = 'jts-btn';
        btn.innerHTML = `${MAGNET_SVG} Buscar Torrents`;
        btn.addEventListener('click', () => {
            const title = getItemTitle();
            openModal(title);
        });

        container.appendChild(btn);
    }

    // ==========================================
    // MENU ENTRY
    // ==========================================

    function addNavEntry() {
        if (document.querySelector('#jts-nav-entry')) return;
        const nav = document.querySelector('.navMenuVertical, .sidebarLinks, .mainDrawer-scrollContainer');
        if (!nav) return;

        const link = document.createElement('a');
        link.id = 'jts-nav-entry';
        link.className = 'navMenuOption lnkMediaFolder';
        link.href = '#';
        link.setAttribute('is', 'emby-linkbutton');
        link.innerHTML = `
            <span class="navMenuOptionIcon material-icons" style="color:${CONFIG.ACCENT_COLOR}">search</span>
            <span class="navMenuOptionText">Buscar Torrents</span>
        `;
        link.addEventListener('click', (e) => {
            e.preventDefault();
            openModal('');
        });

        nav.appendChild(link);
    }

    // ==========================================
    // OBSERVER - Detecta mudanças de página
    // ==========================================

    function init() {
        injectStyles();
        addNavEntry();
        tryInjectButton();

        // Observa mudanças no DOM para reinjetar quando navegar
        const observer = new MutationObserver(() => {
            tryInjectButton();
            addNavEntry();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('[JTS] 🎬 Jellyfin Torrent Search carregado!');
    }

    // Aguarda o DOM carregar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
