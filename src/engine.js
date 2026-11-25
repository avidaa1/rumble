/* RUMBLE engine: fixed 60 Hz simulation, fighters, hits, items, hazards, bots. No rendering here. */
var GRAV = 2600, MAXFALL = 1500, FASTFALL = 2100;

function blankInput() { return { mx: 0, my: 0, jump: false, light: false, heavy: false, special: false, dodge: false, shield: false }; }

function copyInp(i) { return { mx: i.mx, my: i.my, jump: i.jump, light: i.light, heavy: i.heavy, special: i.special, dodge: i.dodge, shield: i.shield }; }
function Fighter(m, idx, slot) {
  this.m = m; this.id = idx; this.def = fighterById(slot.fighter); this.ctrl = slot.ctrl; this.lvl = slot.level | 0;
  this.isBot = this.ctrl === 'bot';
  this.pct = 0; this.stocks = m.cfg.mode === 'stock' ? m.cfg.stocks : 99; this.kos = 0; this.falls = 0; this.dealt = 0; this.taken = 0;
  this.out = false; this.outTick = 0; this.score = 0;
  this.inp = blankInput(); this.prev = blankInput(); this.buf = { jump: 0, light: 0, heavy: 0, special: 0, dodge: 0 };
  this.ai = { cd: 0, inp: blankInput(), press: { jump: 0, light: 0, heavy: 0, special: 0, dodge: 0 }, shT: 0, tgt: -1, why: '' };
  this.spawn(m.stage.spawn[idx], 0);
}
Fighter.prototype.spawn = function (pt, inv) {
  this.x = pt.x; this.y = pt.y; this.vx = 0; this.vy = 0; this.face = this.x < 800 ? 1 : -1; this.grounded = false; this.standing = null;
  this.jumps = 1; this.usedUp = false; this.airDodge = true; this.blinks = 2; this.state = 'idle'; this.atk = null; this.combo = 0; this.comboT = 0;
  this.frz = 0; this.hitstun = 0; this.inv = inv; this.sh = 100; this.shOn = false; this.stun = 0; this.dodgeT = 0; this.dodgeCd = 0; this.drop = 0;
  this.bubble = 0; this.bubCd = 0; this.haste = 0; this.bul = 0; this.feat = 0; this.stat = 0; this.carry = null; this.alive = true; this.respT = 0;
  this.hov = 0; this.jcut = false; this.lastHit = -1; this.lastHitT = -9999; this.lavaCd = 0; this.armorOn = false; this.blinkCd = 0; this.t = 0; this.flash = 0; this.spinT = 0;
};
Fighter.prototype.hurt = function () { return { x: this.x - this.def.w / 2, y: this.y - this.def.h, w: this.def.w, h: this.def.h }; };

function Match(cfg, vis) {
  this.cfg = cfg; this.vis = !!vis; this.rng = new RNG(cfg.seed || 20261125); this.stage = stageById(cfg.stage);
  var st = this.stage; this.tick = 0; this.phase = 'count'; this.cd = 150; this.over = false; this.results = null; this.endT = 0;
  this.plats = []; for (var i = 0; i < st.plats.length; i++) { var p = st.plats[i]; this.plats.push({ x: p.x, y: p.y, w: p.w, mv: p.move || null, dx: 0, solid: false }); }
  this.solids = []; for (i = 0; i < st.solids.length; i++) this.solids.push({ x: st.solids[i].x, y: st.solids[i].y, w: st.solids[i].w, h: st.solids[i].h, solid: true });
  this.fs = []; var n = 0; for (i = 0; i < cfg.slots.length; i++) { if (cfg.slots[i].ctrl !== 'off') { this.fs.push(new Fighter(this, n, cfg.slots[i])); this.fs[n].slot = i; n++; } }
  this.proj = []; this.items = []; this.parts = []; this.texts = []; this.shake = 0; this.itemT = this.itemDelay(); this.outCount = 0;
  this.timeLeft = cfg.mode === 'timed' ? cfg.time * 60 : 0; this.elapsed = 0; this.hzs = []; this.slow = 0; this.hitFlash = 0; this.sudden = false;
  for (i = 0; i < st.hz.length; i++) { var h = st.hz[i], o = { d: h, t: h.ph || 0, phase: 'idle', x: 0, hit: {}, on: false, xi: 0 }; if (h.t === 'beam' || h.t === 'jet') o.t = 140 + i * 40; if (h.t === 'wind') { o.t = 200; o.dir = 1; } if (h.t === 'current') { o.t = -(h.ph || 0); } this.hzs.push(o); }
  this.provider = null;
}
Match.prototype.itemDelay = function () { var lv = this.cfg.items | 0; if (lv === 0) return 99999999; return Math.floor(this.rng.range(lv === 1 ? 700 : 360, lv === 1 ? 1200 : 640)); };
Match.prototype.sfx = function (n, x) { if (this.vis && window.RSFX) window.RSFX(n, x); };
Match.prototype.spark = function (x, y, col, n, spd, life, sz, g) {
  if (!this.vis) return; if (LEG) n = Math.ceil(n * 0.45); if (this.parts.length > (LEG ? 110 : 380)) return;
  for (var i = 0; i < n; i++) { var a = Math.random() * 6.283, s = (0.3 + Math.random() * 0.7) * (spd || 300); this.parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l: life || 24, ml: life || 24, col: col, sz: sz || 4, g: g || 0 }); }
};
Match.prototype.text = function (x, y, s, col) { if (this.vis) this.texts.push({ x: x, y: y, s: s, col: col, l: 60 }); };

/* ---------- surfaces ---------- */
Match.prototype.surfaceAt = function (x, y0, margin) { /* top of the nearest surface at or below y0 under x */
  var best = null, i, s;
  for (i = 0; i < this.solids.length; i++) { s = this.solids[i]; if (x > s.x - margin && x < s.x + s.w + margin && s.y >= y0 - 8 && (!best || s.y < best.y)) best = s; }
  for (i = 0; i < this.plats.length; i++) { s = this.plats[i]; if (x > s.x - margin && x < s.x + s.w + margin && s.y >= y0 - 8 && (!best || s.y < best.y)) best = s; }
  return best;
};
Match.prototype.blocked = function (x, y, w, h) { /* body rect overlaps a solid block */
  for (var i = 0; i < this.solids.length; i++) { var s = this.solids[i]; if (ov(x - w / 2, y - h, w, h - 1, s.x, s.y + 2, s.w, s.h)) return true; }
  return false;
};

