/* Alibi content script (v0.1: F1,F2,F5,F6,F7). No network. No console output. */
(function () {
  'use strict';

  var ext = (typeof browser !== 'undefined' && browser && browser.storage) ? browser : chrome;

  var DEFAULTS = {
    enabled: true,
    packId: 'desi',
    customAlice: '',
    customBob: '',
    aliasMode: 'single',
    protectSamples: true
  };

  // ponytail: fallback if packs.json fetch fails; canonical data lives in packs.json
  var FALLBACK_PACKS = [
    { id: 'desi', name: 'Desi', pairs: [['Sharmaji ka Beta', 'Pintu']] }
  ];

  var MATCH_RE = /\b(Alice|Bob)('s|\u2019s|s)?\b/gi;
  // Always-skipped zones. PRE/CODE are appended only when protectSamples is on.
  var SAFE_ALWAYS = 'SCRIPT,STYLE,TEXTAREA,INPUT,[contenteditable],.monaco-editor,.CodeMirror,.MathJax,.katex,mjx-container';
  var ATTR = 'data-alibi-original';

  var settings = Object.assign({}, DEFAULTS);
  var packs = null;
  var pair = ['Sharmaji ka Beta', 'Pintu']; // active [aliceAlias, bobAlias] for single mode
  var rerollOverride = null; // random pair for this page, set by alibi-reroll
  var count = 0;
  var timer = null;
  var lastPath = location.pathname;
  var originalTitle = null;

  function storageGet(cb) {
    try {
      var p = ext.storage.sync.get(DEFAULTS);
      if (p && typeof p.then === 'function') {
        p.then(function (v) { cb(Object.assign({}, DEFAULTS, v)); }, function () { cb(Object.assign({}, DEFAULTS)); });
      } else {
        ext.storage.sync.get(DEFAULTS, function (v) { cb(Object.assign({}, DEFAULTS, v || {})); });
      }
    } catch (e) { cb(Object.assign({}, DEFAULTS)); }
  }

  function hashStr(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h;
  }

  function findPack() {
    if (!packs) return null;
    for (var i = 0; i < packs.length; i++) if (packs[i].id === settings.packId) return packs[i];
    return packs[0] || null;
  }

  function randomPair(pack) {
    return pack.pairs[Math.floor(Math.random() * pack.pairs.length)];
  }

  function withCustom(p) {
    return [
      settings.customAlice ? settings.customAlice : p[0],
      settings.customBob ? settings.customBob : p[1]
    ];
  }

  // Pick the page pair for "single" mode: reroll override wins, else pathname-seeded.
  function pickPair() {
    var pack = findPack();
    if (!pack || !pack.pairs.length) { pair = withCustom(FALLBACK_PACKS[0].pairs[0]); return; }
    var base = rerollOverride || pack.pairs[hashStr(location.pathname) % pack.pairs.length];
    pair = withCustom(base);
  }

  // Alias for one match: chaos mode rolls a fresh pair per mention.
  function aliasFor(isAlice) {
    if (settings.aliasMode === 'chaos') {
      var pack = findPack();
      var p = (pack && pack.pairs.length) ? randomPair(pack) : FALLBACK_PACKS[0].pairs[0];
      p = withCustom(p);
      return p[isAlice ? 0 : 1];
    }
    return pair[isAlice ? 0 : 1];
  }

  function matchCase(name, aliasStr) {
    if (name === name.toUpperCase()) return aliasStr.toUpperCase();
    if (name === name.toLowerCase()) return aliasStr.toLowerCase();
    return aliasStr;
  }

  function inSafeZone(node) {
    var el = node.parentElement;
    if (!el) return true;
    if (el.closest('span[' + ATTR + ']')) return true;
    var sel = settings.protectSamples ? (SAFE_ALWAYS + ',PRE,CODE') : SAFE_ALWAYS;
    return !!el.closest(sel);
  }

  function swapText(text) {
    // Returns a DocumentFragment with alibi spans, or null when no match.
    MATCH_RE.lastIndex = 0;
    var out = null, frag = null, last = 0, m;
    while ((m = MATCH_RE.exec(text)) !== null) {
      if (!frag) { frag = document.createDocumentFragment(); out = true; }
      var isAlice = m[1].toLowerCase() === 'alice';
      var aliasStr = matchCase(m[1], aliasFor(isAlice)) + (m[2] || '');
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      var span = document.createElement('span');
      span.setAttribute(ATTR, m[0]);
      span.setAttribute('title', 'Originally ' + m[1]);
      span.textContent = aliasStr;
      frag.appendChild(span);
      last = m.index + m[0].length;
      count++;
    }
    if (!out) return null;
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    return frag;
  }

  function processTextNode(node) {
    if (!node || node.nodeType !== 3 || !node.nodeValue) return;
    if (node.nodeValue.indexOf('lic') === -1 && node.nodeValue.indexOf('LIC') === -1 &&
        node.nodeValue.indexOf('ob') === -1 && node.nodeValue.indexOf('OB') === -1) return;
    if (inSafeZone(node)) return;
    var frag = swapText(node.nodeValue);
    if (frag) node.parentNode.replaceChild(frag, node);
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { processTextNode(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        var el = n.parentElement;
        if (!el) return NodeFilter.FILTER_REJECT;
        if (el.closest('span[' + ATTR + ']')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var batch = [];
    var n;
    while ((n = walker.nextNode()) !== null) batch.push(n);
    for (var i = 0; i < batch.length; i++) processTextNode(batch[i]);
  }

  function unwrapAll() {
    var spans = document.querySelectorAll('span[' + ATTR + ']');
    for (var i = 0; i < spans.length; i++) {
      spans[i].parentNode.replaceChild(document.createTextNode(spans[i].getAttribute(ATTR)), spans[i]);
    }
    if (originalTitle !== null && document.title !== originalTitle) document.title = originalTitle;
    count = 0;
  }

  function swapTitle() {
    if (originalTitle === null) originalTitle = document.title;
    MATCH_RE.lastIndex = 0;
    document.title = originalTitle.replace(MATCH_RE, function (m, name, suffix) {
      var isAlice = name.toLowerCase() === 'alice';
      var base = settings.aliasMode === 'chaos' ? aliasFor(isAlice) : pair[isAlice ? 0 : 1];
      return matchCase(name, base) + (suffix || '');
    });
  }

  function recount() {
    count = document.querySelectorAll('span[' + ATTR + ']').length;
  }

  function applyAll() {
    unwrapAll();
    if (!settings.enabled) return;
    pickPair();
    walk(document.body);
    swapTitle();
    recount();
  }

  function schedule(fn) {
    if (timer !== null) return;
    timer = setTimeout(function () { timer = null; fn(); }, 300); // ponytail: setTimeout only, no rIC
  }

  function processMutations(muts) {
    if (!settings.enabled) return;
    if (location.pathname !== lastPath) { lastPath = location.pathname; applyAll(); return; }
    for (var i = 0; i < muts.length; i++) {
      var mu = muts[i];
      if (mu.type === 'characterData') {
        processTextNode(mu.target);
      } else {
        for (var j = 0; j < mu.addedNodes.length; j++) {
          var nd = mu.addedNodes[j];
          if (nd.nodeType === 1 && nd.matches && nd.matches('span[' + ATTR + ']')) continue;
          walk(nd);
        }
      }
    }
    recount();
  }

  function startObserver() {
    if (!window.MutationObserver) return;
    var target = document.documentElement || document;
    new MutationObserver(function (muts) { schedule(function () { processMutations(muts); }); })
      .observe(target, { childList: true, subtree: true, characterData: true });
  }

  // SPA route changes without reload: re-seed single-mode pair on pushState/replaceState/popstate.
  function hookHistory() {
    function onUrl() {
      if (location.pathname !== lastPath) { lastPath = location.pathname; schedule(applyAll); }
    }
    try {
      ['pushState', 'replaceState'].forEach(function (k) {
        var orig = history[k];
        history[k] = function () { var r = orig.apply(this, arguments); onUrl(); return r; };
      });
    } catch (e) { /* read-only history in some frames; observer still covers DOM */ }
    window.addEventListener('popstate', onUrl);
  }

  function onStorageChanged(changes) {
    var packChanged = false;
    Object.keys(changes).forEach(function (k) {
      if (k in settings) settings[k] = changes[k].newValue;
      if (k === 'packId') packChanged = true;
    });
    if (packChanged) rerollOverride = null;
    schedule(applyAll);
  }

  function onMessage(msg, sender, sendResponse) {
    if (!msg || typeof msg.type !== 'string') return;
    if (msg.type === 'alibi-reroll') {
      var pack = findPack();
      if (pack && pack.pairs.length) rerollOverride = randomPair(pack);
      applyAll();
      try { sendResponse({ count: count }); } catch (e) { /* tab went away */ }
    } else if (msg.type === 'alibi-count') {
      try { sendResponse({ count: count }); } catch (e) { /* tab went away */ }
    }
  }

  function boot() {
    storageGet(function (s) {
      settings = s;
      var url = null;
      try { url = ext.runtime.getURL('packs.json'); } catch (e) { url = null; }
      function ready() { applyAll(); startObserver(); hookHistory(); }
      if (!url) { packs = FALLBACK_PACKS.slice(); ready(); return; }
      fetch(url).then(function (r) {
        if (!r.ok) throw new Error('packs');
        return r.json();
      }).then(function (j) {
        packs = (j && j.packs && j.packs.length) ? j.packs : FALLBACK_PACKS.slice();
        ready();
      }, function () { packs = FALLBACK_PACKS.slice(); ready(); });
    });
    try {
      var ch = ext.storage.onChanged;
      if (ch && ch.addListener) ch.addListener(onStorageChanged);
    } catch (e) { /* storage events unavailable */ }
    try {
      var rt = ext.runtime && ext.runtime.onMessage;
      if (rt && rt.addListener) rt.addListener(onMessage);
    } catch (e) { /* messages unavailable */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function early() {
      // Best-effort early pass; full boot (with packs) applies again on ready.
      if (settings.enabled && document.body) walk(document.body);
    });
    boot();
  } else {
    boot();
  }
})();
