/**
 * Jellyfin Torrent Search PT-BR
 * 
 * Script injetado automaticamente pelo plugin.
 * Usa a API interna do Jellyfin (/Torrents/Search) - zero dependências externas.
 */
(function () {
    'use strict';

    // Cores e design
    var C = {
        ACCENT: '#7B2FF7',
        GRAD: 'linear-gradient(135deg, #7B2FF7, #C850C0, #FF6B9D)',
        BG: '#0D0D1A',
        CARD: '#1A1A2E',
        SURFACE: '#16213E',
        TXT: '#E8E8F0',
        TXT2: '#9A9ABF',
        BORDER: '#2A2A4A'
    };

    function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

    function toast(msg, type) {
        var old = document.querySelector('.jts-toast');
        if (old) old.remove();
        var t = document.createElement('div');
        t.className = 'jts-toast';
        t.style.cssText = 'position:fixed;bottom:30px;right:30px;z-index:999999;padding:14px 22px;border-radius:12px;color:#fff;font-family:Inter,sans-serif;font-size:14px;font-weight:500;box-shadow:0 8px 30px rgba(0,0,0,0.4);animation:jtsSlideUp .3s ease;background:' + (type === 'error' ? 'linear-gradient(135deg,#FF4757,#FF6B81)' : type === 'success' ? 'linear-gradient(135deg,#2ED573,#1E90FF)' : C.GRAD);
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(function () { t.remove(); }, 4000);
    }

    // Busca usando a API interna do Jellyfin (autenticação já incluída via cookie de sessão)
    function apiSearch(query, category) {
        var url = ApiClient.getUrl('Torrents/Search', { query: query, category: category || 'Movies' });
        return ApiClient.getJSON(url);
    }

    function apiDownload(magnetUri, downloadUrl) {
        var url = ApiClient.getUrl('Torrents/Download');
        return ApiClient.ajax({
            type: 'POST',
            url: url,
            data: JSON.stringify({ magnetUri: magnetUri, downloadUrl: downloadUrl }),
            contentType: 'application/json'
        });
    }

    // Injeta CSS
    function injectCSS() {
        if (document.getElementById('jts-css')) return;
        var s = document.createElement('style');
        s.id = 'jts-css';
        s.textContent = [
            "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');",
            "@keyframes jtsIn{from{opacity:0}to{opacity:1}}",
            "@keyframes jtsSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",
            "@keyframes jtsSpin{to{transform:rotate(360deg)}}",

            ".jts-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;border:none;border-radius:12px;background:" + C.GRAD + ";color:#fff;font-family:Inter,sans-serif;font-weight:600;font-size:14px;cursor:pointer;transition:all .3s;box-shadow:0 4px 15px rgba(123,47,247,.3);margin:8px 4px}",
            ".jts-btn:hover{transform:translateY(-2px);box-shadow:0 6px 25px rgba(123,47,247,.5)}",

            ".jts-ov{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.85);backdrop-filter:blur(10px);display:flex;justify-content:center;align-items:flex-start;padding:40px 20px;overflow-y:auto;animation:jtsIn .3s}",
            ".jts-m{width:100%;max-width:900px;background:" + C.BG + ";border:1px solid " + C.BORDER + ";border-radius:20px;overflow:hidden;box-shadow:0 25px 80px rgba(0,0,0,.6);animation:jtsSlideUp .4s;font-family:Inter,sans-serif}",

            ".jts-hd{background:" + C.GRAD + ";padding:24px 28px;display:flex;justify-content:space-between;align-items:center}",
            ".jts-hd h2{margin:0;color:#fff;font-size:20px;font-weight:700}",
            ".jts-x{background:rgba(255,255,255,.2);border:none;width:36px;height:36px;border-radius:50%;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s}",
            ".jts-x:hover{background:rgba(255,255,255,.35)}",

            ".jts-sb{padding:20px 28px;display:flex;gap:10px;border-bottom:1px solid " + C.BORDER + ";flex-wrap:wrap}",
            ".jts-si{flex:1;min-width:200px;padding:12px 16px;background:" + C.SURFACE + ";border:1px solid " + C.BORDER + ";border-radius:10px;color:" + C.TXT + ";font-size:14px;font-family:Inter,sans-serif;outline:none;transition:border-color .2s}",
            ".jts-si:focus{border-color:" + C.ACCENT + "}",
            ".jts-si::placeholder{color:" + C.TXT2 + "}",
            ".jts-sel{padding:12px 14px;background:" + C.SURFACE + ";border:1px solid " + C.BORDER + ";border-radius:10px;color:" + C.TXT + ";font-size:13px;font-family:Inter,sans-serif;cursor:pointer;outline:none}",
            ".jts-go{padding:12px 24px;border:none;border-radius:10px;background:" + C.GRAD + ";color:#fff;font-weight:600;font-size:14px;cursor:pointer;font-family:Inter,sans-serif;transition:opacity .2s}",
            ".jts-go:hover{opacity:.9}.jts-go:disabled{opacity:.5;cursor:not-allowed}",

            ".jts-fl{padding:12px 28px;display:flex;gap:8px;border-bottom:1px solid " + C.BORDER + ";flex-wrap:wrap;align-items:center}",
            ".jts-fc{padding:6px 14px;border-radius:20px;font-size:12px;border:1px solid " + C.BORDER + ";background:transparent;color:" + C.TXT2 + ";cursor:pointer;transition:all .2s;font-family:Inter,sans-serif}",
            ".jts-fc.on{background:" + C.ACCENT + ";border-color:" + C.ACCENT + ";color:#fff}",
            ".jts-fc:hover{border-color:" + C.ACCENT + "}",
            ".jts-st{margin-left:auto;font-size:12px;color:" + C.TXT2 + "}",

            ".jts-rs{padding:16px 28px 28px}",
            ".jts-rc{background:" + C.CARD + ";border:1px solid " + C.BORDER + ";border-radius:14px;padding:16px 20px;margin-bottom:10px;transition:all .2s}",
            ".jts-rc:hover{border-color:" + C.ACCENT + ";transform:translateX(4px);box-shadow:0 4px 20px rgba(123,47,247,.15)}",
            ".jts-rt{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:10px}",
            ".jts-rn{font-size:14px;font-weight:600;color:" + C.TXT + ";line-height:1.4;flex:1;word-break:break-word}",
            ".jts-rn.br::before{content:'\\1F1E7\\1F1F7';margin-right:6px}",
            ".jts-bg{display:flex;gap:6px;flex-wrap:wrap;flex-shrink:0}",
            ".jts-b{padding:3px 8px;border-radius:6px;font-size:11px;font-weight:600;white-space:nowrap}",
            ".jts-bq{background:rgba(123,47,247,.2);color:#B57BFF}",
            ".jts-bl{background:rgba(46,213,115,.15);color:#2ED573}",
            ".jts-bc{background:rgba(255,71,87,.15);color:#FF4757}",
            ".jts-rm{display:flex;gap:16px;align-items:center;flex-wrap:wrap}",
            ".jts-mi{display:flex;align-items:center;gap:4px;font-size:12px;color:" + C.TXT2 + "}",
            ".jts-mi .s{color:#2ED573;font-weight:600}",
            ".jts-mi .l{color:#FF4757;font-weight:600}",
            ".jts-ra{margin-left:auto;display:flex;gap:6px}",
            ".jts-db{padding:6px 14px;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif;transition:all .2s}",
            ".jts-dm{background:rgba(123,47,247,.15);color:#B57BFF}",
            ".jts-dm:hover{background:rgba(123,47,247,.3)}",
            ".jts-dq{background:rgba(46,213,115,.15);color:#2ED573}",
            ".jts-dq:hover{background:rgba(46,213,115,.3)}",

            ".jts-ld{text-align:center;padding:60px 20px;color:" + C.TXT2 + "}",
            ".jts-sp{width:40px;height:40px;margin:0 auto 16px;border:3px solid " + C.BORDER + ";border-top-color:" + C.ACCENT + ";border-radius:50%;animation:jtsSpin .8s linear infinite}",
            ".jts-em{text-align:center;padding:50px 20px;color:" + C.TXT2 + "}",
            ".jts-ei{font-size:48px;margin-bottom:12px}",
            ".jts-er{color:#FF4757}"
        ].join('\n');
        document.head.appendChild(s);
    }

    // Modal de busca
    function openModal(title) {
        if (document.querySelector('.jts-ov')) return;
        var ov = document.createElement('div');
        ov.className = 'jts-ov';
        ov.onclick = function (e) { if (e.target === ov) ov.remove(); };

        ov.innerHTML = '<div class="jts-m">' +
            '<div class="jts-hd"><h2>\uD83D\uDD0D Buscar Torrents</h2><button class="jts-x">\u2715</button></div>' +
            '<div class="jts-sb">' +
                '<input class="jts-si" type="text" placeholder="Nome do filme ou s\u00e9rie..." value="' + esc(title || '') + '">' +
                '<select class="jts-sel" id="jts-cat">' +
                    '<option value="Movies">\uD83C\uDFAC Filmes</option>' +
                    '<option value="TV">\uD83D\uDCFA S\u00e9ries</option>' +
                    '<option value="Anime">\uD83C\uDFCC Anime</option>' +
                '</select>' +
                '<button class="jts-go">Buscar</button>' +
            '</div>' +
            '<div class="jts-fl" style="display:none">' +
                '<span style="font-size:12px;color:' + C.TXT2 + ';margin-right:4px">Filtrar:</span>' +
                '<button class="jts-fc on" data-f="all">Todos</button>' +
                '<button class="jts-fc" data-f="ptbr">\uD83C\uDDE7\uD83C\uDDF7 PT-BR</button>' +
                '<button class="jts-fc" data-f="1080p">1080p</button>' +
                '<button class="jts-fc" data-f="4k">4K</button>' +
                '<button class="jts-fc" data-f="720p">720p</button>' +
                '<span class="jts-st"></span>' +
            '</div>' +
            '<div class="jts-rs"><div class="jts-em"><div class="jts-ei">\uD83C\uDFAC</div><p>Digite o nome do filme e clique em <b>Buscar</b></p></div></div>' +
        '</div>';

        document.body.appendChild(ov);

        var closeBtn = ov.querySelector('.jts-x');
        var input = ov.querySelector('.jts-si');
        var goBtn = ov.querySelector('.jts-go');
        var filtersDiv = ov.querySelector('.jts-fl');
        var resultsDiv = ov.querySelector('.jts-rs');
        var statsSpan = ov.querySelector('.jts-st');
        var allResults = [];

        closeBtn.onclick = function () { ov.remove(); };
        document.addEventListener('keydown', function escH(e) {
            if (e.key === 'Escape') { ov.remove(); document.removeEventListener('keydown', escH); }
        });
        input.addEventListener('keypress', function (e) { if (e.key === 'Enter') doSearch(); });
        goBtn.onclick = doSearch;

        filtersDiv.onclick = function (e) {
            var chip = e.target.closest('.jts-fc');
            if (!chip) return;
            filtersDiv.querySelectorAll('.jts-fc').forEach(function (c) { c.classList.remove('on'); });
            chip.classList.add('on');
            renderResults(allResults, chip.dataset.f);
        };

        function doSearch() {
            var q = input.value.trim();
            if (!q) return;
            var cat = document.getElementById('jts-cat').value;
            goBtn.disabled = true;
            goBtn.textContent = 'Buscando...';
            resultsDiv.innerHTML = '<div class="jts-ld"><div class="jts-sp"></div><p>Pesquisando torrents para "<b>' + esc(q) + '</b>"...</p></div>';

            apiSearch(q, cat).then(function (data) {
                allResults = data.results || [];
                filtersDiv.style.display = allResults.length > 0 ? 'flex' : 'none';
                statsSpan.textContent = data.total + ' resultados (' + data.ptBrCount + ' PT-BR)';
                filtersDiv.querySelectorAll('.jts-fc').forEach(function (c) { c.classList.remove('on'); });
                filtersDiv.querySelector('[data-f="all"]').classList.add('on');
                renderResults(allResults, 'all');
            }).catch(function (err) {
                resultsDiv.innerHTML = '<div class="jts-em jts-er"><div class="jts-ei">\u274C</div><p><b>Erro:</b> ' + esc(err.message || String(err)) + '</p></div>';
            }).finally(function () {
                goBtn.disabled = false;
                goBtn.textContent = 'Buscar';
            });
        }

        function renderResults(results, filter) {
            var filtered = results;
            if (filter === 'ptbr') filtered = results.filter(function (r) { return r.isPtBr; });
            else if (filter === '1080p') filtered = results.filter(function (r) { return r.quality.indexOf('1080p') >= 0; });
            else if (filter === '4k') filtered = results.filter(function (r) { return r.quality.indexOf('4K') >= 0; });
            else if (filter === '720p') filtered = results.filter(function (r) { return r.quality.indexOf('720p') >= 0; });

            if (filtered.length === 0) {
                resultsDiv.innerHTML = '<div class="jts-em"><div class="jts-ei">\uD83D\uDE15</div><p>Nenhum resultado' + (filter !== 'all' ? ' para esse filtro' : '') + '</p></div>';
                return;
            }

            resultsDiv.innerHTML = filtered.map(function (r) {
                return '<div class="jts-rc">' +
                    '<div class="jts-rt">' +
                        '<div class="jts-rn ' + (r.isPtBr ? 'br' : '') + '">' + esc(r.title) + '</div>' +
                        '<div class="jts-bg">' +
                            (r.quality !== 'N/A' ? '<span class="jts-b ' + (r.quality === 'CAM' ? 'jts-bc' : 'jts-bq') + '">' + r.quality + '</span>' : '') +
                            (r.isPtBr ? '<span class="jts-b jts-bl">' + esc(r.language) + '</span>' : '') +
                        '</div>' +
                    '</div>' +
                    '<div class="jts-rm">' +
                        '<span class="jts-mi">\uD83D\uDCE6 ' + r.sizeFormatted + '</span>' +
                        '<span class="jts-mi">\u2B06\uFE0F <span class="s">' + r.seeders + '</span></span>' +
                        '<span class="jts-mi">\u2B07\uFE0F <span class="l">' + r.leechers + '</span></span>' +
                        '<div class="jts-ra">' +
                            (r.magnetUri ? '<button class="jts-db jts-dm" data-mag="' + encodeURIComponent(r.magnetUri) + '">\uD83E\uDDF2 Magnet</button>' : '') +
                            (r.magnetUri ? '<button class="jts-db jts-dq" data-mag2="' + encodeURIComponent(r.magnetUri) + '">\u2B07\uFE0F Baixar</button>' : '') +
                        '</div>' +
                    '</div>' +
                '</div>';
            }).join('');

            // Magnet copy
            resultsDiv.querySelectorAll('.jts-dm').forEach(function (btn) {
                btn.onclick = function () {
                    var mag = decodeURIComponent(btn.dataset.mag);
                    if (navigator.clipboard) {
                        navigator.clipboard.writeText(mag).then(function () { toast('\uD83E\uDDF2 Magnet copiado!', 'success'); });
                    } else {
                        window.open(mag, '_blank');
                        toast('\uD83E\uDDF2 Magnet aberto!', 'info');
                    }
                };
            });

            // qBittorrent download
            resultsDiv.querySelectorAll('.jts-dq').forEach(function (btn) {
                btn.onclick = function () {
                    var mag = decodeURIComponent(btn.dataset.mag2);
                    btn.disabled = true;
                    btn.textContent = '\u23F3...';
                    apiDownload(mag, null).then(function () {
                        toast('\u2705 Torrent enviado ao qBittorrent!', 'success');
                        btn.textContent = '\u2705 Enviado';
                    }).catch(function (err) {
                        toast('\u274C ' + (err.message || 'Erro'), 'error');
                        btn.textContent = '\u2B07\uFE0F Baixar';
                        btn.disabled = false;
                    });
                };
            });
        }

        if (title) setTimeout(doSearch, 300);
    }

    // Pega o título do item aberto
    function getTitle() {
        var sels = ['.itemName .parentNameLast', 'h3.itemName', '.itemName', 'h1'];
        for (var i = 0; i < sels.length; i++) {
            var el = document.querySelector(sels[i]);
            if (el && el.textContent.trim()) return el.textContent.trim();
        }
        return '';
    }

    // Injeta o botão nas páginas de itens
    function tryInject() {
        if (document.querySelector('#jts-btn')) return;
        var containers = ['.mainDetailButtons', '.detailButtons', '.itemMiscInfo'];
        var container = null;
        for (var i = 0; i < containers.length; i++) {
            container = document.querySelector(containers[i]);
            if (container) break;
        }
        if (!container) return;

        var btn = document.createElement('button');
        btn.id = 'jts-btn';
        btn.className = 'jts-btn';
        btn.innerHTML = '\uD83E\uDDF2 Buscar Torrents';
        btn.onclick = function () { openModal(getTitle()); };
        container.appendChild(btn);
    }

    // Inicialização
    function init() {
        injectCSS();
        tryInject();

        // Observa mudanças de navegação (SPA)
        var observer = new MutationObserver(function () { tryInject(); });
        observer.observe(document.body, { childList: true, subtree: true });

        console.log('[TorrentSearch] \uD83C\uDFAC Plugin carregado!');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
