/* RUMBLE render: procedural vector art. Every shape here is drawn with canvas paths. */
var BGW = 1300, BGH = 950, WX0 = -500, WY0 = -600, WSC = 2; /* bg cache covers world x -500..2100, y -600..1300 */
var bgCache = {};
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath(); }
function limb(g, x1, y1, x2, y2, w, c) { g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
function glow(g, x, y, r, col, a) {
  if (LEG) { g.fillStyle = col; g.globalAlpha = a * 0.5; g.beginPath(); g.arc(x, y, r * 0.5, 0, 6.283); g.fill(); g.globalAlpha = 1; return; }
  var gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = a; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.globalAlpha = 1;
}
function mkCanvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

/* ---------- backgrounds (static layer cached; a few animated bits drawn live) ---------- */
function buildBg(st) {
  var sc = LEG ? 1 : 2, W = Math.round(BGW * (LEG ? 0.5 : 1)), H = Math.round(BGH * (LEG ? 0.5 : 1));
  var c = mkCanvas(W, H), g = c.getContext('2d'), r = new RNG(st.hue * 31 + 7), i, k;
  g.scale(W / BGW, H / BGH);
  var grad = g.createLinearGradient(0, 0, 0, BGH);
  if (st.id === 'yard') { grad.addColorStop(0, '#02100c'); grad.addColorStop(0.6, '#04261c'); grad.addColorStop(1, '#010a08'); }
  else if (st.id === 'reef') { grad.addColorStop(0, '#04476b'); grad.addColorStop(0.55, '#06335a'); grad.addColorStop(1, '#021a33'); }
  else if (st.id === 'rail') { grad.addColorStop(0, '#1b0a3a'); grad.addColorStop(0.5, '#7a1f6e'); grad.addColorStop(0.78, '#ff7a5c'); grad.addColorStop(1, '#2b0f2e'); }
  else { grad.addColorStop(0, '#120405'); grad.addColorStop(0.55, '#3b0f08'); grad.addColorStop(1, '#6a1a06'); }
  g.fillStyle = grad; g.fillRect(0, 0, BGW, BGH);
  if (st.id === 'yard') {
    g.strokeStyle = 'rgba(80,255,150,.08)'; g.lineWidth = 1.5;
    for (i = 0; i < 18; i++) for (k = 0; k < 14; k++) { var hx = i * 78 + (k % 2) * 39, hy = k * 68; g.beginPath(); for (var q = 0; q < 6; q++) { var a = q * 1.0472; g.lineTo(hx + Math.cos(a) * 36, hy + Math.sin(a) * 36); } g.closePath(); g.stroke(); }
    for (i = 0; i < 9; i++) { var x = i * 150 + r.range(-20, 20), h = r.range(300, 560), w = r.range(70, 110); g.fillStyle = 'rgba(2,24,18,' + r.range(0.7, 0.95).toFixed(2) + ')'; g.fillRect(x, BGH - h - 120, w, h + 120); g.strokeStyle = 'rgba(60,255,140,.25)'; g.lineWidth = 2; g.strokeRect(x, BGH - h - 120, w, h + 120);
      for (k = 0; k < h / 26; k++) { g.fillStyle = r.next() < 0.3 ? 'rgba(180,255,60,.8)' : 'rgba(40,160,100,.45)'; g.fillRect(x + 10, BGH - h - 100 + k * 26, 8, 4); g.fillRect(x + 24, BGH - h - 100 + k * 26, w - 40, 3); } }
  } else if (st.id === 'reef') {
    for (i = 0; i < 6; i++) { var sx = i * 260 + r.range(-40, 40); g.fillStyle = 'rgba(170,240,255,.05)'; g.beginPath(); g.moveTo(sx, 0); g.lineTo(sx + 90, 0); g.lineTo(sx + 330, BGH); g.lineTo(sx + 120, BGH); g.closePath(); g.fill(); }
    for (i = 0; i < 16; i++) { var bx = i * 85 + r.range(-20, 20), by = BGH - 80, hue = (i % 3 === 0 ? 335 : (i % 3 === 1 ? 20 : 270)); g.strokeStyle = 'hsla(' + hue + ',70%,45%,.55)'; g.lineCap = 'round'; (function branch(x, y, a, len, w, d) { if (d > 3) return; var x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke(); branch(x2, y2, a - 0.5 - r.next() * 0.3, len * 0.72, w * 0.7, d + 1); branch(x2, y2, a + 0.5 + r.next() * 0.3, len * 0.72, w * 0.7, d + 1); })(bx, by, -1.57 + r.range(-0.2, 0.2), r.range(90, 150), 12, 0); }
  } else if (st.id === 'rail') {
    g.fillStyle = 'rgba(255,230,200,.9)'; g.beginPath(); g.arc(980, 190, 62, 0, 6.283); g.fill(); g.fillStyle = 'rgba(122,31,110,.9)'; g.beginPath(); g.arc(1010, 175, 56, 0, 6.283); g.fill();
    for (var ly = 0; ly < 3; ly++) { for (i = 0; i < 20; i++) { var bw = r.range(50, 120), bh = r.range(120, 420) * (1 - ly * 0.22), bx2 = i * 68 + r.range(-20, 20); g.fillStyle = 'rgba(' + (30 - ly * 8) + ',' + (8 + ly * 6) + ',' + (50 - ly * 8) + ',' + (0.95 - ly * 0.1) + ')'; g.fillRect(bx2, BGH - 170 - bh + ly * 24, bw, bh + 200);
        for (k = 0; k < bh / 30; k++) if (r.next() < 0.35) { g.fillStyle = 'rgba(255,210,120,.65)'; g.fillRect(bx2 + 8 + r.int(Math.max(1, bw / 18)) * 14, BGH - 170 - bh + ly * 24 + 10 + k * 30, 7, 10); } } }
  } else {
    for (i = 0; i < 3; i++) { var gx = 200 + i * 420, gy = 300 + (i % 2) * 120, R = 150 + i * 30; g.fillStyle = 'rgba(40,12,8,.9)'; g.strokeStyle = 'rgba(255,120,40,.25)'; g.lineWidth = 3; g.beginPath(); for (k = 0; k < 16; k++) { var aa = k * 0.3927, rr2 = (k % 2 ? R : R * 0.82); g.lineTo(gx + Math.cos(aa) * rr2, gy + Math.sin(aa) * rr2); } g.closePath(); g.fill(); g.stroke(); g.beginPath(); g.arc(gx, gy, R * 0.35, 0, 6.283); g.stroke(); }
    for (i = 0; i < 14; i++) { g.fillStyle = 'rgba(25,8,6,.8)'; g.fillRect(i * 100 + r.range(-10, 10), 0, 34, r.range(120, 380)); }
  }
  return c;
}
function drawBg(g, m, cam, cw, ch, t) {
  var st = m.stage, c = bgCache[st.id]; if (!c) c = bgCache[st.id] = buildBg(st);
  /* parallax 0.55: bg plane scrolls slower than the world */
  var par = 0.55, s = cam.s, cx = cam.x, cy = cam.y;
  g.setTransform(1, 0, 0, 1, 0, 0);
  var sx = (cw / 2) - (cx * par + 800 * (1 - par) - WX0 - 0) * s * 1; /* fallback below */
  g.save(); g.setTransform(cam.d, 0, 0, cam.d, 0, 0);
  var k = s * 1.15; /* bg is drawn 1.15x larger than the camera zoom so edges never show */
  var ox = cw / 2 - (cx - 800) * par * s - (800 - WX0) * k, oy = ch / 2 - (cy - 420) * par * s - (420 - WY0) * k;
  var f = c.width / (2600 * k), sx0 = (0 - ox) * f, sy0 = (0 - oy) * f, sw = cw * f, sh = ch * f, dx0 = 0, dy0 = 0, dw = cw, dh = ch;
  if (sx0 < 0) { dx0 = -sx0 / f; dw -= dx0; sw += sx0; sx0 = 0; } if (sy0 < 0) { dy0 = -sy0 / f; dh -= dy0; sh += sy0; sy0 = 0; }
  if (sx0 + sw > c.width) { dw -= (sx0 + sw - c.width) / f; sw = c.width - sx0; } if (sy0 + sh > c.height) { dh -= (sy0 + sh - c.height) / f; sh = c.height - sy0; }
  if (sw > 1 && sh > 1) g.drawImage(c, sx0, sy0, sw, sh, dx0, dy0, dw, dh);
  g.restore();
}
function drawBgLive(g, m, t) {
  var st = m.stage, i, r;
  if (st.id === 'yard') { if (LEG) return; g.fillStyle = 'rgba(160,255,90,.55)'; for (i = 0; i < 26; i++) { var x = (i * 97) % 2000 - 200, y = ((t * 90 + i * 211) % 1500) - 500; g.fillRect(x, y, 5, 9); g.fillStyle = 'rgba(80,255,150,.18)'; g.fillRect(x + 1, y - 60, 3, 60); g.fillStyle = 'rgba(160,255,90,.55)'; } }
  else if (st.id === 'reef') { g.fillStyle = 'rgba(200,245,255,.35)'; for (i = 0; i < (LEG ? 8 : 22); i++) { var bx = (i * 131) % 1900 - 150, by = 1250 - ((t * 60 + i * 173) % 1700), br = 3 + (i % 4) * 2; g.beginPath(); g.arc(bx + Math.sin(t + i) * 12, by, br, 0, 6.283); g.fill(); }
    g.fillStyle = 'rgba(10,40,70,.7)'; for (i = 0; i < 3; i++) { var fx = ((t * (30 + i * 12) + i * 600) % 2400) - 400, fy = 200 + i * 140; g.beginPath(); g.ellipse(fx, fy, 26, 9, 0, 0, 6.283); g.moveTo(fx - 22, fy); g.lineTo(fx - 42, fy - 10 + Math.sin(t * 6) * 3); g.lineTo(fx - 42, fy + 10); g.fill(); } }
  else if (st.id === 'rail') { g.strokeStyle = 'rgba(255,200,170,.5)'; g.lineWidth = 3; for (i = 0; i < 6; i++) { var rx = ((t * 160 + i * 380) % 2600) - 400, ry = 120 + i * 90; g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx + 60, ry); g.stroke(); } }
  else { if (LEG) return; g.fillStyle = 'rgba(255,170,60,.8)'; for (i = 0; i < 24; i++) { var ex = (i * 89) % 1900 - 150 + Math.sin(t * 2 + i) * 20, ey = 1000 - ((t * 80 + i * 137) % 1300); g.fillRect(ex, ey, 3, 3); } }
}
function drawStageFront(g, m, t) {
  var st = m.stage, i, s, h;
  var hue = st.hue, edge = hsl(hue, 100, 62, 1), fill = hsl(hue, 45, 14, 1), fill2 = hsl(hue, 40, 9, 1);
  /* lava */
  if (st.lava) {
    var ly = st.lava; g.fillStyle = '#ff4d10'; g.beginPath(); g.moveTo(-600, 1300); g.lineTo(-600, ly); for (var x = -600; x <= 2200; x += 40) g.lineTo(x, ly + Math.sin(x * 0.02 + t * 2) * 8 + Math.sin(x * 0.007 - t) * 6); g.lineTo(2200, 1300); g.closePath(); g.fill();
    var lg = g.createLinearGradient(0, ly - 260, 0, ly); lg.addColorStop(0, 'rgba(255,120,30,0)'); lg.addColorStop(1, 'rgba(255,120,30,.3)'); g.fillStyle = lg; g.fillRect(-600, ly - 260, 2800, 260);
    g.fillStyle = 'rgba(255,220,90,.55)'; for (i = 0; i < 12; i++) g.fillRect(((i * 211 + t * 24) % 2600) - 400, ly + 18 + (i % 4) * 22, 70, 5);
  }
  for (i = 0; i < m.solids.length; i++) {
    s = m.solids[i]; var gr = g.createLinearGradient(0, s.y, 0, s.y + s.h); gr.addColorStop(0, fill); gr.addColorStop(1, fill2); g.fillStyle = gr; g.fillRect(s.x, s.y, s.w, s.h);
    g.strokeStyle = hsl(hue, 60, 30, 0.7); g.lineWidth = 2; g.strokeRect(s.x, s.y, s.w, s.h);
    if (st.id === 'yard') { g.fillStyle = 'rgba(80,255,150,.5)'; for (var k = 0; k < s.w / 60; k++) g.fillRect(s.x + 20 + k * 60, s.y + 24, 28, 4); }
    else if (st.id === 'reef') { g.fillStyle = 'rgba(255,120,160,.35)'; for (k = 0; k < s.w / 50; k++) { g.beginPath(); g.arc(s.x + 24 + k * 50, s.y + 40 + (k % 3) * 24, 10 + (k % 3) * 4, 0, 6.283); g.fill(); } }
    else if (st.id === 'rail') { g.strokeStyle = 'rgba(255,170,120,.25)'; for (k = 0; k < s.w / 40; k++) { g.beginPath(); g.moveTo(s.x + k * 40, s.y); g.lineTo(s.x + k * 40 + 30, s.y + s.h); g.stroke(); } }
    else { g.fillStyle = 'rgba(255,110,30,.3)'; for (k = 0; k < s.w / 44; k++) g.fillRect(s.x + 10 + k * 44, s.y + 20 + (k % 3) * 30, 30, 6); }
    g.fillStyle = edge; g.fillRect(s.x, s.y - 3, s.w, 5); if (!LEG) glow(g, s.x + s.w / 2, s.y, s.w * 0.55, edge, 0.14);
  }
  for (i = 0; i < m.plats.length; i++) {
    s = m.plats[i]; g.fillStyle = hsl(hue, 40, 20, 0.95); rr(g, s.x, s.y, s.w, 16, 6); g.fill(); g.fillStyle = edge; g.fillRect(s.x + 4, s.y - 2, s.w - 8, 4);
    if (s.mv) { g.fillStyle = 'rgba(255,255,255,.7)'; for (var q = 0; q < 4; q++) g.fillRect(s.x + 16 + q * (s.w - 40) / 3, s.y + 5, 8, 4); }
  }
  /* hazards */
  for (i = 0; i < m.hzs.length; i++) {
    var o = m.hzs[i]; h = o.d;
    if (h.t === 'beam' && o.phase !== 'idle') { var wv = h.w; if (o.phase === 'warn') { var bl = Math.floor(o.t / 6) % 2; g.fillStyle = bl ? 'rgba(255,60,90,.22)' : 'rgba(255,60,90,.09)'; g.fillRect(o.x - wv / 2, -700, wv, 1500); g.fillStyle = '#ff3d5a'; g.fillRect(o.x - 18, 30 + (bl ? 0 : 6), 36, 10); } else { g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(o.x - wv * 0.2, -700, wv * 0.4, 1500); g.fillStyle = 'rgba(255,80,110,.55)'; g.fillRect(o.x - wv / 2, -700, wv, 1500); if (!LEG) glow(g, o.x, 600, 300, '#ff3d5a', 0.4); } }
    else if (h.t === 'jet' && o.phase !== 'idle') { var jw = h.w, hh = st.lava - h.top; if (o.phase === 'warn') { var b2 = Math.floor(o.t / 6) % 2; g.fillStyle = b2 ? 'rgba(255,150,40,.3)' : 'rgba(255,150,40,.12)'; g.fillRect(o.x - jw / 2, h.top, jw, hh); } else { var gg = g.createLinearGradient(0, h.top, 0, st.lava); gg.addColorStop(0, 'rgba(255,230,120,.2)'); gg.addColorStop(1, 'rgba(255,120,30,.95)'); g.fillStyle = gg; g.fillRect(o.x - jw / 2, h.top, jw, hh); g.fillStyle = 'rgba(255,255,220,.8)'; g.fillRect(o.x - jw * 0.2, h.top + 20, jw * 0.4, hh - 20); } }
    else if (h.t === 'current') { if (o.on) { g.fillStyle = 'rgba(170,240,255,.10)'; g.fillRect(h.x, h.y0, h.w, h.y1 - h.y0 + 60); g.fillStyle = 'rgba(220,250,255,.55)'; for (var b = 0; b < (LEG ? 6 : 14); b++) { var by = h.y1 + 60 - ((t * 220 + b * 71) % (h.y1 - h.y0 + 60)); g.beginPath(); g.arc(h.x + 20 + ((b * 53) % (h.w - 40)), by, 3 + b % 3, 0, 6.283); g.fill(); } } else { g.fillStyle = 'rgba(170,240,255,.04)'; g.fillRect(h.x, h.y0, h.w, h.y1 - h.y0 + 60); } }
    else if (h.t === 'wind' && o.phase !== 'idle') { var al = o.phase === 'warn' ? 0.25 : 0.7; g.strokeStyle = 'rgba(255,255,255,' + al + ')'; g.lineWidth = 3; for (var w2 = 0; w2 < 14; w2++) { var wy = -200 + w2 * 90, wx = ((t * 900 * o.dir + w2 * 331) % 2400); if (wx < 0) wx += 2400; wx -= 400; g.beginPath(); g.moveTo(wx, wy); g.lineTo(wx + o.dir * 130, wy); g.stroke(); } }
  }
}
/* ---------- items & projectiles ---------- */
function drawItem(g, it, t) {
  var def = null, i; for (i = 0; i < ITEMS.length; i++) if (ITEMS[i].id === it.type) def = ITEMS[i];
  var y = it.y - 26 + Math.sin(it.t * 0.08) * 5, x = it.x, a = it.life < 180 && Math.floor(it.t / 5) % 2 ? 0.4 : 1;
  g.globalAlpha = a; glow(g, x, y, 56, def.col, 0.55);
  g.fillStyle = 'rgba(8,12,30,.9)'; g.strokeStyle = def.col; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 20, 0, 6.283); g.fill(); g.stroke();
  g.strokeStyle = def.col; g.fillStyle = def.col; g.lineWidth = 3.5; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
  if (it.type === 'patch') { g.moveTo(x - 9, y); g.lineTo(x + 9, y); g.moveTo(x, y - 9); g.lineTo(x, y + 9); g.stroke(); }
  else if (it.type === 'clock') { g.moveTo(x - 9, y - 8); g.lineTo(x, y); g.lineTo(x - 9, y + 8); g.moveTo(x, y - 8); g.lineTo(x + 9, y); g.lineTo(x, y + 8); g.stroke(); }
  else if (it.type === 'bulwark') { for (i = 0; i < 6; i++) g.lineTo(x + Math.cos(i * 1.047) * 10, y + Math.sin(i * 1.047) * 10); g.closePath(); g.stroke(); }
  else if (it.type === 'feather') { g.moveTo(x, y + 9); g.lineTo(x, y - 9); g.moveTo(x - 7, y - 2); g.lineTo(x, y - 9); g.lineTo(x + 7, y - 2); g.stroke(); }
  else if (it.type === 'static') { g.moveTo(x + 3, y - 11); g.lineTo(x - 6, y + 1); g.lineTo(x + 1, y + 1); g.lineTo(x - 3, y + 11); g.lineTo(x + 7, y - 2); g.lineTo(x, y - 2); g.closePath(); g.fill(); }
  else { g.arc(x, y + 2, 8, 0, 6.283); g.stroke(); g.beginPath(); g.moveTo(x + 4, y - 5); g.lineTo(x + 9, y - 11); g.stroke(); }
  g.globalAlpha = 1;
}
function drawProj(g, p, t) {
  g.save(); g.translate(p.x, p.y); var d = p.vx < 0 ? -1 : 1; g.scale(d, 1);
  if (p.look === 'glyph') { glow(g, 0, 0, 50, '#B4FF3C', 0.5); g.fillStyle = '#d8ff7a'; rr(g, -26, -9, 52, 18, 5); g.fill(); g.fillStyle = '#0a2a10'; g.font = 'bold 14px monospace'; g.textAlign = 'center'; g.fillText((Math.floor(p.t / 3) % 2) ? '01' : '10', 0, 5); g.strokeStyle = 'rgba(180,255,60,.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-26, 0); g.lineTo(-70, 0); g.stroke(); }
  else if (p.look === 'wave') { glow(g, 0, 0, 80, '#3DF2B0', 0.4); g.lineWidth = 5; for (var k = 0; k < 3; k++) { g.strokeStyle = 'rgba(61,242,176,' + (0.9 - k * 0.28) + ')'; g.beginPath(); g.ellipse(-k * 16, 0, 20 + k * 3, 56 - k * 6, 0, -1.2, 1.2); g.stroke(); } }
  else if (p.look === 'zap') { glow(g, 0, 0, 40, '#FFEB3B', 0.6); g.strokeStyle = '#fffbd0'; g.lineWidth = 4; g.beginPath(); g.moveTo(-26, 0); for (var z = 0; z < 5; z++) g.lineTo(-26 + z * 12, (z % 2 ? -9 : 9) + Math.sin(p.t + z) * 2); g.stroke(); }
  else if (p.look === 'harpoon') { g.strokeStyle = '#d8f6ff'; g.lineWidth = 4; g.beginPath(); g.moveTo(-32, 0); g.lineTo(26, 0); g.stroke(); g.fillStyle = '#4FD8FF'; g.beginPath(); g.moveTo(34, 0); g.lineTo(20, -9); g.lineTo(23, 0); g.lineTo(20, 9); g.closePath(); g.fill(); g.strokeStyle = 'rgba(79,216,255,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-32, 0); g.lineTo(-90, 0); g.stroke(); }
  else if (p.look === 'bomb') { var fz = Math.floor(p.life / 5) % 2; glow(g, 0, 0, 60, fz ? '#FF4D6A' : '#FFD93D', 0.5); g.fillStyle = '#26202c'; g.strokeStyle = '#FF4D6A'; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 16, 0, 6.283); g.fill(); g.stroke(); g.fillStyle = fz ? '#FFD93D' : '#FF4D6A'; g.fillRect(-4, -26, 8, 10); }
  g.restore();
}

/* ---------- fighters ---------- */
function atkProgress(f) { if (!f.atk) return -1; var m = f.atk.m; return f.atk.t / (m.su + m.ac + m.rc); }
function eyeGlow(g, x, y, r, col) { glow(g, x, y, r * 3.2, col, 0.75); g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(x - r * 0.25, y - r * 0.25, r * 0.35, 0, 6.283); g.fill(); }
function drawFighter(g, f, m, t) {
  var d = f.def, st = f.state, ph = f.t * 0.3, run = st === 'run' ? Math.min(1, Math.abs(f.vx) / 400) : 0, air = !f.grounded && st !== 'dead';
  var bob = st === 'idle' ? Math.sin(f.t * 0.09) * 1.6 : 0, ap = atkProgress(f), act = 0, mv = f.atk ? f.atk.m : null;
  if (mv) { var tt = f.atk.t; act = tt >= mv.su && tt < mv.su + mv.ac ? 1 : (tt < mv.su ? tt / Math.max(1, mv.su) * 0.6 : 0.3); }
  g.save(); g.translate(f.x, f.y);
  /* shadow + player ring */
  var sf = m.surfaceAt(f.x, f.y - 4, 0);
  g.fillStyle = PCOL[f.slot % 4]; g.globalAlpha = 0.9; g.beginPath(); g.ellipse(0, 2, d.w * 0.55, 6, 0, 0, 6.283); g.fill(); g.globalAlpha = 1;
  if (f.inv > 0 && f.state !== 'dodge' && Math.floor(f.t / 4) % 2) g.globalAlpha = 0.45;
  if (f.state === 'dodge') g.globalAlpha = 0.5;
  if (f.flash > 0 && Math.floor(f.flash / 2) % 2) g.globalAlpha = 0.8;
  g.scale(f.face, 1);
  var lean = st === 'hit' ? -0.35 : (st === 'run' ? 0.12 : 0); g.translate(0, bob); g.rotate(lean * (st === 'hit' ? Math.min(1, f.hitstun / 14) : 1)); if (f.state === 'hit') g.rotate(f.t * 0.3 * (f.hitstun > 12 ? 1 : 0));
  if (f.state === 'dodge' && f.grounded) g.scale(1, 0.78);
  var fn = DRAW[d.id]; fn(g, f, { ph: ph, run: run, air: air, ap: ap, act: act, t: t, mv: mv, hit: st === 'hit' || st === 'stun' });
  g.restore();
  /* shield and bubble in world space */
  if (f.shOn) { g.save(); g.translate(f.x, f.y - d.h / 2); var sr = d.h * 0.62 * (0.5 + f.sh / 200); g.fillStyle = 'rgba(120,200,255,' + (0.14 + f.flash * 0.03) + ')'; g.strokeStyle = 'rgba(190,235,255,.9)'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, sr, 0, 6.283); g.fill(); g.stroke(); g.restore(); }
  if (f.bubble > 0) { g.save(); g.translate(f.x, f.y - d.h / 2); var br = d.h * 0.72 + Math.sin(f.t * 0.2) * 2; g.fillStyle = 'rgba(180,245,255,.16)'; g.strokeStyle = 'rgba(210,250,255,' + (f.bubble < 60 && Math.floor(f.t / 4) % 2 ? 0.3 : 0.85) + ')'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, br, 0, 6.283); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(-br * 0.4, -br * 0.4, 6, 0, 6.283); g.fill(); g.restore(); }
  if (f.bul > 0) { g.strokeStyle = 'rgba(91,192,255,.55)'; g.lineWidth = 3; g.beginPath(); for (var q = 0; q < 6; q++) g.lineTo(f.x + Math.cos(q * 1.047 + f.t * 0.02) * d.h * 0.62, f.y - d.h / 2 + Math.sin(q * 1.047 + f.t * 0.02) * d.h * 0.62); g.closePath(); g.stroke(); }
  if (f.haste > 0 && !LEG) { g.strokeStyle = 'rgba(255,217,61,.5)'; g.lineWidth = 3; for (q = 0; q < 3; q++) { g.beginPath(); g.moveTo(f.x - f.face * (30 + q * 10), f.y - 20 - q * 22); g.lineTo(f.x - f.face * (70 + q * 14), f.y - 20 - q * 22); g.stroke(); } }
  if (f.stat > 0) { glow(g, f.x, f.y - d.h * 0.5, 70, '#FF8C3D', 0.35 + 0.15 * Math.sin(f.t * 0.3)); }
  if (f.carry) { g.fillStyle = Math.floor(f.carry.fuse / 6) % 2 ? '#FF4D6A' : '#FFD93D'; g.beginPath(); g.arc(f.x, f.y - d.h - 26, 10, 0, 6.283); g.fill(); }
  if (f.state === 'stun') { g.fillStyle = '#FFD93D'; for (q = 0; q < 3; q++) { var aa = f.t * 0.2 + q * 2.1; g.beginPath(); g.arc(f.x + Math.cos(aa) * 24, f.y - d.h - 14 + Math.sin(aa) * 6, 4, 0, 6.283); g.fill(); } }
  /* attack swoosh in world space so it matches the real hitbox */
  if (mv && act === 1 && (mv.kind === 'melee' || mv.kind === 'burst' || mv.kind === 'rise' || mv.kind === 'spin') && mv.hw > 0) {
    var hb = m.hitbox(f, mv); g.save(); g.globalAlpha = 0.28 + 0.12 * Math.sin(f.t); g.fillStyle = d.col; var cx = hb.x + hb.w / 2, cy = hb.y + hb.h / 2;
    g.beginPath(); g.ellipse(cx, cy, hb.w / 2, hb.h / 2, 0, 0, 6.283); g.fill(); g.globalAlpha = 0.7; g.strokeStyle = '#ffffff'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(cx, cy, hb.w / 2 - 3, hb.h / 2 - 3, 0, f.face > 0 ? -1.1 : 2.04, f.face > 0 ? 1.1 : 4.24); g.stroke(); g.restore();
  }
}
var DRAW = {};
var SKIN = '#E8B796';
function stdLegs(g, f, s, col, shoe, lw, hipY, len) {
  var run = s.run, ph = s.ph, i;
  for (i = 0; i < 2; i++) {
    var sg = i ? 1 : -1, fx, fy;
    if (s.air) { fx = sg * 7 + (i ? 8 : -3); fy = -len * 0.35 - (i ? 6 : 0); } else if (run > 0.1) { fx = Math.sin(ph + (i ? 3.14 : 0)) * 20 * run; fy = -Math.max(0, Math.cos(ph + (i ? 3.14 : 0))) * 12 * run; } else { fx = sg * 8; fy = 0; }
    limb(g, sg * 3, hipY, fx, fy - 4, lw, col); g.fillStyle = shoe; rr(g, fx - 5, fy - 9, 17, 9, 4); g.fill();
  }
}
DRAW.IO = function (g, f, s) {
  var GREEN = '#2FA84F', DGREEN = '#1E7A38', JEAN = '#3F66A8', NAVY = '#1B2A5E', LIME = '#C6FF2E';
  stdLegs(g, f, s, JEAN, NAVY, 13, -44, 44);
  /* back arm */
  var armA = s.act === 1 ? 0 : (s.hit ? -1.6 : Math.sin(s.ph) * 0.6 * s.run);
  limb(g, -3, -74, -8 - Math.sin(armA) * 6, -52, 10, DGREEN);
  /* torso hoodie */
  g.fillStyle = GREEN; rr(g, -15, -80, 30, 40, 9); g.fill(); g.fillStyle = DGREEN; g.fillRect(-15, -46, 30, 4); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-8, -56); g.lineTo(8, -56); g.stroke(); g.fillStyle = 'rgba(0,0,0,.2)'; rr(g, -9, -55, 18, 11, 3); g.fill();
  g.strokeStyle = '#DDEEDD'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(4, -76); g.lineTo(5, -62); g.moveTo(8, -76); g.lineTo(9, -64); g.stroke();
  /* hood: up, pointed tip */
  g.fillStyle = DGREEN; g.beginPath(); g.moveTo(-15, -76); g.quadraticCurveTo(-17, -100, -6, -112); g.quadraticCurveTo(0, -108, 7, -104); g.quadraticCurveTo(17, -96, 14, -78); g.closePath(); g.fill();
  g.fillStyle = '#071810'; g.beginPath(); g.ellipse(5, -90, 9.5, 13, 0, 0, 6.283); g.fill();
  eyeGlow(g, 3, -91, 2.7, LIME); eyeGlow(g, 10, -91, 2.7, LIME);
  g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-6, -108); g.lineTo(-5, -80); g.stroke();
  /* front arm + code blade */
  var ex = 14, ey = -62;
  if (s.act > 0 && s.mv) { var k = s.act === 1 ? 1 : 0.4; ex = 14 + 30 * k; ey = -64 - (s.mv.hy < -100 ? 40 * k : 0); } else if (s.hit) { ex = 8; ey = -90; } else { ex = 10 + Math.sin(s.ph) * 6 * s.run; ey = -54; }
  limb(g, 8, -72, ex, ey, 10, GREEN); g.fillStyle = SKIN; g.beginPath(); g.arc(ex, ey, 5, 0, 6.283); g.fill();
  var bl = 40 + (s.act === 1 ? 46 : 0), ba = s.act === 1 ? -0.5 + (s.mv && s.mv.hy < -100 ? -0.9 : 0.35) : -0.9;
  g.save(); g.translate(ex, ey); g.rotate(ba); g.strokeStyle = 'rgba(180,255,60,.35)'; g.lineWidth = 9; g.beginPath(); g.moveTo(0, 0); g.lineTo(bl, 0); g.stroke(); g.strokeStyle = LIME; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 0); g.lineTo(bl, 0); g.stroke(); g.fillStyle = '#eaffb0'; for (var i = 1; i < 5; i++) g.fillRect(i * bl / 5, -2, 3, 4); g.restore();
};
DRAW.VIDA = function (g, f, s) {
  var TEAL = '#16B58E', DARK = '#1C2A3E', HAIR = '#2B1B3B', WHITE = '#EAF4F8';
  stdLegs(g, f, s, DARK, WHITE, 11, -42, 42);
  /* ponytail straight down */
  var sw = Math.sin(f.t * 0.12) * 2 + (s.run > 0.1 ? -8 : 0); limb(g, -11, -86, -13 + sw, -56, 7, HAIR); g.fillStyle = HAIR; g.beginPath(); g.arc(-13 + sw, -54, 5, 0, 6.283); g.fill();
  limb(g, -2, -74, -6, -52 + (s.hit ? -30 : 0), 8, TEAL);
  g.fillStyle = TEAL; rr(g, -12, -78, 24, 38, 8); g.fill(); g.fillStyle = WHITE; g.fillRect(-12, -62, 24, 3);
  g.fillStyle = SKIN; g.beginPath(); g.arc(1, -87, 12, 0, 6.283); g.fill();
  g.fillStyle = HAIR; g.beginPath(); g.arc(0, -90, 13, 3.3, 6.2); g.lineTo(11, -86); g.quadraticCurveTo(4, -96, -11, -84); g.fill();
  eyeGlow(g, 6, -87, 2.4, '#4DFF9A'); eyeGlow(g, 11, -87, 2.2, '#4DFF9A');
  var ex = 10, ey = -56; if (s.act > 0) { ex = 14 + 26 * (s.act === 1 ? 1 : 0.4); ey = -68; } else if (s.hit) { ex = 6; ey = -92; } else { ex = 8 + Math.sin(s.ph) * 5 * s.run; }
  limb(g, 7, -72, ex, ey, 8, TEAL); g.fillStyle = SKIN; g.beginPath(); g.arc(ex, ey, 4.5, 0, 6.283); g.fill();
  if (s.act > 0 || (s.mv && s.mv.kind === 'proj')) { glow(g, ex + 6, ey, 34, '#3DF2B0', 0.7); }
};
DRAW.TORTUGA = function (g, f, s) {
  var AMB = '#FFC24A', DK = '#5a3a14', MET = '#8d98a8', i;
  /* shell */
  var spin = f.spinT > 0, rot = spin ? f.t * 0.5 : 0;
  g.save(); g.translate(-10, -52); g.rotate(rot); g.fillStyle = '#a8651a'; g.beginPath(); g.ellipse(0, 0, 46, spin ? 46 : 38, 0, 0, 6.283); g.fill(); g.strokeStyle = '#ffd37a'; g.lineWidth = 3; g.stroke();
  g.strokeStyle = 'rgba(255,211,122,.6)'; g.lineWidth = 2; for (i = 0; i < 6; i++) { g.beginPath(); g.moveTo(Math.cos(i * 1.047) * 12, Math.sin(i * 1.047) * 12); g.lineTo(Math.cos(i * 1.047) * 38, Math.sin(i * 1.047) * 38); g.stroke(); } g.beginPath(); for (i = 0; i < 6; i++) g.lineTo(Math.cos(i * 1.047) * 13, Math.sin(i * 1.047) * 13); g.closePath(); g.stroke(); g.restore();
  if (spin) { g.strokeStyle = 'rgba(255,211,122,.5)'; g.lineWidth = 4; g.beginPath(); g.arc(-10, -52, 58, f.t * 0.5, f.t * 0.5 + 2); g.stroke(); return; }
  stdLegs(g, f, s, MET, DK, 17, -26, 28);
  g.fillStyle = MET; rr(g, -6, -66, 34, 40, 10); g.fill(); g.fillStyle = AMB; g.fillRect(-2, -50, 26, 4); g.fillRect(-2, -42, 26, 3);
  /* head */
  g.fillStyle = MET; rr(g, 12, -86, 28, 24, 8); g.fill(); g.fillStyle = '#12090a'; rr(g, 20, -80, 18, 9, 4); g.fill(); eyeGlow(g, 33, -75.5, 3, '#FFB020');
  var ex = 30, ey = -50; if (s.act > 0) { ex = 40 + 30 * (s.act === 1 ? 1 : 0.3); ey = -58; } else if (s.hit) { ex = 20; ey = -80; } else ex = 26 + Math.sin(s.ph) * 5 * s.run;
  limb(g, 24, -60, ex, ey, 14, MET); g.fillStyle = '#c7ced8'; g.beginPath(); g.moveTo(ex, ey - 9); g.lineTo(ex + 15, ey); g.lineTo(ex, ey + 9); g.closePath(); g.fill();
  if (s.mv && s.mv.armor && f.armorOn) { g.strokeStyle = 'rgba(255,194,74,.9)'; g.lineWidth = 4; g.beginPath(); g.ellipse(6, -50, 52, 52, 0, 0, 6.283); g.stroke(); }
};
DRAW.SPARKPLUG = function (g, f, s) {
  var Y = '#FFEB3B', DK = '#3a3410', i;
  stdLegs(g, f, s, '#555a66', DK, 11, -30, 30);
  limb(g, -10, -56, -18, -36 + (s.hit ? -28 : 0), 6, '#2b2f3a');
  g.fillStyle = Y; rr(g, -17, -78, 34, 50, 8); g.fill(); g.fillStyle = DK; g.fillRect(-17, -52, 34, 3);
  g.fillStyle = '#8b8f9a'; g.fillRect(-9, -84, 7, 7); g.fillRect(4, -84, 7, 7);
  var ch = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(f.t * 0.2)); g.fillStyle = DK; for (i = 0; i < 3; i++) { g.globalAlpha = i / 3 < ch ? 1 : 0.25; g.fillRect(-10, -72 + i * 7, 20, 4); } g.globalAlpha = 1;
  g.fillStyle = '#0b0d14'; rr(g, -11, -48, 22, 15, 5); g.fill(); eyeGlow(g, -3, -40.5, 2.8, '#7CF7FF'); eyeGlow(g, 6, -40.5, 2.8, '#7CF7FF');
  var ex = 17, ey = -52; if (s.act > 0) { ex = 22 + 28 * (s.act === 1 ? 1 : 0.4); ey = -58; } else if (s.hit) { ex = 14; ey = -82; } else ex = 18 + Math.sin(s.ph) * 5 * s.run;
  g.strokeStyle = '#555a66'; g.lineWidth = 5; g.beginPath(); g.moveTo(14, -66); g.quadraticCurveTo(ex - 6, ey - 12, ex, ey); g.stroke(); g.fillStyle = '#c9ced8'; g.beginPath(); g.arc(ex, ey, 6, 0, 6.283); g.fill();
  if (s.act > 0 || f.t % 9 < 2) { g.strokeStyle = '#FFFDE0'; g.lineWidth = 2.5; for (i = 0; i < 2; i++) { g.beginPath(); g.moveTo(ex + 4, ey); g.lineTo(ex + 14, ey - 8 + i * 12); g.lineTo(ex + 22, ey - 2 + i * 8); g.stroke(); } }
};
DRAW.CORAL = function (g, f, s) {
  var SUIT = '#0F5E6E', ORG = '#FF8A3D', FIN = '#12323a';
  stdLegs(g, f, s, SUIT, FIN, 13, -46, 46);
  g.fillStyle = '#9aa7ad'; rr(g, -24, -82, 11, 36, 5); g.fill(); g.fillStyle = ORG; g.fillRect(-24, -66, 11, 4);
  limb(g, -3, -76, -8, -54 + (s.hit ? -26 : 0), 10, SUIT);
  g.fillStyle = SUIT; rr(g, -14, -82, 28, 40, 9); g.fill(); g.fillStyle = ORG; g.fillRect(-14, -66, 28, 4); g.fillRect(-14, -58, 28, 2.5);
  g.fillStyle = '#1b3b44'; g.beginPath(); g.arc(2, -92, 14, 0, 6.283); g.fill(); g.fillStyle = 'rgba(120,225,255,.65)'; g.beginPath(); g.ellipse(7, -92, 9, 9, 0, 0, 6.283); g.fill(); g.strokeStyle = '#d8f6ff'; g.lineWidth = 2; g.stroke();
  g.fillStyle = SKIN; g.beginPath(); g.arc(7, -91, 5.5, 0, 6.283); g.fill(); g.fillStyle = '#1a2b36'; g.fillRect(4, -92, 8, 2);
  var ex = 14, ey = -58; if (s.act > 0 && s.mv) { var k = s.act === 1 ? 1 : 0.4; ex = 22 + (s.mv.hw > 120 ? 30 : 12) * k; ey = -66; } else if (s.hit) { ex = 8; ey = -94; } else ex = 10 + Math.sin(s.ph) * 5 * s.run;
  limb(g, 7, -72, ex, ey, 9, SUIT); g.fillStyle = SKIN; g.beginPath(); g.arc(ex, ey, 4.5, 0, 6.283); g.fill();
  var hl = s.act === 1 && s.mv && s.mv.hw > 120 ? 150 : 70; g.strokeStyle = '#d8f6ff'; g.lineWidth = 4; g.beginPath(); g.moveTo(ex - 14, ey); g.lineTo(ex + hl - 14, ey); g.stroke(); g.fillStyle = '#4FD8FF'; g.beginPath(); g.moveTo(ex + hl, ey); g.lineTo(ex + hl - 15, ey - 8); g.lineTo(ex + hl - 11, ey); g.lineTo(ex + hl - 15, ey + 8); g.closePath(); g.fill();
};
DRAW.GLITCH = function (g, f, s) {
  var u = 8, seed = Math.floor(f.t / 6), pass, i, j;
  var rows = [' .XXXX. ', 'XXXXXXXX', 'XWXXXXWX', 'XXXXXXXX', ' XXXXXX ', ' XX  XX ', 'XX    XX'];
  var jit = s.hit || f.state === 'dodge' ? 3 : 0;
  for (pass = 0; pass < (LEG ? 1 : 3); pass++) {
    var ox = pass === 0 ? -3 : (pass === 1 ? 3 : 0), col = pass === 0 ? 'rgba(0,255,255,.55)' : (pass === 1 ? 'rgba(255,0,180,.55)' : '#B13DFF');
    for (i = 0; i < rows.length; i++) {
      var row = rows[i], rj = ((seed * 7 + i * 13) % 5 === 0 ? 3 : 0) + (jit ? ((i * 17 + f.t) % 3) : 0);
      for (j = 0; j < 8; j++) {
        var ch = row.charAt(j); if (ch === ' ') continue; if (i >= 5 && s.run > 0.1 && ((j + Math.floor(s.ph * 1.5)) % 2)) continue;
        g.fillStyle = (ch === 'W' && pass === 2) ? '#ffffff' : col; var py = -u * (rows.length - i) - (s.air ? 8 : 0) - 2 + (s.act === 1 ? 0 : 0);
        g.fillRect(-32 + j * u + ox + rj, py, u - 1, u - 1);
      }
    }
  }
  g.fillStyle = '#FF5CF0'; var ax = s.act > 0 ? 24 + 22 * (s.act === 1 ? 1 : 0.3) : 24; g.fillRect(ax - 4, -36, 10, 8); if (s.act > 0) g.fillRect(ax - 14, -34, 12, 5);
  eyeGlow(g, 4, -45, 2.6, '#9CFFF6');
};

