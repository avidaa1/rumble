/* RUMBLE audio: everything synthesized with WebAudio (oscillators + noise). No samples, no files. */
var AU = { ctx: null, master: null, mus: null, sfx: null, vol: 0.7, music: 0.6, sfxv: 0.8, track: null, timer: 0, step: 0, next: 0, nodes: 0, noiseBuf: null, lat: null, want: 'menu', on: true };
function auInit(evt) {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') try { AU.ctx.resume(); } catch (e) {} return; }
  var C = window.AudioContext || window.webkitAudioContext; if (!C) return;
  var t0 = (evt && evt.timeStamp) ? evt.timeStamp : performance.now(), tH = performance.now();
  try { AU.ctx = new C({ latencyHint: 'interactive' }); } catch (e) { try { AU.ctx = new C(); } catch (e2) { return; } }
  var c = AU.ctx; try { c.resume(); } catch (e3) {}
  AU.master = c.createGain(); AU.mus = c.createGain(); AU.sfx = c.createGain();
  var comp = c.createDynamicsCompressor ? c.createDynamicsCompressor() : null;
  AU.mus.connect(AU.master); AU.sfx.connect(AU.master); if (comp) { AU.master.connect(comp); comp.connect(c.destination); } else AU.master.connect(c.destination);
  auVol();
  var nb = c.createBuffer(1, c.sampleRate, c.sampleRate), d = nb.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; AU.noiseBuf = nb;
  sfxPlay('ui_ok');
  var tS = performance.now(), base = (c.baseLatency || 0) * 1000, out = (c.outputLatency || 0) * 1000;
  AU.lat = { inputToSchedule: +(tS - t0).toFixed(1), handlerOnly: +(tS - tH).toFixed(1), baseLatency: +base.toFixed(1), outputLatency: +out.toFixed(1), estAudible: +(tS - t0 + base + out).toFixed(1), state: c.state };
  if (c.state === 'running' || true) auMusic(AU.want);
  c.onstatechange = function () { if (AU.lat) AU.lat.state = c.state; };
}
function auVol() { if (!AU.ctx) return; AU.master.gain.value = AU.on ? AU.vol : 0; AU.mus.gain.value = AU.music * 0.5; AU.sfx.gain.value = AU.sfxv; }
function tone(type, f0, f1, dur, vol, delay, dest) {
  var c = AU.ctx; if (!c || AU.nodes > 48) return; var t = c.currentTime + (delay || 0) + 0.005, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest || AU.sfx); o.start(t); o.stop(t + dur + 0.03); AU.nodes++; o.onended = function () { AU.nodes--; };
}
function noise(dur, vol, fq, q, delay, ftype, dest, f1) {
  var c = AU.ctx; if (!c || AU.nodes > 48) return; var t = c.currentTime + (delay || 0) + 0.005, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
  s.buffer = AU.noiseBuf; s.loop = true; fl.type = ftype || 'bandpass'; fl.frequency.setValueAtTime(fq, t); if (f1) fl.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur); fl.Q.value = q || 1;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl); fl.connect(g); g.connect(dest || AU.sfx); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.03); AU.nodes++; s.onended = function () { AU.nodes--; };
}
var SFXLAST = {};
function sfxPlay(n) {
  if (!AU.ctx || AU.ctx.state !== 'running' && AU.ctx.state !== 'suspended') return;
  var now = performance.now(); if (SFXLAST[n] && now - SFXLAST[n] < 40) return; SFXLAST[n] = now;
  switch (n) {
    case 'ui': tone('square', 660, 880, 0.05, 0.12); break;
    case 'ui_ok': tone('triangle', 520, 520, 0.07, 0.22); tone('triangle', 780, 780, 0.1, 0.2, 0.05); tone('sine', 1170, 1170, 0.14, 0.12, 0.09); break;
    case 'ui_back': tone('triangle', 520, 330, 0.12, 0.18); break;
    case 'jump': tone('square', 260, 520, 0.11, 0.09); break;
    case 'djump': tone('square', 380, 760, 0.12, 0.09); noise(0.08, 0.05, 3000, 1, 0, 'highpass'); break;
    case 'whoosh': noise(0.12, 0.1, 900, 0.8, 0, 'bandpass', null, 2600); break;
    case 'heavy_wind': noise(0.2, 0.14, 500, 0.7, 0, 'bandpass', null, 1800); tone('sawtooth', 120, 220, 0.16, 0.05); break;
    case 'hit_l': noise(0.07, 0.22, 1800, 1.2); tone('sine', 220, 110, 0.09, 0.22); break;
    case 'hit_m': noise(0.1, 0.3, 1400, 1); tone('sine', 180, 70, 0.14, 0.32); tone('square', 120, 60, 0.08, 0.1); break;
    case 'hit_h': noise(0.2, 0.42, 900, 0.8); tone('sine', 140, 40, 0.28, 0.5); tone('sawtooth', 200, 50, 0.18, 0.15); break;
    case 'shoot': tone('sawtooth', 900, 300, 0.14, 0.1); break;
    case 'zap': tone('square', 1400, 500, 0.1, 0.1); tone('square', 1800, 700, 0.08, 0.07, 0.03); break;
    case 'rise': tone('triangle', 200, 700, 0.25, 0.15); noise(0.2, 0.08, 1200, 1, 0, 'bandpass', null, 3000); break;
    case 'spin': tone('sawtooth', 160, 240, 0.4, 0.09); noise(0.4, 0.07, 700, 0.6); break;
    case 'blink': tone('square', 1500, 300, 0.09, 0.12); tone('square', 300, 1500, 0.09, 0.08, 0.06); break;
    case 'bubble': tone('sine', 400, 900, 0.12, 0.18); tone('sine', 600, 1300, 0.1, 0.12, 0.07); break;
    case 'bubblepop': tone('sine', 1200, 300, 0.1, 0.2); noise(0.05, 0.12, 4000, 1, 0, 'highpass'); break;
    case 'shieldhit': tone('triangle', 700, 500, 0.1, 0.18); break;
    case 'shieldbreak': noise(0.4, 0.3, 2400, 0.6, 0, 'bandpass', null, 400); tone('sawtooth', 600, 80, 0.4, 0.2); break;
    case 'armor': tone('square', 200, 150, 0.08, 0.2); noise(0.06, 0.2, 2000, 2); break;
    case 'dodge': noise(0.14, 0.1, 1500, 0.6, 0, 'bandpass', null, 500); break;
    case 'ko': noise(0.7, 0.4, 600, 0.5, 0, 'lowpass', null, 100); tone('sawtooth', 300, 40, 0.7, 0.35); tone('sine', 1200, 200, 0.5, 0.15, 0.05); break;
    case 'respawn': tone('triangle', 300, 900, 0.3, 0.14); break;
    case 'item': tone('triangle', 660, 660, 0.07, 0.18); tone('triangle', 990, 990, 0.07, 0.18, 0.06); tone('triangle', 1320, 1320, 0.12, 0.16, 0.12); break;
    case 'itemdrop': tone('sine', 900, 500, 0.2, 0.1); break;
    case 'bomb': noise(0.5, 0.5, 500, 0.5, 0, 'lowpass', null, 80); tone('sine', 120, 30, 0.5, 0.6); break;
    case 'throw': tone('sawtooth', 300, 200, 0.1, 0.1); break;
    case 'warn': tone('square', 900, 900, 0.08, 0.1); tone('square', 900, 900, 0.08, 0.1, 0.14); break;
    case 'beam': noise(0.4, 0.25, 3000, 0.5, 0, 'bandpass', null, 600); tone('sawtooth', 1000, 100, 0.3, 0.15); break;
    case 'jet': noise(0.5, 0.3, 700, 0.5, 0, 'lowpass', null, 300); tone('sawtooth', 90, 60, 0.4, 0.2); break;
    case 'wind': noise(1.2, 0.12, 700, 0.5, 0, 'bandpass', null, 1400); break;
    case 'lava': noise(0.3, 0.2, 800, 1, 0, 'lowpass'); tone('sine', 200, 80, 0.3, 0.3); break;
    case 'count': tone('square', 440, 440, 0.15, 0.16); break;
    case 'go': tone('square', 880, 880, 0.3, 0.18); tone('square', 1320, 1320, 0.3, 0.1); break;
    case 'win': tone('triangle', 523, 523, 0.2, 0.2); tone('triangle', 659, 659, 0.2, 0.2, 0.15); tone('triangle', 784, 784, 0.2, 0.2, 0.3); tone('triangle', 1046, 1046, 0.5, 0.22, 0.45); break;
  }
}
window.RSFX = sfxPlay;

