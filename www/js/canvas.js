function sizeCanvas() {
  const wrap = document.querySelector('.canvas-wrap');
  const margin = window.innerWidth <= 480 ? 32 : 0;
  const size = Math.max(CONFIG.canvasMin, Math.min(wrap.clientWidth - margin, wrap.clientHeight - margin, CONFIG.canvasMax));
  canvasSize = size;
  const canvas = document.getElementById('drawCanvas');
  canvas.width  = size;
  canvas.height = size;
  if (currentDrawing && revealedStrokes > 0) redrawCanvas();
}

// ── CANVAS RENDERING ──────────────────────────────────────────────────────
function clearCanvas() {
  const canvas = document.getElementById('drawCanvas');
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

function resetCanvasWrap() {
  document.querySelector('.canvas-wrap').style.animation = '';
}

function getDrawingBounds(drawing) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const pathStr of drawing.strokes) {
    const re = /([ML])\s*([-\d.,\s]*)/gi;
    let m;
    while ((m = re.exec(pathStr)) !== null) {
      const nums = m[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
      for (let i = 0; i + 1 < nums.length; i += 2) {
        minX = Math.min(minX, nums[i]);   maxX = Math.max(maxX, nums[i]);
        minY = Math.min(minY, nums[i+1]); maxY = Math.max(maxY, nums[i+1]);
      }
    }
  }
  return isFinite(minX) ? { minX, minY, maxX, maxY } : null;
}

function svgViewBox(bounds, pad) {
  if (!bounds) return '0 0 256 256';
  const p = pad ?? 14;
  return `${bounds.minX - p} ${bounds.minY - p} ${bounds.maxX - bounds.minX + 2*p} ${bounds.maxY - bounds.minY + 2*p}`;
}

function ctxSetup() {
  const canvas = document.getElementById('drawCanvas');
  const ctx    = canvas.getContext('2d');
  const scale  = canvasSize / 256;
  const color  = getComputedStyle(document.documentElement)
    .getPropertyValue('--stroke-color').trim() || '#1a1814';
  ctx.save();
  ctx.scale(scale, scale);

  let lw = CONFIG.strokeWidth / scale;
  if (drawingBounds) {
    const { minX, minY, maxX, maxY } = drawingBounds;
    const cx   = (minX + maxX) / 2;
    const cy   = (minY + maxY) / 2;
    const pad  = 40;
    const fit  = Math.min((256 - 2*pad) / Math.max(maxX - minX, 1),
                          (256 - 2*pad) / Math.max(maxY - minY, 1));
    ctx.translate(128, 128);
    ctx.scale(fit, fit);
    ctx.translate(-cx, -cy);
    lw = CONFIG.strokeWidth / (scale * fit);
  }

  ctx.strokeStyle = color;
  ctx.lineWidth   = lw;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';
  return ctx;
}

function redrawCanvas() {
  clearCanvas();
  const ctx = ctxSetup();
  for (let i = 0; i < revealedStrokes; i++)
    ctx.stroke(new Path2D(currentDrawing.strokes[i]));
  ctx.restore();
}

function renderAllStrokes(sampledPaths, t) {
  clearCanvas();
  const ctx = ctxSetup();
  for (const sp of sampledPaths) {
    const partial = getPartialPath(sp, t);
    if (partial) ctx.stroke(new Path2D(partial));
  }
  ctx.restore();
}

function renderStroke(strokeIdx, sampledPath, progress) {
  clearCanvas();
  const ctx = ctxSetup();
  for (let i = 0; i < strokeIdx; i++)
    ctx.stroke(new Path2D(currentDrawing.strokes[i]));
  const partial = getPartialPath(sampledPath, progress);
  if (partial) ctx.stroke(new Path2D(partial));
  ctx.restore();
}

function renderOrdered(doneSet, activeIdx, sampledPath, progress) {
  clearCanvas();
  const ctx = ctxSetup();
  for (const i of doneSet)
    ctx.stroke(new Path2D(currentDrawing.strokes[i]));
  const partial = getPartialPath(sampledPath, progress);
  if (partial) ctx.stroke(new Path2D(partial));
  ctx.restore();
}

function renderPair(doneIndices, pairIndices, sampledPair, progress) {
  clearCanvas();
  const ctx = ctxSetup();
  for (const i of doneIndices)
    ctx.stroke(new Path2D(currentDrawing.strokes[i]));
  for (let p = 0; p < pairIndices.length; p++) {
    const partial = getPartialPath(sampledPair[p], progress);
    if (partial) ctx.stroke(new Path2D(partial));
  }
  ctx.restore();
}

