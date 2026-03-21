import { getSurah } from './quran';

// --- Types ---

export interface Chunk {
  index: number;
  versets: { number: number; text: string; translationFr: string }[];
  locked: boolean;
}

export type MasteryLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type LearningStep = 'listen' | 'recognize' | 'puzzle' | 'complete' | 'recite';

// --- Constantes ---

const CHUNK_SIZE = 3; // 2-3 versets par chunk (max 3)
const UNLOCK_THRESHOLD = 60; // % de maitrise pour debloquer le chunk suivant
const MASTERY_KEY_PREFIX = 'qd_mastery_';
const XP_KEY = 'qd_learning_xp';

// Combo en memoire (session uniquement, pas localStorage)
let currentCombo = 0;

// --- Decoupe en chunks ---

export function getChunks(surahNumber: number): Chunk[] {
  const surah = getSurah(surahNumber);
  if (!surah) return [];

  const chunks: Chunk[] = [];
  let chunkIndex = 0;

  for (let i = 0; i < surah.ayahs.length; i += CHUNK_SIZE) {
    const slice = surah.ayahs.slice(i, i + CHUNK_SIZE);
    const versets = slice.map(a => ({
      number: a.numberInSurah,
      text: a.text,
      translationFr: a.translationFr,
    }));

    const locked = chunkIndex > 0 && !isChunkUnlocked(surahNumber, chunkIndex);

    chunks.push({ index: chunkIndex, versets, locked });
    chunkIndex++;
  }

  return chunks;
}

// --- Maitrise par verset (localStorage) ---

function masteryKey(surahNumber: number, ayahNumber: number): string {
  return `${MASTERY_KEY_PREFIX}${surahNumber}_${ayahNumber}`;
}

export function getVerseMastery(surahNumber: number, ayahNumber: number): MasteryLevel {
  if (typeof window === 'undefined') return 0;
  const val = localStorage.getItem(masteryKey(surahNumber, ayahNumber));
  if (val === null) return 0;
  const parsed = parseInt(val, 10);
  if (parsed >= 0 && parsed <= 5) return parsed as MasteryLevel;
  return 0;
}

export function setVerseMastery(surahNumber: number, ayahNumber: number, level: MasteryLevel): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(masteryKey(surahNumber, ayahNumber), String(level));
}

export function getChunkMastery(surahNumber: number, chunkIndex: number): number {
  const chunks = getChunks(surahNumber);
  const chunk = chunks[chunkIndex];
  if (!chunk || chunk.versets.length === 0) return 0;

  const totalPossible = chunk.versets.length * 5; // niveau max = 5
  const totalActual = chunk.versets.reduce((sum, v) => {
    return sum + getVerseMastery(surahNumber, v.number);
  }, 0);

  return Math.round((totalActual / totalPossible) * 100);
}

export function getSurahLearningProgress(surahNumber: number): { total: number; mastered: number; percent: number } {
  const surah = getSurah(surahNumber);
  if (!surah) return { total: 0, mastered: 0, percent: 0 };

  const total = surah.ayahs.length;
  const mastered = surah.ayahs.filter(a => getVerseMastery(surahNumber, a.numberInSurah) >= 4).length;
  const percent = total > 0 ? Math.round((mastered / total) * 100) : 0;

  return { total, mastered, percent };
}

export function isChunkUnlocked(surahNumber: number, chunkIndex: number): boolean {
  if (chunkIndex === 0) return true;

  // Pour eviter la recursion infinie via getChunks, on calcule directement
  const surah = getSurah(surahNumber);
  if (!surah) return false;

  const prevStart = (chunkIndex - 1) * CHUNK_SIZE;
  const prevVersets = surah.ayahs.slice(prevStart, prevStart + CHUNK_SIZE);
  if (prevVersets.length === 0) return false;

  const totalPossible = prevVersets.length * 5;
  const totalActual = prevVersets.reduce((sum, a) => {
    return sum + getVerseMastery(surahNumber, a.numberInSurah);
  }, 0);
  const percent = Math.round((totalActual / totalPossible) * 100);

  return percent >= UNLOCK_THRESHOLD;
}

// --- Systeme de combo (session uniquement) ---

export function getCombo(): number {
  return currentCombo;
}

export function incrementCombo(): number {
  currentCombo++;
  return currentCombo;
}

export function resetCombo(): void {
  currentCombo = 0;
}

export function getComboMultiplier(combo: number): number {
  if (combo >= 10) return 5;
  if (combo >= 5) return 3;
  if (combo >= 3) return 2;
  return 1;
}

export function addLearningXP(baseXP: number): number {
  const multiplier = getComboMultiplier(currentCombo);
  const earned = baseXP * multiplier;

  if (typeof window !== 'undefined') {
    const current = parseInt(localStorage.getItem(XP_KEY) || '0', 10);
    localStorage.setItem(XP_KEY, String(current + earned));
  }

  return earned;
}

