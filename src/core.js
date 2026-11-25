/* RUMBLE core: util, fighters, arenas. ES5 only (the same source feeds index.html and legacy.html). */
var LEG = !!window.RUMBLE_LEGACY;
var DT = 1 / 60;
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function sgn(v) { return v < 0 ? -1 : (v > 0 ? 1 : 0); }
function lerp(a, b, t) { return a + (b - a) * t; }
function ov(ax, ay, aw, ah, bx, by, bw, bh) { return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by; }
function pad2(n) { return (n < 10 ? '0' : '') + n; }
function RNG(seed) { this.s = (seed >>> 0) || 1; }
RNG.prototype.next = function () { var x = this.s; x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; this.s = x; return x / 4294967296; };
RNG.prototype.range = function (a, b) { return a + (b - a) * this.next(); };
RNG.prototype.int = function (n) { return Math.floor(this.next() * n); };
function hsl(h, s, l, a) { return 'hsla(' + (((h % 360) + 360) % 360).toFixed(0) + ',' + s + '%,' + l + '%,' + (a === undefined ? 1 : a) + ')'; }

/* ---------- moves ---------- */
function M(su, ac, rc, hx, hy, hw, hh, dmg, base, grow, ang, o) {
  var m = { su: su, ac: ac, rc: rc, hx: hx, hy: hy, hw: hw, hh: hh, dmg: dmg, base: base, grow: grow, ang: ang, kind: 'melee' };
  if (o) for (var k in o) if (o.hasOwnProperty(k)) m[k] = o[k];
  return m;
}
function P(o) { return o; }

