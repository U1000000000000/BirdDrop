import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import FileShare from './FileShare.jsx';

export default function FileSharingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pending = window.__birddrop_pending_session;
      if (pending && pending !== sessionId) {
        navigate(`/share?session=${encodeURIComponent(pending)}`, { replace: true });
        return;
      } else if (pending && pending === sessionId) {
        try { window.__birddrop_pending_session = null; } catch (e) {}
      }
    }

    // Redirect to pairing page if no valid session in URL
    if (!sessionId || !sessionId.startsWith('session-')) {
      navigate('/');
    }
  }, [sessionId, navigate]);

  if (!sessionId) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <div className="relative w-full max-w-2xl mx-auto px-5 pt-8 pb-20">
        {/* Header */}
        <div className="mb-10">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-white/10 backdrop-blur-md text-white/80 rounded-full text-[15px] font-medium border border-white/20 hover:bg-white/15 hover:text-white/95 transition-all duration-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            New Connection
          </button>
          
          <h1 className="text-4xl md:text-5xl font-semibold text-white/95 tracking-tight leading-none mb-3">
            Share Files
          </h1>
          <p className="text-[17px] text-white/50 font-light">
            Send and receive instantly
          </p>
        </div>

        {/* File Share Component */}
        <FileShare key={sessionId} sessionId={sessionId} />

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-[15px] text-white/40 font-normal leading-relaxed">
            Your files are transferred securely using<br className="hidden sm:block" />
            peer-to-peer encryption.
          </p>
        </div>
      </div>
    </div>
  );
}
