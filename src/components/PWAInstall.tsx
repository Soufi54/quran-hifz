'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Download, X } from 'lucide-react';

export default function PWAInstall() {
  const pathname = usePathname() ?? '';
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);

  useEffect(() => {
    // Register service worker with update detection
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        // Check for updates every 60 seconds
        setInterval(() => reg.update(), 60 * 1000);

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              // New version active — reload to pick up changes
              window.location.reload();
            }
          });
        });
      }).catch(() => {});
    }

    // Capture install prompt (Android/Chrome)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = localStorage.getItem('pwaInstallDismissed');
      if (!dismissed) setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS detection — show banner manually
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isIOS && !isStandalone) {
      const dismissed = localStorage.getItem('pwaInstallDismissed');
      if (!dismissed) setShow(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      (deferredPrompt as unknown as { prompt: () => void }).prompt();
      setShow(false);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('pwaInstallDismissed', 'true');
  };

  // Ne pas afficher sur /auth (on ne veut pas bloquer la connexion)
  if (!show || pathname.startsWith('/auth')) return null;

  return (
    <div
      className="fixed left-4 right-4 z-30 clay-card p-3 flex items-center gap-3"
      style={{ maxWidth: 456, margin: '0 auto', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)' }}
    >
      <div className="w-9 h-9 rounded-xl bg-[#F0F9F6] flex items-center justify-center flex-shrink-0">
        <Download size={18} className="text-[#0D5C4D]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#1C2B2A] truncate">Installer Quran Hifz</p>
        <p className="text-[11px] text-gray-500 truncate">Ajoute l&apos;app a ton ecran d&apos;accueil</p>
      </div>
      {deferredPrompt ? (
        <button onClick={handleInstall} className="gold-accent rounded-lg text-xs py-2 px-3 font-semibold border-none cursor-pointer flex-shrink-0">Installer</button>
      ) : (
        <p className="text-[10px] text-gray-400 max-w-[80px] flex-shrink-0">Partager → Ecran d&apos;accueil</p>
      )}
      <button onClick={handleDismiss} className="cursor-pointer text-gray-300 hover:text-gray-500 flex-shrink-0" aria-label="Fermer">
        <X size={16} />
      </button>
    </div>
  );
}
