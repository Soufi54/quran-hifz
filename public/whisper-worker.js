// Web Worker pour Whisper (100% local, pas de bundling webpack)
// Charge transformers.js depuis CDN une seule fois, puis cache

importScripts('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.1');

let pipeline = null;

async function loadModel(progressCallback) {
  if (pipeline) return;
  pipeline = await self.Transformers.pipeline(
    'automatic-speech-recognition',
    'Xenova/whisper-small',
    {
      device: 'wasm',
      progress_callback: (data) => {
        if (data.progress) {
          progressCallback(Math.round(data.progress));
        }
      },
    }
  );
}

async function transcribe(audioData) {
  if (!pipeline) throw new Error('Model not loaded');
  const result = await pipeline(audioData, {
    language: 'arabic',
    task: 'transcribe',
  });
  return result.text;
}

self.onmessage = async (event) => {
  const { type, audioData } = event.data;

  if (type === 'load') {
    try {
      await loadModel((progress) => {
        self.postMessage({ type: 'progress', progress });
      });
      self.postMessage({ type: 'loaded' });
    } catch (error) {
      self.postMessage({ type: 'error', error: error.message });
    }
  }

  if (type === 'transcribe') {
    try {
      const text = await transcribe(audioData);
      self.postMessage({ type: 'result', text });
    } catch (error) {
      self.postMessage({ type: 'error', error: error.message });
    }
  }
};
