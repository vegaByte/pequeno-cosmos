const canvas = document.querySelector('#sky');
const ctx = canvas.getContext('2d', { alpha: false });
const play = document.querySelector('#play');
const welcome = document.querySelector('#welcome');
const soundButton = document.querySelector('#sound');
const colors = ['#70d9ca', '#f18c83', '#f3d987', '#b7a2e4'];
const sprites = [
  ['001000100', '000101000', '001111100', '011111110', '110101011', '111111111', '101000101', '001101100'],
  ['000111000', '001111100', '011111110', '110101011', '111111111', '011111110', '010101010', '100000001'],
  ['001111100', '011111110', '111111111', '110101011', '111111111', '001111100', '011000110', '110000011'],
  ['010000010', '001000100', '011111110', '110101011', '111111111', '101111101', '101000101', '000101000'],
];
const pixels = sprites.map(rows => rows.flatMap((row, y) => [...row].flatMap((v, x) => v === '1' ? [{ x: x - 4, y: y - 3.5 }] : [])));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const MAX_PARTICLES = 256;
const MAX_POINTERS = 10;
const particles = Array.from({ length: MAX_PARTICLES }, () => ({ life: 0 }));
const pointers = new Map();
const aliens = colors.map((color, i) => ({ color, i, x: 0, y: 0, burst: 0, lastHit: -Infinity }));
const stars = Array.from({ length: 65 }, (_, i) => ({ x: ((i * 173 + 31) % 997) / 997, y: ((i * 293 + 77) % 991) / 991, size: i % 7 === 0 ? 3 : 2 }));
let width = 0, height = 0, pixelSize = 9, clock = 0, lastFrame = 0, raf = 0, cursor = 0;
let started = false, paused = document.hidden, frameCount = 0;
let insets = { top: 0, right: 0, bottom: 0, left: 0 };

class Bells {
  constructor() {
    this.context = null;
    this.master = null;
    this.voices = new Set();
    this.lastNote = -Infinity;
    this.muted = false;
    try { this.muted = localStorage.getItem('cosmos-muted') === 'true'; } catch { /* Storage is optional. */ }
  }
  unlock() {
    if (this.muted) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      if (!this.context) {
        this.context = new Audio();
        this.master = this.context.createGain();
        this.master.gain.value = 0.22;
        this.master.connect(this.context.destination);
      }
      if (this.context.state !== 'running') this.context.resume().catch(() => {});
    } catch { /* The visual toy remains usable without audio. */ }
  }
  note(x, y) {
    const audio = this.context;
    if (this.muted || paused || !audio || audio.state !== 'running' || this.voices.size >= 6) return;
    const now = audio.currentTime;
    if (now - this.lastNote < 0.065) return;
    this.lastNote = now;
    const notes = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25];
    const index = Math.max(0, Math.min(notes.length - 1, Math.floor(x / width * notes.length)));
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = notes[index] * (y < height * 0.3 ? 2 : 1);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.17, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    gain.gain.linearRampToValueAtTime(0, now + 0.72);
    oscillator.connect(gain);
    gain.connect(this.master);
    this.voices.add(oscillator);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); this.voices.delete(oscillator); };
    oscillator.start(now);
    oscillator.stop(now + 0.74);
  }
  silence() {
    for (const voice of this.voices) { try { voice.stop(); } catch { /* Already ended. */ } }
    this.voices.clear();
    this.lastNote = -Infinity;
  }
  toggle() {
    this.muted = !this.muted;
    try { localStorage.setItem('cosmos-muted', String(this.muted)); } catch { /* Private browsing can block storage. */ }
    if (this.muted) {
      if (this.master) {
        const now = this.context.currentTime;
        this.master.gain.cancelScheduledValues(now);
        this.master.gain.setTargetAtTime(0, now, 0.015);
      }
    } else {
      this.unlock();
      if (this.master) {
        const now = this.context.currentTime;
        this.master.gain.cancelScheduledValues(now);
        this.master.gain.setTargetAtTime(0.22, now, 0.015);
      }
    }
    updateSoundButton();
  }
}
const bells = new Bells();
function updateSoundButton() {
  soundButton.setAttribute('aria-pressed', String(bells.muted));
  soundButton.setAttribute('aria-label', bells.muted ? 'Activar sonido' : 'Silenciar sonido');
  soundButton.title = soundButton.getAttribute('aria-label');
}
soundButton.addEventListener('click', () => bells.toggle());
updateSoundButton();

