/**
 * Liste des recitateurs disponibles via everyayah.com
 * Format URL: https://everyayah.com/data/{subfolder}/{surah}{ayah}.mp3
 */

export interface Reciter {
  id: string;
  name: string;
  nameArabic: string;
  style: 'murattal' | 'mujawwad' | 'muallim';
  subfolder: string; // everyayah.com subfolder
  bitrate: string;
  language?: string;
}

export const RECITERS: Reciter[] = [
  // === MURATTAL (recitation melodique standard) ===
  {
    id: 'alafasy',
    name: 'Mishary Rashid Alafasy',
    nameArabic: 'مشاري راشد العفاسي',
    style: 'murattal',
    subfolder: 'Alafasy_128kbps',
    bitrate: '128kbps',
  },
  {
    id: 'husary',
    name: 'Mahmoud Khalil Al-Husary',
    nameArabic: 'محمود خليل الحصري',
    style: 'murattal',
    subfolder: 'Husary_128kbps',
    bitrate: '128kbps',
  },
  {
    id: 'husary_mujawwad',
    name: 'Mahmoud Khalil Al-Husary (Mujawwad)',
    nameArabic: 'محمود خليل الحصري - مجود',
    style: 'mujawwad',
    subfolder: 'Husary_Mujawwad_64kbps',
    bitrate: '64kbps',
  },
  {
    id: 'minshawi_murattal',
    name: 'Mohamed Siddiq Al-Minshawi',
    nameArabic: 'محمد صديق المنشاوي',
    style: 'murattal',
    subfolder: 'Minshawy_Murattal_128kbps',
    bitrate: '128kbps',
  },
  {
    id: 'minshawi_mujawwad',
    name: 'Mohamed Siddiq Al-Minshawi (Mujawwad)',
    nameArabic: 'محمد صديق المنشاوي - مجود',
    style: 'mujawwad',
    subfolder: 'Minshawy_Mujawwad_192kbps',
    bitrate: '192kbps',
  },
  {
    id: 'abdulbasit_murattal',
    name: 'Abdul Basit Abdul Samad',
    nameArabic: 'عبد الباسط عبد الصمد',
    style: 'murattal',
    subfolder: 'Abdul_Basit_Murattal_192kbps',
    bitrate: '192kbps',
  },
  {
    id: 'abdulbasit_mujawwad',
    name: 'Abdul Basit Abdul Samad (Mujawwad)',
    nameArabic: 'عبد الباسط عبد الصمد - مجود',
    style: 'mujawwad',
    subfolder: 'Abdul_Basit_Mujawwad_128kbps',
    bitrate: '128kbps',
  },
  {
    id: 'sudais',
    name: 'Abdurrahman As-Sudais',
    nameArabic: 'عبدالرحمن السديس',
    style: 'murattal',
    subfolder: 'Abdurrahmaan_As-Sudais_192kbps',
    bitrate: '192kbps',
  },
  {
    id: 'shuraim',
    name: 'Saud Ash-Shuraim',
    nameArabic: 'سعود الشريم',
    style: 'murattal',
    subfolder: 'Saood_ash-Shuraym_128kbps',
    bitrate: '128kbps',
  },
  {
    id: 'ghamdi',
    name: 'Saad Al-Ghamdi',
    nameArabic: 'سعد الغامدي',
    style: 'murattal',
    subfolder: 'Ghamadi_40kbps',
    bitrate: '40kbps',
  },
  {
    id: 'ajamy',
    name: 'Ahmed Al-Ajamy',
    nameArabic: 'أحمد العجمي',
    style: 'murattal',
    subfolder: 'Ahmed_ibn_Ali_al-Ajamy_128kbps_ketaballah.net',
    bitrate: '128kbps',
  },
  {
    id: 'basfar',
    name: 'Abdullah Basfar',
    nameArabic: 'عبدالله بصفر',
    style: 'murattal',
    subfolder: 'Abdullah_Basfar_32kbps',
    bitrate: '32kbps',
  },
  {
    id: 'maher',
    name: 'Maher Al-Muaiqly',
    nameArabic: 'ماهر المعيقلي',
    style: 'murattal',
    subfolder: 'MaherAlMuaiqly128kbps',
    bitrate: '128kbps',
  },
  {
    id: 'ayyoub',
    name: 'Muhammad Ayyoub',
    nameArabic: 'محمد أيوب',
    style: 'murattal',
    subfolder: 'Muhammad_Ayyoub_128kbps',
    bitrate: '128kbps',
  },
  {
    id: 'tablawi',
    name: 'Muhammad Al-Tablawi',
    nameArabic: 'محمد الطبلاوي',
    style: 'murattal',
    subfolder: 'Mohammad_al_Tablaway_128kbps',
    bitrate: '128kbps',
  },
  {
    id: 'budair',
    name: 'Ibrahim Al-Budair',
    nameArabic: 'إبراهيم البذير',
    style: 'murattal',
    subfolder: 'Ibrahim_Akhdar_32kbps',
    bitrate: '32kbps',
  },
  {
    id: 'parhizgar',
    name: 'Shahriar Parhizgar',
    nameArabic: 'شهريار پرهيزگار',
    style: 'murattal',
    subfolder: 'Parhizgar_48kbps',
    bitrate: '48kbps',
  },
  {
    id: 'hani_rifai',
    name: 'Hani Ar-Rifai',
    nameArabic: 'هاني الرفاعي',
    style: 'murattal',
    subfolder: 'Hani_Rifai_192kbps',
    bitrate: '192kbps',
  },
  {
    id: 'ali_jaber',
    name: 'Ali Jaber',
    nameArabic: 'علي جابر',
    style: 'murattal',
    subfolder: 'Ali_Jaber_64kbps',
    bitrate: '64kbps',
  },
  // === MUALLIM (pour apprendre - recitation lente avec repetition) ===
  {
    id: 'husary_muallim',
    name: 'Al-Husary (Muallim / Apprentissage)',
    nameArabic: 'الحصري - معلم',
    style: 'muallim',
    subfolder: 'Husary_128kbps_Mujawwad',
    bitrate: '128kbps',
  },
  {
    id: 'minshawi_children',
    name: 'Al-Minshawi (Avec enfants)',
    nameArabic: 'المنشاوي مع الاطفال',
    style: 'muallim',
    subfolder: 'Minshawy_Teacher_128kbps',
    bitrate: '128kbps',
  },
];

export const DEFAULT_RECITER_ID = 'alafasy';

export function getReciterById(id: string): Reciter | undefined {
  return RECITERS.find(r => r.id === id);
}

export function getRecitersByStyle(style: Reciter['style']): Reciter[] {
  return RECITERS.filter(r => r.style === style);
}

export function getAudioUrlForReciter(reciter: Reciter, surahNumber: number, ayahNumber: number): string {
  const surah = String(surahNumber).padStart(3, '0');
  const ayah = String(ayahNumber).padStart(3, '0');
  return `https://everyayah.com/data/${reciter.subfolder}/${surah}${ayah}.mp3`;
}
