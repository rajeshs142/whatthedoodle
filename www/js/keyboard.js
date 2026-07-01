// ── KEYBOARD ─────────────────────────────────────────────────────────────
function buildKeyboard() {
  const rows = [
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L'],
    ['Z','X','C','V','B','N','M'],
  ];
  const kb = document.getElementById('keyboard');
  rows.forEach(row => {
    const rowEl = document.createElement('div');
    rowEl.className = 'kb-row';
    row.forEach(k => {
      const btn = document.createElement('button');
      btn.className = 'key';
      btn.textContent = k;
      btn.addEventListener('click', () => {
        const inp = document.getElementById('guessInput');
        if (inp.value.length < 30) inp.value += k;
        updateSuggestions(inp);
      });
      rowEl.appendChild(btn);
    });
    kb.appendChild(rowEl);
  });

  // Bottom row: CLR · SPACE · ENTER · BACK
  const spaceRow = document.createElement('div');
  spaceRow.className = 'kb-row';
  const spaceKeys = [
    { label: 'CLR',   action: inp => { inp.value = ''; }, sugg: true },
    { label: 'SPACE', action: inp => { if (inp.value.length < 30) inp.value += ' '; }, flex: 2, sugg: true },
    { label: 'ENTER', action: () => submitGuess() },
    { label: '⌫',     action: inp => { inp.value = inp.value.slice(0, -1); }, sugg: true },
  ];
  spaceKeys.forEach(({ label, action, flex, sugg }) => {
    const btn = document.createElement('button');
    btn.className = 'key wide';
    btn.textContent = label;
    if (flex) btn.style.cssText = `max-width:none; flex:${flex};`;
    btn.addEventListener('click', () => {
      const inp = document.getElementById('guessInput');
      action(inp);
      if (sugg) updateSuggestions(inp);
    });
    spaceRow.appendChild(btn);
  });
  kb.appendChild(spaceRow);
}

function updateSuggestions(inp) {
  const el = document.getElementById('status');
  const clear = () => { el.innerHTML = ''; el.className = ''; };
  if (!currentDrawing || gameOver || !CONFIG.showSuggestions) { clear(); return; }
  const typed = inp.value.toLowerCase();
  if (typed.length < CONFIG.suggMinLen) { clear(); return; }
  const candidates = [currentDrawing.word, ...(currentDrawing.synonyms || [])];
  const matches = candidates.filter(c => {
    const lc = c.toLowerCase();
    return lc.startsWith(typed) || lc.split(/\s+/).some(w => w.startsWith(typed));
  }).slice(0, CONFIG.suggCount);
  if (!matches.length) { clear(); return; }
  el.className = 'chips';
  el.innerHTML = '';
  matches.forEach(m => {
    const btn = document.createElement('button');
    btn.className = 'sugg-chip';
    btn.textContent = m.toUpperCase();
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      inp.value = m.toUpperCase();
      clear();
      submitGuess();
    });
    el.appendChild(btn);
  });
}
