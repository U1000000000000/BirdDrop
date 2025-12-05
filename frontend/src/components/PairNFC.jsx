import React, { useState, useEffect } from 'react';
import { useToast } from './ToastProvider.jsx';

const NfcBroadcastIcon = ({ className = '' }) => (
  <svg
    className={className}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="11"
      y="6"
      width="8"
      height="20"
      rx="3"
      stroke="currentColor"
      strokeWidth="1.7"
    />
    <circle cx="15" cy="12" r="1.1" fill="currentColor" />
    <path
      d="M13 16h4v6h-4z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <path
      d="M20.5 9.5c2.8 2.8 2.8 10.2 0 13"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
    <path
      d="M23.5 7c4 4.5 4 17.5 0 22"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeDasharray="2 2"
    />
    <path
      d="M9.5 10.5c-2 2-2 9 0 11"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      opacity="0.6"
    />
  </svg>
);

const NfcReceiveIcon = ({ className = '' }) => (
  <svg
    className={className}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="11"
      y="6"
      width="8"
      height="20"
      rx="3"
      stroke="currentColor"
      strokeWidth="1.7"
    />
    <path
      d="M15 11v8"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
    <path
      d="M13.5 17.5L15 19l1.5-1.5"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8.5 12.5c-1.4 1.4-1.4 6.6 0 8"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      opacity="0.6"
    />
    <path
      d="M20 9c2.4 2.4 2.4 9.6 0 12"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
    <path
      d="M23 6.5c3.2 4 3.2 15 0 19"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeDasharray="2 2"
    />
  </svg>
);

const NfcCoilIcon = ({ className = '' }) => (
  <svg
    className={className}
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M9 11c0-2.209 1.791-4 4-4h14c2.209 0 4 1.791 4 4v18c0 2.209-1.791 4-4 4h-5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M24 33h-7c-2.209 0-4-1.791-4-4V11"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect
      x="15"
      y="15"
      width="10"
      height="10"
      rx="2"
      stroke="currentColor"
      strokeWidth="2"
    />
    <rect x="18" y="18" width="4" height="4" fill="currentColor" rx="1" />
  </svg>
);

