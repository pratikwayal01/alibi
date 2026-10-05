/* Alibi popup — v0.1. Storage contract mirrors content.js exactly. */
(function () {
  'use strict';

  var api = (typeof browser !== 'undefined' && browser.storage) ? browser : chrome;

  var DEFAULTS = {
    enabled: true,
    packId: 'desi',
    customAlice: '',
    customBob: '',
    customRules: [],
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
  var elRuleFrom = document.getElementById('ruleFrom');
  var elRuleTo = document.getElementById('ruleTo');
  var elRuleAdd = document.getElementById('ruleAdd');
  var elRuleList = document.getElementById('ruleList');
  var elRuleHint = document.getElementById('ruleHint');
  var MAX_RULES = 10;
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
    renderControls(); /* repaints switch, chips, seg — renderAliases included */
    refreshState(); /* page applied the same save via storage event — mirror it */
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
        var id = String(p.id || '').toLowerCase();
        if (id && Array.isArray(p.pairs) && p.pairs.length) map[id] = p.pairs;
      });
      packs = Object.keys(map).length ? map : null;
      done();
    }).catch(function () { done(); });
  }

  function hashStr(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h;
  }

  /* Pairs arrays per pack; fallbacks wrap their single preview pair. */
  function packPairs(id) {
    if (packs && packs[id]) return packs[id];
    return [FALLBACK_PAIRS[id] || FALLBACK_PAIRS.desi];
  }

  /* Drafted alias for a blank-`to` rule. Seed mirrors content.js autoAlias. */
  function autoAliasFor(from) {
    var flat = [];
    packPairs(settings.packId).forEach(function (pr) { flat.push(pr[0], pr[1]); });
    if (!flat.length) return 'auto';
    return flat[hashStr(settings.packId + '|' + from.toLowerCase()) % flat.length];
  }

  function currentPair() {
    var base = packPairs(settings.packId)[0] || FALLBACK_PAIRS.desi;
    if (settings.customAlice.trim() || settings.customBob.trim()) {
      return [
        settings.customAlice.trim() || base[0],
        settings.customBob.trim() || base[1]
      ];
    }
    return base;
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
    renderRules();
    renderAliases();
  }

  function renderRules() {
    var rules = settings.customRules || [];
    elRuleList.innerHTML = '';
    rules.forEach(function (r, i) {
      var row = document.createElement('div');
      row.className = 'rule';
      var label = document.createElement('span');
      label.textContent = r.to
        ? (r.from + ' → ' + r.to)
        : (r.from + ' → 🎲 ' + autoAliasFor(r.from));
      var del = document.createElement('button');
      del.textContent = '✕';
      del.setAttribute('aria-label', 'Delete swap ' + r.from);
      del.dataset.index = String(i);
      row.appendChild(label);
      row.appendChild(del);
      elRuleList.appendChild(row);
    });
    var full = rules.length >= MAX_RULES;
    elRuleAdd.disabled = full;
    elRuleHint.hidden = !full;
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

  elRuleAdd.addEventListener('click', function () {
    var from = elRuleFrom.value.trim(), to = elRuleTo.value.trim();
    var rules = settings.customRules || [];
    if (!from || rules.length >= MAX_RULES) return; // blank `to` = drafted alias
    elRuleFrom.value = '';
    elRuleTo.value = '';
    save({ customRules: rules.concat([{ from: from, to: to }]) });
  });

  elRuleList.addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn || btn.dataset.index == null) return;
    var drop = Number(btn.dataset.index);
    save({ customRules: (settings.customRules || []).filter(function (_, i) { return i !== drop; }) });
  });

  /* Reroll: content script owns the shuffle; popup re-reads live state after. */
  function reroll() {
    queryTab({ type: 'alibi-reroll' }, function () { refreshState(); });
  }
  document.getElementById('diceAlice').addEventListener('click', reroll);
  document.getElementById('diceBob').addEventListener('click', reroll);

  /* --- active-tab messaging (no tabs permission; may fail — that's fine) --- */

  /* Tab query with a response. No-content-script tabs resolve null
     (promise rejection on MV3, lastError on callback style) — never throw. */
  function queryTab(message, cb) {
    var done = false;
    function once(v) { if (!done) { done = true; cb(v); } }
    try {
      var tabs = api.tabs;
      if (!tabs || !tabs.query) { once(null); return; }
      tabs.query({ active: true, currentWindow: true }, function (list) {
        try {
          if (!list || !list[0] || list[0].id == null) { once(null); return; }
          var pending = api.tabs.sendMessage(list[0].id, message, function (res) {
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) {
              once(null);
              return;
            }
            once(res || null);
          });
          if (pending && typeof pending.then === 'function') {
            /* Firefox resolves the response on the promise and ignores the
               callback; MV3 Chrome rejects here when no listener exists. */
            pending.then(function (res) { once(res || null); }, function () { once(null); });
          }
        } catch (e) { once(null); }
      });
    } catch (e) { once(null); }
  }

  /* Single round-trip: live count + the page's actual pair
     (null in chaos mode / when off / no content script). */
  function refreshState() {
    queryTab({ type: 'alibi-state' }, function (res) {
      if (res && Array.isArray(res.pair) && res.pair.length >= 2) {
        elAliasAlice.textContent = res.pair[0];
        elAliasBob.textContent = res.pair[1];
      }
      if (res && typeof res.count === 'number') {
        elCount.textContent = res.count > 0
          ? res.count + ' name' + (res.count === 1 ? '' : 's') + ' changed here'
          : 'Nothing to rename on this page';
      }
    });
  }

  /* --- init --- */

  api.storage.sync.get(DEFAULTS, function (stored) {
    settings = Object.assign({}, DEFAULTS, stored);
    loadPacks(function () {
      renderControls();
      refreshState();
    });
  });
})();