Match.prototype.physics = function (f, grav) {
  var w = f.def.w * 0.5, h = f.def.h, px = f.x, py = f.y, i, s;
  if (f.standing && f.standing.dx) f.x += f.standing.dx;
  f.x += f.vx * DT;
  for (i = 0; i < this.solids.length; i++) {
    s = this.solids[i];
    if (f.y > s.y + 6 && f.y - h < s.y + s.h && f.x + w > s.x && f.x - w < s.x + s.w) {
      if (px + w <= s.x + 1) { f.x = s.x - w; if (f.vx > 0) f.vx = 0; }
      else if (px - w >= s.x + s.w - 1) { f.x = s.x + s.w + w; if (f.vx < 0) f.vx = 0; }
    }
  }
  var g = f.hov > 0 ? 0 : grav; f.vy += g * DT; var mf = f.inp.my > 0.6 && !f.grounded && f.state !== 'hit' ? FASTFALL : MAXFALL; if (f.vy > mf) f.vy = mf;
  var ny = f.y + f.vy * DT, landed = null;
  if (f.vy >= 0) {
    for (i = 0; i < this.solids.length; i++) { s = this.solids[i]; if (f.x + w * 0.7 > s.x && f.x - w * 0.7 < s.x + s.w && py <= s.y + 1 && ny >= s.y && (!landed || s.y < landed.y)) landed = s; }
    if (f.drop <= 0) for (i = 0; i < this.plats.length; i++) { s = this.plats[i]; if (f.x + w * 0.7 > s.x && f.x - w * 0.7 < s.x + s.w && py <= s.y + 1 && ny >= s.y && (!landed || s.y < landed.y)) landed = s; }
  } else {
    for (i = 0; i < this.solids.length; i++) { s = this.solids[i]; if (f.x + w * 0.7 > s.x && f.x - w * 0.7 < s.x + s.w && py - h >= s.y + s.h - 1 && ny - h < s.y + s.h) { ny = s.y + s.h + h; f.vy = 0; } }
  }
  var was = f.grounded; f.grounded = false; f.standing = null;
  if (landed) { ny = landed.y; f.vy = 0; f.grounded = true; f.standing = landed; if (!was) this.onLand(f); }
  f.y = ny;
};
Match.prototype.onLand = function (f) {
  f.jumps = f.feat > 0 ? 2 : 1; f.usedUp = false; f.airDodge = true; f.blinks = 2; f.jcut = false;
  if (f.state === 'air') f.state = 'idle';
  if (this.vis && f.t > 20) { this.spark(f.x, f.y, '#cfd8ff', 3, 120, 14, 3, 200); }
};

/* ---------- attacks ---------- */
Match.prototype.startAttack = function (f, mv) {
  f.atk = { m: mv, t: 0, fired: false, hit: {} }; f.state = 'atk'; f.shOn = false;
  if (mv.lunge && (f.grounded || mv.kind === 'melee')) f.vx = f.face * mv.lunge * (f.grounded ? 1 : 0.5);
  this.sfx(mv.kind === 'proj' || mv.kind === 'blink' ? 'whoosh' : (mv.dmg > 9 ? 'heavy_wind' : 'whoosh'), f.x);
};
Match.prototype.hitbox = function (f, mv) {
  var x = f.face > 0 ? f.x + mv.hx : f.x - mv.hx - mv.hw;
  return { x: x, y: f.y + mv.hy, w: mv.hw, h: mv.hh };
};
Match.prototype.stepAttack = function (f) {
  var a = f.atk, mv = a.m, sp = f.haste > 0 ? 1.3 : 1, k;
  a.t += sp; var t = Math.floor(a.t), inp = f.inp;
  f.armorOn = !!(mv.armor && t >= mv.armor[0] && t < mv.armor[1]);
  if (!a.fired && t >= mv.su) {
    a.fired = true; k = mv.kind;
    if (k === 'proj') { var pr = mv.proj, py = f.y + pr.sy; this.addProj(f, f.x + f.face * 30, py, f.face * pr.sp, 0, pr); }
    else if (k === 'rise') { f.vy = -mv.vy; f.vx = (inp.mx !== 0 ? sgn(inp.mx) : f.face * 0.5) * mv.vx; f.usedUp = true; f.grounded = false; f.standing = null; this.spark(f.x, f.y, f.def.col, 8, 260, 20, 4, 0); this.sfx('rise', f.x); }
    else if (k === 'spin') { f.spinT = mv.ac; this.sfx('spin', f.x); }
    else if (k === 'blink') this.doBlink(f, mv);
    else if (k === 'bubble') { if (f.bubCd <= 0) { f.bubble = 260; f.bubCd = 420; this.sfx('bubble', f.x); this.spark(f.x, f.y - 50, '#bff4ff', 10, 200, 26, 5, -50); } }
  }
  var act = t >= mv.su && t < mv.su + mv.ac;
  if (act && (mv.kind === 'melee' || mv.kind === 'burst' || mv.kind === 'rise' || mv.kind === 'spin' || mv.kind === 'blink')) {
    if (mv.kind === 'spin') { f.vx = f.face * mv.sp; if ((t - mv.su) % mv.rehit === 0) a.hit = {}; }
    if (mv.kind === 'blink' && t === mv.su) a.hit = {};
    var hb = this.hitbox(f, mv);
    for (var i = 0; i < this.fs.length; i++) {
      var e = this.fs[i]; if (e === f || !e.alive || a.hit[e.id]) continue;
      var h = e.hurt(); if (!ov(hb.x, hb.y, hb.w, hb.h, h.x, h.y, h.w, h.h)) continue;
      var res = this.hitFighter(f, e, { dmg: mv.dmg, base: mv.base, grow: mv.grow, ang: mv.ang, dir: f.face, away: (mv.kind === 'burst') ? { x: f.x, y: f.y - f.def.h * 0.5 } : null, big: mv.dmg >= 10, kind: mv.kind });
      if (res) a.hit[e.id] = true;
    }
  }
  if (mv.kind === 'spin' && t >= mv.su + mv.ac) f.spinT = 0;
  if (t >= mv.su + mv.ac + mv.rc) { this.endAttack(f); return; }
  /* light chain: press light after contact, before recovery ends */
  if (mv.chain && f.buf.light > 0 && t >= mv.su + 1) { /* unused */ }
};
Match.prototype.endAttack = function (f) {
  var a = f.atk; if (!a) return;
  if (a.m === f.def.light[0] || a.m === f.def.light[1]) f.comboT = 18; else { f.combo = 0; f.comboT = 0; }
  f.atk = null; f.armorOn = false; f.spinT = 0; f.state = f.grounded ? 'idle' : 'air';
};
Match.prototype.doBlink = function (f, mv) {
  var inp = f.inp, dx = inp.mx, dy = inp.my;
  if (mv.up) { dx = dx * 0.6; dy = -1; } else if (Math.abs(dx) < 0.3 && Math.abs(dy) < 0.3) { dx = f.face; dy = 0; }
  var l = Math.sqrt(dx * dx + dy * dy) || 1; dx /= l; dy /= l;
  if (!f.grounded && f.blinks <= 0) return;
  if (!f.grounded) f.blinks--;
  var k = 1, nx = f.x, ny = f.y;
  while (k > 0.15) { nx = f.x + dx * mv.dist * k; ny = f.y + dy * mv.dist * k; if (!this.blocked(nx, ny, f.def.w, f.def.h)) break; k -= 0.15; }
  if (k <= 0.15) return;
  this.spark(f.x, f.y - 36, f.def.col, 12, 300, 22, 5, 0); f.x = nx; f.y = ny; f.vy = Math.min(f.vy, 0) * 0.3; f.vx *= 0.4; f.grounded = false; f.standing = null; f.inv = Math.max(f.inv, mv.ac + 3);
  this.spark(f.x, f.y - 36, f.def.col, 12, 300, 22, 5, 0); this.sfx('blink', f.x);
  if (dx !== 0) f.face = dx > 0 ? 1 : -1;
};
Match.prototype.addProj = function (owner, x, y, vx, vy, pr) {
  var o = { x: x, y: y, vx: vx, vy: vy, w: pr.w, h: pr.h, dmg: pr.dmg, base: pr.base, grow: pr.grow, ang: pr.ang, life: pr.life, own: owner.id, look: pr.look, pierce: !!pr.pierce, hit: {}, g: pr.g || 0, stun: pr.stun || 0, bomb: pr.bomb || 0, t: 0 };
  this.proj.push(o); this.sfx(pr.look === 'zap' ? 'zap' : 'shoot', x); return o;
};

