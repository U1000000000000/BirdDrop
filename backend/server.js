const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const http = require('http');

const PORT = process.env.PORT || 8080;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];
const MAX_SESSIONS = 10000;
const SESSION_TIMEOUT = 30 * 60 * 1000;
const GEO_POOL_TIMEOUT = 30000;
const MAX_MESSAGE_SIZE = 1024 * 1024;

const server = http.createServer((req, res) => {
  const origin = req.headers.origin;
  
  if (ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy', 
      sessions: sessions.size,
      geoPool: geoPool.length,
      uptime: process.uptime()
    }));
    return;
  }
  
  res.writeHead(404);
  res.end();
});

const wss = new WebSocket.Server({ 
  server,
  maxPayload: MAX_MESSAGE_SIZE,
  perMessageDeflate: false
});

server.listen(PORT, () => {
  console.log(`✓ WebSocket server running on port ${PORT}`);
  console.log(`✓ Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
  console.log(`✓ Health check: http://localhost:${PORT}/health`);
});

const sessions = new Map();
const geoPool = [];

setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.createdAt > SESSION_TIMEOUT) {
      console.log('Removing stale session:', sessionId);
      session.clients.forEach(client => {
        try {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'session-timeout', message: 'Session expired' }));
            client.close();
          }
        } catch (e) {}
      });
      sessions.delete(sessionId);
    }
  }
  
  for (let i = geoPool.length - 1; i >= 0; i--) {
    if (now - geoPool[i].joinTime > GEO_POOL_TIMEOUT) {
      geoPool.splice(i, 1);
    }
  }
  
  console.log(`Active sessions: ${sessions.size}, Geo pool: ${geoPool.length}`);
}, 60000);

function haversine(lat1, lon1, lat2, lon2) {
  const toRad = x => x * Math.PI / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

const pingInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log('Terminating dead connection');
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(pingInterval);
});

