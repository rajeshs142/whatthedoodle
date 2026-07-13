

// ── DAY SUMMARY ───────────────────────────────────────────────────────────
function buildMiniPainting(drawing, bounds, won, sc, slotIdx, totalCount) {
  if (totalCount === undefined) totalCount = CONFIG.gamesPerDay;
  const availH = window.innerHeight - 65;
  const singleGame = totalCount === 1;
  let s2;
  if (singleGame) {
    // Match intro frame size: clamp(90px, 50vw, 220px)
    const target = Math.min(Math.max(90, window.innerWidth * 0.5), 220);
    s2 = Math.max(0.5, target / 110);
  } else {
    const wScale = window.innerWidth >= 700 ? 1.7 : window.innerWidth >= 520 ? 1.3 : 1;
    const wFit   = (window.innerWidth - 24) / (totalCount * 174);
    const hScale = (availH - 220) / 130;
    s2 = Math.max(0.5, Math.min(wScale, wFit, hScale));
  }

  const fbBase = CONFIG.frameStyle === 'none' ? 1 : CONFIG.frameStyle === 'simple' ? 3 : 4;
  const fb = Math.round(fbBase * s2);
  const fs = Math.round(78 * s2);
  const sceneW = Math.round(110 * s2), sceneH = Math.round(130 * s2), hangerTop = Math.round(10 * s2);
  const cx = sceneW / 2;
  const frameTotal = fs + fb * 2;
  const hangerH = sceneH - hangerTop;
  const threadH = hangerH - frameTotal;
  const tSpread = frameTotal / 2 - Math.round(12 * s2);
  const amp = Math.round(4 * s2), cross = Math.round(3 * s2);
  const nailSz = Math.round(4 * s2);
  const total = totalCount;
  const tiltRight = CONFIG.brokenTilt === 'right' ? true
                  : CONFIG.brokenTilt === 'left'  ? false
                  : CONFIG.brokenTilt === 'random' ? Math.random() < 0.5
                  : slotIdx === 0           ? true
                  : slotIdx === total - 1   ? false
                  : Math.random() < 0.5;
  const extraSide = won ? 0 : Math.round(32 * s2);
  const outerW = sceneW + extraSide * 2;

  const svgPaths = drawing.strokes.map(p =>
    `<path d="${p}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`
  ).join('');

  let threadsSvg, hangerStyle, hangerClass;
  if (won) {
    threadsSvg = `
      <line x1="${cx}" y1="0" x2="${cx - tSpread}" y2="${threadH}" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.55"/>
      <line x1="${cx}" y1="0" x2="${cx + tSpread}" y2="${threadH}" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.55"/>`;
    hangerStyle = 'transform-origin:50% 0%;animation:painting-swing 3.5s ease-out forwards;';
    hangerClass = 'mini-hanger won';
  } else if (tiltRight) {
    const bY = Math.round(threadH * 0.48), bX = Math.round(cx - tSpread * 0.52);
    threadsSvg = `
      <line x1="${cx}" y1="0" x2="${cx + tSpread}" y2="${threadH}" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.55"/>
      <path d="${wavyPath(cx, 0, bX, bY, 3, amp)}" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.55"/>
      <line x1="${bX-cross}" y1="${bY-cross+1}" x2="${bX+cross-1}" y2="${bY+cross}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.8"/>
      <line x1="${bX-cross+1}" y1="${bY-cross}" x2="${bX+cross}" y2="${bY+cross-1}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.8"/>`;
    hangerStyle = 'transform-origin:50% 0%;animation:painting-swing-broken-left 4.5s ease-out forwards;';
    hangerClass = 'mini-hanger lost-l';
  } else {
    const bY = Math.round(threadH * 0.48), bX = Math.round(cx + tSpread * 0.52);
    threadsSvg = `
      <line x1="${cx}" y1="0" x2="${cx - tSpread}" y2="${threadH}" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.55"/>
      <path d="${wavyPath(cx, 0, bX, bY, 3, amp)}" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.55"/>
      <line x1="${bX-cross}" y1="${bY-cross+1}" x2="${bX+cross-1}" y2="${bY+cross}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.8"/>
      <line x1="${bX-cross+1}" y1="${bY-cross}" x2="${bX+cross}" y2="${bY+cross-1}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.8"/>`;
    hangerStyle = 'transform-origin:50% 0%;animation:painting-swing-broken 4.5s ease-out forwards;';
    hangerClass = 'mini-hanger lost-r';
  }

  const frameBdr = frameCSS(fb, s2);

  if (!CONFIG.showSwing) {
    const angle = won ? 0 : (tiltRight ? -22 : 22);
    hangerStyle = `transform-origin:50% 0%;transform:rotate(${angle}deg)`;
  }

  const miniNail = CONFIG.showNail
    ? `<div style="position:absolute;top:${Math.round(5*s2)}px;left:50%;transform:translateX(-50%);width:${nailSz}px;height:${nailSz}px;background:var(--stroke-color);border-radius:50%;z-index:3"></div>`
    : '';
  const miniThread = CONFIG.showThread
    ? `<svg style="position:absolute;top:0;left:0;width:100%;height:${threadH}px;overflow:visible" xmlns="http://www.w3.org/2000/svg">${threadsSvg}</svg>`
    : '';
  return `
    <div style="position:relative;width:${outerW}px;height:${sceneH}px;flex-shrink:0">
      <div style="position:absolute;top:0;left:${extraSide}px;width:${sceneW}px;height:${sceneH}px">
        ${miniNail}
        <div class="${hangerClass}" style="position:absolute;top:${hangerTop}px;left:0;right:0;bottom:0;${hangerStyle}">
          ${miniThread}
          <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);${frameBdr}">
            <svg viewBox="${svgViewBox(bounds, 40)}" width="${fs}" height="${fs}" xmlns="http://www.w3.org/2000/svg">${svgPaths}</svg>
          </div>
        </div>
      </div>
    </div>`;
}

