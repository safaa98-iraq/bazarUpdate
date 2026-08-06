(function () {
  'use strict';

  var BASE_URL = (function () {
    var scripts = document.querySelectorAll('script[src*="widget.js"]');
    if (scripts.length) {
      var src = scripts[scripts.length - 1].getAttribute('src');
      var m = src.match(/^(https?:\/\/[^/]+)/);
      if (m) return m[1];
    }
    return 'http://localhost:3000';
  })();

  var STYLES = [
    '.sb-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;background:#6366f1;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;transition:background .2s,transform .1s;line-height:1.4}',
    '.sb-btn:hover{background:#4f46e5}',
    '.sb-btn:active{transform:scale(.97)}',
    '.sb-btn[data-theme="dark"]{background:#1f2937;color:#f9fafb}',
    '.sb-btn[data-theme="dark"]:hover{background:#111827}',
    '.sb-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:2147483646;opacity:0;transition:opacity .3s;pointer-events:none}',
    '.sb-overlay.open{opacity:1;pointer-events:all}',
    '.sb-panel{position:fixed;top:0;right:-440px;width:420px;max-width:100vw;height:100vh;background:#fff;z-index:2147483647;transition:right .35s cubic-bezier(.4,0,.2,1);box-shadow:-8px 0 32px rgba(0,0,0,.18)}',
    '.sb-panel.open{right:0}',
    '.sb-panel iframe{width:100%;height:100%;border:none;display:block}',
    '@media(max-width:460px){.sb-panel{width:100vw}}',
  ].join('');

  var overlay, panel, iframe;

  function injectStyles() {
    if (document.getElementById('sb-widget-css')) return;
    var s = document.createElement('style');
    s.id = 'sb-widget-css';
    s.textContent = STYLES;
    document.head.appendChild(s);
  }

  function buildEmbedUrl(store, product, theme) {
    var url = BASE_URL + '/embed/' + encodeURIComponent(store);
    var params = [];
    if (product) params.push('product=' + encodeURIComponent(product));
    if (theme) params.push('theme=' + encodeURIComponent(theme));
    if (params.length) url += '?' + params.join('&');
    return url;
  }

  function openPanel(store, product, theme) {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'sb-overlay';
      overlay.addEventListener('click', closePanel);
      document.body.appendChild(overlay);
    }

    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'sb-panel';
      iframe = document.createElement('iframe');
      iframe.setAttribute('allow', 'payment');
      iframe.setAttribute('loading', 'eager');
      panel.appendChild(iframe);
      document.body.appendChild(panel);

      window.addEventListener('message', function (e) {
        if (e.data === 'sb:close') closePanel();
        if (e.data && e.data.type === 'sb:order-complete') {
          document.dispatchEvent(new CustomEvent('storebuilder:order', { detail: e.data.order }));
          closePanel();
        }
      });
    }

    iframe.src = buildEmbedUrl(store, product, theme);

    // Track click event
    fetch(BASE_URL.replace(':3000', ':4000') + '/api/widget/' + store + '/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'CLICK', sessionId: getSessionId() }),
    }).catch(function () {});

    requestAnimationFrame(function () {
      overlay.classList.add('open');
      panel.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  }

  function closePanel() {
    if (overlay) overlay.classList.remove('open');
    if (panel) panel.classList.remove('open');
    document.body.style.overflow = '';
  }

  function getSessionId() {
    try {
      var k = 'sb_widget_sid';
      var id = sessionStorage.getItem(k);
      if (!id) {
        id = Math.random().toString(36).slice(2) + Date.now().toString(36);
        sessionStorage.setItem(k, id);
      }
      return id;
    } catch (e) { return 'anon'; }
  }

  function initElement(el) {
    if (el.dataset.sbInit) return;
    el.dataset.sbInit = '1';

    var store = el.dataset.store || el.dataset.storebuilder;
    var product = el.dataset.product || null;
    var theme = el.dataset.theme || 'light';
    var label = el.dataset.label || 'Shop Now';
    var icon = el.dataset.icon !== 'false';

    if (!store) return;

    var btn = document.createElement('button');
    btn.className = 'sb-btn';
    btn.setAttribute('data-theme', theme);
    btn.type = 'button';
    if (icon) btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>';
    btn.innerHTML += label;

    btn.addEventListener('click', function () { openPanel(store, product, theme); });
    el.appendChild(btn);

    // Track impression
    fetch(BASE_URL.replace(':3000', ':4000') + '/api/widget/' + store + '/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'IMPRESSION', sessionId: getSessionId() }),
    }).catch(function () {});
  }

  function init() {
    injectStyles();
    document.querySelectorAll('[data-storebuilder],[data-sb-widget]').forEach(initElement);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose global API for dynamic usage
  window.StoreBuilder = {
    open: openPanel,
    close: closePanel,
    init: init,
  };
})();
