// progress: { "dayIdx": [score|null, ...] }  (null = not played)
function loadProgress() {
  try { return JSON.parse(localStorage.getItem('qg_progress') || '{}'); } catch(e) { return {}; }
}
function saveProgress(p) {
  try { localStorage.setItem('qg_progress', JSON.stringify(p)); } catch(e) {}
}
function getSlotScore(dayIdx, slot) {
  const p = loadProgress();
  return (p[dayIdx] || [])[slot] ?? null;
}
function setSlotScore(dayIdx, slot, score) {
  if (!sessionDayProgress || sessionDayProgress.dayIdx !== dayIdx) {
    sessionDayProgress = { dayIdx, scores: Array(CONFIG.gamesPerDay).fill(null) };
  }
  sessionDayProgress.scores[slot] = score;
  // Only write to storage once ALL slots are filled for this day
  if (sessionDayProgress.scores.every(s => s !== null)) {
    const p = loadProgress();
    p[dayIdx] = sessionDayProgress.scores.slice();
    saveProgress(p);
  }
}

function firstIncompleteSlot(dayIdx) {
  const p = loadProgress();
  const slots = p[dayIdx] || [];
  for (let i = 0; i < CONFIG.gamesPerDay; i++) {
    if (slots[i] == null) return i;
  }
  return CONFIG.gamesPerDay; // all complete
}

function loadStars() {
  try { return JSON.parse(localStorage.getItem('qg_stars') || '{}'); } catch(e) { return {}; }
}
function saveStarsStore(s) {
  try { localStorage.setItem('qg_stars', JSON.stringify(s)); } catch(e) {}
}
function getLevelStars(drawingId) {
  return loadStars()[drawingId]; // undefined = not yet played
}
function setLevelStars(drawingId, stars) {
  const s = loadStars();
  if (s[drawingId] === undefined || stars > (s[drawingId] || 0)) {
    s[drawingId] = stars;
    saveStarsStore(s);
  }
}

function loadCatStars() {
  try { return JSON.parse(localStorage.getItem('qg_cat_stars') || '{}'); } catch(e) { return {}; }
}
function saveCatStarsStore(s) {
  try { localStorage.setItem('qg_cat_stars', JSON.stringify(s)); } catch(e) {}
}
function getCatLevelStars(drawingId) {
  return loadCatStars()[drawingId];
}
function setCatLevelStars(drawingId, stars) {
  const s = loadCatStars();
  if (s[drawingId] === undefined || stars > (s[drawingId] || 0)) {
    s[drawingId] = stars;
    saveCatStarsStore(s);
  }
}

function addToHistory(word, score, won) {
  roundHistory.push({ word, score, won, strokes: currentDrawing.strokes, bounds: drawingBounds, guesses: [...currentGuesses] });
}

function saveCfg() {
  try { localStorage.setItem('qg_cfg', JSON.stringify({
    strokeMode:   CONFIG.strokeMode,
    canvasEffect: CONFIG.canvasEffect,
    drawTime:     CONFIG.drawTime,
    guessTime:    CONFIG.guessTime,
    strokeWidth:  CONFIG.strokeWidth,
    frameStyle:   CONFIG.frameStyle,
    showMillis:      CONFIG.showMillis,
    showThread:      CONFIG.showThread,
    showNail:        CONFIG.showNail,
    showSwing:       CONFIG.showSwing,
    showSuggestions: CONFIG.showSuggestions,
  })); } catch(e) {}
}

function loadCfg() {
  try {
    const raw = localStorage.getItem('qg_cfg');
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved.strokeMode   !== undefined) CONFIG.strokeMode   = saved.strokeMode;
    if (saved.canvasEffect !== undefined) CONFIG.canvasEffect = saved.canvasEffect;
    if (saved.drawTime     !== undefined) CONFIG.drawTime     = saved.drawTime;
    if (saved.guessTime    !== undefined) CONFIG.guessTime    = saved.guessTime;
    if (saved.strokeWidth  !== undefined) CONFIG.strokeWidth  = saved.strokeWidth;
    if (saved.frameStyle   !== undefined) CONFIG.frameStyle   = saved.frameStyle;
    if (saved.showMillis       !== undefined) CONFIG.showMillis       = saved.showMillis;
    if (saved.showThread       !== undefined) CONFIG.showThread       = saved.showThread;
    if (saved.showNail         !== undefined) CONFIG.showNail         = saved.showNail;
    if (saved.showSwing        !== undefined) CONFIG.showSwing        = saved.showSwing;
    if (saved.showSuggestions  !== undefined) CONFIG.showSuggestions  = saved.showSuggestions;
  } catch(e) {}
}

function loadHistory() {
  return roundHistory;
}