/* ---------- hits ---------- */
Match.prototype.hitFighter = function (att, vic, s) {
  if (vic.inv > 0 || !vic.alive) return false;
  if (!att) att = { frz: 0, stat: 0, dealt: 0, id: -1, def: { col: '#FF8C3D' } };
  var dirx = s.dir || (vic.x >= att.x ? 1 : -1), cx = vic.x, cy = vic.y - vic.def.h * 0.5;
  if (vic.bubble > 0) { vic.bubble = 0; vic.bubCd = Math.max(vic.bubCd, 200); this.spark(cx, cy, '#bff4ff', 16, 380, 24, 5, 0); this.sfx('bubblepop', cx); vic.vx += dirx * 220; vic.frz = att.frz = 5; return true; }
  if (vic.shOn && vic.grounded) {
    vic.sh -= s.dmg * 1.6 + 3; vic.vx += dirx * 130; att.frz = vic.frz = 4; this.spark(cx - dirx * 30, cy, '#9fd8ff', 6, 240, 14, 3, 0); this.sfx('shieldhit', cx); vic.flash = 6;
    if (vic.sh <= 0) { vic.sh = 45; vic.shOn = false; vic.stun = 100; vic.state = 'stun'; vic.atk = null; this.sfx('shieldbreak', cx); this.spark(cx, cy, '#9fd8ff', 22, 420, 30, 5, 100); this.text(cx, vic.y - vic.def.h - 20, 'BREAK', '#9fd8ff'); }
    return true;
  }
  var dmg = s.dmg, kbm = 1;
  if (att.stat > 0 && s.kind !== 'bomb' && s.kind !== 'hazard') { att.stat--; dmg += 3; kbm *= 1.4; this.spark(cx, cy, '#FF8C3D', 14, 420, 22, 5, 0); }
  if (vic.bul > 0) { dmg *= 0.6; kbm *= 0.72; }
  if (this.sudden) dmg *= 1.5;
  vic.pct += dmg; vic.taken += dmg; if (att !== vic) att.dealt += dmg;
  if (att.id >= 0 && att !== vic) { vic.lastHit = att.id; vic.lastHitT = this.tick; }
  var kb = (s.base + s.grow * vic.pct) / vic.def.weight * kbm;
  var ax, ay;
  if (s.away) { var dx = cx - s.away.x, dy = cy - s.away.y, l = Math.sqrt(dx * dx + dy * dy) || 1; ax = dx / l; ay = -dy / l; if (ay < 0.35) ay = 0.35; var ll = Math.sqrt(ax * ax + ay * ay); ax /= ll; ay /= ll; }
  else { var r = s.ang * Math.PI / 180; ax = Math.cos(r) * dirx; ay = Math.sin(r); }
  if (vic.grounded && ay < 0.3) ay = 0.3;
  var hs = clamp(Math.floor(3 + dmg * 0.35), 3, 11);
  vic.flash = 8; vic.frz = hs; att.frz = Math.max(att.frz, hs - 1);
  if (vic.armorOn) { vic.vx += ax * 60; this.spark(cx, cy, '#FFC24A', 8, 260, 14, 4, 0); this.sfx('armor', cx); this.shake = Math.max(this.shake, 3); return true; }
  vic.vx = ax * kb; vic.vy = -ay * kb; if (vic.grounded && ay > 0.3) { vic.grounded = false; vic.standing = null; vic.y -= 2; }
  vic.hitstun = Math.floor(8 + kb * 0.02 + (s.stun || 0)); vic.state = 'hit'; vic.atk = null; vic.shOn = false; vic.spinT = 0; vic.carryDrop = vic.carry ? 1 : 0;
  if (vic.carry) { vic.carry = null; this.explode(cx, cy, att.id, true); }
  vic.face = ax !== 0 ? (ax > 0 ? -1 : 1) : vic.face;
  if (this.vis) {
    this.spark(cx, cy, '#ffffff', 5 + (dmg | 0), 260 + kb * 0.2, 18, 4, 0); this.spark(cx, cy, att.def.col, 4, 200, 16, 5, 0);
    this.shake = Math.max(this.shake, clamp(kb / 260, 2, 14)); this.hitFlash = dmg > 9 ? 4 : 0;
  }
  this.sfx(kb > 900 ? 'hit_h' : (kb > 500 ? 'hit_m' : 'hit_l'), cx);
  return true;
};
Match.prototype.explode = function (x, y, ownerId, silent) {
  this.spark(x, y, '#FF4D6A', 30, 560, 34, 6, 0); this.spark(x, y, '#FFD93D', 16, 360, 26, 5, 0); this.shake = Math.max(this.shake, 14); this.sfx('bomb', x);
  for (var i = 0; i < this.fs.length; i++) {
    var e = this.fs[i]; if (!e.alive) continue;
    var dx = e.x - x, dy = (e.y - e.def.h / 2) - y; if (dx * dx + dy * dy > 170 * 170) continue;
    this.hitFighter(ownerId >= 0 ? this.fs[ownerId] : e, e, { dmg: 16, base: 480, grow: 6.6, ang: 55, dir: 1, away: { x: x, y: y }, kind: 'bomb' });
  }
};

