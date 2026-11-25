/* RUMBLE ui: menus, input (keys, 4 pads, touch), layout, game loop, save/load with rolling backups. ES5. */
var $ = function (id) { return document.getElementById(id); };
function qa(root, sel) { return [].slice.call((root || document).querySelectorAll(sel)); }
function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; }
function clean(s, n) { return String(s == null ? '' : s).replace(/[​-‏‪-‮⁠-⁤︀-️]|\uDB40[\uDC00-\uDC7F]/g, '').slice(0, n || 40); }

/* ---------- state ---------- */
var CTRLS = ['off', 'bot', 'kb1', 'kb2', 'pad1', 'pad2', 'pad3', 'pad4', 'touch'];
var CTRL_NAME = { off: 'Off', bot: 'Bot', kb1: 'Keys WASD', kb2: 'Keys arrows', pad1: 'Pad 1', pad2: 'Pad 2', pad3: 'Pad 3', pad4: 'Pad 4', touch: 'Touch' };
var BADGES = [
  { id: 'first_win', name: 'First win', desc: 'Win any match' }, { id: 'matches10', name: 'Regular', desc: 'Play 10 matches' },
  { id: 'ko10', name: 'Ten KOs', desc: '10 KOs in total' }, { id: 'ko50', name: 'Fifty KOs', desc: '50 KOs in total' },
  { id: 'items25', name: 'Scavenger', desc: 'Pick up 25 items' }, { id: 'all_stages', name: 'Globetrotter', desc: 'Play all 4 arenas' },
  { id: 'all_fighters', name: 'Roster', desc: 'Play all 6 fighters' }, { id: 'expert', name: 'Giant slayer', desc: 'Win against an Expert bot' },
  { id: 'timed_win', name: 'Against the clock', desc: 'Win a timed match' }
];
var TOUCHY = (function () { try { return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0); } catch (e) { return false; } })();
var STR = {
  set: { vol: 70, music: 60, sfx: 80, reduce: false, text: 1, touch: 'auto', shake: true },
  unl: {}, rec: null, cfg: null
};
function defRec() { return { matches: 0, wins: {}, played: {}, kos: 0, falls: 0, dmg: 0, items: 0, stages: {}, longest: 0, fastest: 0, winsTimed: 0 }; }
function defCfg() {
  return { mode: 'stock', stocks: 3, time: 120, stage: 'yard', items: 1, slots: [
    { ctrl: TOUCHY ? 'touch' : 'kb1', fighter: 'IO', level: 1 }, { ctrl: 'bot', fighter: 'VIDA', level: 1 }, { ctrl: 'bot', fighter: 'TORTUGA', level: 1 }, { ctrl: 'bot', fighter: 'CORAL', level: 1 }] };
}
STR.rec = defRec(); STR.cfg = defCfg(); STR.touched = false;
try { if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) STR.set.reduce = true; } catch (e) {}

