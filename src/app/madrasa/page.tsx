'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, LogIn, Users, Crown, ChevronRight, UserRound, Swords, UserPlus2, LogOut } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import UserSwitcher from '@/components/UserSwitcher';
import Avatar from '@/components/Avatar';
import { madrasaStore, Madrasa, Profile, isSupabaseMode } from '@/lib/madrasa';
import { useAuth } from '@/components/AuthProvider';

export default function MadrasaHomePage() {
  const router = useRouter();
  const auth = useAuth();
  const supabaseMode = isSupabaseMode();
  const [me, setMe] = useState<Profile | null>(null);
  const [madrasas, setMadrasas] = useState<Madrasa[]>([]);
  const [badges, setBadges] = useState({ pending_challenges: 0, incoming_friends: 0, madrasa_invites: 0 });
  const [loading, setLoading] = useState(true);

  // Redirect vers /auth si mode Supabase et pas connecte
  useEffect(() => {
    if (supabaseMode && !auth.loading && !auth.user) {
      router.replace('/auth');
    }
  }, [supabaseMode, auth.loading, auth.user, router]);

  useEffect(() => {
    // Ne pas charger le store tant que l'auth n'est pas resolue en mode Supabase
    if (supabaseMode && (auth.loading || !auth.user)) return;
    const s = madrasaStore();
    Promise.all([
      s.getCurrentUser(),
      s.listMyMadrasas(),
      s.getUnreadBadges(),
    ])
      .then(([u, ms, b]) => {
        setMe(u);
        setMadrasas(ms);
        setBadges(b);
      })
      .catch((err) => {
        console.error('Erreur chargement madrasa:', err);
      })
      .finally(() => setLoading(false));
  }, [supabaseMode, auth.loading, auth.user]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--bg)] pb-24" style={{ maxWidth: 480, margin: '0 auto' }}>
        <div className="p-4 text-[var(--text-muted)]">Chargement...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] pb-24" style={{ maxWidth: 480, margin: '0 auto' }}>
      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3">
          {me && <Avatar pseudo={me.pseudo} size="lg" />}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[var(--text)]">Mini-Madrasa</h1>
            <p className="text-sm text-[var(--text-muted)]">
              Memorise avec ton groupe. {madrasas.length}/5 madrasas
            </p>
          </div>
        </div>
      </header>

      {/* User switcher (uniquement en mode Local/dev) */}
      {!supabaseMode && (
        <section className="px-4 mb-4">
          <UserSwitcher />
        </section>
      )}

      {/* Bouton deconnexion en mode Supabase */}
      {supabaseMode && me && (
        <section className="px-4 mb-4">
          <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
            <div className="flex items-center gap-3">
              <Avatar pseudo={me.pseudo} size="sm" />
              <div>
                <div className="text-sm font-semibold text-[var(--text)]">{me.pseudo}</div>
                <div className="text-[11px] text-[var(--text-muted)]">Code ami : {me.friend_code}</div>
              </div>
            </div>
            <button
              onClick={async () => {
                await auth.signOut();
                router.replace('/auth');
              }}
              className="p-2 rounded-lg hover:bg-[var(--bg-alt)] text-[var(--text-muted)]"
              aria-label="Se deconnecter"
            >
              <LogOut size={18} />
            </button>
          </div>
        </section>
      )}

      {/* Raccourcis */}
      <section className="px-4 mb-4 grid grid-cols-2 gap-3">
        <Link
          href="/amis"
          className="rounded-2xl p-4 bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--primary)] transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <UserPlus2 size={20} className="text-[var(--primary)]" />
            {badges.incoming_friends > 0 && (
              <span className="inline-flex items-center justify-center min-w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                {badges.incoming_friends}
              </span>
            )}
          </div>
          <div className="font-semibold text-[var(--text)]">Mes amis</div>
          <div className="text-xs text-[var(--text-muted)]">Defier en global</div>
        </Link>
        <Link
          href="/defis"
          className="rounded-2xl p-4 bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--primary)] transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <Swords size={20} className="text-[var(--primary)]" />
            {badges.pending_challenges > 0 && (
              <span className="inline-flex items-center justify-center min-w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                {badges.pending_challenges}
              </span>
            )}
          </div>
          <div className="font-semibold text-[var(--text)]">Mes defis</div>
          <div className="text-xs text-[var(--text-muted)]">Duels 1v1</div>
        </Link>
      </section>

      {/* Liste des madrasas */}
      <section className="px-4 mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
          Mes madrasas
        </h2>

        {madrasas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center">
            <Users size={40} className="mx-auto text-[var(--text-muted)] mb-3" />
            <p className="text-[var(--text-muted)] mb-1">Aucune madrasa pour l&apos;instant</p>
            <p className="text-xs text-[var(--text-muted)]">
              Cree un groupe ou rejoins-en un avec un code
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {madrasas.map((m) => (
              <MadrasaCard key={m.id} madrasa={m} currentUserId={me?.id ?? ''} />
            ))}
          </div>
        )}
      </section>

      {/* Actions principales */}
      <section className="px-4 space-y-2">
        {madrasas.length < 5 && (
          <>
            <button
              onClick={() => router.push('/madrasa/creer')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-[var(--primary)] text-white font-semibold hover:opacity-90 transition-opacity"
            >
              <Plus size={20} />
              Creer une madrasa
            </button>
            <button
              onClick={() => router.push('/madrasa/rejoindre')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text)] font-semibold hover:border-[var(--primary)] transition-colors"
            >
              <LogIn size={20} />
              Rejoindre avec un code
            </button>
          </>
        )}
      </section>

      {/* Lien profil (deplacé ici) */}
      <section className="px-4 mt-6">
        <Link
          href="/profil"
          className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--primary)] transition-colors"
        >
          <UserRound size={20} className="text-[var(--text-muted)]" />
          <span className="flex-1 font-medium text-[var(--text)]">Mon profil & parametres</span>
          <ChevronRight size={18} className="text-[var(--text-muted)]" />
        </Link>
      </section>

      <BottomNav />
    </main>
  );
}

