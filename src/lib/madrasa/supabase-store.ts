// Implementation Supabase du MadrasaStore.
// Les RLS policies dans supabase/rls-policies.sql font le gros du travail de securite :
// le client ne peut lire que ce qui lui appartient (membre, challenger/opponent, ami).

import { supabase } from '../supabase';
import { MadrasaStore } from './store';
import {
  Profile,
  Madrasa,
  MadrasaView,
  WirdLog,
  WeeklyLeaderboardEntry,
  Challenge,
  ChallengeId,
  Friendship,
  MemberWithStats,
  UserId,
  MadrasaId,
} from './types';
import { randomCode, todayStr, toLocalDateStr, currentWeekStart } from './utils';

async function requireUserId(): Promise<UserId> {
  const {
    data: { user },
  } = await supabase().auth.getUser();
  if (!user) throw new Error('Non connecte');
  return user.id;
}

export class SupabaseMadrasaStore implements MadrasaStore {
  // --- Profil courant ---

  async getCurrentUser(): Promise<Profile | null> {
    const {
      data: { user },
    } = await supabase().auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase()
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (error || !data) return null;
    return data as Profile;
  }

  async setCurrentUser(): Promise<void> {
    // No-op : l'user courant est gere par Supabase Auth (signIn / signOut).
    // Cette methode existe pour compatibilite avec LocalStore (user switcher).
    return;
  }

  async listAllProfiles(): Promise<Profile[]> {
    // Utilise seulement par le UserSwitcher local. En prod Supabase : renvoie juste le current.
    const me = await this.getCurrentUser();
    return me ? [me] : [];
  }

  async getProfile(userId: UserId): Promise<Profile | null> {
    const { data } = await supabase()
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    return (data as Profile) ?? null;
  }

  async getProfileByFriendCode(code: string): Promise<Profile | null> {
    const upper = code.trim().toUpperCase();
    const { data } = await supabase()
      .from('profiles')
      .select('*')
      .eq('friend_code', upper)
      .maybeSingle();
    return (data as Profile) ?? null;
  }

  async searchProfilesByPseudo(query: string): Promise<Profile[]> {
    const q = query.trim();
    if (!q) return [];
    const { data } = await supabase()
      .from('profiles')
      .select('*')
      .ilike('pseudo', `%${q}%`)
      .limit(10);
    return (data as Profile[]) ?? [];
  }

  // --- Madrasas ---

  async listMyMadrasas(): Promise<Madrasa[]> {
    const uid = await requireUserId();
    const { data } = await supabase()
      .from('madrasa_members')
      .select('madrasas(*)')
      .eq('user_id', uid)
      .is('left_at', null);
    if (!data) return [];
    return data
      .map((r: { madrasas: Madrasa | Madrasa[] | null }) =>
        Array.isArray(r.madrasas) ? r.madrasas[0] : r.madrasas,
      )
      .filter((m): m is Madrasa => Boolean(m));
  }

  async getMadrasa(id: MadrasaId): Promise<Madrasa | null> {
    const { data } = await supabase().from('madrasas').select('*').eq('id', id).maybeSingle();
    return (data as Madrasa) ?? null;
  }

  async getMadrasaByInviteCode(code: string): Promise<Madrasa | null> {
    const upper = code.trim().toUpperCase();
    const { data } = await supabase()
      .from('madrasas')
      .select('*')
      .eq('invite_code', upper)
      .maybeSingle();
    return (data as Madrasa) ?? null;
  }

  async createMadrasa(name: string): Promise<Madrasa> {
    const uid = await requireUserId();
    // Generate unique invite_code (retry max 5 fois)
    for (let i = 0; i < 5; i++) {
      const code = randomCode(6);
      const { data, error } = await supabase()
        .from('madrasas')
        .insert({ name: name.trim(), invite_code: code, admin_id: uid, max_members: 50 })
        .select('*')
        .single();
      if (!error && data) {
        // Auto-join admin comme membre
        await supabase().from('madrasa_members').insert({
          madrasa_id: data.id,
          user_id: uid,
        });
        return data as Madrasa;
      }
      if (error && !error.message.includes('invite_code')) throw error;
    }
    throw new Error('Impossible de generer un code unique');
  }

