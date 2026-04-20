// Implementation locale (localStorage) du MadrasaStore.
// V1 — permet de tester toute la feature sans backend.
// Les donnees persistent dans le navigateur. Pas de multi-device reel.
//
// Quand on migrera vers Supabase : cette classe n'est plus utilisee, SupabaseStore prend le relais.
// Les donnees locales peuvent etre exportees via exportRaw() pour migration one-shot.

import {
  Profile,
  Madrasa,
  MadrasaMember,
  MadrasaView,
  WirdLog,
  WeeklyLeaderboardEntry,
  Challenge,
  Friendship,
  MemberWithStats,
  UserId,
  MadrasaId,
  ChallengeId,
} from './types';
import { MadrasaStore } from './store';
import { randomCode, uuid, nowIso, todayStr, toLocalDateStr, currentWeekStart } from './utils';

// --- Cles localStorage ---

const K = {
  currentUser: 'qh_madrasa_current_user_id',
  profiles: 'qh_madrasa_profiles',
  madrasas: 'qh_madrasa_madrasas',
  members: 'qh_madrasa_members',
  wird: 'qh_madrasa_wird_logs',
  leaderboard: 'qh_madrasa_leaderboard',
  challenges: 'qh_madrasa_challenges',
  friendships: 'qh_madrasa_friendships',
  seeded: 'qh_madrasa_seeded_v1',
} as const;

function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

// --- Seed initial (4 users de test) ---
// Ne s'execute qu'une fois. Pour reset : vider localStorage ou effacer cle qh_madrasa_seeded_v1.

const SEED_USERS: Array<Pick<Profile, 'id' | 'pseudo' | 'friend_code'>> = [
  { id: 'user-chaker', pseudo: 'Chaker', friend_code: 'CHAKR1' },
  { id: 'user-ahmed', pseudo: 'Ahmed', friend_code: 'AHMED8' },
  { id: 'user-youssef', pseudo: 'Youssef', friend_code: 'YSSF42' },
  { id: 'user-fatima', pseudo: 'Fatima', friend_code: 'FATMA7' },
];

function ensureSeed(): void {
  if (typeof window === 'undefined') return;
  if (window.localStorage.getItem(K.seeded)) return;

  const profiles: Record<UserId, Profile> = {};
  for (const u of SEED_USERS) {
    profiles[u.id] = { ...u, created_at: nowIso() };
  }
  lsSet(K.profiles, profiles);
  lsSet(K.madrasas, {});
  lsSet(K.members, []);
  lsSet(K.wird, []);
  lsSet(K.leaderboard, []);
  lsSet(K.challenges, []);
  lsSet(K.friendships, []);
  window.localStorage.setItem(K.currentUser, 'user-chaker');
  window.localStorage.setItem(K.seeded, '1');
}

// --- Helpers collections ---

function getProfiles(): Record<UserId, Profile> {
  return lsGet<Record<UserId, Profile>>(K.profiles, {});
}

function getMadrasas(): Record<MadrasaId, Madrasa> {
  return lsGet<Record<MadrasaId, Madrasa>>(K.madrasas, {});
}

function getMembers(): MadrasaMember[] {
  return lsGet<MadrasaMember[]>(K.members, []);
}

function getWirdLogs(): WirdLog[] {
  return lsGet<WirdLog[]>(K.wird, []);
}

function getLeaderboard(): WeeklyLeaderboardEntry[] {
  return lsGet<WeeklyLeaderboardEntry[]>(K.leaderboard, []);
}

function getChallenges(): Challenge[] {
  return lsGet<Challenge[]>(K.challenges, []);
}

function getFriendships(): Friendship[] {
  return lsGet<Friendship[]>(K.friendships, []);
}

// --- Checks de securite ---

function requireCurrentUserId(): UserId {
  if (typeof window === 'undefined') throw new Error('No window');
  const id = window.localStorage.getItem(K.currentUser);
  if (!id) throw new Error('No current user');
  return id;
}

function isActiveMember(madrasaId: MadrasaId, userId: UserId): boolean {
  return getMembers().some(
    (m) => m.madrasa_id === madrasaId && m.user_id === userId && m.left_at === null,
  );
}

// --- Implementation ---

