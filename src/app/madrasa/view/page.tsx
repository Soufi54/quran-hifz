'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  Crown,
  Share2,
  Copy,
  Swords,
  LogOut,
  Trash2,
  Trophy,
  UserX,
  Check,
  X,
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import Avatar from '@/components/Avatar';
import { madrasaStore, MadrasaView } from '@/lib/madrasa';

function MadrasaDetailInner() {
  const router = useRouter();
  const search = useSearchParams();
  const id = search?.get('id') ?? '';
  const [view, setView] = useState<MadrasaView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [myId, setMyId] = useState<string>('');

  const refresh = useCallback(async () => {
    if (!id) {
      setError('Aucune madrasa specifiee');
      setLoading(false);
      return;
    }
    const s = madrasaStore();
    try {
      const [v, me] = await Promise.all([s.getMadrasaView(id), s.getCurrentUser()]);
      if (!v) {
        setError('Madrasa introuvable');
      } else {
        setView(v);
        setMyId(me?.id ?? '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function toggleWird() {
    if (!view) return;
    await madrasaStore().toggleWirdToday(view.id);
    refresh();
  }

  async function leave() {
    if (!view) return;
    if (!confirm(`Quitter la madrasa "${view.name}" ?\n(tes stats passees restent visibles)`))
      return;
    await madrasaStore().leaveMadrasa(view.id);
    router.push('/madrasa');
  }

  async function destroy() {
    if (!view) return;
    if (!confirm(`Supprimer definitivement la madrasa "${view.name}" ?`)) return;
    await madrasaStore().deleteMadrasa(view.id);
    router.push('/madrasa');
  }

  async function kick(userId: string, pseudo: string) {
    if (!view) return;
    if (!confirm(`Exclure ${pseudo} de la madrasa ?`)) return;
    await madrasaStore().kickMember(view.id, userId);
    refresh();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--bg)] pb-24" style={{ maxWidth: 480, margin: '0 auto' }}>
        <div className="p-4 text-[var(--text-muted)]">Chargement...</div>
      </main>
    );
  }

  if (error || !view) {
    return (
      <main className="min-h-screen bg-[var(--bg)] pb-24" style={{ maxWidth: 480, margin: '0 auto' }}>
        <header className="px-4 pt-6 pb-4 flex items-center gap-3">
          <Link href="/madrasa" className="p-2 -ml-2 rounded-lg hover:bg-[var(--bg-alt)]">
            <ChevronLeft size={22} className="text-[var(--text)]" />
          </Link>
          <h1 className="text-xl font-bold text-[var(--text)]">Madrasa</h1>
        </header>
        <div className="px-4 text-[var(--text-muted)]">{error}</div>
      </main>
    );
  }

  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/m/${view.invite_code}`
    : `/m/${view.invite_code}`;

  const myWirdDone = view.members.find((m) => m.user_id === myId)?.wird_done_today ?? false;

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  async function shareInvite() {
    const text = `Rejoins la madrasa "${view!.name}" sur Quran Hifz : ${inviteUrl}`;
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await (
          navigator as Navigator & { share: (d: { text: string; url: string }) => Promise<void> }
        ).share({ text, url: inviteUrl });
        return;
      } catch {}
    }
    copyInvite();
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] pb-24" style={{ maxWidth: 480, margin: '0 auto' }}>
      <header className="px-4 pt-6 pb-4 flex items-center gap-3">
        <Link href="/madrasa" className="p-2 -ml-2 rounded-lg hover:bg-[var(--bg-alt)]">
          <ChevronLeft size={22} className="text-[var(--text)]" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-[var(--text)] truncate">{view.name}</h1>
          <div className="text-xs text-[var(--text-muted)]">
            {view.members.length} membre{view.members.length > 1 ? 's' : ''}
          </div>
        </div>
        <button
          onClick={() => setShowShare((v) => !v)}
          className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)]"
          aria-label="Partager"
        >
          <Share2 size={18} className="text-[var(--text)]" />
        </button>
      </header>

      {showShare && (
        <section className="mx-4 mb-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-4">
          <div className="text-sm font-semibold text-[var(--text)] mb-2">Inviter par lien</div>
          <div className="flex items-center gap-2 mb-2">
            <code className="flex-1 text-xs bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-2 overflow-hidden text-ellipsis whitespace-nowrap">
              {inviteUrl}
            </code>
            <button
              onClick={copyInvite}
              className="px-3 py-2 rounded-lg bg-[var(--primary)] text-white text-xs font-semibold"
            >
              {copied ? 'Copie' : <Copy size={14} />}
            </button>
          </div>
          <button
            onClick={shareInvite}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-sm font-medium text-[var(--text)]"
          >
            <Share2 size={14} /> Partager (WhatsApp / SMS / ...)
          </button>
          <div className="mt-3 text-[11px] text-[var(--text-muted)] text-center">
            Code : <strong className="tracking-wider">{view.invite_code}</strong>
          </div>
        </section>
      )}

      <section className="px-4 mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
          Wird aujourd&apos;hui
        </h2>
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] overflow-hidden">
          <button
            onClick={toggleWird}
            className={`w-full flex items-center gap-3 px-4 py-4 border-b border-[var(--border)] transition-colors ${
              myWirdDone ? 'bg-[var(--primary)]/10' : 'hover:bg-[var(--bg-alt)]'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                myWirdDone
                  ? 'bg-[var(--primary)] border-[var(--primary)]'
                  : 'border-[var(--border)]'
              }`}
            >
              {myWirdDone && <Check size={14} className="text-white" strokeWidth={3} />}
            </div>
            <div className="flex-1 text-left">
              <div className="font-semibold text-[var(--text)]">
                {myWirdDone ? 'Wird valide aujourd\u2019hui' : 'Valider mon wird'}
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                {myWirdDone ? 'Clique pour annuler' : 'Appuie quand tu l\u2019as fait'}
              </div>
            </div>
          </button>

          {view.members.map((m) => (
            <div
              key={m.user_id}
              className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] last:border-b-0"
            >
              <Avatar pseudo={m.pseudo} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-[var(--text)] truncate">{m.pseudo}</span>
                  {m.is_admin && <Crown size={12} className="text-yellow-500 flex-shrink-0" />}
                  {m.user_id === myId && (
                    <span className="text-[10px] text-[var(--text-muted)]">(toi)</span>
                  )}
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  {m.wird_days_this_week}/7 cette semaine
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  m.wird_done_today ? 'bg-green-500' : 'bg-[var(--bg-alt)]'
                }`}
              >
                {m.wird_done_today ? (
                  <Check size={12} className="text-white" strokeWidth={3} />
                ) : (
                  <X size={12} className="text-[var(--text-muted)]" />
                )}
              </div>
              {view.current_user_is_admin && m.user_id !== myId && (
                <button
                  onClick={() => kick(m.user_id, m.pseudo)}
                  className="p-1 rounded hover:bg-[var(--bg-alt)] text-[var(--text-muted)]"
                  aria-label="Exclure"
                >
                  <UserX size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2 flex items-center gap-2">
          <Trophy size={14} /> Classement semaine
        </h2>
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] overflow-hidden">
          {view.members
            .slice()
            .sort((a, b) => {
              if (b.quiz_xp_this_week !== a.quiz_xp_this_week)
                return b.quiz_xp_this_week - a.quiz_xp_this_week;
              return b.wird_days_this_week - a.wird_days_this_week;
            })
            .slice(0, 5)
            .map((m, i) => (
              <div
                key={m.user_id}
                className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] last:border-b-0"
              >
                <div className="w-6 text-center font-bold text-[var(--text-muted)]">
                  {i === 0 ? '1' : i === 1 ? '2' : i === 2 ? '3' : i + 1}
                </div>
                <Avatar pseudo={m.pseudo} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[var(--text)] truncate">{m.pseudo}</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {m.wird_days_this_week}/7 wird · {m.weeks_won} semaines gagnees
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[var(--primary)]">{m.quiz_xp_this_week}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">XP</div>
                </div>
              </div>
            ))}
        </div>
      </section>

      <section className="px-4 space-y-2">
        <Link
          href={`/madrasa/defier?id=${view.id}`}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[var(--primary)] text-white font-semibold hover:opacity-90"
        >
          <Swords size={18} />
          Lancer un defi
        </Link>

        {view.pending_challenges_count > 0 && (
          <Link
            href="/defis"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-500 text-white font-semibold"
          >
            {view.pending_challenges_count} defi{view.pending_challenges_count > 1 ? 's' : ''} a
            jouer
          </Link>
        )}

        {view.current_user_is_admin ? (
          <button
            onClick={destroy}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[var(--bg-card)] border border-red-400/50 text-red-500 font-semibold hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 size={18} />
            Supprimer la madrasa
          </button>
        ) : (
          <button
            onClick={leave}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] font-medium hover:border-red-400/50 hover:text-red-500"
          >
            <LogOut size={18} />
            Quitter la madrasa
          </button>
        )}
      </section>

      <BottomNav />
    </main>
  );
}

export default function MadrasaDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg)] p-4 text-[var(--text-muted)]">
          Chargement...
        </div>
      }
    >
      <MadrasaDetailInner />
    </Suspense>
  );
}
