
import React, { useState, useRef, useEffect } from 'react';
import { useToast } from './ToastProvider.jsx';
import { getWebSocketUrl } from '../utils/websocket.js';

const BIRDDROP_ADJECTIVES = [
  'Excited', 'Confident', 'Brave', 'Curious', 'Clever', 'Happy', 'Calm', 'Gentle', 'Swift', 'Bold',
  'Playful', 'Wise', 'Lively', 'Cheerful', 'Mighty', 'Nimble', 'Friendly', 'Chill', 'Witty', 'Sunny'
];
const BIRDDROP_ANIMALS = [
  'Monkey', 'Donkey', 'Tiger', 'Panda', 'Otter', 'Fox', 'Wolf', 'Eagle', 'Dolphin', 'Bear',
  'Rabbit', 'Lion', 'Koala', 'Penguin', 'Hawk', 'Swan', 'Horse', 'Cat', 'Dog', 'Moose'
];
function generateRandomName(existingNames) {
  let tries = 0;
  let name;
  do {
    const adj = BIRDDROP_ADJECTIVES[Math.floor(Math.random() * BIRDDROP_ADJECTIVES.length)];
    const animal = BIRDDROP_ANIMALS[Math.floor(Math.random() * BIRDDROP_ANIMALS.length)];
    name = `${adj}-${animal}`;
    tries++;
  } while (existingNames.includes(name) && tries < 100);
  return name;
}

