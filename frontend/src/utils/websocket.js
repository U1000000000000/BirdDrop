// WebSocket URL utility - handles both development and production
export function getWebSocketUrl() {
  // In production, use environment variable if set
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  
  // In development, use same host (Vite proxy handles it)
  const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${window.location.host}/ws`;
}