/* ---------- items ---------- */
Match.prototype.spawnItem = function () {
  if (this.items.length >= 3) return;
  var tot = 0, i; for (i = 0; i < ITEMS.length; i++) tot += ITEMS[i].w;
  var r = this.rng.next() * tot, ty = ITEMS[0].id; for (i = 0; i < ITEMS.length; i++) { r -= ITEMS[i].w; if (r <= 0) { ty = ITEMS[i].id; break; } }
  var cand = this.solids.slice(0); for (i = 0; i < this.plats.length; i++) if (!this.plats[i].mv) cand.push(this.plats[i]);
  var s = cand[this.rng.int(cand.length)], x = s.x + 40 + this.rng.next() * (s.w - 80);
  this.items.push({ type: ty, x: x, y: s.y - 420, ty: s.y, life: 900, t: 0 });
  this.sfx('itemdrop', x);
};
Match.prototype.pickItem = function (f, it) {
  var id = it.type; f.itemsGot = (f.itemsGot | 0) + 1; var def = null; for (var i = 0; i < ITEMS.length; i++) if (ITEMS[i].id === id) def = ITEMS[i];
  if (id === 'patch') f.pct = Math.max(0, f.pct - 30); else if (id === 'clock') f.haste = 540; else if (id === 'bulwark') f.bul = 600;
  else if (id === 'feather') { f.feat = 660; if (f.jumps < 2) f.jumps = 2; } else if (id === 'static') f.stat = 3; else if (id === 'bomb') f.carry = { fuse: 270 };
  this.text(f.x, f.y - f.def.h - 24, def.name.toUpperCase(), def.col); this.spark(f.x, f.y - 50, def.col, 14, 300, 26, 5, 0); this.sfx('item', f.x);
};

/* ---------- hazards ---------- */
Match.prototype.stepHazards = function () {
  var i, j, h, o, e;
  for (i = 0; i < this.plats.length; i++) { var p = this.plats[i]; if (p.mv) { var nx = p.mv.x0 + (p.mv.x1 - p.mv.x0) * (0.5 - 0.5 * Math.cos(this.tick * 6.283 / p.mv.per)); p.dx = nx - p.x; p.x = nx; } }
  for (i = 0; i < this.hzs.length; i++) {
    o = this.hzs[i]; h = o.d; o.t++;
    if (h.t === 'beam') {
      if (o.phase === 'idle' && o.t >= h.gap) { o.phase = 'warn'; o.t = 0; o.x = h.xr[0] + this.rng.next() * (h.xr[1] - h.xr[0]); o.hit = {}; this.sfx('warn', o.x); }
      else if (o.phase === 'warn' && o.t >= h.warn) { o.phase = 'fire'; o.t = 0; this.sfx('beam', o.x); this.shake = Math.max(this.shake, 5); }
      else if (o.phase === 'fire') { this.hzHit(o, o.x - h.w / 2, -700, h.w, 1500, 9, 400, 3.2, 80); if (o.t >= h.fire) { o.phase = 'idle'; o.t = 0; } }
    } else if (h.t === 'jet') {
      if (o.phase === 'idle' && o.t >= h.gap) { o.phase = 'warn'; o.t = 0; o.xi = this.rng.int(h.xs.length); o.x = h.xs[o.xi]; o.hit = {}; this.sfx('warn', o.x); }
      else if (o.phase === 'warn' && o.t >= h.warn) { o.phase = 'fire'; o.t = 0; this.sfx('jet', o.x); this.shake = Math.max(this.shake, 4); }
      else if (o.phase === 'fire') { this.hzHit(o, o.x - h.w / 2, h.top, h.w, this.stage.lava - h.top + 40, 11, 430, 3.6, 82); if (o.t >= h.fire) { o.phase = 'idle'; o.t = 0; } }
    } else if (h.t === 'current') {
      var cyc = h.on + h.off, c = ((o.t % cyc) + cyc) % cyc; o.on = c < h.on;
      if (o.on) for (j = 0; j < this.fs.length; j++) { e = this.fs[j]; if (e.alive && e.x > h.x && e.x < h.x + h.w && e.y > h.y0 && e.y < h.y1 + 60) { e.vy -= 3700 * DT; if (e.vy < -620) e.vy = -620 + (e.vy + 620) * 0.5; if (e.vy < -900) e.vy = -900; e.grounded = false; } }
    } else if (h.t === 'wind') {
      if (o.phase === 'idle' && o.t >= h.gap) { o.phase = 'warn'; o.t = 0; o.dir = this.rng.next() < 0.5 ? -1 : 1; this.sfx('warn', 800); }
      else if (o.phase === 'warn' && o.t >= 60) { o.phase = 'fire'; o.t = 0; this.sfx('wind', 800); }
      else if (o.phase === 'fire') { for (j = 0; j < this.fs.length; j++) { e = this.fs[j]; if (e.alive && !e.grounded && e.state !== 'dodge') e.vx += o.dir * h.force * DT; } if (o.t >= h.dur) { o.phase = 'idle'; o.t = 0; } }
    }
  }
  if (this.stage.lava) for (j = 0; j < this.fs.length; j++) {
    e = this.fs[j]; if (e.lavaCd > 0) e.lavaCd--;
    if (e.alive && e.y > this.stage.lava && e.lavaCd <= 0 && e.inv <= 0) {
      e.lavaCd = 50; this.hitFighter(null, e, { dmg: 10, base: 0, grow: 0, ang: 90, dir: 1, kind: 'hazard' }); e.vy = -1650; e.vx *= 0.4; e.hitstun = 26; e.state = 'hit'; this.spark(e.x, this.stage.lava, '#FF8C3D', 20, 420, 30, 5, 0); this.sfx('lava', e.x);
    }
  }
};
Match.prototype.hzHit = function (o, x, y, w, h, dmg, base, grow, ang) {
  for (var j = 0; j < this.fs.length; j++) {
    var e = this.fs[j]; if (!e.alive || o.hit[e.id]) continue; var b = e.hurt();
    if (ov(x, y, w, h, b.x, b.y, b.w, b.h) && e.inv <= 0) { o.hit[e.id] = true; var dx = e.x < x + w / 2 ? -1 : 1; this.hitFighter(null, e, { dmg: dmg, base: base, grow: grow, ang: ang, dir: dx, kind: 'hazard' }); }
  }
};