  async joinMadrasa(inviteCode: string): Promise<Madrasa> {
    const uid = await requireUserId();
    const m = await this.getMadrasaByInviteCode(inviteCode);
    if (!m) throw new Error('Code invalide');

    // Si deja membre (actif ou passe), reactiver
    const { data: existing } = await supabase()
      .from('madrasa_members')
      .select('*')
      .eq('madrasa_id', m.id)
      .eq('user_id', uid)
      .maybeSingle();

    if (existing) {
      if (existing.left_at) {
        await supabase()
          .from('madrasa_members')
          .update({ left_at: null, joined_at: new Date().toISOString() })
          .eq('madrasa_id', m.id)
          .eq('user_id', uid);
      }
      return m;
    }

    // Verifier la capacite
    const { count } = await supabase()
      .from('madrasa_members')
      .select('*', { count: 'exact', head: true })
      .eq('madrasa_id', m.id)
      .is('left_at', null);
    if ((count ?? 0) >= m.max_members) throw new Error('Madrasa pleine');

    const { error } = await supabase().from('madrasa_members').insert({
      madrasa_id: m.id,
      user_id: uid,
    });
    if (error) throw error;
    return m;
  }

  async leaveMadrasa(id: MadrasaId): Promise<void> {
    const uid = await requireUserId();
    await supabase()
      .from('madrasa_members')
      .update({ left_at: new Date().toISOString() })
      .eq('madrasa_id', id)
      .eq('user_id', uid)
      .is('left_at', null);
  }

  async deleteMadrasa(id: MadrasaId): Promise<void> {
    const { error } = await supabase().from('madrasas').delete().eq('id', id);
    if (error) throw error;
  }

  async kickMember(madrasaId: MadrasaId, userId: UserId): Promise<void> {
    await supabase()
      .from('madrasa_members')
      .update({ left_at: new Date().toISOString() })
      .eq('madrasa_id', madrasaId)
      .eq('user_id', userId)
      .is('left_at', null);
  }

  // --- Wird ---

  async getWirdToday(madrasaId: MadrasaId): Promise<WirdLog | null> {
    const uid = await requireUserId();
    const today = todayStr();
    const { data } = await supabase()
      .from('wird_logs')
      .select('*')
      .eq('user_id', uid)
      .eq('madrasa_id', madrasaId)
      .eq('log_date', today)
      .maybeSingle();
    return (data as WirdLog) ?? null;
  }