export class LocalMadrasaStore implements MadrasaStore {
  constructor() {
    ensureSeed();
  }

  // --- Profil courant ---

  async getCurrentUser(): Promise<Profile | null> {
    if (typeof window === 'undefined') return null;
    ensureSeed();
    const id = window.localStorage.getItem(K.currentUser);
    if (!id) return null;
    return getProfiles()[id] ?? null;
  }

  async setCurrentUser(userId: UserId): Promise<void> {
    if (typeof window === 'undefined') return;
    const profiles = getProfiles();
    if (!profiles[userId]) throw new Error(`Unknown user: ${userId}`);
    window.localStorage.setItem(K.currentUser, userId);
  }

  async listAllProfiles(): Promise<Profile[]> {
    return Object.values(getProfiles());
  }

  async getProfile(userId: UserId): Promise<Profile | null> {
    return getProfiles()[userId] ?? null;
  }

  async getProfileByFriendCode(code: string): Promise<Profile | null> {
    const upper = code.trim().toUpperCase();
    return Object.values(getProfiles()).find((p) => p.friend_code === upper) ?? null;
  }

  async searchProfilesByPseudo(query: string): Promise<Profile[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return Object.values(getProfiles()).filter((p) =>
      p.pseudo.toLowerCase().includes(q),
    );
  }

  // --- Madrasas ---

  async listMyMadrasas(): Promise<Madrasa[]> {
    const uid = requireCurrentUserId();
    const myMembers = getMembers().filter(
      (m) => m.user_id === uid && m.left_at === null,
    );
    const madrasas = getMadrasas();
    return myMembers
      .map((m) => madrasas[m.madrasa_id])
      .filter((m): m is Madrasa => Boolean(m));
  }

  async getMadrasa(id: MadrasaId): Promise<Madrasa | null> {
    return getMadrasas()[id] ?? null;
  }

  async getMadrasaByInviteCode(code: string): Promise<Madrasa | null> {
    const upper = code.trim().toUpperCase();
    return Object.values(getMadrasas()).find((m) => m.invite_code === upper) ?? null;
  }

  async createMadrasa(name: string): Promise<Madrasa> {
    const uid = requireCurrentUserId();
    const myCount = (await this.listMyMadrasas()).length;
    if (myCount >= 5) throw new Error('Tu as deja atteint la limite de 5 madrasas');

    const madrasa: Madrasa = {
      id: uuid(),
      name: name.trim(),
      invite_code: randomCode(6),
      admin_id: uid,
      max_members: 50,
      created_at: nowIso(),
    };
    const madrasas = getMadrasas();
    madrasas[madrasa.id] = madrasa;
    lsSet(K.madrasas, madrasas);

    const members = getMembers();
    members.push({
      madrasa_id: madrasa.id,
      user_id: uid,
      joined_at: nowIso(),
      left_at: null,
    });
    lsSet(K.members, members);

    return madrasa;
  }

  async joinMadrasa(inviteCode: string): Promise<Madrasa> {
    const uid = requireCurrentUserId();
    const m = await this.getMadrasaByInviteCode(inviteCode);
    if (!m) throw new Error('Code invalide');

    const active = getMembers().filter((mm) => mm.madrasa_id === m.id && mm.left_at === null);
    if (active.some((mm) => mm.user_id === uid)) return m; // deja membre
    if (active.length >= m.max_members) throw new Error('Madrasa pleine');

    const myCount = (await this.listMyMadrasas()).length;
    if (myCount >= 5) throw new Error('Tu as deja atteint la limite de 5 madrasas');

    // Si l'user a deja ete membre et a quitte (left_at != null), on le reactive
    const members = getMembers();
    const past = members.find(
      (mm) => mm.madrasa_id === m.id && mm.user_id === uid,
    );
    if (past) {
      past.left_at = null;
      past.joined_at = nowIso();
    } else {
      members.push({
        madrasa_id: m.id,
        user_id: uid,
        joined_at: nowIso(),
        left_at: null,
      });
    }
    lsSet(K.members, members);
    return m;
  }