function wireSummaryHover(framesEl) {
  framesEl.querySelectorAll('.summary-painting').forEach(painting => {
    const h = painting.querySelector('.mini-hanger');
    if (!h) return;
    if (h.classList.contains('won')) {
      if (CONFIG.showSwing) painting.addEventListener('mouseenter', () => {
        if (h.dataset.swaying) return;
        h.dataset.swaying = '1';
        h.classList.add('sway-active');
        h.addEventListener('animationend', () => {
          h.style.animation = 'none';
          h.style.transform = 'rotate(0deg)';
          h.classList.remove('sway-active');
          delete h.dataset.swaying;
        }, { once: true });
      });
    } else if (CONFIG.showSwing) {
      painting.addEventListener('mouseenter', () => h.classList.add('straightened'));
      painting.addEventListener('mouseleave', () => h.classList.remove('straightened'));
    }
  });
}

// ── DOODLE ────────────────────────────────────────────────────────────────

const DOODLE_KEY = 42;
function obfuscate(str) {
  return Array.from(str).map(c => (c.charCodeAt(0) ^ DOODLE_KEY).toString(16).padStart(2,'0')).join('');
}
function deobfuscate(hex) {
  const r = [];
  for (let i = 0; i + 1 < hex.length; i += 2)
    r.push(String.fromCharCode(parseInt(hex.slice(i, i+2), 16) ^ DOODLE_KEY));
  return r.join('');
}

function rdpSimplify(pts, eps) {
  if (pts.length < 3) return pts;
  const first = pts[0], last = pts[pts.length-1];
  const dx = last.x - first.x, dy = last.y - first.y;
  const lenSq = dx*dx + dy*dy;
  let maxD = 0, maxI = 0;
  for (let i = 1; i < pts.length-1; i++) {
    const d = lenSq === 0
      ? Math.hypot(pts[i].x - first.x, pts[i].y - first.y)
      : Math.abs(dy*pts[i].x - dx*pts[i].y + last.x*first.y - last.y*first.x) / Math.sqrt(lenSq);
    if (d > maxD) { maxD = d; maxI = i; }
  }
  if (maxD > eps) {
    const L = rdpSimplify(pts.slice(0, maxI+1), eps);
    const R = rdpSimplify(pts.slice(maxI), eps);
    return [...L.slice(0,-1), ...R];
  }
  return [first, last];
}

