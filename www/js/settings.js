// ── SETTINGS PAGE ─────────────────────────────────────────────────────────
let _settingsApplied = null;

function showSettingsPage() {
  document.getElementById('cfg-strokeMode').value        = CONFIG.strokeMode;
  document.getElementById('cfg-theme').value             = currentTheme;
  document.getElementById('cfg-drawTime').value          = CONFIG.drawTime;
  document.getElementById('cfg-guessTime').value         = CONFIG.guessTime;
  document.getElementById('cfg-strokeWidth').value       = CONFIG.strokeWidth;
  document.getElementById('cfg-frameStyle').value        = CONFIG.frameStyle;
  document.getElementById('cfg-canvasEffect').value      = CONFIG.canvasEffect;
  document.getElementById('cfg-showMillis').checked      = CONFIG.showMillis;
  document.getElementById('cfg-showThread').checked      = CONFIG.showThread;
  document.getElementById('cfg-showNail').checked        = CONFIG.showNail;
  document.getElementById('cfg-showSwing').checked       = CONFIG.showSwing;
  document.getElementById('cfg-showSuggestions').checked = CONFIG.showSuggestions;
  const soundsRow = document.getElementById('cfg-sounds-row');
  if (soundsRow) soundsRow.style.display = CONFIG.sounds === 'off' ? 'none' : '';
  const soundsChk = document.getElementById('cfg-sounds');
  if (soundsChk) soundsChk.checked = localStorage.getItem('qg_sounds') !== '0';
  const micRow = document.getElementById('cfg-mic-row');
  const micSupported = CONFIG.mic && (
    window.Capacitor?.isNativePlatform() ||
    !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  );
  if (micRow) micRow.style.display = micSupported ? '' : 'none';
  const micChk = document.getElementById('cfg-mic');
  if (micChk) micChk.checked = localStorage.getItem('qg_mic') === '1';
  _settingsApplied = _settingsSnapshot();
  document.getElementById('settingsExitPrompt').style.display = 'none';
  updateSettingsPreview();
  showPage('settings');
  requestAnimationFrame(() => animateSettingsPreview());
}

function _settingsSnapshot() {
  return {
    strokeMode:      document.getElementById('cfg-strokeMode').value,
    theme:           document.getElementById('cfg-theme').value,
    frameStyle:      document.getElementById('cfg-frameStyle').value,
    showSuggestions: document.getElementById('cfg-showSuggestions').checked,
  };
}

function isSettingsDirty() {
  if (!_settingsApplied) return false;
  const s = _settingsSnapshot();
  return s.strokeMode !== _settingsApplied.strokeMode ||
         s.theme      !== _settingsApplied.theme      ||
         s.frameStyle !== _settingsApplied.frameStyle  ||
         s.showSuggestions !== _settingsApplied.showSuggestions;
}

function updateSettingsPreview() {
  const frameStyle = document.getElementById('cfg-frameStyle').value;
  const frame = document.getElementById('settingsPreviewFrame');
  frame.className = 'preview-frame' + (frameStyle !== 'none' ? ' frame-' + frameStyle : '');
  applyTheme(document.getElementById('cfg-theme').value);
}