/* ---------- fighter step ---------- */
Match.prototype.edge = function (f) {
  var i = f.inp, p = f.prev, b = f.buf, k;
  if (i.jump && !p.jump) b.jump = 6; if (i.light && !p.light) b.light = 6; if (i.heavy && !p.heavy) b.heavy = 6; if (i.special && !p.special) b.special = 6; if (i.dodge && !p.dodge) b.dodge = 6;
  for (k in b) if (b.hasOwnProperty(k) && b[k] > 0 && !(i[k] && !p[k])) b[k]--;
};
Match.prototype.stepFighter = function (f) {
  var d = f.def, inp = f.inp, mx = clamp(inp.mx, -1, 1), my = inp.my, sp = f.haste > 0 ? 1.3 : 1;
  f.t++; if (f.flash > 0) f.flash--;
  if (f.frz > 0) { f.frz--; return; }
  if (f.inv > 0) f.inv--; if (f.haste > 0) f.haste--; if (f.bul > 0) f.bul--; if (f.feat > 0) f.feat--; if (f.drop > 0) f.drop--; if (f.dodgeCd > 0) f.dodgeCd--; if (f.bubCd > 0) f.bubCd--; if (f.bubble > 0) f.bubble--;
  if (f.comboT > 0) { f.comboT--; if (f.comboT === 0) f.combo = 0; }
  if (f.carry) { f.carry.fuse--; if (f.carry.fuse <= 0) { var c = f.carry; f.carry = null; this.explode(f.x, f.y - 50, f.id, false); } }
  if (f.hov > 0) { f.hov--; if (inp.jump || inp.light || inp.heavy || inp.special || Math.abs(mx) > 0.5) f.hov = 0; }
  var grav = GRAV * (f.feat > 0 ? 0.62 : 1);
  this.edge(f);
  var free = (f.state === 'idle' || f.state === 'run' || f.state === 'air');
  var maxv = d.run * sp, acc = f.grounded ? 4600 : 2500;
  if (f.state === 'hit') {
    f.hitstun--; f.vx *= (1 - 0.35 * DT); if (!f.grounded) f.vx += mx * 380 * DT;
    if (f.grounded) f.vx *= (1 - 4 * DT);
    if (f.hitstun <= 0) { f.state = f.grounded ? 'idle' : 'air'; }
    this.physics(f, grav * 0.95); return;
  }
  if (f.state === 'stun') { f.stun--; f.vx *= (1 - 6 * DT); if (f.stun <= 0) f.state = 'idle'; this.physics(f, grav); return; }
  if (f.state === 'dodge') {
    f.dodgeT--; f.inv = Math.max(f.inv, 1);
    if (f.dodgeT <= 0) { f.state = f.grounded ? 'idle' : 'air'; f.dodgeCd = 16; f.inv = 0; }
    this.physics(f, f.grounded ? grav : grav * 0.15); return;
  }
  if (f.state === 'atk') {
    this.stepAttack(f);
    if (f.atk) {
      var lim = f.grounded ? 0 : 0.35;
      if (f.atk.m.kind !== 'spin' && f.atk.m.kind !== 'rise') { if (f.grounded) f.vx -= sgn(f.vx) * Math.min(Math.abs(f.vx), 3600 * DT); else f.vx += mx * 1200 * lim * DT; }
      /* light chain */
      var lm = f.atk.m, li = lm === d.light[0] ? 0 : (lm === d.light[1] ? 1 : -1);
      if (li >= 0 && f.buf.light > 0 && Math.floor(f.atk.t) >= lm.su + lm.ac && !f.carry) { f.buf.light = 0; this.startAttack(f, d.light[li + 1]); f.combo = (li + 2) % 3; }
    }
    this.physics(f, f.atk && f.atk.m.kind === 'spin' ? grav * 0.4 : grav); return;
  }
  /* free / shield */
  var wantShield = inp.shield && f.grounded && f.stun <= 0;
  if (wantShield && f.sh > 0) { f.shOn = true; f.state = 'shield'; f.sh = Math.max(0, f.sh - 0.42); if (f.sh <= 0) { f.sh = 45; f.shOn = false; f.stun = 100; f.state = 'stun'; this.sfx('shieldbreak', f.x); } }
  else { if (f.shOn) f.shOn = false; if (f.state === 'shield') f.state = 'idle'; if (f.sh < 100) f.sh = Math.min(100, f.sh + 0.3); }
  if (f.state === 'shield') {
    f.vx -= sgn(f.vx) * Math.min(Math.abs(f.vx), 5000 * DT);
    if (f.buf.dodge > 0 && f.dodgeCd <= 0) { f.buf.dodge = 0; this.startDodge(f, mx); }
    else if (f.buf.jump > 0) { f.buf.jump = 0; f.shOn = false; f.state = 'air'; f.vy = -d.jump; f.grounded = false; f.standing = null; f.sfx = 0; this.sfx('jump', f.x); }
    this.physics(f, grav); return;
  }
  /* carry throw */
  if (f.carry && (f.buf.light > 0 || f.buf.heavy > 0 || f.buf.special > 0)) {
    f.buf.light = f.buf.heavy = f.buf.special = 0; var cf = f.carry; f.carry = null;
    this.addProj(f, f.x + f.face * 26, f.y - 70, f.face * 640 + f.vx * 0.3, -420, { w: 36, h: 36, dmg: 0, base: 0, grow: 0, ang: 0, life: cf.fuse, look: 'bomb', g: 1500, bomb: cf.fuse, sy: 0 });
    this.sfx('throw', f.x);
  }
  /* actions */
  if (f.buf.dodge > 0 && f.dodgeCd <= 0) { var okAir = f.grounded || f.airDodge; if (okAir) { f.buf.dodge = 0; this.startDodge(f, mx); this.physics(f, grav); return; } }
  var air = !f.grounded;
  if (f.buf.special > 0) {
    var mv = my < -0.55 ? d.spU : (my > 0.55 && d.spD ? d.spD : d.spN);
    if (mv.kind === 'rise' && f.usedUp) mv = d.spN;
    if (mv.kind === 'blink' && air && f.blinks <= 0) mv = null;
    if (mv.kind === 'bubble' && f.bubCd > 0) mv = null;
    if (mv) { f.buf.special = 0; if (Math.abs(mx) > 0.3 && mv.kind !== 'blink') f.face = mx > 0 ? 1 : -1; this.startAttack(f, mv); this.stepAttackFirst(f); this.physics(f, grav); return; }
  }
  if (f.buf.heavy > 0) { f.buf.heavy = 0; if (Math.abs(mx) > 0.3) f.face = mx > 0 ? 1 : -1; this.startAttack(f, my < -0.55 ? d.heavyU : d.heavy); this.physics(f, grav); return; }
  if (f.buf.light > 0) {
    f.buf.light = 0; if (Math.abs(mx) > 0.3) f.face = mx > 0 ? 1 : -1;
    var ci = f.comboT > 0 ? f.combo : 0; this.startAttack(f, d.light[ci]); f.combo = (ci + 1) % 3; this.physics(f, grav); return;
  }
  /* move */
  if (Math.abs(mx) > 0.15) {
    f.face = mx > 0 ? 1 : -1;
    if (Math.abs(f.vx) <= maxv || sgn(f.vx) !== sgn(mx)) { f.vx += mx * acc * DT; if (Math.abs(f.vx) > maxv && sgn(f.vx) === sgn(mx)) f.vx = sgn(f.vx) * Math.max(maxv, Math.abs(f.vx) - 3000 * DT); }
    else f.vx -= sgn(f.vx) * Math.min(Math.abs(f.vx) - maxv, 1800 * DT);
  } else { f.vx -= sgn(f.vx) * Math.min(Math.abs(f.vx), (f.grounded ? 4200 : 450) * DT); }
  /* jump */
  if (f.buf.jump > 0) {
    if (f.grounded) { f.vy = -d.jump * (f.feat > 0 ? 1.08 : 1); f.grounded = false; f.standing = null; f.jcut = true; f.buf.jump = 0; this.sfx('jump', f.x); this.spark(f.x, f.y, '#cfd8ff', 3, 120, 12, 3, 200); }
    else if (f.jumps > 0) { f.vy = -d.djump; f.jumps--; f.jcut = false; f.buf.jump = 0; if (Math.abs(mx) > 0.3) f.vx = mx * Math.max(300, Math.abs(f.vx)); this.sfx('djump', f.x); this.spark(f.x, f.y - 10, f.def.col, 8, 220, 18, 4, 0); }
  }
  if (!inp.jump && f.jcut && f.vy < -450) { f.vy *= 0.58; f.jcut = false; }
  if (f.grounded && my > 0.6 && f.standing && !f.standing.solid) { f.drop = 14; f.grounded = false; f.standing = null; f.y += 2; }
  f.state = f.grounded ? (Math.abs(f.vx) > 40 ? 'run' : 'idle') : 'air';
  this.physics(f, grav);
};
Match.prototype.stepAttackFirst = function (f) { /* fire frame-0 effects at once for moves with su===0 */ };
Match.prototype.startDodge = function (f, mx) {
  f.shOn = false; f.atk = null;
  if (f.grounded) { f.state = 'dodge'; f.dodgeT = 24; f.inv = 20; f.vx = mx !== 0 && Math.abs(mx) > 0.3 ? sgn(mx) * 600 : 0; if (f.vx) f.face = sgn(f.vx) * (1); }
  else { f.airDodge = false; f.state = 'dodge'; f.dodgeT = 20; f.inv = 17; var l = Math.sqrt(f.inp.mx * f.inp.mx + f.inp.my * f.inp.my); f.vx = l > 0.3 ? f.inp.mx / l * 560 : 0; f.vy = l > 0.3 ? f.inp.my / l * 480 : 0; }
  this.sfx('dodge', f.x); this.spark(f.x, f.y - 40, '#cfd8ff', 5, 160, 14, 3, 0);
};