function strokeToPath(pts) {
  if (!pts.length) return '';
  const c = pts.map(p => `${Math.round(p.x)},${Math.round(p.y)}`);
  return 'M ' + c[0] + (c.length > 1 ? ' L ' + c.slice(1).join(' L ') : '');
}

function generateDoodleUrl(payload) {
  const json = JSON.stringify(payload);
  let enc;
  try {
    enc = typeof LZString !== 'undefined'
      ? LZString.compressToEncodedURIComponent(json)
      : btoa(unescape(encodeURIComponent(json)));
  } catch(e) { enc = btoa(json); }
  return window.location.href.split('?')[0] + '?doodle=' + enc;
}

function decodeDoodleUrl(encoded) {
  try {
    const json = typeof LZString !== 'undefined'
      ? LZString.decompressFromEncodedURIComponent(encoded)
      : decodeURIComponent(escape(atob(encoded)));
    return json ? JSON.parse(json) : null;
  } catch(e) { return null; }
}

// ── DOODLE STATE ─────────────────────────────────────────────────────────
let isDoodleMode     = false;
let doodlePlayData   = null;
let _savedDrawTime   = 0, _savedGuessTime = 0;
let _doodleWon       = false, _doodleScore = 0, _doodleUrl = '';
let _doodleQueue     = [], _doodleQueueIdx = 0, _doodleResults = [];
let doodleStrokes    = [];
let doodleCurrentPts = [];
let doodleIsDrawing  = false;
let doodleStrokeWidth = 2;
const MAX_DOODLE_STROKES = 8;
const MAX_STROKE_PTS     = 50;
const DOODLE_SLOTS_KEY   = 'qg_doodles';

// ── DOODLE SLOTS ──────────────────────────────────────────────────────────
function loadDoodleSlots() {
  try { return JSON.parse(localStorage.getItem(DOODLE_SLOTS_KEY) || '[]'); } catch(e) { return []; }
}
function saveDoodleSlots(slots) {
  try { localStorage.setItem(DOODLE_SLOTS_KEY, JSON.stringify(slots)); } catch(e) {}
}

function showDoodlesPage() {
  document.getElementById('doodle-dt').value = CONFIG.drawTime;
  document.getElementById('doodle-gt').value = CONFIG.guessTime;
  renderDoodleSlots();
  showPage('doodles');
}

let _selectedDoodles = new Set();

function renderDoodleSlots() {
  _selectedDoodles = new Set();
  const slots = loadDoodleSlots();
  const container = document.getElementById('doodleSlotsContainer');
  container.innerHTML = '';
  if (slots.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'doodle-slot-empty';
    empty.innerHTML = '<div class="doodle-slot-empty-label">NO DOODLES YET</div>';
    container.appendChild(empty);
  } else {
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      const hint = s.word.toUpperCase();
      const card = document.createElement('div');
      card.className = 'doodle-slot-card';
      card.innerHTML = `
        <input type="checkbox" class="doodle-slot-check" data-idx="${i}" onchange="toggleDoodleSelect(${i}, this)"/>
        <div class="doodle-slot-info">
          <div class="doodle-word-hint">${hint.trim()}</div>
          <div class="doodle-slot-meta">
            ${s.name ? `<div class="doodle-slot-name">${s.name}</div>` : ''}
            <div class="doodle-slot-date">${s.created}</div>
          </div>
        </div>
        <button class="sw-btn doodle-del-btn" onclick="deleteDoodle(${i})">DEL</button>`;
      container.appendChild(card);
    }
  }
  const newBtn = document.getElementById('newDoodleBtn');
  const full = slots.length >= 10;
  newBtn.onclick     = full ? null : startNewDoodle;
  newBtn.textContent = full ? 'MAX 10 REACHED — DELETE ONE FIRST' : '+ NEW DOODLE';
  newBtn.style.opacity = full ? '0.45' : '';
  updateShareDoodlesBtn();
}