/* ---------- HUD ---------- */
function drawHud(g, m, cw, ch, d, t) {
  g.setTransform(d, 0, 0, d, 0, 0); var n = m.fs.length, u = clamp(Math.min(cw / 900, ch / 520), 0.55, 1.15), cwid = cw / n, i, f;
  g.textBaseline = 'alphabetic';
  for (i = 0; i < n; i++) {
    f = m.fs[i]; var x = i * cwid, w = cwid - 6 * u, y = 4 * u, h = 52 * u; if (cw < 500) { h = 46 * u; }
    g.fillStyle = 'rgba(5,8,24,.72)'; rr(g, x + 3 * u, y, w, h, 8 * u); g.fill(); g.strokeStyle = PCOL[f.slot % 4]; g.lineWidth = 2; rr(g, x + 3 * u, y, w, h, 8 * u); g.stroke();
    var heat = clamp(f.pct / 150, 0, 1), pc = 'rgb(255,' + Math.round(255 - heat * 175) + ',' + Math.round(255 - heat * 205) + ')';
    g.fillStyle = f.out ? '#777' : pc; g.font = '900 ' + Math.round(26 * u) + 'px system-ui,Arial,sans-serif'; g.textAlign = 'left'; g.fillText(Math.floor(f.pct) + '%', x + 10 * u, y + 29 * u);
    g.fillStyle = f.def.col; g.font = '800 ' + Math.round(10.5 * u) + 'px system-ui,Arial,sans-serif'; g.fillText((f.isBot ? 'CPU ' : 'P') + (f.isBot ? BOT_LEVELS[f.lvl].charAt(0) : (f.slot + 1)) + ' ' + f.def.name, x + 10 * u, y + 44 * u);
    if (m.cfg.mode === 'stock') { for (var k = 0; k < Math.max(0, f.stocks); k++) { g.fillStyle = f.def.col; g.beginPath(); g.arc(x + w - 10 * u - k * 12 * u, y + 14 * u, 4.5 * u, 0, 6.283); g.fill(); } }
    else { g.fillStyle = '#fff'; g.textAlign = 'right'; g.font = '900 ' + Math.round(18 * u) + 'px system-ui,Arial,sans-serif'; g.fillText(String(f.kos - f.falls), x + w - 6 * u, y + 24 * u); g.textAlign = 'left'; }
    if (f.sh < 100 && f.alive) { g.fillStyle = 'rgba(120,200,255,.8)'; g.fillRect(x + 10 * u, y + h - 5 * u, (w - 20 * u) * f.sh / 100, 2.5 * u); }
  }
  g.textAlign = 'center';
  if (m.cfg.mode === 'timed') { var s = Math.max(0, Math.ceil(m.timeLeft / 60)); g.fillStyle = s <= 10 ? '#FF4D6A' : '#fff'; g.font = '900 ' + Math.round(26 * u) + 'px system-ui,Arial,sans-serif'; g.fillText(Math.floor(s / 60) + ':' + pad2(s % 60), cw / 2, 86 * u); }
  if (m.phase === 'count') { var c = Math.ceil(m.cd / 40); var txt = m.cd > 0 ? String(clamp(c - 1, 1, 3)) : 'GO'; if (m.cd <= 30) txt = 'GO'; g.fillStyle = '#fff'; g.font = '900 ' + Math.round(90 * u) + 'px system-ui,Arial,sans-serif'; g.fillText(txt, cw / 2, ch * 0.45); }
  else if (m.tick < 70) { g.fillStyle = 'rgba(255,255,255,' + (1 - m.tick / 70) + ')'; g.font = '900 ' + Math.round(90 * u) + 'px system-ui,Arial,sans-serif'; g.fillText('GO', cw / 2, ch * 0.45); }
  if (m.sudden) { g.fillStyle = '#FF4D6A'; g.font = '900 ' + Math.round(14 * u) + 'px system-ui,Arial,sans-serif'; g.fillText('SUDDEN DEATH', cw / 2, 80 * u); }
}