  async leaveMadrasa(id: MadrasaId): Promise<void> {
    const uid = requireCurrentUserId();
    const members = getMembers();
    const idx = members.findIndex(
      (m) => m.madrasa_id === id && m.user_id === uid && m.left_at === null,
    );
    if (idx < 0) return;
    members[idx].left_at = nowIso();
    lsSet(K.members, members);
  }

  async deleteMadrasa(id: MadrasaId): Promise<void> {
    const uid = requireCurrentUserId();
    const madrasas = getMadrasas();
    const m = madrasas[id];
    if (!m) return;
    if (m.admin_id !== uid) throw new Error('Seul l admin peut supprimer');
    delete madrasas[id];
    lsSet(K.madrasas, madrasas);

    lsSet(
      K.members,
      getMembers().filter((mm) => mm.madrasa_id !== id),
    );
    lsSet(
      K.wird,
      getWirdLogs().filter((w) => w.madrasa_id !== id),
    );
    lsSet(
      K.leaderboard,
      getLeaderboard().filter((l) => l.madrasa_id !== id),
    );
    lsSet(
      K.challenges,
      getChallenges().filter((c) => c.madrasa_id !== id),
    );
  }

  async kickMember(madrasaId: MadrasaId, userId: UserId): Promise<void> {
    const uid = requireCurrentUserId();
    const m = (await this.getMadrasa(madrasaId));
    if (!m) throw new Error('Madrasa inconnue');
    if (m.admin_id !== uid) throw new Error('Seul l admin peut exclure');
    if (userId === uid) throw new Error('L admin ne peut pas s exclure lui-meme');

    const members = getMembers();
    const idx = members.findIndex(
      (mm) => mm.madrasa_id === madrasaId && mm.user_id === userId && mm.left_at === null,
    );
    if (idx < 0) return;
    members[idx].left_at = nowIso();
    lsSet(K.members, members);
  }

  // --- Wird ---

  async getWirdToday(madrasaId: MadrasaId): Promise<WirdLog | null> {
    const uid = requireCurrentUserId();
    const today = todayStr();
    return (
      getWirdLogs().find(
        (w) => w.user_id === uid && w.madrasa_id === madrasaId && w.log_date === today,
      ) ?? null
    );
  }

  async toggleWirdToday(madrasaId: MadrasaId): Promise<WirdLog> {
    const uid = requireCurrentUserId();
    if (!isActiveMember(madrasaId, uid)) throw new Error('Pas membre de cette madrasa');

    const today = todayStr();
    const logs = getWirdLogs();
    const idx = logs.findIndex(
      (w) => w.user_id === uid && w.madrasa_id === madrasaId && w.log_date === today,
    );
    if (idx >= 0) {
      logs[idx].done = !logs[idx].done;
      logs[idx].validated_at = logs[idx].done ? nowIso() : null;
      lsSet(K.wird, logs);
      return logs[idx];
    }
    const created: WirdLog = {
      user_id: uid,
      madrasa_id: madrasaId,
      log_date: today,
      done: true,
      validated_at: nowIso(),
    };
    logs.push(created);
    lsSet(K.wird, logs);
    return created;
  }