/* ---------- music: tiny step sequencer, scheduled ahead of time ---------- */
function mf(n) { return 440 * Math.pow(2, (n - 69) / 12); }
var TRACKS = {
  menu: { bpm: 84, root: 57, sc: [0, 3, 5, 7, 10], bass: [0, -1, -1, 0, -1, -1, 3, -1, 0, -1, -1, 0, -1, 5, -1, -1], lead: [7, -1, 5, -1, 3, -1, 5, 7, -1, 10, -1, 7, 5, -1, 3, -1], drums: 'k...h...s...h...', wave: 'sine', pad: true },
  yard: { bpm: 126, root: 45, sc: [0, 3, 5, 7, 10], bass: [0, -1, 0, 0, -1, 0, 3, -1, 0, -1, 0, 0, -1, 5, 3, -1], lead: [12, 10, 7, 10, 12, 10, 7, 5, 12, 10, 7, 10, 15, 12, 10, 7], drums: 'k.h.s.hkk.h.s.hk', wave: 'square' },
  reef: { bpm: 96, root: 50, sc: [0, 2, 4, 6, 7, 9, 11], bass: [0, -1, -1, 0, 4, -1, -1, 4, 0, -1, -1, 0, 7, -1, 4, -1], lead: [14, -1, 11, -1, 9, 11, -1, 14, 16, -1, 14, -1, 11, -1, 9, -1], drums: 'k..hs..hk.h.s..h', wave: 'sine' },
  rail: { bpm: 140, root: 43, sc: [0, 2, 3, 5, 7, 8, 10], bass: [0, 0, -1, 0, 0, -1, 7, -1, 0, 0, -1, 0, 5, -1, 3, -1], lead: [12, -1, 15, 12, -1, 10, 12, -1, 15, -1, 17, 15, 12, -1, 10, -1], drums: 'khshkhshkhshkssh', wave: 'sawtooth' },
  forge: { bpm: 104, root: 40, sc: [0, 1, 4, 5, 7, 8, 10], bass: [0, -1, 0, -1, 0, -1, 1, -1, 0, -1, 0, -1, 7, -1, 5, 1], lead: [-1, 12, -1, -1, 13, -1, 12, -1, -1, 16, -1, 13, 12, -1, -1, 8], drums: 'k...s..kk..ks...', wave: 'sawtooth' }
};
function auMusic(name) {
  AU.want = name; if (!AU.ctx) return; var tr = TRACKS[name]; if (!tr) return;
  if (AU.track === tr) return;
  AU.track = tr; AU.step = 0; AU.next = AU.ctx.currentTime + 0.06;
  if (!AU.timer) AU.timer = setInterval(auPump, 30);
}
function auStop() { AU.track = null; }
function auPump() {
  var c = AU.ctx, tr = AU.track; if (!c || !tr || c.state !== 'running') { if (c && tr && c.state !== 'running') AU.next = c.currentTime + 0.06; return; }
  var sd = 60 / tr.bpm / 4;
  while (AU.next < c.currentTime + 0.14) {
    var i = AU.step % 16, t = AU.next - c.currentTime; if (t < 0) t = 0;
    var b = tr.bass[i]; if (b >= 0) tone(tr.wave === 'sine' ? 'triangle' : 'sawtooth', mf(tr.root + b), mf(tr.root + b), sd * 1.7, 0.5, t, AU.mus);
    var l = tr.lead[i]; if (l >= 0 && (AU.step % 64) >= 16 || (l >= 0 && tr === TRACKS.menu)) tone(tr.wave === 'sawtooth' ? 'square' : tr.wave, mf(tr.root + 12 + l), 0, sd * 1.4, 0.22, t, AU.mus);
    var dch = tr.drums.charAt(i);
    if (dch === 'k') { tone('sine', 150, 45, 0.14, 0.9, t, AU.mus); }
    else if (dch === 's') { noise(0.12, 0.35, 1800, 0.8, t, 'bandpass', AU.mus); tone('triangle', 210, 140, 0.08, 0.2, t, AU.mus); }
    else if (dch === 'h') { noise(0.04, 0.16, 7000, 1, t, 'highpass', AU.mus); }
    if (tr.pad && i === 0 && (AU.step % 32) === 0) { tone('sine', mf(tr.root), mf(tr.root), sd * 30, 0.2, t, AU.mus); tone('sine', mf(tr.root + 7), mf(tr.root + 7), sd * 30, 0.14, t, AU.mus); tone('sine', mf(tr.root + 12 + 3), mf(tr.root + 15), sd * 30, 0.1, t, AU.mus); }
    AU.next += sd; AU.step++;
  }
}
