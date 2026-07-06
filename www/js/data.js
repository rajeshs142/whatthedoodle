// ── LEVEL MODE STATE ──────────────────────────────────────────────────────
let gameMode          = 'levels'; // 'levels' | 'daily'
let currentMapNodeIdx = 0;        // index into buildMapSequence().nodes
let _worlds           = null;
let _mapSequence      = null;     // cached result of buildMapSequence()

// ── SHUFFLE DRAWINGS ──────────────────────────────────────────────────────
(function shuffleDrawings() {
  let s = CONFIG.seed >>> 0;
  function rand() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  for (let i = DRAWINGS.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [DRAWINGS[i], DRAWINGS[j]] = [DRAWINGS[j], DRAWINGS[i]];
  }
})();

// ── DAILY HELPERS ─────────────────────────────────────────────────────────
function daysSinceStart(dateStr) {
  const start = new Date(CONFIG.startDate + 'T00:00:00');
  const d     = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.max(0, Math.floor((local - start) / 86400000));
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function drawingsForDay(dayIdx) {
  const n = CONFIG.gamesPerDay;
  return DRAWINGS.slice(dayIdx * n, dayIdx * n + n);
}

// ── PLAY ORDER ────────────────────────────────────────────────────────────
// Group drawings by category, chunk into gamesPerDay-sized days so every
// drawing in a day shares the same category.
let _playOrder = null;
function getPlayOrder() {
  if (_playOrder) return _playOrder;
  const g = CONFIG.gamesPerDay;
  const groups = {};
  DRAWINGS.forEach((d, i) => {
    const cat = d.category || '\xFF'; // sort uncategorized last
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(i);
  });
  // Build per-category day batches
  const catBatches = Object.keys(groups).sort().map(cat => {
    const indices = groups[cat];
    const batches = [];
    for (let i = 0; i + g <= indices.length; i += g)
      batches.push(indices.slice(i, i + g));
    return batches;
  });
  // Round-robin interleave: cat0[0], cat1[0], cat2[0], cat0[1], cat1[1], ...
  _playOrder = [];
  const maxLen = Math.max(...catBatches.map(b => b.length));
  for (let round = 0; round < maxLen; round++)
    for (const batches of catBatches)
      if (round < batches.length) _playOrder.push(batches[round]);
  return _playOrder;
}
function getDrawingIdx(dayIdx, slotIdx) {
  const order = getPlayOrder();
  const cycle = Math.floor(dayIdx / order.length);
  // Shift starting point each cycle by ~37% of pool so replay feels fresh
  const shift = cycle * Math.round(order.length * 0.37);
  const idx   = (dayIdx + shift) % order.length;
  const day   = order[idx];
  return day ? (day[slotIdx] ?? 0) : 0;
}

// ── WORLD / LEVEL HELPERS ─────────────────────────────────────────────────
function getWorlds() {
  if (_worlds) return _worlds;
  const map = {};
  DRAWINGS.forEach(d => {
    const cat = d.category || 'misc';
    if (!map[cat]) map[cat] = [];
    map[cat].push(d);
  });
  const ordered = WORLD_ORDER.filter(cat => map[cat] && map[cat].length > 0)
    .map(cat => ({ name: cat, drawings: map[cat] }));
  // Append any categories not in WORLD_ORDER into misc
  Object.keys(map).forEach(cat => {
    if (!WORLD_ORDER.includes(cat)) {
      const miscWorld = ordered.find(w => w.name === 'misc');
      if (miscWorld) miscWorld.drawings.push(...map[cat]);
    }
  });
  _worlds = ordered;
  return _worlds;
}

function calcStars(finalScore, won) {
  if (!won) return 0;
  const total = CONFIG.drawTime + CONFIG.guessTime;
  if (finalScore > total * (2 / 3)) return 3;
  if (finalScore > total * (1 / 3)) return 2;
  return 1;
}

function isWorldUnlocked(worldIdx) {
  if (worldIdx === 0) return true;
  const worlds = getWorlds();
  const prev = worlds[worldIdx - 1];
  if (!prev) return false;
  const s = loadStars();
  return prev.drawings.every(d => s[d.id] !== undefined);
}

function renderStarRow(count) {
  return '<span style="color:#f0c040">' + '★'.repeat(count) + '</span>'
       + '<span style="color:var(--border)">' + '☆'.repeat(3 - count) + '</span>';
}

// ── MAP SEQUENCE ───────────────────────────────────────────────────────────
// Returns {nodes, sections} for the continuous level map.
// If MAP_SECTIONS has a 'map' entry (flat single-path mode), uses its node
// positions and assigns shuffled drawings to them.
// Free users are capped at FREE_LEVEL_LIMIT (200). Paid users get all drawings.
function resetMapSequenceCache() { _mapSequence = null; }

function buildMapSequence() {
  if (_mapSequence) return _mapSequence;

  // ── Flat single-path mode ─────────────────────────────────────────────────
  const flatMs = (typeof MAP_SECTIONS !== 'undefined')
    ? MAP_SECTIONS.find(ms => ms.category === 'map' && ms.path)
    : null;

  if (flatMs) {
    const paid = typeof hasFullAccess === 'function' && hasFullAccess();
    const MAX_NODES = paid ? DRAWINGS.length : (typeof FREE_LEVEL_LIMIT !== 'undefined' ? FREE_LEVEL_LIMIT : 200);
    const pool = DRAWINGS.slice(); // already shuffled by CONFIG.seed in shuffleDrawings()

    // Use stored nodes if available, otherwise auto-compute equidistant nodes from path
    let msNodes = flatMs.nodes && flatMs.nodes.length > 0 ? flatMs.nodes : null;
    if (!msNodes) {
      const N = Math.min(pool.length, MAX_NODES);
      const W = 375, H = flatMs.height || 10000;
      // Denormalize path coords (x×W, y×H) resetting counter at each command letter
      let _ci = 0;
      const denormed = flatMs.path.replace(
        /([MmCcLlZz])|([- ]?[-\d.]+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
        (m, cmd, num) => {
          if (cmd) { _ci = 0; return cmd; }
          const v = parseFloat(num);
          const out = _ci % 2 === 0 ? +(v * W).toFixed(1) : +(v * H).toFixed(1);
          _ci++;
          return (num[0] === ' ' ? ' ' : '') + out;
        }
      );
      try {
        const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        svgEl.setAttribute('d', denormed);
        document.body.appendChild(svgEl);
        const total = svgEl.getTotalLength();
        msNodes = Array.from({ length: N }, (_, i) => {
          const pt = svgEl.getPointAtLength(i / (N - 1) * total);
          return { x: +(pt.x / W).toFixed(4), y: +(pt.y / H).toFixed(4) };
        });
        svgEl.remove();
        flatMs.nodes = msNodes; // cache so we don't recompute on next call
      } catch(e) {
        msNodes = [];
      }
    }

    const count = Math.min(pool.length, msNodes.length, MAX_NODES);
    const sections = [{ category: 'map', drawings: pool.slice(0, count), globalStart: 0, lap: 0 }];
    const nodes = pool.slice(0, count).map((drawing, i) => ({
      drawing, category: drawing.category || 'misc', sectionIdx: 0, posInSection: i
    }));
    _mapSequence = { nodes, sections };
    return _mapSequence;
  }

  // ── Per-category fallback ─────────────────────────────────────────────────
  const CAP = MAP_LEVELS_PER_SECTION;

  const byCategory = {};
  WORLD_ORDER.forEach(cat => { byCategory[cat] = []; });
  DRAWINGS.forEach(d => {
    const cat = d.category || 'misc';
    if (byCategory[cat]) byCategory[cat].push(d);
    else if (byCategory['misc']) byCategory['misc'].push(d);
  });

  const msPathSet = (typeof MAP_SECTIONS !== 'undefined' && MAP_SECTIONS.some(ms => ms.path))
    ? new Set(MAP_SECTIONS.filter(ms => ms.path && ms.category !== 'map').map(ms => ms.category))
    : null;

  const sections = [];
  WORLD_ORDER.forEach(cat => {
    if (msPathSet && !msPathSet.has(cat)) return;
    if (!byCategory[cat] || !byCategory[cat].length) return;
    sections.push({ category: cat, drawings: byCategory[cat].slice(0, CAP), lap: 0, globalStart: 0 });
  });

  const allDrawings = [];
  sections.forEach((section, sIdx) => {
    section.drawings.forEach(drawing => allDrawings.push({ drawing, category: section.category, sectionIdx: sIdx }));
  });
  let seed = 42;
  const rand = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; };
  for (let i = allDrawings.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [allDrawings[i], allDrawings[j]] = [allDrawings[j], allDrawings[i]];
  }
  const nodes = allDrawings.map((item, posInSection) => ({
    drawing: item.drawing, category: item.category, sectionIdx: 0, posInSection
  }));
  sections.length = 0;
  sections.push({ category: 'map', drawings: allDrawings.map(i => i.drawing), globalStart: 0, lap: 0 });
  nodes.forEach((n, i) => { n.sectionIdx = 0; n.posInSection = i; });

  _mapSequence = { nodes, sections };
  return _mapSequence;
}