var FIGHTERS = [
  { id: 'IO', name: 'IO', tag: 'Code blade', desc: 'Balanced. Glyph beam, rising stack slash.', col: '#B4FF3C', w: 50, h: 98, run: 540, jump: 930, djump: 860, weight: 1.0,
    light: [M(3, 3, 9, 14, -78, 82, 44, 4, 160, 1.4, 22, { lunge: 120 }), M(3, 3, 9, 14, -70, 86, 46, 4, 170, 1.4, 20, { lunge: 120 }), M(4, 4, 17, 14, -82, 108, 64, 6.5, 330, 3.2, 38, { lunge: 160 })],
    heavy: M(17, 5, 26, 6, -128, 116, 126, 15, 430, 6.4, 46, { lunge: 170, name: 'Overwrite' }),
    spN: M(10, 0, 16, 0, 0, 0, 0, 0, 0, 0, 0, { kind: 'proj', name: 'Compile', proj: P({ sp: 820, life: 52, w: 54, h: 22, dmg: 5, base: 230, grow: 2.2, ang: 14, sy: -68, look: 'glyph' }) }),
    spU: M(5, 16, 18, -6, -140, 76, 140, 7, 320, 3.8, 80, { kind: 'rise', vy: -990, vx: 150, name: 'Stack Slash' }) },
  { id: 'VIDA', name: 'VIDA', tag: 'Pulse waves', desc: 'Light and agile. Wide slow pulse wave, lift.', col: '#3DF2B0', w: 46, h: 94, run: 610, jump: 990, djump: 920, weight: 0.84,
    light: [M(2, 2, 7, 12, -66, 58, 38, 2.6, 120, 0.9, 30, { lunge: 90 }), M(2, 2, 7, 12, -64, 62, 38, 2.6, 130, 0.9, 30, { lunge: 90 }), M(3, 3, 14, 12, -70, 74, 52, 4.5, 280, 2.6, 42, { lunge: 120 })],
    heavy: M(11, 4, 20, 10, -90, 96, 78, 11, 380, 5.6, 40, { lunge: 100, name: 'Pulse Palm' }),
    spN: M(12, 0, 20, 0, 0, 0, 0, 0, 0, 0, 0, { kind: 'proj', name: 'Pulse Wave', proj: P({ sp: 400, life: 80, w: 58, h: 118, dmg: 6, base: 270, grow: 3, ang: 24, sy: -62, look: 'wave', pierce: true }) }),
    spU: M(5, 18, 20, -6, -130, 70, 130, 4, 280, 2.4, 85, { kind: 'rise', vy: -1060, vx: 240, name: 'Lift' }) },
  { id: 'TORTUGA', name: 'TORTUGA', tag: 'Shell mech', desc: 'Heavy armour. Slam has armour frames, shell spin.', col: '#FFC24A', w: 84, h: 92, run: 410, jump: 820, djump: 720, weight: 1.38,
    light: [M(5, 3, 12, 22, -64, 86, 54, 5.5, 230, 2.4, 34, { lunge: 70 }), M(5, 3, 12, 22, -60, 90, 54, 5.5, 240, 2.4, 34, { lunge: 70 }), M(6, 4, 20, 22, -70, 104, 66, 8, 380, 4, 42, { lunge: 90 })],
    heavy: M(22, 6, 34, 16, -96, 136, 98, 18, 460, 7.4, 52, { lunge: 60, armor: [8, 22], name: 'Shell Slam' }),
    spN: M(8, 36, 22, -14, -94, 116, 96, 3, 200, 1.4, 38, { kind: 'spin', sp: 640, rehit: 9, name: 'Shell Spin' }),
    spU: M(8, 26, 20, -26, -110, 100, 108, 4, 300, 2.8, 80, { kind: 'rise', vy: -830, vx: 120, name: 'Jet Spin' }) },
  { id: 'SPARKPLUG', name: 'SPARKPLUG', tag: 'Battery bot', desc: 'Quick zaps. Discharge blast, arc jump.', col: '#FFEB3B', w: 56, h: 88, run: 590, jump: 920, djump: 850, weight: 0.96,
    light: [M(2, 3, 8, 14, -62, 70, 36, 3, 140, 1.1, 24, { lunge: 100 }), M(2, 3, 8, 14, -60, 72, 36, 3, 150, 1.1, 24, { lunge: 100 }), M(3, 4, 15, 14, -64, 84, 46, 5, 300, 2.8, 36, { lunge: 120 })],
    heavy: M(14, 6, 24, -76, -118, 152, 134, 12, 390, 5.2, 60, { kind: 'burst', name: 'Discharge' }),
    spN: M(7, 0, 12, 0, 0, 0, 0, 0, 0, 0, 0, { kind: 'proj', name: 'Zap Bolt', proj: P({ sp: 1150, life: 34, w: 40, h: 18, dmg: 4, base: 170, grow: 1.6, ang: 6, sy: -60, look: 'zap', stun: 8 }) }),
    spU: M(5, 18, 18, -4, -120, 72, 120, 5, 280, 2.6, 80, { kind: 'rise', vy: -960, vx: 330, name: 'Arc Jump' }) },
  { id: 'CORAL', name: 'CORAL', tag: 'Reef diver', desc: 'Long harpoon. Down+special bubble shield.', col: '#4FD8FF', w: 50, h: 100, run: 530, jump: 920, djump: 830, weight: 1.0,
    light: [M(4, 3, 8, 16, -64, 74, 34, 3.5, 150, 1.4, 26, { lunge: 90 }), M(4, 3, 8, 16, -62, 74, 34, 3.5, 160, 1.4, 26, { lunge: 90 }), M(5, 4, 16, 16, -66, 96, 44, 5.5, 320, 3, 38, { lunge: 120 })],
    heavy: M(14, 6, 24, 28, -66, 158, 38, 13, 400, 6, 30, { lunge: 60, name: 'Harpoon' }),
    spN: M(9, 0, 18, 0, 0, 0, 0, 0, 0, 0, 0, { kind: 'proj', name: 'Harpoon Shot', proj: P({ sp: 1050, life: 46, w: 66, h: 14, dmg: 8, base: 340, grow: 4, ang: 18, sy: -66, look: 'harpoon' }) }),
    spD: M(6, 0, 14, 0, 0, 0, 0, 0, 0, 0, 0, { kind: 'bubble', name: 'Bubble Shield' }),
    spU: M(5, 18, 20, -6, -130, 70, 128, 5, 300, 2.8, 70, { kind: 'rise', vy: -920, vx: 430, name: 'Jet Fins' }) },
  { id: 'GLITCH', name: 'GLITCH', tag: 'Pixel blinker', desc: 'Small and fast. Special blinks in any direction.', col: '#FF5CF0', w: 44, h: 72, run: 640, jump: 950, djump: 910, weight: 0.8,
    light: [M(2, 2, 6, 10, -52, 56, 32, 2.2, 130, 1, 28, { lunge: 90 }), M(2, 2, 6, 10, -50, 58, 32, 2.2, 140, 1, 28, { lunge: 90 }), M(3, 3, 13, 10, -54, 68, 42, 4, 280, 2.6, 40, { lunge: 120 })],
    heavy: M(12, 14, 20, 24, -64, 78, 64, 10, 340, 5, 40, { name: 'Corrupt Block' }),
    spN: M(4, 5, 10, -34, -78, 68, 78, 3, 200, 1.6, 60, { kind: 'blink', dist: 230, name: 'Blink' }),
    spU: M(4, 5, 10, -34, -78, 68, 78, 3, 200, 1.6, 60, { kind: 'blink', dist: 240, up: true, name: 'Blink Up' }) }
];
function fighterById(id) { for (var i = 0; i < FIGHTERS.length; i++) if (FIGHTERS[i].id === id) return FIGHTERS[i]; return FIGHTERS[0]; }
/* heavy with up held: shared anti-air variant, built from the fighter's own heavy */
(function () {
  for (var i = 0; i < FIGHTERS.length; i++) {
    var h = FIGHTERS[i].heavy, f = FIGHTERS[i];
    var u = M(h.su + 3, h.ac + 1, h.rc + 2, -46, -f.h - 52, 92, 120, h.dmg * 0.9, h.base * 0.95, h.grow * 0.95, 88, { name: h.name + ' Up' });
    if (h.kind === 'burst') { u.hx = h.hx; u.hy = h.hy - 20; u.hw = h.hw; u.hh = h.hh; u.kind = 'burst'; u.ang = 85; }
    f.heavyU = u;
  }
})();

