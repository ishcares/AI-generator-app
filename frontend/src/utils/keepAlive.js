const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export function startKeepAlive() {
  setInterval(() => {
    let baseUrl = BACKEND_URL;
    if (baseUrl.startsWith('/')) {
      baseUrl = `${window.location.origin}${baseUrl}`;
    }
    // Normalize: remove trailing slash, and remove '/api' suffix to get backend root URL
    const rootUrl = baseUrl.replace(/\/$/, '').replace(/\/api$/, '');
    
    fetch(`${rootUrl}/health`)
      .catch((err) => {
        if (import.meta.env.DEV) {
          console.debug('[KeepAlive] Ping failed:', err.message);
        }
      });
  }, 14 * 60 * 1000); // 14 minutes
}
