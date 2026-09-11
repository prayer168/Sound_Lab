"""Validate the real-recording bank using ffmpeg (no third-party Python packages)."""
import array
import hashlib
import json
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[1] / 'public/audio/bio'
manifest = json.loads((root / 'manifest.json').read_text(encoding='utf-8'))
added = {key: entry for key, entry in manifest.items() if entry.get('addedOn') == '2026-09-11'}
assert len(added) >= 40 and len(manifest) >= 62
assert len({entry['name'] for entry in manifest.values()}) == len(manifest)
assert len({entry['file'] for entry in manifest.values()}) == len(manifest)
assert len({entry['url'] for entry in manifest.values()}) == len(manifest)
encoded_hashes, decoded_hashes = set(), set()
for key, entry in manifest.items():
    path = root / entry['file']
    assert path.is_file() and path.stat().st_size == entry['size'], key
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    assert digest not in encoded_hashes, f'duplicate file: {key}'
    encoded_hashes.add(digest)
    pcm = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path), '-t', '5', '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'])
    samples = array.array('f'); samples.frombytes(pcm)
    assert len(samples) > 1600 and max(map(abs, samples)) > 0.001, f'empty/silent recording: {key}'
    pcm_digest = hashlib.sha256(pcm).hexdigest()
    assert pcm_digest not in decoded_hashes, f'duplicate decoded audio: {key}'
    decoded_hashes.add(pcm_digest)
    if key in added:
        assert entry['sha256'] == digest, key
        assert entry['sourcePage'].startswith('https://commons.wikimedia.org/wiki/'), key
        assert entry['artist'] and entry['licenseUrl'] and entry['modifications'], key
        assert entry['license'].startswith(('CC BY', 'CC0', 'Public domain')), key
        assert 0 < entry['duration'] <= 5, key
print(f'PASS: {len(manifest)} unique recordings decode with audible signal; {len(added)} additions have source, author, license and edit records.')