/* ---------- storage: save, 5 rolling backups, folder and file transfer ---------- */
var SAVEKEY = 'rumble.save.v1', BKEY = 'rumble.backups.v1', FILENAME = 'rumble-save.json';
function num(v, a, b, d) { v = +v; return (v !== v) ? d : clamp(v, a, b); }
function sanitize(o) {
  if (!o || typeof o !== 'object' || o.app !== 'rumble') return null;
  var s = o.settings || {}, out = { settings: {}, unlocks: {}, records: defRec(), cfg: null }, i, k;
  out.settings.vol = num(s.vol, 0, 100, 70); out.settings.music = num(s.music, 0, 100, 60); out.settings.sfx = num(s.sfx, 0, 100, 80);
  out.settings.reduce = !!s.reduce; out.settings.text = Math.round(num(s.text, 0, 2, 1)); out.settings.shake = s.shake !== false;
  out.settings.touch = (s.touch === 'on' || s.touch === 'off') ? s.touch : 'auto';
  for (i = 0; i < BADGES.length; i++) if (o.unlocks && o.unlocks[BADGES[i].id] === true) out.unlocks[BADGES[i].id] = true;
  var r = o.records || {}, R = out.records;
  R.matches = num(r.matches, 0, 1e7, 0); R.kos = num(r.kos, 0, 1e7, 0); R.falls = num(r.falls, 0, 1e7, 0); R.dmg = num(r.dmg, 0, 1e9, 0); R.items = num(r.items, 0, 1e7, 0);
  R.longest = num(r.longest, 0, 1e7, 0); R.fastest = num(r.fastest, 0, 1e7, 0); R.winsTimed = num(r.winsTimed, 0, 1e7, 0);
  for (i = 0; i < FIGHTERS.length; i++) { k = FIGHTERS[i].id; R.wins[k] = num(r.wins && r.wins[k], 0, 1e7, 0); R.played[k] = num(r.played && r.played[k], 0, 1e7, 0); }
  for (i = 0; i < STAGES.length; i++) { k = STAGES[i].id; R.stages[k] = num(r.stages && r.stages[k], 0, 1e7, 0); }
  return out;
}
function snapshot() { return { app: 'rumble', v: 1, t: Date.now(), settings: STR.set, unlocks: STR.unl, records: STR.rec }; }
function applyData(d) { STR.set = d.settings; STR.unl = d.unlocks; STR.rec = d.records; applySettings(); }
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
function ring() { var s = lsGet(BKEY), a = []; try { a = JSON.parse(s || '[]'); } catch (e) { a = []; } if (!Array.isArray(a)) a = []; return a.filter(function (x) { return x && typeof x.s === 'string' && typeof x.t === 'number'; }).slice(0, 5); }
function core() { var s = snapshot(); return JSON.stringify({ app: s.app, v: s.v, settings: s.settings, unlocks: s.unlocks, records: s.records }); }
function backup(force) {
  var a = ring(), c = core();
  if (a.length && a[0].c === c) return false;
  if (!force && a.length && Date.now() - a[0].t < 20000) return false;
  a.unshift({ t: Date.now(), s: JSON.stringify(snapshot()), c: c }); a = a.slice(0, 5); lsSet(BKEY, JSON.stringify(a)); return true;
}
function persist(forceBackup) { lsSet(SAVEKEY, JSON.stringify(snapshot())); backup(!!forceBackup); }
function loadSaved() {
  var s = lsGet(SAVEKEY); if (!s) return false;
  try { var d = sanitize(JSON.parse(s)); if (d) { applyData(d); return true; } } catch (e) {} return false;
}
function stamp(t) { var d = new Date(t); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()); }
function status(msg) { var e = $('saveStatus'); if (e) e.textContent = clean(msg, 140); }
function importText(txt, label) {
  var d; try { d = sanitize(JSON.parse(String(txt).slice(0, 400000))); } catch (e) { d = null; }
  if (!d) { status('Load failed: not a valid RUMBLE save file.'); return false; }
  backup(true); applyData(d); persist(true); renderBackups(); renderRecords(); applySettingsUi(); status('Loaded ' + label + '.'); return true;
}
function saveToFolder() {
  if (!window.showDirectoryPicker) { status('Folder picking is not available here. Use Download.'); return; }
  window.showDirectoryPicker({ mode: 'readwrite' }).then(function (dir) {
    return dir.getFileHandle(FILENAME, { create: true }).then(function (fh) { return fh.createWritable().then(function (w) { return w.write(JSON.stringify(snapshot(), null, 1)).then(function () { return w.close(); }); }); });
  }).then(function () { status('Saved ' + FILENAME + ' to the chosen folder.'); }, function (e) { status(e && e.name === 'AbortError' ? 'Folder choice cancelled.' : 'Folder save failed.'); });
}
function loadFromFolder() {
  if (!window.showDirectoryPicker) { status('Folder picking is not available here. Use Upload.'); return; }
  window.showDirectoryPicker({ mode: 'read' }).then(function (dir) {
    return dir.getFileHandle(FILENAME).then(function (fh) { return fh.getFile(); }).then(function (f) { return f.text(); });
  }).then(function (t) { importText(t, 'from the folder'); }, function (e) { status(e && e.name === 'AbortError' ? 'Folder choice cancelled.' : 'No ' + FILENAME + ' in that folder.'); });
}
function downloadSave() {
  try {
    var blob = new Blob([JSON.stringify(snapshot(), null, 1)], { type: 'application/json' });
    if (navigator.msSaveBlob) { navigator.msSaveBlob(blob, FILENAME); status('Downloaded ' + FILENAME + '.'); return; }
    var u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = FILENAME; a.style.display = 'none'; document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(u); }, 500); status('Downloaded ' + FILENAME + '.');
  } catch (e) { status('Download failed.'); }
}
function uploadFile(file) {
  if (!file) return; if (file.size > 400000) { status('That file is too large.'); return; }
  var r = new FileReader(); r.onload = function () { importText(r.result, 'from ' + clean(file.name, 30)); }; r.onerror = function () { status('Could not read that file.'); }; r.readAsText(file);
}
function renderBackups() {
  var box = $('bkList'); if (!box) return; box.textContent = ''; var a = ring();
  for (var i = 0; i < 5; i++) {
    (function (i) {
      var b = el('button', 'btn sm', a[i] ? 'Restore ' + (i + 1) + ': ' + stamp(a[i].t) : 'Backup ' + (i + 1) + ': empty'); b.type = 'button'; if (!a[i]) b.disabled = true;
      b.addEventListener('click', function () { var d; try { d = sanitize(JSON.parse(a[i].s)); } catch (e) { d = null; } if (d) { applyData(d); lsSet(SAVEKEY, JSON.stringify(snapshot())); renderRecords(); applySettingsUi(); status('Restored backup ' + (i + 1) + ' (' + stamp(a[i].t) + ').'); } else status('That backup is damaged.'); });
      box.appendChild(b);
    })(i);
  }
}

/* ---------- settings ---------- */
function applySettings() {
  var S = STR.set; AU.vol = S.vol / 100; AU.music = S.music / 100; AU.sfxv = S.sfx / 100; auVol();
  document.documentElement.style.fontSize = ['14px', '16px', '19px'][S.text] || '16px';
  document.body.className = document.body.className.replace(/\breduce\b/g, '').replace(/\s+$/, '') + (S.reduce ? ' reduce' : '');
  if (typeof layout === 'function' && $('app')) layout();
}
var SETDEF = [
  { k: 'vol', n: 'Master volume', v: [0, 25, 50, 70, 85, 100], f: function (x) { return x + '%'; } },
  { k: 'music', n: 'Music', v: [0, 25, 50, 60, 80, 100], f: function (x) { return x + '%'; } },
  { k: 'sfx', n: 'Sound effects', v: [0, 25, 50, 80, 100], f: function (x) { return x + '%'; } },
  { k: 'reduce', n: 'Reduced motion', v: [false, true], f: function (x) { return x ? 'On' : 'Off'; } },
  { k: 'text', n: 'Text size', v: [0, 1, 2], f: function (x) { return ['Small', 'Medium', 'Large'][x]; } },
  { k: 'touch', n: 'Touch controls', v: ['auto', 'on', 'off'], f: function (x) { return x === 'auto' ? 'Auto' : (x === 'on' ? 'Always' : 'Hidden'); } },
  { k: 'shake', n: 'Screen shake', v: [true, false], f: function (x) { return x ? 'On' : 'Off'; } }
];
function setCycle(k, dir) {
  for (var i = 0; i < SETDEF.length; i++) if (SETDEF[i].k === k) {
    var d = SETDEF[i], v = d.v, cur = 0, j; for (j = 0; j < v.length; j++) if (v[j] === STR.set[k]) cur = j; else if (typeof v[j] === 'number' && typeof STR.set[k] === 'number' && v[j] <= STR.set[k]) cur = j;
    STR.set[k] = v[(cur + dir + v.length) % v.length]; applySettings(); applySettingsUi(); persist(false); return;
  }
}
function applySettingsUi() { qa($('p-settings'), '[data-set]').forEach(function (b) { for (var i = 0; i < SETDEF.length; i++) if (SETDEF[i].k === b.getAttribute('data-set')) b.textContent = SETDEF[i].n + ': ' + SETDEF[i].f(STR.set[SETDEF[i].k]); }); }

