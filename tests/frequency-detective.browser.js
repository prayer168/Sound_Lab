// Run on a fresh local page with agent-browser eval --stdin.
(async () => {
  const checks = [];
  const check = (name, condition) => { if (!condition) throw new Error(name); checks.push(name); };
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const oscillators = [], gains = [];
  const createOscillator = AudioContext.prototype.createOscillator;
  const createGain = AudioContext.prototype.createGain;
  const random = Math.random;
  AudioContext.prototype.createOscillator = function () {
    const osc = createOscillator.call(this);
    const record = { osc, ended: false, createdAt: this.currentTime };
    osc.addEventListener('ended', () => { record.ended = true; record.endedAt = this.currentTime; });
    oscillators.push(record);
    return osc;
  };
  AudioContext.prototype.createGain = function () {
    const gain = createGain.call(this);
    const analyser = this.createAnalyser();
    gain.connect(analyser);
    gains.push({ gain, analyser });
    return gain;
  };
  Math.random = () => 0.3;
  const start = document.querySelector('#newChallenge');
  const stop = document.querySelector('#stopChallenge');
  const status = document.querySelector('#challengeStatus');
  try {
    document.querySelector('[data-tab="games"]').click();
    document.querySelector('#challengeVolume').value = '0.08';
    check('stop initially disabled', stop.disabled);
    start.click();
    await wait(5300);
    const wave = new Float32Array(2048);
    gains[0].analyser.getFloatTimeDomainData(wave);
    check('sound remains present beyond five seconds', !oscillators[0].ended && wave.some(value => Math.abs(value) > 0.01));
    await wait(1000);
    check('automatic stop around six seconds', oscillators[0].ended && oscillators[0].endedAt - oscillators[0].createdAt >= 5.95 && oscillators[0].endedAt - oscillators[0].createdAt < 6.3);
    check('automatic stop updates controls', stop.disabled && status.textContent.includes('播放完畢'));
    start.click();
    await wait(150);
    stop.click();
    await wait(100);
    check('manual stop ends oscillator promptly', oscillators[1].ended && stop.disabled && status.textContent.includes('已停止'));
    document.querySelector('[data-choice="mid"]').click();
    check('answer remains available after stopping', document.querySelector('#gameFeedback').textContent.includes('答對了'));
    start.click();
    await wait(150);
    start.click();
    await wait(150);
    check('new question replaces previous sound', oscillators.at(-2).ended && !oscillators.at(-1).ended && oscillators.filter(item => !item.ended).length === 1 && !stop.disabled);
    stop.click();
    await wait(100);
    const context = oscillators[0].osc.context;
    await context.suspend();
    const resume = context.resume.bind(context);
    let release;
    context.resume = () => new Promise(resolve => { release = async () => { await resume(); resolve(); }; });
    const count = oscillators.length;
    start.click();
    stop.click();
    await release();
    await wait(100);
    check('stop cancels a pending audio start', oscillators.length === count && stop.disabled && status.textContent.includes('已停止'));
    context.resume = resume;
    start.click();
    await wait(100);
    check('playback can restart after cancellation', oscillators.length === count + 1 && !stop.disabled);
    stop.click();
    return { checks, durationSeconds: oscillators[0].endedAt - oscillators[0].createdAt };
  } finally {
    stop.click();
    AudioContext.prototype.createOscillator = createOscillator;
    AudioContext.prototype.createGain = createGain;
    Math.random = random;
  }
})()