let _previewAnimGen = 0;
function animateSettingsPreview() {
  const gen = ++_previewAnimGen;

  // Pick a simple recognisable drawing to preview (cat, house, sun, star, fish…)
  const PREVIEW_WORDS = ['cat','house','sun','star','fish','tree','car','flower','dog','bird'];
  const frame = document.getElementById('settingsPreviewFrame');
  let drawing = null;
  for (const w of PREVIEW_WORDS) {
    drawing = DRAWINGS.find(d => d.word === w);
    if (drawing && drawing.strokes && drawing.strokes.length) break;
  }
  if (!drawing) drawing = DRAWINGS.find(d => d.strokes && d.strokes.length >= 1);
  if (!drawing) return;

  // Build SVG inside the frame
  const strokeColor = 'var(--text)';
  const strokeW = CONFIG.strokeWidth || 5;
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 255 255');
  svg.style.cssText = 'width:100%;height:100%;';
  const pathEls = drawing.strokes.map(d => {
    const p = document.createElementNS(svgNS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', strokeColor);
    p.setAttribute('stroke-width', strokeW);
    p.setAttribute('stroke-linecap', 'round');
    p.setAttribute('stroke-linejoin', 'round');
    return p;
  });
  pathEls.forEach(p => svg.appendChild(p));
  frame.innerHTML = '';
  frame.appendChild(svg);

  const paths = pathEls;
  const mode = document.getElementById('cfg-strokeMode').value;

  if (!paths.length) return;
  // measure lengths once
  const lengths = paths.map(p => p.getTotalLength());

  // reset all to invisible
  paths.forEach((p, i) => {
    p.style.transition = 'none';
    p.style.strokeDasharray = lengths[i];
    p.style.strokeDashoffset = lengths[i];
  });

  const strokeDuration = 900; // ms per stroke
  const pauseBetween = 120;   // ms gap between strokes
  const holdAfter = 800;      // ms hold when fully drawn before next cycle
  const maxCycles = 2;

  function getOrder() {
    if (mode === 'forward') return [...paths.keys()];
    if (mode === 'reverse') return [...paths.keys()].reverse();
    if (mode === 'random') {
      const a = [...paths.keys()];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }
    return null; // all at once
  }

  function runCycle(cycleNum) {
    if (gen !== _previewAnimGen || cycleNum > maxCycles) return;

    // reset all to invisible
    paths.forEach((p, i) => {
      p.style.transition = 'none';
      p.style.strokeDashoffset = lengths[i];
    });

    const order = getOrder();

    if (order === null) {
      // all at once
      requestAnimationFrame(() => {
        if (gen !== _previewAnimGen) return;
        paths.forEach((p, i) => {
          p.style.transition = `stroke-dashoffset ${strokeDuration}ms linear`;
          p.style.strokeDashoffset = 0;
        });
        setTimeout(() => { if (gen === _previewAnimGen) runCycle(cycleNum + 1); }, strokeDuration + holdAfter);
      });
    } else {
      let delay = 0;
      order.forEach((idx) => {
        const startDelay = delay;
        delay += strokeDuration + pauseBetween;
        setTimeout(() => {
          if (gen !== _previewAnimGen) return;
          paths[idx].style.transition = `stroke-dashoffset ${strokeDuration}ms linear`;
          paths[idx].style.strokeDashoffset = 0;
        }, startDelay);
      });
      setTimeout(() => { if (gen === _previewAnimGen) runCycle(cycleNum + 1); }, delay + holdAfter);
    }
  }

  // small initial delay so the reset paint is flushed before animation starts
  requestAnimationFrame(() => requestAnimationFrame(() => { if (gen === _previewAnimGen) runCycle(1); }));
}

function onSettingChange() {
  updateSettingsPreview();
  animateSettingsPreview();
  document.getElementById('settingsExitPrompt').style.display = 'none';
}

function settingsLeave() {
  if (isSettingsDirty()) {
    document.getElementById('settingsExitPrompt').style.display = 'flex';
  } else {
    _previewAnimGen++;
    if (_settingsApplied) applyTheme(_settingsApplied.theme);
    showHome();
  }
}

function settingsDiscard() {
  _previewAnimGen++;
  if (_settingsApplied) applyTheme(_settingsApplied.theme);
  _settingsApplied = null;
  showHome();
}

function applyCfg() {
  CONFIG.strokeMode      = document.getElementById('cfg-strokeMode').value;
  CONFIG.drawTime        = Number(document.getElementById('cfg-drawTime').value);
  CONFIG.guessTime       = Number(document.getElementById('cfg-guessTime').value);
  CONFIG.strokeWidth     = Number(document.getElementById('cfg-strokeWidth').value);
  CONFIG.frameStyle      = document.getElementById('cfg-frameStyle').value;
  CONFIG.canvasEffect    = document.getElementById('cfg-canvasEffect').value;
  CONFIG.showMillis      = document.getElementById('cfg-showMillis').checked;
  CONFIG.showThread      = document.getElementById('cfg-showThread').checked;
  CONFIG.showNail        = document.getElementById('cfg-showNail').checked;
  CONFIG.showSwing       = document.getElementById('cfg-showSwing').checked;
  CONFIG.showSuggestions = document.getElementById('cfg-showSuggestions').checked;
  const theme = document.getElementById('cfg-theme').value;
  applyTheme(theme);
  try { localStorage.setItem('qg_theme', theme); } catch(e) {}
  applyFrame();
  saveCfg();
  _previewAnimGen++;
  _settingsApplied = null;
  showHome();
  redrawCanvas();
}
