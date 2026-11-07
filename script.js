pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const state = {
  pdf: null,
  numPages: 0,
  currentPage: 0,
  pageTextCache: {},
  sentences: [],
  currentSentenceIndex: 0,
  isPlaying: false,
  rate: 1,
  pitch: 1,
  voice: null,
};

const el = {
  pdfInput: document.getElementById("pdf-input"),
  statusText: document.getElementById("status-text"),
  readerSection: document.getElementById("reader-section"),
  uploadSection: document.getElementById("upload-section"),
  pageIndicator: document.getElementById("page-indicator"),
  prevPageBtn: document.getElementById("prev-page-btn"),
  nextPageBtn: document.getElementById("next-page-btn"),
  textDisplay: document.getElementById("text-display"),
  prevSentenceBtn: document.getElementById("prev-sentence-btn"),
  nextSentenceBtn: document.getElementById("next-sentence-btn"),
  playPauseBtn: document.getElementById("play-pause-btn"),
  rateSlider: document.getElementById("rate-slider"),
  rateValue: document.getElementById("rate-value"),
  pitchSlider: document.getElementById("pitch-slider"),
  pitchValue: document.getElementById("pitch-value"),
  voiceSelect: document.getElementById("voice-select"),
  autoPageCheckbox: document.getElementById("auto-page-checkbox"),
};

let wakeLock = null;

async function acquireWakeLock() {
  try {
    if ("wakeLock" in navigator) {
      wakeLock = await navigator.wakeLock.request("screen");
    }
  } catch (err) {
    console.warn("Wake lock alınamadı:", err);
  }
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release();
    wakeLock = null;
  }
}

function loadSettings() {
  const savedRate = localStorage.getItem("sk_rate");
  const savedPitch = localStorage.getItem("sk_pitch");
  if (savedRate) {
    state.rate = parseFloat(savedRate);
    el.rateSlider.value = state.rate;
    el.rateValue.textContent = state.rate.toFixed(1) + "x";
  }
  if (savedPitch) {
    state.pitch = parseFloat(savedPitch);
    el.pitchSlider.value = state.pitch;
    el.pitchValue.textContent = state.pitch.toFixed(1);
  }
}

function populateVoiceList() {
  const voices = speechSynthesis.getVoices();
  if (!voices.length) return;

  const savedVoiceName = localStorage.getItem("sk_voice");
  el.voiceSelect.innerHTML = "";

  const sorted = [...voices].sort((a, b) => {
    const aTr = a.lang.startsWith("tr") ? 0 : 1;
    const bTr = b.lang.startsWith("tr") ? 0 : 1;
    if (aTr !== bTr) return aTr - bTr;
    return a.name.localeCompare(b.name);
  });

  sorted.forEach((voice) => {
    const option = document.createElement("option");
    option.value = voice.name;
    option.textContent = `${voice.name} (${voice.lang})`;
    el.voiceSelect.appendChild(option);
  });

  let chosen = sorted.find((v) => v.name === savedVoiceName);
  if (!chosen) chosen = sorted.find((v) => v.lang.startsWith("tr"));
  if (!chosen) chosen = sorted[0];

  if (chosen) {
    el.voiceSelect.value = chosen.name;
    state.voice = chosen;
  }
}

function cancelSpeech() {
  speechSynthesis.cancel();
}

function splitSentences(text) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  const parts = cleaned.match(/[^.!?…]+[.!?…]*/g) || [cleaned];
  return parts.map((s) => s.trim()).filter((s) => s.length > 0);
}

async function getPageText(pageNum) {
  if (state.pageTextCache[pageNum]) return state.pageTextCache[pageNum];
  const page = await state.pdf.getPage(pageNum);
  const content = await page.getTextContent();
  const text = content.items.map((item) => item.str).join(" ");
  state.pageTextCache[pageNum] = text;
  return text;
}

function renderTextDisplay() {
  el.textDisplay.innerHTML = "";
  state.sentences.forEach((sentence, idx) => {
    const span = document.createElement("span");
    span.className = "sentence";
    span.dataset.idx = idx;
    span.textContent = sentence + " ";
    span.addEventListener("click", () => onSentenceClick(idx));
    el.textDisplay.appendChild(span);
  });
  highlightSentence(state.currentSentenceIndex);
}

