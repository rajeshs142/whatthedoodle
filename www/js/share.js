// ── SHARE ─────────────────────────────────────────────────────────────────
let _shareUrl = '', _shareText = '', _shareUrls = [];

// Use native Android share sheet when available, fall back to web
async function _nativeShare(title, text, url) {
  const plugin = window.Capacitor?.Plugins?.Share;
  if (plugin) {
    try {
      await plugin.share({ title, text: text ? text + '\n' + url : url, dialogTitle: title });
      return true;
    } catch(e) { return false; }
  }
  if (navigator.share) {
    try { await navigator.share({ title, text: text ? text + '\n' + url : url }); return true; } catch(e) { return false; }
  }
  return false;
}

function showShareSheet(title, url, text) {
  _shareUrl  = url;
  _shareText = text || '';
  _shareUrls = [];
  // Try native share first — skip the custom sheet entirely
  _nativeShare(title, text, url).then(ok => {
    if (!ok) _showCustomSheet(title, url, text);
  });
}

function _showCustomSheet(title, url, text) {
  document.getElementById('shareSheetTitle').textContent = title;
  document.getElementById('shareUrlList').innerHTML = `
    <div class="share-url-entry">
      <div class="share-url-box">${url}</div>
      <button class="overlay-btn primary" id="shareCopyBtn" onclick="copyShareLink()">COPY LINK</button>
    </div>`;
  document.getElementById('shareNativeBtn').style.display = 'none';
  document.getElementById('shareSheet').classList.add('show');
}

function closeShareSheet() {
  document.getElementById('shareSheet').classList.remove('show');
}

function copyShareLink() {
  const content = _shareText ? _shareText + '\n' + _shareUrl : _shareUrl;
  const btn = document.getElementById('shareCopyBtn');
  const done = () => { btn.textContent = 'COPIED!'; setTimeout(() => { btn.textContent = 'COPY LINK'; }, 2000); };
  if (navigator.clipboard) {
    navigator.clipboard.writeText(content).then(done).catch(() => fallbackCopy(content, done));
  } else { fallbackCopy(content, done); }
}

function fallbackCopy(text, cb) {
  const ta = Object.assign(document.createElement('textarea'), { value: text });
  document.body.appendChild(ta); ta.select(); document.execCommand('copy');
  document.body.removeChild(ta); cb();
}

function nativeShare() {
  _nativeShare('Share', _shareText, _shareUrl);
}

function generateMultiDoodleUrl(payloads) {
  const data = payloads.length === 1 ? payloads[0] : payloads;
  const json = JSON.stringify(data);
  let enc;
  try {
    enc = typeof LZString !== 'undefined'
      ? LZString.compressToEncodedURIComponent(json)
      : btoa(unescape(encodeURIComponent(json)));
  } catch(e) { enc = btoa(json); }
  return 'https://playdropstack.com/whatthedoodle/?doodle=' + enc;
}

function shareSelectedDoodles() {
  const slots = loadDoodleSlots();
  const selected = [..._selectedDoodles].sort((a, b) => a - b);
  if (!selected.length) {
    const msg = document.getElementById('shareDoodlesMsg');
    if (msg) { msg.textContent = 'SELECT AT LEAST ONE DOODLE TO SHARE'; setTimeout(() => { msg.textContent = ''; }, 3000); }
    return;
  }
  const payloads = selected.map(i => slots[i].payload);
  const url = generateMultiDoodleUrl(payloads);
  const n = payloads.length;
  const title = n === 1 ? 'SHARE DOODLE' : `SHARE ${n} DOODLES`;
  const text  = n === 1 ? 'Can you guess what I drew?' : `Can you guess all ${n} of my drawings?`;
  showShareSheet(title, url, text);
}

function shareDay() {
  const p = loadProgress();
  const slots = p[playingDay] || [];
  const won = slots.filter(s => s > 0).length;
  const pts = slots.filter(s => s > 0).reduce((a, b) => a + b, 0);
  const url = 'https://playdropstack.com/whatthedoodle/';
  const result = won > 0 ? `✅ Got it! ${pts} pts` : `❌ Missed it`;
  const text = `What the Doodle? — Day ${playingDay + 1}\n${result}`;
  showShareSheet('What the Doodle?', url, text);
}

function shareDoodleResult() {
  const n    = _doodleResults.length;
  const wins = _doodleResults.filter(r => r.won).length;
  const text = n === 1
    ? (wins ? `I got it with ${_doodleResults[0].score} seconds to spare. Can you beat me?` : `I couldn't guess it. Can you?`)
    : `I got ${wins}/${n}. Can you do better?`;
  showShareSheet('SHARE YOUR RESULT', _doodleUrl, text);
}

function shareLevel() {
  const url = 'https://playdropstack.com/whatthedoodle/';
  const stars = currentMapNodeIdx !== undefined
    ? (loadStars()[currentDrawing?.id] || 0) : 0;
  const levelNum = (currentMapNodeIdx || 0) + 1;
  const starStr = stars > 0 ? '⭐'.repeat(stars) : '❌';
  const text = `What the Doodle? — Level ${levelNum}\n${starStr}`;
  showShareSheet('What the Doodle?', url, text);
}

function playRealGame() {
  closeShareSheet();
  showHome();
}
