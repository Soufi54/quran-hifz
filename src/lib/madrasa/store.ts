// Interface unique pour le stockage des donnees Mini-Madrasa.
//
// V1 : implementee par LocalStore (localStorage).
// V2 : implementee par SupabaseStore (meme interface, meme signatures).
//
// Regle d'or : AUCUN composant ou page n'appelle localStorage ou supabase directement.
// Tout passe par cette interface. Switcher Local -> Supabase = changer une ligne dans index.ts.

import {
  Profile,
  Madrasa,
  MadrasaView,
  MadrasaMember,
  WirdLog,
  WeeklyLeaderboardEntry,
  Challenge,
  ChallengeStatus,
  Friendship,
  MemberWithStats,
  UserId,
  MadrasaId,
  ChallengeId,
  DateStr,
} from './types';

export interface MadrasaStore {
  // --- Profil courant ---
  getCurrentUser(): Promise<Profile | null>;
  setCurrentUser(userId: UserId): Promise<void>;

  // --- Profils (pour le user switcher et affichage) ---
  listAllProfiles(): Promise<Profile[]>;
  getProfile(userId: UserId): Promise<Profile | null>;
  getProfileByFriendCode(code: string): Promise<Profile | null>;
  searchProfilesByPseudo(query: string): Promise<Profile[]>;

  // --- Madrasas ---
  listMyMadrasas(): Promise<Madrasa[]>;
  getMadrasa(id: MadrasaId): Promise<Madrasa | null>;
  getMadrasaByInviteCode(code: string): Promise<Madrasa | null>;
  getMadrasaView(id: MadrasaId): Promise<MadrasaView | null>;
  createMadrasa(name: string): Promise<Madrasa>;
  joinMadrasa(inviteCode: string): Promise<Madrasa>;
  leaveMadrasa(id: MadrasaId): Promise<void>;
  deleteMadrasa(id: MadrasaId): Promise<void>; // admin seulement
  kickMember(madrasaId: MadrasaId, userId: UserId): Promise<void>; // admin seulement

  // --- Wird ---
  getWirdToday(madrasaId: MadrasaId): Promise<WirdLog | null>;
  toggleWirdToday(madrasaId: MadrasaId): Promise<WirdLog>;
  getWirdWeek(madrasaId: MadrasaId, userId: UserId): Promise<WirdLog[]>; // 7 derniers jours

  // --- Classement hebdo ---
  getWeeklyLeaderboard(madrasaId: MadrasaId): Promise<(WeeklyLeaderboardEntry & { pseudo: string })[]>;
  addQuizXp(madrasaId: MadrasaId, amount: number): Promise<void>;

  // --- Challenges ---
  listIncomingChallenges(): Promise<Challenge[]>;
  listOutgoingChallenges(): Promise<Challenge[]>;
  listCompletedChallenges(): Promise<Challenge[]>;
  createChallenge(
    opponentId: UserId,
    surahNumbers: number[],
    numQuestions: number,
    madrasaId?: MadrasaId | null,
  ): Promise<Challenge>;
  acceptChallenge(id: ChallengeId): Promise<Challenge>;
  refuseChallenge(id: ChallengeId): Promise<void>;
  recordChallengeScore(id: ChallengeId, score: number): Promise<Challenge>;

  // --- Amis ---
  listFriends(): Promise<(Friendship & { profile: Profile })[]>;
  listIncomingFriendRequests(): Promise<(Friendship & { profile: Profile })[]>;
  sendFriendRequest(friendCodeOrUserId: string): Promise<Friendship>;
  acceptFriendRequest(friendshipId: string): Promise<Friendship>;
  removeFriend(friendshipId: string): Promise<void>;

  // --- Notifications / badges ---
  getUnreadBadges(): Promise<{
    pending_challenges: number;
    incoming_friends: number;
    madrasa_invites: number;
  }>;
}
