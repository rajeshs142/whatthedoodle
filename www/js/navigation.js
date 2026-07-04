// ── MODAL MANAGEMENT ─────────────────────────────────────────────────────
const PAGES = ['home', 'levels', 'game', 'result', 'summary', 'doodles', 'create', 'doodle-result', 'settings', 'stats', 'archive'];
// Pages that replace history (no back entry) vs push (back navigable)
const _REPLACE_PAGES = new Set(['game', 'result']);

function showPage(name) {
  PAGES.forEach(p => document.getElementById('page-' + p).classList.toggle('active', p === name));
  document.getElementById('shareSheet').classList.remove('show');
  if (name === 'home' || _REPLACE_PAGES.has(name)) {
    history.replaceState({page: name}, '');
  } else {
    history.pushState({page: name}, '');
  }
}

window.addEventListener('popstate', (e) => {
  const onSettings = document.getElementById('page-settings').classList.contains('active');
  if (onSettings && isSettingsDirty()) {
    history.pushState({page: 'settings'}, '');
    document.getElementById('settingsExitPrompt').style.display = 'flex';
    return;
  }
  animGeneration++;
  clearInterval(timerInterval);
  timerInterval = null;
  _previewAnimGen++;
  if (onSettings && _settingsApplied) applyTheme(_settingsApplied.theme);

  const target = e.state?.page;
  const _navigable = ['levels', 'summary', 'doodles', 'settings', 'stats', 'archive', 'create', 'doodle-result'];
  if (target && _navigable.includes(target)) {
    PAGES.forEach(p => document.getElementById('page-' + p).classList.toggle('active', p === target));
    return;
  }
  showHome();
});

function closeAllModals() {}

function showHome() {
  gameMode = 'levels';
  showPage('home');
  renderHomeBg();
  _updateDailyBadge();

  const btns = document.getElementById('homeBtns');
  if (btns) btns.classList.add('visible');
}

function _updateDailyBadge() {
  const btn = document.getElementById('homeDailyBtn');
  if (!btn) return;
  const today = daysSinceStart();
  const played = firstIncompleteSlot(today) >= CONFIG.gamesPerDay;
  btn.innerHTML = played ? 'DAILY' : 'DAILY <span class="daily-badge">NEW</span>';
}

// ── LEVEL MAP (CANDY CRUSH STYLE) ─────────────────────────────────────────
function onPlayClick() {
  const { nodes } = buildMapSequence();
  const s = loadStars();
  for (let i = 0; i < nodes.length; i++) {
    if (!isSectionUnlocked(nodes[i].sectionIdx)) break;
    if (!(s[nodes[i].drawing.id] > 0)) {
      currentMapNodeIdx = i;
      showLevelMap();
      return;
    }
  }
  // All played — stay at last node
  currentMapNodeIdx = Math.max(0, nodes.length - 1);
  showLevelMap();
}

function isNodePlayable(i, nodes, stars) {
  const node = nodes[i];
  if (!isSectionUnlocked(node.sectionIdx)) return false;
  if (i === 0) return true;
  const prev = nodes[i - 1];
  return prev && (stars[prev.drawing.id] > 0);
}

function isSectionUnlocked(sectionIdx) {
  if (sectionIdx === 0) return true;
  const { sections } = buildMapSequence();
  const prev = sections[sectionIdx - 1];
  if (!prev) return false;
  const s = loadStars();
  const played = prev.drawings.filter(d => s[d.id] > 0).length;
  return played / prev.drawings.length >= MAP_UNLOCK_PCT;
}