/* ---------- projectiles ---------- */
Match.prototype.stepProj = function () {
  for (var i = this.proj.length - 1; i >= 0; i--) {
    var p = this.proj[i]; p.t++; p.life--; p.vy += p.g * DT; p.x += p.vx * DT; p.y += p.vy * DT; var dead = p.life <= 0, j;
    if (p.bomb) {
      for (j = 0; j < this.solids.length; j++) { var s = this.solids[j]; if (p.x > s.x && p.x < s.x + s.w && p.y + 18 >= s.y && p.y - 18 <= s.y + 6 && p.vy > 0) { p.y = s.y - 18; p.vy = -p.vy * 0.35; p.vx *= 0.7; } }
      for (j = 0; j < this.plats.length; j++) { var q = this.plats[j]; if (p.x > q.x && p.x < q.x + q.w && p.y + 18 >= q.y && p.y + 18 <= q.y + 24 && p.vy > 0) { p.y = q.y - 18; p.vy = -p.vy * 0.35; p.vx *= 0.7; } }
      for (j = 0; j < this.fs.length; j++) { var e = this.fs[j]; if (!e.alive || (e.id === p.own && p.t < 18) || e.inv > 0) continue; var hb = e.hurt(); if (ov(p.x - 18, p.y - 18, 36, 36, hb.x, hb.y, hb.w, hb.h)) { dead = true; break; } }
      if (dead) { this.explode(p.x, p.y, p.own, false); this.proj.splice(i, 1); }
      continue;
    }
    if (!dead) for (j = 0; j < this.solids.length; j++) { var s2 = this.solids[j]; if (p.x > s2.x && p.x < s2.x + s2.w && p.y > s2.y + 8 && p.y < s2.y + s2.h) { dead = true; this.spark(p.x, p.y, '#fff', 4, 200, 12, 3, 0); } }
    if (!dead) for (j = 0; j < this.fs.length; j++) {
      var e2 = this.fs[j]; if (!e2.alive || e2.id === p.own || p.hit[e2.id]) continue; var h2 = e2.hurt();
      if (ov(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h, h2.x, h2.y, h2.w, h2.h)) {
        if (this.hitFighter(this.fs[p.own], e2, { dmg: p.dmg, base: p.base, grow: p.grow, ang: p.ang, dir: sgn(p.vx) || 1, stun: p.stun, kind: 'proj' })) { p.hit[e2.id] = true; if (!p.pierce) dead = true; }
      }
    }
    if (dead) this.proj.splice(i, 1);
  }
};