function toggleDoodleSelect(idx, checkbox) {
  if (checkbox.checked) {
    if (_selectedDoodles.size >= 3) { checkbox.checked = false; return; }
    _selectedDoodles.add(idx);
  } else {
    _selectedDoodles.delete(idx);
  }
  updateShareDoodlesBtn();
}

function updateShareDoodlesBtn() {
  const btn = document.getElementById('shareDoodlesBtn');
  if (!btn) return;
  const n = _selectedDoodles.size;
  btn.textContent = n > 0 ? `SHARE (${n})` : 'SHARE';
  const msg = document.getElementById('shareDoodlesMsg');
  if (msg && n > 0) msg.textContent = '';
}

function deleteDoodle(idx) {
  const slots = loadDoodleSlots();
  slots.splice(idx, 1);
  saveDoodleSlots(slots);
  renderDoodleSlots();
}

// ── WORD SUGGEST ──────────────────────────────────────────────────────────
let _scribbleWords = null;
function _loadScribbleWords(cb) {
  if (_scribbleWords) { cb(_scribbleWords); return; }
  const urls = ['scribblio_word_list.txt', 'www/scribblio_word_list.txt'];
  function tryNext(i) {
    if (i >= urls.length) {
      // Fallback: use game drawing words
      _scribbleWords = (typeof DRAWINGS !== 'undefined' ? DRAWINGS.map(d => d.word) : ['cat','dog','house','car','tree']);
      cb(_scribbleWords);
      return;
    }
    fetch(urls[i])
      .then(r => { if (!r.ok) throw new Error(); return r.text(); })
      .then(t => {
        _scribbleWords = t.split(/[,\n]/).map(w => w.trim()).filter(Boolean);
        cb(_scribbleWords);
      })
      .catch(() => tryNext(i + 1));
  }
  tryNext(0);
}
function suggestDoodleWord() {
  _loadScribbleWords(words => {
    const w = words[Math.floor(Math.random() * words.length)];
    document.getElementById('doodle-word').value = w;
    clearDoodleError();
  });
}

// ── DOODLE CREATE ─────────────────────────────────────────────────────────
function startNewDoodle() {
  doodleStrokes    = [];
  doodleCurrentPts = [];
  doodleIsDrawing  = false;
  doodleStrokeWidth = 2;
  document.getElementById('doodle-word').value = '';
  document.getElementById('doodleCreateError').textContent = '';
  document.querySelectorAll('.sw-btn[data-sw]').forEach(b =>
    b.classList.toggle('active', parseInt(b.dataset.sw) === 2));
  showPage('create');
  setTimeout(initDoodleCanvas, 60);
}

function initDoodleCanvas() {
  const canvas = document.getElementById('doodleCanvas');
  if (!canvas) return;
  // Remove old listeners before re-adding
  const fresh = canvas.cloneNode(false);
  canvas.parentNode.replaceChild(fresh, canvas);
  const c = document.getElementById('doodleCanvas');
  const wrap = c.parentElement;
  const size = Math.min(wrap.clientWidth - 4, wrap.clientHeight - 4, 360);
  c.width  = Math.max(size, 120);
  c.height = Math.max(size, 120);
  c.addEventListener('pointerdown', onDoodleDown, { passive: false });
  c.addEventListener('pointermove', onDoodleMove, { passive: false });
  c.addEventListener('pointerup',   onDoodleUp,   { passive: false });
  c.addEventListener('pointercancel', onDoodleUp, { passive: false });
  redrawDoodleCanvas();
}

function redrawDoodleCanvas() {
  const canvas = document.getElementById('doodleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const color = getComputedStyle(document.documentElement).getPropertyValue('--stroke-color').trim() || '#1a1814';
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const stroke of doodleStrokes) {
    if (stroke.pts.length < 2) continue;
    ctx.beginPath();
    ctx.lineWidth   = stroke.sw;
    ctx.strokeStyle = color;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.moveTo(stroke.pts[0].x, stroke.pts[0].y);
    for (let i = 1; i < stroke.pts.length; i++) ctx.lineTo(stroke.pts[i].x, stroke.pts[i].y);
    ctx.stroke();
  }
  updateDoodleStrokeInfo();
}

