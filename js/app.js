import { spectrumFeatures, describeSound } from "./sound-description.mjs";

const tabs = [...document.querySelectorAll(".tab")];
const panels = [...document.querySelectorAll(".panel")];
const progressText = document.querySelector("#progressText");
const progressBar = document.querySelector("#progressBar");
const tabPosition = document.querySelector("#tabPosition");
const visited = new Set(JSON.parse(localStorage.getItem("audioLabVisited") || "[\"mission\"]"));

let audioContext;
let oscillator;
let toneGain;
let sweepTimer;
let micStream;
let micSource;
let micGain;
let micMonitorGain;
let micAnalyser;
let micWasSilent = false;
let micDescriptionFrequency;
let micDescriptionWave;
let micDescriptionHistory = [];
let micDescriptionSampleAt = 0;
let micDescriptionRenderAt = 0;
const soundDescription = document.querySelector("#soundDescription");
const soundDescriptionEvidence = document.querySelector("#soundDescriptionEvidence");
const soundDescriptionStatus = document.querySelector("#soundDescriptionStatus");
let mediaElementSource;
let mediaActiveSource;
let mediaAnalyser;
let mediaConnected = false;
let mediaMode = "idle";
let capturedAudioStream;
let loadedMediaUrl = "";
let challengeAnswer = null;
let challengePlayback = null;
let challengePlaybackRequest = 0;
let bioAnswer = null;
let bioScore = 0;
let bioRound = 0;
let quizQuestions = [];
let quizIndex = 0;
let quizCorrect = 0;
let quizAnswered = false;
let quizSpeechTimer;

const canvases = {
  tone: document.querySelector("#toneCanvas"),
  mic: document.querySelector("#micCanvas"),
  media: document.querySelector("#mediaCanvas")
};

const ctxs = Object.fromEntries(Object.entries(canvases).map(([key, canvas]) => [key, canvas.getContext("2d")]));
const micDeviceSelect = document.querySelector("#micDevice");

async function ensureAudio() {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }
  return audioContext;
}

function switchTab(id) {
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === id));
  panels.forEach((panel) => panel.classList.toggle("active", panel.id === id));
  document.body.classList.toggle("quiz-mode", id === "quiz");
  visited.add(id);
  localStorage.setItem("audioLabVisited", JSON.stringify([...visited]));
  updateProgress();
  document.querySelector(`#${id}`).focus({ preventScroll: true });
}

function updateProgress() {
  const activeIndex = tabs.findIndex((tab) => tab.classList.contains("active"));
  const percent = Math.round((visited.size / tabs.length) * 100);
  progressText.textContent = `${percent}%`;
  progressBar.style.width = `${percent}%`;
  tabPosition.textContent = `${activeIndex + 1} / ${tabs.length}`;
}

tabs.forEach((tab) => tab.addEventListener("click", () => switchTab(tab.dataset.tab)));
document.querySelectorAll("[data-go]").forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.go));
});
document.querySelector("#prevTab").addEventListener("click", () => {
  const index = tabs.findIndex((tab) => tab.classList.contains("active"));
  switchTab(tabs[Math.max(0, index - 1)].dataset.tab);
});
document.querySelector("#nextTab").addEventListener("click", () => {
  const index = tabs.findIndex((tab) => tab.classList.contains("active"));
  switchTab(tabs[Math.min(tabs.length - 1, index + 1)].dataset.tab);
});

function drawGrid(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#050a12";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#162841";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 42) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function drawToneWave() {
  const canvas = canvases.tone;
  const ctx = ctxs.tone;
  const frequency = Number(document.querySelector("#frequencyInput").value);
  const volume = Number(document.querySelector("#volumeRange").value);
  drawGrid(ctx, canvas.width, canvas.height);
  ctx.lineWidth = 4;
  ctx.strokeStyle = frequency > 12000 ? "#ffbf3f" : frequency > 2000 ? "#4e8cff" : "#18b6a2";
  ctx.beginPath();
  const cycles = Math.max(0.5, Math.min(28, frequency / 360));
  const amp = 36 + volume * 520;
  for (let x = 0; x < canvas.width; x += 2) {
    const y = canvas.height / 2 + Math.sin((x / canvas.width) * cycles * Math.PI * 2) * amp;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = "#e9f2ff";
  ctx.font = "22px Microsoft JhengHei, sans-serif";
  ctx.fillText(`${frequency.toLocaleString()} Hz`, 28, 42);
  requestAnimationFrame(drawToneWave);
}

function updateToneLabels() {
  const frequency = Number(document.querySelector("#frequencyInput").value);
  document.querySelector("#currentFrequency").textContent = `${frequency.toLocaleString()} Hz`;
  document.querySelector("#waveLabel").textContent = frequency < 300 ? "波距長" : frequency < 2000 ? "中等" : "波距短";
  document.querySelector("#pitchLabel").textContent =
    frequency < 80 ? "接近低頻震動" :
    frequency < 300 ? "低沉" :
    frequency < 2000 ? "清楚可辨" :
    frequency < 9000 ? "尖亮" :
    "極高頻";
  if (oscillator) oscillator.frequency.setTargetAtTime(Math.max(1, frequency), audioContext.currentTime, 0.01);
}

function setFrequency(value) {
  const next = Math.min(30000, Math.max(0, Number(value) || 0));
  document.querySelector("#frequencyInput").value = next;
  document.querySelector("#frequencyRange").value = next;
  updateToneLabels();
}

document.querySelector("#frequencyRange").addEventListener("input", (event) => setFrequency(event.target.value));
document.querySelector("#setFrequency").addEventListener("click", () => setFrequency(document.querySelector("#frequencyInput").value));
document.querySelectorAll("[data-frequency]").forEach((button) => {
  button.addEventListener("click", () => setFrequency(button.dataset.frequency));
});
document.querySelector("#volumeRange").addEventListener("input", (event) => {
  if (toneGain) toneGain.gain.setTargetAtTime(Number(event.target.value), audioContext.currentTime, 0.02);
});

function stopTone() {
  clearInterval(sweepTimer);
  sweepTimer = null;
  if (oscillator) {
    oscillator.stop();
    oscillator.disconnect();
    oscillator = null;
  }
}

document.querySelector("#playTone").addEventListener("click", () => {
  stopTone();
  ensureAudio().then((context) => {
    oscillator = context.createOscillator();
    toneGain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = Math.max(1, Number(document.querySelector("#frequencyInput").value));
    toneGain.gain.value = Number(document.querySelector("#volumeRange").value);
    oscillator.connect(toneGain).connect(context.destination);
    oscillator.start();
  });
});
document.querySelector("#stopTone").addEventListener("click", stopTone);
document.querySelector("#sweepTone").addEventListener("click", () => {
  document.querySelector("#playTone").click();
  let value = 120;
  clearInterval(sweepTimer);
  sweepTimer = setInterval(() => {
    value += 120;
    setFrequency(value);
    if (value >= 6000) {
      clearInterval(sweepTimer);
      sweepTimer = null;
    }
  }, 120);
});

function rmsToDb(data) {
  let sum = 0;
  for (const value of data) {
    const centered = (value - 128) / 128;
    sum += centered * centered;
  }
  const rms = Math.sqrt(sum / data.length);
  return Math.max(0, Math.min(100, 20 * Math.log10(rms || 0.00001) + 100));
}

async function loadMicDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) {
    document.querySelector("#micStatus").textContent = "這個瀏覽器不支援麥克風裝置列表。";
    return;
  }
  const devices = await navigator.mediaDevices.enumerateDevices();
  const audioInputs = devices.filter((device) => device.kind === "audioinput");
  const previous = micDeviceSelect.value;
  micDeviceSelect.innerHTML = '<option value="">瀏覽器預設麥克風</option>';
  audioInputs.forEach((device, index) => {
    const option = document.createElement("option");
    option.value = device.deviceId;
    option.textContent = device.label || `麥克風 ${index + 1}`;
    micDeviceSelect.append(option);
  });
  if ([...micDeviceSelect.options].some((option) => option.value === previous)) {
    micDeviceSelect.value = previous;
  }
  document.querySelector("#micStatus").textContent = audioInputs.length
    ? `偵測到 ${audioInputs.length} 個輸入裝置，請選一個再開啟麥克風。`
    : "沒有偵測到麥克風輸入裝置。";
}