// Path style layer configs — color-aware, mirrors draw_map.html
const _PATH_COLOR_DEFAULTS = {
  road:'#ffffff', plain:'#ffffff', dash:'#ffffff', pipe:'#ffffff',
  rail:'#cccccc', dirt:'#8B6310',  water:'#1565C0', lava:'#D84315', snow:'#ddeeff',
};
function _getPathCfg(style, color) {
  const c = color || _PATH_COLOR_DEFAULTS[style] || '#ffffff';
  const s = {
    road:  [
      { stroke:'rgba(0,0,0,0.55)',        width:18, dash:null },
      { stroke:c,                          width:12, dash:null },
      { stroke:'rgba(255,255,255,0.45)',  width:3,  dash:'10 14' },
    ],
    plain: [
      { stroke:'rgba(0,0,0,0.4)',         width:8,  dash:null },
      { stroke:c,                          width:3,  dash:null },
      { stroke:'none',                    width:0,  dash:null },
    ],
    dash:  [
      { stroke:'rgba(0,0,0,0.4)',         width:6,  dash:'20 18' },
      { stroke:c,                          width:4,  dash:'20 18' },
      { stroke:'none',                    width:0,  dash:null },
    ],
    pipe:  [
      { stroke:'rgba(0,0,0,0.70)',        width:22, dash:null },
      { stroke:c,                          width:16, dash:null },
      { stroke:'rgba(255,255,255,0.6)',   width:8,  dash:null },
    ],
    rail:  [
      { stroke:'rgba(50,35,15,0.85)',     width:16, dash:null },
      { stroke:'rgba(160,120,60,0.9)',    width:10, dash:'3 13' },
      { stroke:c,                          width:2,  dash:null },
    ],
    dirt:  [
      { stroke:'rgba(0,0,0,0.65)',        width:18, dash:null },
      { stroke:c,                          width:14, dash:null },
      { stroke:'rgba(0,0,0,0.45)',        width:8,  dash:'3 7' },
    ],
    water: [
      { stroke:'rgba(0,0,0,0.55)',        width:24, dash:null },
      { stroke:c,                          width:18, dash:null },
      { stroke:'rgba(255,255,255,0.5)',   width:5,  dash:'22 10' },
    ],
    lava:  [
      { stroke:'rgba(0,0,0,0.7)',         width:22, dash:null },
      { stroke:c,                          width:16, dash:null },
      { stroke:'rgba(255,210,40,0.75)',   width:4,  dash:null },
    ],
    snow:  [
      { stroke:'rgba(100,140,200,0.4)',   width:20, dash:null },
      { stroke:c,                          width:14, dash:null },
      { stroke:'rgba(255,255,255,0.7)',   width:4,  dash:'4 8' },
    ],
  };
  return s[style] || s.road;
}

function showLevelMap() {
  const { nodes, sections } = buildMapSequence();
  const s = loadStars();
  const scrollEl = document.querySelector('.levels-scroll');
  const pathEl   = document.getElementById('levelPath');
  // Don't reset scroll — let buildMap jump directly to current node

  // ── MAP_SECTIONS layout (when editor data is available) ──────────────────
  if (typeof MAP_SECTIONS !== 'undefined' && MAP_SECTIONS.length > 0) {
    _showLevelMapFromSections(nodes, sections, s, scrollEl, pathEl);
    return;
  }

  // ── Fallback: seeded random candy-crush layout ───────────────────────────
  _showLevelMapRandom(nodes, sections, s, scrollEl, pathEl);
}

