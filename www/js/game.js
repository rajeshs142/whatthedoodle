// ── STATE ─────────────────────────────────────────────────────────────────
let currentDrawing    = null;
let currentDrawingIdx = 0;   // global index into DRAWINGS (derived)
let playingDay        = 0;   // which day (0 = startDate)
let playingSlot       = 0;   // which game within the day
let sessionDayProgress = null; // { dayIdx, scores[] } — in-memory buffer, flushed on day complete
let timerInterval     = null;
let timeLeft          = 0;
let revealedStrokes   = 0;
let gameOver          = false;
let animGeneration    = 0;
let totalScore        = 0;
let bestScore         = 0;
let drawingBounds     = null;
let currentTheme      = 'light';
let autoNextTimer     = null;
let roundHistory      = [];   // [{word, score, won, guesses}]
let currentGuesses    = [];   // [{text, correct}]
let canvasSize        = 256;

// ── DRAWING LOAD ──────────────────────────────────────────────────────────
function loadDrawing() {
  showPage('game');
  sizeCanvas();
  animGeneration++;
  clearInterval(timerInterval);
  timerInterval = null;

  revealedStrokes = 0;
  gameOver        = false;
  timeLeft        = CONFIG.drawTime + CONFIG.guessTime;
  currentGuesses  = [];

  if (!isDoodleMode) {
    currentDrawing = DRAWINGS[currentDrawingIdx % DRAWINGS.length];
    try { localStorage.setItem('qg_idx', currentDrawingIdx); } catch(e) {}
  }
  drawingBounds  = getDrawingBounds(currentDrawing);

  const inp = document.getElementById('guessInput');
  inp.value    = '';
  inp.disabled = false;
  setStatus('');
  resetCanvasWrap();
  clearCanvas();
  const _sep = document.getElementById('dayLabelSep');
  if (gameMode === 'category') {
    document.getElementById('dayLabel').style.display = '';
    document.getElementById('dayLabel').textContent   = currentCatName ? currentCatName.toUpperCase() : '';
    if (_sep) _sep.style.display = '';
    document.getElementById('drawingNum').textContent = `${currentCatIdx + 1}`;
  } else if (gameMode === 'levels') {
    document.getElementById('dayLabel').style.display = 'none';
    if (_sep) _sep.style.display = 'none';
    document.getElementById('drawingNum').textContent = `LVL ${currentMapNodeIdx + 1}`;
  } else {
    document.getElementById('dayLabel').style.display = '';
    document.getElementById('dayLabel').textContent   = `DAY ${playingDay + 1}`;
    if (_sep) _sep.style.display = '';
    document.getElementById('drawingNum').textContent = `${playingSlot + 1}/${CONFIG.gamesPerDay}`;
  }

  updateTimerDisplay(timeLeft, timeLeft);
  startGame();
}

// ── GAME START ────────────────────────────────────────────────────────────
function startGame() {
  const total = CONFIG.drawTime + CONFIG.guessTime;

  const timerStart = performance.now();
  const timerInitial = timeLeft;
  timerInterval = setInterval(() => {
    timeLeft = Math.max(0, timerInitial - (performance.now() - timerStart) / 1000);
    updateTimerDisplay(timeLeft, total);
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      timeOut();
    }
  }, CONFIG.showMillis ? 10 : 100);

  stopMic();
  startMic();
  startStrokeAnimation();
}

