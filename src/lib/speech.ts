// Reconnaissance vocale arabe
// Mode 1 : Web Speech API (rapide)
// Mode 2 : Whisper via Web Worker (precis, 100% local) — V2

// --- Normalisation texte arabe ---
// Le Coran Uthmani utilise des caracteres speciaux (alef wasla, madda, tatweel)
// que la reconnaissance vocale ne produit pas. On normalise les deux cotes.
export function normalizeArabic(text: string): string {
  return text
    // Retirer tashkeel (diacritiques)
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, '')
    // Alef wasla → alef normal
    .replace(/\u0671/g, '\u0627')
    // Alef madda → alef
    .replace(/\u0622/g, '\u0627')
    // Alef hamza dessus/dessous → alef
    .replace(/[\u0623\u0625]/g, '\u0627')
    // Tatweel (kashida) → rien
    .replace(/\u0640/g, '')
    // Teh marbuta → heh
    .replace(/\u0629/g, '\u0647')
    // Alef maksura → ya
    .replace(/\u0649/g, '\u064A')
    // Espaces multiples → un seul
    .replace(/\s+/g, ' ')
    // Garder que l'arabe et les espaces
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
  const expWords = normalizeArabic(expected).split(' ');
  return expWords.map(word => ({
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
  onresult: ((event: { results: { length: number; [k: number]: { isFinal: boolean; [k: number]: { transcript: string } } } }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

let activeRecognition: SpeechRecognitionLike | null = null;

export function createSpeechRecognition(): SpeechRecognitionLike | null {
  const win = window as unknown as Record<string, unknown>;
  const Ctor = (win.SpeechRecognition || win.webkitSpeechRecognition) as (new () => SpeechRecognitionLike) | undefined;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = 'ar-SA';
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  activeRecognition = rec;
  return rec;
}

export function stopWebSpeechRecognition(): void {
  if (activeRecognition) {
    activeRecognition.stop();
    activeRecognition = null;
  }
}