function highlightSentence(idx) {
  el.textDisplay
    .querySelectorAll(".sentence")
    .forEach((node) => node.classList.remove("active"));
  const target = el.textDisplay.querySelector(`.sentence[data-idx="${idx}"]`);
  if (target) {
    target.classList.add("active");
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function updatePageIndicator() {
  el.pageIndicator.textContent = `Sayfa ${state.currentPage} / ${state.numPages}`;
  el.prevPageBtn.disabled = state.currentPage <= 1;
  el.nextPageBtn.disabled = state.currentPage >= state.numPages;
}

function updatePlayButton() {
  el.playPauseBtn.textContent = state.isPlaying ? "⏸ Duraklat" : "▶️ Oku";
}

async function goToPage(pageNum) {
  cancelSpeech();
  state.currentPage = pageNum;
  const text = await getPageText(pageNum);
  state.sentences = splitSentences(text);
  state.currentSentenceIndex = 0;
  renderTextDisplay();
  updatePageIndicator();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getProsodyAdjustment(sentence) {
  const lastChar = sentence.trim().slice(-1);
  if (lastChar === "?") return { pitchDelta: 0.18, rateDelta: -0.03 };
  if (lastChar === "!") return { pitchDelta: 0.1, rateDelta: 0.05 };
  if (lastChar === "," || lastChar === ";" || lastChar === ":") {
    return { pitchDelta: -0.03, rateDelta: -0.05 };
  }
  return { pitchDelta: 0, rateDelta: 0 };
}

function pauseAfterSentence(sentence) {
  const lastChar = sentence.trim().slice(-1);
  if (lastChar === "." || lastChar === "!" || lastChar === "?" || lastChar === "…") return 260;
  if (lastChar === "," || lastChar === ";" || lastChar === ":") return 130;
  return 60;
}

let speechToken = 0;

function speakCurrentSentence() {
  speechToken++;
  const token = speechToken;
  cancelSpeech();

  const sentence = state.sentences[state.currentSentenceIndex];

  if (!sentence) {
    onPageFinished();
    return;
  }

  highlightSentence(state.currentSentenceIndex);

  const prosody = getProsodyAdjustment(sentence);
  const utterance = new SpeechSynthesisUtterance(sentence);
  utterance.rate = clamp(state.rate + prosody.rateDelta, 0.3, 3);
  utterance.pitch = clamp(state.pitch + prosody.pitchDelta, 0, 2);
  if (state.voice) {
    utterance.voice = state.voice;
    utterance.lang = state.voice.lang;
  }

  utterance.onend = () => {
    if (!state.isPlaying || token !== speechToken) return;
    const pause = pauseAfterSentence(sentence);
    state.currentSentenceIndex++;
    setTimeout(() => {
      if (!state.isPlaying || token !== speechToken) return;
      speakCurrentSentence();
    }, pause);
  };

  utterance.onerror = (e) => {
    console.error("Konuşma hatası:", e);
  };

  speechSynthesis.speak(utterance);
}

async function onPageFinished() {
  const canAdvance =
    el.autoPageCheckbox.checked && state.currentPage < state.numPages;

  if (canAdvance) {
    await goToPage(state.currentPage + 1);
    if (state.isPlaying) speakCurrentSentence();
  } else {
    stopPlayback();
  }
}

function startPlayback() {
  if (!state.sentences.length) return;
  state.isPlaying = true;
  acquireWakeLock();
  updatePlayButton();
  speakCurrentSentence();
}

function stopPlayback() {
  state.isPlaying = false;
  cancelSpeech();
  releaseWakeLock();
  updatePlayButton();
}

function togglePlayPause() {
  if (state.isPlaying) {
    stopPlayback();
  } else {
    startPlayback();
  }
}

function onSentenceClick(idx) {
  state.currentSentenceIndex = idx;
  highlightSentence(idx);
  if (state.isPlaying) speakCurrentSentence();
}

function goToPrevSentence() {
  if (state.currentSentenceIndex > 0) {
    state.currentSentenceIndex--;
    highlightSentence(state.currentSentenceIndex);
    if (state.isPlaying) speakCurrentSentence();
  }
}

function goToNextSentence() {
  if (state.currentSentenceIndex < state.sentences.length - 1) {
    state.currentSentenceIndex++;
    highlightSentence(state.currentSentenceIndex);
    if (state.isPlaying) speakCurrentSentence();
  }
}

async function handlePdfUpload(file) {
  el.statusText.textContent = "PDF yükleniyor...";
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    state.pdf = pdf;
    state.numPages = pdf.numPages;
    state.pageTextCache = {};

    el.uploadSection.hidden = true;
    el.readerSection.hidden = false;

    await goToPage(1);
  } catch (err) {
    console.error(err);
    el.statusText.textContent = "PDF okunamadı, başka bir dosya dene.";
  }
}

el.pdfInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) handlePdfUpload(file);
});

el.playPauseBtn.addEventListener("click", togglePlayPause);
el.prevSentenceBtn.addEventListener("click", goToPrevSentence);
el.nextSentenceBtn.addEventListener("click", goToNextSentence);

el.prevPageBtn.addEventListener("click", async () => {
  if (state.currentPage > 1) {
    const wasPlaying = state.isPlaying;
    await goToPage(state.currentPage - 1);
    if (wasPlaying) speakCurrentSentence();
  }
});

el.nextPageBtn.addEventListener("click", async () => {
  if (state.currentPage < state.numPages) {
    const wasPlaying = state.isPlaying;
    await goToPage(state.currentPage + 1);
    if (wasPlaying) speakCurrentSentence();
  }
});

el.rateSlider.addEventListener("input", () => {
  state.rate = parseFloat(el.rateSlider.value);
  el.rateValue.textContent = state.rate.toFixed(1) + "x";
  localStorage.setItem("sk_rate", state.rate);
  if (state.isPlaying) speakCurrentSentence();
});

el.pitchSlider.addEventListener("input", () => {
  state.pitch = parseFloat(el.pitchSlider.value);
  el.pitchValue.textContent = state.pitch.toFixed(1);
  localStorage.setItem("sk_pitch", state.pitch);
  if (state.isPlaying) speakCurrentSentence();
});

el.voiceSelect.addEventListener("change", () => {
  const voices = speechSynthesis.getVoices();
  state.voice = voices.find((v) => v.name === el.voiceSelect.value) || null;
  if (state.voice) localStorage.setItem("sk_voice", state.voice.name);
  if (state.isPlaying) speakCurrentSentence();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && state.isPlaying) {
    acquireWakeLock();
  }
});

loadSettings();
populateVoiceList();
if ("onvoiceschanged" in speechSynthesis) {
  speechSynthesis.onvoiceschanged = populateVoiceList;
}
