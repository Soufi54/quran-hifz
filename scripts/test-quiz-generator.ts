// Test du generateur de quiz — lancer : npx tsx scripts/test-quiz-generator.ts
import { ensureFullData, getSurah } from '../src/lib/quran';
import { generateQuizForSurah, generateDailyChallenge } from '../src/lib/quiz-generator';
import type { QuizQuestion } from '../src/types';

const failures: string[] = [];
function check(cond: boolean, msg: string) {
  if (!cond && failures.length < 30) failures.push(msg);
}

function checkQuestion(q: QuizQuestion, where: string) {
  const surah = getSurah(q.surahNumber)!;
  check(new Set(q.options).size === q.options.length, `${where}: options en double ${JSON.stringify(q.options)}`);
  check(q.options.length >= 3, `${where}: moins de 3 options (${q.options.length})`);
  check(q.correctIndex >= 0 && q.correctIndex < q.options.length, `${where}: correctIndex invalide`);
  check(!!q.answerArabic, `${where}: pas de reponse complete pour le feedback`);

  if (q.type === 'next_ayah') {
    const prompt = surah.ayahs.find(a => a.numberInSurah === q.ayahNumber)!;
    // L'ayah de l'enonce ne doit pas etre proposee comme reponse
    const promptStart = prompt.text.split(' ').slice(0, 4).join(' ');
    const next = surah.ayahs.find(a => a.numberInSurah === q.ayahNumber + 1)!;
    if (promptStart !== next.text.split(' ').slice(0, 4).join(' ')) {
      check(!q.options.includes(promptStart), `${where}: l'enonce est propose comme option (${q.surahNumber}:${q.ayahNumber})`);
    }
    // L'enonce (contexte inclus) doit designer une seule position dans la sourate
    const shown = [...(q.contextArabic ? [q.contextArabic] : []), q.questionArabic].join(' ');
    let matches = 0;
    for (let i = 0; i < surah.ayahs.length; i++) {
      for (let len = 1; len <= 4 && i + len <= surah.ayahs.length; len++) {
        if (surah.ayahs.slice(i, i + len).map(a => a.text).join(' ') === shown) matches++;
      }
    }
    check(matches === 1, `${where}: enonce ambigu, ${matches} positions (${q.surahNumber}:${q.ayahNumber})`);
  }
}

(async () => {
  await ensureFullData();
  // Sourates a refrains (55, 77, 26), courtes (108, 103, 112) et longue (2)
  for (const n of [55, 77, 26, 108, 103, 112, 1, 2]) {
    for (let run = 0; run < 30; run++) {
      const qs = generateQuizForSurah(n, 10);
      check(qs.length === 10 || getSurah(n)!.ayahs.length < 10, `sourate ${n}: ${qs.length} questions`);
      const keys = qs.map(q => `${q.type}:${q.ayahNumber}`);
      if (getSurah(n)!.ayahs.length >= 20) check(new Set(keys).size === keys.length, `sourate ${n}: questions repetees ${keys}`);
      qs.forEach((q, i) => checkQuestion(q, `sourate ${n} q${i}`));
    }
  }
  for (let run = 0; run < 50; run++) {
    const qs = generateDailyChallenge([112, 113, 114, 108, 103], 5);
    check(qs.length === 5, `daily: ${qs.length} questions`);
    qs.forEach((q, i) => checkQuestion(q, `daily q${i}`));
  }
  if (failures.length) {
    console.log(`ECHEC (${failures.length}+)\n` + failures.join('\n'));
    process.exit(1);
  }
  console.log('OK');
})();