function getWaveStats(data) {
  let min = 255;
  let max = 0;
  let sum = 0;
  for (const value of data) {
    if (value < min) min = value;
    if (value > max) max = value;
    const centered = value - 128;
    sum += centered * centered;
  }
  return {
    min,
    max,
    peakToPeak: max - min,
    rms: Math.sqrt(sum / data.length) / 128
  };
}

function drawSpectrum(canvas, ctx, analyser, mode = "bars") {
  const data = new Uint8Array(analyser.frequencyBinCount);
  const timeData = new Uint8Array(analyser.fftSize);
  analyser.getByteFrequencyData(data);
  analyser.getByteTimeDomainData(timeData);
  drawGrid(ctx, canvas.width, canvas.height);
  const barWidth = canvas.width / data.length;
  let max = 0;
  let maxIndex = 0;
  let highEnergy = 0;
  let lowEnergy = 0;
  data.forEach((value, index) => {
    if (value > max) {
      max = value;
      maxIndex = index;
    }
    if (index < data.length * 0.16) lowEnergy += value;
    if (index > data.length * 0.55) highEnergy += value;
    const height = Math.max(mode === "mic" && value > 0 ? 3 : 0, (value / 255) * canvas.height * 0.82);
    const hue = mode === "media" ? 170 + (index / data.length) * 120 : 170 - (index / data.length) * 80;
    ctx.fillStyle = `hsl(${hue}, 86%, ${42 + value / 8}%)`;
    ctx.fillRect(index * barWidth, canvas.height - height, Math.max(1, barWidth - 1), height);
  });
  const waveStats = getWaveStats(timeData);
  if (mode === "media" || mode === "mic") {
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = mode === "mic" ? "rgba(255, 191, 63, 0.86)" : "rgba(255, 191, 63, 0.75)";
    ctx.lineWidth = mode === "mic" ? 4 : 3;
    ctx.beginPath();
    const autoScale = mode === "mic" ? Math.max(1, Math.min(28, 72 / Math.max(1, waveStats.peakToPeak))) : 1;
    for (let i = 0; i < timeData.length; i += 4) {
      const x = (i / timeData.length) * canvas.width;
      const y = canvas.height * 0.46 + ((timeData[i] - 128) / 128) * (mode === "mic" ? 130 * autoScale : 90);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
    if (mode === "mic") {
      ctx.fillStyle = waveStats.peakToPeak <= 2 ? "#ffbf3f" : "#a8b8cc";
      ctx.font = "20px Microsoft JhengHei, sans-serif";
      ctx.fillText(`訊號振幅 ${waveStats.peakToPeak}`, 24, canvas.height - 24);
    }
  }
  const db = rmsToDb(timeData);
  const peakFrequency = Math.round((maxIndex * audioContext.sampleRate) / analyser.fftSize);
  return { db, peakFrequency, lowEnergy, highEnergy, max, waveStats };
}

async function startMic() {
  const context = await ensureAudio();
  if (micStream) stopMic();
  const deviceId = micDeviceSelect.value;
  const audioConstraints = deviceId ? { deviceId: { exact: deviceId } } : true;
  micStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
  micSource = context.createMediaStreamSource(micStream);
  micGain = context.createGain();
  micGain.gain.value = Number(document.querySelector("#micSensitivity").value);
  micMonitorGain = context.createGain();
  micMonitorGain.gain.value = 0;
  micAnalyser = context.createAnalyser();
  micAnalyser.fftSize = 4096;
  micAnalyser.minDecibels = -110;
  micAnalyser.maxDecibels = -10;
  micAnalyser.smoothingTimeConstant = 0.55;
  micWasSilent = false;
  micDescriptionFrequency = new Float32Array(micAnalyser.frequencyBinCount);
  micDescriptionWave = new Float32Array(micAnalyser.fftSize);
  resetSoundDescription('正在收音，請發出聲音，觀察音質與音色的變化。', '正在觀察');
  document.querySelector("#freezeMic").checked = false;
  micSource.connect(micGain);
  micGain.connect(micAnalyser);
  micGain.connect(micMonitorGain).connect(context.destination);
  const track = micStream.getAudioTracks()[0];
  track?.addEventListener('ended', stopMic, { once: true });
  const label = track?.label ? `裝置：${track.label}。` : "";
  await loadMicDevices();
  document.querySelector("#micStatus").textContent = `麥克風已啟用，AudioContext：${context.state}。${label}請調整靈敏度並說話或拍手。`;
}

function stopMic() {
  if (micStream) {
    micStream.getTracks().forEach((track) => track.stop());
  }
  micSource?.disconnect();
  micGain?.disconnect();
  micMonitorGain?.disconnect();
  micAnalyser?.disconnect();
  micStream = null;
  micSource = null;
  micGain = null;
  micMonitorGain = null;
  micAnalyser = null;
  micDescriptionFrequency = null;
  micDescriptionWave = null;
  document.querySelector("#freezeMic").checked = false;
  document.querySelector("#dbValue").textContent = '-- dB';
  document.querySelector("#peakFrequency").textContent = '-- Hz';
  document.querySelector("#soundState").textContent = '已停止';
  document.querySelector("#dbFill").style.height = '0%';
  resetSoundDescription('收音已停止。重新開啟麥克風後，會繼續描述目前聲音的音質與音色。', '已停止');
  document.querySelector("#micStatus").textContent = "麥克風已停止。";
}

document.querySelector("#startMic").addEventListener("click", async () => {
  try {
    await startMic();
  } catch (error) {
    document.querySelector("#micStatus").textContent = `無法開啟麥克風：${error.message}`;
    resetSoundDescription('目前無法收音。請確認麥克風權限與輸入裝置後，再開啟麥克風。', '無法收音');
  }
});
document.querySelector("#stopMic").addEventListener("click", stopMic);
document.querySelector("#refreshMicDevices").addEventListener("click", async () => {
  try {
    await loadMicDevices();
  } catch (error) {
    document.querySelector("#micStatus").textContent = `無法偵測麥克風：${error.message}`;
  }
});
micDeviceSelect.addEventListener("change", async () => {
  if (!micStream) return;
  try {
    await startMic();
  } catch (error) {
    document.querySelector("#micStatus").textContent = `切換麥克風失敗：${error.message}`;
  }
});
document.querySelector("#micSensitivity").addEventListener("input", (event) => {
  if (micGain && audioContext) {
    micGain.gain.setTargetAtTime(Number(event.target.value), audioContext.currentTime, 0.03);
  }
});

function resetSoundDescription(text, state) {
  micDescriptionHistory = [];
  micDescriptionSampleAt = 0;
  micDescriptionRenderAt = 0;
  soundDescription.textContent = text;
  soundDescriptionEvidence.textContent = '';
  soundDescriptionStatus.textContent = state;
}

document.querySelector('#freezeMic').addEventListener('change', event => {
  if (!micAnalyser) return;
  soundDescriptionStatus.textContent = event.target.checked ? '已凍結・保留當下描述' : '正在觀察';
  if (!event.target.checked) {
    micDescriptionHistory = [];
    micDescriptionSampleAt = 0;
    micDescriptionRenderAt = 0;
  }
});

function updateSoundDescription(now) {
  if (now - micDescriptionSampleAt < 250) return;
  micDescriptionSampleAt = now;
  micAnalyser.getFloatFrequencyData(micDescriptionFrequency);
  micAnalyser.getFloatTimeDomainData(micDescriptionWave);
  micDescriptionHistory.push(spectrumFeatures(micDescriptionFrequency, micDescriptionWave, audioContext.sampleRate, micAnalyser.fftSize));
  if (micDescriptionHistory.length > 6) micDescriptionHistory.shift();
  if (now - micDescriptionRenderAt < 750) return;
  micDescriptionRenderAt = now;
  const description = describeSound(micDescriptionHistory);
  if (soundDescription.textContent !== description.text) soundDescription.textContent = description.text;
  soundDescriptionEvidence.textContent = description.evidence;
  soundDescriptionStatus.textContent = description.state;
}

function animateMic(now = performance.now()) {
  if (micAnalyser && !document.querySelector("#freezeMic").checked) {
    const result = drawSpectrum(canvases.mic, ctxs.mic, micAnalyser, "mic");
    updateSoundDescription(now);
    document.querySelector("#dbValue").textContent = `${result.db.toFixed(1)} dB`;
    document.querySelector("#peakFrequency").textContent = result.max > 2 && result.waveStats.peakToPeak > 2 ? `${result.peakFrequency} Hz` : "-- Hz";
    document.querySelector("#dbFill").style.height = `${result.db}%`;
    document.querySelector("#soundState").textContent = result.waveStats.peakToPeak <= 2 ? "未收到訊號" : result.db < 35 ? "安靜" : result.db < 68 ? "一般聲音" : "偏大聲";
    if (result.waveStats.peakToPeak <= 2) {
      micWasSilent = true;
      const selectedLabel = micDeviceSelect.selectedOptions[0]?.textContent || "目前裝置";
      document.querySelector("#micStatus").textContent = `${selectedLabel} 已開啟，但目前收到靜音。請從「輸入裝置」改選其他麥克風，或檢查 Windows 輸入音量是否有跳動。`;
    } else if (micWasSilent) {
      micWasSilent = false;
      document.querySelector("#micStatus").textContent = '已收到聲音，譜圖與音質、音色描述會隨收音更新。';
    }
  } else if (!micAnalyser) {
    drawIdle(canvases.mic, ctxs.mic, "等待麥克風");
  }
  requestAnimationFrame(animateMic);
}

const mediaPlayer = document.querySelector("#mediaPlayer");
const mediaStatus = document.querySelector("#mediaStatus");
const youtubeEmbed = document.querySelector("#youtubeEmbed");
const youtubeFallback = document.querySelector("#youtubeFallback");

function getYouTubeId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.split("/").filter(Boolean)[0] || "";
    }
    if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname.startsWith("/shorts/") || parsed.pathname.startsWith("/embed/")) {
        return parsed.pathname.split("/").filter(Boolean)[1] || "";
      }
      return parsed.searchParams.get("v") || "";
    }
  } catch {
    return "";
  }
  return "";
}

