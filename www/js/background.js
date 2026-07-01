// ── HOME BG CONFIG ────────────────────────────────────────────────────────
const BG_CONFIG = {
  colors: true,          // false = use currentColor (theme ink color)
  palette: [
    '#e05c5c',           // coral red
    '#5c8ee0',           // sky blue
    '#5cc97a',           // mint green
    '#e0a83c',           // amber
    '#a05ce0',           // violet
    '#3cbfe0',           // teal
    '#e0705c',           // orange
    '#5c7ae0',           // indigo
    'black',
    'grey',
    'brown',
    // 'yellow',
    'blue',
    'red',
    'green'
  ],
  rotate: true,          // false = all doodles upright
  float: true,           // false = static, no animation
  grid: false,           // true = doodles snapped to cell centres (uniform grid)
  opacityMin: 1,
  opacityMax: 1,
  sizeMin: 50,
  sizeMax: 80,
  driftMin: 6,
  driftMax: 30,
  durMin: 8,
  durMax: 15,
  cols: 4,
  rows: 6,
};

// ── HOME / LEVEL MAP ──────────────────────────────────────────────────────
function renderHomeBg() {
  const el = document.getElementById('homeBg');
  const W = el.offsetWidth  || 390;
  const H = el.offsetHeight || 700;

  // shuffle pool
  const pool = BG_DRAWINGS.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const { cols, rows, palette, colors: useColors, rotate, float: useFloat, grid,
          opacityMin, opacityMax, sizeMin, sizeMax,
          driftMin, driftMax, durMin, durMax } = BG_CONFIG;
  const cellW = W / cols, cellH = H / rows;
  const cells = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      cells.push({cx: c * cellW, cy: r * cellH});
  // only shuffle when not in strict grid mode
  if (!grid) {
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
  }

  el.style.setProperty('--float-play', useFloat ? 'running' : 'paused');
  el.innerHTML = cells.map((cell, i) => {
    const strokes = pool[i];
    const size  = sizeMin + Math.floor(Math.random() * (sizeMax - sizeMin));
    // grid: centre of cell; random: anywhere in cell with half-size bleed
    const left  = grid ? cell.cx + (cellW - size) / 2 : cell.cx + Math.random() * cellW - size / 2;
    const top   = grid ? cell.cy + (cellH - size) / 2 : cell.cy + Math.random() * cellH - size / 2;
    const rot   = rotate ? Math.floor(Math.random() * 360) : 0;
    const op    = (opacityMin + Math.random() * (opacityMax - opacityMin)).toFixed(2);
    const color = useColors ? palette[Math.floor(Math.random() * palette.length)] : 'currentColor';
    const animStyle = useFloat
      ? `--rot:rotate(${rot}deg);--dur:${(durMin + Math.random() * (durMax - durMin)).toFixed(1)}s;--delay:${(Math.random() * -durMax).toFixed(1)}s;--drift:${driftMin + Math.floor(Math.random() * (driftMax - driftMin))}px`
      : `--rot:rotate(${rot}deg);--dur:0s;--delay:0s;--drift:0px`;
    const paths = strokes.map(d =>
      `<path d="${d}" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`
    ).join('');
    return `<div class="bg-doodle" style="top:${Math.round(top)}px;left:${Math.round(left)}px;opacity:${op};${animStyle}">
      <svg viewBox="0 0 256 256" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">${paths}</svg>
    </div>`;
  }).join('');
}
