import test from 'node:test';
import assert from 'node:assert/strict';
import { spectrumFeatures, describeSound } from '../js/sound-description.mjs';

function signal(frequencies, gain = 1, sampleRate = 48000) {
  const fftSize = 4096;
  const spectrum = new Float32Array(fftSize / 2).fill(-Infinity);
  for (const frequency of frequencies) spectrum[Math.round(frequency * fftSize / sampleRate)] = -20 + 20 * Math.log10(gain);
  const wave = Float32Array.from({ length: fftSize }, (_, i) => 0.1 * gain * Math.sin(2 * Math.PI * 220 * i / sampleRate));
  return spectrumFeatures(spectrum, wave, sampleRate, fftSize);
}

test('low and high tones produce different colour descriptions at both common sample rates', () => {
  for (const sampleRate of [44100, 48000]) {
    assert.match(describeSound([signal([150], 1, sampleRate)]).text, /低沉.*單純/);
    assert.match(describeSound([signal([4000], 1, sampleRate)]).text, /明亮.*單純/);
  }
});
test('multiple partials are described as richer rather than a pure tone', () => {
  assert.match(describeSound([signal([440, 880, 1320, 1760])]).text, /成分較豐富/);
});
test('broadband noise has noise-like texture', () => {
  const spectrum = new Float32Array(2048).fill(-40);
  const wave = new Float32Array(4096).fill(0.1);
  assert.match(describeSound([spectrumFeatures(spectrum, wave, 48000, 4096)]).text, /沙沙或嘶嘶/);
});
test('silence clears prior colour and evidence immediately', () => {
  const silent = spectrumFeatures(new Float32Array(2048).fill(-Infinity), new Float32Array(4096), 48000, 4096);
  const result = describeSound([signal([440]), silent]);
  assert.equal(result.state, '訊號微弱');
  assert.equal(result.evidence, '');
  assert.doesNotMatch(result.text, /NaN|明亮|低沉/);
});
test('gain changes preserve spectral colour ratios', () => {
  const first = signal([150, 440, 4000]);
  const second = signal([150, 440, 4000], 3);
  for (const key of ['low', 'mid', 'high', 'concentration']) assert.ok(Math.abs(first[key] - second[key]) < 1e-6);
});
test('recent volume changes are distinguished from a steady tone', () => {
  assert.match(describeSound([signal([440]), signal([440]), signal([440])]).text, /較平穩/);
  assert.match(describeSound([signal([440]), signal([440], 0.2), signal([440])]).text, /起伏明顯/);
});
test('amplified signal beyond the graph range suggests lowering sensitivity', () => {
  assert.match(describeSound([signal([440], 20)]).text, /降低靈敏度/);
});
