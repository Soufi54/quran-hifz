/**
 * Traductions et tafsir disponibles via l'API Quran.com (api.quran.com/api/v4)
 * et Al-Quran Cloud (api.alquran.cloud/v1)
 */

export interface Translation {
  id: string;
  name: string;
  language: string;
  languageCode: string;
  author: string;
  source: 'qurancom' | 'alquran_cloud' | 'local';
  resourceId: number | string; // quran.com resource_id or alquran identifier
}

export interface Tafsir {
  id: string;
  name: string;
  language: string;
  languageCode: string;
  author: string;
  source: 'qurancom' | 'alquran_cloud';
  resourceId: number | string;
}

// ============================================================
// TRADUCTIONS
// ============================================================

export const TRANSLATIONS: Translation[] = [
  // --- Francais ---
  {
    id: 'fr_hamidullah',
    name: 'Muhammad Hamidullah',
    language: 'Francais',
    languageCode: 'fr',
    author: 'Muhammad Hamidullah',
    source: 'qurancom',
    resourceId: 136,
  },
  {
    id: 'fr_montada',
    name: 'Montada Islamic Foundation',
    language: 'Francais',
    languageCode: 'fr',
    author: 'Montada Islamic Foundation',
    source: 'qurancom',
    resourceId: 31,
  },
  {
    id: 'fr_local',
    name: 'Traduction embarquee',
    language: 'Francais',
    languageCode: 'fr',
    author: 'Locale (hors-ligne)',
    source: 'local',
    resourceId: 0,
  },
  // --- Anglais ---
  {
    id: 'en_sahih',
    name: 'Sahih International',
    language: 'English',
    languageCode: 'en',
    author: 'Sahih International',
    source: 'qurancom',
    resourceId: 20,
  },
  {
    id: 'en_pickthall',
    name: 'Pickthall',
    language: 'English',
    languageCode: 'en',
    author: 'Muhammad Marmaduke Pickthall',
    source: 'qurancom',
    resourceId: 19,
  },
  {
    id: 'en_yusuf_ali',
    name: 'Yusuf Ali',
    language: 'English',
    languageCode: 'en',
    author: 'Abdullah Yusuf Ali',
    source: 'qurancom',
    resourceId: 22,
  },
  {
    id: 'en_hilali_khan',
    name: 'Muhsin Khan & Hilali',
    language: 'English',
    languageCode: 'en',
    author: 'Muhammad Taqi-ud-Din al-Hilali & Muhammad Muhsin Khan',
    source: 'qurancom',
    resourceId: 203,
  },
  {
    id: 'en_clearquran',
    name: 'The Clear Quran (Khattab)',
    language: 'English',
    languageCode: 'en',
    author: 'Dr. Mustafa Khattab',
    source: 'qurancom',
    resourceId: 131,
  },
  // --- Arabe simplifie ---
  {
    id: 'ar_muyassar',
    name: 'Tafsir Al-Muyassar',
    language: 'Arabe simplifie',
    languageCode: 'ar',
    author: 'King Fahd Complex',
    source: 'qurancom',
    resourceId: 816,
  },
  // --- Turc ---
  {
    id: 'tr_diyanet',
    name: 'Diyanet Isleri',
    language: 'Turc',
    languageCode: 'tr',
    author: 'Diyanet Isleri',
    source: 'qurancom',
    resourceId: 77,
  },
  // --- Espagnol ---
  {
    id: 'es_cortes',
    name: 'Julio Cortes',
    language: 'Espagnol',
    languageCode: 'es',
    author: 'Julio Cortes',
    source: 'qurancom',
    resourceId: 140,
  },
  // --- Allemand ---
  {
    id: 'de_bubenheim',
    name: 'Bubenheim & Elyas',
    language: 'Allemand',
    languageCode: 'de',
    author: 'Frank Bubenheim and Nadeem Elyas',
    source: 'qurancom',
    resourceId: 27,
  },
  // --- Indonesien ---
  {
    id: 'id_indonesian',
    name: 'Kemenag',
    language: 'Indonesien',
    languageCode: 'id',
    author: 'Kementerian Agama',
    source: 'qurancom',
    resourceId: 33,
  },
  // --- Urdu ---
  {
    id: 'ur_jalandhry',
    name: 'Fateh Muhammad Jalandhry',
    language: 'Urdu',
    languageCode: 'ur',
    author: 'Fateh Muhammad Jalandhry',
    source: 'qurancom',
    resourceId: 54,
  },
  // --- Amazigh ---
  {
    id: 'ber_mensur',
    name: 'At Mensur (Amazigh)',
    language: 'Amazigh',
    languageCode: 'ber',
    author: 'Ramdane At Mensur',
    source: 'alquran_cloud',
    resourceId: 'ber.mensur',
  },
];

