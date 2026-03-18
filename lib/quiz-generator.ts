import { QuizQuestion, Surah, Ayah } from '../types';
import { getAllSurahs, getSurah } from './quran';

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickRandom<T>(arr: T[], count: number): T[] {
  return shuffle(arr).slice(0, count);
}

function getDistractorAyahs(surah: Surah, excludeIndex: number, count: number): Ayah[] {
  const candidates = surah.ayahs.filter((_, i) => i !== excludeIndex);
  return pickRandom(candidates, count);
}

function getDistractorSurahs(excludeNumber: number, count: number): Surah[] {
  const all = getAllSurahs().filter(s => s.number !== excludeNumber);
  return pickRandom(all, count);
}

// Extraire les premiers mots d'un texte arabe
function getFirstWords(text: string, wordCount: number = 3): string {
  return text.split(' ').slice(0, wordCount).join(' ');
}

// Retirer des mots du milieu d'un verset
function createGap(text: string): { gapped: string; missing: string } {
  const words = text.split(' ');
  if (words.length < 4) {
    return { gapped: '___', missing: text };
  }
  const start = Math.floor(words.length * 0.3);
  const gapLength = Math.min(3, Math.floor(words.length * 0.3));
  const missing = words.slice(start, start + gapLength).join(' ');
  const gapped = [
    ...words.slice(0, start),
    '___',
    ...words.slice(start + gapLength),
  ].join(' ');
  return { gapped, missing };
}

export function generateNextAyahQuestion(surah: Surah): QuizQuestion | null {
  if (surah.ayahs.length < 3) return null;
  const maxIndex = surah.ayahs.length - 2;
  const index = Math.floor(Math.random() * maxIndex);
  const currentAyah = surah.ayahs[index];
  const nextAyah = surah.ayahs[index + 1];
  const distractors = getDistractorAyahs(surah, index + 1, 3);

  const options = shuffle([
    getFirstWords(nextAyah.text, 4),
    ...distractors.map(d => getFirstWords(d.text, 4)),
  ]);

  return {
    type: 'next_ayah',
    questionText: 'Quel est le verset suivant ?',
    questionArabic: currentAyah.text,
    options,
    correctIndex: options.indexOf(getFirstWords(nextAyah.text, 4)),
    surahNumber: surah.number,
    ayahNumber: currentAyah.numberInSurah,
  };
}

export function generateCompleteAyahQuestion(surah: Surah): QuizQuestion | null {
  const longAyahs = surah.ayahs.filter(a => a.text.split(' ').length >= 4);
  if (longAyahs.length === 0) return null;
  const ayah = longAyahs[Math.floor(Math.random() * longAyahs.length)];
  const { gapped, missing } = createGap(ayah.text);

  const distractors = getDistractorAyahs(surah, surah.ayahs.indexOf(ayah), 3)
    .map(d => {
      const words = d.text.split(' ');
      const start = Math.floor(words.length * 0.3);
      const len = Math.min(3, Math.floor(words.length * 0.3));
      return words.slice(start, start + len).join(' ') || words[0];
    });

  const options = shuffle([missing, ...distractors]);

  return {
    type: 'complete_ayah',
    questionText: 'Complete le verset :',
    questionArabic: gapped,
    options,
    correctIndex: options.indexOf(missing),
    surahNumber: surah.number,
    ayahNumber: ayah.numberInSurah,
  };
}

export function generateIdentifySurahQuestion(surahNumber: number): QuizQuestion | null {
  const surah = getSurah(surahNumber);
  if (!surah || surah.ayahs.length === 0) return null;

  const ayah = surah.ayahs[Math.floor(Math.random() * surah.ayahs.length)];
  const distractors = getDistractorSurahs(surahNumber, 3);

  const correctOption = `${surah.nameArabic} (${surah.nameFrench})`;
  const options = shuffle([
    correctOption,
    ...distractors.map(d => `${d.nameArabic} (${d.nameFrench})`),
  ]);

  return {
    type: 'identify_surah',
    questionText: 'De quelle sourate vient ce verset ?',
    questionArabic: ayah.text,
    options,
    correctIndex: options.indexOf(correctOption),
    surahNumber: surah.number,
    ayahNumber: ayah.numberInSurah,
  };
}

export function generateFirstWordQuestion(surah: Surah): QuizQuestion | null {
  if (surah.ayahs.length < 2) return null;
  const ayah = surah.ayahs[Math.floor(Math.random() * surah.ayahs.length)];
  const firstWord = ayah.text.split(' ')[0];
  const distractors = getDistractorAyahs(surah, surah.ayahs.indexOf(ayah), 3)
    .map(d => d.text.split(' ')[0]);

  const options = shuffle([firstWord, ...distractors]);

  return {
    type: 'first_word',
    questionText: `Quel est le premier mot du verset ${ayah.numberInSurah} de ${surah.nameFrench} ?`,
    options,
    correctIndex: options.indexOf(firstWord),
    surahNumber: surah.number,
    ayahNumber: ayah.numberInSurah,
  };
}

export function generateTranslationQuestion(surah: Surah): QuizQuestion | null {
  if (surah.ayahs.length < 2) return null;
  const ayah = surah.ayahs[Math.floor(Math.random() * surah.ayahs.length)];
  const distractors = getDistractorAyahs(surah, surah.ayahs.indexOf(ayah), 3)
    .map(d => d.translationFr);

  const options = shuffle([ayah.translationFr, ...distractors]);

  return {
    type: 'translation',
    questionText: 'Quelle est la traduction de ce verset ?',
    questionArabic: ayah.text,
    options,
    correctIndex: options.indexOf(ayah.translationFr),
    surahNumber: surah.number,
    ayahNumber: ayah.numberInSurah,
  };
}

const GENERATORS = [
  generateNextAyahQuestion,
  generateCompleteAyahQuestion,
  generateFirstWordQuestion,
  generateTranslationQuestion,
];

export function generateQuizForSurah(surahNumber: number, count: number = 5): QuizQuestion[] {
  const surah = getSurah(surahNumber);
  if (!surah) return [];

  const questions: QuizQuestion[] = [];
  let attempts = 0;

  while (questions.length < count && attempts < count * 3) {
    const generator = GENERATORS[Math.floor(Math.random() * GENERATORS.length)];
    const question = generator(surah);
    if (question) questions.push(question);
    attempts++;
  }

  return questions;
}

export function generateDailyChallenge(learnedSurahNumbers: number[], count: number = 5): QuizQuestion[] {
  if (learnedSurahNumbers.length === 0) return [];

  const questions: QuizQuestion[] = [];
  let attempts = 0;

  while (questions.length < count && attempts < count * 5) {
    const surahNum = learnedSurahNumbers[Math.floor(Math.random() * learnedSurahNumbers.length)];
    const surah = getSurah(surahNum);
    if (!surah) { attempts++; continue; }

    // Alterner les types
    const typeIndex = questions.length % GENERATORS.length;

    // Pour identify_surah, on utilise une fonction differente
    if (typeIndex === 2) {
      const q = generateIdentifySurahQuestion(surahNum);
      if (q) questions.push(q);
    } else {
      const q = GENERATORS[typeIndex](surah);
      if (q) questions.push(q);
    }
    attempts++;
  }

  return questions.slice(0, count);
}