function getDoodlePos(e, canvas) {
  const r   = canvas.getBoundingClientRect();
  const src = e.touches ? e.touches[0] : e;
  return {
    x: (src.clientX - r.left) * (canvas.width  / r.width),
    y: (src.clientY - r.top)  * (canvas.height / r.height),
  };
}

function onDoodleDown(e) {
  if (doodleStrokes.length >= MAX_DOODLE_STROKES) return;
  e.preventDefault();
  const canvas = e.currentTarget;
  canvas.setPointerCapture(e.pointerId);
  doodleIsDrawing  = true;
  doodleCurrentPts = [];
  const pos = getDoodlePos(e, canvas);
  doodleCurrentPts.push(pos);
  const ctx   = canvas.getContext('2d');
  const color = getComputedStyle(document.documentElement).getPropertyValue('--stroke-color').trim() || '#1a1814';
  ctx.beginPath();
  ctx.lineWidth   = doodleStrokeWidth;
  ctx.strokeStyle = color;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';
  ctx.moveTo(pos.x, pos.y);
}

function onDoodleMove(e) {
  if (!doodleIsDrawing) return;
  e.preventDefault();
  const canvas = e.currentTarget;
  const pos    = getDoodlePos(e, canvas);
  doodleCurrentPts.push(pos);
  const ctx = canvas.getContext('2d');
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
}

function onDoodleUp(e) {
  if (!doodleIsDrawing) return;
  doodleIsDrawing = false;
  e.preventDefault();
  let pts = rdpSimplify(doodleCurrentPts, 2);
  if (pts.length > MAX_STROKE_PTS) pts = rdpSimplify(doodleCurrentPts, 5);
  if (pts.length > MAX_STROKE_PTS) pts = pts.filter((_, i) => i % 2 === 0 || i === pts.length-1);
  if (pts.length >= 2) doodleStrokes.push({ pts, sw: doodleStrokeWidth });
  doodleCurrentPts = [];
  redrawDoodleCanvas();
  updateDoodleCreateBtn();
}

function setDoodleSW(sw) {
  doodleStrokeWidth = sw;
  document.querySelectorAll('.sw-btn[data-sw]').forEach(b =>
    b.classList.toggle('active', parseInt(b.dataset.sw) === sw));
}

function doodleUndo() {
  doodleStrokes.pop();
  redrawDoodleCanvas();
  updateDoodleCreateBtn();
}

function doodleClear() {
  doodleStrokes = [];
  redrawDoodleCanvas();
  updateDoodleCreateBtn();
}

function updateDoodleStrokeInfo() {
  const rem = MAX_DOODLE_STROKES - doodleStrokes.length;
  const el  = document.getElementById('doodleStrokeInfo');
  if (el) el.textContent = rem === 0
    ? 'MAX STROKES REACHED, UNDO TO CONTINUE'
    : `${rem} STROKE${rem === 1 ? '' : 'S'} REMAINING`;
}

function updateDoodleCreateBtn() {}
function clearDoodleError() {
  document.getElementById('doodleCreateError').textContent = '';
}

function backFromCreate() {
  renderDoodleSlots();
  showPage('doodles');
}

function createDoodle() {
  const errEl = document.getElementById('doodleCreateError');
  const word  = document.getElementById('doodle-word').value.trim();
  if (!doodleStrokes.length) { errEl.textContent = 'Draw something first!'; return; }
  if (!word) { errEl.textContent = 'Enter what you drew!'; return; }
  errEl.textContent = '';

  const name = (document.getElementById('doodle-name').value || '').trim();
  const dt   = Math.max(5, Math.min(60, parseInt(document.getElementById('doodle-dt').value)  || 15));
  const gt   = Math.max(5, Math.min(60, parseInt(document.getElementById('doodle-gt').value) || 10));

  const payload = { w: obfuscate(word), s: doodleStrokes.map(s => strokeToPath(s.pts)), dt, gt, sw: doodleStrokeWidth };
  if (name) payload.n = name;

  const slots = loadDoodleSlots();
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  slots.push({ word, name, created: today, payload });
  saveDoodleSlots(slots.slice(-10));

  renderDoodleSlots();
  showPage('doodles');
}