function resize() {
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  const ratio = Math.min(devicePixelRatio || 1, 2, Math.sqrt(2500000 / (width * height)));
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.imageSmoothingEnabled = false;
  const safe = getComputedStyle(document.querySelector('#safe-area'));
  insets = { top: parseFloat(safe.paddingTop) || 0, right: parseFloat(safe.paddingRight) || 0, bottom: parseFloat(safe.paddingBottom) || 0, left: parseFloat(safe.paddingLeft) || 0 };
  pixelSize = Math.max(5, Math.min(12, Math.min(width, height) / 43));
  clearPointers();
  for (const particle of particles) particle.life = 0;
  positionAliens();
  draw();
}
function positionAliens() {
  const landscape = width > height * 1.15;
  const locations = landscape ? [[0.17, 0.34], [0.39, 0.65], [0.62, 0.3], [0.83, 0.67]] : [[0.25, 0.18], [0.73, 0.4], [0.28, 0.65], [0.73, 0.85]];
  const margin = pixelSize * 5.7;
  const left = insets.left + margin, right = width - insets.right - margin;
  const top = insets.top + 77 + margin, bottom = height - insets.bottom - margin - 12;
  aliens.forEach((alien, i) => {
    const drift = reducedMotion.matches ? 0 : Math.sin(clock * 0.65 + i * 1.7) * 7;
    alien.x = left + locations[i][0] * Math.max(0, right - left) + drift;
    alien.y = top + locations[i][1] * Math.max(0, bottom - top) + (reducedMotion.matches ? 0 : Math.cos(clock * 0.7 + i) * 9);
  });
}
function addParticle(x, y, vx, vy, color, size, life, star = false) {
  const particle = particles[cursor];
  cursor = (cursor + 1) % MAX_PARTICLES;
  Object.assign(particle, { x, y, vx, vy, color, size, life, maxLife: life, star });
}
function flower(x, y) {
  const count = reducedMotion.matches ? 6 : 12;
  for (let i = 0; i < count; i++) {
    const angle = i * Math.PI * 2 / count;
    const speed = reducedMotion.matches ? 13 : 37 + (i % 2) * 20;
    addParticle(x + Math.cos(angle) * 6, y + Math.sin(angle) * 6, Math.cos(angle) * speed, Math.sin(angle) * speed, colors[i % 4], 4 + i % 3, 1.4, true);
  }
}
function hit(x, y) {
  const alien = aliens.find(a => Math.abs(x - a.x) < pixelSize * 5.7 && Math.abs(y - a.y) < pixelSize * 5.2);
  if (!alien) return false;
  if (clock - alien.lastHit > 0.28) {
    alien.lastHit = clock;
    // Repeated tapping changes color without restarting the return animation.
    if (alien.burst === 0) alien.burst = 0.001;
    alien.color = colors[(colors.indexOf(alien.color) + 1) % colors.length];
  }
  return true;
}
function point(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}
canvas.addEventListener('pointerdown', event => {
  if (!started || paused || (event.pointerType === 'mouse' && event.button !== 0) || pointers.size >= MAX_POINTERS) return;
  event.preventDefault();
  bells.unlock();
  const { x, y } = point(event);
  pointers.set(event.pointerId, { x, y, lastTrail: clock, lastNote: clock });
  try { canvas.setPointerCapture(event.pointerId); } catch { /* Synthetic events do not own a native pointer. */ }
  if (!hit(x, y)) flower(x, y);
  bells.note(x, y);
});
canvas.addEventListener('pointermove', event => {
  const pointer = pointers.get(event.pointerId);
  if (!pointer || paused) return;
  event.preventDefault();
  const { x, y } = point(event);
  const distance = Math.hypot(x - pointer.x, y - pointer.y);
  if (distance < 4 || clock - pointer.lastTrail < 0.025) return;
  const steps = Math.min(8, Math.ceil(distance / 10));
  for (let i = 1; i <= steps; i++) {
    addParticle(pointer.x + (x - pointer.x) * i / steps, pointer.y + (y - pointer.y) * i / steps, Math.random() * 10 - 5, -8, colors[(cursor + i) % 4], 3 + i % 4, 0.9, i % 3 === 0);
  }
  hit(x, y);
  if (clock - pointer.lastNote >= 0.14) { bells.note(x, y); pointer.lastNote = clock; }
  pointer.x = x;
  pointer.y = y;
  pointer.lastTrail = clock;
});
function endPointer(event) { pointers.delete(event.pointerId); }
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(name, endPointer);
function clearPointers() {
  for (const id of pointers.keys()) {
    try { if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id); } catch { /* Pointer already ended. */ }
  }
  pointers.clear();
}
// iOS Safari gesture events supplement touch-action for pinch gestures.
for (const name of ['gesturestart', 'gesturechange']) canvas.addEventListener(name, event => event.preventDefault(), { passive: false });