function resetMediaAnalysis() {
  mediaMode = "idle";
  document.querySelector("#beatEnergy").textContent = "--";
  document.querySelector("#brightnessValue").textContent = "--";
}

function stopCapturedAudio() {
  if (capturedAudioStream) {
    capturedAudioStream.getTracks().forEach((track) => track.stop());
  }
  capturedAudioStream = null;
}

function connectMediaAnalysis(source, context) {
  if (!mediaAnalyser) {
    mediaAnalyser = context.createAnalyser();
    mediaAnalyser.fftSize = 2048;
  }
  if (mediaActiveSource && mediaActiveSource !== source) {
    try {
      mediaActiveSource.disconnect();
    } catch {
      // The node may already be disconnected.
    }
    mediaConnected = false;
  }
  if (!mediaConnected || mediaActiveSource !== source) {
    source.connect(mediaAnalyser);
    mediaAnalyser.connect(context.destination);
    mediaActiveSource = source;
    mediaConnected = true;
  }
}

function loadMediaUrl(url) {
  if (!url) return "empty";
  loadedMediaUrl = url;
  resetMediaAnalysis();
  stopCapturedAudio();
  const youtubeId = getYouTubeId(url);
  if (youtubeId) {
    const safeYouTubeUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeId)}`;
    mediaPlayer.pause();
    mediaPlayer.removeAttribute("src");
    mediaPlayer.load();
    mediaPlayer.hidden = true;
    mediaMode = "youtube";
    youtubeFallback.hidden = false;
    youtubeFallback.innerHTML = `<strong>YouTube 連結</strong><p class="hint">YouTube 不能被網頁直接讀取聲音。按「播放」或「分析 YouTube 聲音」後，請在 Chrome 分享視窗選擇播放中的 YouTube 分頁並勾選分頁音訊。</p><a href="${safeYouTubeUrl}" target="_blank" rel="noreferrer">在 YouTube 開啟</a>`;
    youtubeEmbed.hidden = false;
    youtubeEmbed.innerHTML = `<iframe title="YouTube 播放器" src="https://www.youtube.com/embed/${youtubeId}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
    mediaStatus.textContent = "已載入 YouTube。按「播放」會開啟 Chrome 分頁音訊擷取視窗；選擇 YouTube 分頁並勾選分頁音訊後，就會產生音頻圖。";
    drawIdle(canvases.media, ctxs.media, "按播放後選擇 YouTube 分頁音訊");
    return "youtube";
  }
  youtubeEmbed.hidden = true;
  youtubeEmbed.innerHTML = "";
  youtubeFallback.hidden = true;
  youtubeFallback.innerHTML = "";
  mediaPlayer.hidden = false;
  mediaMode = "direct";
  mediaPlayer.src = url;
  mediaStatus.textContent = "已載入直接媒體網址，按播放後會產生動態音頻圖。若仍無法播放，來源網站可能封鎖跨站串流。";
  return "direct";
}

async function captureTabAudio() {
  const context = await ensureAudio();
  stopCapturedAudio();
  capturedAudioStream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: true
  });
  const hasAudio = capturedAudioStream.getAudioTracks().length > 0;
  if (!hasAudio) {
    capturedAudioStream.getTracks().forEach((track) => track.stop());
    capturedAudioStream = null;
    mediaStatus.textContent = "沒有擷取到分頁音訊。請在 Chrome 分享視窗選擇分頁，並勾選「分享分頁音訊」。";
    return;
  }
  const streamSource = context.createMediaStreamSource(capturedAudioStream);
  connectMediaAnalysis(streamSource, context);
  mediaMode = "capture";
  mediaStatus.textContent = "正在分析 YouTube/分頁音訊。請確認影片正在播放，且分享時有勾選分頁音訊。";
  capturedAudioStream.getVideoTracks().forEach((track) => {
    track.addEventListener("ended", () => {
      mediaMode = "idle";
      mediaStatus.textContent = "分頁音訊擷取已停止。";
    });
  });
}

document.querySelector("#mediaFile").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    resetMediaAnalysis();
    stopCapturedAudio();
    youtubeEmbed.hidden = true;
    youtubeEmbed.innerHTML = "";
    youtubeFallback.hidden = true;
    youtubeFallback.innerHTML = "";
    mediaPlayer.hidden = false;
    mediaMode = "direct";
    loadedMediaUrl = "";
    mediaPlayer.src = URL.createObjectURL(file);
    mediaStatus.textContent = "已載入本機媒體檔，按播放後會產生動態音頻圖。";
  }
});
document.querySelector("#loadUrl").addEventListener("click", () => {
  const url = document.querySelector("#mediaUrl").value.trim();
  loadMediaUrl(url);
});
document.querySelector("#playMedia").addEventListener("click", async () => {
  const url = document.querySelector("#mediaUrl").value.trim();
  if (url && (url !== loadedMediaUrl || (mediaMode !== "direct" && mediaMode !== "youtube"))) {
    loadMediaUrl(url);
  }
  if (mediaMode === "youtube") {
    mediaStatus.textContent = "正在開啟分頁音訊擷取。請選擇播放 YouTube 的分頁，並勾選「分享分頁音訊」。";
    try {
      await captureTabAudio();
    } catch (error) {
      mediaStatus.textContent = `無法分析 YouTube 聲音：${error.message}`;
    }
    return;
  }
  if (mediaPlayer.hidden || !mediaPlayer.currentSrc) {
    if (url) loadMediaUrl(url);
    if (mediaPlayer.hidden || !mediaPlayer.currentSrc) {
      mediaStatus.textContent = "目前沒有可分析的媒體。請貼上直接媒體網址，或貼 YouTube 後按播放並選擇分頁音訊。";
      return;
    }
  }
  const context = await ensureAudio();
  if (!mediaElementSource) {
    mediaElementSource = context.createMediaElementSource(mediaPlayer);
  }
  connectMediaAnalysis(mediaElementSource, context);
  try {
    await mediaPlayer.play();
    mediaStatus.textContent = "正在分析媒體聲音並產生動態音頻圖。";
  } catch (error) {
    mediaStatus.textContent = `播放失敗：${error.message}。請改用本機檔案或可直接串流的媒體檔。`;
  }
});
document.querySelector("#pauseMedia").addEventListener("click", () => {
  if (!mediaPlayer.hidden) mediaPlayer.pause();
});
document.querySelector("#captureTabAudio").addEventListener("click", async () => {
  try {
    await captureTabAudio();
  } catch (error) {
    mediaStatus.textContent = `無法擷取分頁音訊：${error.message}`;
  }
});