// ── DOODLE PLAY ───────────────────────────────────────────────────────────
function loadDoodleFromUrl(encoded) {
  const data = decodeDoodleUrl(encoded);
  if (!data) return false;
  const payloads = Array.isArray(data) ? data : [data];
  if (!payloads.length || !payloads[0].w || !payloads[0].s || !payloads[0].s.length) return false;

  _doodleQueue    = payloads;
  _doodleQueueIdx = 0;
  _doodleResults  = [];
  _doodleUrl      = 'https://playdropstack.com/whatthedoodle/?doodle=' + encoded;
  _savedDrawTime  = CONFIG.drawTime;
  _savedGuessTime = CONFIG.guessTime;
  isDoodleMode    = true;
  playDoodleFromQueue();
  return true;
}

function showDoodleLobby() {
  const first = _doodleQueue[0];
  const who   = first.n ? first.n.toUpperCase() : 'A FRIEND';
  const n     = _doodleQueue.length;

  document.getElementById('introTitle').textContent    = `${who}'S CHALLENGE`;
  document.getElementById('introSubtitle').textContent = n === 1 ? '1 DRAWING' : `${n} DRAWINGS`;
  document.getElementById('introSubtitle').style.display = '';
  document.getElementById('introCategory').style.display  = 'none';

  const introBorder = CONFIG.frameStyle === 'none'
    ? 'border:1px solid var(--border);border-radius:6px'
    : CONFIG.frameStyle === 'simple'
      ? 'border:4px solid var(--frame);border-radius:5px;box-shadow:inset 0 0 0 1px var(--frame-dark),0 4px 14px var(--frame-shadow)'
      : 'border:6px solid var(--frame);border-radius:2px;box-shadow:inset 0 0 0 2px var(--frame-dark),inset 0 0 10px rgba(0,0,0,0.12),4px 8px 18px var(--frame-shadow)';
  document.getElementById('introFrames').innerHTML =
    Array.from({ length: n }, () => `<div class="intro-frame" style="${introBorder}"></div>`).join('');

  showPage('intro');
}

function playDoodleFromQueue() {
  const data = _doodleQueue[_doodleQueueIdx];
  isDoodleMode   = true;
  doodlePlayData = data;
  CONFIG.drawTime  = Math.max(5, Math.min(60, data.dt || 15));
  CONFIG.guessTime = Math.max(5, Math.min(60, data.gt || 10));

  currentDrawing = { word: deobfuscate(data.w), synonyms: [], category: 'doodle', strokes: data.s };
  drawingBounds  = getDrawingBounds(currentDrawing);

  const hdr = document.getElementById('doodlePlayHeader');
  const total = _doodleQueue.length;
  const who   = data.n ? data.n + "'s" : "A friend's";
  hdr.textContent  = total > 1
    ? `${who} doodle (${_doodleQueueIdx + 1}/${total})`
    : `${who} doodle`;
  hdr.style.display = '';

  animGeneration++;
  clearInterval(timerInterval);
  timerInterval   = null;
  revealedStrokes = 0;
  gameOver        = false;
  timeLeft        = CONFIG.drawTime + CONFIG.guessTime;
  currentGuesses  = [];

  const inp = document.getElementById('guessInput');
  inp.value    = '';
  inp.disabled = false;
  setStatus('');
  showPage('game');
  sizeCanvas();
  resetCanvasWrap();
  clearCanvas();
  updateTimerDisplay(timeLeft, timeLeft);
  startGame();
}

function exitDoodleMode() {
  isDoodleMode = false;
  CONFIG.drawTime  = _savedDrawTime;
  CONFIG.guessTime = _savedGuessTime;
  document.getElementById('doodlePlayHeader').style.display = 'none';
}

