// Types Mini-Madrasa
// Source de verite pour le schema. Les tables Supabase (V2) suivent ces structures a la lettre.
// Voir supabase/migrations/001_madrasa_schema.sql pour le schema SQL equivalent.

export type UserId = string;
export type MadrasaId = string;
export type ChallengeId = string;
export type DateStr = string; // format 'YYYY-MM-DD'

export interface Profile {
  id: UserId;
  pseudo: string;
  friend_code: string; // 6 chars, stable
  created_at: string;
}

export interface Madrasa {
  id: MadrasaId;
  name: string;
  invite_code: string; // 6 chars
  admin_id: UserId;
  max_members: number; // default 20
  created_at: string;
}

export interface MadrasaMember {
  madrasa_id: MadrasaId;
  user_id: UserId;
  joined_at: string;
  left_at: string | null; // soft delete : null = actif, date = parti mais stats gardees
}

export interface WirdLog {
  user_id: UserId;
  madrasa_id: MadrasaId;
  log_date: DateStr;
  done: boolean; // V1 simple : fait / pas fait
  validated_at: string | null;
}

export interface WeeklyLeaderboardEntry {
  madrasa_id: MadrasaId;
  user_id: UserId;
  week_start: DateStr; // vendredi de debut
  wird_days: number; // 0-7
  quiz_xp: number;
  rank: number | null;
  is_winner: boolean;
}

export type ChallengeStatus =
  | 'pending'
  | 'accepted'
  | 'completed'
  | 'refused'
  | 'expired';

export interface Challenge {
  id: ChallengeId;
  madrasa_id: MadrasaId | null; // null = defi entre amis hors madrasa
  challenger_id: UserId;
  opponent_id: UserId;
  surah_numbers: number[];
  num_questions: number; // 5 ou 10
  status: ChallengeStatus;
  challenger_score: number | null;
  opponent_score: number | null;
  winner_id: UserId | null;
  xp_reward: number;
  created_at: string;
  expires_at: string;
  completed_at: string | null;
}

export type FriendshipStatus = 'pending' | 'accepted';

export interface Friendship {
  id: string;
  user_id: UserId; // l'emetteur
  friend_id: UserId; // le recepteur
  status: FriendshipStatus;
  created_at: string;
}

// --- Vues / agregats pour l'UI ---

export interface MemberWithStats {
  user_id: UserId;
  pseudo: string;
  friend_code: string;
  is_admin: boolean;
  joined_at: string;
  // stats semaine courante
  wird_done_today: boolean;
  wird_days_this_week: number;
  quiz_xp_this_week: number;
  // stats totales
  weeks_won: number;
  total_xp: number;
  current_streak: number;
}

export interface MadrasaView extends Madrasa {
  members: MemberWithStats[];
  current_user_is_admin: boolean;
  pending_challenges_count: number; // defis recus non repondus
}