/* ---------- input ---------- */
var KEYS = {}, PADS = [], TCH = { l: 0, r: 0, u: 0, d: 0, jump: 0, light: 0, heavy: 0, special: 0, dodge: 0, shield: 0 }, lastInputSrc = 'key';
var KMAP = { kb1: { l: ['KeyA'], r: ['KeyD'], u: ['KeyW'], d: ['KeyS'], jump: ['KeyW', 'Space'], light: ['KeyJ'], heavy: ['KeyK'], special: ['KeyL'], dodge: ['KeyU'], shield: ['KeyI'] },
  kb2: { l: ['ArrowLeft'], r: ['ArrowRight'], u: ['ArrowUp'], d: ['ArrowDown'], jump: ['ArrowUp'], light: ['Comma'], heavy: ['Period'], special: ['Slash'], dodge: ['Semicolon'], shield: ['Quote'] } };
function kd(list) { for (var i = 0; i < list.length; i++) if (KEYS[list[i]]) return 1; return 0; }
function keyInput(map) {
  var o = blankInput(); o.mx = kd(map.r) - kd(map.l); o.my = kd(map.d) - kd(map.u); o.jump = !!kd(map.jump); o.light = !!kd(map.light); o.heavy = !!kd(map.heavy); o.special = !!kd(map.special); o.dodge = !!kd(map.dodge); o.shield = !!kd(map.shield); return o;
}
function padInput(n) {
  var p = PADS[n], o = blankInput(); if (!p) return o; var b = p.b, ax = p.ax;
  var x = Math.abs(ax[0]) > 0.25 ? ax[0] : 0, y = Math.abs(ax[1]) > 0.35 ? ax[1] : 0;
  if (b[14]) x = -1; if (b[15]) x = 1; if (b[12]) y = -1; if (b[13]) y = 1;
  o.mx = x; o.my = y; o.jump = !!b[0]; o.light = !!b[2]; o.heavy = !!b[3]; o.special = !!b[1]; o.dodge = !!(b[4] || b[6]); o.shield = !!(b[5] || b[7]); return o;
}
function touchInput() { var o = blankInput(); o.mx = TCH.r - TCH.l; o.my = TCH.d - TCH.u; o.jump = !!TCH.jump; o.light = !!TCH.light; o.heavy = !!TCH.heavy; o.special = !!TCH.special; o.dodge = !!TCH.dodge; o.shield = !!TCH.shield; return o; }
function readCtrl(c) {
  if (c === 'kb1') return keyInput(KMAP.kb1); if (c === 'kb2') return keyInput(KMAP.kb2); if (c === 'touch') return touchInput();
  if (c.indexOf('pad') === 0) return padInput(+c.charAt(3) - 1); return null;
}
var padPrev = [];
function pollPads() {
  var g = null; try { g = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : null); } catch (e) { g = null; }
  var list = [], i; if (g) for (i = 0; i < g.length; i++) if (g[i] && g[i].connected !== false) list.push(g[i]);
  list.sort(function (a, b) { return a.index - b.index; }); PADS = [];
  for (i = 0; i < list.length && i < 4; i++) { var p = list[i], b = []; for (var k = 0; k < p.buttons.length; k++) b[k] = (typeof p.buttons[k] === 'object') ? (p.buttons[k].pressed || p.buttons[k].value > 0.6) : !!p.buttons[k]; PADS.push({ b: b, ax: [p.axes[0] || 0, p.axes[1] || 0], id: p.id }); }
  if (!STR.touched && PADS.length && !S_inGame()) { for (i = 0; i < PADS.length && i < 4; i++) { if (STR.cfg.slots[i].ctrl === 'bot' || STR.cfg.slots[i].ctrl === 'kb1' || STR.cfg.slots[i].ctrl === 'touch') STR.cfg.slots[i].ctrl = 'pad' + (i + 1); } STR.touched = true; buildSlots(); }
}
function anyInputUnlock(e) { lastInputSrc = e && e.type && e.type.indexOf('key') === 0 ? 'key' : lastInputSrc; auInit(e); }

