// Utilitaires partages (avatar, codes, dates, IDs)

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sans I/L/O/0/1 (confusion)

export function randomCode(length = 6): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

export function uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayStr(): string {
  return toLocalDateStr(new Date());
}

// Debut de la semaine = vendredi (semaine islamique)
// week_start = vendredi le plus recent avant ou egal a aujourd'hui
export function currentWeekStart(date = new Date()): string {
  const d = new Date(date);
  // JS : dimanche=0, lundi=1, ..., vendredi=5, samedi=6
  const dayOfWeek = d.getDay();
  const daysSinceFriday = (dayOfWeek - 5 + 7) % 7;
  d.setDate(d.getDate() - daysSinceFriday);
  d.setHours(0, 0, 0, 0);
  return toLocalDateStr(d);
}

// Couleurs avatar (palette douce, contrast accessible avec texte blanc)
const AVATAR_COLORS = [
  '#0D5C4D', // primary
  '#1D7A66',
  '#2E8B5A',
  '#D4A574', // warm
  '#C17F59',
  '#8B5A3C',
  '#5B8C99',
  '#4A6FA5',
  '#7A6FBE',
  '#9B5F8F',
  '#B8627D',
  '#6F8F4A',
];

export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash = hash & hash;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function avatarInitial(pseudo: string): string {
  return (pseudo.trim().charAt(0) || '?').toUpperCase();
}