function doodleNextOrSummary() {
  clearTimeout(autoNextTimer);
  _doodleQueueIdx++;
  if (_doodleQueueIdx < _doodleQueue.length) {
    playDoodleFromQueue();
  } else {
    showDoodleSummary();
  }
}

function showDoodleSummary() {
  exitDoodleMode();
  closeResult();
  const sc = getComputedStyle(document.documentElement).getPropertyValue('--stroke-color').trim() || '#1a1814';
  const n  = _doodleResults.length;
  const wonCount  = _doodleResults.filter(r => r.won).length;
  const totalPts  = _doodleResults.reduce((a, r) => a + (r.won ? r.score : 0), 0);

  const cat = document.getElementById('summaryCategory');
  if (wonCount === n) {
    document.getElementById('summaryTitle').textContent = 'CLEAN SWEEP!';
    cat.textContent = 'WELL DONE!'; cat.style.color = 'var(--correct)';
  } else if (wonCount > 0) {
    document.getElementById('summaryTitle').textContent = 'WELL PLAYED!';
    cat.textContent = `${wonCount} OF ${n} CORRECT`; cat.style.color = 'var(--correct)';
  } else {
    document.getElementById('summaryTitle').textContent = 'BETTER LUCK!';
    cat.textContent = 'KEEP TRYING'; cat.style.color = 'var(--wrong)';
  }
  document.getElementById('summaryTotalPts').textContent = totalPts;
  document.getElementById('summaryWon').textContent      = `${wonCount}/${n}`;

  const items = _doodleResults.map((r, i) => {
    const drawing = { strokes: r.strokes };
    const mini    = buildMiniPainting(drawing, r.bounds, r.won, sc, i, n);
    const wordColor = r.won
      ? 'border-color:var(--correct);color:var(--correct);background:var(--correct-bg)'
      : 'border-color:var(--wrong);color:var(--wrong);background:var(--wrong-bg)';
    const ptsText = r.won ? `+${r.score} pts` : '0 pts';
    return `
      <div class="summary-item">
        <div class="summary-painting">${mini}</div>
        <div class="summary-info">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:1rem;letter-spacing:1.5px;padding:2px 7px;border-radius:4px;border:1px solid;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;display:inline-block;${wordColor}">${r.word.toUpperCase()}</div>
          <div style="font-size:0.7rem;color:var(--sub);margin-top:3px">${ptsText}</div>
        </div>
      </div>`;
  });

  const framesEl = document.getElementById('summaryFrames');
  framesEl.className = 'summary-frames';
  framesEl.innerHTML = items.join('');
  wireSummaryHover(framesEl);

  document.getElementById('summaryDayBtnsWon').style.display  = 'none';
  document.getElementById('summaryDayBtnsFail').style.display = 'none';
  document.getElementById('playAgainBtn').style.display      = 'none';
  document.getElementById('summaryDoodleBtns').style.display = 'flex';

  showPage('summary');
}

function showDoodleResult(won, score) {
  exitDoodleMode();
  _doodleWon   = won;
  _doodleScore = score;
  _doodleResults.push({ won, score, word: currentDrawing.word });

  const title = document.getElementById('doodleResultTitle');
  title.textContent = won ? 'YOU GOT IT!' : 'NOT THIS TIME!';
  title.className   = 'overlay-title ' + (won ? 'win' : 'lose');
  document.getElementById('doodleResultWord').textContent = currentDrawing.word.toUpperCase();

  const statDiv = document.getElementById('doodleResultStat');
  if (won) {
    document.getElementById('doodleResultScore').textContent = score;
    statDiv.style.display = '';
  } else {
    statDiv.style.display = 'none';
  }

  const hasNext = _doodleQueueIdx < _doodleQueue.length - 1;
  const nextBtn = document.getElementById('doodleNextBtn');
  nextBtn.style.display   = hasNext ? '' : 'none';
  nextBtn.textContent     = `NEXT DOODLE (${_doodleQueueIdx + 2}/${_doodleQueue.length}) →`;
  document.getElementById('doodleShareResultBtn').style.display = hasNext ? 'none' : '';

  showPage('doodle-result');
}