/* ---------- panels and focus navigation ---------- */
var panelStack = [], curPanel = null, inGame = false, paused = false;
function S_inGame() { return inGame; }
function showPanel(id, push) {
  var menu = $('menu'); if (push && curPanel) panelStack.push(curPanel);
  qa(menu, '.panel').forEach(function (p) { p.className = p.className.replace(/\bon\b/g, '').replace(/\s+$/, ''); });
  var p = $(id); p.className += ' on'; curPanel = id; menu.hidden = false;
  if (id === 'p-records') renderRecords(); if (id === 'p-save') renderBackups(); if (id === 'p-setup') refreshSetup();
  if (id === 'p-main' && !inGame) auMusic('menu');
  fitPanel(); focusFirst();
}
function goBack() {
  if (curPanel === 'p-pause') { resumeGame(); return; }
  if (curPanel === 'p-results') { toMain(); return; }
  var prev = panelStack.pop(); if (prev) showPanel(prev, false); else if (curPanel !== 'p-main' && !inGame) showPanel('p-main', false); else if (inGame) { showPanel('p-pause', false); }
  sfxPlay('ui_back');
}
function fitPanel() {
  var p = $(curPanel), menu = $('menu'); if (!p) return; p.style.fontSize = ''; var sc = 1, base = parseFloat(getComputedStyle(p).fontSize) || 16;
  while (sc > 0.62 && (p.scrollHeight > p.clientHeight + 1 || p.scrollWidth > p.clientWidth + 1)) { sc -= 0.04; p.style.fontSize = (base * sc).toFixed(2) + 'px'; }
}
function vis(e) { return e.offsetParent !== null && !e.disabled; }
function focusables() { var p = $(curPanel); return p ? qa(p, 'button,a[href]').filter(vis) : []; }
function focusFirst() { var f = focusables(); var pref = qa($(curPanel), '[data-first]').filter(vis)[0]; var t = pref || f[0]; if (t) try { t.focus(); } catch (e) {} }
function navMove(dx, dy) {
  var list = focusables(), cur = document.activeElement; if (!list.length) return;
  if (list.indexOf(cur) < 0) { list[0].focus(); return; }
  var r = cur.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, best = null, bs = 1e9;
  list.forEach(function (e) {
    if (e === cur) return; var q = e.getBoundingClientRect(), ex = q.left + q.width / 2, ey = q.top + q.height / 2, ddx = ex - cx, ddy = ey - cy, along = dx ? ddx * dx : ddy * dy, perp = dx ? Math.abs(ddy) : Math.abs(ddx);
    if (along <= 4) return; var sc = along + perp * 2.2; if (sc < bs) { bs = sc; best = e; }
  });
  if (best) { best.focus(); sfxPlay('ui'); }
}
function activate() { var c = document.activeElement; if (c && c.click && vis(c)) c.click(); }
document.addEventListener('pointerdown', function () { document.body.className = document.body.className.replace(/\bkbnav\b/g, '').replace(/\s+$/, ''); }, true);
function kbnavOn() { if (document.body.className.indexOf('kbnav') < 0) document.body.className += ' kbnav'; }

/* ---------- setup panel ---------- */
function cyc(arr, cur, dir) { var i = arr.indexOf(cur); if (i < 0) i = 0; return arr[(i + dir + arr.length) % arr.length]; }
var STOCKS = [1, 2, 3, 4, 5], TIMES = [60, 120, 180, 300];
function optCycle(key, dir) {
  var c = STR.cfg; STR.touched = true;
  if (key === 'mode') c.mode = c.mode === 'stock' ? 'timed' : 'stock';
  else if (key === 'stage') { var ids = STAGES.map(function (s) { return s.id; }); c.stage = cyc(ids, c.stage, dir); }
  else if (key === 'amount') { if (c.mode === 'stock') c.stocks = cyc(STOCKS, c.stocks, dir); else c.time = cyc(TIMES, c.time, dir); }
  else if (key === 'items') c.items = (c.items + dir + 3) % 3;
  else { var m = /^(ctrl|fighter|level)(\d)$/.exec(key); if (m) { var sl = c.slots[+m[2]]; if (m[1] === 'ctrl') sl.ctrl = cyc(CTRLS, sl.ctrl, dir); else if (m[1] === 'fighter') sl.fighter = cyc(FIGHTERS.map(function (f) { return f.id; }), sl.fighter, dir); else sl.level = (sl.level + dir + 4) % 4; } }
  refreshSetup(); sfxPlay('ui');
}
function buildSlots() {
  var box = $('slots'); box.textContent = '';
  for (var i = 0; i < 4; i++) {
    (function (i) {
      var row = el('div', 'slot'), pv = el('canvas', 'pv'); pv.width = 56; pv.height = 56; pv.id = 'pvF' + i; pv.setAttribute('aria-hidden', 'true');
      var tag = el('span', 'ptag', 'P' + (i + 1)); tag.style.background = PCOL[i];
      var b1 = el('button', 'btn sm'), b2 = el('button', 'btn sm'), b3 = el('button', 'btn sm');
      b1.id = 'o-ctrl' + i; b2.id = 'o-fighter' + i; b3.id = 'o-level' + i; [b1, b2, b3].forEach(function (b, k) {
        b.type = 'button'; var key = ['ctrl', 'fighter', 'level'][k] + i; b.setAttribute('data-opt', key);
        b.addEventListener('click', function () { optCycle(key, 1); }); b.addEventListener('contextmenu', function (e) { e.preventDefault(); optCycle(key, -1); });
      });
      row.appendChild(tag); row.appendChild(pv); row.appendChild(b1); row.appendChild(b2); row.appendChild(b3); box.appendChild(row);
    })(i);
  }
}
function refreshSetup() {
  var c = STR.cfg, st = stageById(c.stage), i;
  $('o-mode').textContent = 'Mode: ' + (c.mode === 'stock' ? 'Stock' : 'Timed'); $('o-stage').textContent = 'Arena: ' + st.name;
  $('o-amount').textContent = c.mode === 'stock' ? 'Stocks: ' + c.stocks : 'Time: ' + (c.time / 60) + ' min'; $('o-items').textContent = 'Items: ' + ['Off', 'Some', 'Many'][c.items];
  $('stageBlurb').textContent = st.blurb; drawStagePreview($('pvStage'), st);
  for (i = 0; i < 4; i++) {
    var sl = c.slots[i]; $('o-ctrl' + i).textContent = CTRL_NAME[sl.ctrl]; $('o-fighter' + i).textContent = sl.fighter; var lb = $('o-level' + i);
    if (sl.ctrl === 'bot') { lb.disabled = false; lb.textContent = BOT_LEVELS[sl.level]; } else { lb.disabled = true; lb.textContent = sl.ctrl === 'off' ? '-' : 'Human'; }
    var cv = $('pvF' + i); cv.style.opacity = sl.ctrl === 'off' ? 0.25 : 1; drawFighterIcon(cv, sl.fighter);
  }
  var act = c.slots.filter(function (s) { return s.ctrl !== 'off'; }).length; $('bStart').disabled = act < 2; $('setupMsg').textContent = act < 2 ? 'Need at least 2 players.' : (c.slots.filter(function (s) { return s.ctrl === 'bot'; }).length === act ? 'Bots only: watch mode.' : 'Fighter: ' + clean(fighterById(c.slots[0].fighter).desc, 70));
}