export default function PairNFC({ sessionId, onPairSuccess }) {
  const { show } = useToast();
  const [mode, setMode] = useState('idle'); // 'idle', 'sender', 'reader'
  const [isAndroidApp, setIsAndroidApp] = useState(false);

  useEffect(() => {
    // Check if running in Android WebView
    const hasAndroidBridge = typeof window.Android !== 'undefined';
    setIsAndroidApp(hasAndroidBridge);

    if (!hasAndroidBridge) {
      return;
    }

    window.onNfcReceived = (scannedSessionCode) => {
      try {
        show && show('NFC paired successfully!', { type: 'success', timeout: 3000 });
      } catch (e) {}
      
      if (onPairSuccess && scannedSessionCode) {
        onPairSuccess(scannedSessionCode);
      }
    };

    return () => {
      window.onNfcReceived = null;
    };
  }, [onPairSuccess, show]);

  const handleSenderMode = () => {
    if (!isAndroidApp) {
      show && show('NFC only available in Android app', { type: 'error', timeout: 3000 });
      return;
    }

    try {
      window.Android.setSenderMode(sessionId);
      setMode('sender');
      show && show('Hold phone near another device to share', { type: 'info', timeout: 4000 });
    } catch (e) {
      show && show('Failed to enable NFC sender', { type: 'error', timeout: 3000 });
    }
  };

  const handleReaderMode = () => {
    if (!isAndroidApp) {
      show && show('NFC only available in Android app', { type: 'error', timeout: 3000 });
      return;
    }

    try {
      window.Android.setReaderMode();
      setMode('reader');
      show && show('Tap another device to receive session', { type: 'info', timeout: 4000 });
    } catch (e) {
      show && show('Failed to enable NFC reader', { type: 'error', timeout: 3000 });
    }
  };

  const handleStop = () => {
    setMode('idle');
    if (isAndroidApp && mode === 'sender') {
      try {
        window.Android.setReaderMode();
      } catch (e) {}
    }
  };

  if (!isAndroidApp) {
    return (
      <div className="text-center py-8">
        <p className="text-white/60 text-sm">
          NFC pairing is only available in the BirdDrop Android app
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full">
      {mode === 'idle' && (
        <div className="w-full space-y-3">
          {/* Sender Mode Button */}
          <button
            onClick={handleSenderMode}
            className="w-full px-6 py-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 hover:border-emerald-400/30 transition-all duration-300 active:scale-[0.98] group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center group-hover:bg-emerald-500/25 transition-all duration-300">
                  <NfcBroadcastIcon className="w-6 h-6 text-emerald-200" />
                </div>
                <div className="text-left">
                  <div className="text-[15px] font-medium text-white/90">Share via NFC</div>
                  <div className="text-[13px] text-white/50 mt-0.5">Let others tap your device</div>
                </div>
              </div>
              <svg className="w-5 h-5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* Reader Mode Button */}
          <button
            onClick={handleReaderMode}
            className="w-full px-6 py-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 hover:border-emerald-400/30 transition-all duration-300 active:scale-[0.98] group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center group-hover:bg-emerald-500/25 transition-all duration-300">
                  <NfcReceiveIcon className="w-6 h-6 text-emerald-200" />
                </div>
                <div className="text-left">
                  <div className="text-[15px] font-medium text-white/90">Receive via NFC</div>
                  <div className="text-[13px] text-white/50 mt-0.5">Tap another device to pair</div>
                </div>
              </div>
              <svg className="w-5 h-5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          <p className="text-[11px] text-white/40 text-center mt-4 font-light">
            Make sure NFC is enabled in your device settings
          </p>
        </div>
      )}

      {mode === 'sender' && (
        <div className="w-full p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl">
          <div className="flex flex-col items-center">
            {/* Animated NFC Icon */}
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center animate-pulse">
                <NfcCoilIcon className="w-14 h-14 text-emerald-200" />
              </div>
              {/* Ripple effect */}
              <div className="absolute inset-0 w-24 h-24 rounded-full bg-emerald-400/20 animate-ping"></div>
            </div>

            <h3 className="text-lg font-medium text-white/90 mb-2">Ready to Share</h3>
            <p className="text-sm text-white/60 text-center mb-6">
              Hold your device close to another device's back
            </p>

            <div className="w-full p-4 bg-emerald-500/10 rounded-xl border border-emerald-400/20 mb-4">
              <p className="text-xs text-emerald-200/80 text-center font-light">
                Session: <span className="font-mono">{sessionId?.slice(0, 20)}...</span>
              </p>
            </div>

            <button
              onClick={handleStop}
              className="px-6 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 rounded-full text-sm font-medium transition-all duration-300 border border-rose-400/30 hover:border-rose-400/50 active:scale-95"
            >
              Stop Sharing
            </button>
          </div>
        </div>
      )}

      {mode === 'reader' && (
        <div className="w-full p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl">
          <div className="flex flex-col items-center">
            {/* Animated NFC Scan Icon */}
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center animate-pulse">
                <NfcReceiveIcon className="w-14 h-14 text-blue-200" />
              </div>
              {/* Scan line effect */}
              <div className="absolute inset-0 w-24 h-24 rounded-full border-t-2 border-blue-400/50 animate-spin"></div>
            </div>

            <h3 className="text-lg font-medium text-white/90 mb-2">Waiting to Receive</h3>
            <p className="text-sm text-white/60 text-center mb-6">
              Tap your device against another device's back
            </p>

            <div className="w-full p-4 bg-blue-500/10 rounded-xl border border-blue-400/20 mb-4">
              <p className="text-xs text-blue-200/80 text-center font-light">
                Listening for NFC tags...
              </p>
            </div>

            <button
              onClick={handleStop}
              className="px-6 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 rounded-full text-sm font-medium transition-all duration-300 border border-rose-400/30 hover:border-rose-400/50 active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
