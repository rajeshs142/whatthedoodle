// ── SETTINGS PAGE ─────────────────────────────────────────────────────────
let _settingsApplied = null;

function stepCfgGuessTime(delta) {
  const inp = document.getElementById('cfg-guessTime');
  const val = Math.min(60, Math.max(10, (parseInt(inp.value) || 10) + delta));
  inp.value = val;
  document.getElementById('cfg-guessTime-val').textContent = val + 's';
  onSettingChange();
}

function toggleCfgDropdown(wrapId) {
  const wrap = document.getElementById(wrapId);
  const isOpen = wrap.classList.contains('open');
  // Close all open dropdowns first
  document.querySelectorAll('.cfg-custom-select.open').forEach(el => {
    el.classList.remove('open');
    el.setAttribute('aria-expanded', 'false');
  });
  if (!isOpen) {
    wrap.classList.add('open');
    wrap.setAttribute('aria-expanded', 'true');
    // Focus the first option
    const first = wrap.querySelector('.cfg-select-opt');
    if (first) first.focus();
  }
}

function handleCfgDropdownKey(e, wrapId, selectId) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    toggleCfgDropdown(wrapId);
  } else if (e.key === 'Escape') {
    const wrap = document.getElementById(wrapId);
    wrap.classList.remove('open');
    wrap.setAttribute('aria-expanded', 'false');
    document.getElementById(wrapId + '-btn') && document.getElementById(wrapId + '-btn').focus();
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    toggleCfgDropdown(wrapId);
  }
}

function handleCfgOptKey(e, wrapId, selectId, val, label) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    pickCfgOption(wrapId, selectId, val, label);
    // Return focus to trigger button
    const btn = document.getElementById(wrapId.replace('-wrap', '-btn'));
    if (btn) btn.focus();
  } else if (e.key === 'Escape') {
    const wrap = document.getElementById(wrapId);
    wrap.classList.remove('open');
    wrap.setAttribute('aria-expanded', 'false');
    const btn = document.getElementById(wrapId.replace('-wrap', '-btn'));
    if (btn) btn.focus();
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    const next = e.target.nextElementSibling;
    if (next && next.classList.contains('cfg-select-opt')) next.focus();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    const prev = e.target.previousElementSibling;
    if (prev && prev.classList.contains('cfg-select-opt')) prev.focus();
    else {
      // At top — close and return to button
      const wrap = document.getElementById(wrapId);
      wrap.classList.remove('open');
      wrap.setAttribute('aria-expanded', 'false');
      const btn = document.getElementById(wrapId.replace('-wrap', '-btn'));
      if (btn) btn.focus();
    }
  }
}

function pickCfgOption(wrapId, selectId, val, label) {
  const wrap = document.getElementById(wrapId);
  const sel  = document.getElementById(selectId);
  document.getElementById(selectId + '-val').textContent = label;
  sel.value = val;
  wrap.classList.remove('open');
  wrap.setAttribute('aria-expanded', 'false');
  // Update trigger button aria-label
  const btn = document.getElementById(wrapId.replace('-wrap', '-btn'));
  if (btn) {
    const settingName = btn.getAttribute('aria-label').split(':')[0];
    btn.setAttribute('aria-label', settingName + ': ' + label);
  }
  // Mark selected option
  wrap.querySelectorAll('.cfg-select-opt').forEach(o => {
    const isSelected = o.dataset.val === val || o.textContent.trim() === label;
    o.classList.toggle('selected', isSelected);
    o.setAttribute('aria-selected', isSelected ? 'true' : 'false');
  });
  sel.dispatchEvent(new Event('change'));
}

function _syncCfgDropdown(wrapId, selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const val = sel.value;
  const valEl = document.getElementById(selectId + '-val');
  if (valEl) {
    const opt = sel.querySelector(`option[value="${val}"]`);
    if (opt) valEl.textContent = opt.textContent;
  }
  const wrap = document.getElementById(wrapId);
  if (wrap) wrap.querySelectorAll('.cfg-select-opt').forEach(o => o.classList.toggle('selected', o.dataset.val === val || (o.textContent.trim() === (sel.querySelector(`option[value="${val}"]`)?.textContent || ''))));
}

