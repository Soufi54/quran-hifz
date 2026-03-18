/**
 * Script pour generer quran.json a partir des APIs publiques.
 * Lance une seule fois : npx tsx scripts/generate-quran-data.ts
 * Produit data/quran.json (~6 MB)
 */

interface TanzilAyah {
  number: number;
  text: string;
  numberInSurah: number;
  juz: number;
  page: number;
  surah: { number: number };
}

interface TanzilSurah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  revelationType: string;
  numberOfAyahs: number;
  ayahs: TanzilAyah[];
}

interface FrAyah {
  number: number;
  text: string;
  numberInSurah: number;
  surah: { number: number };
}

interface FrSurah {
  number: number;
  ayahs: FrAyah[];
}

const SURAH_NAMES_FR: Record<number, string> = {
  1: 'L\'Ouverture', 2: 'La Vache', 3: 'La Famille d\'Imran', 4: 'Les Femmes',
  5: 'La Table Servie', 6: 'Les Bestiaux', 7: 'Al-A\'raf', 8: 'Le Butin',
  9: 'Le Repentir', 10: 'Jonas', 11: 'Houd', 12: 'Joseph',
  13: 'Le Tonnerre', 14: 'Abraham', 15: 'Al-Hijr', 16: 'Les Abeilles',
  17: 'Le Voyage Nocturne', 18: 'La Caverne', 19: 'Marie', 20: 'Ta-Ha',
  21: 'Les Prophetes', 22: 'Le Pelerinage', 23: 'Les Croyants', 24: 'La Lumiere',
  25: 'Le Discernement', 26: 'Les Poetes', 27: 'Les Fourmis', 28: 'Le Recit',
  29: 'L\'Araignee', 30: 'Les Romains', 31: 'Luqman', 32: 'La Prosternation',
  33: 'Les Coalises', 34: 'Saba', 35: 'Le Createur', 36: 'Ya-Sin',
  37: 'Les Rangees', 38: 'Sad', 39: 'Les Groupes', 40: 'Le Pardonneur',
  41: 'Les Versets Detailles', 42: 'La Consultation', 43: 'L\'Ornement', 44: 'La Fumee',
  45: 'L\'Agenouillee', 46: 'Al-Ahqaf', 47: 'Muhammad', 48: 'La Victoire Eclatante',
  49: 'Les Appartements', 50: 'Qaf', 51: 'Qui Eparpillent', 52: 'Le Mont',
  53: 'L\'Etoile', 54: 'La Lune', 55: 'Le Tout Misericordieux', 56: 'L\'Evenement',
  57: 'Le Fer', 58: 'La Discussion', 59: 'L\'Exode', 60: 'L\'Eprouvee',
  61: 'Le Rang', 62: 'Le Vendredi', 63: 'Les Hypocrites', 64: 'La Grande Perte',
  65: 'Le Divorce', 66: 'L\'Interdiction', 67: 'La Royaute', 68: 'La Plume',
  69: 'Celle qui Montre la Verite', 70: 'Les Voies d\'Ascension', 71: 'Nouh',
  72: 'Les Djinns', 73: 'L\'Enveloppe', 74: 'Le Revetu d\'un Manteau',
  75: 'La Resurrection', 76: 'L\'Homme', 77: 'Les Envoyees',
  78: 'La Nouvelle', 79: 'Les Anges qui Arrachent', 80: 'Il s\'est Renfrogne',
  81: 'L\'Obscurcissement', 82: 'La Rupture', 83: 'Les Fraudeurs',
  84: 'La Dechirure', 85: 'Les Constellations', 86: 'L\'Astre Nocturne',
  87: 'Le Tres-Haut', 88: 'L\'Enveloppante', 89: 'L\'Aube', 90: 'La Cite',
  91: 'Le Soleil', 92: 'La Nuit', 93: 'Le Jour Montant', 94: 'L\'Ouverture de la Poitrine',
  95: 'Le Figuier', 96: 'L\'Adherence', 97: 'La Destinee', 98: 'La Preuve',
  99: 'La Secousse', 100: 'Les Coursiers', 101: 'Le Fracas', 102: 'La Course aux Richesses',
  103: 'Le Temps', 104: 'Les Calomniateurs', 105: 'L\'Elephant',
  106: 'Quraych', 107: 'L\'Ustensile', 108: 'L\'Abondance', 109: 'Les Infideles',
  110: 'Le Secours', 111: 'Les Fibres', 112: 'Le Monotheisme Pur',
  113: 'L\'Aube Naissante', 114: 'Les Hommes',
};

async function fetchJSON(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function main() {
  console.log('Telechargement du texte arabe (Uthmani)...');
  const arabicData = await fetchJSON('https://api.alquran.cloud/v1/quran/quran-uthmani') as {
    data: { surahs: TanzilSurah[] };
  };

  console.log('Telechargement de la traduction francaise...');
  const frenchData = await fetchJSON('https://api.alquran.cloud/v1/quran/fr.hamidullah') as {
    data: { surahs: FrSurah[] };
  };

  console.log('Construction du fichier JSON...');

  const frenchMap = new Map<string, string>();
  frenchData.data.surahs.forEach(surah => {
    surah.ayahs.forEach(ayah => {
      frenchMap.set(`${surah.number}:${ayah.numberInSurah}`, ayah.text);
    });
  });

  const surahs = arabicData.data.surahs.map(surah => ({
    number: surah.number,
    nameArabic: surah.name,
    nameFrench: SURAH_NAMES_FR[surah.number] || surah.englishNameTranslation,
    nameTransliteration: surah.englishName,
    revelationType: surah.revelationType === 'Meccan' ? 'mecquoise' : 'medinoise',
    ayahCount: surah.numberOfAyahs,
    ayahs: surah.ayahs.map(ayah => ({
      number: ayah.number,
      numberInSurah: ayah.numberInSurah,
      text: ayah.text,
      translationFr: frenchMap.get(`${surah.number}:${ayah.numberInSurah}`) || '',
      page: ayah.page,
      juz: ayah.juz,
    })),
  }));

  const quranData = {
    surahs,
    totalPages: 604,
    totalAyahs: surahs.reduce((sum, s) => sum + s.ayahCount, 0),
  };

  const fs = await import('fs');
  const path = await import('path');
  const outputPath = path.join(process.cwd(), 'data', 'quran.json');
  fs.writeFileSync(outputPath, JSON.stringify(quranData));

  const sizeMB = (Buffer.byteLength(JSON.stringify(quranData)) / (1024 * 1024)).toFixed(2);
  console.log(`Fichier genere : ${outputPath} (${sizeMB} MB)`);
  console.log(`${surahs.length} sourates, ${quranData.totalAyahs} versets`);
}

main().catch(console.error);