function MadrasaCard({ madrasa, currentUserId }: { madrasa: Madrasa; currentUserId: string }) {
  const [memberCount, setMemberCount] = useState<number>(0);
  const [membersPseudos, setMembersPseudos] = useState<string[]>([]);

  useEffect(() => {
    madrasaStore()
      .getMadrasaView(madrasa.id)
      .then((v) => {
        if (!v) return;
        setMemberCount(v.members.length);
        setMembersPseudos(v.members.slice(0, 4).map((m) => m.pseudo));
      });
  }, [madrasa.id]);

  const isAdmin = madrasa.admin_id === currentUserId;

  return (
    <Link
      href={`/madrasa/view?id=${madrasa.id}`}
      className="block rounded-2xl p-4 bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--primary)] transition-colors"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-[var(--text)] truncate">{madrasa.name}</h3>
            {isAdmin && <Crown size={14} className="text-yellow-500 flex-shrink-0" />}
          </div>
          <div className="text-xs text-[var(--text-muted)]">
            {memberCount} membre{memberCount > 1 ? 's' : ''} · Code : {madrasa.invite_code}
          </div>
        </div>
        <ChevronRight size={18} className="text-[var(--text-muted)] flex-shrink-0" />
      </div>
      {membersPseudos.length > 0 && (
        <div className="flex -space-x-2">
          {membersPseudos.map((p) => (
            <div key={p} className="ring-2 ring-[var(--bg-card)] rounded-full">
              <Avatar pseudo={p} size="sm" />
            </div>
          ))}
          {memberCount > 4 && (
            <div className="ring-2 ring-[var(--bg-card)] rounded-full inline-flex items-center justify-center w-8 h-8 bg-[var(--bg-alt)] text-xs font-semibold text-[var(--text-muted)]">
              +{memberCount - 4}
            </div>
          )}
        </div>
      )}
    </Link>
  );
}