function animateMedia() {
  if (mediaMode === "youtube") {
    drawIdle(canvases.media, ctxs.media, "按播放後選擇 YouTube 分頁音訊");
  } else if ((mediaMode === "direct" || mediaMode === "capture") && mediaAnalyser) {
    const result = drawSpectrum(canvases.media, ctxs.media, mediaAnalyser, "media");
    document.querySelector("#beatEnergy").textContent = result.lowEnergy > 22000 ? "強" : result.lowEnergy > 9000 ? "中" : "弱";
    document.querySelector("#brightnessValue").textContent = result.highEnergy > 28000 ? "明亮" : result.highEnergy > 13000 ? "普通" : "溫和";
  } else {
    drawIdle(canvases.media, ctxs.media, "等待媒體播放");
  }
  requestAnimationFrame(animateMedia);
}

function drawIdle(canvas, ctx, label) {
  drawGrid(ctx, canvas.width, canvas.height);
  ctx.fillStyle = "#a8b8cc";
  ctx.font = "24px Microsoft JhengHei, sans-serif";
  ctx.fillText(label, 28, 46);
}

function stopChallengeTone() {
  // Also cancel a start that is still waiting for AudioContext.resume().
  challengePlaybackRequest++;
  if (challengePlayback) {
    const { osc, gain, context } = challengePlayback;
    const now = context.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setTargetAtTime(0, now, 0.005);
    osc.stop(now + 0.03);
    challengePlayback = null;
  }
  document.querySelector('#stopChallenge').disabled = true;
  document.querySelector('#challengeStatus').textContent = '已停止播放，仍可選擇答案或重新出題。';
}

async function playChallengeTone(frequency) {
  stopChallengeTone();
  const request = challengePlaybackRequest;
  document.querySelector('#stopChallenge').disabled = false;
  document.querySelector('#challengeStatus').textContent = '正在準備聲音…';
  try {
    const context = await ensureAudio();
    if (request !== challengePlaybackRequest) return;
    const osc = context.createOscillator();
    const gain = context.createGain();
    const compressor = context.createDynamicsCompressor();
    const baseVolume = Number(document.querySelector("#challengeVolume")?.value || 0.28);
    const compensation = frequency < 180 ? 1.45 : frequency > 7000 ? 1.3 : 1;
    const volume = Math.min(0.72, baseVolume * compensation);
    osc.frequency.value = frequency;
    osc.type = "triangle";
    compressor.threshold.value = -16;
    compressor.knee.value = 18;
    compressor.ratio.value = 7;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.16;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(volume, context.currentTime + 0.04);
    gain.gain.setValueAtTime(volume, context.currentTime + 5.9);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 6);
    osc.connect(gain).connect(compressor).connect(context.destination);
    const playback = { osc, gain, context };
    challengePlayback = playback;
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
      compressor.disconnect();
      if (challengePlayback !== playback) return;
      challengePlayback = null;
      document.querySelector('#stopChallenge').disabled = true;
      document.querySelector('#challengeStatus').textContent = '播放完畢，請選出你聽到的頻率範圍。';
    };
    osc.start();
    osc.stop(context.currentTime + 6);
    document.querySelector('#challengeStatus').textContent = '播放中・6 秒後自動停止，也可按「停止」。';
  } catch (error) {
    if (request !== challengePlaybackRequest) return;
    stopChallengeTone();
    document.querySelector('#challengeStatus').textContent = `無法播放聲音：${error.message}。請重新出題。`;
  }
}

document.querySelector('#stopChallenge').addEventListener('click', stopChallengeTone);

document.querySelector("#newChallenge").addEventListener("click", () => {
  const bank = [
    { key: "low", min: 80, max: 300 },
    { key: "mid", min: 300, max: 2000 },
    { key: "high", min: 2000, max: 9000 },
    { key: "ultra", min: 9000, max: 15000 }
  ];
  const item = bank[Math.floor(Math.random() * bank.length)];
  const frequency = Math.round(item.min + Math.random() * (item.max - item.min));
  challengeAnswer = item.key;
  playChallengeTone(frequency);
  document.querySelector("#gameFeedback").textContent = "請選出你聽到的頻率範圍。";
});
document.querySelector("#frequencyChoices").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || !challengeAnswer) return;
  document.querySelector("#gameFeedback").textContent =
    button.dataset.choice === challengeAnswer ? "答對了！你的耳朵抓到頻率線索。" : "再試一次。可以注意聲音是沉、清楚、尖，還是幾乎聽不到。";
});

const biologicalSounds = [
  { id: "dog", name: "狗", group: "哺乳類" },
  { id: "cat", name: "貓", group: "哺乳類" },
  { id: "frog", name: "青蛙", group: "兩棲類" },
  { id: "cricket", name: "蟋蟀", group: "昆蟲" },
  { id: "bee", name: "蜜蜂", group: "昆蟲" },
  { id: "mosquito", name: "蒼蠅", group: "昆蟲" },
  { id: "owl", name: "貓頭鷹", group: "鳥類" },
  { id: "dolphin", name: "海豚", group: "海洋哺乳類" },
  { id: "whale", name: "鯨魚", group: "海洋哺乳類" },
  { id: "rooster", name: "公雞", group: "鳥類" },
  { id: "cow", name: "牛", group: "哺乳類" },
  { id: "sheep", name: "羊", group: "哺乳類" },
  { id: "horse", name: "馬", group: "哺乳類" },
  { id: "elephant", name: "大象", group: "哺乳類" },
  { id: "wolf", name: "狼", group: "哺乳類" },
  { id: "crow", name: "烏鴉", group: "鳥類" },
  { id: "duck", name: "鴨子", group: "鳥類" },
  { id: "cicada", name: "蟬", group: "昆蟲" },
  { id: "monkey", name: "猴子", group: "哺乳類" },
  { id: "pig", name: "豬", group: "哺乳類" },
  { id: "snake", name: "蛇", group: "爬蟲類" },
  { id: "goat", name: "山羊", group: "哺乳類" }
];

const bioVoiceHints = {
  dog: "汪 汪",
  cat: "喵 嗚",
  frog: "呱 呱",
  cricket: "唧 唧 唧",
  bee: "嗡 嗡",
  mosquito: "嗯 嗡",
  owl: "呼 呼",
  dolphin: "咿 咿",
  whale: "嗚 嗚",
  rooster: "喔 喔 啼",
  cow: "哞",
  sheep: "咩 咩",
  horse: "嘶 嘶",
  elephant: "嗚 哞",
  wolf: "嗷 嗚",
  crow: "啊 啊",
  duck: "嘎 嘎",
  cicada: "知 了 知 了",
  monkey: "吱 吱",
  pig: "哼 哼",
  snake: "嘶 嘶",
  goat: "咩 欸"
};

