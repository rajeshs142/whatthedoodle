// ── SOUND SYSTEM ─────────────────────────────────────────────────────────
// Web Audio API — procedural, no audio files needed.
// CONFIG.sounds: 'off' | 'minimal' | 'full'
// User toggle: localStorage 'qg_sounds' = '1' (on) or '0' (off), default on.

let _audioCtx = null;

function _ctx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && _audioCtx) _audioCtx.suspend();
});

function _soundEnabled(fullOnly) {
  if (CONFIG.sounds === 'off') return false;
  if (fullOnly && CONFIG.sounds === 'minimal') return false;
  return localStorage.getItem('qg_sounds') !== '0';
}

function _play(fn) {
  try {
    const ctx = _ctx();
    if (ctx.state === 'suspended') ctx.resume().then(() => fn(ctx));
    else fn(ctx);
  } catch(e) {}
}

function applySoundsToggle() {
  const on = document.getElementById('cfg-sounds').checked;
  localStorage.setItem('qg_sounds', on ? '1' : '0');
  if (on) soundTap();
}

// ── MINIMAL SOUNDS ────────────────────────────────────────────────────────


function soundWrong() {
  if (!_soundEnabled(false)) return;
  _play(ctx => {
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(110, t + 0.18);
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.start(t); o.stop(t + 0.25);
  });
}

function soundTimeUp() {
  if (!_soundEnabled(false)) return;
  _play(ctx => {
    const t = ctx.currentTime;
    [440, 349, 261].forEach((freq, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = freq;
      o.type = 'sine';
      g.gain.setValueAtTime(0.14, t + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.18);
      o.start(t + i * 0.12); o.stop(t + i * 0.12 + 0.2);
    });
  });
}

function soundLevelComplete() {
  if (!_soundEnabled(false)) return;
  _play(ctx => {
    const t = ctx.currentTime;
    [523, 659, 784, 1047].forEach((freq, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = freq;
      o.type = 'sine';
      g.gain.setValueAtTime(0, t + i * 0.1);
      g.gain.linearRampToValueAtTime(0.16, t + i * 0.1 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.25);
      o.start(t + i * 0.1); o.stop(t + i * 0.1 + 0.28);
    });
  });
}

// ── FULL SOUNDS ONLY ──────────────────────────────────────────────────────

function soundStar() {
  if (!_soundEnabled(true)) return;
  _play(ctx => {
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine';
    o.frequency.setValueAtTime(880, t);
    o.frequency.exponentialRampToValueAtTime(1760, t + 0.08);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.start(t); o.stop(t + 0.2);
  });
}

function soundNodeTap() {
  if (!_soundEnabled(true)) return;
  _play(ctx => {
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine';
    o.frequency.setValueAtTime(440, t);
    o.frequency.exponentialRampToValueAtTime(660, t + 0.06);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.start(t); o.stop(t + 0.14);
  });
}

function soundHint() {
  if (!_soundEnabled(false)) return;
  _play(ctx => {
    const t = ctx.currentTime;
    [1047, 1319].forEach((freq, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, t + i * 0.09);
      g.gain.setValueAtTime(0, t + i * 0.09);
      g.gain.linearRampToValueAtTime(0.10, t + i * 0.09 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.28);
      o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.3);
    });
  });
}

function soundTap() {
  if (!_soundEnabled(true)) return;
  _play(ctx => {
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine';
    o.frequency.value = 800;
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    o.start(t); o.stop(t + 0.06);
  });
}