function buildStrokeOrder(strokeCount) {
  const mode = CONFIG.strokeMode;
  if (mode === 'reverse') {
    return Array.from({ length: strokeCount }, (_, i) => strokeCount - 1 - i);
  }
  if (mode === 'random') {
    const arr = Array.from({ length: strokeCount }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  if (mode === 'dual-alt') {
    const arr = [];
    let lo = 0, hi = strokeCount - 1;
    while (lo <= hi) {
      arr.push(lo++);
      if (lo - 1 !== hi) arr.push(hi--); else hi--;
    }
    return arr;
  }
  // forward (default)
  return Array.from({ length: strokeCount }, (_, i) => i);
}

function startStrokeAnimation() {
  const gen         = animGeneration;
  const strokes     = currentDrawing.strokes;
  const strokeCount = strokes.length;
  const durationMs  = CONFIG.drawTime * 1000;
  const mode        = CONFIG.strokeMode;

  // canvas rotation — keyframe animation avoids transition timing issues
  const effectMap = {
    'rotate':   'canvas-rotate-in',
    'zoom-in':  'canvas-zoom-in',
    'zoom-out': 'canvas-zoom-out',
  };
  const effectAnim = effectMap[CONFIG.canvasEffect];
  if (effectAnim) {
    const wrap = document.querySelector('.canvas-wrap');
    wrap.style.animation = 'none';
    wrap.getBoundingClientRect();
    wrap.style.animation = `${effectAnim} ${CONFIG.drawTime}s linear forwards`;
  }

  if (mode === 'all') {
    revealedStrokes = strokeCount;
    const drawStart    = performance.now();
    const sampledPaths = strokes.map(s => samplePath(s));
    function animateAll(now) {
      if (animGeneration !== gen) return;
      const t = Math.min((now - drawStart) / durationMs, 1);
      renderAllStrokes(sampledPaths, t);
      if (t < 1) requestAnimationFrame(animateAll);
    }
    requestAnimationFrame(animateAll);

  } else if (mode === 'dual-pair') {
    // pairs: (0, n-1), (1, n-2), ... each pair animates together
    const pairs = [];
    let lo = 0, hi = strokeCount - 1;
    while (lo <= hi) {
      pairs.push(lo === hi ? [lo] : [lo, hi]);
      lo++; hi--;
    }
    const pairDurMs = pairs.length > 0 ? durationMs / pairs.length : 0;

    function revealPair(pairIdx) {
      if (animGeneration !== gen || pairIdx >= pairs.length) return;
      const pair        = pairs[pairIdx];
      const pairStart   = performance.now();
      const sampledPair = pair.map(i => samplePath(strokes[i]));
      revealedStrokes   = pairs.slice(0, pairIdx + 1).flat().length;

      function animStep(now) {
        if (animGeneration !== gen) return;
        const progress = Math.min((now - pairStart) / pairDurMs, 1);
        renderPair(pairs.slice(0, pairIdx).flat(), pair, sampledPair, progress);
        if (progress < 1) requestAnimationFrame(animStep);
        else revealPair(pairIdx + 1);
      }
      requestAnimationFrame(animStep);
    }
    revealPair(0);

  } else {
    // forward / reverse / random / dual-alt — sequential with custom order
    const order       = buildStrokeOrder(strokeCount);
    const strokeDurMs = strokeCount > 0 ? durationMs / strokeCount : 0;
    // track which original indices are fully done
    const done = new Set();

    function revealNext(step) {
      if (animGeneration !== gen || step >= order.length) return;
      const origIdx   = order[step];
      const stepStart = performance.now();
      const sampled   = samplePath(strokes[origIdx]);
      revealedStrokes = step + 1;

      function animStep(now) {
        if (animGeneration !== gen) return;
        const progress = Math.min((now - stepStart) / strokeDurMs, 1);
        renderOrdered(done, origIdx, sampled, progress);
        if (progress < 1) requestAnimationFrame(animStep);
        else { done.add(origIdx); revealNext(step + 1); }
      }
      requestAnimationFrame(animStep);
    }
    revealNext(0);
  }
}

// ── TIMER DISPLAY ─────────────────────────────────────────────────────────
function updateTimerDisplay(t, total) {
  const pct  = total > 0 ? (t / total) * 100 : 0;
  const disp = document.getElementById('timerDisplay');
  const fill = document.getElementById('timerFill');
  if (CONFIG.showMillis) {
    const totalCs = Math.max(0, Math.round(t * 100));
    const mm = String(Math.floor(totalCs / 6000)).padStart(2, '0');
    const ss = String(Math.floor((totalCs % 6000) / 100)).padStart(2, '0');
    const cc = String(totalCs % 100).padStart(2, '0');
    disp.textContent = mm + ':' + ss + '.' + cc;
  } else {
    const secs = Math.max(0, Math.ceil(t));
    const mm = String(Math.floor(secs / 60)).padStart(2, '0');
    const ss = String(secs % 60).padStart(2, '0');
    disp.textContent = mm + ':' + ss;
  }
  fill.style.width = pct + '%';
  disp.className   = 'game-timer';
  fill.className   = 'timer-fill';

  if (t <= 0) {
    disp.classList.add('up');
  } else if (t <= 5) {
    disp.classList.add('danger');
    fill.classList.add('danger');
  } else if (t <= 10) {
    disp.classList.add('warn');
    fill.classList.add('warn');
  }
}

// ── GUESS ─────────────────────────────────────────────────────────────────
function isCorrectGuess(guess) {
  const g       = guess.trim().toUpperCase();
  const answers = [currentDrawing.word, ...(currentDrawing.synonyms || [])];
  return answers.some(a => a.toUpperCase() === g);
}

function submitGuess() {
  if (gameOver) return;
  const input = document.getElementById('guessInput');
  const guess = input.value.trim().toUpperCase();
  if (!guess) return;

  if (isCorrectGuess(guess)) {
    animGeneration++;
    clearInterval(timerInterval);
    timerInterval = null;
    gameOver = true;

    const finalScore = Math.max(0, Math.round(timeLeft));

    currentGuesses.push({ text: guess, correct: true });
    input.classList.add('flash-correct');
    setStatus(guess, 'correct');

    if (!isDoodleMode) {
      totalScore += finalScore;
      if (finalScore > bestScore) bestScore = finalScore;
      try {
        localStorage.setItem('qg_best',  bestScore);
        localStorage.setItem('qg_score', totalScore);
      } catch(e) {}
      updateScoreDisplay();
      addToHistory(currentDrawing.word, finalScore, true);
    }
    stopMic();
    setTimeout(() => showResult(true, finalScore), 800);

  } else {
    currentGuesses.push({ text: guess, correct: false });
    input.classList.add('shake');
    setStatus(guess, 'wrong');
    soundWrong();
    const wrongCount = currentGuesses.filter(g => !g.correct).length;
    setTimeout(() => {
      input.classList.remove('shake');
      setStatus('');
      if (CONFIG.maxWrongGuesses > 0 && wrongCount >= CONFIG.maxWrongGuesses) timeOut();
    }, 700);
    input.value = '';
  }
}


// ── TIMEOUT ───────────────────────────────────────────────────────────────
function timeOut() {
  gameOver = true;
  document.getElementById('guessInput').disabled = true;
  stopMic();
  setStatus('TIME\'S UP!', 'wrong');
  soundTimeUp();
  revealedStrokes = currentDrawing.strokes.length;
  redrawCanvas();
  if (!isDoodleMode) addToHistory(currentDrawing.word, 0, false);
  setTimeout(() => showResult(false, 0), 1200);
}

// ── SKIP ──────────────────────────────────────────────────────────────────
function skipDrawing() {
  if (gameOver) { nextDrawing(); return; }
  animGeneration++;
  clearInterval(timerInterval);
  timerInterval = null;
  gameOver = true;
  revealedStrokes = currentDrawing.strokes.length;
  redrawCanvas();
  addToHistory(currentDrawing.word, 0, false);
  showResult(false, 0);
}

// ── RESULT ────────────────────────────────────────────────────────────────
function showResult(won, finalScore) {
  const isDoodle   = isDoodleMode;
  const slotForCalc = isDoodle ? _doodleQueueIdx : playingSlot;
  if (!isDoodle) setSlotScore(playingDay, playingSlot, finalScore);
  const isLastSlot = isDoodle
    ? _doodleQueueIdx >= _doodleQueue.length - 1
    : playingSlot >= CONFIG.gamesPerDay - 1;

  document.getElementById('resultTitle').textContent  = won ? 'NAILED IT!' : 'TIME\'S UP';
  document.getElementById('resultTitle').className    = 'overlay-title ' + (won ? 'win' : 'lose');
  document.getElementById('resultAnswer').textContent = won ? currentDrawing.word.toUpperCase() : '???';
  document.getElementById('statScore').textContent    = finalScore;
  document.getElementById('statScore').className      = 'stat-val' + (won ? '' : ' red');

  // SVG preview — use current theme color so dark mode works
  const strokeColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--stroke-color').trim() || '#1a1814';
  const wrap     = document.getElementById('resultSvgWrap');
  const svgPaths = currentDrawing.strokes.map(s =>
    `<path d="${s}" fill="none" stroke="currentColor" stroke-width="${CONFIG.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`
  ).join('');
  // Scale painting: constrained by both width and available height
  const availH  = window.innerHeight - 65;
  const wScale  = window.innerWidth >= 700 ? 1.6 : window.innerWidth >= 520 ? 1.25 : 1;
  const hScale  = (availH - 260) / 220; // 260px reserved for rest of page content
  const sc2     = Math.max(0.7, Math.min(wScale, hScale));
  const fbBase = CONFIG.frameStyle === 'none' ? 1 : CONFIG.frameStyle === 'simple' ? 4 : 6;
  const fs = Math.round(150 * sc2), fb = Math.round(fbBase * sc2);
  const sceneW = Math.round(180 * sc2), sceneH = Math.round(220 * sc2), hangerTop = Math.round(16 * sc2);
  const cx        = sceneW / 2;
  const frameTotal = fs + fb * 2;
  const hangerH   = sceneH - hangerTop;
  const threadH   = hangerH - frameTotal;
  const tSpread   = frameTotal / 2 - Math.round(22 * sc2);
  const rAmp      = Math.round(5 * sc2);
  const rCross    = Math.round(4 * sc2);

  const isTimeout = !won;
  const tiltRight = CONFIG.brokenTilt === 'right' ? true
                  : CONFIG.brokenTilt === 'left'  ? false
                  : CONFIG.brokenTilt === 'random' ? Math.random() < 0.5
                  : slotForCalc % 2 === 0; // 'alternate'
  const extraSide = isTimeout ? Math.round(sceneW * 0.3) : 0;
  const outerW    = sceneW + extraSide * 2;
  wrap.style.width  = outerW + 'px';
  wrap.style.height = sceneH + 'px';

  let threadLines, hangerStyle;

  if (isTimeout) {
    const bY = Math.round(threadH * 0.48);
    if (tiltRight) {
      const bX = Math.round(cx - tSpread * 0.52);
      threadLines = `
        <line x1="${cx}" y1="0" x2="${cx + tSpread}" y2="${threadH}" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.55"/>
        <path d="${wavyPath(cx, 0, bX, bY, 3, rAmp)}" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.55"/>`;
        // <line x1="${bX-rCross}" y1="${bY-rCross+2}" x2="${bX+rCross-1}" y2="${bY+rCross}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity="0.8"/>
        // <line x1="${bX-rCross+2}" y1="${bY-rCross}" x2="${bX+rCross}" y2="${bY+rCross-2}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity="0.8"/>`;
      hangerStyle = 'transform-origin:50% 0%;animation:painting-swing-broken-left 4.5s ease-out forwards;';
    } else {
      const bX = Math.round(cx + tSpread * 0.52);
      threadLines = `
        <line x1="${cx}" y1="0" x2="${cx - tSpread}" y2="${threadH}" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.55"/>
        <path d="${wavyPath(cx, 0, bX, bY, 3, rAmp)}" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.55"/>`;
        // <line x1="${bX-rCross}" y1="${bY-rCross+2}" x2="${bX+rCross-1}" y2="${bY+rCross}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity="0.8"/>
        // <line x1="${bX-rCross+2}" y1="${bY-rCross}" x2="${bX+rCross}" y2="${bY+rCross-2}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity="0.8"/>`;
      hangerStyle = 'transform-origin:50% 0%;animation:painting-swing-broken 4.5s ease-out forwards;';
    }
  } else {
    threadLines = `
      <line x1="${cx}" y1="0" x2="${cx - tSpread}" y2="${threadH}" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.55"/>
      <line x1="${cx}" y1="0" x2="${cx + tSpread}" y2="${threadH}" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.55"/>`;
    hangerStyle = '';
  }
  if (!CONFIG.showSwing) {
    const angle = isTimeout ? (tiltRight ? -22 : 22) : 0;
    hangerStyle = `transform-origin:50% 0%;transform:rotate(${angle}deg);animation:none`;
  }

  const nailSz = Math.round(5 * sc2);
  const frameBdrStyle = frameCSS(fb, sc2);
  const threadSvg = CONFIG.showThread
    ? `<svg style="position:absolute;top:0;left:0;width:100%;height:${threadH}px;overflow:visible" xmlns="http://www.w3.org/2000/svg">${threadLines}</svg>`
    : '';
  const nailHtml = CONFIG.showNail
    ? `<div style="position:absolute;top:${Math.round(10*sc2)}px;left:50%;transform:translateX(-50%);width:${nailSz}px;height:${nailSz}px;background:var(--stroke-color);border-radius:50%;z-index:3"></div>`
    : '';
  wrap.innerHTML = `
    <div style="position:absolute;top:0;left:${extraSide}px;width:${sceneW}px;height:${sceneH}px;">
      ${nailHtml}
      <div class="painting-hanger" style="top:${hangerTop}px;${hangerStyle}">
        ${threadSvg}
        <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);${frameBdrStyle}">
          <svg viewBox="${svgViewBox(drawingBounds, 40)}" width="${fs}" height="${fs}" xmlns="http://www.w3.org/2000/svg">${svgPaths}</svg>
        </div>
      </div>
    </div>`;

  if (isDoodle) {
    _doodleResults.push({ won, score: finalScore, word: currentDrawing.word,
      strokes: currentDrawing.strokes, bounds: drawingBounds });
  }

  const nextBtn      = document.getElementById('nextBtn');
  const levelBtns    = document.getElementById('resultLevelBtns');
  const starsEl      = document.getElementById('resultStars');

  if (isDoodle) {
    if (starsEl) starsEl.innerHTML = '';
    nextBtn.style.display   = '';
    levelBtns.style.display = 'none';
    nextBtn.textContent = isLastSlot ? 'SEE RESULTS →' : 'NEXT DRAWING →';
    nextBtn.onclick = doodleNextOrSummary;
  } else if (gameMode === 'category') {
    const stars = calcStars(finalScore, won);
    if (stars > 0) { setCatLevelStars(currentDrawing.id, stars); soundLevelComplete(); }
    showCatLevelSummary(stars, won, finalScore);
    return;
  } else if (gameMode === 'levels') {
    const stars = calcStars(finalScore, won);
    if (stars > 0) { setLevelStars(currentDrawing.id, stars); soundLevelComplete(); }
    showLevelSummary(stars, won, finalScore);
    return;
  } else {
    if (starsEl) starsEl.innerHTML = '';
    nextBtn.style.display   = '';
    levelBtns.style.display = 'none';
    nextBtn.textContent = isLastSlot ? 'FINISH DAY →' : 'NEXT DRAWING →';
    nextBtn.onclick = nextDrawing;
  }

  // Daily mode with 1 game/day — skip result, go straight to summary
  if (!isDoodle && gameMode === 'daily' && CONFIG.gamesPerDay === 1) {
    playingSlot++;
    showDaySummary();
    return;
  }

  showPage('result');

  if (CONFIG.autoNextDelay > 0) {
    clearTimeout(autoNextTimer);
    autoNextTimer = setTimeout(isDoodle ? doodleNextOrSummary : nextDrawing, CONFIG.autoNextDelay * 1000);
  }
}

function nextDrawing() {
  clearTimeout(autoNextTimer);
  playingSlot++;
  if (playingSlot >= CONFIG.gamesPerDay) {
    showDaySummary();
    return;
  }
  currentDrawingIdx = getDrawingIdx(playingDay, playingSlot);
  loadDrawing();
}


function restartGame() {
  closeAllModals();
  playingDay  = daysSinceStart();
  playingSlot = 0;
  currentDrawingIdx = getDrawingIdx(playingDay, 0);
  totalScore     = 0;
  bestScore      = 0;
  roundHistory   = [];
  currentGuesses = [];
  updateScoreDisplay();
  loadDrawing();
}

function closeResult() {
  clearTimeout(autoNextTimer);
}

// ── HELPERS ───────────────────────────────────────────────────────────────
function setStatus(msg, cls) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className   = cls || '';
}

function updateScoreDisplay() {
  document.getElementById('scoreVal').textContent = totalScore;
  document.getElementById('bestVal').textContent  = bestScore;
}

function resetAllData() {
  // Custom confirm modal instead of native confirm() which shows browser logo on Android
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;';
  const box = document.createElement('div');
  box.style.cssText = 'background:var(--surface);color:var(--text);border-radius:12px;padding:28px 24px;max-width:300px;width:90%;text-align:center;';
  box.innerHTML = `
    <div style="font-size:1.1rem;font-weight:700;margin-bottom:10px;letter-spacing:1px;">START OVER?</div>
    <div style="font-size:0.85rem;color:var(--sub);margin-bottom:24px;">This will erase all your scores, stars, and category progress. Cannot be undone.</div>
    <div style="display:flex;gap:12px;justify-content:center;">
      <button id="_reset_cancel" style="flex:1;padding:10px;border-radius:8px;border:1.5px solid var(--border);background:var(--bg);color:var(--text);font-size:0.9rem;cursor:pointer;">CANCEL</button>
      <button id="_reset_confirm" style="flex:1;padding:10px;border-radius:8px;border:none;background:#c1121f;color:#fff;font-size:0.9rem;font-weight:700;cursor:pointer;">RESET</button>
    </div>`;
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  document.getElementById('_reset_cancel').onclick = () => overlay.remove();
  document.getElementById('_reset_confirm').onclick = () => { overlay.remove(); _doResetAllData(); };
  return;
}
function _doResetAllData() {
  try {
    localStorage.removeItem('qg_idx');
    localStorage.removeItem('qg_best');
    localStorage.removeItem('qg_score');
    localStorage.removeItem('qg_progress');
    localStorage.removeItem('qg_stars');
    localStorage.removeItem('qg_cat_stars');
  } catch(e) {}
  playingDay         = daysSinceStart();
  playingSlot        = 0;
  currentDrawingIdx  = getDrawingIdx(playingDay, 0);
  currentMapNodeIdx  = 0;
  _mapSequence       = null;
  totalScore         = 0;
  bestScore          = 0;
  roundHistory       = [];
  currentGuesses     = [];
  sessionDayProgress = null;
  updateScoreDisplay();
  // Clear stale map DOM so stars don't show on next visit, then stay on stats
  const pathEl = document.getElementById('levelPath');
  if (pathEl) pathEl.innerHTML = '';
  setTimeout(() => showStatsPage(_statsReturnPage), 0);
}

// ── STORE / IAP ───────────────────────────────────────────────────────────
const STORE_KEY = 'wtd_full_access';

function hasFullAccess() {
  return true; // TODO: restore localStorage check before Play Store submission
}

function showStorePage() {
  const el = document.getElementById('storeOverlay');
  if (!el) return;
  el.classList.add('show');
  el.style.display = 'flex';

  // Build category grids using WORLD_THEMES
  const FREE_CATS = ['animals', 'food', 'vehicles', 'sports'];
  const freeGrid   = document.getElementById('storeCatsFree');
  const lockedGrid = document.getElementById('storeCatsLocked');

  function makeCatChip(key, theme, locked) {
    const chip = document.createElement('div');
    chip.className = 'store-cat-chip' + (locked ? ' locked' : '');
    chip.style.setProperty('--cat-color', theme.color);
    chip.innerHTML = `<span class="store-cat-emoji">${theme.emoji}</span><span class="store-cat-name">${key}</span>`;
    return chip;
  }

  if (freeGrid && lockedGrid && typeof WORLD_THEMES !== 'undefined') {
    freeGrid.innerHTML   = '';
    lockedGrid.innerHTML = '';
    Object.entries(WORLD_THEMES).forEach(([key, theme]) => {
      const isFree = FREE_CATS.includes(key);
      (isFree ? freeGrid : lockedGrid).appendChild(makeCatChip(key, theme, !isFree));
    });
  }

  const msg = document.getElementById('storeMsg');
  if (hasFullAccess()) {
    document.getElementById('storeBuyBtn').textContent = 'PURCHASED ✓';
    document.getElementById('storeBuyBtn').disabled = true;
    if (msg) msg.textContent = 'You have full access. Thank you for your support!';
  } else {
    document.getElementById('storeBuyBtn').textContent = 'BUY — $2.99';
    document.getElementById('storeBuyBtn').disabled = false;
    if (msg) msg.textContent = '';
  }
}

function hideStorePage() {
  const el = document.getElementById('storeOverlay');
  if (!el) return;
  el.classList.remove('show');
  el.style.display = 'none';
}

// ── CATEGORY FLOW STATE ───────────────────────────────────────────────────
let currentCatName  = null; // active category name
let currentCatIdx   = 0;    // index within that category's drawings array

// One recognisable word per category for the card thumbnail
const CAT_SAMPLE_WORD = {
  animals:     'elephant',
  food:        'pizza',
  vehicles:    'car',
  sports:      'basketball',
  nature:      'tree',
  household:   'candle',
  body:        'hand',
  clothing:    'sock',
  kitchen:     'fork',
  buildings:   'barn',
  music:       'guitar',
  tools:       'hammer',
  accessories: 'necklace',
  office:      'pencil',
  people:      'astronaut',
  weather:     'rainbow',
  space:       'rocket',
  ocean:       'whale',
  emotions:    'smiley face',
  misc:        'cannon',
};

function _renderDoodleOnCanvas(canvas, drawing) {
  if (!canvas || !drawing || !drawing.strokes || !drawing.strokes.length) return;
  const size = canvas.width;
  const ctx  = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--stroke-color').trim() || '#1a1814';
  ctx.lineWidth   = 10 * (size / 255);
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';
  const scale = size / 255;
  drawing.strokes.forEach(pathStr => {
    const p = new Path2D(pathStr);
    ctx.save();
    ctx.scale(scale, scale);
    ctx.stroke(p);
    ctx.restore();
  });
}

// ── ALL CATEGORIES PAGE ───────────────────────────────────────────────────
function showCategoriesPage() {
  if (!hasFullAccess()) { showStorePage(); return; }

  const grid = document.getElementById('catPickerGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const worlds = getWorlds();
  const stars  = loadCatStars();

  worlds.forEach(world => {
    const theme     = WORLD_THEMES[world.name] || WORLD_THEMES.misc;
    const total     = world.drawings.length;
    const played    = world.drawings.filter(d => stars[d.id] > 0).length;
    const complete  = played === total && total > 0;

    const card = document.createElement('div');
    card.className = 'cat-pick-card' + (complete ? ' complete' : '');
    card.style.setProperty('--cat-color', theme.color);

    // Canvas for sample doodle
    const canvas = document.createElement('canvas');
    canvas.width  = 80;
    canvas.height = 80;
    canvas.className = 'cat-pick-canvas';

    const meta = document.createElement('div');
    meta.className = 'cat-pick-meta';
    meta.innerHTML =
      `<span class="cat-pick-name">${world.name}</span>` +
      `<span class="cat-pick-count${complete ? ' done' : ''}">${played} / ${total}${complete ? ' ✓' : ''}</span>`;

    card.appendChild(canvas);
    card.appendChild(meta);
    card.addEventListener('click', () => showCatLevelsPage(world.name));
    grid.appendChild(card);

    // Draw sample doodle after insertion (needs to be in DOM for theme color)
    requestAnimationFrame(() => {
      const sampleWord = CAT_SAMPLE_WORD[world.name] || world.drawings[0]?.word;
      const drawing = DRAWINGS.find(d => d.word === sampleWord && d.category === world.name)
                   || DRAWINGS.find(d => d.word === sampleWord)
                   || world.drawings[0];
      _renderDoodleOnCanvas(canvas, drawing);
    });
  });

  showPage('categories');
}

// ── CATEGORY LEVELS PAGE ──────────────────────────────────────────────────
function showCatLevelsPage(catName) {
  if (catName) currentCatName = catName;
  if (!currentCatName) return;

  const worlds = getWorlds();
  const world  = worlds.find(w => w.name === currentCatName);
  if (!world) return;

  const stars = loadCatStars();
  const title = document.getElementById('catLevelsTitle');
  if (title) {
    const theme = WORLD_THEMES[currentCatName] || {};
    title.textContent = currentCatName.toUpperCase();
  }

  const grid = document.getElementById('catLevelsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  world.drawings.forEach((drawing, idx) => {
    const starCount = stars[drawing.id];
    const played    = starCount !== undefined;
    const btn       = document.createElement('div');
    btn.className   = 'cat-level-btn' + (played ? ' played' : '');
    btn.style.setProperty('--cat-color', (WORLD_THEMES[currentCatName] || {}).color || '#888');
    btn.innerHTML = played
      ? `<span class="cat-lvl-num">${idx + 1}</span><span class="cat-lvl-stars">${'★'.repeat(starCount)}</span>`
      : `<span class="cat-lvl-num">${idx + 1}</span>`;
    btn.addEventListener('click', () => playCatLevel(idx));
    grid.appendChild(btn);
  });

  showPage('cat-levels');
}

// ── CATEGORY GAMEPLAY ─────────────────────────────────────────────────────
function playCatLevel(catIdx) {
  if (!hasFullAccess()) { showStorePage(); return; }
  const worlds = getWorlds();
  const world  = worlds.find(w => w.name === currentCatName);
  if (!world || catIdx >= world.drawings.length) return;

  currentCatIdx   = catIdx;
  currentDrawing  = world.drawings[catIdx];
  currentDrawingIdx = DRAWINGS.indexOf(currentDrawing);
  gameMode        = 'category';
  soundNodeTap();
  loadDrawing();
}

function goNextCatLevel() {
  const worlds = getWorlds();
  const world  = worlds.find(w => w.name === currentCatName);
  if (!world) return;
  const next = currentCatIdx + 1;
  if (next < world.drawings.length) {
    playCatLevel(next);
  } else {
    showCatLevelsPage();
  }
}

function replayCatLevel() {
  playCatLevel(currentCatIdx);
}

function showCatLevelSummary(stars, won, score) {
  if (stars > 0) {
    for (let i = 0; i < stars; i++) setTimeout(() => soundStar(), i * 220);
  }
  const worlds = getWorlds();
  const world  = worlds.find(w => w.name === currentCatName);
  const isLast = !world || currentCatIdx >= world.drawings.length - 1;

  const sc     = getComputedStyle(document.documentElement).getPropertyValue('--stroke-color').trim() || '#1a1814';
  const bounds = getDrawingBounds(currentDrawing);
  const mini   = buildMiniPainting({ strokes: currentDrawing.strokes }, bounds, won, sc, 0, 1);

  const theme  = WORLD_THEMES[currentCatName] || {};
  document.getElementById('summaryTitle').textContent    = `${currentCatName.toUpperCase()} ${currentCatIdx + 1}`;
  document.getElementById('summaryCategory').textContent = won ? 'NICE ONE!' : 'TRY AGAIN!';
  document.getElementById('summaryCategory').style.color = won ? 'var(--correct)' : 'var(--wrong)';

  const ptsStatEl = document.getElementById('summaryTotalPts').closest('.stat');
  if (score !== null) {
    ptsStatEl.style.display = '';
    document.getElementById('summaryTotalPts').textContent = won ? `+${score}` : '0';
    document.getElementById('summaryPtsLabel').textContent = 'Points';
  } else {
    ptsStatEl.style.display = 'none';
  }
  const wonStatEl = document.getElementById('summaryWon').closest('.stat');
  wonStatEl.style.display = '';
  document.getElementById('summaryWon').innerHTML =
    '<span class="star-on">' + '★'.repeat(stars) + '</span>' +
    '<span class="star-off">' + '☆'.repeat(3 - stars) + '</span>';
  document.getElementById('summaryWonLabel').textContent = 'Stars';

  const wordColor = won
    ? 'border-color:var(--correct);color:var(--correct);background:var(--correct-bg)'
    : 'border-color:var(--wrong);color:var(--wrong);background:var(--wrong-bg)';
  document.getElementById('summaryFrames').className = 'summary-frames';
  document.getElementById('summaryFrames').innerHTML = `<div class="summary-item">
    <div class="summary-painting">${mini}</div>
    <div class="summary-info">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:1rem;letter-spacing:1.5px;padding:2px 7px;border-radius:4px;border:1px solid;${wordColor}">${won ? currentDrawing.word.toUpperCase() : '???'}</div>
    </div>
  </div>`;

  // Hide all button groups, show category ones
  ['summaryDayBtnsWon','summaryDayBtnsFail','summaryDoodleBtns',
   'summaryLevelBtnsPreview','summaryLevelBtnsWon','summaryLevelBtnsFail'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });

  if (won) {
    document.getElementById('summaryCatBtnsWon').style.display = 'flex';
    document.getElementById('summaryCatBtnsFail').style.display = 'none';
    const nextBtn = document.getElementById('catNextBtn');
    if (nextBtn) {
      nextBtn.disabled    = isLast;
      nextBtn.textContent = isLast ? 'ALL DONE!' : 'NEXT';
    }
  } else {
    document.getElementById('summaryCatBtnsWon').style.display = 'none';
    document.getElementById('summaryCatBtnsFail').style.display = 'flex';
  }

  showPage('summary');
}