/* ---------- KO / flow ---------- */
Match.prototype.checkBlast = function (f) {
  var b = this.stage.blast;
  if (f.x < b.l || f.x > b.r || f.y < b.t || f.y > b.b) this.ko(f);
};
Match.prototype.ko = function (f) {
  f.alive = false; f.falls++; f.pct = 0; f.stocks--; f.atk = null; f.carry = null; f.state = 'dead'; f.shOn = false;
  var credit = (f.lastHit >= 0 && this.tick - f.lastHitT < 420) ? this.fs[f.lastHit] : null;
  if (credit && credit !== f) { credit.kos++; } else if (this.cfg.mode === 'timed') { f.selfD = (f.selfD | 0) + 1; }
  var b = this.stage.blast, ex = clamp(f.x, b.l + 30, b.r - 30), ey = clamp(f.y, b.t + 30, b.b - 30);
  this.spark(ex, ey, f.def.col, 40, 700, 40, 7, 0); this.spark(ex, ey, '#ffffff', 16, 500, 24, 5, 0); this.shake = Math.max(this.shake, 18); this.slow = 40; this.sfx('ko', f.x);
  f.koX = ex; f.koY = ey; f.lastHit = -1;
  if (this.cfg.mode === 'stock' && f.stocks <= 0) { f.out = true; f.outTick = this.tick; f.outOrder = this.outCount++; f.respT = 0; }
  else f.respT = 100;
};
Match.prototype.respawn = function (f) {
  var rx = this.stage.respawn[f.id % this.stage.respawn.length];
  f.spawn({ x: rx, y: -140 }, 170); f.hov = 80; f.alive = true; f.sh = 100; f.face = rx < 800 ? 1 : -1;
  this.spark(f.x, f.y - 40, f.def.col, 14, 300, 24, 5, 0); this.sfx('respawn', f.x);
};
Match.prototype.finish = function () {
  if (this.over) return; this.over = true; this.phase = 'over'; var arr = [], i;
  for (i = 0; i < this.fs.length; i++) { var f = this.fs[i]; arr.push(f); }
  if (this.cfg.mode === 'stock') {
    arr.sort(function (a, b) {
      if (a.out !== b.out) return a.out ? 1 : -1;
      if (a.out && b.out) return b.outOrder - a.outOrder;
      if (a.stocks !== b.stocks) return b.stocks - a.stocks;
      if (a.pct !== b.pct) return a.pct - b.pct;
      return b.dealt - a.dealt;
    });
  } else {
    arr.sort(function (a, b) { var sa = a.kos - a.falls, sb = b.kos - b.falls; if (sa !== sb) return sb - sa; if (a.kos !== b.kos) return b.kos - a.kos; return b.dealt - a.dealt; });
  }
  this.results = [];
  for (i = 0; i < arr.length; i++) { var q = arr[i]; this.results.push({ idx: q.id, slot: q.slot, place: i + 1, fighter: q.def.id, name: q.def.name, ctrl: q.ctrl, lvl: q.lvl, kos: q.kos, falls: q.falls, dealt: Math.round(q.dealt), stocks: q.stocks, pct: Math.round(q.pct), items: q.itemsGot | 0 }); }
  this.sfx('win', 800);
};

Match.prototype.update = function () {
  var i, f;
  if (this.over) { this.endT++; this.updateFx(); return; }
  if (this.phase === 'count') {
    this.cd--; for (i = 0; i < this.fs.length; i++) { f = this.fs[i]; this.physics(f, GRAV); }
    if (this.cd === 120 || this.cd === 80 || this.cd === 40) this.sfx('count', 800);
    if (this.cd <= 0) { this.phase = 'play'; this.sfx('go', 800); }
    this.updateFx(); this.tick++; return;
  }
  this.tick++; this.elapsed++;
  if (this.cfg.mode === 'timed') { this.timeLeft--; if (this.timeLeft <= 0) { this.finish(); return; } }
  else if (this.elapsed > 60 * 150 && !this.sudden) { this.sudden = true; this.text(800, 200, 'SUDDEN DEATH', '#FF4D6A'); this.sfx('warn', 800); }
  this.stepHazards();
  for (i = 0; i < this.fs.length; i++) {
    f = this.fs[i];
    if (f.out) continue;
    if (!f.alive) { f.respT--; if (f.respT <= 0) this.respawn(f); continue; }
    if (f.isBot) f.inp = this.botInput(f); else f.inp = this.provider ? (this.provider(f) || blankInput()) : blankInput();
    this.stepFighter(f); f.prev = copyInp(f.inp);
    if (f.alive) this.checkBlast(f);
  }
  this.stepProj();
  /* items */
  this.itemT--; if (this.itemT <= 0) { this.spawnItem(); this.itemT = this.itemDelay(); }
  for (i = this.items.length - 1; i >= 0; i--) {
    var it = this.items[i]; it.t++; it.life--; if (it.y < it.ty) it.y = Math.min(it.ty, it.y + 520 * DT);
    var got = false;
    if (it.life <= 0) this.items.splice(i, 1);
    else for (var j = 0; j < this.fs.length; j++) { var e = this.fs[j]; if (!e.alive || e.carry || e.state === 'hit') continue; if (Math.abs(e.x - it.x) < e.def.w / 2 + 26 && it.y > e.y - e.def.h - 24 && it.y - 20 < e.y) { this.pickItem(e, it); got = true; break; } }
    if (got) this.items.splice(i, 1);
  }
  /* end of stock match */
  if (this.cfg.mode === 'stock') {
    var alive = 0; for (i = 0; i < this.fs.length; i++) if (!this.fs[i].out) alive++;
    if (alive <= 1 || (this.fs.length === 1) || this.elapsed > 60 * 360) this.finish();
  }
  this.updateFx();
};
Match.prototype.updateFx = function () {
  if (!this.vis) return; var i, p;
  for (i = this.parts.length - 1; i >= 0; i--) { p = this.parts[i]; p.l--; if (p.l <= 0) { this.parts.splice(i, 1); continue; } p.vy += p.g * DT; p.vx *= 0.96; p.vy *= 0.96; p.x += p.vx * DT; p.y += p.vy * DT; }
  for (i = this.texts.length - 1; i >= 0; i--) { p = this.texts[i]; p.l--; p.y -= 0.6; if (p.l <= 0) this.texts.splice(i, 1); }
  this.shake *= 0.86; if (this.hitFlash > 0) this.hitFlash--;
};

