import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

/**
 * PWA Install Banner
 * Shows "Add to Home Screen" prompt when the browser fires beforeinstallprompt.
 */
export default function PWAInstallBanner() {
  const [prompt,  setPrompt]  = useState(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('pwa_dismissed') === 'true'
  );

  useEffect(() => {
    if (dismissed) return;
    function handler(e) {
      e.preventDefault();
      setPrompt(e);
      setVisible(true);
    }
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [dismissed]);

  async function handleInstall() {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
  }

  function handleDismiss() {
    setVisible(false);
    setDismissed(true);
    localStorage.setItem('pwa_dismissed', 'true');
  }

  if (!visible || dismissed) return null;

  return (
    <div className="pwa-banner">
      <div style={{
        width: 36, height: 36, borderRadius: 'var(--radius-sm)',
        background: 'var(--color-primary)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0
      }}>
        <Download size={16} />
      </div>
      <div>
        <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text)' }}>
          Install AppGen
        </p>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-3)' }}>
          Add to home screen for a native experience
        </p>
      </div>
      <button className="btn btn-primary btn-sm" onClick={handleInstall} id="pwa-install-btn">
        Install
      </button>
      <button
        className="btn btn-ghost btn-sm"
        onClick={handleDismiss}
        style={{ padding: '0.4rem' }}
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