/* ---------- records / badges ---------- */
function renderRecords() {
  var R = STR.rec, box = $('recBox'); box.textContent = ''; var best = '-', bw = 0, k;
  for (k in R.wins) if (R.wins.hasOwnProperty(k) && R.wins[k] > bw) { bw = R.wins[k]; best = k; }
  var rows = [['Matches', R.matches], ['KOs', R.kos], ['Falls', R.falls], ['Damage dealt', Math.round(R.dmg) + '%'], ['Items picked', R.items], ['Top fighter', bw ? best + ' (' + bw + ' wins)' : '-'], ['Longest match', R.longest ? Math.round(R.longest / 60) + ' s' : '-'], ['Fastest win', R.fastest ? Math.round(R.fastest / 60) + ' s' : '-']];
  rows.forEach(function (r) { var d = el('div', 'stat'); d.appendChild(el('b', '', String(r[1]))); d.appendChild(el('span', '', r[0])); box.appendChild(d); });
  var bb = $('badgeBox'); bb.textContent = ''; BADGES.forEach(function (b) { var d = el('div', 'badge' + (STR.unl[b.id] ? ' got' : ''), (STR.unl[b.id] ? '✓ ' : '') + b.name); d.title = b.desc; bb.appendChild(d); });
}
function checkBadges() {
  var R = STR.rec, n = 0, got = [];
  function g(id, ok) { if (ok && !STR.unl[id]) { STR.unl[id] = true; got.push(id); } }
  var pc = 0, sc = 0, k; for (k in R.played) if (R.played[k] > 0) pc++; for (k in R.stages) if (R.stages[k] > 0) sc++;
  var w = 0; for (k in R.wins) w += R.wins[k];
  g('first_win', w > 0); g('matches10', R.matches >= 10); g('ko10', R.kos >= 10); g('ko50', R.kos >= 50); g('items25', R.items >= 25); g('all_stages', sc >= 4); g('all_fighters', pc >= 6); g('timed_win', R.winsTimed > 0);
  return got;
}

/* ---------- layout ---------- */
var cv = null, g2 = null, DPR = 1, LAY = { cw: 800, ch: 450, flank: false };
function touchWanted() { var t = STR.set.touch; return t === 'on' || (t === 'auto' && TOUCHY); }
function layout() {
  var main = $('app'); if (!main) return; var free = main.clientHeight, W = main.clientWidth, chh = Math.round(free * 0.8), wide = Math.round(chh * 16 / 9), flank = W >= wide + 300, cw = flank ? wide : W;
  LAY.cw = cw; LAY.ch = chh; LAY.flank = flank; LAY.free = free;
  var game = $('game'); game.className = (flank ? 'flank ' : 'btm ') + (touchWanted() ? 'tc' : 'notc');
  var tbs = flank ? Math.min(64, Math.floor((chh - 20) / 3), Math.floor(((W - cw) / 2 - 14) / 3)) : Math.min(60, Math.floor((free - chh - 12) / 2), Math.floor((W - 130) / 6)); game.style.setProperty('--tb', Math.max(44, tbs) + 'px');
  $('row1').style.height = chh + 'px'; $('cwrap').style.width = cw + 'px'; $('under').style.height = (free - chh) + 'px';
  DPR = LEG ? 1 : Math.min(window.devicePixelRatio || 1, 2); cv.style.width = cw + 'px'; cv.style.height = chh + 'px'; cv.width = Math.round(cw * DPR); cv.height = Math.round(chh * DPR);
  var tl = TPAD.l, tr = TPAD.r, tc = touchWanted();
  if (tc) { var dstL = flank ? $('flL') : $('under'), dstR = flank ? $('flR') : $('under'); if (tl.parentNode !== dstL) dstL.insertBefore(tl, dstL.firstChild); if (tr.parentNode !== dstR) dstR.appendChild(tr); if (!flank) { $('bPause').parentNode.removeChild($('bPause')); $('under').insertBefore($('bPause'), tr); } else { if ($('bPause').parentNode !== $('under')) $('under').appendChild($('bPause')); } }
  else if ($('bPause').parentNode !== $('under')) $('under').appendChild($('bPause'));
  if (!flank && tc) { /* keep order: tL, pause, tR */ $('under').insertBefore(tl, $('under').firstChild); $('under').insertBefore($('bPause'), tr); }
  if (!tc) { [tl, tr].forEach(function (x) { if (x.parentNode) x.parentNode.removeChild(x); }); }
  $('hint').style.display = (!tc) ? '' : 'none';
  if (G.match) G.cam.init = true;
  if (curPanel && !$('menu').hidden) fitPanel();
}
function hintText() {
  var s = STR.cfg.slots, parts = [];
  s.forEach(function (x, i) { if (x.ctrl === 'kb1') parts.push('P' + (i + 1) + ' WASD, J light, K heavy, L special, U dodge, I shield'); else if (x.ctrl === 'kb2') parts.push('P' + (i + 1) + ' arrows, , light, . heavy, / special, ; dodge, \' shield'); else if (x.ctrl.indexOf('pad') === 0) parts.push('P' + (i + 1) + ' pad'); });
  return parts.join('  |  ') + '  |  Esc pause';
}
var TPAD = { l: null, r: null };
function buildTouch() {
  var tl = $('tL'), tr = $('tR'); TPAD.l = tl; TPAD.r = tr;
  function mk(parent, label, key, cls, aria) {
    var b = el('button', 'tb ' + cls, label); b.type = 'button'; b.setAttribute('aria-label', aria); b.setAttribute('data-t', key);
    function dn(e) { if (e.preventDefault) e.preventDefault(); TCH[key] = 1; b.className += ' hold'; auInit(e); }
    function up(e) { if (e && e.preventDefault) e.preventDefault(); TCH[key] = 0; b.className = b.className.replace(/\bhold\b/g, '').replace(/\s+$/, ''); }
    if (window.PointerEvent) { b.addEventListener('pointerdown', function (e) { try { b.setPointerCapture(e.pointerId); } catch (x) {} dn(e); }); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up); }
    else { b.addEventListener('touchstart', dn); b.addEventListener('touchend', up); b.addEventListener('touchcancel', up); b.addEventListener('mousedown', dn); b.addEventListener('mouseup', up); b.addEventListener('mouseleave', up); }
    b.addEventListener('contextmenu', function (e) { e.preventDefault(); }); parent.appendChild(b); return b;
  }
  mk(tl, '▲', 'u', 'ta', 'Up'); mk(tl, '◀', 'l', 'tb-l', 'Left'); mk(tl, '▼', 'd', 'tb-d', 'Down'); mk(tl, '▶', 'r', 'tb-r', 'Right');
  mk(tr, 'Jump', 'jump', 'tj', 'Jump'); mk(tr, 'Hit', 'light', 'tl1', 'Light attack'); mk(tr, 'Heavy', 'heavy', 'th', 'Heavy attack'); mk(tr, 'Spec', 'special', 'ts', 'Special'); mk(tr, 'Dodge', 'dodge', 'td', 'Dodge'); mk(tr, 'Shield', 'shield', 'tsh', 'Shield');
}