// --- Generation de questions ---

export function generateRecognitionQ(
  surahNumber: number,
  chunkIndex: number
): { question: string; options: string[]; correctIndex: number } | null {
  const surah = getSurah(surahNumber);
  if (!surah) return null;

  const chunks = getChunks(surahNumber);
  const chunk = chunks[chunkIndex];
  if (!chunk || chunk.versets.length < 2) return null;

  // Choisir un verset dans le chunk (pas le dernier) et demander le suivant
  const questionIdx = Math.floor(Math.random() * (chunk.versets.length - 1));
  const questionVerset = chunk.versets[questionIdx];
  const correctVerset = chunk.versets[questionIdx + 1];

  // Trouver un mauvais choix parmi les autres versets de la sourate
  const otherAyahs = surah.ayahs.filter(
    a => a.numberInSurah !== correctVerset.number && a.numberInSurah !== questionVerset.number
  );

  let wrongText: string;
  if (otherAyahs.length > 0) {
    wrongText = otherAyahs[Math.floor(Math.random() * otherAyahs.length)].text;
  } else {
    // Sourate tres courte, on inverse les mots du correct comme leurre
    const words = correctVerset.text.split(' ');
    wrongText = [...words].reverse().join(' ');
  }

  // Placer la bonne reponse aleatoirement
  const correctIndex = Math.random() < 0.5 ? 0 : 1;
  const options = correctIndex === 0
    ? [correctVerset.text, wrongText]
    : [wrongText, correctVerset.text];

  return {
    question: questionVerset.text,
    options,
    correctIndex,
  };
}

export function generateCompletionQ(
  surahNumber: number,
  chunkIndex: number
): { verseText: string; blanks: { position: number; word: string; options: string[] }[] } | null {
  const surah = getSurah(surahNumber);
  if (!surah) return null;

  const chunks = getChunks(surahNumber);
  const chunk = chunks[chunkIndex];
  if (!chunk || chunk.versets.length === 0) return null;

  // Prendre un verset au hasard dans le chunk
  const verset = chunk.versets[Math.floor(Math.random() * chunk.versets.length)];
  const words = verset.text.split(' ');

  if (words.length < 3) return null;

  // Creer 1 a 2 trous
  const blankCount = words.length >= 6 ? 2 : 1;
  const positions: number[] = [];

  while (positions.length < blankCount) {
    const pos = Math.floor(Math.random() * words.length);
    if (!positions.includes(pos)) {
      positions.push(pos);
    }
  }
  positions.sort((a, b) => a - b);

  // Pour chaque trou, generer des options (le bon mot + 2 leurres)
  const allWords = surah.ayahs.flatMap(a => a.text.split(' '));
  const uniqueWords = Array.from(new Set(allWords));

  const blanks = positions.map(pos => {
    const correctWord = words[pos];
    const wrongWords = uniqueWords
      .filter(w => w !== correctWord)
      .sort(() => Math.random() - 0.5)
      .slice(0, 2);

    const options = [correctWord, ...wrongWords].sort(() => Math.random() - 0.5);

    return { position: pos, word: correctWord, options };
  });

  return { verseText: verset.text, blanks };
}

export function getShuffledWords(
  surahNumber: number,
  ayahNumber: number
): { original: string[]; shuffled: string[] } | null {
  const surah = getSurah(surahNumber);
  if (!surah) return null;

  const ayah = surah.ayahs.find(a => a.numberInSurah === ayahNumber);
  if (!ayah) return null;

  const original = ayah.text.split(' ');
  const shuffled = [...original].sort(() => Math.random() - 0.5);

  // Eviter que le shuffle soit identique a l'original
  if (original.length > 1 && shuffled.every((w, i) => w === original[i])) {
    const temp = shuffled[0];
    shuffled[0] = shuffled[shuffled.length - 1];
    shuffled[shuffled.length - 1] = temp;
  }

  return { original, shuffled };
}

// --- Etape suivante ---

export function getNextStep(surahNumber: number, chunkIndex: number): LearningStep {
  const chunks = getChunks(surahNumber);
  const chunk = chunks[chunkIndex];
  if (!chunk || chunk.versets.length === 0) return 'listen';

  // Trouver le niveau de maitrise minimum dans le chunk
  const minMastery = Math.min(
    ...chunk.versets.map(v => getVerseMastery(surahNumber, v.number))
  );

  switch (minMastery) {
    case 0: return 'listen';
    case 1: return 'recognize';
    case 2: return 'puzzle';
    case 3: return 'complete';
    case 4:
    case 5: return 'recite';
    default: return 'listen';
  }
}
