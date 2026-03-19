// Reconnaissance vocale arabe
// Mode 1 : Web Speech API (rapide, moins precis)
// Mode 2 : Whisper via Web Worker (precis, 100% local)

// --- Nettoyage texte arabe ---
function stripTashkeel(text: string): string {
  return text.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, '');
}

function normalizeArabic(text: string): string {
  return stripTashkeel(text)
    .replace(/\s+/g, ' ')
    .replace(/[^\u0600-\u06FF\s]/g, '')
    .trim();
}

export function compareArabicTexts(recognized: string, expected: string): number {
  const a = normalizeArabic(recognized);
  const b = normalizeArabic(expected);
  if (!a || !b) return 0;
  const wordsA = a.split(' ');
  const wordsB = b.split(' ');
  let matches = 0;
  for (const word of wordsA) {
    if (wordsB.includes(word)) matches++;
  }
  return wordsB.length > 0 ? matches / wordsB.length : 0;
}

export function getWordDiff(recognized: string, expected: string): { word: string; correct: boolean }[] {
  const recWords = new Set(normalizeArabic(recognized).split(' '));
  return normalizeArabic(expected).split(' ').map(word => ({
    word,
    correct: recWords.has(word),
  }));
}

// --- Web Speech API ---
export function isWebSpeechAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

let activeRecognition: SpeechRecognitionLike | null = null;

export function startWebSpeechRecognition(): Promise<string> {
  return new Promise((resolve, reject) => {
    const win = window as unknown as Record<string, unknown>;
    const Ctor = (win.SpeechRecognition || win.webkitSpeechRecognition) as (new () => SpeechRecognitionLike) | undefined;
    if (!Ctor) { reject(new Error('Non disponible')); return; }

    const recognition = new Ctor();
    recognition.lang = 'ar-SA';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    activeRecognition = recognition;

    let fullTranscript = '';
    let resolved = false;

    recognition.onresult = (event) => {
      for (let i = 0; i < Object.keys(event.results).length; i++) {
        if (event.results[i] && event.results[i][0]) {
          fullTranscript += ' ' + event.results[i][0].transcript;
        }
      }
    };

    recognition.onerror = (event) => {
      if (!resolved && event.error !== 'aborted') {
        resolved = true;
        resolve(fullTranscript.trim());
      }
    };

    recognition.onend = () => {
      if (!resolved) {
        resolved = true;
        resolve(fullTranscript.trim());
      }
      activeRecognition = null;
    };

    recognition.start();
  });
}

export function stopWebSpeechRecognition(): void {
  if (activeRecognition) {
    activeRecognition.stop();
    activeRecognition = null;
  }
}

// --- Whisper via Web Worker ---
let whisperWorker: Worker | null = null;
let whisperReady = false;

export function isWhisperLoaded(): boolean {
  return whisperReady;
}

export function loadWhisper(onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    if (whisperReady) { resolve(); return; }
    if (typeof window === 'undefined') { reject(new Error('SSR')); return; }

    whisperWorker = new Worker('/whisper-worker.js');

    whisperWorker.onmessage = (e) => {
      const { type, progress, error } = e.data;
      if (type === 'progress') onProgress(progress);
      if (type === 'loaded') { whisperReady = true; resolve(); }
      if (type === 'error') reject(new Error(error));
    };

    whisperWorker.postMessage({ type: 'load' });
  });
}

export async function transcribeWithWhisper(audioBlob: Blob): Promise<string> {
  if (!whisperWorker || !whisperReady) throw new Error('Whisper pas charge');

  // Convertir Blob → Float32Array (16kHz mono)
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioContext = new AudioContext({ sampleRate: 16000 });
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const float32 = audioBuffer.getChannelData(0);
  await audioContext.close();

  return new Promise((resolve, reject) => {
    if (!whisperWorker) { reject(new Error('No worker')); return; }
    const handler = (e: MessageEvent) => {
      const { type, text, error } = e.data;
      if (type === 'result') { whisperWorker?.removeEventListener('message', handler); resolve(text); }
      if (type === 'error') { whisperWorker?.removeEventListener('message', handler); reject(new Error(error)); }
    };
    whisperWorker.addEventListener('message', handler);
    whisperWorker.postMessage({ type: 'transcribe', audioData: float32 });
  });
}

// --- Enregistrement audio micro ---
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];

export function startRecording(): Promise<void> {
  return navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };
    mediaRecorder.start(250); // chunk every 250ms
  });
}

export function stopRecording(): Promise<Blob> {
  return new Promise((resolve) => {
    if (!mediaRecorder || mediaRecorder.state !== 'recording') {
      resolve(new Blob(audioChunks, { type: 'audio/webm' }));
      return;
    }
    mediaRecorder.onstop = () => {
      mediaRecorder?.stream.getTracks().forEach(t => t.stop());
      resolve(new Blob(audioChunks, { type: 'audio/webm' }));
      mediaRecorder = null;
    };
    mediaRecorder.stop();
  });
}
