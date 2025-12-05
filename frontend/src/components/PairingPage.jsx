import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PairQR from './PairQR.jsx';
import PairGeo from './PairGeo.jsx';
import PairNFC from './PairNFC.jsx';
import { getWebSocketUrl } from '../utils/websocket.js';

const NfcChipIcon = ({ className = '' }) => (
  <svg
    className={className}
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="8"
      y="8"
      width="24"
      height="24"
      rx="6"
      stroke="currentColor"
      strokeWidth="2"
    />
    <rect
      x="13"
      y="13"
      width="14"
      height="14"
      rx="4"
      stroke="currentColor"
      strokeWidth="2"
    />
    <rect x="17" y="17" width="6" height="6" rx="1.5" fill="currentColor" />
    <path
      d="M5 12c0-2.209 1.791-4 4-4h2M35 12c0-2.209-1.791-4-4-4h-2M5 28c0 2.209 1.791 4 4 4h2M35 28c0 2.209-1.791 4-4 4h-2"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export default function PairingPage() {
  const [showQR, setShowQR] = useState(false);
  const [showGeo, setShowGeo] = useState(false);
  const [showNFC, setShowNFC] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  
  // Check if running in Android app
  const isAndroidApp = typeof window.Android !== 'undefined';

  // Get or generate sessionId
  function getSessionIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    let sid = params.get('session');
    if (typeof sid === 'string' && sid.startsWith('session-') && sid.length >= 24) return sid;
    // Generate a long sessionId if not present
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 24; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    sid = 'session-' + result;
    window.history.replaceState({}, '', `${window.location.pathname}?session=${sid}`);
    return sid;
  }

  const [sessionId, setSessionId] = useState(getSessionIdFromUrl());
  const navigationHandledRef = React.useRef(false);

  React.useEffect(() => {
    if (navigationHandledRef.current) return undefined;
    let ws = null;
    if (sessionId && sessionId.startsWith('session-')) {
      try {
        // Reuse a global shared signaling socket if already created elsewhere
        if (window.__birddrop_signaling_ws && window.__birddrop_signaling_ws.readyState !== 3) {
          ws = window.__birddrop_signaling_ws;
        } else {
          const wsUrl = getWebSocketUrl();
          ws = new WebSocket(wsUrl);
          window.__birddrop_signaling_ws = ws;
        }
        
        // Store the current session ID for FileShare to check
        window.__birddrop_current_session = sessionId;

        const sendJoin = () => {
          try {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'join', sessionId }));
              try { ws._joinSent = true; } catch (e) {}
            }
          } catch (e) {}
        };
        const onOpen = () => {
          sendJoin();
        };
        const onMessage = (ev) => {
          try {
            const data = JSON.parse(ev.data);
            if (data.type === 'intrusion_attempt') return;
            if (data.type === 'waiting' || data.type === 'ready') {
              try { window.__birddrop_signaling_state = data.type; } catch (e) {}
            }
            if (data.type === 'ready' && data.role && ws) {
              try { ws._role = data.role; } catch (e) {}
            }
            if (data.type === 'ready') {
              if (navigationHandledRef.current) {
                return;
              }
              navigate(`/share?session=${sessionId}`);
            }
          } catch (e) {}
        };
        const onError = (e) => {};

        ws.addEventListener('open', onOpen);
        ws.addEventListener('message', onMessage);
        ws.addEventListener('error', onError);

        if (ws.readyState === WebSocket.OPEN) sendJoin();
      } catch (err) {}
    }

    return () => {
      try {
        try { ws.removeEventListener('open', onOpen); } catch (e) {}
        try { ws.removeEventListener('message', onMessage); } catch (e) {}
        try { ws.removeEventListener('error', onError); } catch (e) {}
      } catch (e) {}
    };
  }, [sessionId, navigate]);

  const handlePairSuccess = (sid) => {
    const targetSession = sid || sessionId;
    navigationHandledRef.current = true;
    if (sid && sid !== sessionId) {
      try { setSessionId(sid); } catch (e) {}
    }
    const target = `/share?session=${targetSession}`;
    navigate(target);
  };

  return (
    <div className="min-h-screen">
      <div className="relative w-full max-w-2xl mx-auto px-5 pt-8 pb-20">
        <div className="mb-16">
          <h1 className="text-5xl md:text-6xl font-semibold text-white/95 tracking-tight leading-none text-center mb-3">
            BirdDrop
          </h1>
          <p className="text-lg text-white/50 font-light text-center">
            Share files. Instantly.
          </p>
        </div>

        {/* Pairing Methods - Apple-style card stack */}
        <div className="space-y-3">
          {/* QR Code Option */}
          <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 overflow-hidden">
            <button
              onClick={() => {
                setShowQR(v => !v);
                setShowGeo(false);
                setShowNFC(false);
                setShowShare(false);
              }}
              className="w-full p-6 text-left transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
                    <svg className="w-6 h-6 text-emerald-200" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      {/* Finder squares */}
                      <rect x="2" y="2" width="6" height="6" rx="1.2" />
                      <rect x="16" y="2" width="6" height="6" rx="1.2" />
                      <rect x="2" y="16" width="6" height="6" rx="1.2" />
                      {/* Small modules to suggest a QR pattern */}
                      <rect x="10" y="8" width="2" height="2" rx="0.4" />
                      <rect x="13" y="8" width="2" height="2" rx="0.4" />
                      <rect x="8" y="11" width="2" height="2" rx="0.4" />
                      <rect x="11" y="11" width="2" height="2" rx="0.4" />
                      <rect x="14" y="11" width="2" height="2" rx="0.4" />
                      <rect x="11" y="14" width="2" height="2" rx="0.4" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[17px] font-semibold text-white/95 mb-0.5">QR Code</div>
                    <div className="text-[15px] text-white/50 font-normal">Scan to connect</div>
                  </div>
                </div>
                <svg 
                  className={`w-5 h-5 text-white/30 transition-transform duration-300 ${showQR ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            
            <div className={`transition-all duration-300 ease-out ${showQR ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="px-6 pb-6 pt-2">
                <div className="h-px bg-white/10 mb-6"></div>
                <PairQR sessionId={sessionId} onPairSuccess={handlePairSuccess} />
              </div>
            </div>
          </div>

          {/* Location Option */}
          <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 overflow-hidden">
            <button
              onClick={() => {
                setShowGeo(v => !v);
                setShowQR(false);
                setShowNFC(false);
                setShowShare(false);
              }}
              className="w-full p-6 text-left transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
                    <svg className="w-6 h-6 text-emerald-200" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[17px] font-semibold text-white/95 mb-0.5">Location</div>
                    <div className="text-[15px] text-white/50 font-normal">Find nearby devices</div>
                  </div>
                </div>
                <svg 
                  className={`w-5 h-5 text-white/30 transition-transform duration-300 ${showGeo ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            
            <div className={`transition-all duration-300 ease-out ${showGeo ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="px-6 pb-6 pt-2">
                <div className="h-px bg-white/10 mb-6"></div>
                <PairGeo onPairSuccess={handlePairSuccess} />
              </div>
            </div>
          </div>

          {/* NFC Option - Only shown in Android app */}
          {isAndroidApp && (
            <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 overflow-hidden">
              <button
                onClick={() => {
                  setShowNFC(v => !v);
                  setShowQR(false);
                  setShowGeo(false);
                  setShowShare(false);
                }}
                className="w-full p-6 text-left transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
                      <NfcChipIcon className="w-7 h-7 text-emerald-200" />
                    </div>
                    <div>
                      <div className="text-[17px] font-semibold text-white/95 mb-0.5">NFC Tap</div>
                      <div className="text-[15px] text-white/50 font-normal">Tap devices together</div>
                    </div>
                  </div>
                  <svg 
                    className={`w-5 h-5 text-white/30 transition-transform duration-300 ${showNFC ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              
              <div className={`transition-all duration-300 ease-out ${showNFC ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-6 pb-6 pt-2">
                  <div className="h-px bg-white/10 mb-6"></div>
                  <PairNFC sessionId={sessionId} onPairSuccess={handlePairSuccess} />
                </div>
              </div>
            </div>
          )}

          {/* Share Link Option — polished to match other blocks */}
          <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 overflow-hidden">
            <button
              onClick={() => {
                setShowShare(v => !v);
                setShowQR(false);
                setShowGeo(false);
                setShowNFC(false);
              }}
              className="w-full p-6 text-left transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
                    <svg className="w-6 h-6 text-emerald-200" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      {/* Paper-plane style share icon for clarity */}
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[17px] font-semibold text-white/95 mb-0.5">Share Link</div>
                    <div className="text-[15px] text-white/50 font-normal">Copy a link to share</div>
                  </div>
                </div>
                <svg 
                  className={`w-5 h-5 text-white/30 transition-transform duration-300 ${showShare ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {showShare && (
              <div className="px-6 pb-6 pt-2">
                <div className="h-px bg-white/10 mb-6"></div>

                <div className="w-full rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-white/80 font-medium mb-1">Session link</div>
                    <div className="text-sm text-white/90 font-mono break-words" style={{ wordBreak: 'break-all' }} title={window.location.origin + '/share?session=' + encodeURIComponent(sessionId)}>
                      {window.location.origin + '/share?session=' + encodeURIComponent(sessionId)}
                    </div>
                    <div className="text-xs text-white/60 mt-2">Send this link to the other device to join this session.</div>
                  </div>

                  <div className="flex-shrink-0">
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const link = window.location.origin + '/share?session=' + encodeURIComponent(sessionId);
                        try {
                          await navigator.clipboard.writeText(link);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        } catch (err) {
                          const ta = document.createElement('textarea');
                          ta.value = link;
                          document.body.appendChild(ta);
                          ta.select();
                          try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch (e) {}
                          document.body.removeChild(ta);
                        }
                      }}
                      aria-pressed={copied}
                      className={`inline-flex items-center justify-center w-10 h-10 rounded-full transition-colors ${copied ? 'bg-emerald-400 text-white' : 'bg-white/5 text-white hover:bg-white/10'}`}
                    >
                      {copied ? (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Note - Apple-style subtle footer */}
        <div className="mt-12 text-center">
          <p className="text-[15px] text-white/40 font-normal leading-relaxed">
            Choose a pairing method to begin sharing files<br className="hidden sm:block" /> 
            securely between your devices.
          </p>
        </div>
      </div>
    </div>
  );
}