function speakBioHint(id) {
  if (!document.querySelector("#bioVoiceHint")?.checked || !("speechSynthesis" in window)) return;
  const text = bioVoiceHints[id];
  if (!text) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-TW";
  utterance.rate = 0.86;
  utterance.pitch = id === "elephant" || id === "cow" || id === "whale" ? 0.55 : id === "mosquito" || id === "cricket" || id === "cicada" ? 1.55 : 1.08;
  utterance.volume = Math.min(1, Math.max(0.35, Number(document.querySelector("#bioVolume")?.value || 1.7) / 2.4));
  bioHintTimer = setTimeout(() => window.speechSynthesis.speak(utterance), 130);
}

let bioManifest = {};
let bioAudioEl;
let bioMediaSource;
let bioGainNode;
let bioStopTimer;
let bioHintTimer;
let bioPlaybackRequest = 0;
let bioReady = false;
let bioDeck = [];
const BIO_MAX_SECONDS = 5;

async function loadBioManifest() {
  const button = document.querySelector('#newBioChallenge');
  button.disabled = true;
  try {
    const response = await fetch("./audio/bio/manifest.json");
    if (!response.ok) throw new Error(String(response.status));
    bioManifest = await response.json();
    const known = new Set(biologicalSounds.map(item => item.id));
    for (const [id, entry] of Object.entries(bioManifest)) {
      if (!known.has(id) && entry.name && entry.group && entry.file) {
        biologicalSounds.push({ id, name: entry.name, group: entry.group });
        known.add(id);
      }
    }
    if (biologicalSounds.some(item => !bioManifest[item.id]?.file)) throw new Error('題庫缺少錄音');
    bioReady = true;
    button.textContent = '隨機出題';
    document.querySelector('#bioBankStatus').textContent = `題庫共 ${biologicalSounds.length} 種・新增 ${Object.values(bioManifest).filter(entry => entry.addedOn).length} 種・同一輪不重複出題`;
  } catch {
    bioManifest = {};
    bioReady = false;
    button.textContent = '重新載入題庫';
    document.querySelector('#bioBankStatus').textContent = '題庫載入失敗，請按「重新載入題庫」再試一次。';
  }
  button.disabled = false;
  renderAudioCredits();
}

function renderAudioCredits() {
  const section = document.querySelector("#audioCredits");
  const list = document.querySelector("#audioCreditsList");
  if (!section || !list) return;
  const nameById = Object.fromEntries(biologicalSounds.map((item) => [item.id, item.name]));
  const entries = biologicalSounds
    .map((item) => ({ id: item.id, name: nameById[item.id], ...bioManifest[item.id] }))
    .filter((entry) => entry.file);
  if (!entries.length) {
    section.hidden = true;
    return;
  }
  list.innerHTML = entries.map((entry) => {
    const title = (entry.src || entry.file).replace(/^File:/, "");
    const source = entry.sourcePage || entry.url
      ? `<a href="${escapeHtml(entry.sourcePage || entry.url)}" target="_blank" rel="noreferrer">${escapeHtml(title)}</a>`
      : title;
    const license = entry.licenseUrl ? `（<a href="${escapeHtml(entry.licenseUrl)}" target="_blank" rel="noreferrer">${escapeHtml(entry.license)}</a>）` : entry.license ? `（${escapeHtml(entry.license)}）` : '';
    const author = entry.artist ? `，作者：${escapeHtml(entry.artist)}` : "";
    const edits = entry.modifications ? `<br><small>${escapeHtml(entry.modifications)}</small>` : '';
    return `<li><strong>${escapeHtml(entry.name)}</strong>：${source}${author}${license}${edits}</li>`;
  }).join("");
  section.hidden = false;
}

function bioVolume() {
  return Number(document.querySelector("#bioVolume")?.value || 1.7);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
}

async function playRealBioSound(entry, request) {
  const context = await ensureAudio();
  if (request !== bioPlaybackRequest) return false;
  if (!bioAudioEl) {
    bioAudioEl = new Audio();
    bioAudioEl.preload = "auto";
    bioMediaSource = context.createMediaElementSource(bioAudioEl);
    bioGainNode = context.createGain();
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 20;
    compressor.ratio.value = 8;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.18;
    bioMediaSource.connect(bioGainNode).connect(compressor).connect(context.destination);
  }
  bioGainNode.gain.setTargetAtTime(bioVolume(), context.currentTime, 0.02);
  clearTimeout(bioStopTimer);
  bioAudioEl.pause();
  bioAudioEl.src = `./audio/bio/${entry.file}`;
  bioAudioEl.currentTime = 0;
  await bioAudioEl.play();
  if (request !== bioPlaybackRequest) return false;
  bioStopTimer = setTimeout(() => {
    if (request === bioPlaybackRequest) bioAudioEl.pause();
  }, BIO_MAX_SECONDS * 1000);
  return true;
}

async function playBiologicalSound(id) {
  const request = ++bioPlaybackRequest;
  clearTimeout(bioStopTimer);
  clearTimeout(bioHintTimer);
  bioAudioEl?.pause();
  window.speechSynthesis?.cancel();
  const entry = bioManifest[id];
  try {
    if (!entry?.file) throw new Error('缺少真實錄音');
    if (await playRealBioSound(entry, request)) {
      if (document.querySelector('#bioFeedback').textContent.includes('暫時無法播放')) {
        document.querySelector('#bioFeedback').textContent = `第 ${bioRound} 題：仔細聽，猜猜是哪一種生物。`;
      }
      speakBioHint(id);
    }
  } catch {
    if (request !== bioPlaybackRequest) return;
    document.querySelector('#bioFeedback').textContent = '這段真實錄音暫時無法播放，請按「重播聲音」或重新出題。';
  }
}

function shuffled(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function pickOptions(answer) {
  const options = [answer];
  const pool = shuffled(biologicalSounds.filter((item) => item.id !== answer.id));
  options.push(...pool.slice(0, 3));
  return shuffled(options);
}

async function startBioChallenge() {
  if (!bioReady) {
    await loadBioManifest();
    if (!bioReady) return;
  }
  if (!bioDeck.length) {
    bioDeck = shuffled(biologicalSounds);
    if (bioDeck.at(-1)?.id === bioAnswer?.id) [bioDeck[0], bioDeck[bioDeck.length - 1]] = [bioDeck.at(-1), bioDeck[0]];
  }
  bioAnswer = bioDeck.pop();
  document.querySelector('#replayBioSound').disabled = false;
  bioRound += 1;
  document.querySelector("#bioRound").textContent = String(bioRound);
  document.querySelector("#bioGroup").textContent = bioAnswer.group;
  document.querySelector("#bioChoices").innerHTML = pickOptions(bioAnswer).map((item) =>
    `<button data-bio="${item.id}">${item.name}</button>`
  ).join("");
  document.querySelector("#bioFeedback").textContent = `第 ${bioRound} 題：仔細聽，猜猜是哪一種生物。`;
  playBiologicalSound(bioAnswer.id);
}

document.querySelector("#bioVolume").addEventListener("input", () => {
  if (bioGainNode && audioContext) {
    bioGainNode.gain.setTargetAtTime(bioVolume(), audioContext.currentTime, 0.03);
  }
});
document.querySelector("#newBioChallenge").addEventListener("click", startBioChallenge);
document.querySelector("#replayBioSound").addEventListener("click", () => {
  if (!bioAnswer) {
    document.querySelector("#bioFeedback").textContent = "請先按「隨機出題」。";
    return;
  }
  playBiologicalSound(bioAnswer.id);
});
document.querySelector("#bioChoices").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || !bioAnswer) return;
  const correct = button.dataset.bio === bioAnswer.id;
  if (correct) {
    bioScore += 1;
    document.querySelector("#bioScore").textContent = String(bioScore);
  }
  document.querySelector("#bioFeedback").textContent = correct
    ? `答對了！這是「${bioAnswer.name}」的聲音線索。`
    : `還差一點，答案是「${bioAnswer.name}」。按「隨機出題」再挑戰。`;
  [...document.querySelectorAll("#bioChoices button")].forEach((choice) => {
    choice.disabled = true;
    if (choice.dataset.bio === bioAnswer.id) choice.classList.add("primary-action");
  });
});

