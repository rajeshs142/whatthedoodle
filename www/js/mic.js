// Mic — uses Android RecognizerIntent (Google speech dialog)

function startMic() {
  const btn = document.getElementById('micBtn');
  if (btn && window.AndroidSpeech) btn.style.display = '';
}

function stopMic() {
  const btn = document.getElementById('micBtn');
  if (btn) btn.style.display = 'none';
  if (window.AndroidSpeech) window.AndroidSpeech.dismissSpeechInput();
}

function applyMicToggle() {}

function toggleMicManual() {
  if (gameOver || !window.AndroidSpeech) return;
  window.AndroidSpeech.startSpeechInput();
}

// Called by MainActivity after recognition
function onSpeechResult(word) {
  if (!word || gameOver) return;
  const input = document.getElementById('guessInput');
  if (!input) return;
  input.removeAttribute('readonly');
  input.value = word.toUpperCase();
  input.setAttribute('readonly', '');
  updateSuggestions(input);
}