// ── PATH HELPERS ──────────────────────────────────────────────────────────
function samplePath(pathStr) {
  const moves = [];
  const re    = /([MLQCZAz])\s*([-\d.,\s]*)/gi;
  let m;
  while ((m = re.exec(pathStr)) !== null) {
    const cmd  = m[1].toUpperCase();
    const nums = m[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (cmd === 'M') {
      for (let i = 0; i + 1 < nums.length; i += 2)
        moves.push({ type: i === 0 ? 'M' : 'L', x: nums[i], y: nums[i + 1] });
    } else if (cmd === 'L') {
      for (let i = 0; i + 1 < nums.length; i += 2)
        moves.push({ type: 'L', x: nums[i], y: nums[i + 1] });
    }
  }
  return moves;
}

function getPartialPath(moves, t) {
  if (!moves.length) return '';
  if (t >= 1) return moves.map(mv => mv.type + ' ' + mv.x + ',' + mv.y).join(' ');
  if (t <= 0) return 'M ' + moves[0].x + ',' + moves[0].y;

  const cumLens = new Array(moves.length).fill(0);
  let total = 0;
  for (let i = 1; i < moves.length; i++) {
    if (moves[i].type === 'L') {
      const dx = moves[i].x - moves[i - 1].x;
      const dy = moves[i].y - moves[i - 1].y;
      total += Math.sqrt(dx * dx + dy * dy);
    }
    cumLens[i] = total;
  }

  if (total === 0) return moves.map(mv => mv.type + ' ' + mv.x + ',' + mv.y).join(' ');

  const target = total * t;
  let d = '';

  for (let i = 0; i < moves.length; i++) {
    const mv = moves[i];
    if (cumLens[i] < target) {
      d += ' ' + mv.type + ' ' + mv.x + ',' + mv.y;
    } else if (i > 0 && mv.type === 'L') {
      const segStart = cumLens[i - 1];
      const segLen   = cumLens[i] - segStart;
      const frac     = segLen > 0 ? (target - segStart) / segLen : 1;
      const ix = moves[i - 1].x + (mv.x - moves[i - 1].x) * frac;
      const iy = moves[i - 1].y + (mv.y - moves[i - 1].y) * frac;
      d += ' L ' + ix + ',' + iy;
      break;
    } else {
      break;
    }
  }

  return d.trim();
}

// ── PATH UTILS ────────────────────────────────────────────────────────────
function wavyPath(x0, y0, x1, y1, waves, amp) {
  const dx = x1-x0, dy = y1-y0, len = Math.hypot(dx, dy);
  const px = -dy/len, py = dx/len;
  const n = waves * 2;
  let d = `M ${x0} ${y0}`;
  for (let i = 0; i < n; i++) {
    const side = (i % 2 === 0 ? 1 : -1) * amp;
    const ct = (i + 0.5) / n, et = (i + 1) / n;
    d += ` Q ${+(x0+ct*dx+side*px).toFixed(1)} ${+(y0+ct*dy+side*py).toFixed(1)} ${+(x0+et*dx).toFixed(1)} ${+(y0+et*dy).toFixed(1)}`;
  }
  return d;
}

// ── FRAME STYLE HELPER ────────────────────────────────────────────────────
function frameCSS(b, s) {
  // b = border px (already scaled), s = shadow scale factor
  const r = n => Math.round(n * s);
  if (CONFIG.frameStyle === 'none') {
    return `border:1px solid var(--border);border-radius:6px;background:var(--canvas-bg);line-height:0`;
  }
  if (CONFIG.frameStyle === 'simple') {
    return `border:${b}px solid var(--frame);border-radius:5px;box-shadow:inset 0 0 0 1px var(--frame-dark),0 ${r(4)}px ${r(14)}px var(--frame-shadow);background:var(--canvas-bg);line-height:0`;
  }
  // classic
  return `border:${b}px solid var(--frame);border-radius:2px;box-shadow:inset 0 0 0 ${r(2)}px var(--frame-dark),inset 0 0 ${r(10)}px rgba(0,0,0,0.2),0 0 0 1px var(--frame-dark),${r(5)}px ${r(10)}px ${r(22)}px var(--frame-shadow);background:var(--canvas-bg);line-height:0`;
}

function applyFrame() {
  const canvas = document.getElementById('drawCanvas');
  canvas.classList.remove('frame-simple', 'frame-classic');
  if (CONFIG.frameStyle !== 'none') canvas.classList.add('frame-' + CONFIG.frameStyle);
}

function applyTheme(theme) {
  ['dark','sepia','ocean','forest'].forEach(t => document.documentElement.classList.remove(t));
  if (theme !== 'light') document.documentElement.classList.add(theme);
  currentTheme = theme;
  CONFIG.theme = theme;
}

function toggleDark() {
  const next = currentTheme === 'dark' ? CONFIG.theme : 'dark';
  applyTheme(next);
  try { localStorage.setItem('qg_theme', next); } catch(e) {}
  if (revealedStrokes > 0) redrawCanvas();
}
