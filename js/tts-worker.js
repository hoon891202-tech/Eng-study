/* 제니 목소리 만들기 (기기 안에서 Kokoro 실행) — 화면이 멈추지 않게 Web Worker에서 동작
   kokoro-js (Apache-2.0, https://github.com/hexgrad/kokoro) · 모델: onnx-community/Kokoro-82M-v1.0-ONNX (q8, 약 90MB, 처음 한 번 받아서 기기에 저장) */
import { KokoroTTS } from 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js';

let tts = null;
// 16비트 WAV로 저장 (기본 32비트 float보다 용량 절반)
function wav16(f32, sr) {
  const n = f32.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const w = (o, str) => { for (let i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) { const x = Math.max(-1, Math.min(1, f32[i])); v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true); }
  return new Blob([buf], { type: 'audio/wav' });
}
self.onmessage = async (e) => {
  const { type, id, text, voice } = e.data || {};
  try {
    if (type === 'load') {
      if (!tts) {
        tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
          dtype: 'q8', device: 'wasm',
          progress_callback: (p) => { if (p && p.status === 'progress') self.postMessage({ type: 'progress', file: p.file, loaded: p.loaded, total: p.total }); },
        });
      }
      self.postMessage({ type: 'ready' });
    } else if (type === 'gen') {
      if (!tts) throw new Error('not loaded');
      const audio = await tts.generate(text, { voice, speed: 0.92 });
      self.postMessage({ type: 'done', id, blob: wav16(audio.audio, audio.sampling_rate) });
    }
  } catch (err) {
    self.postMessage({ type: 'error', id, error: String((err && err.message) || err) });
  }
};
