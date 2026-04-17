const translations = {
  fr: {
    challenge: 'Challenge du jour',
    sourates: 'Sourates',
    profil: 'Profil',
    progression: 'Progression',
    search: 'Rechercher une sourate...',
    favorites: 'Favoris',
    noFavorites: 'Aucun favori',
    mastered: 'maitrisees',
    learning: 'en cours',
    toReview: 'a reviser',
    listen: 'Ecouter',
    pause: 'Pause',
    translation: 'Traduction',
    phonetic: 'Phonetique',
    tajweed: 'Tajweed',
    reciter: 'Recitateur',
    newChallenge: 'Nouveau challenge',
    challengeDone: 'Challenge termine !',
    correctAnswers: 'bonnes reponses',
    days: 'jours',
    streak: 'Serie',
    settings: 'Parametres',
    language: 'Langue',
    darkMode: 'Mode sombre',
    noSurahs: 'Pas encore de sourates',
    startLearning: "Commence par apprendre une sourate dans l'onglet \"Sourates\".",
    install: 'Installer Quran Hifz',
  },
  en: {
    challenge: 'Daily Challenge',
    sourates: 'Surahs',
    profil: 'Profile',
    progression: 'Progress',
    search: 'Search a surah...',
    favorites: 'Favorites',
    noFavorites: 'No favorites',
    mastered: 'mastered',
    learning: 'learning',
    toReview: 'to review',
    listen: 'Listen',
    pause: 'Pause',
    translation: 'Translation',
    phonetic: 'Phonetic',
    tajweed: 'Tajweed',
    reciter: 'Reciter',
    newChallenge: 'New challenge',
    challengeDone: 'Challenge completed!',
    correctAnswers: 'correct answers',
    days: 'days',
    streak: 'Streak',
    settings: 'Settings',
    language: 'Language',
    darkMode: 'Dark mode',
    noSurahs: 'No surahs yet',
    startLearning: 'Start by learning a surah in the "Surahs" tab.',
    install: 'Install Quran Hifz',
  },
  ar: {
    challenge: 'تحدي اليوم',
    sourates: 'السور',
    profil: 'الملف الشخصي',
    progression: 'التقدم',
    search: 'البحث عن سورة...',
    favorites: 'المفضلة',
    noFavorites: 'لا مفضلة',
    mastered: 'متقنة',
    learning: 'قيد التعلم',
    toReview: 'للمراجعة',
    listen: 'استماع',
    pause: 'إيقاف',
    translation: 'ترجمة',
    phonetic: 'صوتيات',
    tajweed: 'تجويد',
    reciter: 'القارئ',
    newChallenge: 'تحدي جديد',
    challengeDone: 'اكتمل التحدي!',
    correctAnswers: 'إجابات صحيحة',
    days: 'أيام',
    streak: 'سلسلة',
    settings: 'الإعدادات',
    language: 'اللغة',
    darkMode: 'الوضع الداكن',
    noSurahs: 'لا توجد سور بعد',
    startLearning: 'ابدأ بتعلم سورة في قسم "السور".',
    install: 'تثبيت Quran Hifz',
  },
};

export type Locale = 'fr' | 'en' | 'ar';
export type TranslationKey = keyof typeof translations.fr;

export function getLocale(): Locale {
  if (typeof window === 'undefined') return 'fr';
  const saved = localStorage.getItem('qh_locale');
  if (saved && saved in translations) return saved as Locale;
  const browserLang = navigator.language.slice(0, 2);
  if (browserLang === 'ar') return 'ar';
  if (browserLang === 'en') return 'en';
  return 'fr';
}

export function setLocale(locale: Locale) {
  localStorage.setItem('qh_locale', locale);
}

export function t(key: TranslationKey, locale?: Locale): string {
  const l = locale || getLocale();
  return translations[l]?.[key] || translations.fr[key] || key;
}
