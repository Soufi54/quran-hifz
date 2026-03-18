import { QuizQuestion, Surah } from '../types';
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

function getFirstWords(text: string, wordCount: number = 3): string {
  return text.split(' ').slice(0, wordCount).join(' ');
}

function createGap(text: string): { gapped: string; missing: string } {
  const words = text.split(' ');
  if (words.length < 4) return { gapped: '___', missing: text };
  const start = Math.floor(words.length * 0.3);
  const gapLength = Math.min(3, Math.floor(words.length * 0.3));
  const missing = words.slice(start, start + gapLength).join(' ');
  const gapped = [...words.slice(0, start), '___', ...words.slice(start + gapLength)].join(' ');
  return { gapped, missing };
}

function generateNextAyahQuestion(surah: Surah): QuizQuestion | null {
  if (surah.ayahs.length < 3) return null;
  const index = Math.floor(Math.random() * (surah.ayahs.length - 2));
  const currentAyah = surah.ayahs[index];
  const nextAyah = surah.ayahs[index + 1];
  const distractors = pickRandom(
    surah.ayahs.filter((_, i) => i !== index + 1),
    3
  );
  const correctText = getFirstWords(nextAyah.text, 4);
  const options = shuffle([correctText, ...distractors.map(d => getFirstWords(d.text, 4))]);
  return {
    type: 'next_ayah',
    questionText: 'Quel est le verset suivant ?',
    questionArabic: currentAyah.text,
    options,
    correctIndex: options.indexOf(correctText),
    surahNumber: surah.number,
    ayahNumber: currentAyah.numberInSurah,
  };
}

function generateCompleteAyahQuestion(surah: Surah): QuizQuestion | null {
  const longAyahs = surah.ayahs.filter(a => a.text.split(' ').length >= 4);
  if (longAyahs.length === 0) return null;
  const ayah = longAyahs[Math.floor(Math.random() * longAyahs.length)];
  const { gapped, missing } = createGap(ayah.text);
  const distractors = pickRandom(
    surah.ayahs.filter(a => a.numberInSurah !== ayah.numberInSurah),
    3
  ).map(d => {
    const w = d.text.split(' ');
    const s = Math.floor(w.length * 0.3);
    return w.slice(s, s + Math.min(3, Math.floor(w.length * 0.3))).join(' ') || w[0];
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

function generateIdentifySurahQuestion(surahNumber: number): QuizQuestion | null {
  const surah = getSurah(surahNumber);
  if (!surah || surah.ayahs.length === 0) return null;
  const ayah = surah.ayahs[Math.floor(Math.random() * surah.ayahs.length)];
  const distractors = pickRandom(
    getAllSurahs().filter(s => s.number !== surahNumber),
    3
  );
  const correct = `${surah.nameArabic} (${surah.nameFrench})`;
  const options = shuffle([correct, ...distractors.map(d => `${d.nameArabic} (${d.nameFrench})`)]);
  return {
    type: 'identify_surah',
    questionText: 'De quelle sourate vient ce verset ?',
    questionArabic: ayah.text,
    options,
    correctIndex: options.indexOf(correct),
    surahNumber: surah.number,
    ayahNumber: ayah.numberInSurah,
  };
}

function generateTranslationQuestion(surah: Surah): QuizQuestion | null {
  if (surah.ayahs.length < 2) return null;
  const ayah = surah.ayahs[Math.floor(Math.random() * surah.ayahs.length)];
  const distractors = pickRandom(
    surah.ayahs.filter(a => a.numberInSurah !== ayah.numberInSurah),
    3
  ).map(d => d.translationFr);
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

const GENERATORS = [generateNextAyahQuestion, generateCompleteAyahQuestion, generateTranslationQuestion];

export function generateQuizForSurah(surahNumber: number, count: number = 10): QuizQuestion[] {
  const surah = getSurah(surahNumber);
  if (!surah) return [];
  const questions: QuizQuestion[] = [];
  let attempts = 0;
  while (questions.length < count && attempts < count * 3) {
    const gen = GENERATORS[Math.floor(Math.random() * GENERATORS.length)];
    const q = gen(surah);
    if (q) questions.push(q);
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
    const typeIndex = questions.length % (GENERATORS.length + 1);
    if (typeIndex === 2) {
      const q = generateIdentifySurahQuestion(surahNum);
      if (q) questions.push(q);
    } else {
      const q = GENERATORS[typeIndex % GENERATORS.length](surah);
      if (q) questions.push(q);
    }
    attempts++;
  }
  return questions.slice(0, count);
}
