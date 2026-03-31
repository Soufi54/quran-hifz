'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<'loading' | 'ready' | 'redirecting'>('loading');

  useEffect(() => {
    const done = localStorage.getItem('onboardingDone');
    if (!done && !pathname.startsWith('/onboarding')) {
      setStatus('redirecting');
      router.replace('/onboarding');
    } else {
      setStatus('ready');
    }
  }, [pathname, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F0FDF4' }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-3" style={{ boxShadow: '6px 6px 12px rgba(6,78,59,0.08)' }}>
            <span className="text-2xl">📖</span>
          </div>
          <p className="text-emerald-700 font-semibold">Quran Hifz</p>
        </div>
      </div>
    );
  }

  if (status === 'redirecting') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F0FDF4' }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-3" style={{ boxShadow: '6px 6px 12px rgba(6,78,59,0.08)' }}>
            <span className="text-2xl">📖</span>
          </div>
          <p className="text-emerald-700 font-semibold">Quran Hifz</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