  async toggleWirdToday(madrasaId: MadrasaId): Promise<WirdLog> {
    const uid = await requireUserId();
    const today = todayStr();
    const existing = await this.getWirdToday(madrasaId);
    const nowIso = new Date().toISOString();

    if (existing) {
      const updated = !existing.done;
      const { data, error } = await supabase()
        .from('wird_logs')
        .update({ done: updated, validated_at: updated ? nowIso : null })
        .eq('user_id', uid)
        .eq('madrasa_id', madrasaId)
        .eq('log_date', today)
        .select('*')
        .single();
      if (error) throw error;
      return data as WirdLog;
    }
    const { data, error } = await supabase()
      .from('wird_logs')
      .insert({
        user_id: uid,
        madrasa_id: madrasaId,
        log_date: today,
        done: true,
        validated_at: nowIso,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as WirdLog;
  }

  async getWirdWeek(madrasaId: MadrasaId, userId: UserId): Promise<WirdLog[]> {
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(toLocalDateStr(d));
    }
    const { data } = await supabase()
      .from('wird_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('madrasa_id', madrasaId)
      .in('log_date', dates);
    const byDate = new Map<string, WirdLog>((data as WirdLog[] | null)?.map((l) => [l.log_date, l]) ?? []);
    return dates.map(
      (date) =>
        byDate.get(date) ?? {
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
    // Membres actifs
    const { data: members } = await supabase()
      .from('madrasa_members')
      .select('user_id, profiles(pseudo)')
      .eq('madrasa_id', madrasaId)
      .is('left_at', null);
    if (!members) return [];

    // Leaderboard entries
    const { data: lb } = await supabase()
      .from('weekly_leaderboard')
      .select('*')
      .eq('madrasa_id', madrasaId)
      .eq('week_start', week);
    const lbMap = new Map<string, WeeklyLeaderboardEntry>(
      (lb as WeeklyLeaderboardEntry[] | null)?.map((e) => [e.user_id, e]) ?? [],
    );

    // Wird count this week par user
    const { data: wirdRows } = await supabase()
      .from('wird_logs')
      .select('user_id, done, log_date')
      .eq('madrasa_id', madrasaId)
      .gte('log_date', week)
      .eq('done', true);
    const wirdCount = new Map<string, number>();
    for (const row of (wirdRows as Array<{ user_id: string }> | null) ?? []) {
      wirdCount.set(row.user_id, (wirdCount.get(row.user_id) ?? 0) + 1);
    }

    type MemberRow = { user_id: string; profiles: { pseudo: string } | Array<{ pseudo: string }> | null };
    const entries = (members as MemberRow[]).map((m) => {
      const prof = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      const existing = lbMap.get(m.user_id);
      return {
        madrasa_id: madrasaId,
        user_id: m.user_id,
        week_start: week,
        wird_days: wirdCount.get(m.user_id) ?? 0,
        quiz_xp: existing?.quiz_xp ?? 0,
        rank: null as number | null,
        is_winner: false,
        pseudo: prof?.pseudo ?? '??',
      };
    });

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
    const uid = await requireUserId();
    await this.addQuizXpForUser(madrasaId, uid, amount);
  }

  private async addQuizXpForUser(
    madrasaId: MadrasaId,
    userId: UserId,
    amount: number,
  ): Promise<void> {
    const week = currentWeekStart();
    const { data: existing } = await supabase()
      .from('weekly_leaderboard')
      .select('*')
      .eq('madrasa_id', madrasaId)
      .eq('user_id', userId)
      .eq('week_start', week)
      .maybeSingle();
    if (existing) {
      await supabase()
        .from('weekly_leaderboard')
        .update({ quiz_xp: (existing as WeeklyLeaderboardEntry).quiz_xp + amount })
        .eq('madrasa_id', madrasaId)
        .eq('user_id', userId)
        .eq('week_start', week);
    } else {
      await supabase().from('weekly_leaderboard').insert({
        madrasa_id: madrasaId,
        user_id: userId,
        week_start: week,
        quiz_xp: amount,
        wird_days: 0,
      });
    }
  }

  // --- Challenges ---

  private async enrichExpired(rows: Challenge[]): Promise<Challenge[]> {
    const now = Date.now();
    const toExpire = rows.filter(
      (c) => c.status === 'pending' && new Date(c.expires_at).getTime() < now,
    );
    if (toExpire.length > 0) {
      await supabase()
        .from('challenges')
        .update({ status: 'expired' })
        .in(
          'id',
          toExpire.map((c) => c.id),
        );
      for (const c of toExpire) c.status = 'expired';
    }
    return rows;
  }

  async listIncomingChallenges(): Promise<Challenge[]> {
    const uid = await requireUserId();
    const { data } = await supabase()
      .from('challenges')
      .select('*')
      .eq('opponent_id', uid)
      .eq('status', 'pending');
    return this.enrichExpired((data as Challenge[]) ?? []);
  }

  async listOutgoingChallenges(): Promise<Challenge[]> {
    const uid = await requireUserId();
    const { data } = await supabase()
      .from('challenges')
      .select('*')
      .eq('challenger_id', uid)
      .in('status', ['pending', 'accepted']);
    return (data as Challenge[]) ?? [];
  }

  async listCompletedChallenges(): Promise<Challenge[]> {
    const uid = await requireUserId();
    const { data } = await supabase()
      .from('challenges')
      .select('*')
      .or(`challenger_id.eq.${uid},opponent_id.eq.${uid}`)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(10);
    return (data as Challenge[]) ?? [];
  }

  async createChallenge(
    opponentId: UserId,
    surahNumbers: number[],
    numQuestions: number,
    madrasaId: MadrasaId | null = null,
  ): Promise<Challenge> {
    const uid = await requireUserId();
    if (opponentId === uid) throw new Error('Tu ne peux pas te defier toi-meme');

    // max 3 challenges actifs
    const { count } = await supabase()
      .from('challenges')
      .select('*', { count: 'exact', head: true })
      .eq('challenger_id', uid)
      .in('status', ['pending', 'accepted']);
    if ((count ?? 0) >= 3) throw new Error('Trop de defis en cours (max 3)');

    const now = new Date();
    const expires = new Date(now.getTime() + 48 * 3600 * 1000);
    const { data, error } = await supabase()
      .from('challenges')
      .insert({
        madrasa_id: madrasaId,
        challenger_id: uid,
        opponent_id: opponentId,
        surah_numbers: surahNumbers,
        num_questions: numQuestions,
        status: 'pending',
        xp_reward: 50,
        expires_at: expires.toISOString(),
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as Challenge;
  }

  async acceptChallenge(id: ChallengeId): Promise<Challenge> {
    const { data, error } = await supabase()
      .from('challenges')
      .update({ status: 'accepted' })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as Challenge;
  }

  async refuseChallenge(id: ChallengeId): Promise<void> {
    await supabase().from('challenges').update({ status: 'refused' }).eq('id', id);
  }

  async recordChallengeScore(id: ChallengeId, score: number): Promise<Challenge> {
    const uid = await requireUserId();
    const { data: current } = await supabase()
      .from('challenges')
      .select('*')
      .eq('id', id)
      .single();
    if (!current) throw new Error('Defi introuvable');

    const c = current as Challenge;
    const update: Partial<Challenge> = {};
    if (c.challenger_id === uid) update.challenger_score = score;
    else if (c.opponent_id === uid) update.opponent_score = score;
    else throw new Error('Pas implique dans ce defi');

    const newChallengerScore = update.challenger_score ?? c.challenger_score;
    const newOpponentScore = update.opponent_score ?? c.opponent_score;

    if (newChallengerScore !== null && newOpponentScore !== null) {
      update.status = 'completed';
      update.completed_at = new Date().toISOString();
      if (newChallengerScore > newOpponentScore) update.winner_id = c.challenger_id;
      else if (newOpponentScore > newChallengerScore) update.winner_id = c.opponent_id;
      else update.winner_id = null;
    }

    const { data, error } = await supabase()
      .from('challenges')
      .update(update)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    const updated = data as Challenge;

    // Distribuer XP si complete + dans une madrasa
    if (updated.status === 'completed' && updated.madrasa_id) {
      if (updated.winner_id === null) {
        await this.addQuizXpForUser(updated.madrasa_id, updated.challenger_id, 25);
        await this.addQuizXpForUser(updated.madrasa_id, updated.opponent_id, 25);
      } else {
        await this.addQuizXpForUser(updated.madrasa_id, updated.winner_id, updated.xp_reward);
      }
    }
    return updated;
  }

  // --- Amis ---

  async listFriends(): Promise<(Friendship & { profile: Profile })[]> {
    const uid = await requireUserId();
    const { data } = await supabase()
      .from('friendships')
      .select('*')
      .eq('status', 'accepted')
      .or(`user_id.eq.${uid},friend_id.eq.${uid}`);
    if (!data) return [];
    const rows = data as Friendship[];
    const otherIds = rows.map((f) => (f.user_id === uid ? f.friend_id : f.user_id));
    const { data: profiles } = await supabase()
      .from('profiles')
      .select('*')
      .in('id', otherIds);
    const pmap = new Map((profiles as Profile[] | null)?.map((p) => [p.id, p]) ?? []);
    return rows
      .map((f) => {
        const otherId = f.user_id === uid ? f.friend_id : f.user_id;
        const profile = pmap.get(otherId);
        return profile ? { ...f, profile } : null;
      })
      .filter((x): x is Friendship & { profile: Profile } => x !== null);
  }

  async listIncomingFriendRequests(): Promise<(Friendship & { profile: Profile })[]> {
    const uid = await requireUserId();
    const { data } = await supabase()
      .from('friendships')
      .select('*')
      .eq('status', 'pending')
      .eq('friend_id', uid);
    if (!data) return [];
    const rows = data as Friendship[];
    const senderIds = rows.map((f) => f.user_id);
    const { data: profiles } = await supabase()
      .from('profiles')
      .select('*')
      .in('id', senderIds);
    const pmap = new Map((profiles as Profile[] | null)?.map((p) => [p.id, p]) ?? []);
    return rows
      .map((f) => {
        const profile = pmap.get(f.user_id);
        return profile ? { ...f, profile } : null;
      })
      .filter((x): x is Friendship & { profile: Profile } => x !== null);
  }

  async sendFriendRequest(friendCodeOrUserId: string): Promise<Friendship> {
    const uid = await requireUserId();
    const input = friendCodeOrUserId.trim();
    let targetId: UserId | null = null;
    // UUID format detection
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input)) {
      targetId = input;
    } else {
      const p = await this.getProfileByFriendCode(input);
      targetId = p?.id ?? null;
    }
    if (!targetId) throw new Error('Utilisateur introuvable');
    if (targetId === uid) throw new Error('Tu ne peux pas t ajouter toi-meme');

    // Check existing relation
    const { data: existing } = await supabase()
      .from('friendships')
      .select('*')
      .or(
        `and(user_id.eq.${uid},friend_id.eq.${targetId}),and(user_id.eq.${targetId},friend_id.eq.${uid})`,
      )
      .maybeSingle();
    if (existing) return existing as Friendship;

    const { data, error } = await supabase()
      .from('friendships')
      .insert({ user_id: uid, friend_id: targetId, status: 'pending' })
      .select('*')
      .single();
    if (error) throw error;
    return data as Friendship;
  }

  async acceptFriendRequest(friendshipId: string): Promise<Friendship> {
    const { data, error } = await supabase()
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId)
      .select('*')
      .single();
    if (error) throw error;
    return data as Friendship;
  }

  async removeFriend(friendshipId: string): Promise<void> {
    await supabase().from('friendships').delete().eq('id', friendshipId);
  }

  // --- Vue agregee ---

  async getMadrasaView(id: MadrasaId): Promise<MadrasaView | null> {
    const uid = await requireUserId();
    const m = await this.getMadrasa(id);
    if (!m) return null;

    // Membres actifs + profils
    const { data: memberRows } = await supabase()
      .from('madrasa_members')
      .select('user_id, joined_at, profiles(id, pseudo, friend_code)')
      .eq('madrasa_id', id)
      .is('left_at', null);

    type MemberRow = {
      user_id: string;
      joined_at: string;
      profiles: { id: string; pseudo: string; friend_code: string } | Array<{ id: string; pseudo: string; friend_code: string }> | null;
    };

    const week = currentWeekStart();
    const today = todayStr();

    // Toutes les entrees wird de la semaine pour cette madrasa
    const { data: wirdRows } = await supabase()
      .from('wird_logs')
      .select('user_id, done, log_date')
      .eq('madrasa_id', id)
      .gte('log_date', week);

    // Toutes les lignes leaderboard (historique + courant)
    const { data: lbAllRows } = await supabase()
      .from('weekly_leaderboard')
      .select('*')
      .eq('madrasa_id', id);
    const lbRows = (lbAllRows as WeeklyLeaderboardEntry[] | null) ?? [];

    // Pending challenges pour moi dans cette madrasa
    const { count: pendingCount } = await supabase()
      .from('challenges')
      .select('*', { count: 'exact', head: true })
      .eq('madrasa_id', id)
      .eq('opponent_id', uid)
      .eq('status', 'pending');

    const members: MemberWithStats[] = (memberRows as MemberRow[] | null ?? []).map((mm) => {
      const p = Array.isArray(mm.profiles) ? mm.profiles[0] : mm.profiles;
      const wirdDaysWeek = ((wirdRows as Array<{ user_id: string; done: boolean; log_date: string }> | null) ?? [])
        .filter((w) => w.user_id === mm.user_id && w.done)
        .length;
      const wirdDoneToday = ((wirdRows as Array<{ user_id: string; done: boolean; log_date: string }> | null) ?? [])
        .some((w) => w.user_id === mm.user_id && w.done && w.log_date === today);
      const weekly = lbRows.find((e) => e.user_id === mm.user_id && e.week_start === week);
      const weeksWon = lbRows.filter((e) => e.user_id === mm.user_id && e.is_winner).length;
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
        total_xp: 0,
        current_streak: 0,
      };
    });

    return {
      ...m,
      members,
      current_user_is_admin: m.admin_id === uid,
      pending_challenges_count: pendingCount ?? 0,
    };
  }

  // --- Notifications / badges ---

  async getUnreadBadges() {
    const uid = await requireUserId();
    const [pendingChallenges, incomingFriends] = await Promise.all([
      supabase()
        .from('challenges')
        .select('*', { count: 'exact', head: true })
        .eq('opponent_id', uid)
        .eq('status', 'pending'),
      supabase()
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .eq('friend_id', uid)
        .eq('status', 'pending'),
    ]);
    return {
      pending_challenges: pendingChallenges.count ?? 0,
      incoming_friends: incomingFriends.count ?? 0,
      madrasa_invites: 0,
    };
  }
}