wss.on('connection', (ws, req) => {
  let currentSession = null;
  const remote = req.socket.remoteAddress || 'unknown';
  const clientId = uuidv4();
  
  console.log(`New connection from ${remote} (${clientId})`);
  
  let messageCount = 0;
  let messageResetTime = Date.now();
  const MAX_MESSAGES_PER_SECOND = 50;
  
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (msg) => {
    const now = Date.now();
    if (now - messageResetTime > 1000) {
      messageCount = 0;
      messageResetTime = now;
    }
    messageCount++;
    
    if (messageCount > MAX_MESSAGES_PER_SECOND) {
      console.warn(`Rate limit exceeded for ${clientId}, closing connection`);
      try {
        ws.send(JSON.stringify({ type: 'error', message: 'Rate limit exceeded' }));
        ws.close();
      } catch (e) {}
      return;
    }
    
    if (msg.length > MAX_MESSAGE_SIZE) {
      console.warn(`Message too large from ${clientId}: ${msg.length} bytes`);
      return;
    }
    
    let data;
    try {
      data = JSON.parse(msg);
    } catch (err) {
      console.warn('Failed to parse incoming message as JSON from', clientId);
      return;
    }
    
    if (!data || typeof data.type !== 'string') {
      console.warn('Invalid message format from', clientId);
      return;
    }

    switch (data.type) {
      case 'join':
        if (!data.sessionId || typeof data.sessionId !== 'string' || data.sessionId.length > 100) {
          console.warn('Invalid sessionId from', clientId);
          return;
        }
        
        currentSession = data.sessionId;
        
        if (!sessions.has(currentSession) && sessions.size >= MAX_SESSIONS) {
          console.warn('Max sessions reached, rejecting new session');
          try {
            ws.send(JSON.stringify({ type: 'error', message: 'Server at capacity' }));
            ws.close();
          } catch (e) {}
          return;
        }
        
        if (ws.__currentSession === currentSession) {
          const existingSession = sessions.get(currentSession);
          if (existingSession && existingSession.clients.length === 2) {
            const [firstClient, secondClient] = existingSession.clients;
            if (firstClient && firstClient.readyState === WebSocket.OPEN) {
              try { firstClient.send(JSON.stringify({ type: 'ready', message: 'Both users present. You may begin.', role: 'offerer' })); } catch (e) {}
            }
            if (secondClient && secondClient.readyState === WebSocket.OPEN) {
              try { secondClient.send(JSON.stringify({ type: 'ready', message: 'Both users present. You may begin.', role: 'answerer' })); } catch (e) {}
            }
          }
          break;
        }
        
        if (!sessions.has(currentSession)) {
          sessions.set(currentSession, { clients: [], createdAt: Date.now() });
        }
        
        const joinSession = sessions.get(currentSession);
        const sessionClients = joinSession.clients;
        
        if (sessionClients.includes(ws)) {
          console.log('Duplicate join attempt from same websocket, ignoring');
          break;
        }
        
        if (sessionClients.length >= 2) {
          console.log('Room full for session', currentSession, '- rejecting connection from', clientId);
          try { ws.send(JSON.stringify({ type: 'error', message: 'Room full. Only two users allowed.' })); } catch (e) {}
          setTimeout(() => {
            try { ws.close(); } catch (e) {}
          }, 100);
          return;
        }
        
        sessionClients.push(ws);
        ws.__currentSession = currentSession;
        
        console.log('User', clientId, 'joined session', currentSession, '- total users:', sessionClients.length);
        
        if (sessionClients.length === 1) {
          try { ws.send(JSON.stringify({ type: 'waiting', message: 'Waiting for second user to join.' })); } catch (e) {}
        }
        if (sessionClients.length === 2) {
          console.log('Both users present in session', currentSession, '- sending ready messages');
          const [firstClient, secondClient] = sessionClients;
          try {
            if (firstClient.readyState === WebSocket.OPEN) {
              firstClient.send(JSON.stringify({ type: 'ready', message: 'Both users present. You may begin.', role: 'offerer' }));
            }
          } catch (e) { console.warn('Error sending ready to first client', e); }
          try {
            if (secondClient.readyState === WebSocket.OPEN) {
              secondClient.send(JSON.stringify({ type: 'ready', message: 'Both users present. You may begin.', role: 'answerer' }));
            }
          } catch (e) { console.warn('Error sending ready to second client', e); }
        }
        break;

      case 'geo-join': {
          const { lat, lon, joinTime, userId, hint } = data;
          
          if (typeof lat !== 'number' || typeof lon !== 'number' ||
              lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            console.warn('Invalid coordinates from', clientId);
            return;
          }
          
          if (!userId || typeof userId !== 'string' || userId.length > 100) {
            console.warn('Invalid userId from', clientId);
            return;
          }
          
          if (hint && (typeof hint !== 'string' || hint.length > 100)) {
            console.warn('Invalid hint from', clientId);
            return;
          }
          
          const now = Date.now();
          
          const existingIndex = geoPool.findIndex(p => p.userId === userId);
          if (existingIndex !== -1) {
            geoPool.splice(existingIndex, 1);
          }
          
          if (geoPool.length >= 1000) {
            console.warn('Geo pool at capacity');
            try {
              ws.send(JSON.stringify({ type: 'error', message: 'Service busy, try again' }));
            } catch (e) {}
            return;
          }
          
          geoPool.push({ ws, lat, lon, joinTime: now, userId, hint: hint || 'Unknown Device' });
          
          const peers = geoPool
            .filter(p => 
              p.ws !== ws && 
              !p.ws.__currentSession && 
              haversine(lat, lon, p.lat, p.lon) <= 100
            )
            .map(p => ({ 
              userId: p.userId, 
              hint: p.hint, 
              distance: Math.round(haversine(lat, lon, p.lat, p.lon)), 
              joinTime: p.joinTime 
            }))
            .slice(0, 20);
          
          try {
            ws.send(JSON.stringify({ type: 'geo-peer-list', peers }));
          } catch (e) {}
          break;
      }

      case 'geo-request': {
        const { fromId, toId } = data;
        
        if (!fromId || !toId || typeof fromId !== 'string' || typeof toId !== 'string' ||
            fromId.length > 100 || toId.length > 100) {
          console.warn('Invalid geo-request from', clientId);
          return;
        }
        
        const fromPeer = geoPool.find(p => p.userId === fromId);
        const toPeer = geoPool.find(p => p.userId === toId);
        
        if (fromPeer && toPeer) {
          try {
            const payload = { 
              type: 'geo-connection-request', 
              fromId,
              hint: fromPeer.hint || 'Unknown Device'
            };
            toPeer.ws.send(JSON.stringify(payload));
          } catch (e) { 
            console.warn('geo-request send failed', e); 
          }
        }
        break;
      }

      case 'geo-approve': {
        const { fromId, toId, approved } = data;
        
        if (!fromId || !toId || typeof fromId !== 'string' || typeof toId !== 'string' ||
            fromId.length > 100 || toId.length > 100 || typeof approved !== 'boolean') {
          console.warn('Invalid geo-approve from', clientId);
          return;
        }
        
        const fromPeer = geoPool.find(p => p.userId === fromId);
        const toPeer = geoPool.find(p => p.userId === toId);
        
        if (!fromPeer || !toPeer) {
          console.warn('Peer not found for geo-approve');
          return;
        }
        
        if (approved) {
          if (fromPeer.ws.__currentSession || toPeer.ws.__currentSession) {
            try {
              fromPeer.ws.send(JSON.stringify({ 
                type: 'geo-busy', 
                message: 'Target is already in a session.' 
              }));
            } catch (e) {}
            break;
          }
          
          const fromIdx = geoPool.indexOf(fromPeer);
          const toIdx = geoPool.indexOf(toPeer);
          if (fromIdx !== -1) geoPool.splice(fromIdx, 1);
          if (toIdx !== -1) geoPool.splice(toIdx, 1);
          
          const sessionId = 'session-' + uuidv4().replace(/-/g, '');
          fromPeer.ws.__currentSession = sessionId;
          toPeer.ws.__currentSession = sessionId;
          
          sessions.set(sessionId, { 
            clients: [fromPeer.ws, toPeer.ws], 
            createdAt: Date.now() 
          });
          
          try { 
            fromPeer.ws.send(JSON.stringify({ 
              type: 'geo-match', 
              sessionId, 
              role: 'initiator' 
            })); 
          } catch (e) { console.warn('geo-match send failed to initiator', e); }
          
          try { 
            toPeer.ws.send(JSON.stringify({ 
              type: 'geo-match', 
              sessionId, 
              role: 'receiver' 
            })); 
          } catch (e) { console.warn('geo-match send failed to receiver', e); }
          
          try { 
            fromPeer.ws.send(JSON.stringify({ 
              type: 'ready', 
              message: 'Both users present. You may begin.', 
              role: 'offerer' 
            })); 
          } catch (e) { console.warn('ready send failed to initiator', e); }
          
          try { 
            toPeer.ws.send(JSON.stringify({ 
              type: 'ready', 
              message: 'Both users present. You may begin.', 
              role: 'answerer' 
            })); 
          } catch (e) { console.warn('ready send failed to receiver', e); }
        } else {
          try {
            fromPeer.ws.send(JSON.stringify({ type: 'geo-denied', toId }));
          } catch (e) {}
        }
        break;
      }

      case 'signal':
        if (!data.payload) {
          console.warn('Signal without payload from', clientId);
          return;
        }
        
        const sessionForSignaling = ws.__currentSession || currentSession;
        
        if (!sessionForSignaling) {
          console.warn('Signal attempt without session from', clientId);
          return;
        }
        
        const signalSession = sessions.get(sessionForSignaling);
        if (!signalSession) {
          console.warn('Signal for non-existent session from', clientId);
          return;
        }
        
        const signalClients = signalSession.clients;
        
        if (signalClients.includes(ws) && signalClients.length === 2) {
          signalClients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              try { 
                client.send(JSON.stringify({ 
                  type: 'signal', 
                  payload: data.payload 
                })); 
              } catch (e) { 
                console.warn('signal forward failed', e); 
              }
            }
          });
        } else {
          console.warn('Unauthorized signaling attempt from', clientId);
        }
        break;

      case 'ping':
        try { ws.send(JSON.stringify({ type: 'pong' })); } catch (e) {}
        break;

      default:
        console.warn('Unknown message type:', data.type, 'from', clientId);
    }
  });

  ws.on('close', () => {
    console.log('Connection closed:', clientId, 'session:', ws.__currentSession || currentSession);
    
    const sessionToClose = ws.__currentSession || currentSession;
    
    if (sessionToClose && sessions.has(sessionToClose)) {
      const closeSession = sessions.get(sessionToClose);
      const sessionClients = closeSession.clients;
      
      if (sessionClients.includes(ws)) {
        const newClients = sessionClients.filter(c => c !== ws);
        
        if (newClients.length > 0) {
          newClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              try { 
                client.send(JSON.stringify({ 
                  type: 'session-destroyed', 
                  message: 'Peer left. Session closed.' 
                })); 
              } catch (e) {}
              try { client.close(); } catch (e) {}
            }
          });
        }
        
        sessions.delete(sessionToClose);
        console.log('Session destroyed:', sessionToClose);
      }
    }
    
    const geoIdx = geoPool.findIndex(p => p.ws === ws);
    if (geoIdx !== -1) {
      geoPool.splice(geoIdx, 1);
    }
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error for', clientId, ':', error.message);
  });
});