function drawStar(x, y, size) {
  ctx.fillRect(Math.round(x - size / 2), Math.round(y - size * 1.5), size, size * 3);
  ctx.fillRect(Math.round(x - size * 1.5), Math.round(y - size / 2), size * 3, size);
}
function draw() {
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#0b1120';
  ctx.fillRect(0, 0, width, height);
  for (const [i, star] of stars.entries()) {
    ctx.fillStyle = i % 7 === 0 ? '#64718a' : '#2b3850';
    if (i % 13 === 0) drawStar(star.x * width, star.y * height, 2);
    else ctx.fillRect(Math.round(star.x * width), Math.round(star.y * height), star.size, star.size);
  }
  for (const alien of aliens) {
    const progress = alien.burst / 1.8;
    const scatter = Math.sin(Math.min(progress, 1) * Math.PI) * (reducedMotion.matches ? 7 : pixelSize * 4.5);
    const dance = reducedMotion.matches ? 0 : Math.sin(progress * Math.PI * 4) * scatter * 0.14;
    ctx.fillStyle = alien.color;
    for (const [i, p] of pixels[alien.i].entries()) {
      const x = alien.x + p.x * pixelSize + Math.sin(i * 7.3) * scatter + dance;
      const y = alien.y + p.y * pixelSize + Math.cos(i * 4.1) * scatter;
      ctx.fillRect(Math.round(x - pixelSize / 2), Math.round(y - pixelSize / 2), Math.ceil(pixelSize) - 1, Math.ceil(pixelSize) - 1);
    }
  }
  for (const particle of particles) {
    if (particle.life <= 0) continue;
    ctx.globalAlpha = Math.min(1, particle.life / 0.5);
    ctx.fillStyle = particle.color;
    const size = Math.max(2, Math.round(particle.size * (0.6 + 0.4 * particle.life / particle.maxLife)));
    if (particle.star) drawStar(particle.x, particle.y, size / 2);
    else ctx.fillRect(Math.round(particle.x), Math.round(particle.y), size, size);
  }
  ctx.globalAlpha = 1;
}
function frame(now) {
  if (paused) return;
  const delta = lastFrame ? Math.min((now - lastFrame) / 1000, 0.05) : 0;
  lastFrame = now;
  clock += delta;
  frameCount++;
  positionAliens();
  for (const alien of aliens) {
    if (alien.burst > 0) { alien.burst += delta; if (alien.burst >= 1.8) alien.burst = 0; }
  }
  for (const particle of particles) {
    if (particle.life <= 0) continue;
    particle.life -= delta;
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
  }
  draw();
  raf = requestAnimationFrame(frame);
}
function pause() {
  paused = true;
  cancelAnimationFrame(raf);
  clearPointers();
  bells.silence();
  if (bells.context && bells.context.state !== 'closed') bells.context.suspend().catch(() => {});
}
function resume() {
  if (document.hidden) return;
  paused = false;
  lastFrame = 0;
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(frame);
  if (started) bells.unlock();
}
play.addEventListener('click', () => {
  bells.unlock();
  started = true;
  welcome.hidden = true;
  soundButton.focus({ preventScroll: true });
  flower(width / 2, height / 2);
});
document.addEventListener('visibilitychange', () => document.hidden ? pause() : resume());
window.addEventListener('pagehide', pause);
window.addEventListener('pageshow', resume);
window.addEventListener('blur', clearPointers);
window.addEventListener('resize', resize);
window.visualViewport?.addEventListener('resize', resize);
resize();
resume();
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(error => console.warn('El modo sin conexión no está disponible:', error.message));
}

// Read-only diagnostics, enabled explicitly for browser verification.
if (new URLSearchParams(location.search).has('qa')) {
  Object.defineProperty(window, 'cosmosQA', { get: () => ({ started, paused, frameCount, clock,
    particles: particles.filter(p => p.life > 0).length, particleCapacity: particles.length,
    pointers: pointers.size, voices: bells.voices.size, audioState: bells.context?.state || 'uninitialized', muted: bells.muted,
    width, height, backingWidth: canvas.width, backingHeight: canvas.height,
    aliens: aliens.map(({ x, y, color, burst }) => ({ x, y, color, burst })) }) });
}