/* ---------- main scene ---------- */
function updateCam(cam, m, cw, ch) {
  var minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9, n = 0, i, f;
  for (i = 0; i < m.fs.length; i++) { f = m.fs[i]; if (!f.alive) continue; var b = m.stage.blast; var px = clamp(f.x, b.l, b.r), py = clamp(f.y, b.t, b.b); minx = Math.min(minx, px); maxx = Math.max(maxx, px); miny = Math.min(miny, py - 100); maxy = Math.max(maxy, py); n++; }
  if (!n) { minx = 400; maxx = 1200; miny = 200; maxy = 700; }
  var padX = 300, padY = 230, wx = maxx - minx + padX * 2, wy = maxy - miny + padY * 2 + 80;
  var s = Math.min(cw / wx, ch / wy); s = clamp(s, cw / 2300, Math.max(cw / 1000, ch / 760));
  var tx = (minx + maxx) / 2, ty = (miny + maxy) / 2 + 30;
  if (cam.init) { cam.x = tx; cam.y = ty; cam.s = s; cam.init = false; } else { cam.x += (tx - cam.x) * 0.1; cam.y += (ty - cam.y) * 0.1; cam.s += (s - cam.s) * 0.08; }
}
function drawScene(g, m, cam, cw, ch, d, t, shakeOn) {
  var i, f, p;
  updateCam(cam, m, cw, ch); cam.d = d;
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#000'; g.fillRect(0, 0, cw * d, ch * d);
  drawBg(g, m, cam, cw, ch, t);
  var sh = shakeOn ? m.shake : 0, shx = sh ? (Math.random() - 0.5) * sh : 0, shy = sh ? (Math.random() - 0.5) * sh : 0;
  g.setTransform(cam.s * d, 0, 0, cam.s * d, (cw / 2 - cam.x * cam.s + shx) * d, (ch / 2 - cam.y * cam.s + shy) * d);
  drawBgLive(g, m, t);
  drawStageFront(g, m, t);
  for (i = 0; i < m.items.length; i++) drawItem(g, m.items[i], t);
  for (i = 0; i < m.fs.length; i++) { f = m.fs[i]; if (f.alive) drawFighter(g, f, m, t); }
  for (i = 0; i < m.proj.length; i++) drawProj(g, m.proj[i], t);
  if (!LEG) g.globalCompositeOperation = 'lighter';
  for (i = 0; i < m.parts.length; i++) { p = m.parts[i]; g.globalAlpha = p.l / p.ml; g.fillStyle = p.col; var z = p.sz * (0.4 + 0.6 * p.l / p.ml); g.fillRect(p.x - z / 2, p.y - z / 2, z, z); }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  g.textAlign = 'center'; for (i = 0; i < m.texts.length; i++) { p = m.texts[i]; g.globalAlpha = Math.min(1, p.l / 20); g.fillStyle = p.col; g.font = '900 26px system-ui,Arial,sans-serif'; g.fillText(p.s, p.x, p.y); } g.globalAlpha = 1;
  /* off-screen arrows for fighters outside the view */
  g.setTransform(d, 0, 0, d, 0, 0);
  for (i = 0; i < m.fs.length; i++) {
    f = m.fs[i]; if (!f.alive) continue; var sx = (f.x - cam.x) * cam.s + cw / 2, sy = (f.y - f.def.h / 2 - cam.y) * cam.s + ch / 2;
    if (sx < 0 || sx > cw || sy < 0 || sy > ch) { var ax = clamp(sx, 14, cw - 14), ay = clamp(sy, 70, ch - 14); g.fillStyle = PCOL[f.slot % 4]; g.beginPath(); g.arc(ax, ay, 9, 0, 6.283); g.fill(); g.fillStyle = '#000'; g.font = '900 11px system-ui,Arial,sans-serif'; g.textAlign = 'center'; g.fillText(String(f.slot + 1), ax, ay + 4); }
  }
  if (m.hitFlash > 0 && !LEG) { g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, 0, cw, ch); }
  drawHud(g, m, cw, ch, d, t);
}
/* small stage / fighter previews for menus */
function drawStagePreview(cv, st) {
  var g = cv.getContext('2d'), w = cv.width, h = cv.height; var bg = bgCache[st.id] || (bgCache[st.id] = buildBg(st));
  g.clearRect(0, 0, w, h); g.drawImage(bg, 250, 120, 900, 560, 0, 0, w, h); var s = w / 1600 * 1.05; g.save(); g.translate(w * 0.02, h * 0.08); g.scale(s, s);
  g.fillStyle = hsl(st.hue, 60, 38, 1); var i; for (i = 0; i < st.solids.length; i++) g.fillRect(st.solids[i].x, st.solids[i].y, st.solids[i].w, 60);
  g.fillStyle = hsl(st.hue, 90, 66, 1); for (i = 0; i < st.plats.length; i++) g.fillRect(st.plats[i].x, st.plats[i].y, st.plats[i].w, 14);
  if (st.lava) { g.fillStyle = '#ff4d10'; g.fillRect(0, st.lava, 1600, 120); }
  g.restore();
}
function drawFighterIcon(cv, id, col) {
  var g = cv.getContext('2d'), w = cv.width, h = cv.height, d = fighterById(id);
  g.clearRect(0, 0, w, h); g.save(); var sc = Math.min(w / (d.w + 70), h / (d.h + 30)); g.translate(w / 2 - 4 * sc, h - 4); g.scale(sc, sc);
  var fk = { def: d, state: 'idle', t: 30, vx: 0, vy: 0, face: 1, grounded: true, atk: null, spinT: 0, armorOn: false, hitstun: 0 };
  DRAW[id](g, fk, { ph: 0, run: 0, air: false, ap: -1, act: 0, t: 0, mv: null, hit: false }); g.restore();
}
