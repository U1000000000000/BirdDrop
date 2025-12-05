import React, { useEffect, useRef, useState, useCallback } from 'react';

export default function PairQR({ sessionId, onPairSuccess }) {
  const qrRef = useRef(null);
  const videoRef = useRef(null);
  const scanCanvasRef = useRef(null);
  const scannerAnimRef = useRef(null);
  const streamRef = useRef(null);
  const scanningRef = useRef(false);
  const [scanning, setScanning] = useState(false);
  const [viewMode, setViewMode] = useState('qr'); // 'qr' | 'scan'

  // scanner guide sizing (in px) relative to the 200×200 preview area
  const GUIDE_PREVIEW_SIZE = 200;
  const GUIDE_BOX_SIZE = 120; // inner guide box (smaller box the user should align QR to)
  const GUIDE_INSET = Math.round((GUIDE_PREVIEW_SIZE - GUIDE_BOX_SIZE) / 2); // distance from outer edge

  // mode switches back to 'qr'. This ensures that when a user toggles from
  // scanner back to QR the canvas is repopulated.
  useEffect(() => {
    let cancelled = false;
    const drawQR = async () => {
      if (!qrRef.current || !sessionId || viewMode !== 'qr') return;
      const QRCode = (await import('qrcode')).default || (await import('qrcode'));
      // Encode the full share URL in the QR so scanning immediately opens the share page
      const shareUrl = `${window.location.origin}/share?session=${encodeURIComponent(sessionId)}`;
      const canvas = qrRef.current;
      const size = 260; // use a slightly larger canvas for crispness
      canvas.width = size;
      canvas.height = size;
      canvas.style.width = '200px';
      canvas.style.height = '200px';

      // offscreen canvas for QR modules (transparent background)
      const off = document.createElement('canvas');
      off.width = size;
      off.height = size;

      try {
        await QRCode.toCanvas(off, shareUrl, {
          width: size,
          margin: 4,
          color: { dark: '#000000', light: '#FFFFFF' },
          errorCorrectionLevel: 'H'
        });
      } catch (e) {
        if (cancelled) return;
        return;
      }

      if (cancelled) return;

      const ctx = canvas.getContext('2d');
      // create a mask canvas where dark pixels from `off` are copied and
      // light pixels become transparent. This ensures only QR modules are
      // drawn over the background, avoiding opaque white backgrounds.
      const offCtx = off.getContext('2d');
      const mask = document.createElement('canvas');
      mask.width = size;
      mask.height = size;
      const maskCtx = mask.getContext('2d');
      try {
        const imgData = offCtx.getImageData(0, 0, size, size);
        const d = imgData.data;
        const out = maskCtx.createImageData(size, size);
        const od = out.data;
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2];
          const avg = (r + g + b) / 3;
          if (avg < 200) {
            od[i] = 0; od[i + 1] = 0; od[i + 2] = 0; od[i + 3] = 255;
          } else {
            od[i] = 0; od[i + 1] = 0; od[i + 2] = 0; od[i + 3] = 0;
          }
        }
        maskCtx.putImageData(out, 0, 0);
      } catch (e) {
        // pixel manipulation failed; we'll fall back to drawing the raw QR
      }

      // draw an outer rounded border (filled) and an inset rounded inner
      // area filled with the lavender background. This prevents QR
      // modules from leaking past the rounded corners regardless of
      // anti-aliasing or mask edge pixels.
      const cornerRadius = Math.max(8, Math.floor(size * 0.04));
      const strokeWidth = Math.max(6, Math.floor(size * 0.06));
      const inset = Math.floor(strokeWidth / 2);

      ctx.save();
      roundRect(ctx, 0, 0, size, size, cornerRadius, true, false);
      ctx.fillStyle = '#32012F';
      ctx.fill();
      ctx.restore();

      const innerSize = size - inset * 2;
      const innerCorner = Math.max(4, cornerRadius - inset);
      ctx.save();
      roundRect(ctx, inset, inset, innerSize, innerSize, innerCorner, true, false);
      ctx.fillStyle = '#F3E6FA';
      ctx.fill();
      ctx.restore();

      if (mask && mask.getContext) {
        ctx.drawImage(mask, 0, 0, size, size, inset, inset, innerSize, innerSize);
      } else {
        ctx.drawImage(off, 0, 0, size, size, inset, inset, innerSize, innerSize);
      }

      // overlay logo
      const img = new Image();
      // Inline SVG logo as data URI to work in production
      img.src = 'data:image/svg+xml;base64,' + btoa(`<svg width="154" height="147" viewBox="0 0 154 147" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="birdGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F7C9A8"/>
      <stop offset="40%" stop-color="#D27BFF"/>
      <stop offset="100%" stop-color="#E3A1C3"/>
    </linearGradient>
  </defs>
  <path d="M48.127 27.6957C47.5106 28.6058 46.9656 29.5499 46.4206 30.4939C29.7403 59.3849 31.774 104.947 70.617 127.373C82.5841 134.282 95.7721 137.115 108.724 136.288C106.909 135.508 105.232 134.633 103.464 133.613C93.5898 127.912 86.4941 119.214 82.6297 109.134C92.0329 114.296 103.449 112.495 111.133 105.386C109.711 104.833 108.322 104.212 106.948 103.418C105.055 102.325 103.308 100.955 101.813 99.4627C112.671 103.026 125.001 98.4181 131.134 87.7949L131.291 87.5236C127.538 87.52 123.685 86.6483 120.146 84.7857C128.097 84.1535 135.695 79.6056 140.071 72.0261C142.414 67.9678 143.519 63.6434 143.562 59.3422C125.51 66.593 104.875 66.232 86.8012 57.063C88.066 55.623 89.2395 54.0508 90.2168 52.358C97.1708 40.3133 93.4159 25.0662 81.7111 18.3084C75.6279 14.7963 68.615 14.2631 62.2932 16.2992C58.0693 12.5946 54.552 8.12601 51.9372 3.28141C50.5763 9.25957 51.4547 15.4527 54.2705 20.6881C50.2931 17.7552 46.8729 14.1602 44.064 10.2814C44.4381 16.2702 45.8032 22.2017 48.127 27.6957Z" fill="url(#birdGradient)"/>
  <ellipse cx="38.0462" cy="117.888" rx="8.48648" ry="5.44344" transform="rotate(-70 38.0462 117.888)" fill="white"/>
  <circle cx="35.2611" cy="130.388" r="2.5" fill="white"/>
</svg>`);
      img.onload = () => {
        try {
          const logoSize = Math.floor(size * 0.34);
          const x = Math.floor((size - logoSize) / 2);
          const y = Math.floor((size - logoSize) / 2);
          const ringWidth = 4;
          const outerRadius = Math.floor(logoSize / 2 + ringWidth);
          const innerRadius = Math.floor(logoSize / 2);
          const cx = x + Math.floor(logoSize / 2);
          const cy = y + Math.floor(logoSize / 2);
          ctx.beginPath();
          ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
          ctx.fillStyle = '#32012F';
          ctx.fill();
          ctx.drawImage(img, x, y, logoSize, logoSize);
        } catch (err) {}
      };

      // final stroked border
      try {
        const strokeWidth2 = Math.max(6, Math.floor(size * 0.06));
        const inset2 = Math.floor(strokeWidth2 / 2);
        const borderCorner = Math.max(4, cornerRadius - inset2);
        ctx.save();
        ctx.lineWidth = strokeWidth2;
        ctx.strokeStyle = '#32012F';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        roundRect(ctx, inset2, inset2, size - inset2 * 2, size - inset2 * 2, borderCorner, false, true);
        ctx.restore();
      } catch (e) {}
    };

    drawQR();

    return () => { cancelled = true; };
  }, [sessionId, viewMode]);

  // cleanup scanner on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const handleFoundSession = useCallback((session) => {
    if (!session) return;
    try { window.__birddrop_pending_session = session; } catch (e) {}
    
    (async () => {
      stopScanner();
      
      // Just ensure WebSocket exists and is connected, but DON'T join yet
      // Let FileShare handle the join when it mounts
      let ws = window.__birddrop_signaling_ws;
      if (!ws || ws.readyState === 3) {
        try {
          const wsUrl = getWebSocketUrl();
          ws = new WebSocket(wsUrl);
          window.__birddrop_signaling_ws = ws;
          // wait for open
          await new Promise((res, rej) => {
            const onOpen = () => { res(); cleanup(); };
            const onErr = (e) => { rej(e); cleanup(); };
            function cleanup() {
              try { ws.removeEventListener('open', onOpen); } catch (e) {}
              try { ws.removeEventListener('error', onErr); } catch (e) {}
            }
            ws.addEventListener('open', onOpen);
            ws.addEventListener('error', onErr);
          });
        } catch (e) {
          console.log('Failed to create WebSocket, navigating anyway:', e);
        }
      }
      
      if (typeof onPairSuccess === 'function') {
        onPairSuccess(session);
      } else {
        window.location.href = `${window.location.origin}/share?session=${encodeURIComponent(session)}`;
      }
    })();
  }, [onPairSuccess]);

  async function stopScanner() {
    setScanning(false);
    scanningRef.current = false;
    try { setViewMode('qr'); } catch (e) {}
    if (scannerAnimRef.current) {
      cancelAnimationFrame(scannerAnimRef.current);
      scannerAnimRef.current = null;
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(t => t.stop());
      } catch (e) {}
      streamRef.current = null;
    }
  }

  async function startScanner() {
    try {
      setScanning(true);
      try { setViewMode('scan'); } catch (e) {}
      scanningRef.current = true;
      const constraints = { video: { facingMode: 'environment' } };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // wait for metadata so videoWidth/videoHeight are available
        await new Promise((resolve) => {
          const v = videoRef.current;
          if (!v) return resolve();
          const onLoaded = () => {
            v.removeEventListener('loadedmetadata', onLoaded);
            resolve();
          };
          v.addEventListener('loadedmetadata', onLoaded);
        });
        // autoplay
        try { await videoRef.current.play(); } catch (e) { /* ignore */ }
      }

      // choose detector: BarcodeDetector if available, else jsQR
      const hasBarcode = 'BarcodeDetector' in window;
      let detector = null;
      if (hasBarcode) {
        try {
          detector = new BarcodeDetector({ formats: ['qr_code'] });
        } catch (e) {
          detector = null;
        }
      }

      // scanning loop
      const scanFrame = async () => {
        if (!scanningRef.current) return;
        const v = videoRef.current;
        const c = scanCanvasRef.current;
        if (v && c) {
          const cw = c.width = v.videoWidth || v.clientWidth || 320;
          const ch = c.height = v.videoHeight || v.clientHeight || 240;
          if (!cw || !ch) {
            // video not ready yet, try again
            scannerAnimRef.current = requestAnimationFrame(scanFrame);
            return;
          }
          const ctx = c.getContext('2d');
          ctx.drawImage(v, 0, 0, cw, ch);

          if (detector) {
            try {
              // Some implementations accept a canvas directly; others prefer an ImageBitmap
              let barcodes;
              try {
                barcodes = await detector.detect(c);
              } catch (e) {
                try {
                  const bitmap = await createImageBitmap(c);
                  barcodes = await detector.detect(bitmap);
                } catch (e2) {
                  barcodes = [];
                }
              }
              if (barcodes && barcodes.length) {
                const raw = barcodes[0].rawValue;
                const session = extractSessionFromScannedString(raw);
                if (session) {
                  handleFoundSession(session);
                  return;
                }
              }
            } catch (e) {
              // fall through to jsQR fallback
            }
          }

          try {
            const jsqr = await import('jsqr');
            const imgData = ctx.getImageData(0, 0, cw, ch);
            const code = jsqr.default(imgData.data, cw, ch);
            if (code && code.data) {
              const session = extractSessionFromScannedString(code.data);
              if (session) {
                handleFoundSession(session);
                return;
              }
            }
          } catch (e) {
            // if jsQR not available or failed, continue polling
          }
        }
        scannerAnimRef.current = requestAnimationFrame(scanFrame);
      };

      scannerAnimRef.current = requestAnimationFrame(scanFrame);
    } catch (err) {
      console.error('Scanner start failed', err);
      setScanning(false);
    }
  }

  function extractSessionFromScannedString(raw) {
    if (!raw) return null;
    const cleaned = raw.trim();

    // 1) Try parsing as URL (accepts absolute or relative URLs)
    try {
      const maybeUrl = new URL(cleaned, window.location.origin);
      const s = maybeUrl.searchParams.get('session');
      if (s) return s;
    } catch (e) {
      // ignore and fall through to regex parsing
    }

    // 2) Directly look for session query param pattern inside arbitrary strings
    const paramMatch = cleaned.match(/session=([A-Za-z0-9-_]+)/i);
    if (paramMatch && paramMatch[1]) return paramMatch[1];

    // 3) Look for explicit session-xxxxxxxx tokens
    const sessionToken = cleaned.match(/session-[A-Za-z0-9]+/i);
    if (sessionToken) return sessionToken[0];

    // 4) Fallback: first long alphanumeric chunk (legacy behaviour)
    const genericMatch = cleaned.match(/[A-Za-z0-9-_]{6,}/);
    if (genericMatch) return genericMatch[0];

    return null;
  }

  // draw rounded rect helper
  function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    if (typeof radius === 'undefined') {
      radius = 5;
    }
    if (typeof radius === 'number') {
      radius = { tl: radius, tr: radius, br: radius, bl: radius };
    } else {
      const defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 };
      for (const side in defaultRadius) {
        radius[side] = radius[side] || defaultRadius[side];
      }
    }
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  return (
    <div className="flex flex-col items-center">
      {/* Pill toggle: switch between QR and Scanner */}
      <div className="mb-4 flex items-center justify-center">
        {/* Larger pill with animated sliding indicator (fixed equal halves) */}
        <div
          className="relative rounded-full bg-white/5 transition-all duration-200 ease-out flex"
          style={{ width: 200, padding: 6 }}
        >
          {/* animated indicator (behind buttons) - covers half the pill */}
          <div
            aria-hidden
            className="absolute rounded-full bg-white/20"
            style={{
              top: 0,
              bottom: 0,
              width: '50%',
              left: viewMode === 'qr' ? '0%' : '50%',
              transition: 'left 200ms cubic-bezier(.2,.9,.2,1)'
            }}
          />

          <button
            type="button"
            onClick={() => { if (viewMode !== 'qr') { stopScanner(); setViewMode('qr'); } }}
            className={`relative z-20 flex-1 flex justify-center px-4 py-2 rounded-full text-base font-medium transition-all duration-150 ${viewMode === 'qr' ? 'text-white' : 'text-white/70 hover:text-white'}`}
            style={{ lineHeight: 1 }}
          >
            QR
          </button>
          <button
            type="button"
            onClick={() => { if (viewMode !== 'scan') { startScanner(); setViewMode('scan'); } }}
            className={`relative z-20 flex-1 flex justify-center px-4 py-2 rounded-full text-base font-medium transition-all duration-150 ${viewMode === 'scan' ? 'text-white' : 'text-white/70 hover:text-white'}`}
            style={{ lineHeight: 1 }}
          >
            Scanner
          </button>
          {/* Share tab removed - Share link lives in the PairingPage card */}
        </div>
      </div>
  <div className="mb-6 relative" style={{ width: 200, height: 200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {/* Show either the QR canvas or the live scanner video in the same space */}
        {!scanning ? (
          <canvas ref={qrRef} className="rounded-lg" style={{ width: 200, height: 200, display: 'block', margin: '0 auto' }} />
        ) : (
          <video
            ref={videoRef}
            muted
            autoPlay
            playsInline
            poster=""
            className="rounded-lg"
            style={{ width: 200, height: 200, objectFit: 'cover', borderRadius: 12, display: 'block', margin: '0 auto', background: 'black' }}
          />
        )}
        {/* Share overlay removed from pill; use the Share Link card below */}
        {/* hidden canvas used for frame processing */}
        <canvas ref={scanCanvasRef} style={{ display: 'none' }} />
        {/* scanner guide brackets: appear when scanner is active to help the user
            position the QR code inside the camera preview */}
        {viewMode === 'scan' && (
          // single guide square centered inside the preview area
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: GUIDE_INSET,
              top: GUIDE_INSET,
              width: GUIDE_BOX_SIZE,
              height: GUIDE_BOX_SIZE,
              border: '3px solid rgba(255,255,255,0.95)',
              borderRadius: 12,
              boxSizing: 'border-box',
              pointerEvents: 'none'
            }}
          />
        )}
      </div>

      <p className="text-[15px] text-white/70 text-center font-light mb-4">
        Scan the QR code above with your device's camera
      </p>
      <div className="text-xs text-white/60 mb-3 font-mono bg-white/5 px-4 py-2.5 rounded-full border border-white/10 whitespace-nowrap overflow-hidden">
        {sessionId}
      </div>
    </div>
  );
}