/* ---------- game ---------- */
var G = { match: null, cam: { x: 800, y: 400, s: 0.5, init: true, d: 1 }, last: 0, acc: 0, raf: 0, perf: [], shown: false, frames: 0, resShown: false, t0: 0 };
function mkProvider(m) { return function (f) { return readCtrl(f.ctrl); }; }
function startMatch(cfg, fresh) {
  auInit(null); inGame = true; paused = false; G.resShown = false;
  var c = JSON.parse(JSON.stringify(cfg)); c.seed = (Date.now() ^ (G.frames * 2654435761)) >>> 0;
  var m = new Match(c, true); m.provider = mkProvider(m); G.match = m; G.cam.init = true; G.acc = 0;
  document.body.className = document.body.className.replace(/\bingame\b/g, '').replace(/\s+$/, '') + ' ingame';
  $('game').hidden = false; $('menu').hidden = true; $('hint').textContent = hintText(); layout();
  auMusic(c.stage); $('bPause').focus();
}
function pauseGame() { if (!inGame || !G.match || G.match.over) return; paused = true; showPanel('p-pause', false); panelStack = []; }
function resumeGame() { paused = false; $('menu').hidden = true; curPanel = null; panelStack = []; G.last = performance.now(); try { $('bPause').focus(); } catch (e) {} }
function toMain() {
  inGame = false; paused = false; G.match = null; panelStack = []; $('game').hidden = true;
  document.body.className = document.body.className.replace(/\bingame\b/g, '').replace(/\s+$/, ''); auMusic('menu'); showPanel('p-main', false); if (window.__avLifeShow) window.__avLifeShow(true);
}
function showResults() {
  var m = G.match, R = STR.rec; G.resShown = true; var res = m.results, win = res[0];
  R.matches++; R.stages[m.stage.id] = (R.stages[m.stage.id] || 0) + 1; R.longest = Math.max(R.longest, m.elapsed);
  var humanWin = false;
  res.forEach(function (r) { R.played[r.fighter] = (R.played[r.fighter] || 0) + 1; if (r.ctrl !== 'bot') { R.kos += r.kos; R.falls += r.falls; R.dmg += r.dealt; R.items += r.items; } });
  if (win.ctrl !== 'bot') { humanWin = true; R.wins[win.fighter] = (R.wins[win.fighter] || 0) + 1; if (!R.fastest || m.elapsed < R.fastest) R.fastest = m.elapsed; if (m.cfg.mode === 'timed') R.winsTimed++; if (res.some(function (r) { return r.ctrl === 'bot' && r.lvl === 3; })) STR.unl.expert = true; }
  var got = checkBadges(); persist(true);
  var box = $('resList'); box.textContent = '';
  res.forEach(function (r) {
    var row = el('div', 'rrow' + (r.place === 1 ? ' first' : '')), cvs = el('canvas', 'pv'); cvs.width = 56; cvs.height = 56; drawFighterIcon(cvs, r.fighter);
    var who = (r.ctrl === 'bot' ? 'CPU ' + BOT_LEVELS[r.lvl] : 'Player ' + (r.slot + 1));
    row.appendChild(el('b', 'pl', '#' + r.place)); row.appendChild(cvs);
    var t = el('div', 'rt'); t.appendChild(el('b', '', r.name)); t.appendChild(el('span', '', who)); row.appendChild(t);
    row.appendChild(el('span', 'rs', 'KO ' + r.kos + '  Falls ' + r.falls + '  Dmg ' + r.dealt)); row.style.borderColor = PCOL[r.slot % 4]; box.appendChild(row);
  });
  $('resTitle').textContent = win.name + ' wins' + (m.cfg.mode === 'timed' ? ' on points' : ''); $('resBadge').textContent = got.length ? 'New badge: ' + got.map(function (id) { for (var i = 0; i < BADGES.length; i++) if (BADGES[i].id === id) return BADGES[i].name; return ''; }).join(', ') : '';
  paused = true; showPanel('p-results', false); panelStack = [];
}
var frameAcc = 0;
function stepSim() {
  var m = G.match; if (!m) return;
  if (m.slow > 0) { m.slow--; frameAcc++; if (frameAcc % 3) return; }
  m.update();
}
function frame(now) {
  G.raf = requestAnimationFrame(frame); var t0 = performance.now(); G.frames++;
  pollPads(); padMenuNav(now);
  var m = G.match;
  if (inGame && m) {
    if (!paused) {
      var dt = Math.min(100, now - (G.last || now)); G.acc += dt; var n = 0; while (G.acc >= 16.6667 && n < 4) { stepSim(); G.acc -= 16.6667; n++; } if (n === 4) G.acc = 0;
      if (m.over && m.endT > 100 && !G.resShown) showResults();
      if (padEdge9) pauseGame();
    }
    var ts = now / 1000; drawScene(g2, m, G.cam, LAY.cw, LAY.ch, DPR, ts, STR.set.shake && !STR.set.reduce);
  }
  G.last = now; var ms = performance.now() - t0; G.perf.push(ms); if (G.perf.length > 900) G.perf.shift();
}
var padNavT = 0, padNavDir = '', padEdge9 = false;
function padDir(p) { if (p.b[12] || p.ax[1] < -0.55) return 'u'; if (p.b[13] || p.ax[1] > 0.55) return 'd'; if (p.b[14] || p.ax[0] < -0.55) return 'l'; if (p.b[15] || p.ax[0] > 0.55) return 'r'; return ''; }
function doNav(d) { kbnavOn(); navMove(d === 'l' ? -1 : (d === 'r' ? 1 : 0), d === 'u' ? -1 : (d === 'd' ? 1 : 0)); }
function padMenuNav(now) {
  var i, menuOn = !$('menu').hidden, dir = ''; padEdge9 = false;
  for (i = 0; i < PADS.length; i++) { var pv = padPrev[i] || [], p = PADS[i]; if (p.b[9] && !pv[9]) padEdge9 = true; if (!dir) dir = padDir(p);
    if (menuOn) { if (p.b[0] && !pv[0]) { kbnavOn(); auInit(null); activate(); } if (p.b[2] && !pv[2]) { var c = document.activeElement; if (c && c.getAttribute && c.getAttribute('data-opt')) optCycle(c.getAttribute('data-opt'), -1); } if (p.b[1] && !pv[1]) goBack(); if (p.b[9] && !pv[9] && curPanel === 'p-pause') resumeGame(); } }
  if (menuOn) { if (dir) { if (dir !== padNavDir) { padNavDir = dir; padNavT = now + 260; doNav(dir); } else if (now >= padNavT) { padNavT = now + 110; doNav(dir); } } else padNavDir = ''; }
  padPrev = PADS.map(function (p) { return p.b.slice(); });
  if (PADS.length && !window.__padSeen) { window.__padSeen = 1; auInit(null); }
}
function simulate(cfg, maxFrames) { /* headless fast run of the very same engine (used by the tests) */
  var c = JSON.parse(JSON.stringify(cfg)); c.seed = c.seed || 777; var m = new Match(c, false), n = 0; while (!m.over && n < maxFrames) { m.update(); n++; }
  return { over: m.over, frames: n, results: m.results, falls: m.fs.map(function (f) { return f.falls; }) };
}

