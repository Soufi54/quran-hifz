'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

export default function PWAInstall() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
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

  if (!show) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 clay-card p-4 flex items-center gap-3 animate-slideDown" style={{ maxWidth: 456, margin: '0 auto' }}>
      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
        <Download size={20} className="text-emerald-600" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-emerald-900">Installer QuranDuel</p>
        <p className="text-xs text-gray-500">Ajoute l&apos;app a ton ecran d&apos;accueil</p>
      </div>
      {deferredPrompt ? (
        <button onClick={handleInstall} className="clay-button text-xs py-2 px-3">Installer</button>
      ) : (
        <p className="text-[10px] text-gray-400 max-w-[80px]">Partager → Ecran d&apos;accueil</p>
      )}
      <button onClick={handleDismiss} className="cursor-pointer text-gray-300 hover:text-gray-500">
        <X size={16} />
      </button>
    </div>
  );
}
