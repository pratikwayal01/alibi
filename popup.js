/* Alibi popup — v0.1. Storage contract mirrors content.js exactly. */
(function () {
  'use strict';

  var api = (typeof browser !== 'undefined' && browser.storage) ? browser : chrome;

  var DEFAULTS = {
    enabled: true,
    packId: 'desi',
    customAlice: '',
    customBob: '',
    aliasMode: 'single',
    protectSamples: true
  };

  /* Fallback pairs (PRD §7) used until packs.json loads or if it is missing. */
  var FALLBACK_PAIRS = {
    desi: ['Sharmaji ka Beta', 'Pintu'],
    corporate: ['Karen from Accounts', 'Dave from IT'],
    anime: ['Sasuke', 'Naruto'],
    mythic: ['Zeus', 'Hades'],
    debug: ['NullPointer', 'SegFault'],
    gigachad: ['Alpha Alice', 'Sigma Bob']
  };

  var packs = null; /* packId -> [alice, bob], resolved from packs.json */
  var settings = Object.assign({}, DEFAULTS);

  var elSwitch = document.getElementById('switch');
  var elAliasAlice = document.getElementById('aliasAlice');
  var elAliasBob = document.getElementById('aliasBob');
  var elChips = document.getElementById('chips');
  var elCustomToggle = document.getElementById('customToggle');
  var elCustomFields = document.getElementById('customFields');
  var elCustomAlice = document.getElementById('customAlice');
  var elCustomBob = document.getElementById('customBob');
  var elSeg = document.getElementById('seg');
  var elProtect = document.getElementById('protectSamples');
  var elSaved = document.getElementById('saved');
  var elCount = document.getElementById('count');

  var savedTimer = null;
  function flashSaved() {
    elSaved.hidden = false;
    if (savedTimer) clearTimeout(savedTimer);
    savedTimer = setTimeout(function () { elSaved.hidden = true; }, 1200);
  }

  function save(patch) {
    Object.assign(settings, patch);
    api.storage.sync.set(settings, function () { flashSaved(); });
    renderAliases();
  }

  /* packs.json may not exist yet (owned by core agent) — fall back silently. */
  function loadPacks(done) {
    fetch('packs.json').then(function (res) {
      if (!res.ok) throw new Error('no packs.json');
      return res.json();
    }).then(function (data) {
      var map = {};
      var list = Array.isArray(data) ? data : (data.packs || data.pairs || []);
      list.forEach(function (p) {
        var id = String(p.id || p.pack || '').toLowerCase();
        var pair = p.pair || p.aliases || p.names || [p.alice, p.bob];
        if (id && Array.isArray(pair) && pair.length >= 2) map[id] = [pair[0], pair[1]];
      });
      packs = Object.keys(map).length ? map : null;
      done();
    }).catch(function () { done(); });
  }

  function currentPair() {
    if (settings.customAlice.trim() || settings.customBob.trim()) {
      var base = (packs || FALLBACK_PAIRS)[settings.packId] || FALLBACK_PAIRS.desi;
      return [
        settings.customAlice.trim() || base[0],
        settings.customBob.trim() || base[1]
      ];
    }
    return (packs || FALLBACK_PAIRS)[settings.packId] || FALLBACK_PAIRS.desi;
  }

  function renderAliases() {
    var pair = currentPair();
    elAliasAlice.textContent = pair[0];
    elAliasBob.textContent = pair[1];
  }

  function renderControls() {
    elSwitch.setAttribute('aria-checked', String(settings.enabled));
    elSwitch.textContent = settings.enabled ? 'On duty' : 'On leave';

    Array.prototype.forEach.call(elChips.querySelectorAll('.chip'), function (chip) {
      chip.classList.toggle('on', chip.dataset.pack === settings.packId);
    });

    var hasCustom = Boolean(settings.customAlice || settings.customBob);
    elCustomFields.hidden = !hasCustom;
    elCustomToggle.setAttribute('aria-expanded', String(hasCustom));
    if (document.activeElement !== elCustomAlice) elCustomAlice.value = settings.customAlice;
    if (document.activeElement !== elCustomBob) elCustomBob.value = settings.customBob;

    Array.prototype.forEach.call(elSeg.querySelectorAll('button'), function (btn) {
      btn.classList.toggle('on', btn.dataset.mode === settings.aliasMode);
    });

    elProtect.checked = settings.protectSamples !== false;
    renderAliases();
  }

  /* --- events --- */

  elSwitch.addEventListener('click', function () {
    save({ enabled: !settings.enabled });
  });

  elChips.addEventListener('click', function (e) {
    var btn = e.target.closest('.chip');
    if (btn) save({ packId: btn.dataset.pack });
  });

  elCustomToggle.addEventListener('click', function () {
    var open = elCustomFields.hidden;
    elCustomFields.hidden = !open;
    elCustomToggle.setAttribute('aria-expanded', String(open));
    if (open) elCustomAlice.focus();
  });

  var customTimer = null;
  function onCustomInput() {
    if (customTimer) clearTimeout(customTimer);
    customTimer = setTimeout(function () {
      save({ customAlice: elCustomAlice.value, customBob: elCustomBob.value });
    }, 300);
  }
  elCustomAlice.addEventListener('input', onCustomInput);
  elCustomBob.addEventListener('input', onCustomInput);

  elSeg.addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (btn) save({ aliasMode: btn.dataset.mode });
  });

  elProtect.addEventListener('change', function () {
    save({ protectSamples: elProtect.checked });
  });

  /* Reroll: content script owns the shuffle; popup just asks + refreshes. */
  function reroll() {
    sendToActiveTab({ type: 'alibi-reroll' });
    refreshCount();
    /* Show a fresh preview pair immediately so the card feels alive. */
    loadPacks(renderAliases);
  }
  document.getElementById('diceAlice').addEventListener('click', reroll);
  document.getElementById('diceBob').addEventListener('click', reroll);

  /* --- active-tab messaging (no tabs permission; may fail — that's fine) --- */

  function sendToActiveTab(message) {
    try {
      var tabs = api.tabs;
      if (!tabs || !tabs.query) return;
      tabs.query({ active: true, currentWindow: true }, function (list) {
        try {
          if (!list || !list[0] || list[0].id == null) return;
          tabs.sendMessage(list[0].id, message);
        } catch (e) { /* content script absent — empty state stays */ }
      });
    } catch (e) { /* tabs API unavailable — empty state stays */ }
  }

  function refreshCount() {
    try {
      var tabs = api.tabs;
      if (!tabs || !tabs.query) return;
      tabs.query({ active: true, currentWindow: true }, function (list) {
        try {
          if (!list || !list[0] || list[0].id == null) return;
          tabs.sendMessage(list[0].id, { type: 'alibi-count' }, function (res) {
            if (chrome.runtime && chrome.runtime.lastError) return;
            if (res && typeof res.count === 'number') {
              elCount.textContent = res.count > 0
                ? res.count + ' name' + (res.count === 1 ? '' : 's') + ' changed here'
                : 'Nothing to rename on this page';
            }
          });
        } catch (e) { /* keep empty state */ }
      });
    } catch (e) { /* keep empty state */ }
  }

  /* --- init --- */

  api.storage.sync.get(DEFAULTS, function (stored) {
    settings = Object.assign({}, DEFAULTS, stored);
    loadPacks(function () {
      renderControls();
      refreshCount();
    });
  });
})();
