// WebSocket URL utility - handles both development and production
export function getWebSocketUrl() {
  // In production, use environment variable if set
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  
  // If running locally (localhost), use the current host (vite proxy)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${window.location.host}/ws`;
  }

  // Default production fallback (Render proxy)
  return 'wss://rendersal.onrender.com/birddrop/ws';
}
