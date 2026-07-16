// ── ARCHIVE ───────────────────────────────────────────────────────────────
let _archiveReturnPage = 'home';
function showArchivePage(returnPage) {
  _archiveReturnPage = returnPage || 'home';
  calFilter = 'all';
  document.querySelectorAll('.cal-filter').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === 'all');
  });
  _buildArchiveStats();
  buildCalendarGrid();
  showPage('archive');
  requestAnimationFrame(() => {
    const todayRow = document.querySelector('#calendarBody .cal-row.today');
    if (todayRow) todayRow.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
}

function _calcStreak() {
  const p = loadProgress();
  const today = daysSinceStart();
  let streak = 0;
  for (let d = today; d >= 0; d--) {
    const slots = p[d] || [];
    const played = slots.filter(s => s != null).length;
    if (played >= CONFIG.gamesPerDay) streak++;
    else if (d < today) break;
  }
  return streak;
}

function _buildArchiveStats() {
  const el = document.getElementById('archiveStats');
  if (!el) return;
  const p = loadProgress();
  const today = daysSinceStart();
  let daysPlayed = 0, totalWon = 0, totalScore = 0;
  for (let d = today; d >= 0; d--) {
    const slots = p[d] || [];
    const played = slots.filter(s => s != null).length;
    if (played > 0) {
      daysPlayed++;
      const dayWon = slots.filter(s => s > 0);
      totalWon   += dayWon.length;
      totalScore += dayWon.reduce((a, b) => a + b, 0);
    }
  }
  const streak = _calcStreak();
  const winRate = daysPlayed ? Math.round(totalWon / daysPlayed * 100) : 0;
  const stat = (val, label) =>
    `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;flex:1">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:1.4rem;letter-spacing:1px;color:var(--text)">${val}</div>
      <div style="font-size:0.55rem;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:var(--sub)">${label}</div>
    </div>`;
  el.innerHTML = `<div style="display:flex;gap:4px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:10px 8px;margin-bottom:4px">
    ${stat(daysPlayed, 'Played')}
    ${stat(winRate + '%', 'Win Rate')}
    ${stat(streak, 'Streak')}
    ${stat(totalScore, 'Total Pts')}
  </div>`;
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
    const won      = slots.some(s => s != null && s > 0);
    if (calFilter === 'completed'  && !won) continue;
    if (calFilter === 'incomplete' &&  won) continue;

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
    empty.textContent = calFilter === 'completed' ? 'NO WINS YET' : 'ALL DAYS WON';
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
