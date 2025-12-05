import React, { useRef, useState, useEffect } from 'react';
import FilePreview from './FilePreview.jsx';
import { getWebSocketUrl } from '../utils/websocket.js';

export default function FileShare({ sessionId, onInitWebRTC }) {
    const [isDragActive, setIsDragActive] = useState(false);
  
  if (!window.__birddrop_session_state) {
    window.__birddrop_session_state = {};
  }
  if (!window.__birddrop_session_state[sessionId]) {
    window.__birddrop_session_state[sessionId] = {
      channelStatus: 'connecting',
      receivedFiles: []
    };
  }
  
  const [channelStatus, setChannelStatus] = useState(window.__birddrop_session_state[sessionId].channelStatus);
  const [files, setFiles] = useState([]);
  const [receivedFiles, setReceivedFiles] = useState(window.__birddrop_session_state[sessionId].receivedFiles);
  const [previewFile, setPreviewFile] = useState(null);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__modal_open = previewFile !== null;
    }
  }, [previewFile]);
  
  useEffect(() => {
    const handleCloseModal = () => {
      if (previewFile) {
        setPreviewFile(null);
      }
    };
    
    window.addEventListener('closeModal', handleCloseModal);
    return () => window.removeEventListener('closeModal', handleCloseModal);
  }, [previewFile]);
  
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });
  const [downloadingFiles, setDownloadingFiles] = useState(new Set());
  const fileInputRef = useRef();
  const sendBtnRef = useRef();
  const dataChannelRef = useRef();
  const [sending, setSending] = useState(false);
  const tempServiceTimerRef = useRef(null);
  
  useEffect(() => {
    setReceivedFiles(window.__birddrop_session_state[sessionId].receivedFiles);
    
    const syncInterval = setInterval(() => {
      const globalFiles = window.__birddrop_session_state[sessionId]?.receivedFiles || [];
      setReceivedFiles(prev => {
        if (JSON.stringify(prev.map(f => f.name)) !== JSON.stringify(globalFiles.map(f => f.name))) {
          return globalFiles;
        }
        return prev;
      });
    }, 500);
    
    return () => clearInterval(syncInterval);
  }, [sessionId]);
  
  useEffect(() => {
    window.__birddrop_session_state[sessionId].channelStatus = channelStatus;
  }, [channelStatus, sessionId]);
  
  function log(...args) {
    if (args[0] && (typeof args[0] === 'string') && args[0].includes('error')) {
      console.error('[FileShare]', ...args);
    }
  }

  // WebRTC and DataChannel setup
  useEffect(() => {
    let ws, pc, dataChannel;
    const wsUrl = getWebSocketUrl();
    
    // Try to reuse existing connections for same session
    const existingWs = window.__birddrop_signaling_ws;
    const existingPc = window.__birddrop_peer_connection;
    const existingDc = window.__birddrop_data_channel;
    const existingSession = window.__birddrop_current_session;
    
    // If we have existing connections for the same session and they're still alive, reuse them
    if (existingSession === sessionId && existingWs && existingPc && existingDc &&
        existingWs.readyState === WebSocket.OPEN &&
        existingPc.connectionState === 'connected' &&
        existingDc.readyState === 'open') {
      ws = existingWs;
      pc = existingPc;
      dataChannel = existingDc;
      dataChannelRef.current = dataChannel;
      setChannelStatus('open');
      
      let transfers = window.__birddrop_transfers || {};
      let lastChunkMeta = null;
      let completedTransfers = window.__birddrop_completed_transfers || new Set();
      let expectedTotalFiles = window.__birddrop_expected_total_files || 0;
      
      window.__birddrop_transfers = transfers;
      window.__birddrop_completed_transfers = completedTransfers;
      window.__birddrop_expected_total_files = expectedTotalFiles;
      
      dataChannel.onmessage = (e) => {
        if (typeof e.data === 'string') {
          try {
            const msg = JSON.parse(e.data);
            switch (msg.type) {
              case 'keepalive':
                break;
              case 'transfer_start':
                expectedTotalFiles = msg.totalFiles;
                window.__birddrop_expected_total_files = expectedTotalFiles;
                completedTransfers.clear();
                if (typeof window.Android !== 'undefined' && window.Android.startTransferService) {
                  window.Android.startTransferService();
                }
                break;
              case 'file_meta':
                transfers[msg.transferId] = { name: msg.name, size: msg.size, parts: [], totalChunks: msg.totalChunks };
                dataChannel.send(JSON.stringify({ type: 'ready', transferId: msg.transferId }));
                break;
              case 'chunk_meta':
                lastChunkMeta = msg;
                break;
              case 'file_complete':
                completedTransfers.add(msg.transferId);
                
                if (completedTransfers.size === expectedTotalFiles && expectedTotalFiles > 0) {
                  if (typeof window.Android !== 'undefined' && window.Android.completeTransferService) {
                    window.Android.completeTransferService();
                  }
                  completedTransfers.clear();
                  expectedTotalFiles = 0;
                  window.__birddrop_expected_total_files = 0;
                }
                break;
              default:
            }
          } catch (err) {}
        } else {
          const buffer = e.data;
          if (!lastChunkMeta) return;
          const { transferId, seq } = lastChunkMeta;
          lastChunkMeta = null;
          const t = transfers[transferId];
          if (!t) return;
          t.parts[seq] = buffer;
          dataChannel.send(JSON.stringify({ type: 'ack', transferId, seq }));
          const received = t.parts.filter(Boolean).length;
          if (received === t.totalChunks) {
            const blob = new Blob(t.parts);
            const newFile = { name: t.name || 'download.bin', size: t.size, blob };
            
            // Update global state directly so it persists even if component unmounts
            window.__birddrop_session_state[sessionId].receivedFiles = [
              ...window.__birddrop_session_state[sessionId].receivedFiles,
              newFile
            ];
            
            // Also update React state for immediate UI update
            setReceivedFiles(prev => [...prev, newFile]);
          }
        }
      };
      
      // We're reusing, so skip the connection setup below
      if (onInitWebRTC) onInitWebRTC(dataChannelRef.current);
      
      // Set up keepalive and visibility handlers still needed
      const keepAliveInterval = setInterval(() => {
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 15000);
      
      return () => {
        clearInterval(keepAliveInterval);
        log('Component unmounting - connections preserved');
      };
    }
    
    // Otherwise, set up new connections
    if (existingWs && existingSession !== sessionId) {
      log('Closing existing WebSocket (different session)');
      try {
        existingWs.close();
        if (existingPc) existingPc.close();
      } catch (e) {
        log('Error closing existing connections:', e);
      }
    }
    
    // If we already have a WebSocket for this session that's still connecting or open, wait for it
    if (existingWs && existingSession === sessionId && 
        (existingWs.readyState === WebSocket.CONNECTING || existingWs.readyState === WebSocket.OPEN)) {
      log('WebSocket for this session is already connecting/open, waiting...');
      ws = existingWs;
      pc = existingPc || new window.RTCPeerConnection({ 
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        iceTransportPolicy: 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
      });
      window.__birddrop_peer_connection = pc;
    } else {
      // Create a fresh WebSocket connection
      ws = new window.WebSocket(wsUrl);
      window.__birddrop_signaling_ws = ws;
      window.__birddrop_current_session = sessionId;
      log('Creating new WebSocket connection for file sharing');
      
      // Configure PeerConnection with aggressive settings to maintain connection
      pc = new window.RTCPeerConnection({ 
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        iceTransportPolicy: 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
      });
      
      // Store PeerConnection globally
      window.__birddrop_peer_connection = pc;
    }
    
    let transfers = {};
    let lastChunkMeta = null;
    let ackWaiters = new Map();
    let readySet = new Set();
    let readyWaiters = new Map();
    let completedTransfers = new Set();
    let expectedTotalFiles = 0;

    function setupDataChannelHandlers(dc) {
      dataChannelRef.current = dc;
      
      // Keep DataChannel alive with periodic keepalive messages
      let keepAliveInterval = null;
      
      dc.onopen = () => {
        log('DataChannel open');
        setChannelStatus('open');
        
        // Store DataChannel globally for reuse
        window.__birddrop_data_channel = dc;
        
        // Don't start service yet - wait until actual transfer begins
        
        // Send keepalive messages every 5 seconds to prevent DataChannel timeout
        keepAliveInterval = setInterval(() => {
          try {
            if (dc.readyState === 'open') {
              dc.send(JSON.stringify({ type: 'keepalive', timestamp: Date.now() }));
            }
          } catch (e) {
            console.error('Keepalive send failed', e);
          }
        }, 5000);
      };
      
      dc.onclose = () => {
        log('DataChannel closed');
        setChannelStatus('closed');
        if (keepAliveInterval) clearInterval(keepAliveInterval);
        // Stop foreground service on Android
        if (typeof window.Android !== 'undefined' && window.Android.stopTransferService) {
          window.Android.stopTransferService();
        }
      };
      
      dc.onerror = (err) => {
        log('DataChannel error', err);
        setChannelStatus('error');
        if (keepAliveInterval) clearInterval(keepAliveInterval);
        // Stop foreground service on Android
        if (typeof window.Android !== 'undefined' && window.Android.stopTransferService) {
          window.Android.stopTransferService();
        }
      };
      dc.onmessage = (e) => {
        if (typeof e.data === 'string') {
          try {
            const msg = JSON.parse(e.data);
            switch (msg.type) {
              case 'keepalive':
                // Ignore keepalive messages from peer
                break;
              case 'transfer_start':
                // Sender is starting a new transfer with X files
                expectedTotalFiles = msg.totalFiles;
                completedTransfers.clear();
                console.log(`Transfer starting: expecting ${expectedTotalFiles} files`);
                // Start foreground service when receiving files
                if (typeof window.Android !== 'undefined' && window.Android.startTransferService) {
                  window.Android.startTransferService();
                }
                break;
              case 'file_meta':
                transfers[msg.transferId] = { name: msg.name, size: msg.size, parts: [], totalChunks: msg.totalChunks };
                dc.send(JSON.stringify({ type: 'ready', transferId: msg.transferId }));
                break;
              case 'ready':
                readySet.add(msg.transferId);
                const waiter = readyWaiters.get(msg.transferId);
                if (waiter) {
                  waiter();
                  readyWaiters.delete(msg.transferId);
                }
                break;
              case 'chunk_meta':
                lastChunkMeta = msg;
                break;
              case 'ack':
                const key = `${msg.transferId}:${msg.seq}`;
                const resolver = ackWaiters.get(key);
                if (resolver) {
                  resolver();
                  ackWaiters.delete(key);
                }
                break;
              case 'file_complete':
                completedTransfers.add(msg.transferId);
                console.log(`File ${msg.transferId} complete. ${completedTransfers.size}/${expectedTotalFiles} files received`);
                
                // Check if all files have been received
                if (completedTransfers.size === expectedTotalFiles && expectedTotalFiles > 0) {
                  console.log('All files received, marking transfer as complete');
                  // Mark transfer as complete - show completion notification on Android
                  if (typeof window.Android !== 'undefined' && window.Android.completeTransferService) {
                    window.Android.completeTransferService();
                  }
                  // Reset counters for next transfer
                  completedTransfers.clear();
                  expectedTotalFiles = 0;
                }
                break;
              default:
            }
          } catch (err) {}
        } else {
          const buffer = e.data;
          if (!lastChunkMeta) return;
          const { transferId, seq } = lastChunkMeta;
          lastChunkMeta = null;
          const t = transfers[transferId];
          if (!t) return;
          t.parts[seq] = buffer;
          dc.send(JSON.stringify({ type: 'ack', transferId, seq }));
          const received = t.parts.filter(Boolean).length;
          if (received === t.totalChunks) {
            const blob = new Blob(t.parts);
            const newFile = { name: t.name || 'download.bin', size: t.size, blob };
            
            // Update global state directly so it persists even if component unmounts
            window.__birddrop_session_state[sessionId].receivedFiles = [
              ...window.__birddrop_session_state[sessionId].receivedFiles,
              newFile
            ];
            
            // Also update React state for immediate UI update
            setReceivedFiles(prev => [...prev, newFile]);
          }
        }
      };
    }

    let myRole = null; // Will be set by server: 'offerer' or 'answerer'
    pc.ondatachannel = (event) => {
      setupDataChannelHandlers(event.channel);
    };
    
    // Only create data channel if this peer is the offerer
    function createOffererDataChannel() {
      try {
        const localDC = pc.createDataChannel('files');
      setupDataChannelHandlers(localDC);
    } catch (err) {
      log('Error creating local data channel', err);
    }
  }
  
  const wsQueue = [];    function sendWhenOpen(msg) {
      if (ws.readyState === 1) {
        ws.send(msg);
      } else {
        wsQueue.push(msg);
      }
    }
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendWhenOpen(JSON.stringify({ type: 'signal', payload: { candidate: event.candidate } }));
      }
    };
    
    let webrtcStarted = false;
    let roomFullRetries = 0;
    const MAX_ROOM_FULL_RETRIES = 3;
    
    // Set up message handler BEFORE sending join or checking if already open
    ws.onmessage = async (msg) => {
      const data = JSON.parse(msg.data);
      
      if (data.type === 'error' && data.message === 'Room full. Only two users allowed.') {
        log('Room full error, attempt', roomFullRetries + 1);
        
        // Retry with exponential backoff (500ms, 1000ms, 1500ms)
        if (roomFullRetries < MAX_ROOM_FULL_RETRIES) {
          roomFullRetries++;
          const delay = 500 * roomFullRetries;
          log(`Retrying join in ${delay}ms...`);
          
          setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
              log('Retrying join after room full error');
              ws.send(JSON.stringify({ type: 'join', sessionId }));
            }
          }, delay);
          return;
        }
        
        // Max retries reached
        log('Room full error - max retries reached');
        setChannelStatus('error');
        ws.close();
        return;
      }
      
      if (data.type === 'waiting') {
        log('Waiting for second user to join...');
      }
      
      if (data.type === 'ready' && !webrtcStarted) {
        webrtcStarted = true;
        // Use role from server
        myRole = data.role || 'offerer'; // Fallback to offerer if role not specified
        log('Received ready message with role:', myRole);
        
        if (myRole === 'offerer') {
          log('Both users present, starting WebRTC offer (this peer is offerer)');
          createOffererDataChannel();
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendWhenOpen(JSON.stringify({ type: 'signal', payload: pc.localDescription }));
        } else {
          log('Both users present, waiting for offer (this peer is answerer)');
        }
      }
      
      if (data.type === 'signal') {
        const payload = data.payload;
        if (payload.sdp) {
          // Handle SDP offer or answer
          if (payload.type === 'offer') {
            // This peer is the answerer
            log('Received offer, creating answer');
            await pc.setRemoteDescription(payload);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendWhenOpen(JSON.stringify({ type: 'signal', payload: pc.localDescription }));
          } else if (payload.type === 'answer') {
            // This peer is the offerer receiving the answer
            log('Received answer, setting remote description');
            await pc.setRemoteDescription(payload);
          }
        } else if (payload.candidate) {
          try {
            await pc.addIceCandidate(payload.candidate);
          } catch (err) {
            log('Error adding ICE candidate', err);
          }
        }
      }
    };
    
    // Now handle WebSocket open/ready states
    ws.onopen = () => {
      log('WebSocket connected, joining session:', sessionId);
      sendWhenOpen(JSON.stringify({ type: 'join', sessionId }));
      // Flush any queued messages
      while (wsQueue.length) {
        const m = wsQueue.shift();
        ws.send(m);
      }
    };
    
    // If WebSocket is already open, send join immediately
    if (ws.readyState === 1) {
      log('WebSocket already open, joining session immediately:', sessionId);
      ws.send(JSON.stringify({ type: 'join', sessionId }));
    }
    
    if (onInitWebRTC) onInitWebRTC(dataChannelRef.current);
    
    // Keep WebSocket alive when app is in background
    const keepAliveInterval = setInterval(() => {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 15000); // Send ping every 15 seconds
    
    // Handle visibility change to detect when app comes back from background
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // App returned to foreground
        log('App visible again');
        // Check if WebSocket is still connected
        if (ws.readyState !== 1) {
          log('WebSocket disconnected while in background. Reconnecting...');
          // WebSocket closed while in background, need to reconnect
          const newWs = new window.WebSocket(wsUrl);
          window.__birddrop_signaling_ws = newWs;
          
          newWs.onopen = () => {
            log('Reconnected, rejoining session');
            newWs.send(JSON.stringify({ type: 'join', sessionId }));
          };
          
          newWs.onmessage = ws.onmessage;
          newWs.onclose = ws.onclose;
          ws = newWs;
        }
      } else {
        // App went to background - acquire wake lock if possible
        log('App went to background, attempting to maintain connection');
        if ('wakeLock' in navigator) {
          navigator.wakeLock.request('screen').catch(err => {
            log('Wake lock failed', err);
          });
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also handle focus event for when returning from file picker
    const handleFocus = () => {
      log('Window focused, checking connection status');
      // Check if DataChannel is still open
      if (dataChannelRef.current && dataChannelRef.current.readyState !== 'open') {
        log('DataChannel closed, attempting to maintain session');
        // WebSocket might still be open, try to rejoin
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({ type: 'join', sessionId }));
        }
      }
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearInterval(keepAliveInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      
      // Clear temp service timer
      if (tempServiceTimerRef.current) {
        clearTimeout(tempServiceTimerRef.current);
      }
      
      log('Component unmounting - connections preserved for navigation');
      
      // Don't close WebSocket or PeerConnection on unmount
      // They'll stay alive for navigation within the app
      // Only truly close on page unload (handled by browser)
    };
  }, [sessionId, onInitWebRTC]);

  // Disable background scroll when preview modal is open (browser only)
  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (previewFile) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [previewFile]);

  // Status badge component
  const getStatusBadge = () => {
    if (channelStatus === 'open') {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-400/20 text-green-100 rounded-full text-xs font-semibold backdrop-blur-md border border-white/20 shadow-sm" style={{boxShadow:'0 2px 8px 0 rgba(60, 255, 120, 0.10)'}}>
          <div className="w-1.5 h-1.5 bg-white/90 rounded-full animate-pulse"></div>
          <span className="tracking-wide" style={{textShadow:'0 1px 2px rgba(0,0,0,0.10)'}}>Connected</span>
        </div>
      );
    }
    if (channelStatus === 'connecting') {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-300/20 text-yellow-100 rounded-full text-xs font-semibold backdrop-blur-md border border-white/20 shadow-sm" style={{boxShadow:'0 2px 8px 0 rgba(255, 220, 60, 0.10)'}}>
          <div className="w-1.5 h-1.5 bg-yellow-200 rounded-full animate-pulse"></div>
          <span className="tracking-wide" style={{textShadow:'0 1px 2px rgba(0,0,0,0.10)'}}>Connecting...</span>
        </div>
      );
    }
    if (channelStatus === 'error' || channelStatus === 'closed') {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-400/20 text-red-100 rounded-full text-xs font-semibold backdrop-blur-md border border-white/20 shadow-sm" style={{boxShadow:'0 2px 8px 0 rgba(255, 60, 60, 0.10)'}}>
          <div className="w-1.5 h-1.5 bg-red-200 rounded-full"></div>
          <span className="tracking-wide" style={{textShadow:'0 1px 2px rgba(0,0,0,0.10)'}}>Disconnected</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-3">
      {/* Connection Status Card */}
      <div className="w-full bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 overflow-hidden">
        <div className="w-full p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-200" viewBox="0 0 24 24" fill="currentColor" style={{transform: 'rotate(-90deg)'}} xmlns="http://www.w3.org/2000/svg">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </div>
              <div>
                <div className="text-[17px] font-semibold text-white/95 mb-0.5">Connection Status</div>
                <div className="text-[15px] text-white/50 font-normal">Peer-to-peer transfer</div>
              </div>
            </div>
            {getStatusBadge()}
          </div>
        </div>
      </div>

      {/* Send Files Card */}
      <div className="w-full bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 overflow-hidden">
        <div className="w-full p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-200" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13H5.5z" />
              </svg>
            </div>
            <div>
              <div className="text-[17px] font-semibold text-white/95 mb-0.5">Send Files</div>
              <div className="text-[15px] text-white/50 font-normal">Choose files to transfer</div>
            </div>
          </div>
          {/* Custom File Input */}
          <div className="relative">
            <input
              type="file"
              multiple
              ref={fileInputRef}
              onClick={() => {
                // Start service silently to keep connection alive during file selection
                if (typeof window.Android !== 'undefined' && window.Android.startTransferServiceSilent) {
                  window.Android.startTransferServiceSilent();
                  
                  // Set a timer to stop service if user takes too long or cancels
                  if (tempServiceTimerRef.current) {
                    clearTimeout(tempServiceTimerRef.current);
                  }
                  tempServiceTimerRef.current = setTimeout(() => {
                    // If no files were added after 5 minutes, stop the service
                    if (files.length === 0 && typeof window.Android !== 'undefined' && window.Android.stopTransferService) {
                      window.Android.stopTransferService();
                    }
                  }, 5 * 60 * 1000); // 5 minutes timeout
                }
              }}
              onChange={e => {
                // Clear the timeout since user selected files
                if (tempServiceTimerRef.current) {
                  clearTimeout(tempServiceTimerRef.current);
                }
                
                const selectedFiles = Array.from(e.target.files);
                
                // Add new files to existing ones (don't replace)
                setFiles(prevFiles => {
                  const prevNames = new Set(prevFiles.map(f => f.name + f.size + f.lastModified));
                  const newFiles = selectedFiles.filter(f => !prevNames.has(f.name + f.size + f.lastModified));
                  return [...prevFiles, ...newFiles];
                });
                
                // Reset input value to allow selecting the same files again
                if (fileInputRef.current) fileInputRef.current.value = '';
                
                // If user cancelled (no files), stop service immediately
                if (selectedFiles.length === 0) {
                  if (typeof window.Android !== 'undefined' && window.Android.stopTransferService) {
                    window.Android.stopTransferService();
                  }
                }
              }}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className={`flex flex-col items-center justify-center w-full py-12 border-2 border-dashed rounded-2xl cursor-pointer bg-white/5 backdrop-blur-lg transition-all duration-300 ${isDragActive ? 'border-emerald-400/80 bg-white/10' : 'border-white/30 hover:border-white/50'}`}
              style={{ minHeight: '220px' }}
              onDragOver={e => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragActive(true);
              }}
              onDragLeave={e => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragActive(false);
              }}
              onDrop={e => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragActive(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  setFiles(prevFiles => {
                    const prevNames = new Set(prevFiles.map(f => f.name + f.size + f.lastModified));
                    const newFiles = Array.from(e.dataTransfer.files).filter(f => !prevNames.has(f.name + f.size + f.lastModified));
                    return [...prevFiles, ...newFiles];
                  });
                }
              }}
            >
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-xl bg-white/15 flex items-center justify-center mb-4 shadow-md backdrop-blur-md">
                  <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none">
                    <line x1="12" y1="6.5" x2="12" y2="17.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="6.5" y1="12" x2="17.5" y2="12" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <span className="font-semibold text-white/95 text-lg">Click to browse files</span>
                <span className="text-white/60 text-base mt-1">or drag and drop here</span>
              </div>
            </label>
          </div>

          {/* Selected Files */}
          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-emerald-200" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-medium text-white/95 truncate">{file.name}</p>
                      <p className="text-[13px] text-white/50">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                    className="ml-2 p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4 text-white/60 hover:text-white/90" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Send Button */}
          <button
            ref={sendBtnRef}
            onClick={async () => {
              if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') return;
              
              // Clear any temporary service timer
              if (tempServiceTimerRef.current) {
                clearTimeout(tempServiceTimerRef.current);
              }
              
              // Start foreground service when transfer begins (will keep existing service running)
              if (typeof window.Android !== 'undefined' && window.Android.startTransferService) {
                window.Android.startTransferService();
              }
              
              setSending(true);
              const dc = dataChannelRef.current;
              const chunkSize = 64 * 1024;
              const maxBufferedAmount = 8 * 1024 * 1024; // 8MB
              
              // Notify receiver about total file count
              dc.send(JSON.stringify({ type: 'transfer_start', totalFiles: files.length }));
              
              for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const transferId = 't-' + Math.floor(Math.random() * 1e9);
                const totalChunks = Math.ceil(file.size / chunkSize);
                dc.send(JSON.stringify({ type: 'file_meta', transferId, name: file.name, size: file.size, totalChunks }));
                await new Promise((resolve, reject) => {
                  if (dc.readyState !== 'open') return reject();
                  resolve();
                });
                for (let seq = 0; seq < totalChunks; seq++) {
                  const start = seq * chunkSize;
                  const end = Math.min(file.size, start + chunkSize);
                  const blobSlice = file.slice(start, end);
                  const buffer = await blobSlice.arrayBuffer();
                  // Wait if buffer is too full
                  if (dc.bufferedAmount > maxBufferedAmount) {
                    await new Promise(resume => {
                      const handler = () => {
                        if (dc.bufferedAmount <= maxBufferedAmount / 2) {
                          dc.removeEventListener('bufferedamountlow', handler);
                          resume();
                        }
                      };
                      dc.addEventListener('bufferedamountlow', handler);
                    });
                  }
                  dc.send(JSON.stringify({ type: 'chunk_meta', transferId, seq, len: buffer.byteLength }));
                  dc.send(buffer);
                }
                dc.send(JSON.stringify({ type: 'file_complete', transferId }));
              }
              setSending(false);
              setFiles([]);
              
              // Mark transfer as complete - show completion notification
              if (typeof window.Android !== 'undefined' && window.Android.completeTransferService) {
                window.Android.completeTransferService();
              }
            }}
            disabled={channelStatus !== 'open' || sending || files.length === 0}
            className={`w-full mt-4 px-6 py-3 rounded-2xl font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 ${
              channelStatus !== 'open' || sending || files.length === 0
                ? 'bg-white/10 cursor-not-allowed text-white/40'
                : 'bg-emerald-500/90 hover:bg-emerald-500 shadow-lg hover:shadow-xl backdrop-blur-sm'
            }`}
          >
            {sending ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Sending...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
                <span>Send Files</span>
              </>
            )}
          </button>

          {channelStatus !== 'open' && (
            <p className="mt-2 text-xs text-center text-white/50">
              {channelStatus === 'connecting' ? 'Waiting for connection...' : 'Please pair with a device to start sharing'}
            </p>
          )}
        </div>
      </div>

      {/* Received Files Card */}
      <div className="w-full bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 overflow-hidden">
        <div className="w-full p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-200" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <div className="text-[17px] font-semibold text-white/95 mb-0.5">Received Files</div>
              <div className="text-[15px] text-white/50 font-normal">Files from peer device</div>
            </div>
          </div>
        
        {receivedFiles.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            </div>
            <p className="text-white/90 font-medium text-[15px]">No files yet</p>
            <p className="text-white/50 text-[13px] mt-1">Files will appear here when received</p>
          </div>
        ) : (
          <>
            <button
              onClick={async () => {
                if (typeof document === 'undefined' || isDownloadingAll) return;
                
                const isAndroid = typeof window.Android !== 'undefined' && window.Android.downloadFile;
                setIsDownloadingAll(true);
                setDownloadProgress({ current: 0, total: receivedFiles.length });
                
                // Process files sequentially with delays to prevent memory overload
                for (let i = 0; i < receivedFiles.length; i++) {
                  const f = receivedFiles[i];
                  const extMatch = f.name.match(/(\.[^.]+)$/);
                  const ext = extMatch ? extMatch[1] : '';
                  const base = f.name.replace(/(\.[^.]+)$/, '');
                  const uniqueName = `${base}_${Date.now()}${ext}`;
                  
                  setDownloadProgress({ current: i + 1, total: receivedFiles.length });
                  
                  if (isAndroid) {
                    // For large files (>50MB), use chunked transfer
                    const sizeMB = f.size / 1024 / 1024;
                    
                    if (sizeMB > 50) {
                      // Chunked transfer for large files - larger chunks = fewer calls = faster
                      const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks (was 512KB)
                      const downloadId = `download_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                      const mimeType = f.blob.type || 'application/octet-stream';
                      
                      // Initialize download
                      const initialized = window.Android.initDownload(downloadId, uniqueName, mimeType);
                      if (!initialized) {
                        console.error('Failed to initialize download:', f.name);
                        continue;
                      }
                      
                      // Process file in chunks - no delays for max speed
                      let offset = 0;
                      while (offset < f.blob.size) {
                        const chunk = f.blob.slice(offset, offset + CHUNK_SIZE);
                        
                        await new Promise((resolve, reject) => {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const base64chunk = reader.result.split(',')[1];
                            const success = window.Android.appendChunk(downloadId, base64chunk);
                            if (success) {
                              resolve();
                            } else {
                              reject(new Error('Failed to append chunk'));
                            }
                          };
                          reader.onerror = () => reject(new Error('Failed to read chunk'));
                          reader.readAsDataURL(chunk);
                        }).catch(err => {
                          console.error('Chunk transfer failed:', err);
                          window.Android.cancelDownload(downloadId);
                          throw err;
                        });
                        
                        offset += CHUNK_SIZE;
                        // No delay - send chunks as fast as possible
                      }
                      
                      // Finalize download
                      window.Android.finalizeDownload(downloadId, uniqueName, mimeType);
                      await new Promise(resolve => setTimeout(resolve, 300));
                    } else {
                      // Small files - use original method
                      await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          const base64data = reader.result.split(',')[1];
                          const mimeType = f.blob.type || 'application/octet-stream';
                          window.Android.downloadFile(base64data, uniqueName, mimeType);
                          setTimeout(resolve, 800);
                        };
                        reader.onerror = () => {
                          console.error('Failed to read file:', f.name);
                          setTimeout(resolve, 500);
                        };
                        reader.readAsDataURL(f.blob);
                      });
                    }
                  } else {
                    // Browser download
                    const url = URL.createObjectURL(f.blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = uniqueName;
                    a.target = '_blank';
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(() => {
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }, 100);
                    // Small delay between browser downloads
                    await new Promise(resolve => setTimeout(resolve, 100));
                  }
                }
                
                setIsDownloadingAll(false);
                setDownloadProgress({ current: 0, total: 0 });
              }}
              disabled={isDownloadingAll}
              className={`w-full mb-4 px-6 py-3 ${
                isDownloadingAll 
                  ? 'bg-gray-500 cursor-not-allowed' 
                  : 'bg-emerald-500/90 hover:bg-emerald-500'
              } text-white rounded-full font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl`}
              title={isDownloadingAll ? "Downloading..." : "Download all files"}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              {isDownloadingAll ? (
                <span>Downloading {downloadProgress.current}/{downloadProgress.total}...</span>
              ) : (
                <span>Download All ({receivedFiles.length})</span>
              )}
            </button>
            <div className="space-y-3">
              {receivedFiles.map((f, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 cursor-pointer hover:bg-white/10 hover:scale-[1.02] hover:shadow-lg transition-all duration-200 group"
                  onClick={() => setPreviewFile(f)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-emerald-200" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/95 font-medium text-[15px] truncate">{f.name}</p>
                      <p className="text-white/50 text-[13px]">{(f.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const updatedFiles = receivedFiles.filter((_, i) => i !== idx);
                        setReceivedFiles(updatedFiles);
                        // Update global state to prevent file from coming back
                        window.__birddrop_session_state[sessionId].receivedFiles = updatedFiles;
                      }}
                      className="w-9 h-9 flex items-center justify-center hover:bg-red-500/20 text-white/60 hover:text-red-300 rounded-full transition-all duration-200"
                      title="Remove file"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (typeof document === 'undefined') return;
                      
                      const fileId = `${f.name}_${idx}`;
                      
                      // Prevent double-clicks
                      if (downloadingFiles.has(fileId)) return;
                      
                      setDownloadingFiles(prev => new Set(prev).add(fileId));
                      
                      try {
                        const extMatch = f.name.match(/(\.[^.]+)$/);
                        const ext = extMatch ? extMatch[1] : '';
                        const base = f.name.replace(/(\.[^.]+)$/, '');
                        const uniqueName = `${base}_${Date.now()}${ext}`;
                        
                        // Check if Android bridge is available
                        if (typeof window.Android !== 'undefined' && window.Android.downloadFile) {
                          const sizeMB = f.size / 1024 / 1024;
                        
                        if (sizeMB > 50) {
                          // Chunked transfer for large files - 2MB chunks for speed
                          const CHUNK_SIZE = 2 * 1024 * 1024;
                          const downloadId = `download_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                          const mimeType = f.blob.type || 'application/octet-stream';
                          
                          const initialized = window.Android.initDownload(downloadId, uniqueName, mimeType);
                          if (!initialized) {
                            console.error('Failed to initialize download:', f.name);
                            return;
                          }
                          
                          let offset = 0;
                          while (offset < f.blob.size) {
                            const chunk = f.blob.slice(offset, offset + CHUNK_SIZE);
                            
                            await new Promise((resolve, reject) => {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                const base64chunk = reader.result.split(',')[1];
                                const success = window.Android.appendChunk(downloadId, base64chunk);
                                if (success) {
                                  resolve();
                                } else {
                                  reject(new Error('Failed to append chunk'));
                                }
                              };
                              reader.onerror = () => reject(new Error('Failed to read chunk'));
                              reader.readAsDataURL(chunk);
                            }).catch(err => {
                              console.error('Chunk transfer failed:', err);
                              window.Android.cancelDownload(downloadId);
                              throw err;
                            });
                            
                            offset += CHUNK_SIZE;
                          }
                          
                          window.Android.finalizeDownload(downloadId, uniqueName, mimeType);
                          addToast(`Downloaded: ${f.name}`, 'success');
                        } else {
                          // Small files - use original method
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const base64data = reader.result.split(',')[1];
                            const mimeType = f.blob.type || 'application/octet-stream';
                            window.Android.downloadFile(base64data, uniqueName, mimeType);
                            addToast(`Downloaded: ${f.name}`, 'success');
                          };
                          reader.readAsDataURL(f.blob);
                        }
                      } else {
                        // Browser download
                        const url = URL.createObjectURL(f.blob);
                        const a = document.createElement('a');
                        a.style.display = 'none';
                        a.href = url;
                        a.download = uniqueName;
                        a.target = '_blank';
                        document.body.appendChild(a);
                        a.click();
                        setTimeout(() => {
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }, 500);
                        addToast(`Downloaded: ${f.name}`, 'success');
                      }
                      } finally {
                        setDownloadingFiles(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(fileId);
                          return newSet;
                        });
                      }
                    }}
                    disabled={downloadingFiles.has(`${f.name}_${idx}`)}
                    className="w-9 h-9 sm:w-auto sm:h-auto sm:px-4 sm:py-2 bg-emerald-500/80 hover:bg-emerald-500 text-white rounded-full font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Download file"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    <span className="hidden sm:inline">Download</span>
                  </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        </div>
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreview
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          onDownload={async () => {
            if (typeof document === 'undefined') return;
            
            const fileId = `preview_${previewFile.name}`;
            
            // Prevent double-clicks
            if (downloadingFiles.has(fileId)) return;
            
            setDownloadingFiles(prev => new Set(prev).add(fileId));
            
            try {
              const isAndroid = typeof window.Android !== 'undefined' && window.Android.downloadFile;
              const extMatch = previewFile.name.match(/(\.[^.]+)$/);
              const ext = extMatch ? extMatch[1] : '';
              const base = previewFile.name.replace(/(\.[^.]+)$/, '');
              const uniqueName = `${base}_${Date.now()}${ext}`;
              
              if (isAndroid) {
                const sizeMB = previewFile.size / 1024 / 1024;
                
                if (sizeMB > 50) {
                  // Chunked transfer for large files - 2MB chunks for speed
                  const CHUNK_SIZE = 2 * 1024 * 1024;
                  const downloadId = `download_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                  const mimeType = previewFile.blob.type || 'application/octet-stream';
                  
                  const initialized = window.Android.initDownload(downloadId, uniqueName, mimeType);
                  if (!initialized) {
                    console.error('Failed to initialize download:', previewFile.name);
                    return;
                  }
                  
                  let offset = 0;
                  while (offset < previewFile.blob.size) {
                    const chunk = previewFile.blob.slice(offset, offset + CHUNK_SIZE);
                    
                    await new Promise((resolve, reject) => {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const base64chunk = reader.result.split(',')[1];
                        const success = window.Android.appendChunk(downloadId, base64chunk);
                        if (success) {
                          resolve();
                        } else {
                          reject(new Error('Failed to append chunk'));
                        }
                      };
                      reader.onerror = () => reject(new Error('Failed to read chunk'));
                      reader.readAsDataURL(chunk);
                    }).catch(err => {
                      console.error('Chunk transfer failed:', err);
                      window.Android.cancelDownload(downloadId);
                      throw err;
                    });
                    
                    offset += CHUNK_SIZE;
                  }
                  
                  window.Android.finalizeDownload(downloadId, uniqueName, mimeType);
                  addToast(`Downloaded: ${previewFile.name}`, 'success');
                } else {
                  // Small files - use original method
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const base64data = reader.result.split(',')[1];
                    const mimeType = previewFile.blob.type || 'application/octet-stream';
                    window.Android.downloadFile(base64data, uniqueName, mimeType);
                    addToast(`Downloaded: ${previewFile.name}`, 'success');
                  };
                  reader.readAsDataURL(previewFile.blob);
                }
              } else {
                // Browser download
                const url = URL.createObjectURL(previewFile.blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = uniqueName;
                a.target = '_blank';
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }, 500);
                addToast(`Downloaded: ${previewFile.name}`, 'success');
              }
            } finally {
              setDownloadingFiles(prev => {
                const newSet = new Set(prev);
                newSet.delete(fileId);
                return newSet;
              });
            }
          }}
          isDownloading={downloadingFiles.has(`preview_${previewFile.name}`)}
        />
      )}
    </div>
  );
}