  async getWirdWeek(madrasaId: MadrasaId, userId: UserId): Promise<WirdLog[]> {
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(toLocalDateStr(d));
    }
    const logs = getWirdLogs().filter(
      (w) => w.user_id === userId && w.madrasa_id === madrasaId && dates.includes(w.log_date),
    );
    return dates.map(
      (date) =>
        logs.find((l) => l.log_date === date) ?? {
          user_id: userId,
          madrasa_id: madrasaId,
          log_date: date,
          done: false,
          validated_at: null,
        },
    );
  }

  // --- Classement hebdo ---

  async getWeeklyLeaderboard(
    madrasaId: MadrasaId,
  ): Promise<(WeeklyLeaderboardEntry & { pseudo: string })[]> {
    const week = currentWeekStart();
    const profiles = getProfiles();
    const members = getMembers().filter(
      (m) => m.madrasa_id === madrasaId && m.left_at === null,
    );
    const lb = getLeaderboard();
    const wirdLogs = getWirdLogs();

    const entries: Array<WeeklyLeaderboardEntry & { pseudo: string }> = members.map((m) => {
      const existing = lb.find(
        (e) => e.madrasa_id === madrasaId && e.user_id === m.user_id && e.week_start === week,
      );
      const wirdDays = wirdLogs.filter(
        (w) =>
          w.madrasa_id === madrasaId &&
          w.user_id === m.user_id &&
          w.done &&
          w.log_date >= week,
      ).length;
      return {
        madrasa_id: madrasaId,
        user_id: m.user_id,
        week_start: week,
        wird_days: wirdDays,
        quiz_xp: existing?.quiz_xp ?? 0,
        rank: null,
        is_winner: false,
        pseudo: profiles[m.user_id]?.pseudo ?? '??',
      };
    });
    // Tri par XP puis wird_days puis pseudo
    entries.sort((a, b) => {
      if (b.quiz_xp !== a.quiz_xp) return b.quiz_xp - a.quiz_xp;
      if (b.wird_days !== a.wird_days) return b.wird_days - a.wird_days;
      return a.pseudo.localeCompare(b.pseudo);
    });
    entries.forEach((e, i) => {
      e.rank = i + 1;
    });
    return entries;
  }

  async addQuizXp(madrasaId: MadrasaId, amount: number): Promise<void> {
    const uid = requireCurrentUserId();
    if (!isActiveMember(madrasaId, uid)) return;
    const week = currentWeekStart();
    const lb = getLeaderboard();
    const idx = lb.findIndex(
      (e) => e.madrasa_id === madrasaId && e.user_id === uid && e.week_start === week,
    );
    if (idx >= 0) {
      lb[idx].quiz_xp += amount;
    } else {
      lb.push({
        madrasa_id: madrasaId,
        user_id: uid,
        week_start: week,
        wird_days: 0,
        quiz_xp: amount,
        rank: null,
        is_winner: false,
      });
    }
    lsSet(K.leaderboard, lb);
  }

  // --- Challenges ---

  async listIncomingChallenges(): Promise<Challenge[]> {
    const uid = requireCurrentUserId();
    const now = Date.now();
    const all = getChallenges();
    // Auto-expire
    let mutated = false;
    for (const c of all) {
      if (c.status === 'pending' && new Date(c.expires_at).getTime() < now) {
        c.status = 'expired';
        mutated = true;
      }
    }
    if (mutated) lsSet(K.challenges, all);
    return all.filter((c) => c.opponent_id === uid && c.status === 'pending');
  }

  async listOutgoingChallenges(): Promise<Challenge[]> {
    const uid = requireCurrentUserId();
    return getChallenges().filter(
      (c) =>
        c.challenger_id === uid &&
        (c.status === 'pending' || c.status === 'accepted'),
    );
  }

  async listCompletedChallenges(): Promise<Challenge[]> {
    const uid = requireCurrentUserId();
    return getChallenges()
      .filter(
        (c) => (c.challenger_id === uid || c.opponent_id === uid) && c.status === 'completed',
      )
      .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))
      .slice(0, 10);
  }

  async createChallenge(
    opponentId: UserId,
    surahNumbers: number[],
    numQuestions: number,
    madrasaId: MadrasaId | null = null,
  ): Promise<Challenge> {
    const uid = requireCurrentUserId();
    if (opponentId === uid) throw new Error('Tu ne peux pas te defier toi-meme');

    const active = getChallenges().filter(
      (c) => c.challenger_id === uid && (c.status === 'pending' || c.status === 'accepted'),
    );
    if (active.length >= 3) throw new Error('Trop de defis en cours (max 3)');

    const now = new Date();
    const expires = new Date(now.getTime() + 48 * 3600 * 1000);
    const c: Challenge = {
      id: uuid(),
      madrasa_id: madrasaId,
      challenger_id: uid,
      opponent_id: opponentId,
      surah_numbers: surahNumbers,
      num_questions: numQuestions,
      status: 'pending',
      challenger_score: null,
      opponent_score: null,
      winner_id: null,
      xp_reward: 50,
      created_at: nowIso(),
      expires_at: expires.toISOString(),
      completed_at: null,
    };
    const all = getChallenges();
    all.push(c);
    lsSet(K.challenges, all);
    return c;
  }

  async acceptChallenge(id: ChallengeId): Promise<Challenge> {
    const uid = requireCurrentUserId();
    const all = getChallenges();
    const c = all.find((x) => x.id === id);
    if (!c) throw new Error('Defi introuvable');
    if (c.opponent_id !== uid) throw new Error('Tu n es pas le destinataire');
    if (c.status !== 'pending') throw new Error('Defi deja traite');
    c.status = 'accepted';
    lsSet(K.challenges, all);
    return c;
  }

  async refuseChallenge(id: ChallengeId): Promise<void> {
    const uid = requireCurrentUserId();
    const all = getChallenges();
    const c = all.find((x) => x.id === id);
    if (!c) return;
    if (c.opponent_id !== uid) throw new Error('Tu n es pas le destinataire');
    if (c.status !== 'pending') return;
    c.status = 'refused';
    lsSet(K.challenges, all);
  }

  async recordChallengeScore(id: ChallengeId, score: number): Promise<Challenge> {
    const uid = requireCurrentUserId();
    const all = getChallenges();
    const c = all.find((x) => x.id === id);
    if (!c) throw new Error('Defi introuvable');
    if (c.challenger_id === uid) c.challenger_score = score;
    else if (c.opponent_id === uid) c.opponent_score = score;
    else throw new Error('Pas implique dans ce defi');

    // Si les deux scores sont la, on cloture
    if (c.challenger_score !== null && c.opponent_score !== null) {
      if (c.challenger_score > c.opponent_score) c.winner_id = c.challenger_id;
      else if (c.opponent_score > c.challenger_score) c.winner_id = c.opponent_id;
      else c.winner_id = null;
      c.status = 'completed';
      c.completed_at = nowIso();

      // XP bonus
      if (c.madrasa_id) {
        if (c.winner_id === null) {
          // egalite : +25 chacun
          await this.addQuizXpForUser(c.madrasa_id, c.challenger_id, 25);
          await this.addQuizXpForUser(c.madrasa_id, c.opponent_id, 25);
        } else {
          await this.addQuizXpForUser(c.madrasa_id, c.winner_id, c.xp_reward);
        }
      }
    }
    lsSet(K.challenges, all);
    return c;
  }

  // helper privé (pas dans l'interface) - needed for challenges sans current user
  private async addQuizXpForUser(
    madrasaId: MadrasaId,
    userId: UserId,
    amount: number,
  ): Promise<void> {
    const week = currentWeekStart();
    const lb = getLeaderboard();
    const idx = lb.findIndex(
      (e) => e.madrasa_id === madrasaId && e.user_id === userId && e.week_start === week,
    );
    if (idx >= 0) {
      lb[idx].quiz_xp += amount;
    } else {
      lb.push({
        madrasa_id: madrasaId,
        user_id: userId,
        week_start: week,
        wird_days: 0,
        quiz_xp: amount,
        rank: null,
        is_winner: false,
      });
    }
    lsSet(K.leaderboard, lb);
  }

  // --- Amis ---

  async listFriends(): Promise<(Friendship & { profile: Profile })[]> {
    const uid = requireCurrentUserId();
    const profiles = getProfiles();
    return getFriendships()
      .filter(
        (f) => f.status === 'accepted' && (f.user_id === uid || f.friend_id === uid),
      )
      .map((f) => {
        const otherId = f.user_id === uid ? f.friend_id : f.user_id;
        return { ...f, profile: profiles[otherId] } as Friendship & { profile: Profile };
      })
      .filter((f) => Boolean(f.profile));
  }

  async listIncomingFriendRequests(): Promise<(Friendship & { profile: Profile })[]> {
    const uid = requireCurrentUserId();
    const profiles = getProfiles();
    return getFriendships()
      .filter((f) => f.status === 'pending' && f.friend_id === uid)
      .map((f) => ({ ...f, profile: profiles[f.user_id] }))
      .filter((f) => Boolean(f.profile)) as (Friendship & { profile: Profile })[];
  }

  async sendFriendRequest(friendCodeOrUserId: string): Promise<Friendship> {
    const uid = requireCurrentUserId();
    const input = friendCodeOrUserId.trim();
    let targetId: UserId | null = null;
    if (input.startsWith('user-')) {
      targetId = input;
    } else {
      const p = await this.getProfileByFriendCode(input);
      targetId = p?.id ?? null;
    }
    if (!targetId) throw new Error('Utilisateur introuvable');
    if (targetId === uid) throw new Error('Tu ne peux pas t ajouter toi-meme');

    const all = getFriendships();
    const existing = all.find(
      (f) =>
        (f.user_id === uid && f.friend_id === targetId) ||
        (f.user_id === targetId && f.friend_id === uid),
    );
    if (existing) return existing;

    const f: Friendship = {
      id: uuid(),
      user_id: uid,
      friend_id: targetId,
      status: 'pending',
      created_at: nowIso(),
    };
    all.push(f);
    lsSet(K.friendships, all);
    return f;
  }

  async acceptFriendRequest(friendshipId: string): Promise<Friendship> {
    const uid = requireCurrentUserId();
    const all = getFriendships();
    const f = all.find((x) => x.id === friendshipId);
    if (!f) throw new Error('Demande introuvable');
    if (f.friend_id !== uid) throw new Error('Pas le destinataire');
    if (f.status === 'accepted') return f;
    f.status = 'accepted';
    lsSet(K.friendships, all);
    return f;
  }

  async removeFriend(friendshipId: string): Promise<void> {
    const all = getFriendships().filter((f) => f.id !== friendshipId);
    lsSet(K.friendships, all);
  }

  // --- Vue agregee ---

  async getMadrasaView(id: MadrasaId): Promise<MadrasaView | null> {
    const m = await this.getMadrasa(id);
    if (!m) return null;
    const uid = requireCurrentUserId();
    const profiles = getProfiles();
    const wirdLogs = getWirdLogs();
    const today = todayStr();
    const week = currentWeekStart();
    const lb = getLeaderboard();

    const members = getMembers()
      .filter((mm) => mm.madrasa_id === id && mm.left_at === null)
      .map<MemberWithStats>((mm) => {
        const p = profiles[mm.user_id];
        const wirdDoneToday = wirdLogs.some(
          (w) =>
            w.user_id === mm.user_id &&
            w.madrasa_id === id &&
            w.log_date === today &&
            w.done,
        );
        const wirdDaysWeek = wirdLogs.filter(
          (w) =>
            w.user_id === mm.user_id &&
            w.madrasa_id === id &&
            w.done &&
            w.log_date >= week,
        ).length;
        const weekly = lb.find(
          (e) => e.madrasa_id === id && e.user_id === mm.user_id && e.week_start === week,
        );
        const weeksWon = lb.filter(
          (e) => e.madrasa_id === id && e.user_id === mm.user_id && e.is_winner,
        ).length;
        return {
          user_id: mm.user_id,
          pseudo: p?.pseudo ?? '??',
          friend_code: p?.friend_code ?? '',
          is_admin: m.admin_id === mm.user_id,
          joined_at: mm.joined_at,
          wird_done_today: wirdDoneToday,
          wird_days_this_week: wirdDaysWeek,
          quiz_xp_this_week: weekly?.quiz_xp ?? 0,
          weeks_won: weeksWon,
          total_xp: 0, // V1 : pas de XP global
          current_streak: 0, // V1 : pas encore branche sur le streak quran existant
        };
      });

    const pendingChallenges = getChallenges().filter(
      (c) => c.madrasa_id === id && c.opponent_id === uid && c.status === 'pending',
    ).length;

    return {
      ...m,
      members,
      current_user_is_admin: m.admin_id === uid,
      pending_challenges_count: pendingChallenges,
    };
  }

  // --- Notifications / badges ---

  async getUnreadBadges() {
    const uid = requireCurrentUserId();
    return {
      pending_challenges: getChallenges().filter(
        (c) => c.opponent_id === uid && c.status === 'pending',
      ).length,
      incoming_friends: getFriendships().filter(
        (f) => f.friend_id === uid && f.status === 'pending',
      ).length,
      madrasa_invites: 0, // pas d'invitation explicite : tout passe par lien
    };
  }

  // --- Export pour migration Supabase ---

  exportRaw(): Record<string, unknown> {
    return {
      profiles: getProfiles(),
      madrasas: getMadrasas(),
      members: getMembers(),
      wird: getWirdLogs(),
      leaderboard: getLeaderboard(),
      challenges: getChallenges(),
      friendships: getFriendships(),
    };
  }
}