function doodleNext() {
  _doodleQueueIdx++;
  playDoodleFromQueue();
}

function showDaySummary() {
  // Always rebuild from storage when the day is already complete (covers re-entry from any mode)
  const stored = loadProgress()[playingDay] || [];
  const dayComplete = firstIncompleteSlot(playingDay) >= CONFIG.gamesPerDay;
  if (dayComplete || roundHistory.length === 0) {
    roundHistory = [];
    for (let i = 0; i < CONFIG.gamesPerDay; i++) {
      const score = stored[i] ?? 0;
      const drawing = DRAWINGS[getDrawingIdx(playingDay, i)];
      roundHistory.push({ word: drawing ? drawing.word : '?', score, won: score > 0 });
    }
  }

  const sc = getComputedStyle(document.documentElement).getPropertyValue('--stroke-color').trim() || '#1a1814';
  const n  = roundHistory.length;
  const wonCount = roundHistory.filter(r => r.won).length;
  const totalPts = roundHistory.reduce((a, r) => a + (r.won ? r.score : 0), 0);

  document.getElementById('summaryTitle').textContent = `DAY ${playingDay + 1}`;

  const resultText = wonCount === n ? 'CLEAN SWEEP!' : wonCount > 0 ? 'WELL PLAYED!' : 'BETTER LUCK!';
  const cat2 = document.getElementById('summaryCategory');
  cat2.textContent = resultText;
  cat2.style.color = wonCount > 0 ? 'var(--correct)' : 'var(--wrong)';
  document.getElementById('summaryTotalPts').closest('.stat').style.display = '';
  document.getElementById('summaryTotalPts').textContent = totalPts;
  document.getElementById('summaryPtsLabel').textContent = 'Points';

  const statsEl = document.getElementById('summaryWon').closest('.stat');
  if (n === 1) {
    statsEl.style.display = 'none';
  } else {
    statsEl.style.display = '';
    document.getElementById('summaryWon').textContent     = `${wonCount}/${n}`;
    document.getElementById('summaryWonLabel').textContent = 'Correct';
  }

  const items = roundHistory.map((r, i) => {
    const drawing = DRAWINGS[getDrawingIdx(playingDay, i)];
    const bounds  = getDrawingBounds(drawing);
    const mini    = buildMiniPainting({ strokes: drawing.strokes }, bounds, r.won, sc, i, n);
    const wordColor = r.won
      ? 'border-color:var(--correct);color:var(--correct);background:var(--correct-bg)'
      : 'border-color:var(--wrong);color:var(--wrong);background:var(--wrong-bg)';
    return `
      <div class="summary-item">
        <div class="summary-painting">${mini}</div>
        <div class="summary-info">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:1rem;letter-spacing:1.5px;padding:2px 7px;border-radius:4px;border:1px solid;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;display:inline-block;${wordColor}">${r.won ? r.word.toUpperCase() : '???'}</div>
          <div style="font-size:0.7rem;color:var(--sub);margin-top:3px">${r.won ? `+${r.score} pts` : '0 pts'}</div>
        </div>
      </div>`;
  });

  const framesEl = document.getElementById('summaryFrames');
  framesEl.className = 'summary-frames';
  framesEl.innerHTML = items.join('');
  wireSummaryHover(framesEl);

  const dayWon = wonCount === n;
  document.getElementById('summaryDayBtnsWon').style.display  = dayWon ? 'flex' : 'none';
  document.getElementById('summaryDayBtnsFail').style.display = dayWon ? 'none' : 'flex';
  document.getElementById('summaryDoodleBtns').style.display  = 'none';
  document.getElementById('summaryCatBtnsWon').style.display  = 'none';
  document.getElementById('summaryCatBtnsFail').style.display = 'none';
  document.getElementById('summaryLevelBtnsPreview').style.display = 'none';
  document.getElementById('summaryLevelBtnsWon').style.display     = 'none';
  document.getElementById('summaryLevelBtnsFail').style.display    = 'none';

  showPage('summary');
}
