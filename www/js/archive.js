// ── ARCHIVE ───────────────────────────────────────────────────────────────
let _archiveReturnPage = 'home';
function showArchivePage(returnPage) {
  _archiveReturnPage = returnPage || 'home';
  calFilter = 'all';
  document.querySelectorAll('.cal-filter').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === 'all');
  });
  buildCalendarGrid();
  showPage('archive');
  requestAnimationFrame(() => {
    const todayRow = document.querySelector('#calendarBody .cal-row.today');
    if (todayRow) todayRow.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
}

let calFilter = 'all';

function setCalFilter(f) {
  calFilter = f;
  document.querySelectorAll('.cal-filter').forEach(btn => {
    const active = btn.dataset.filter === f;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  buildCalendarGrid();
}

function buildCalendarGrid() {
  const body  = document.getElementById('calendarBody');
  body.innerHTML = '';
  const today = daysSinceStart();
  const p     = loadProgress();
  let   shown = 0;

  for (let d = today; d >= 0; d--) {
    const slots    = p[d] || Array(CONFIG.gamesPerDay).fill(null);
    const complete = slots.every(s => s !== null);
    if (calFilter === 'completed'  && !complete) continue;
    if (calFilter === 'incomplete' &&  complete) continue;

    const played = slots.filter(s => s != null).length;
    const total  = slots.reduce((sum, s) => sum + (s || 0), 0);
    shown++;

    const row = document.createElement('div');
    row.className = 'cal-row' + (d === today ? ' today' : '');
    row.setAttribute('role', 'button');
    row.setAttribute('tabindex', '0');

    const startDate = new Date(CONFIG.startDate + 'T00:00:00');
    startDate.setDate(startDate.getDate() + d);
    const dateStr = d === today ? 'TODAY'
      : startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const dateDiv = document.createElement('div');
    dateDiv.className = 'cal-date';
    dateDiv.textContent = dateStr;

    const dotsDiv = document.createElement('div');
    dotsDiv.className = 'cal-dots';
    for (let s = 0; s < CONFIG.gamesPerDay; s++) {
      const dot = document.createElement('div');
      const sc  = slots[s];
      dot.className = 'cal-dot' + (sc == null ? '' : (sc > 0 ? ' won' : ' lost'));
      dotsDiv.appendChild(dot);
    }
    const cat = DRAWINGS[getDrawingIdx(d, 0)]?.category;
    if (cat) {
      const catEl = document.createElement('span');
      catEl.className = 'cal-cat';
      catEl.textContent = cat;
      dotsDiv.appendChild(catEl);
    }

    const scoreDiv = document.createElement('div');
    scoreDiv.className = 'cal-score';
    scoreDiv.textContent = played > 0 ? total + ' pts' : '-';

    row.appendChild(dateDiv);
    row.appendChild(dotsDiv);
    row.appendChild(scoreDiv);
    const playedText = played > 0 ? `${total} pts, ${played} of ${CONFIG.gamesPerDay} played` : 'not played';
    row.setAttribute('aria-label', `${dateStr}: ${playedText}`);
    row.addEventListener('click', () => playDay(d));
    row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playDay(d); } });
    body.appendChild(row);
  }
  if (shown === 0) {
    const empty = document.createElement('div');
    empty.className = 'hist-empty';
    empty.textContent = calFilter === 'completed' ? 'NO PLAYED DAYS YET' : 'NO UNPLAYED DAYS';
    body.appendChild(empty);
  }
}

function playPrevDay() {
  if (playingDay > 0) playDay(playingDay - 1);
}

function playDay(dayIdx) {
  playingDay        = dayIdx;
  playingSlot       = 0;
  currentDrawingIdx = getDrawingIdx(dayIdx, 0);
  totalScore        = 0;
  roundHistory      = [];
  currentGuesses    = [];
  sessionDayProgress = null;
  updateScoreDisplay();
  if (firstIncompleteSlot(dayIdx) >= CONFIG.gamesPerDay) {
    showDaySummary();
  } else {
    loadDrawing();
  }
}

function replayDay() {
  sessionDayProgress = null;
  playingSlot        = 0;
  currentDrawingIdx  = getDrawingIdx(playingDay, 0);
  totalScore         = 0;
  roundHistory       = [];
  currentGuesses     = [];
  updateScoreDisplay();
  loadDrawing();
}