/* ---------- bots ---------- */
Match.prototype.nearestEnemy = function (f) {
  var best = null, bd = 1e9;
  for (var i = 0; i < this.fs.length; i++) { var e = this.fs[i]; if (e === f || !e.alive) continue; var d = Math.abs(e.x - f.x) + Math.abs(e.y - f.y) * 1.2 - (f.lvl >= 3 ? e.pct * 0.8 : 0); if (d < bd) { bd = d; best = e; } }
  return best;
};
Match.prototype.botInput = function (f) {
  var a = f.ai, L = f.lvl, inp = a.inp, pr = a.press, k;
  for (k in pr) if (pr.hasOwnProperty(k)) { inp[k] = pr[k] > 0; if (pr[k] > 0) pr[k]--; }
  if (a.shT > 0) { a.shT--; inp.shield = true; } else inp.shield = false;
  if (f.state === 'hit' || f.state === 'stun') { inp.mx = clamp(inp.mx, -1, 1); a.cd = Math.min(a.cd, 2); return inp; }
  a.cd--; if (a.cd > 0) return inp;
  a.cd = [18, 11, 6, 3][L] + this.rng.int(3);
  inp.mx = 0; inp.my = 0; inp.jump = false; inp.shield = false;
  var d = f.def, rng = this.rng, st = this.stage, surf = this.surfaceAt(f.x, f.y - 12, 0), i;
  /* recovery */
  var off = !f.grounded && !surf && f.y > 250 || (!surf && f.y > 650) || f.x < -60 || f.x > 1660;
  if (off || (!f.grounded && !surf && f.y > 500)) {
    var best = null, bd = 1e9, cx;
    var all = this.solids.concat(this.plats);
    for (i = 0; i < all.length; i++) { var s = all[i]; cx = clamp(f.x, s.x + 20, s.x + s.w - 20); var dd = Math.abs(cx - f.x) + Math.abs(s.y - f.y) * 0.7; if (s.y < f.y + 80 || true) if (dd < bd) { bd = dd; best = { x: cx, y: s.y, w: s.w }; } }
    if (best && !(L === 0 && rng.next() < 0.3)) {
      var tx = best.x; inp.mx = sgn(tx - f.x) * (Math.abs(tx - f.x) < 12 ? 0 : 1);
      if (f.y > best.y - 30 && f.vy > -150) {
        if (f.jumps > 0) pr.jump = 3;
        else if (L >= 1 || rng.next() < 0.4) { var su = d.spU; if (su.kind === 'rise' && !f.usedUp) { inp.my = -1; pr.special = 3; } else if (su.kind === 'blink' && f.blinks > 0 && f.blinkCd <= 0) { inp.my = -1; inp.mx = sgn(tx - f.x) * 0.5; pr.special = 3; } else if (f.airDodge && L >= 2 && f.y > best.y + 160) { pr.dodge = 2; } }
      }
    }
    return inp;
  }
  var t = this.nearestEnemy(f);
  if (!t) return inp;
  var dx = t.x - f.x, dy = t.y - f.y, adx = Math.abs(dx), ady = Math.abs(dy), reach = d.light[0].hx + d.light[0].hw;
  /* hazard avoidance */
  if (L >= 1) for (i = 0; i < this.hzs.length; i++) { var o = this.hzs[i]; if ((o.d.t === 'beam' || o.d.t === 'jet') && o.phase !== 'idle' && Math.abs(o.x - f.x) < o.d.w * 0.5 + 60) { inp.mx = sgn(f.x - o.x) || 1; a.cd = 2; if (f.grounded && L >= 2) pr.jump = 2; return inp; } }
  /* carried bomb */
  if (f.carry) { if (adx < 420 && ady < 200 || f.carry.fuse < 70) { inp.mx = sgn(dx) * 0.2; pr.light = 2; return inp; } inp.mx = sgn(dx); return inp; }
  /* items */
  if (L >= 1 && this.items.length && adx > 220) {
    var ib = null, id2 = 450; for (i = 0; i < this.items.length; i++) { var it = this.items[i]; var dd2 = Math.abs(it.x - f.x) + Math.abs(it.y - f.y) * 0.8; if (dd2 < id2 && it.y >= it.ty - 2) { id2 = dd2; ib = it; } }
    if (ib) { inp.mx = sgn(ib.x - f.x); if (ib.y < f.y - 80 && f.grounded) pr.jump = 3; if (Math.abs(ib.x - f.x) < 24) inp.mx = 0; this.edgeGuard(f, inp, ib.y, ib.x); return inp; }
  }
  /* defence */
  if (L >= 1 && adx < 190) {
    var thr = t.state === 'atk' && t.atk && Math.floor(t.atk.t) < t.atk.m.su + t.atk.m.ac && (t.face === sgn(f.x - t.x) || t.atk.m.kind === 'burst');
    if (thr && rng.next() < [0, 0.4, 0.65, 0.88][L]) {
      if (f.grounded) { if (L >= 2 && rng.next() < 0.45 && f.dodgeCd <= 0) { inp.mx = sgn(f.x - t.x); pr.dodge = 2; } else a.shT = 16; } else if (f.airDodge && L >= 2) { pr.dodge = 2; }
      a.cd = 3; return inp;
    }
  }
  /* approach */
  var want = reach * (L >= 2 ? 0.8 : 0.9);
  if (adx > want) inp.mx = sgn(dx); else inp.mx = sgn(dx) * 0.2;
  if (L === 0 && rng.next() < 0.25) inp.mx = 0;
  /* vertical */
  if (dy < -90 && adx < 320) { if (f.grounded) pr.jump = 3; else if (f.jumps > 0 && f.vy > 0 && rng.next() < 0.5) pr.jump = 3; }
  if (dy > 110 && adx < 200 && f.standing && !f.standing.solid && L >= 1) inp.my = 1;
  if (L >= 1) this.edgeGuard(f, inp, t.y, t.x);
  /* attacks */
  var aggr = [0.3, 0.55, 0.78, 0.92][L];
  if (ady < 90 && adx <= reach + 24 && rng.next() < aggr) {
    var r = rng.next();
    if (r < 0.5) { pr.light = 2; } else if (r < 0.8 && L >= 1) { pr.heavy = 2; } else if (L >= 1 && d.spN.kind === 'spin') { pr.special = 2; } else pr.light = 2;
    if (t.pct > 110 && L >= 2) { pr.light = 0; pr.heavy = 2; }
    if (d.id === 'CORAL' && L >= 1 && f.bubCd <= 0 && rng.next() < 0.18) { pr.special = 2; inp.my = 1; pr.heavy = 0; pr.light = 0; }
  } else if (dy < -70 && adx < 100 && rng.next() < aggr) { pr.heavy = 2; inp.my = -1; }
  else if (adx > 260 && adx < 760 && ady < 110 && t.alive && (d.spN.kind === 'proj') && f.face === sgn(dx) && rng.next() < [0.1, 0.25, 0.35, 0.45][L]) { pr.special = 2; }
  else if (d.spN.kind === 'spin' && adx > 140 && adx < 330 && ady < 90 && L >= 1 && rng.next() < 0.2) pr.special = 2;
  else if (d.id === 'GLITCH' && adx > 200 && adx < 380 && ady < 120 && L >= 2 && rng.next() < 0.25) { pr.special = 2; inp.mx = sgn(dx); }
  return inp;
};
Match.prototype.edgeGuard = function (f, inp, ty, tx) {
  if (!f.grounded || inp.mx === 0 || f.lvl < 1) return;
  var dir = sgn(inp.mx), ahead = f.x + dir * 70, s = this.surfaceAt(ahead, f.y - 10, 0);
  if (s && s.y <= f.y + 40) return;
  if (s && s.y > f.y + 40 && ty > f.y + 80) return;
  var far = this.surfaceAt(f.x + dir * 330, f.y - 140, 0);
  if (far && Math.abs(tx - f.x) > 160) { f.ai.press.jump = 3; return; }
  inp.mx = 0;
};