function miniSvg(type) {
  const common = 'viewBox="0 0 320 180" role="img"';
  const map = {
    frequency: `<svg ${common} aria-label="頻率比較"><rect width="320" height="180" fill="#0b1421"/><path d="M18 96 C58 38 98 38 138 96 S218 154 302 96" fill="none" stroke="#18b6a2" stroke-width="7"/><path d="M18 48 C30 28 42 28 54 48 S78 68 90 48 S114 28 126 48 S150 68 162 48 S186 28 198 48 S222 68 234 48 S258 28 270 48 S294 68 306 48" fill="none" stroke="#ffbf3f" stroke-width="5"/></svg>`,
    amplitude: `<svg ${common} aria-label="振幅比較"><rect width="320" height="180" fill="#0b1421"/><path d="M18 90 C58 72 98 72 138 90 S218 108 302 90" fill="none" stroke="#4e8cff" stroke-width="5"/><path d="M18 92 C58 22 98 22 138 92 S218 158 302 92" fill="none" stroke="#ff5d93" stroke-width="7"/></svg>`,
    spectrum: `<svg ${common} aria-label="頻譜柱狀圖"><rect width="320" height="180" fill="#0b1421"/><g fill="#18b6a2"><rect x="34" y="92" width="22" height="58"/><rect x="70" y="54" width="22" height="96"/><rect x="106" y="78" width="22" height="72"/><rect x="142" y="30" width="22" height="120"/><rect x="178" y="62" width="22" height="88"/><rect x="214" y="104" width="22" height="46"/><rect x="250" y="86" width="22" height="64"/></g></svg>`,
    tuning: `<svg ${common} aria-label="調音叉"><rect width="320" height="180" fill="#0b1421"/><g class="tuning-fork"><path d="M142 34 V96 Q142 122 160 122 Q178 122 178 96 V34" fill="none" stroke="#ffbf3f" stroke-width="12" stroke-linecap="round"/><path d="M160 122 V154" stroke="#ffbf3f" stroke-width="12" stroke-linecap="round"/></g><path class="tuning-wave" d="M88 62 C110 42 124 42 136 62M184 62 C206 42 220 42 242 62" fill="none" stroke="#18b6a2" stroke-width="4"/></svg>`,
    noise: `<svg ${common} aria-label="噪音計"><rect width="320" height="180" fill="#0b1421"/><rect x="94" y="48" width="132" height="76" rx="12" fill="#142234" stroke="#4e8cff"/><text class="noise-text" x="124" y="96" fill="#e9f2ff" font-size="30">72 dB</text><path class="noise-bar" d="M74 138 H246" stroke="#ff5d93" stroke-width="10" stroke-linecap="round"/></svg>`,
    speech: `<svg ${common} aria-label="語音波形"><rect width="320" height="180" fill="#0b1421"/><path class="speech-wave" d="M34 92 Q58 40 82 92 T130 92 T178 92 T226 92 T286 92" fill="none" stroke="#18b6a2" stroke-width="6"/><circle class="speech-dot" cx="82" cy="92" r="8" fill="#ffbf3f"/><circle class="speech-dot speech-dot-2" cx="178" cy="92" r="8" fill="#ffbf3f"/></svg>`,
    visualizer: `<svg ${common} aria-label="音樂視覺化"><rect width="320" height="180" fill="#0b1421"/><circle class="viz-ring" cx="160" cy="90" r="44" fill="none" stroke="#4e8cff" stroke-width="10"/><circle class="viz-ring viz-ring-2" cx="160" cy="90" r="72" fill="none" stroke="#18b6a2" stroke-width="4"/><g fill="#ffbf3f"><rect class="viz-bar" x="42" y="92" width="18" height="54"/><rect class="viz-bar viz-bar-2" x="70" y="64" width="18" height="82"/><rect class="viz-bar viz-bar-3" x="232" y="74" width="18" height="72"/><rect class="viz-bar viz-bar-4" x="260" y="102" width="18" height="44"/></g></svg>`,
    ultrasound: `<svg ${common} aria-label="超音波測距"><rect width="320" height="180" fill="#0b1421"/><rect x="42" y="68" width="58" height="44" rx="8" fill="#142234" stroke="#18b6a2"/><g class="sonar"><path class="sonar-wave" d="M108 74 C150 42 188 42 228 74" fill="none" stroke="#ffbf3f" stroke-width="4"/><path class="sonar-wave sonar-wave-2" d="M108 92 C158 66 190 66 228 92" fill="none" stroke="#ffbf3f" stroke-width="4"/><path class="sonar-wave sonar-wave-3" d="M108 110 C150 138 188 138 228 110" fill="none" stroke="#ffbf3f" stroke-width="4"/></g><rect x="242" y="46" width="34" height="88" rx="6" fill="#4e8cff"/></svg>`,
    insulation: `<svg ${common} aria-label="隔音材料"><rect width="320" height="180" fill="#0b1421"/><path class="insul-in" d="M40 90 C66 48 92 48 118 90 S170 132 196 90" fill="none" stroke="#ff5d93" stroke-width="5"/><rect x="202" y="36" width="32" height="118" fill="#18b6a2"/><rect x="244" y="36" width="32" height="118" fill="#4e8cff"/><path class="insul-out" d="M236 90 C250 78 260 78 276 90" fill="none" stroke="#a8b8cc" stroke-width="4"/></svg>`
  };
  return map[type] || map.spectrum;
}

function conceptDemoMarkup(item) {
  const controls = {
    frequency: `
      <div class="demo-controls">
        <label>頻率 <output class="demo-out">300 Hz</output></label>
        <input type="range" class="demo-freq" min="80" max="1200" step="10" value="300" aria-label="頻率" />
        <button type="button" class="demo-play">▶ 試聽</button>
      </div>`,
    amplitude: `
      <div class="demo-controls">
        <label>振幅 <output class="demo-out">50%</output></label>
        <input type="range" class="demo-amp" min="0" max="1" step="0.02" value="0.5" aria-label="振幅" />
        <button type="button" class="demo-play">▶ 試聽</button>
      </div>`,
    spectrum: `
      <div class="demo-controls">
        <div class="demo-presets">
          <button type="button" data-fp="bass" class="active">低音鼓</button>
          <button type="button" data-fp="voice">人聲</button>
          <button type="button" data-fp="bird">鳥鳴</button>
          <button type="button" data-fp="noise">白噪音</button>
        </div>
      </div>`
  };
  const extra = controls[item.visual] || "";
  return `<article class="concept-card demo-card" data-demo="${item.visual}">
    <div class="demo-stage"><canvas class="demo-canvas" width="660" height="240"></canvas></div>
    ${extra}
    <h3>${item.title}</h3>
    <p>${item.text}</p>
  </article>`;
}

function playDemoTone(frequency, amplitude = 0.5, seconds = 0.7) {
  ensureAudio().then((context) => {
    const osc = context.createOscillator();
    const gain = context.createGain();
    const compressor = context.createDynamicsCompressor();
    const volume = Math.min(0.55, 0.05 + amplitude * 0.5);
    osc.type = "sine";
    osc.frequency.value = Math.max(1, frequency);
    compressor.threshold.value = -16;
    compressor.knee.value = 18;
    compressor.ratio.value = 7;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), context.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + seconds);
    osc.connect(gain).connect(compressor).connect(context.destination);
    osc.start();
    osc.stop(context.currentTime + seconds + 0.05);
  });
}

const conceptDemos = [];
const SPECTRUM_BARS = 28;

function spectrumTarget(profile, i, n) {
  const x = i / (n - 1);
  switch (profile) {
    case "bass": return Math.exp(-i / 3.2) * 0.95 + 0.05;
    case "voice": {
      const g = (c, w) => Math.exp(-((x - c) ** 2) / (2 * w * w));
      return Math.min(1, g(0.12, 0.06) * 0.95 + g(0.34, 0.09) * 0.7 + g(0.6, 0.12) * 0.35 + 0.04);
    }
    case "bird": return Math.exp(-(n - 1 - i) / 3.4) * 0.95 + 0.05;
    case "noise": return 0.5 + 0.12 * Math.sin(i * 1.7);
    default: return 0.4;
  }
}