var ITEMS = [
  { id: 'patch', name: 'Patch Kit', col: '#7CFF6B', w: 2, desc: 'heals 30%' },
  { id: 'clock', name: 'Overclock', col: '#FFD93D', w: 2, desc: 'faster' },
  { id: 'bulwark', name: 'Bulwark Core', col: '#5BC0FF', w: 2, desc: 'takes less' },
  { id: 'feather', name: 'Featherlight', col: '#E7A8FF', w: 2, desc: 'low gravity' },
  { id: 'static', name: 'Static Orb', col: '#FF8C3D', w: 2, desc: '3 charged hits' },
  { id: 'bomb', name: 'Hot Cell', col: '#FF4D6A', w: 2, desc: 'throw it before it pops' }
];

/* ---------- arenas ---------- */
var STAGES = [
  { id: 'yard', name: 'Circuit Yard', blurb: 'Server roofs. Scan beams sweep down.', hue: 130,
    solids: [{ x: 330, y: 640, w: 940, h: 240 }],
    plats: [{ x: 440, y: 505, w: 250 }, { x: 910, y: 505, w: 250 }, { x: 675, y: 370, w: 250 }],
    spawn: [{ x: 470, y: 640 }, { x: 680, y: 640 }, { x: 920, y: 640 }, { x: 1130, y: 640 }], respawn: [800, 800, 800, 800],
    blast: { l: -380, r: 1980, t: -540, b: 1160 }, view: { x: 800, y: 420 },
    hz: [{ t: 'beam', gap: 330, warn: 70, fire: 22, w: 78, xr: [380, 1220] }] },
  { id: 'reef', name: 'Reef Terrace', blurb: 'Stepped coral. Tidal currents lift you.', hue: 195,
    solids: [{ x: 540, y: 650, w: 520, h: 230 }],
    plats: [{ x: 210, y: 560, w: 260 }, { x: 1130, y: 560, w: 260 }, { x: 660, y: 450, w: 280 }, { x: 405, y: 400, w: 190 }, { x: 1005, y: 400, w: 190 }],
    spawn: [{ x: 600, y: 650 }, { x: 740, y: 650 }, { x: 860, y: 650 }, { x: 1000, y: 650 }], respawn: [800, 800, 800, 800],
    blast: { l: -380, r: 1980, t: -540, b: 1160 }, view: { x: 800, y: 420 },
    hz: [{ t: 'current', x: 180, w: 250, y0: 160, y1: 660, on: 240, off: 200, ph: 0 }, { t: 'current', x: 1170, w: 250, y0: 160, y1: 660, on: 240, off: 200, ph: 220 }] },
  { id: 'rail', name: 'Rooftop Rail', blurb: 'Two roofs, a pit and a tram. Wind gusts.', hue: 320,
    solids: [{ x: 230, y: 620, w: 470, h: 260 }, { x: 900, y: 620, w: 470, h: 260 }],
    plats: [{ x: 330, y: 470, w: 200 }, { x: 1070, y: 470, w: 200 }, { x: 660, y: 430, w: 190, move: { x0: 640, x1: 960, per: 420, y: 430 } }],
    spawn: [{ x: 330, y: 620 }, { x: 600, y: 620 }, { x: 1000, y: 620 }, { x: 1270, y: 620 }], respawn: [450, 1150, 540, 1060],
    blast: { l: -380, r: 1980, t: -540, b: 1160 }, view: { x: 800, y: 420 },
    hz: [{ t: 'wind', gap: 520, dur: 200, force: 1500 }] },
  { id: 'forge', name: 'Meltdown Forge', blurb: 'Two islands over lava. Fire jets erupt.', hue: 18,
    solids: [{ x: 250, y: 610, w: 420, h: 150 }, { x: 930, y: 610, w: 420, h: 150 }],
    plats: [{ x: 700, y: 520, w: 200 }, { x: 665, y: 380, w: 270 }, { x: 330, y: 440, w: 160 }, { x: 1110, y: 440, w: 160 }],
    spawn: [{ x: 330, y: 610 }, { x: 560, y: 610 }, { x: 1040, y: 610 }, { x: 1270, y: 610 }], respawn: [420, 1180, 520, 1080],
    blast: { l: -380, r: 1980, t: -540, b: 1160 }, view: { x: 800, y: 420 }, lava: 820,
    hz: [{ t: 'jet', xs: [800, 460, 1140], warn: 62, fire: 34, gap: 250, w: 92, top: 380 }] }
];
function stageById(id) { for (var i = 0; i < STAGES.length; i++) if (STAGES[i].id === id) return STAGES[i]; return STAGES[0]; }
var BOT_LEVELS = ['Easy', 'Normal', 'Hard', 'Expert'];
var PCOL = ['#3DA5FF', '#FF4D6A', '#FFD93D', '#B15CFF'];
