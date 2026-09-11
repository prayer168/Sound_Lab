// Educational listening clues, not source recognition or a calibrated quality score.
export function spectrumFeatures(decibels, samples, sampleRate, fftSize) {
  const binHz = sampleRate / fftSize;
  const first = Math.max(1, Math.ceil(60 / binHz));
  const last = Math.min(decibels.length - 1, Math.floor(16000 / binHz));
  let total = 0, low = 0, mid = 0, high = 0, logSum = 0, peak = first;
  const powers = [];
  for (let i = first; i <= last; i++) {
    // Float FFT values are dB: convert to linear power before calculating ratios.
    const power = Number.isFinite(decibels[i]) ? 10 ** (decibels[i] / 10) : 0;
    powers[i] = power;
    total += power;
    logSum += Math.log(Math.max(power, 1e-20));
    if (power > (powers[peak] || 0)) peak = i;
    if (i * binHz < 300) low += power;
    else if (i * binHz < 2000) mid += power;
    else high += power;
  }
  let sumSquares = 0, overRange = 0;
  for (const value of samples) {
    sumSquares += value * value;
    if (Math.abs(value) >= 0.99) overRange++;
  }
  const count = Math.max(1, last - first + 1);
  let peakPower = 0;
  // Include neighbouring bins to accommodate the FFT window's main lobe.
  for (let i = Math.max(first, peak - 2); i <= Math.min(last, peak + 2); i++) peakPower += powers[i];
  return {
    rms: Math.sqrt(sumSquares / Math.max(1, samples.length)),
    overRange: overRange / Math.max(1, samples.length),
    total,
    low: total ? low / total : 0,
    mid: total ? mid / total : 0,
    high: total ? high / total : 0,
    concentration: total ? peakPower / total : 0,
    flatness: total ? Math.exp(logSum / count) / (total / count) : 0
  };
}

export function describeSound(history) {
  const current = history.at(-1);
  if (!current || current.rms < 0.008 || current.total < 1e-12) {
    return { text: '目前聲音太微弱或沒有明顯訊號，還無法可靠描述音質與音色。試著靠近麥克風說話或發出聲音。', evidence: '', state: '訊號微弱' };
  }
  const frames = history.filter(frame => frame.rms >= 0.008 && frame.total >= 1e-12);
  const mean = key => frames.reduce((sum, frame) => sum + frame[key], 0) / frames.length;
  const low = mean('low'), mid = mean('mid'), high = mean('high');
  const color = low > 0.55 ? '音色偏低沉、厚實，低頻成分較突出。'
    : high > 0.5 ? '音色偏明亮、尖細，高頻成分較突出。'
    : mid > 0.6 ? '音色以中頻為主，聽感較居中。'
    : '音色混合了低、中、高頻成分，兼有厚度與明亮感。';
  const texture = mean('flatness') > 0.18 ? '頻譜分布較廣且分散，可能帶有沙沙或嘶嘶的雜訊感。'
    : mean('concentration') > 0.72 ? '能量集中在一個窄頻帶，聲音較單純，接近純音的聽感。'
    : '能量分布在多個頻率，聲音成分較豐富，可能帶有較複雜的音色。';
  const levels = history.map(frame => 20 * Math.log10(Math.max(frame.rms, 1e-6)));
  const movement = history.length < 3 ? '正在觀察音量的變化。'
    : Math.max(...levels) - Math.min(...levels) > 9 ? '最近的音量起伏明顯，聲音有強弱變化。'
    : '最近的音量較平穩。';
  const warning = current.overRange > 0.02 ? '目前訊號超出圖表範圍，請降低靈敏度後再觀察音質。' : '';
  const evidence = `頻譜線索：低頻 ${Math.round(low * 100)}% · 中頻 ${Math.round(mid * 100)}% · 高頻 ${Math.round(high * 100)}%（60–300／300–2,000／2,000–16,000 Hz）`;
  return { text: `${color}${texture}${movement}${warning}`, evidence, state: '即時觀察' };
}