// ============================================================
// TAFSIR
// ============================================================

export const TAFSIRS: Tafsir[] = [
  {
    id: 'tafsir_ibn_kathir_fr',
    name: 'Tafsir Ibn Kathir',
    language: 'Francais',
    languageCode: 'fr',
    author: 'Ibn Kathir (traduit)',
    source: 'qurancom',
    resourceId: 816, // fallback to Arabic if FR not available
  },
  {
    id: 'tafsir_ibn_kathir_en',
    name: 'Tafsir Ibn Kathir',
    language: 'English',
    languageCode: 'en',
    author: 'Ibn Kathir',
    source: 'qurancom',
    resourceId: 169,
  },
  {
    id: 'tafsir_jalalayn_ar',
    name: 'Tafsir Al-Jalalayn',
    language: 'Arabe',
    languageCode: 'ar',
    author: 'Jalal ad-Din al-Mahalli & Jalal ad-Din as-Suyuti',
    source: 'qurancom',
    resourceId: 74,
  },
  {
    id: 'tafsir_muyassar',
    name: 'Tafsir Al-Muyassar',
    language: 'Arabe',
    languageCode: 'ar',
    author: 'King Fahd Quran Complex',
    source: 'qurancom',
    resourceId: 816,
  },
  {
    id: 'tafsir_saadi',
    name: 'Tafsir As-Saadi',
    language: 'Arabe',
    languageCode: 'ar',
    author: 'Abdur-Rahman As-Saadi',
    source: 'qurancom',
    resourceId: 170,
  },
  {
    id: 'tafsir_baghawy',
    name: 'Tafsir Al-Baghawy',
    language: 'Arabe',
    languageCode: 'ar',
    author: 'Al-Baghawy',
    source: 'qurancom',
    resourceId: 94,
  },
  {
    id: 'tafsir_tabari',
    name: 'Tafsir At-Tabari',
    language: 'Arabe',
    languageCode: 'ar',
    author: 'Ibn Jarir At-Tabari',
    source: 'qurancom',
    resourceId: 92,
  },
  {
    id: 'tafsir_qurtubi',
    name: 'Tafsir Al-Qurtubi',
    language: 'Arabe',
    languageCode: 'ar',
    author: 'Al-Qurtubi',
    source: 'qurancom',
    resourceId: 90,
  },
  {
    id: 'tafsir_ibn_kathir_ar',
    name: 'Tafsir Ibn Kathir',
    language: 'Arabe',
    languageCode: 'ar',
    author: 'Ibn Kathir',
    source: 'qurancom',
    resourceId: 91,
  },
];

export const DEFAULT_TRANSLATION_ID = 'fr_local';
export const DEFAULT_TAFSIR_ID = 'tafsir_ibn_kathir_en';

export function getTranslationById(id: string): Translation | undefined {
  return TRANSLATIONS.find(t => t.id === id);
}

export function getTafsirById(id: string): Tafsir | undefined {
  return TAFSIRS.find(t => t.id === id);
}

export function getTranslationsByLanguage(lang: string): Translation[] {
  return TRANSLATIONS.filter(t => t.languageCode === lang);
}

export function getTafsirsByLanguage(lang: string): Tafsir[] {
  return TAFSIRS.filter(t => t.languageCode === lang);
}