function onStoreBuy() {
  // TODO: wire up Google Play Billing (one-time product purchase)
  // On success: call onPurchaseComplete() — it sets the flag and reloads the map.
  const msg = document.getElementById('storeMsg');
  if (msg) msg.textContent = 'In-app purchase coming soon. Check back after launch!';
}

function onPurchaseComplete() {
  localStorage.setItem(STORE_KEY, '1');
  if (typeof resetMapSequenceCache === 'function') resetMapSequenceCache();
  hideStorePage();
  showLevelMap(); // re-render with full nodes
}

// Free tier: first 200 levels (nodes 0–199). Full access: all levels.
const FREE_LEVEL_LIMIT = 200;

function canPlayLevel(nodeIdx) {
  // Node at FREE_LEVEL_LIMIT - 1 (index 199) is the MORE/END boundary node —
  // its click is handled separately (showStorePage), so we only gate nodes beyond it.
  return hasFullAccess() || nodeIdx < FREE_LEVEL_LIMIT - 1;
}

// ── DEV UNLOCK (tap logo 5× to toggle full access) ───────────────────────
// Strip this block before submitting to Play Store.
(function() {
  let taps = 0, timer = null;
  document.addEventListener('DOMContentLoaded', function() {
    const logo = document.getElementById('homeLogo');
    if (!logo) return;
    logo.addEventListener('click', function() {
      taps++;
      clearTimeout(timer);
      timer = setTimeout(function() { taps = 0; }, 1500);
      if (taps >= 5) {
        taps = 0;
        const now = hasFullAccess();
        localStorage.setItem(STORE_KEY, now ? '0' : '1');
        const msg = now ? 'DEV: Full access OFF' : 'DEV: Full access ON ✓';
        const toast = document.createElement('div');
        toast.textContent = msg;
        toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:8px 18px;border-radius:20px;font-size:0.75rem;font-weight:700;letter-spacing:1px;z-index:9999;pointer-events:none';
        document.body.appendChild(toast);
        setTimeout(function() { toast.remove(); location.reload(); }, 900);
      }
    });
  });
})();