function initInteractiveConcepts() {
  conceptDemos.length = 0;
  document.querySelectorAll("#conceptGrid .demo-card").forEach((card) => {
    const canvas = card.querySelector(".demo-canvas");
    const state = { type: card.dataset.demo, card, canvas, ctx: canvas.getContext("2d"), phase: 0 };
    if (state.type === "frequency") {
      const range = card.querySelector(".demo-freq");
      const out = card.querySelector(".demo-out");
      state.freq = Number(range.value);
      range.addEventListener("input", () => {
        state.freq = Number(range.value);
        out.textContent = `${state.freq} Hz`;
      });
      card.querySelector(".demo-play").addEventListener("click", () => playDemoTone(state.freq, 0.5, 0.8));
    } else if (state.type === "amplitude") {
      const range = card.querySelector(".demo-amp");
      const out = card.querySelector(".demo-out");
      state.amp = Number(range.value);
      range.addEventListener("input", () => {
        state.amp = Number(range.value);
        out.textContent = `${Math.round(state.amp * 100)}%`;
      });
      card.querySelector(".demo-play").addEventListener("click", () => playDemoTone(440, state.amp, 0.7));
    } else if (state.type === "spectrum") {
      state.profile = "bass";
      state.bars = new Array(SPECTRUM_BARS).fill(0.1);
      state.seeds = Array.from({ length: SPECTRUM_BARS }, () => Math.random() * Math.PI * 2);
      card.querySelectorAll(".demo-presets button").forEach((button) => {
        button.addEventListener("click", () => {
          state.profile = button.dataset.fp;
          card.querySelectorAll(".demo-presets button").forEach((b) => b.classList.toggle("active", b === button));
        });
      });
    }
    conceptDemos.push(state);
  });
  if (conceptDemos.length && !conceptDemos.running) {
    conceptDemos.running = true;
    requestAnimationFrame(animateConcepts);
  }
}

function animateConcepts() {
  conceptDemos.forEach(drawConceptDemo);
  requestAnimationFrame(animateConcepts);
}

function drawConceptDemo(state) {
  const { ctx, canvas } = state;
  if (canvas.offsetParent === null) return; // skip when the page is hidden
  const w = canvas.width;
  const h = canvas.height;
  drawGrid(ctx, w, h);
  if (state.type === "frequency") {
    state.phase += 0.05;
    const cycles = Math.max(0.6, Math.min(26, state.freq / 60));
    const hue = state.freq > 700 ? 45 : state.freq > 320 ? 200 : 168;
    ctx.lineWidth = 4;
    ctx.strokeStyle = `hsl(${hue}, 82%, 62%)`;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 2) {
      const y = h / 2 + Math.sin((x / w) * cycles * Math.PI * 2 - state.phase) * 72;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = "#e9f2ff";
    ctx.font = "22px Microsoft JhengHei, sans-serif";
    ctx.fillText(`${state.freq} Hz`, 24, 38);
    ctx.fillStyle = "#a8b8cc";
    ctx.font = "18px Microsoft JhengHei, sans-serif";
    ctx.fillText(state.freq < 320 ? "低沉" : state.freq < 700 ? "適中" : "尖亮", w - 92, 38);
  } else if (state.type === "amplitude") {
    state.phase += 0.05;
    const amp = state.amp * (h * 0.42);
    ctx.setLineDash([6, 8]);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(168, 184, 204, 0.5)";
    [h / 2 - h * 0.42, h / 2 + h * 0.42].forEach((y) => {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.lineWidth = 4;
    ctx.strokeStyle = state.amp > 0.66 ? "#ff5d93" : state.amp > 0.33 ? "#ffbf3f" : "#18b6a2";
    ctx.beginPath();
    for (let x = 0; x <= w; x += 2) {
      const y = h / 2 + Math.sin((x / w) * 4 * Math.PI * 2 - state.phase) * amp;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = "#e9f2ff";
    ctx.font = "22px Microsoft JhengHei, sans-serif";
    ctx.fillText(`振幅 ${Math.round(state.amp * 100)}%`, 24, 38);
    ctx.fillStyle = "#a8b8cc";
    ctx.font = "18px Microsoft JhengHei, sans-serif";
    ctx.fillText(state.amp > 0.66 ? "大聲" : state.amp > 0.33 ? "適中" : "小聲", w - 70, 38);
  } else if (state.type === "spectrum") {
    state.phase += 0.06;
    const n = state.bars.length;
    const barWidth = w / n;
    for (let i = 0; i < n; i += 1) {
      const base = spectrumTarget(state.profile, i, n);
      const wobble = 0.78 + 0.22 * Math.sin(state.phase * 2 + state.seeds[i]);
      const target = Math.max(0.04, Math.min(1, base * wobble));
      state.bars[i] += (target - state.bars[i]) * 0.18;
      const barHeight = state.bars[i] * h * 0.82;
      const hue = 170 - (i / n) * 120;
      ctx.fillStyle = `hsl(${hue}, 84%, ${46 + state.bars[i] * 20}%)`;
      ctx.fillRect(i * barWidth + 1, h - barHeight, Math.max(1, barWidth - 3), barHeight);
    }
    ctx.fillStyle = "#e9f2ff";
    ctx.font = "20px Microsoft JhengHei, sans-serif";
    const label = { bass: "低音鼓：低頻強", voice: "人聲：中低頻聚集", bird: "鳥鳴：高頻強", noise: "白噪音：各頻均勻" }[state.profile] || "";
    ctx.fillText(label, 24, 32);
  }
}

const resourceSlugMap = {
  "phet.colorado.edu": "phet",
  "pedia.cloud.edu.tw": "pedia",
  "www.cwa.gov.tw": "cwa",
  "www.cdc.gov": "cdc",
  "developer.mozilla.org": "mdn",
  "www.sciencelearn.org.nz": "sciencelearn"
};

function resourceSlug(url) {
  try {
    const host = new URL(url).hostname;
    return resourceSlugMap[host] || host.replace(/^www\./, "").split(".")[0];
  } catch {
    return "";
  }
}

async function loadResourceLogos() {
  try {
    const response = await fetch("./img/resources/manifest.json");
    if (!response.ok) throw new Error(String(response.status));
    return await response.json();
  } catch {
    return {};
  }
}

function resourceVisual(item, logos) {
  const slug = resourceSlug(item.url);
  const entry = logos[slug];
  if (entry?.logo) {
    return `<div class="resource-logo"><img src="./img/resources/${entry.logo}" alt="${item.title} 標誌" loading="lazy" /></div>`;
  }
  return miniSvg("spectrum");
}

async function loadContent() {
  try {
    const loadJson = async (path) => {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`${path} ${response.status}`);
      return response.json();
    };
    const [content, quiz, resources] = await Promise.all([
      loadJson("./data/content.json"),
      loadJson("./data/quiz.json"),
      loadJson("./data/resources.json")
    ]);
    document.querySelector("#conceptGrid").innerHTML = content.concepts.map((item) =>
      conceptDemoMarkup(item)
    ).join("");
    initInteractiveConcepts();
    document.querySelector("#applicationGrid").innerHTML = content.applications.map((item) => `
      <article class="concept-card">${miniSvg(item.visual)}<h3>${item.title}</h3><p>${item.text}</p></article>
    `).join("");
    const resourceLogos = await loadResourceLogos();
    document.querySelector("#resourceGrid").innerHTML = resources.map((item) => `
      <article class="resource-card">
        ${resourceVisual(item, resourceLogos)}
        <h3><a href="${item.url}" target="_blank" rel="noreferrer">${item.title}</a></h3>
        <p>${item.description}</p>
        <p class="resource-meta">${item.type}｜${item.grade}｜檢查日期 ${item.checkedAt}</p>
      </article>
    `).join("");
    renderQuiz(quiz);
  } catch (error) {
    const message = `<article class="concept-card"><h3>資料載入失敗</h3><p>請重新整理頁面，或確認 data 資料檔已部署。錯誤：${error.message}</p></article>`;
    document.querySelector("#conceptGrid").innerHTML = message;
    document.querySelector("#applicationGrid").innerHTML = "";
    document.querySelector("#resourceGrid").innerHTML = message;
    document.querySelector("#quizBox").innerHTML = message;
  }
}

function renderQuiz(quiz) {
  quizQuestions = quiz;
  resetQuiz();
}

function quizOptionLabel(index) {
  return String.fromCharCode(65 + index);
}

function updateQuizHeader() {
  const total = quizQuestions.length;
  document.querySelector("#quizScore").textContent = `答對 ${quizCorrect} / ${total}`;
  document.querySelector("#quizProgress").textContent = total ? `第 ${quizIndex + 1} / ${total} 題` : "準備中…";
  document.querySelector("#quizQuestionProgress").style.width = total ? `${((quizIndex + 1) / total) * 100}%` : "0%";
}

function renderQuizQuestion({ focus = false } = {}) {
  const box = document.querySelector("#quizBox");
  const feedback = document.querySelector("#quizFeedback");
  const nextButton = document.querySelector("#nextQuiz");
  const item = quizQuestions[quizIndex];

  if (!item) {
    box.innerHTML = `<div class="quiz-result" tabindex="-1">
      <p class="quiz-result-icon" aria-hidden="true">🏁</p>
      <h3>挑戰完成！</h3>
      <p>你答對了 <strong>${quizCorrect}</strong> 題，共 ${quizQuestions.length} 題。</p>
      <p>${quizCorrect === quizQuestions.length ? "太棒了，每題都答對！" : "可以按「重新挑戰」再複習一次。"}</p>
    </div>`;
    document.querySelector("#quizProgress").textContent = `已完成 ${quizQuestions.length} / ${quizQuestions.length} 題`;
    document.querySelector("#quizQuestionProgress").style.width = "100%";
    feedback.textContent = `挑戰完成，共答對 ${quizCorrect} 題。`;
    feedback.dataset.state = "complete";
    nextButton.hidden = true;
    if (focus) box.querySelector(".quiz-result")?.focus();
    return;
  }

  quizAnswered = false;
  updateQuizHeader();
  box.innerHTML = `
    <div class="quiz-item" data-answer="${item.answer}">
      <h3 id="currentQuizQuestion" class="quiz-question" tabindex="-1">${quizIndex + 1}. ${item.question}</h3>
      <div class="quiz-options" role="group" aria-labelledby="currentQuizQuestion">
        ${item.options.map((option, optionIndex) => `
          <button class="quiz-option" type="button" data-option="${optionIndex}">
            <span class="quiz-option-letter" aria-hidden="true">${quizOptionLabel(optionIndex)}</span>
            <span class="quiz-option-text">${option}</span>
          </button>
        `).join("")}
      </div>
    </div>`;
  box.querySelectorAll(".quiz-option").forEach((button) => {
    button.addEventListener("click", () => answerQuizQuestion(Number(button.dataset.option)));
  });
  feedback.textContent = "請選擇一個答案。";
  feedback.dataset.state = "waiting";
  nextButton.hidden = false;
  nextButton.disabled = true;
  nextButton.textContent = quizIndex === quizQuestions.length - 1 ? "查看成績" : "下一題";
  if (focus) document.querySelector("#currentQuizQuestion")?.focus({ preventScroll: true });
}

function playApplause(context) {
  const duration = 1.35;
  const frameCount = Math.floor(context.sampleRate * duration);
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i += 1) data[i] = Math.random() * 2 - 1;

  const now = context.currentTime;
  [0, 0.11, 0.23, 0.36, 0.51, 0.68, 0.87].forEach((offset, index) => {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.value = 1050 + (index % 3) * 420;
    filter.Q.value = 0.65;
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.18 + (index % 2) * 0.04, now + offset + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18);
    source.connect(filter).connect(gain).connect(context.destination);
    source.start(now + offset, Math.min(offset, 0.6), 0.2);
  });
}