function _showLevelMapFromSections(nodes, sections, s, scrollEl, pathEl) {
  const BUBBLE = 50;

  // Build category → MAP_SECTIONS entry lookup
  const msLookup = {};
  MAP_SECTIONS.forEach(ms => { msLookup[ms.category] = ms; });

  // One meta entry per buildMapSequence section; sections without path data get height 0
  const sectionMeta = sections.map(sec => {
    const ms = msLookup[sec.category];
    return { sec, ms, height: (ms && ms.path) ? ms.height : 0 };
  });

  // Stack sections bottom-to-top: section[0] at bottom, last at top
  const totalH = sectionMeta.reduce((a, m) => a + m.height, 0);
  const sTopY = [];
  { let cum = 0;
    for (let i = 0; i < sectionMeta.length; i++) {
      sTopY[i] = totalH - cum - sectionMeta[i].height;
      cum += sectionMeta[i].height;
    }
  }

  // Denormalize a path string into section-local pixel coords (x×W, y×H)
  function denorm(d, W, H) {
    let idx = 0;
    return d.replace(/([MmCcLlZz])|([- ]?[-\d.]+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g, (match, cmd, num) => {
      if (cmd) { idx = 0; return cmd; }
      const v = parseFloat(num);
      const r = idx % 2 === 0 ? (v * W).toFixed(1) : (v * H).toFixed(1);
      idx++;
      return (num[0] === ' ' ? ' ' : '') + r;
    });
  }

  // Screen position of the i-th node in the flat nodes array
  function getPos(i) {
    const node = nodes[i];
    if (!node) return null;
    const m = sectionMeta[node.sectionIdx];
    if (!m.ms || !m.ms.nodes[node.posInSection]) return null;
    const norm = m.ms.nodes[node.posInSection];
    return {
      x: Math.round(norm.x * _W),
      y: Math.round(sTopY[node.sectionIdx] + norm.y * m.height),
    };
  }

  let _W = 375; // set in buildMap

  function buildMap() {
    const containerW = pathEl.parentElement.clientWidth || 420;
    _W = Math.min(containerW, 420);
    const offsetX = Math.floor((containerW - _W) / 2);
    pathEl.innerHTML = '';
    pathEl.style.height = totalH + 'px';
    pathEl.style.setProperty('--node-color', THEME_NODE_COLORS[CONFIG.theme] || '#ffffff');

    const _lightThemes = new Set(['light', 'sepia', 'ocean']);

    sectionMeta.forEach((m, sIdx) => {
      if (!m.ms || !m.height) return;
      const topY    = sTopY[sIdx];
      const H       = m.height;
      const unlocked = isSectionUnlocked(sIdx);

      // ── Background band — gradient or solid theme color ──────────────
      const gradFrom = m.ms.gradFrom || m.ms.bgColor || '#111';
      const gradTo   = m.ms.gradTo   || m.ms.bgColor || '#111';
      const bgVal = CONFIG.mapThemeColor
        ? 'var(--bg)'
        : `linear-gradient(to top,${gradFrom},${gradTo})`;
      const bg = document.createElement('div');
      bg.className = `level-section-bg map-section map-section--${m.sec.category} ${unlocked ? 'map-section--unlocked' : 'map-section--locked'}`;
      bg.style.cssText = `top:${topY}px;height:${H}px;background:${bgVal};`;
      pathEl.appendChild(bg);


      // ── Doodles (z-index 0, below path) ─────────────────────────────
      if (CONFIG.mapShowDoodles && m.ms.doodles && m.ms.doodles.length) {
        const dsvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        dsvg.setAttribute('class', `map-doodles map-doodles--${m.sec.category}`);
        dsvg.style.cssText = `position:absolute;top:${topY}px;left:${offsetX}px;width:${_W}px;height:${H}px;` +
          `overflow:visible;pointer-events:none;z-index:0;` +
          (!unlocked ? 'opacity:1;' : '');
        dsvg.setAttribute('viewBox', `0 0 ${_W} ${H}`);
        // For the flat map, compute the current node's normalized Y progress (0=top,1=bottom)
        let progressY = null;
        if (m.sec.category === 'map' && m.ms.nodes && m.ms.nodes.length) {
          const curNode = m.ms.nodes[Math.min(currentMapNodeIdx, m.ms.nodes.length - 1)];
          if (curNode) progressY = curNode.y; // normalized 0–1
        }

        m.ms.doodles.forEach((dd, di) => {
          const drw = DRAWINGS.find(d => d.id === dd.id);
          if (!drw || !drw.strokes || !drw.strokes.length) return;
          const stroke = _lightThemes.has(CONFIG.theme) ? '#222222' : '#ffffff';
          const sc = (dd.size || 70) / 255;
          const paths = drw.strokes.map(str =>
            `<path d="${str}" fill="none" stroke="${stroke}" stroke-width="${dd.strokeW || 5}" stroke-linecap="round" stroke-linejoin="round"/>`
          ).join('');
          const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          g.setAttribute('class', 'map-doodle');

          let opacity;
          if (progressY !== null) {
            // Doodle Y on map: dd.y is normalized within section (0=top, 1=bottom)
            // Progress flows top-to-bottom so doodles BELOW (higher Y) the current node are "behind" (played)
            const DIM = 0.35, LIT = 0.75;
            // path starts at bottom (y≈1) and goes up (y→0), so higher Y = already played
            opacity = dd.y >= progressY ? LIT : DIM;
          } else {
            opacity = Math.min(dd.opq || 12, 20) / 100;
          }
          g.setAttribute('opacity', opacity.toFixed(3));
          g.setAttribute('transform',
            `translate(${dd.x * _W},${dd.y * H}) rotate(${dd.rot || 0}) scale(${sc}) translate(-127.5,-127.5)`);
          g.innerHTML = paths;
          const floatG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          floatG.setAttribute('class', 'map-doodle-float');
          if (CONFIG.mapDoodleAnim) {
            const dur   = (3.6 + (di * 0.8 + sIdx * 1.3) % 2.4).toFixed(1);
            const drift = (di % 2 === 0 ? 1 : -1) * (6 + (di * 5 + sIdx * 3) % 10);
            const delay = ((di * 1.1 + sIdx * 0.6) % 3.0).toFixed(1);
            floatG.style.cssText =
              `animation:mapDoodleFloat ${dur}s ease-in-out ${delay}s infinite;--drift:${drift}px`;
          }
          floatG.appendChild(g);
          dsvg.appendChild(floatG);
        });
        pathEl.appendChild(dsvg);
      }

      // ── Path (z-index 1) — always render ────────────────────────────
      if (m.ms.path) {
        const cfg = _getPathCfg(m.ms.pathStyle, THEME_PATH_COLORS[CONFIG.theme] || '#b75a0a' || null);
        const d   = denorm(m.ms.path, _W, H);
        const psvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        psvg.setAttribute('class', `map-path map-path--${m.ms.pathStyle || 'dash'} map-path--${m.sec.category}`);
        psvg.style.cssText = `position:absolute;top:${topY}px;left:${offsetX}px;width:${_W}px;height:${H}px;` +
          `overflow:visible;pointer-events:none;z-index:1;`;
        psvg.setAttribute('viewBox', `0 0 ${_W} ${H}`);
        psvg.innerHTML = `<defs>
          <filter id="path-glow-${sIdx}" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>`;
        // Split into individual subpaths so dasharray resets correctly per stroke
        const subpaths = d.match(/M[^M]*/g) || [d];
        const layerNames = ['shadow', 'base', 'detail'];
        cfg.forEach((layer, li) => {
          if (layer.stroke === 'none' || !layer.width) return;
          subpaths.forEach(sub => {
            const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            p.setAttribute('class', `map-path-layer map-path-layer--${layerNames[li] || li}`);
            p.setAttribute('d', sub);
            p.setAttribute('fill', 'none');
            p.setAttribute('stroke', layer.stroke);
            p.setAttribute('stroke-width', String(layer.width));
            p.setAttribute('stroke-linecap', 'round');
            p.setAttribute('stroke-linejoin', 'round');
            if (layer.dash) p.setAttribute('stroke-dasharray', layer.dash);
            psvg.appendChild(p);
          });
        });
        pathEl.appendChild(psvg);

        // ── Completed path overlay ──────────────────────────────────────
        const totalNodes = m.ms.nodes ? m.ms.nodes.length : 0;
        if (totalNodes > 0 && m.sec.globalStart !== undefined) {
          let completedCount = 0;
          for (let ni = 0; ni < totalNodes; ni++) {
            const gIdx = m.sec.globalStart + ni;
            if (nodes[gIdx] && s[nodes[gIdx].drawing.id] !== undefined) completedCount++;
            else break;
          }
          if (completedCount > 0) {
            // Measure total length across all subpaths
            const tmpPaths = subpaths.map(sub => {
              const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
              p.setAttribute('d', sub);
              document.body.appendChild(p);
              return p;
            });
            const subLengths = tmpPaths.map(p => p.getTotalLength());
            tmpPaths.forEach(p => p.remove());
            const totalLen = subLengths.reduce((a, b) => a + b, 0);
            if (totalLen > 0) {
              const fraction = completedCount / totalNodes;
              let remaining = fraction * totalLen;
              const borderColor = THEME_PATH_COLORS[CONFIG.theme] || '#b75a0a';
              subpaths.forEach((sub, si) => {
                const subLen = subLengths[si];
                const doneLen = Math.min(remaining, subLen);
                remaining -= doneLen;
                if (doneLen <= 0) return;
                const bigGap = (subLen * 3).toFixed(1);
                const mkCP = (stroke, width, cls, glow) => {
                  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                  p.setAttribute('class', `map-path-layer map-path-layer--${cls}`);
                  p.setAttribute('d', sub); p.setAttribute('fill', 'none');
                  p.setAttribute('stroke', stroke); p.setAttribute('stroke-width', String(width));
                  p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round');
                  p.setAttribute('stroke-dasharray', `${doneLen.toFixed(1)} ${bigGap}`);
                  if (glow) p.setAttribute('filter', `url(#path-glow-${sIdx})`);
                  return p;
                };
                psvg.appendChild(mkCP('rgba(255,255,255,0.3)', 10, 'complete-glow', true));
                psvg.appendChild(mkCP(borderColor, 7, 'complete-border', false));
                psvg.appendChild(mkCP('#ffffff', 2, 'complete-fill', false));
              });
            }
          }
        }
      }
    });

    // ── Pre-compute section gradient colours + max valid node index ────────
    const sectionColors = {};
    let maxValidIdx = -1;
    sectionMeta.forEach((m, sIdx) => {
      if (!m.ms || !m.height) return;
      sectionColors[sIdx] = {
        from: m.ms.gradFrom || m.ms.bgColor || '#555',
        to:   m.ms.gradTo   || m.ms.bgColor || '#333',
      };
      maxValidIdx = Math.max(maxValidIdx, m.sec.globalStart + m.sec.drawings.length - 1);
    });

    // ── Bubble nodes (z-index 2) ─────────────────────────────────────────
    nodes.forEach((node, i) => {
      if (i > maxValidIdx) return;
      const c = getPos(i);
      if (!c) return;
      const { drawing, sectionIdx } = node;
      const starCount = s[drawing.id];
      const played    = starCount !== undefined;
      const playable  = isNodePlayable(i, nodes, s);
      const nodeTheme = WORLD_THEMES[sections[sectionIdx]?.category] || WORLD_THEMES.misc;
      const sectionColor = CONFIG.mapNodeColor === 'section' ? nodeTheme.color
                         : CONFIG.mapNodeColor !== 'theme'   ? CONFIG.mapNodeColor
                         : null;
      const isStart = i === 0;
      const isEnd   = i === maxValidIdx;

      const levelNum = i + 1;
      const numLbl   = `<span class="map-node-num">${levelNum}</span>`;
      let cls = '', inner = '';

      if (isStart || isEnd) {
        cls   = isStart ? 'node-start' : 'node-end';
        const tag = isStart
          ? `<span class="node-tag">START</span>`
          : `<span class="node-tag">END</span>`;
        inner = `<div class="node-inner">${numLbl}${tag}</div>`;
      } else if (played) {
        cls   = 'node-played';
        inner = `<div class="node-inner">${numLbl}<span class="node-stars">${'★'.repeat(starCount)}<span class="star-off">${'☆'.repeat(3 - starCount)}</span></span></div>`;
      } else if (playable) {
        cls   = 'node-current';
        inner = `<div class="node-inner">${numLbl}<span class="node-play">▶</span></div>`;
      } else {
        cls   = 'node-future';
        inner = `<div class="node-inner node-inner--dim">${numLbl}</div>`;
      }

      const bubble = document.createElement('div');
      bubble.className = `level-bubble map-node map-node--${node.sectionIdx < sections.length ? sections[node.sectionIdx].category : 'misc'} ${cls}`;
      bubble.style.cssText = `left:${c.x - BUBBLE/2 + offsetX}px;top:${c.y - BUBBLE/2}px;z-index:2;`;
      if (sectionColor) bubble.style.setProperty('--node-color', sectionColor);
      bubble.innerHTML = inner;
      if (played)   bubble.addEventListener('click', () => showLevelPreview(i));
      else if (playable) bubble.addEventListener('click', () => playMapNode(i));
      pathEl.appendChild(bubble);
    });

    // ── Scroll to current node — set before paint so no visible jump ─────────
    const cur = getPos(currentMapNodeIdx);
    if (cur) {
      const h = scrollEl.clientHeight || window.innerHeight;
      scrollEl.scrollTop = Math.max(0, cur.y - h * 0.4);
    }
  }

  // Re-render on orientation change / resize
  if (window._levelMapRO) window._levelMapRO.disconnect();
  let _rafPending = false;
  window._levelMapRO = new ResizeObserver(() => {
    if (_rafPending) return;
    _rafPending = true;
    requestAnimationFrame(() => { _rafPending = false; buildMap(); });
  });
  window._levelMapRO.observe(scrollEl);

  showPage('levels');
  requestAnimationFrame(buildMap);
}

function _showLevelMapRandom(nodes, sections, s, scrollEl, pathEl) {
  const BUBBLE   = 56;
  const ROW_H    = 100;
  const PAD_TOP  = 60;
  const PAD_BOT  = 80;
  const COL_PCTS = [0.18, 0.50, 0.82];

  let _ls = (CONFIG.seed + 0x1234) >>> 0;
  const lr = () => {
    _ls = (_ls + 0x6D2B79F5) >>> 0;
    let t = Math.imul(_ls ^ (_ls >>> 15), 1 | _ls);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const layout = [];
  let lcol = 0, lrow = 0;
  while (layout.length < nodes.length) {
    const remaining = nodes.length - layout.length;
    const goRight = lcol === 0 ? true : lcol === 2 ? false : lr() < 0.5;
    const maxSize = Math.min(goRight ? 3 - lcol : lcol + 1, remaining);
    const rv = lr();
    const size = maxSize >= 3 ? (rv < 0.50 ? 3 : rv < 0.75 ? 2 : 1)
               : maxSize === 2 ? (rv < 0.65 ? 2 : 1)
               : 1;
    for (let j = 0; j < size; j++)
      layout.push({ col: goRight ? lcol + j : lcol - j, rowIdx: lrow });
    lcol = goRight ? lcol + (size - 1) : lcol - (size - 1);
    lrow++;
  }

  const totalH = PAD_TOP + lrow * ROW_H + PAD_BOT;

  function nodeCenter(i, W) {
    const { col, rowIdx } = layout[i] || { col: 0, rowIdx: 0 };
    return {
      x: Math.round(COL_PCTS[col] * W),
      y: Math.round(totalH - PAD_BOT - rowIdx * ROW_H - ROW_H / 2),
    };
  }

  function buildMap() {
    const W = pathEl.parentElement.clientWidth || 320;
    pathEl.innerHTML = '';
    pathEl.style.height = totalH + 'px';
    pathEl.style.setProperty('--node-color', THEME_NODE_COLORS[CONFIG.theme] || '#ffffff');

    sections.forEach((section, sIdx) => {
      const first = section.globalStart;
      const last  = section.globalStart + section.drawings.length - 1;
      const topY    = nodeCenter(last,  W).y - BUBBLE / 2 - 12;
      const bottomY = nodeCenter(first, W).y + BUBBLE / 2 + 12;
      const unlocked = isSectionUnlocked(sIdx);
      const theme = WORLD_THEMES[section.category] || WORLD_THEMES.misc;

      const bg = document.createElement('div');
      bg.className = 'level-section-bg' + (unlocked ? '' : ' locked');
      bg.style.cssText = `top:${topY}px;height:${bottomY - topY}px;` +
        (unlocked ? `background:var(--bg);` : '');
      pathEl.appendChild(bg);

      const catPool = DRAWINGS.filter(d => d.category === section.category);
      const xPcts = [0.06, 0.68, 0.22, 0.54, 0.38];
      const yPcts = [0.12, 0.38, 0.65, 0.20, 0.82];
      const rots  = [-15, 22, -8, 14, -26];
      catPool.slice(0, 5).forEach((d, di) => {
        if (!d.strokes || !d.strokes.length) return;
        const sH = bottomY - topY;
        const bgPaths = d.strokes.map(str =>
          `<path d="${str}" fill="none" stroke="${unlocked ? theme.color : '#666'}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`
        ).join('');
        const el = document.createElement('div');
        el.style.cssText = `position:absolute;top:${Math.round(topY + yPcts[di] * sH)}px;left:${Math.round(xPcts[di] * W)}px;` +
          `transform:rotate(${rots[di]}deg);opacity:${unlocked ? 0.12 : 0.05};pointer-events:none;z-index:0;`;
        el.innerHTML = `<svg viewBox="0 0 200 200" width="60" height="60" xmlns="http://www.w3.org/2000/svg">${bgPaths}</svg>`;
        pathEl.appendChild(el);
      });
    });

    if (nodes.length > 1) {
      const pts = nodes.map((_, i) => nodeCenter(i, W));
      let _s = (CONFIG.seed + 0xBEEF) >>> 0;
      const rand = () => {
        _s = (_s + 0x6D2B79F5) >>> 0;
        let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 1; i < pts.length; i++) {
        const p0 = pts[i-1], p1 = pts[i];
        const dx = p1.x-p0.x, dy = p1.y-p0.y;
        const len = Math.sqrt(dx*dx+dy*dy) || 1;
        const px = -dy/len, py = dx/len;
        const bulge = (rand()*1.6-0.6)*len*0.55;
        const bx = Math.max(8, Math.min(W-8, (p0.x+p1.x)/2+px*bulge));
        const by = (p0.y+p1.y)/2+py*bulge;
        const t = 0.72;
        d += ` C ${Math.round(p0.x+t*(bx-p0.x))} ${Math.round(p0.y+t*(by-p0.y))}, ${Math.round(p1.x+t*(bx-p1.x))} ${Math.round(p1.y+t*(by-p1.y))}, ${p1.x} ${p1.y}`;
      }
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.style.cssText = `position:absolute;top:0;left:0;width:100%;height:${totalH}px;overflow:visible;pointer-events:none;z-index:1`;
      svg.setAttribute('viewBox', `0 0 ${W} ${totalH}`);
      const mkPath = (stroke, width, dash) => {
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        p.setAttribute('d', d); p.setAttribute('fill', 'none');
        p.setAttribute('stroke', stroke); p.setAttribute('stroke-width', String(width));
        p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round');
        if (dash) p.setAttribute('stroke-dasharray', dash);
        return p;
      };
      svg.appendChild(mkPath('rgba(0,0,0,0.55)', 18, null));
      svg.appendChild(mkPath('rgba(255,255,255,0.18)', 12, null));
      svg.appendChild(mkPath('rgba(255,255,255,0.38)', 3, '10 14'));
      pathEl.appendChild(svg);
    }

    nodes.forEach((node, i) => {
      const { drawing, sectionIdx } = node;
      const unlocked  = isSectionUnlocked(sectionIdx);
      const starCount = s[drawing.id];
      const played    = starCount !== undefined;
      const isCurrent = i === currentMapNodeIdx;
      let cls, inner = '';
      if (!unlocked) {
        cls = 'locked';
      } else if (played) {
        cls = starCount === 0 ? 'node-lost' : `node-won node-won-${starCount}`;
        inner = `<span class="node-stars">${'★'.repeat(starCount)}<span class="star-off">${'☆'.repeat(3-starCount)}</span></span>`;
      } else {
        cls = isCurrent ? 'node-current' : 'node-open';
      }
      const c = nodeCenter(i, W);
      const bubble = document.createElement('div');
      bubble.className = `level-bubble ${cls}`;
      bubble.style.cssText = `left:${c.x-BUBBLE/2}px;top:${c.y-BUBBLE/2}px;z-index:2;`;
      bubble.innerHTML = inner;
      if (unlocked) bubble.addEventListener('click', () => playMapNode(i));
      pathEl.appendChild(bubble);
    });

    const cur = nodeCenter(currentMapNodeIdx, W);
    const h = scrollEl.clientHeight || window.innerHeight;
    scrollEl.scrollTop = Math.max(0, cur.y - h * 0.4);
  }

  showPage('levels');
  requestAnimationFrame(buildMap);
}

function playMapNode(nodeIdx) {
  const { nodes } = buildMapSequence();
  const node = nodes[nodeIdx];
  if (!node || !isSectionUnlocked(node.sectionIdx)) return;
  soundNodeTap();
  gameMode          = 'levels';
  currentMapNodeIdx = nodeIdx;
  currentDrawing    = node.drawing;
  currentDrawingIdx = DRAWINGS.indexOf(node.drawing);
  playingSlot       = 0;
  loadDrawing();
}

function showLevelSummary(stars, won, score, isPreview = false) {
  if (!isPreview && stars > 0) {
    for (let i = 0; i < stars; i++) setTimeout(() => soundStar(), i * 220);
  }
  const levelNum = currentMapNodeIdx + 1;
  const sc = getComputedStyle(document.documentElement).getPropertyValue('--stroke-color').trim() || '#1a1814';
  const bounds = getDrawingBounds(currentDrawing);
  const mini   = buildMiniPainting({ strokes: currentDrawing.strokes }, bounds, won, sc, 0, 1);

  document.getElementById('summaryTitle').textContent = `MAP ${levelNum}`;
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
  document.getElementById('summaryWon').innerHTML = '<span class="star-on">' + '★'.repeat(stars) + '</span>'
    + '<span class="star-off">' + '☆'.repeat(3 - stars) + '</span>';
  document.getElementById('summaryWonLabel').textContent = 'Stars';

  const framesEl = document.getElementById('summaryFrames');
  framesEl.className = 'summary-frames';
  const wordColor = won
    ? 'border-color:var(--correct);color:var(--correct);background:var(--correct-bg)'
    : 'border-color:var(--wrong);color:var(--wrong);background:var(--wrong-bg)';
  framesEl.innerHTML = `<div class="summary-item">
    <div class="summary-painting">${mini}</div>
    <div class="summary-info">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:1rem;letter-spacing:1.5px;padding:2px 7px;border-radius:4px;border:1px solid;${wordColor}">${won ? currentDrawing.word.toUpperCase() : '???'}</div>
    </div>
  </div>`;

  document.getElementById('summaryDayBtnsWon').style.display  = 'none';
  document.getElementById('summaryDayBtnsFail').style.display = 'none';
  document.getElementById('summaryDoodleBtns').style.display = 'none';
  document.getElementById('summaryLevelBtnsPreview').style.display = isPreview ? 'flex' : 'none';
  document.getElementById('summaryLevelBtnsWon').style.display     = (!isPreview && stars > 0) ? 'flex' : 'none';
  document.getElementById('summaryLevelBtnsFail').style.display    = (!isPreview && stars === 0) ? 'flex' : 'none';

  showPage('summary');
}

function showLevelPreview(nodeIdx) {
  const { nodes } = buildMapSequence();
  const node = nodes[nodeIdx];
  if (!node) return;

  gameMode          = 'levels';
  currentMapNodeIdx = nodeIdx;
  currentDrawing    = node.drawing;
  currentDrawingIdx = DRAWINGS.indexOf(node.drawing);

  const stars = loadStars()[node.drawing.id] || 0;
  showLevelSummary(stars, stars > 0, null, true);
}

function goNextLevel() {
  const { nodes } = buildMapSequence();
  const s = loadStars();
  const nextIdx = currentMapNodeIdx + 1;
  if (nextIdx < nodes.length && isNodePlayable(nextIdx, nodes, s)) {
    playMapNode(nextIdx);
  } else {
    showLevelMap();
  }
}

// ── DAILY MODE ────────────────────────────────────────────────────────────
function startDailyMode() {
  gameMode           = 'daily';
  playingDay         = daysSinceStart();
  playingSlot        = 0;
  currentDrawingIdx  = getDrawingIdx(playingDay, 0);
  if (firstIncompleteSlot(playingDay) >= CONFIG.gamesPerDay) {
    showDaySummary();
  } else {
    loadDrawing();
  }
}

// ── STATS PAGE ────────────────────────────────────────────────────────────
let _statsReturnPage = 'settings';
function showStatsPage(returnPage) {
  _statsReturnPage = returnPage || 'settings';
  const p = loadProgress();
  const today = daysSinceStart();
  let daysPlayed = 0, totalGames = 0, totalWon = 0, totalScore = 0, streak = 0;
  let streakActive = true;
  for (let d = today; d >= 0; d--) {
    const slots = p[d] || [];
    const played = slots.filter(s => s != null).length;
    if (played > 0) {
      daysPlayed++;
      const dayWon = slots.filter(s => s > 0);
      totalGames += played;
      totalWon   += dayWon.length;
      totalScore += dayWon.reduce((a, b) => a + b, 0);
      if (streakActive && played >= CONFIG.gamesPerDay) streak++;
      else streakActive = false;
    } else if (d < today) {
      streakActive = false;
    }
  }
  const winRate  = totalGames ? Math.round(totalWon / totalGames * 100) : 0;
  const avgScore = totalWon   ? Math.round(totalScore / totalWon)       : 0;

  const stat = (val, label) =>
    `<div class="stat"><div class="stat-val">${val}</div><div class="stat-label">${label}</div></div>`;

  document.getElementById('statsBody').innerHTML = `
    <div class="overlay-stats" style="padding:20px 0 4px;flex-wrap:wrap;gap:16px">
      ${stat(daysPlayed, 'Days Played')}
      ${stat(totalGames, 'Rounds')}
      ${stat(winRate + '%', 'Win Rate')}
      ${stat(streak, 'Streak')}
      ${stat(totalWon, 'Correct')}
      ${stat(avgScore, 'Avg Score')}
    </div>
    <div style="padding:16px 0 8px;border-top:1px solid var(--border);margin-top:8px;text-align:center">
      <button class="hist-reset-btn" onclick="resetAllData()">RESET ALL DATA</button>
    </div>`;

  const alreadyOnStats = document.getElementById('page-stats').classList.contains('active');
  if (alreadyOnStats) {
    PAGES.forEach(p => document.getElementById('page-' + p).classList.toggle('active', p === 'stats'));
  } else {
    showPage('stats');
  }
}
