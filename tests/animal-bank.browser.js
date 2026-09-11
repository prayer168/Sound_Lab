// Run on a fresh local page; requires autoplay permission for generated UI clicks.
(async () => {
  const check = (name, ok) => { if (!ok) throw new Error(name); };
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const manifest = await (await fetch('./audio/bio/manifest.json')).json();
  const byFile = Object.fromEntries(Object.entries(manifest).map(([id, entry]) => [entry.file, id]));
  const calls = [];
  const originalPlay = HTMLMediaElement.prototype.play;
  const createOscillator = AudioContext.prototype.createOscillator;
  let synthCalls = 0;
  AudioContext.prototype.createOscillator = function () { synthCalls++; return createOscillator.call(this); };
  HTMLMediaElement.prototype.play = function () {
    const promise = originalPlay.call(this);
    calls.push({ element: this, src: this.src, promise });
    return promise;
  };
  const start = document.querySelector('#newBioChallenge');
  const replay = document.querySelector('#replayBioSound');
  const nextPlayback = async action => {
    const before = calls.length;
    action();
    for (let i = 0; calls.length === before && i < 100; i++) await wait(20);
    check('play was invoked', calls.length > before);
    const call = calls.at(-1);
    await call.promise;
    await wait(100);
    check('real recording advances', !call.element.paused && call.element.currentTime > 0);
    return call;
  };
  try {
    document.querySelector('[data-tab="games"]').click();
    check('renamed game', [...document.querySelectorAll('#games h2')].some(node => node.textContent === '猜猜我是誰'));
    check('62 recordings and 40 additions visible', document.querySelector('#bioBankStatus').textContent.includes('62 種・新增 40 種'));
    check('62 credit entries', document.querySelectorAll('#audioCreditsList li').length === 62);
    check('replay unavailable before first round', replay.disabled);
    const seen = new Set();
    let previous;
    for (let round = 0; round < 62; round++) {
      const call = await nextPlayback(() => start.click());
      const id = byFile[decodeURIComponent(new URL(call.src).pathname.split('/').at(-1))];
      check(`valid unique animal in round ${round + 1}`, id && !seen.has(id));
      seen.add(id); previous = id;
      const options = [...document.querySelectorAll('#bioChoices button')];
      check('four distinct choices containing answer', options.length === 4 && new Set(options.map(node => node.dataset.bio)).size === 4 && options.some(node => node.dataset.bio === id));
      check('choice names match recordings', options.every(node => node.textContent === manifest[node.dataset.bio].name));
      options.find(node => node.dataset.bio === id).click();
      check('score increments exactly once', Number(document.querySelector('#bioScore').textContent) === round + 1);
      options.find(node => node.dataset.bio === id).click();
      check('repeat answer cannot score again', Number(document.querySelector('#bioScore').textContent) === round + 1);
      if (round === 0) {
        const repeated = await nextPlayback(() => replay.click());
        check('replay preserves animal and score', repeated.src === call.src && document.querySelector('#bioScore').textContent === '1');
      }
    }
    check('all forty additions reached', [...seen].filter(id => manifest[id].addedOn).length === 40);
    const next = await nextPlayback(() => start.click());
    check('new deck avoids immediate repeat', byFile[new URL(next.src).pathname.split('/').at(-1)] !== previous);
    for (let i = 0; i < 8; i++) start.click();
    await wait(700);
    check('rapid questions settle on latest recording', !calls.at(-1).element.paused && !document.querySelector('#bioFeedback').textContent.includes('暫時無法播放'));
    HTMLMediaElement.prototype.play = function () { return Promise.reject(new Error('test unavailable recording')); };
    start.click();
    await wait(100);
    check('failed audio shows retry message', document.querySelector('#bioFeedback').textContent.includes('暫時無法播放'));
    check('no synthesized fallback', synthCalls === 0);
    HTMLMediaElement.prototype.play = originalPlay;
    replay.click();
    await wait(500);
    check('replay clears failure message', !document.querySelector('#bioFeedback').textContent.includes('暫時無法播放'));
    await wait(5200);
    check('recording stops within playback cap', calls.at(-1).element.paused);
    return { recordingsPlayed: seen.size, newAnimalsPlayed: [...seen].filter(id => manifest[id].addedOn).length, uniqueChoices: true, nonRepeatingDeck: true, replayAndScoring: true, rapidClicks: true, retryWithoutSynthesis: true, autoStop: true };
  } finally {
    calls.at(-1)?.element.pause();
    HTMLMediaElement.prototype.play = originalPlay;
    AudioContext.prototype.createOscillator = createOscillator;
  }
})()