function playIncorrectSound(context) {
  const now = context.currentTime;
  [0, 0.24].forEach((offset, index) => {
    const oscillatorNode = context.createOscillator();
    const gain = context.createGain();
    oscillatorNode.type = "triangle";
    oscillatorNode.frequency.setValueAtTime(index === 0 ? 260 : 175, now + offset);
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.16, now + offset + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.22);
    oscillatorNode.connect(gain).connect(context.destination);
    oscillatorNode.start(now + offset);
    oscillatorNode.stop(now + offset + 0.24);
  });
}

function speakQuizResult(message, delay) {
  if (!("speechSynthesis" in window)) return;
  clearTimeout(quizSpeechTimer);
  window.speechSynthesis.cancel();
  quizSpeechTimer = setTimeout(() => {
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = "zh-TW";
    utterance.rate = 0.92;
    utterance.pitch = 1.05;
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find((voice) => voice.lang.toLowerCase() === "zh-tw")
      || voices.find((voice) => voice.lang.toLowerCase().startsWith("zh"))
      || null;
    window.speechSynthesis.speak(utterance);
  }, delay);
}

async function playQuizFeedback(correct) {
  try {
    const context = await ensureAudio();
    if (correct) playApplause(context);
    else playIncorrectSound(context);
  } catch (error) {
    console.warn("無法播放闖關音效：", error);
  }
  speakQuizResult(correct ? "你答對了" : "你答錯了", correct ? 480 : 360);
}

function answerQuizQuestion(selectedIndex) {
  if (quizAnswered) return;
  quizAnswered = true;
  const item = quizQuestions[quizIndex];
  const correct = selectedIndex === Number(item.answer);
  const options = [...document.querySelectorAll(".quiz-option")];
  const feedback = document.querySelector("#quizFeedback");

  if (correct) quizCorrect += 1;
  options.forEach((button, index) => {
    button.disabled = true;
    if (index === Number(item.answer)) {
      button.classList.add("correct-answer");
      button.setAttribute("aria-label", `${button.querySelector(".quiz-option-text").textContent}，正確答案`);
      button.insertAdjacentHTML("beforeend", '<span class="answer-badge">正確答案</span>');
    }
    if (index === selectedIndex && !correct) button.classList.add("wrong-answer");
  });

  feedback.textContent = correct
    ? `你答對了！${item.explanation}`
    : `你答錯了。正確答案是「${item.options[item.answer]}」。${item.explanation}`;
  feedback.dataset.state = correct ? "correct" : "wrong";
  document.querySelector("#nextQuiz").disabled = false;
  updateQuizHeader();
  playQuizFeedback(correct);
}

function resetQuiz() {
  quizIndex = 0;
  quizCorrect = 0;
  quizAnswered = false;
  clearTimeout(quizSpeechTimer);
  window.speechSynthesis?.cancel();
  renderQuizQuestion();
}

document.querySelector("#nextQuiz").addEventListener("click", () => {
  if (!quizAnswered) return;
  quizIndex += 1;
  renderQuizQuestion({ focus: true });
});

document.querySelector("#resetQuiz").addEventListener("click", resetQuiz);

const quizFullscreenButton = document.querySelector("#quizFullscreen");
const quizShell = document.querySelector(".quiz-shell");
if (!document.fullscreenEnabled) quizFullscreenButton.hidden = true;
quizFullscreenButton.addEventListener("click", async () => {
  try {
    if (document.fullscreenElement === quizShell) await document.exitFullscreen();
    else await quizShell.requestFullscreen();
  } catch (error) {
    console.warn("無法切換全螢幕：", error);
  }
});
document.addEventListener("fullscreenchange", () => {
  const active = document.fullscreenElement === quizShell;
  quizFullscreenButton.setAttribute("aria-pressed", String(active));
  quizFullscreenButton.textContent = active ? "⛶ 離開全螢幕" : "⛶ 全螢幕作答";
});

loadContent();
loadBioManifest();
loadMicDevices().catch(() => {});
updateProgress();
drawToneWave();
animateMic();
animateMedia();
updateToneLabels();