// Close dropdowns when tapping outside
document.addEventListener('click', e => {
  if (!e.target.closest('.cfg-custom-select')) {
    document.querySelectorAll('.cfg-custom-select.open').forEach(el => el.classList.remove('open'));
  }
});

function showSettingsPage() {
  document.getElementById('cfg-strokeMode').value        = CONFIG.strokeMode;
  document.getElementById('cfg-theme').value             = currentTheme;
  document.getElementById('cfg-drawTime').value          = CONFIG.drawTime;
  document.getElementById('cfg-guessTime').value         = CONFIG.guessTime;
  document.getElementById('cfg-strokeWidth').value       = CONFIG.strokeWidth;
  document.getElementById('cfg-frameStyle').value        = CONFIG.frameStyle;
  document.getElementById('cfg-canvasEffect').value      = CONFIG.canvasEffect;
  _syncCfgDropdown('cfg-theme-wrap',       'cfg-theme');
  _syncCfgDropdown('cfg-strokeMode-wrap',  'cfg-strokeMode');
  _syncCfgDropdown('cfg-frameStyle-wrap',  'cfg-frameStyle');
  document.getElementById('cfg-guessTime-val').textContent = CONFIG.guessTime + 's';
  document.getElementById('cfg-showMillis').checked      = CONFIG.showMillis;
  document.getElementById('cfg-showThread').checked      = CONFIG.showThread;
  document.getElementById('cfg-showNail').checked        = CONFIG.showNail;
  document.getElementById('cfg-showSwing').checked       = CONFIG.showSwing;
  document.getElementById('cfg-showHint').checked        = CONFIG.showHint;
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
  const ep = document.getElementById('settingsExitPrompt');
  if (ep) ep.style.display = 'none';
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
    showHint:        document.getElementById('cfg-showHint').checked,
    guessTime:       document.getElementById('cfg-guessTime').value,
  };
}

function isSettingsDirty() {
  if (!_settingsApplied) return false;
  const s = _settingsSnapshot();
  return s.strokeMode      !== _settingsApplied.strokeMode      ||
         s.theme           !== _settingsApplied.theme           ||
         s.frameStyle      !== _settingsApplied.frameStyle      ||
         s.showSuggestions !== _settingsApplied.showSuggestions ||
         s.showHint        !== _settingsApplied.showHint        ||
         s.guessTime       !== _settingsApplied.guessTime;
}

function updateSettingsPreview() {
  const frameStyle = document.getElementById('cfg-frameStyle').value;
  const frame = document.getElementById('settingsPreviewFrame');
  frame.className = 'preview-frame' + (frameStyle !== 'none' ? ' frame-' + frameStyle : '');
  applyTheme(document.getElementById('cfg-theme').value);
  _updatePreviewHint();
  _updatePreviewSugg();
}

function _updatePreviewHint() {
  const el = document.getElementById('previewHint');
  if (!el) return;
  const show = document.getElementById('cfg-showHint').checked;
  el.innerHTML = '';
  if (!show) return;
  // Show a sample word: "CAT" with first letter revealed
  const word = 'CAT';
  word.split('').forEach((ch, i) => {
    const tile = document.createElement('div');
    tile.className = 'preview-hint-tile' + (i === 0 ? ' revealed' : '');
    tile.textContent = i === 0 ? ch : '_';
    el.appendChild(tile);
  });
}

function _updatePreviewSugg() {
  const el = document.getElementById('previewSugg');
  if (!el) return;
  const show = document.getElementById('cfg-showSuggestions').checked;
  el.innerHTML = '';
  if (!show) return;
  ['CATCH', 'CATS', 'CATTLE'].forEach(w => {
    const chip = document.createElement('div');
    chip.className = 'preview-sugg-chip';
    chip.textContent = w;
    el.appendChild(chip);
  });
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
}

function settingsLeave() {
  settingsDiscard();
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
  CONFIG.showHint        = document.getElementById('cfg-showHint').checked;
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
