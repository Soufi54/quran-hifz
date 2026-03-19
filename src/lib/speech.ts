// Reconnaissance vocale arabe via Web Speech API (gratuit, dans le navigateur)
// V2 : ajouter Whisper via web worker pour plus de precision

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

export function startWebSpeechRecognition(): Promise<string> {
  return new Promise((resolve, reject) => {
    const win = window as unknown as Record<string, unknown>;
    const SpeechRecognitionCtor = (win.SpeechRecognition || win.webkitSpeechRecognition) as (new () => SpeechRecognitionLike) | undefined;

    if (!SpeechRecognitionCtor) {
      reject(new Error('Web Speech API non disponible'));
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'ar-SA';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    let resolved = false;

    recognition.onresult = (event) => {
      resolved = true;
      const transcript = event.results[0][0].transcript;
      resolve(transcript);
    };

    recognition.onerror = (event) => {
      if (!resolved) reject(new Error(event.error));
    };

    recognition.onend = () => {
      if (!resolved) resolve('');
    };

    recognition.start();

    setTimeout(() => {
      recognition.stop();
    }, 15000);
  });
}