export default function PairGeo({ onPairSuccess }) {
  const { show, confirm } = useToast();
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [peers, setPeers] = useState([]);
  const [myName, setMyName] = useState(null);
  const [myId, setMyId] = useState(null);
  const wsRef = useRef(null);
  const [wsState, setWsState] = useState(null); // keep a smaller state handle for UI-driven checks
  const geoUpdateInterval = useRef(null);

  useEffect(() => {
    return () => {
      if (geoUpdateInterval.current) {
        clearInterval(geoUpdateInterval.current);
        geoUpdateInterval.current = null;
      }
      if (wsRef.current) {
        // If this WS was registered as the shared global signaling socket,
        // don't close it on unmount — the FileShare page may reuse it.
        try {
          if (!wsRef.current._isGlobal) {
            wsRef.current.close();
          } else {
            // leave global socket open and clear local ref
            try { window.__birddrop_signaling_ws = wsRef.current; } catch (e) {}
          }
        } catch (e) {}
        wsRef.current = null;
      }
    };
  }, []);

  const handleGeoPair = async () => {
    setStatus('locating');
    setError(null);
    if (!navigator.geolocation) {
      setError('Geolocation not supported.');
      setStatus('idle');
      return;
    }
    // Permissions API check
    if (navigator.permissions) {
      try {
        const permStatus = await navigator.permissions.query({ name: 'geolocation' });
        console.log('[PairGeo] Permission state:', permStatus.state);
        if (permStatus.state === 'denied') {
          setError('Location permission denied. Please enable precise location access in settings.');
          setStatus('idle');
          return;
        }
      } catch (e) {
        console.warn('[PairGeo] Permission query failed:', e);
      }
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        console.log('[PairGeo] Location acquired:', pos.coords.latitude, pos.coords.longitude, 'accuracy:', pos.coords.accuracy);
        setStatus('connecting');
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;
        let newWs = wsRef.current;
        if (!newWs || newWs.readyState !== 1) {
          const wsUrl = getWebSocketUrl();
          newWs = new window.WebSocket(wsUrl);
          wsRef.current = newWs;
          // Expose geo WS as the global signaling socket so FileShare can reuse it
          try { window.__birddrop_signaling_ws = newWs; newWs._isGlobal = true; } catch (e) {}
          setWsState(newWs);
        }
        const id = 'geo-' + Math.random().toString(36).slice(2, 10);
        setMyId(id);
        // Generate name only once per session
        const usedNames = peers.map(p => p.hint);
        const name = myName || generateRandomName(usedNames);
        setMyName(name);
        // Send location update
        const sendLocationUpdate = () => {
          if (newWs.readyState === 1) {
            newWs.send(JSON.stringify({
              type: 'geo-join',
              lat, lon,
              joinTime: Date.now(),
              userId: id,
              hint: name
            }));
          }
        };
        newWs.onopen = () => {
          sendLocationUpdate();
          if (geoUpdateInterval.current) clearInterval(geoUpdateInterval.current);
          geoUpdateInterval.current = setInterval(sendLocationUpdate, 5000);
        };
        newWs.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'geo-peer-list') {
              setPeers(msg.peers.map(p => ({ id: p.userId, hint: p.hint, distance: p.distance })));
              setStatus('active');
            } else if (msg.type === 'geo-connection-request') {
              const fromId = msg.fromId;
              // Resolve the friendly name from the latest peer list if available
              const requesterName = msg.hint || (peers && peers.find(p => p.id === fromId) && peers.find(p => p.id === fromId).hint) || 'Device';
              // Use toast-based confirm (async); fall back to window.confirm if unavailable
              (async () => {
                let accepted = false;
                try {
                  const prompt = `${requesterName} wants to pair with you. Accept?`;
                  if (confirm) accepted = await confirm(prompt);
                  else accepted = window.confirm ? window.confirm(prompt) : false;
                } catch (e) { accepted = false; }
                try {
                  newWs.send(JSON.stringify({ type: 'geo-approve', fromId: fromId, toId: id, approved: !!accepted }));
                } catch (e) {}
              })();
            } else if (msg.type === 'geo-match') {
              if (geoUpdateInterval.current) {
                clearInterval(geoUpdateInterval.current);
                geoUpdateInterval.current = null;
              }
              setStatus('paired');
              setMyName(null);
              try {
                if (msg.sessionId) { window.ddrop_pending_session = msg.sessionId; }
                
                const ensureBackgroundJoin = async (sid) => {
                  try {
                    let signaling = window.__birddrop_signaling_ws;
                    const wsUrl = getWebSocketUrl();
                    if (!signaling || signaling.readyState === 3) {
                      signaling = new window.WebSocket(wsUrl);
                      window.__birddrop_signaling_ws = signaling;
                    }

                    const sendJoin = () => {
                      try {
                        if (signaling.readyState === WebSocket.OPEN) {
                          signaling.send(JSON.stringify({ type: 'join', sessionId: sid }));
                        }
                      } catch (e) {}
                    };

                    const gotReady = await new Promise((resolve) => {
                      const onMessage = (ev) => {
                        try {
                          const d = JSON.parse(ev.data);
                          if (d && d.type === 'ready') {
                            try { signaling._role = d.role; } catch (e) {}
                            signaling.removeEventListener('message', onMessage);
                            signaling.removeEventListener('open', onOpen);
                            resolve(true);
                          }
                        } catch (e) {}
                      };
                      const onOpen = () => { 
                        sendJoin(); 
                      };
                      signaling.addEventListener('message', onMessage);
                      signaling.addEventListener('open', onOpen);
                      if (signaling.readyState === WebSocket.OPEN) sendJoin();
                      setTimeout(() => {
                        try { signaling.removeEventListener('message', onMessage); } catch (e) {}
                        try { signaling.removeEventListener('open', onOpen); } catch (e) {}
                        resolve(false);
                      }, 8000);
                    });
                    if (gotReady) {
                      try { window.__birddrop_signaling_state = 'ready'; } catch (e) {}
                    }
                    if (onPairSuccess) {
                      onPairSuccess(sid);
                    }
                  } catch (e) {
                    if (onPairSuccess) onPairSuccess(sid);
                  }
                };
                ensureBackgroundJoin(msg.sessionId);
              } catch (e) {}
            } else if (msg.type === 'geo-denied') {
              try { show && show('Pairing request was denied.', { type: 'info', timeout: 4000 }); } catch (e) { try { window.alert('Pairing request was denied.'); } catch (e) {} }
            }
          } catch (e) {
            setError('Geo pairing message error');
          }
        };
        newWs.onerror = (e) => {
          setError('Could not connect to geo pairing server.');
          setStatus('idle');
          if (geoUpdateInterval.current) {
            clearInterval(geoUpdateInterval.current);
            geoUpdateInterval.current = null;
          }
        };
        newWs.onclose = () => {
          if (geoUpdateInterval.current) {
            clearInterval(geoUpdateInterval.current);
            geoUpdateInterval.current = null;
          }
          wsRef.current = null;
          setWsState(null);
        };
        // If already open, send immediately
        if (newWs.readyState === 1) {
          sendLocationUpdate();
          if (geoUpdateInterval.current) clearInterval(geoUpdateInterval.current);
          geoUpdateInterval.current = setInterval(sendLocationUpdate, 5000);
        }
      },
      err => {
        console.error('[PairGeo] Geolocation error:', err.code, err.message);
        let errorMsg = 'Location error: ' + err.message;
        if (err.code === 1) {
          errorMsg = 'Location permission denied. Please enable precise location in app settings.';
        } else if (err.code === 2) {
          errorMsg = 'Location unavailable. Please check your GPS is enabled.';
        } else if (err.code === 3) {
          errorMsg = 'Location request timed out. Please try again.';
        }
        setError(errorMsg);
        setStatus('idle');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleRequest = (toId) => {
    const sock = wsRef.current;
    if (sock && sock.readyState === 1 && myId) {
      sock.send(JSON.stringify({
        type: 'geo-request',
        fromId: myId,
        toId: toId
      }));
    } else {
      setError('Connection lost. Please try Geo Pairing again.');
    }
  };

  const handleStop = () => {
    if (geoUpdateInterval.current) {
      clearInterval(geoUpdateInterval.current);
      geoUpdateInterval.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setWsState(null);
    }
    setStatus('idle');
    setPeers([]);
    setMyName(null);
    setMyId(null);
  };

  return (
    <div className="flex flex-col items-center w-full">
      <button
        className="px-6 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100 rounded-full font-medium text-sm transition-all duration-500 ease-out border border-emerald-400/30 hover:border-emerald-400/50 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 mb-4"
        onClick={handleGeoPair}
        disabled={status === 'locating' || status === 'connecting' || status === 'active'}
      >
        {status === 'idle' && 'Start Discovery'}
        {status === 'locating' && 'Locating...'}
        {status === 'connecting' && 'Connecting...'}
        {status === 'active' && 'Discovering'}
        {status === 'paired' && 'Paired ✓'}
      </button>
      {status === 'active' && (
        <div className="w-full mt-2 p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-white/90 text-sm">Nearby Devices</h4>
            <span className="text-[11px] text-emerald-300 bg-emerald-500/20 px-2 py-1 rounded-full border border-emerald-400/30">Live</span>
          </div>
          <ul className="space-y-2">
            {peers.length === 0 && (
              <li className="text-[13px] text-white/50 font-light py-2">Searching for devices...</li>
            )}
            {peers.map(d => (
              <li key={d.id} className="flex items-center justify-between px-4 py-3 bg-white/5 rounded-full border border-white/10">
                <div>
                  <div className="text-sm font-medium text-white/90">{d.hint}</div>
                  <div className="text-[11px] text-white/50 mt-0.5">{d.distance}m away</div>
                </div>
                <button
                  className="px-4 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100 rounded-full text-[13px] font-medium transition-all duration-300 border border-emerald-400/30 hover:border-emerald-400/50 active:scale-95"
                  onClick={() => handleRequest(d.id)}
                >Request</button>
              </li>
            ))}
            {myName && (
              <li className="px-4 py-3 bg-emerald-500/10 rounded-full border border-emerald-400/20">
                <div className="text-sm font-medium text-emerald-100">{myName} <span className="text-[11px] font-light">(You)</span></div>
              </li>
            )}
          </ul>
          <p className="text-[11px] text-white/40 mt-3 font-light">Updates every 5 seconds</p>
          <div className="mt-3 flex justify-center">
            <button
              className="px-6 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 rounded-full text-[13px] font-medium transition-all duration-300 border border-rose-400/30 hover:border-rose-400/50 active:scale-95"
              onClick={handleStop}
            >Stop Discovery</button>
          </div>
        </div>
      )}
      {error && <div className="text-rose-200 text-[13px] mt-3 bg-rose-500/10 px-4 py-2.5 rounded-xl border border-rose-400/20">{error}</div>}
    </div>
  );
}
