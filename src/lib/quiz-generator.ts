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

function getFirstWords(text: string, wordCount: number = 3): string {
  return text.split(' ').slice(0, wordCount).join(' ');
}

// Bonne reponse + jusqu'a 3 leurres au texte distinct (les refrains ne doivent
// jamais apparaitre deux fois). null s'il n'y a pas au moins 2 leurres.
function buildOptions(correct: string, candidates: string[]): { options: string[]; correctIndex: number } | null {
  const distractors: string[] = [];
  for (const c of shuffle(candidates)) {
    if (c && c !== correct && !distractors.includes(c)) distractors.push(c);
    if (distractors.length === 3) break;
  }
  if (distractors.length < 2) return null;
  const options = shuffle([correct, ...distractors]);
  return { options, correctIndex: options.indexOf(correct) };
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

// Nombre de positions ou la suite de versets [end-len+1 .. end] a le meme texte
function countWindowMatches(surah: Surah, end: number, len: number): number {
  const target = surah.ayahs.slice(end - len + 1, end + 1).map(a => a.text).join(' ');
  let count = 0;
  for (let j = len - 1; j < surah.ayahs.length; j++) {
    if (surah.ayahs.slice(j - len + 1, j + 1).map(a => a.text).join(' ') === target) count++;
  }
  return count;
}

function generateNextAyahQuestion(surah: Surah): QuizQuestion | null {
  if (surah.ayahs.length < 3) return null;
  const index = Math.floor(Math.random() * (surah.ayahs.length - 1));
  const currentAyah = surah.ayahs[index];
  const nextAyah = surah.ayahs[index + 1];

  // Refrains (ex. Ar-Rahman) : on remonte jusqu'a 3 versets de contexte pour que
  // l'enonce designe une seule position dans la sourate.
  let len = 1;
  while (countWindowMatches(surah, index, len) > 1) {
    if (len >= 4 || index - len < 0) return null;
    len++;
  }
  const context = surah.ayahs.slice(index - len + 1, index).map(a => a.text).join(' ');

  const correctText = getFirstWords(nextAyah.text, 4);
  const built = buildOptions(
    correctText,
    surah.ayahs.filter((_, i) => i !== index + 1).map(a => getFirstWords(a.text, 4)).filter(t => t !== getFirstWords(currentAyah.text, 4))
  );
  if (!built) return null;
  return {
    type: 'next_ayah',
    questionText: 'Quel est le verset suivant ?',
    questionArabic: currentAyah.text,
    contextArabic: context || undefined,
    ...built,
    surahNumber: surah.number,
    ayahNumber: currentAyah.numberInSurah,
    answerAyahNumber: nextAyah.numberInSurah,
    answerArabic: nextAyah.text,
    answerTranslation: nextAyah.translationFr,
  };
}

function generateCompleteAyahQuestion(surah: Surah): QuizQuestion | null {
  const longAyahs = surah.ayahs.filter(a => a.text.split(' ').length >= 4);
  if (longAyahs.length === 0) return null;
  const ayah = longAyahs[Math.floor(Math.random() * longAyahs.length)];
  const { gapped, missing } = createGap(ayah.text);
  const gapLen = missing.split(' ').length;
  const candidates = surah.ayahs.filter(a => a.numberInSurah !== ayah.numberInSurah).map(d => {
    const w = d.text.split(' ');
    const s = Math.floor(Math.random() * Math.max(1, w.length - gapLen));
    return w.slice(s, s + gapLen).join(' ');
  });
  const built = buildOptions(missing, candidates);
  if (!built) return null;
  return {
    type: 'complete_ayah',
    questionText: 'Complete le verset :',
    questionArabic: gapped,
    ...built,
    surahNumber: surah.number,
    ayahNumber: ayah.numberInSurah,
    answerAyahNumber: ayah.numberInSurah,
    answerArabic: ayah.text,
    answerTranslation: ayah.translationFr,
  };
}

function surahLabel(s: Surah): string {
  return `${s.nameFrench} — ${s.nameArabic}`;
}

// Leurres pris d'abord parmi les sourates apprises (plus difficile), puis dans tout le Coran
function generateIdentifySurahQuestion(surah: Surah, pool: number[]): QuizQuestion | null {
  if (surah.ayahs.length === 0) return null;
  const ayah = surah.ayahs[Math.floor(Math.random() * surah.ayahs.length)];
  const fromPool = shuffle(pool.filter(n => n !== surah.number)).map(n => getSurah(n)).filter((s): s is Surah => !!s);
  const others = shuffle(getAllSurahs().filter(s => s.number !== surah.number && !pool.includes(s.number)));
  const correct = surahLabel(surah);
  const built = buildOptions(correct, [...fromPool, ...others].slice(0, 3).map(surahLabel));
  if (!built) return null;
  return {
    type: 'identify_surah',
    questionText: 'De quelle sourate vient ce verset ?',
    questionArabic: ayah.text,
    ...built,
    surahNumber: surah.number,
    ayahNumber: ayah.numberInSurah,
    answerAyahNumber: ayah.numberInSurah,
    answerArabic: ayah.text,
    answerTranslation: ayah.translationFr,
  };
}

function generateTranslationQuestion(surah: Surah): QuizQuestion | null {
  if (surah.ayahs.length < 3) return null;
  const ayah = surah.ayahs[Math.floor(Math.random() * surah.ayahs.length)];
  const built = buildOptions(
    ayah.translationFr,
    surah.ayahs.filter(a => a.numberInSurah !== ayah.numberInSurah).map(a => a.translationFr)
  );
  if (!built) return null;
  return {
    type: 'translation',
    questionText: 'Quelle est la traduction de ce verset ?',
    questionArabic: ayah.text,
    ...built,
    surahNumber: surah.number,
    ayahNumber: ayah.numberInSurah,
    answerAyahNumber: ayah.numberInSurah,
    answerArabic: ayah.text,
    answerTranslation: ayah.translationFr,
  };
}

// 85% verset suivant, 15% autres types. "De quelle sourate" seulement si
// plusieurs sourates sont revisees ensemble (sinon la reponse est evidente).
function pickGenerator(surahPool: number[]): ((s: Surah) => QuizQuestion | null) {
  const roll = Math.random();
  if (roll < 0.85) return generateNextAyahQuestion;
  const others: ((s: Surah) => QuizQuestion | null)[] = [
    generateCompleteAyahQuestion,
    generateTranslationQuestion,
  ];
  if (surahPool.length >= 2) {
    others.push((s: Surah) => generateIdentifySurahQuestion(s, surahPool));
  }
  return others[Math.floor(Math.random() * others.length)];
}

function questionKey(q: QuizQuestion): string {
  return `${q.type}:${q.surahNumber}:${q.ayahNumber}`;
}

// Tire des questions sans repetition ; les sourates tres courtes n'ont pas assez
// de questions distinctes, on complete alors en evitant deux fois la meme d'affilee.
function collectQuestions(count: number, surahPool: number[]): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  const seen = new Set<string>();
  let attempts = 0;
  while (questions.length < count && attempts < count * 20) {
    attempts++;
    const surah = getSurah(surahPool[Math.floor(Math.random() * surahPool.length)]);
    if (!surah) continue;
    const q = pickGenerator(surahPool)(surah);
    if (!q) continue;
    const key = questionKey(q);
    const repeatAllowed = attempts > count * 10;
    if (seen.has(key) && !repeatAllowed) continue;
    if (repeatAllowed && questions.length > 0 && questionKey(questions[questions.length - 1]) === key) continue;
    seen.add(key);
    questions.push(q);
  }
  return questions;
}

export function generateQuizForSurah(surahNumber: number, count: number = 10): QuizQuestion[] {
  if (!getSurah(surahNumber)) return [];
  return collectQuestions(count, [surahNumber]);
}

export function generateDailyChallenge(learnedSurahNumbers: number[], count: number = 5): QuizQuestion[] {
  if (learnedSurahNumbers.length === 0) return [];
  return collectQuestions(count, learnedSurahNumbers);
}