/* ---------- wiring ---------- */
function bind() {
  cv = $('cv'); g2 = cv.getContext('2d'); buildTouch(); buildSlots();
  qa(document, '[data-go]').forEach(function (b) { b.addEventListener('click', function () { sfxPlay('ui_ok'); showPanel(b.getAttribute('data-go'), true); }); });
  qa(document, '[data-back]').forEach(function (b) { b.addEventListener('click', goBack); });
  qa(document, '[data-opt]').forEach(function (b) { var k = b.getAttribute('data-opt'); b.addEventListener('click', function () { optCycle(k, 1); }); b.addEventListener('contextmenu', function (e) { e.preventDefault(); optCycle(k, -1); }); });
  qa(document, '[data-set]').forEach(function (b) { var k = b.getAttribute('data-set'); b.addEventListener('click', function () { setCycle(k, 1); sfxPlay('ui'); }); b.addEventListener('contextmenu', function (e) { e.preventDefault(); setCycle(k, -1); }); });
  $('bStart').addEventListener('click', function () { STR.cfg.slots.forEach(function (s) { }); persistCfg(); startMatch(STR.cfg); });
  $('bPause').addEventListener('click', pauseGame);
  $('bResume').addEventListener('click', resumeGame); $('bQuit').addEventListener('click', toMain);
  $('bRematch').addEventListener('click', function () { startMatch(G.match ? G.match.cfg : STR.cfg); });
  $('bResSetup').addEventListener('click', function () { inGame = false; paused = false; G.match = null; $('game').hidden = true; document.body.className = document.body.className.replace(/\bingame\b/g, '').replace(/\s+$/, ''); panelStack = ['p-main']; showPanel('p-setup', false); auMusic('menu'); });
  $('bResMenu').addEventListener('click', toMain);
  $('bSaveFolder').addEventListener('click', saveToFolder); $('bLoadFolder').addEventListener('click', loadFromFolder); $('bDownload').addEventListener('click', downloadSave);
  $('bUpload').addEventListener('click', function () { $('fileIn').click(); }); $('fileIn').addEventListener('change', function () { uploadFile(this.files && this.files[0]); this.value = ''; });
  $('bBackup').addEventListener('click', function () { var ok = backup(true); renderBackups(); status(ok ? 'Backup made.' : 'Nothing changed since the last backup.'); });
  $('bResetAll').addEventListener('click', function () { if (this.getAttribute('data-arm') !== '1') { this.setAttribute('data-arm', '1'); this.textContent = 'Press again to reset records'; var me = this; setTimeout(function () { me.setAttribute('data-arm', '0'); me.textContent = 'Reset records'; }, 4000); return; } backup(true); STR.rec = defRec(); STR.unl = {}; persist(true); renderBackups(); status('Records reset (a backup of the old data was kept).'); this.setAttribute('data-arm', '0'); this.textContent = 'Reset records'; });
  if (!window.showDirectoryPicker) { $('bSaveFolder').title = 'Not available in this browser: use Download / Upload'; $('folderNote').textContent = 'Folder picker not available here: Download and Upload work instead.'; } else $('folderNote').textContent = 'Folder picker available. Download/Upload also work.';
  document.addEventListener('keydown', function (e) {
    anyInputUnlock(e); var c = e.code || e.key;
    if (!$('menu').hidden) {
      var k = c; if (k === 'ArrowUp' || k === 'KeyW') { e.preventDefault(); kbnavOn(); navMove(0, -1); } else if (k === 'ArrowDown' || k === 'KeyS') { e.preventDefault(); kbnavOn(); navMove(0, 1); } else if (k === 'ArrowLeft' || k === 'KeyA') { e.preventDefault(); kbnavOn(); navMove(-1, 0); } else if (k === 'ArrowRight' || k === 'KeyD') { e.preventDefault(); kbnavOn(); navMove(1, 0); }
      else if (k === 'Escape' || k === 'Backspace') { e.preventDefault(); goBack(); } else if (k === 'KeyP' && curPanel === 'p-pause') resumeGame(); else if (k === 'Enter' || k === 'Space') { var a = document.activeElement; if (a && a.tagName === 'BUTTON') { e.preventDefault(); kbnavOn(); a.click(); } }
      return;
    }
    if (inGame && (c === 'Escape' || c === 'KeyP')) { e.preventDefault(); pauseGame(); return; }
    if (inGame) { if (c === 'Space' || c.indexOf('Arrow') === 0 || c === 'Slash' || c === 'Quote') e.preventDefault(); }
    KEYS[c] = true;
  });
  document.addEventListener('keyup', function (e) { KEYS[e.code || e.key] = false; });
  window.addEventListener('blur', function () { KEYS = {}; for (var k in TCH) TCH[k] = 0; if (inGame && !paused) pauseGame(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && inGame && !paused) pauseGame(); });
  document.addEventListener('pointerdown', function (e) { auInit(e); }, true); document.addEventListener('touchstart', function (e) { auInit(e); }, true); document.addEventListener('mousedown', function (e) { auInit(e); }, true);
  window.addEventListener('gamepadconnected', function () { auInit(null); });
  window.addEventListener('resize', layout); window.addEventListener('orientationchange', function () { setTimeout(layout, 120); });
  window.addEventListener('beforeunload', function () { persist(false); });
}
function persistCfg() { lsSet('rumble.cfg.v1', JSON.stringify(STR.cfg)); }
function loadCfg() {
  var s = lsGet('rumble.cfg.v1'); if (!s) return; try { var c = JSON.parse(s), d = defCfg(); if (c.mode === 'timed') d.mode = 'timed'; if (STOCKS.indexOf(c.stocks) >= 0) d.stocks = c.stocks; if (TIMES.indexOf(c.time) >= 0) d.time = c.time; d.stage = stageById(c.stage).id; d.items = clamp(c.items | 0, 0, 2);
    for (var i = 0; i < 4; i++) { var q = c.slots && c.slots[i]; if (!q) continue; if (CTRLS.indexOf(q.ctrl) >= 0) d.slots[i].ctrl = q.ctrl; d.slots[i].fighter = fighterById(q.fighter).id; d.slots[i].level = clamp(q.level | 0, 0, 3); } STR.cfg = d; STR.touched = true; } catch (e) {}
}
function boot() {
  bind(); loadSaved(); loadCfg(); applySettings(); applySettingsUi(); refreshSetup(); showPanel('p-main', false); layout();
  G.raf = requestAnimationFrame(frame);
  window.__rumble = { STR: STR, G: G, AU: AU, start: startMatch, sim: simulate, layout: layout, LAY: LAY, show: showPanel, pause: pauseGame, resume: resumeGame, ring: ring, backup: backup, persist: persist, snapshot: snapshot, importText: importText, sanitize: sanitize, applyData: applyData, readCtrl: readCtrl, KEYS: KEYS, TCH: TCH, FIGHTERS: FIGHTERS, STAGES: STAGES, Match: Match,
    perf: function () { var a = G.perf.slice().sort(function (x, y) { return x - y; }), s = 0, i; for (i = 0; i < a.length; i++) s += a[i]; return { n: a.length, mean: s / (a.length || 1), p95: a[Math.floor(a.length * 0.95)] || 0, max: a[a.length - 1] || 0 }; }, clearPerf: function () { G.perf = []; } };
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
