'use client';

import { Download, Share, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import styles from './InstallApp.module.css';

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export default function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [ios, setIos] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        console.warn('Veyli app worker registration failed.');
      });
    }
    const standalone = window.matchMedia('(display-mode: standalone)');
    const appleStandalone = (navigator as Navigator & { standalone?: boolean }).standalone;
    if (standalone.matches || appleStandalone) return;

    const appleDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIos(appleDevice);

    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const installed = () => {
      setPrompt(null);
      setIos(false);
      dialog.current?.close();
    };
    const displayChanged = () => {
      if (standalone.matches) installed();
    };
    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', installed);
    standalone.addEventListener('change', displayChanged);
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', installed);
      standalone.removeEventListener('change', displayChanged);
    };
  }, []);

  async function install() {
    setError('');
    if (!prompt) {
      dialog.current?.showModal();
      return;
    }
    setBusy(true);
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch {
      setError('Installation is unavailable. Try again from your browser menu.');
    } finally {
      setPrompt(null);
      setBusy(false);
    }
  }

  if (!prompt && !ios && !error) return null;
  return (
    <>
      {(prompt || ios) && (
        <button
          type="button"
          className={styles.install}
          onClick={install}
          disabled={busy}
          title="Install Veyli"
          aria-label="Install Veyli"
        >
          <Download size={18} aria-hidden="true" />
          Install
        </button>
      )}
      {error && (
        <span role="status" className={styles.error}>
          {error}
        </span>
      )}
      <dialog ref={dialog} className={styles.dialog} aria-labelledby="install-title">
        <button
          type="button"
          className={styles.close}
          onClick={() => dialog.current?.close()}
          title="Close"
          aria-label="Close"
        >
          <X size={18} aria-hidden="true" />
        </button>
        <h2 id="install-title">Install Veyli</h2>
        <p>
          In Safari, tap <Share size={16} aria-label="Share" /> Share, then Add to Home Screen.
        </p>
        <p>Choose Open as Web App when offered, then tap Add.</p>
      </dialog>
    </>
  );
}
