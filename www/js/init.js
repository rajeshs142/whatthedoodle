// ── INIT ──────────────────────────────────────────────────────────────────
function init() {
  try {
    loadCfg();
    const savedTheme = localStorage.getItem('qg_theme');
    applyTheme(savedTheme || CONFIG.theme);
    bestScore  = parseInt(localStorage.getItem('qg_best')  || '0');
    totalScore = parseInt(localStorage.getItem('qg_score') || '0');
    playingDay        = daysSinceStart();
    playingSlot       = 0;
    currentDrawingIdx = getDrawingIdx(playingDay, 0);
  } catch(e) { applyTheme(CONFIG.theme); }

  buildKeyboard();
  applyFrame();
  sizeCanvas();
  updateScoreDisplay();

  const inp = document.getElementById('guessInput');
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeAllModals(); return; }
    const onResult = document.getElementById('page-result').classList.contains('active');
    if (e.key === 'Enter' && onResult) { isDoodleMode ? doodleNextOrSummary() : gameMode === 'levels' ? goNextLevel() : nextDrawing(); return; }
    const onGame = document.getElementById('page-game').classList.contains('active');
    if (!onGame) return;
    if (e.key === 'Enter') { submitGuess(); return; }
    if (e.key === 'Backspace') { inp.value = inp.value.slice(0, -1); updateSuggestions(inp); return; }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && inp.value.length < 30) {
      inp.value += e.key.toUpperCase();
      updateSuggestions(inp);
    }
  });

  // Check for shared doodle URL
  const _doodleParam = new URLSearchParams(window.location.search).get('doodle');
  if (_doodleParam && loadDoodleFromUrl(_doodleParam)) return;

  window.addEventListener('resize', () => {
    sizeCanvas();
    if (document.getElementById('page-home').classList.contains('active')) renderHomeBg();
  });

  // Capacitor: exit app when back pressed on home page
  const CapApp = window.Capacitor?.Plugins?.App;
  if (CapApp) {
    CapApp.addListener('backButton', () => {
      const onHome = document.getElementById('page-home').classList.contains('active');
      if (onHome) CapApp.exitApp();
      else history.back();
    });
  }

  showHome();
  // Fade in after first paint — hides any layout jump from system bars or font loading
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.classList.add('ready');
    });
  });
}

function applyViewportZoom() {
  const minW = 360, minH = 600;
  const z = Math.min(1, window.innerWidth / minW, window.innerHeight / minH);
  if (z < 0.99) {
    document.documentElement.style.zoom = z;
    document.body.style.height = (window.innerHeight / z) + 'px';
  } else {
    document.documentElement.style.zoom = '';
    document.body.style.height = '';
  }
}
window.addEventListener('resize', applyViewportZoom);
applyViewportZoom();

init();
