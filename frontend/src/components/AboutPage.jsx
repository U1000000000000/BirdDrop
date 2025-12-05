import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function AboutPage() {
  const [expandedSection, setExpandedSection] = useState(null);

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-5xl mx-auto px-5 pt-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-3 mb-6">
            <svg className="h-16 w-16" viewBox="0 0 154 147" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="aboutBirdGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F7C9A8" />
                  <stop offset="40%" stopColor="#D27BFF" />
                  <stop offset="100%" stopColor="#E3A1C3" />
                </linearGradient>
              </defs>
              <path d="M48.127 27.6957C47.5106 28.6058 46.9656 29.5499 46.4206 30.4939C29.7403 59.3849 31.774 104.947 70.617 127.373C82.5841 134.282 95.7721 137.115 108.724 136.288C106.909 135.508 105.232 134.633 103.464 133.613C93.5898 127.912 86.4941 119.214 82.6297 109.134C92.0329 114.296 103.449 112.495 111.133 105.386C109.711 104.833 108.322 104.212 106.948 103.418C105.055 102.325 103.308 100.955 101.813 99.4627C112.671 103.026 125.001 98.4181 131.134 87.7949L131.291 87.5236C127.538 87.52 123.685 86.6483 120.146 84.7857C128.097 84.1535 135.695 79.6056 140.071 72.0261C142.414 67.9678 143.519 63.6434 143.562 59.3422C125.51 66.593 104.875 66.232 86.8012 57.063C88.066 55.623 89.2395 54.0508 90.2168 52.358C97.1708 40.3133 93.4159 25.0662 81.7111 18.3084C75.6279 14.7963 68.615 14.2631 62.2932 16.2992C58.0693 12.5946 54.552 8.12601 51.9372 3.28141C50.5763 9.25957 51.4547 15.4527 54.2705 20.6881C50.2931 17.7552 46.8729 14.1602 44.064 10.2814C44.4381 16.2702 45.8032 22.2017 48.127 27.6957Z" fill="url(#aboutBirdGradient)" />
              <ellipse cx="38.0462" cy="117.888" rx="8.48648" ry="5.44344" transform="rotate(-70 38.0462 117.888)" fill="white" />
              <circle cx="35.2611" cy="130.388" r="2.5" fill="white" />
            </svg>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white/95 tracking-tight mb-4">
            About BirdDrop
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
            Private, peer-to-peer file sharing reimagined for the modern web and mobile devices
          </p>
        </div>

        {/* Overview Card */}
        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 p-8 mb-8">
          <h2 className="text-2xl font-semibold text-white/95 mb-4">What is BirdDrop?</h2>
          <p className="text-white/70 leading-relaxed mb-4">
            BirdDrop is a privacy-focused file sharing platform that enables instant peer-to-peer transfers between devices without uploading files to any server. Built with modern web technologies plus a native Android shell, it gives you the always-on convenience of the web while unlocking native-only features such as NFC pairing when you need them.
          </p>
          <p className="text-white/70 leading-relaxed">
            Whether you're sharing photos with friends, transferring documents between your devices, or collaborating on projects, BirdDrop ensures your files travel directly from sender to receiver with end-to-end encryption.
          </p>
        </div>

        {/* How It Works Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-semibold text-white/95 mb-6 text-center">How It Works</h2>
          
          {/* Connection Flow Diagram */}
          <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 p-8 mb-6">
            <h3 className="text-xl font-semibold text-white/90 mb-6">Connection Flow</h3>
            <div className="space-y-6">
              {/* Step 1 */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center border border-purple-400/30">
                  <span className="text-xl font-bold text-purple-200">1</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-white/90 mb-2">Pairing</h4>
                  <p className="text-white/70 leading-relaxed">
                    Choose your pairing method: QR Code (scan with camera), Share Link (send via any app), or NFC (tap devices together - Android only). All methods create a unique session that only you and your recipient can join.
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="ml-6 h-8 w-0.5 bg-gradient-to-b from-purple-400/30 to-emerald-400/30"></div>

              {/* Step 2 */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-400/30">
                  <span className="text-xl font-bold text-blue-200">2</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-white/90 mb-2">WebRTC Connection</h4>
                  <p className="text-white/70 leading-relaxed">
                    Once paired, devices establish a direct peer-to-peer connection using WebRTC. Our signaling server facilitates the initial handshake, but never touches your files. The connection uses ICE and STUN protocols to work across different networks.
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="ml-6 h-8 w-0.5 bg-gradient-to-b from-blue-400/30 to-emerald-400/30"></div>

              {/* Step 3 */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-400/30">
                  <span className="text-xl font-bold text-emerald-200">3</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-white/90 mb-2">File Transfer</h4>
                  <p className="text-white/70 leading-relaxed">
                    Files are split into chunks and sent through the encrypted DataChannel. Your data travels directly between devices without any intermediate storage. The recipient can preview and download files as they arrive.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Architecture Diagram */}
          <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 p-8">
            <h3 className="text-xl font-semibold text-white/90 mb-6">System Architecture</h3>
            <div className="grid md:grid-cols-3 gap-6">
              {/* Web Frontend */}
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-purple-200" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-white/90 mb-2">Web Frontend</h4>
                <p className="text-white/60 text-sm leading-relaxed">
                  React 19 SPA with React Router, WebRTC for P2P connections, WebSocket for signaling, and Camera API for QR scanning.
                </p>
              </div>

              {/* Backend Server */}
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-200" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-white/90 mb-2">Signaling Server</h4>
                <p className="text-white/60 text-sm leading-relaxed">
                  Node.js + Express + WebSocket server that facilitates initial peer discovery and WebRTC handshake. Never stores or accesses file data.
                </p>
              </div>

              {/* Android App */}
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-emerald-200" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-white/90 mb-2">Android App</h4>
                <p className="text-white/60 text-sm leading-relaxed">
                  Kotlin + WebView wrapper with native NFC (HCE), background transfer service, wake locks, and download management.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Focus Section */}
        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-2xl rounded-3xl border border-purple-400/20 p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-3xl font-semibold text-white/95">Privacy First</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-purple-400/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-purple-200" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="text-white/90 font-semibold mb-1">Direct Peer-to-Peer Transfer</h4>
                <p className="text-white/60 text-sm">Files travel directly between devices using WebRTC DataChannels. No cloud storage, no intermediaries.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-purple-400/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-purple-200" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="text-white/90 font-semibold mb-1">End-to-End Encryption</h4>
                <p className="text-white/60 text-sm">WebRTC automatically encrypts all data with DTLS-SRTP. Your files are protected in transit.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-purple-400/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-purple-200" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="text-white/90 font-semibold mb-1">No Server Storage</h4>
                <p className="text-white/60 text-sm">The signaling server only facilitates connections. It never sees, stores, or has access to your files.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-purple-400/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-purple-200" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="text-white/90 font-semibold mb-1">Local Network Priority</h4>
                <p className="text-white/60 text-sm">When possible, files transfer over your local WiFi network for maximum speed and privacy.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-purple-400/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-purple-200" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="text-white/90 font-semibold mb-1">No Account Required</h4>
                <p className="text-white/60 text-sm">Start sharing immediately without registration, login, or providing personal information.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Technologies Section */}
        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 p-8 mb-8">
          <h2 className="text-3xl font-semibold text-white/95 mb-6">Technologies We Use</h2>
          
          <div className="space-y-6">
            {/* WebRTC */}
            <div 
              className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden cursor-pointer hover:bg-white/10 transition-all"
              onClick={() => toggleSection('webrtc')}
            >
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-200" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white/90">WebRTC (Web Real-Time Communication)</h3>
                    <p className="text-white/50 text-sm">Core technology for peer-to-peer connections</p>
                  </div>
                </div>
                <svg 
                  className={`w-5 h-5 text-white/60 transition-transform ${expandedSection === 'webrtc' ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {expandedSection === 'webrtc' && (
                <div className="px-6 pb-6 text-white/70 space-y-3">
                  <p className="leading-relaxed">
                    WebRTC is a browser API that enables real-time, peer-to-peer communication without plugins. It's used by applications like Google Meet, Discord, and now BirdDrop.
                  </p>
                  <p className="leading-relaxed">
                    <strong className="text-white/90">How it works:</strong> WebRTC establishes a direct connection between browsers using ICE (Interactive Connectivity Establishment) to traverse NATs and firewalls, STUN servers to discover public IP addresses, and DataChannels for reliable file transfer.
                  </p>
                  <p className="leading-relaxed">
                    <strong className="text-white/90">Why we use it:</strong> Built-in encryption (DTLS), low latency, no server bandwidth costs, and works across different networks.
                  </p>
                </div>
              )}
            </div>

            {/* NFC */}
            <div 
              className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden cursor-pointer hover:bg-white/10 transition-all"
              onClick={() => toggleSection('nfc')}
            >
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-emerald-200" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white/90">NFC (Near Field Communication)</h3>
                    <p className="text-white/50 text-sm">Android-exclusive pairing method</p>
                  </div>
                </div>
                <svg 
                  className={`w-5 h-5 text-white/60 transition-transform ${expandedSection === 'nfc' ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {expandedSection === 'nfc' && (
                <div className="px-6 pb-6 text-white/70 space-y-3">
                  <p className="leading-relaxed">
                    NFC enables short-range wireless data exchange between devices placed within a few centimeters of each other.
                  </p>
                  <p className="leading-relaxed">
                    <strong className="text-white/90">How it works:</strong> One device acts as a Host Card Emulation (HCE) transmitter, broadcasting the session code. The other device uses Reader Mode to receive it. This happens in milliseconds with a simple tap.
                  </p>
                  <p className="leading-relaxed">
                    <strong className="text-white/90">Why only on Android:</strong> Web browsers don't have access to NFC hardware for security reasons. Native apps have the required permissions to use NFC APIs, which is why we built an Android app wrapper.
                  </p>
                </div>
              )}
            </div>

            {/* React & Modern Web */}
            <div 
              className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden cursor-pointer hover:bg-white/10 transition-all"
              onClick={() => toggleSection('react')}
            >
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-200" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white/90">React 19 & Modern Web Stack</h3>
                    <p className="text-white/50 text-sm">Fast, responsive user interface</p>
                  </div>
                </div>
                <svg 
                  className={`w-5 h-5 text-white/60 transition-transform ${expandedSection === 'react' ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {expandedSection === 'react' && (
                <div className="px-6 pb-6 text-white/70 space-y-3">
                  <p className="leading-relaxed">
                    React provides a component-based architecture for building interactive UIs with efficient rendering and state management.
                  </p>
                  <p className="leading-relaxed">
                    <strong className="text-white/90">Our stack:</strong> React 19 for UI, React Router for navigation, Vite for fast builds, TailwindCSS for styling, and WebSocket for real-time signaling.
                  </p>
                  <p className="leading-relaxed">
                    <strong className="text-white/90">Why we use it:</strong> Component reusability, excellent developer experience, large ecosystem, and seamless integration with WebRTC and other browser APIs.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Why We Built This Section */}
        <div className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 backdrop-blur-2xl rounded-3xl border border-emerald-400/20 p-8 mb-8">
          <h2 className="text-3xl font-semibold text-white/95 mb-6">Why We Built BirdDrop</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-white/90 mb-3">The Native App Necessity</h3>
              <p className="text-white/70 leading-relaxed">
                While the web version of BirdDrop works perfectly for QR code and link-based pairing, <strong className="text-white/90">NFC functionality requires native system access that web browsers cannot provide</strong> for security reasons. Web APIs like Web NFC exist but have very limited support and capabilities compared to native implementations.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-white/90 mb-3">Privacy Concerns with Existing Solutions</h3>
              <p className="text-white/70 leading-relaxed">
                Popular file-sharing services upload your files to their servers, often storing them for days or weeks. Even "private" services have access to your data. We wanted something different: <strong className="text-white/90">true peer-to-peer transfer where files never touch a server</strong>, ensuring complete privacy and eliminating upload/download bandwidth limitations.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-white/90 mb-3">The Best of Both Worlds</h3>
              <p className="text-white/70 leading-relaxed">
                BirdDrop combines the accessibility of web apps (works on any device with a browser) with the power of native apps (NFC pairing, background transfers, wake locks). The Android app is a WebView wrapper that adds native capabilities while maintaining the same codebase as the web version.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-white/90 mb-3">Open Source Philosophy</h3>
              <p className="text-white/70 leading-relaxed mb-3">
                We believe in transparency and community. BirdDrop is fully open source, allowing anyone to inspect the code, verify our privacy claims, contribute improvements, or self-host their own instance.
              </p>
              <a 
                href="https://github.com/U1000000000000/BirdDrop"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/15 border border-white/20 rounded-full text-white/90 font-medium transition-all"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
                </svg>
                View on GitHub
              </a>
            </div>
          </div>
        </div>

        {/* Web vs Android Comparison */}
        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 p-8 mb-8">
          <h2 className="text-3xl font-semibold text-white/95 mb-6">Web vs Android App</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left py-4 px-4 text-white/70 font-semibold">Feature</th>
                  <th className="text-center py-4 px-4 text-white/70 font-semibold">Web Browser</th>
                  <th className="text-center py-4 px-4 text-white/70 font-semibold">Android App</th>
                </tr>
              </thead>
              <tbody className="text-white/80">
                <tr className="border-b border-white/10">
                  <td className="py-4 px-4">QR Code Pairing</td>
                  <td className="text-center py-4 px-4">✅</td>
                  <td className="text-center py-4 px-4">✅</td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-4 px-4">Share Link Pairing</td>
                  <td className="text-center py-4 px-4">✅</td>
                  <td className="text-center py-4 px-4">✅</td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-4 px-4">NFC Pairing</td>
                  <td className="text-center py-4 px-4">❌</td>
                  <td className="text-center py-4 px-4">✅</td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-4 px-4">File Transfer</td>
                  <td className="text-center py-4 px-4">✅</td>
                  <td className="text-center py-4 px-4">✅</td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-4 px-4">Background Transfer</td>
                  <td className="text-center py-4 px-4">⚠️ Limited</td>
                  <td className="text-center py-4 px-4">✅ Full Support</td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-4 px-4">Download Management</td>
                  <td className="text-center py-4 px-4">Browser Default</td>
                  <td className="text-center py-4 px-4">✅ Custom History</td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-4 px-4">Persistent Notifications</td>
                  <td className="text-center py-4 px-4">❌</td>
                  <td className="text-center py-4 px-4">✅</td>
                </tr>
                <tr>
                  <td className="py-4 px-4">Wake Locks</td>
                  <td className="text-center py-4 px-4">⚠️ Limited</td>
                  <td className="text-center py-4 px-4">✅</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 p-8 mb-8">
          <h2 className="text-3xl font-semibold text-white/95 mb-6">Frequently Asked Questions</h2>
          
          <div className="space-y-4">
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white/90 mb-2">Is my data really private?</h3>
              <p className="text-white/70 leading-relaxed">
                Yes. Files are transferred directly between devices using encrypted WebRTC connections. The server only facilitates the initial handshake and never has access to your files.
              </p>
            </div>

            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white/90 mb-2">Do both devices need to be online at the same time?</h3>
              <p className="text-white/70 leading-relaxed">
                Yes. BirdDrop uses real-time peer-to-peer connections, so both sender and receiver need to be connected simultaneously for the transfer to work.
              </p>
            </div>

            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white/90 mb-2">Is there a file size limit?</h3>
              <p className="text-white/70 leading-relaxed">
                No server-imposed limits. The only constraints are your device's available memory and storage space.
              </p>
            </div>

            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white/90 mb-2">Can I use this on iPhone/iOS?</h3>
              <p className="text-white/70 leading-relaxed">
                Yes! The web version works perfectly on iOS Safari. You can use QR code or share link pairing. Only NFC pairing is exclusive to the Android app.
              </p>
            </div>

            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white/90 mb-2">Why can't NFC work on the website?</h3>
              <p className="text-white/70 leading-relaxed">
                Web browsers don't expose NFC APIs for security reasons. Native apps have the required system permissions to access NFC hardware directly, which is why we built the Android app.
              </p>
            </div>

            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white/90 mb-2">Can I self-host BirdDrop?</h3>
              <p className="text-white/70 leading-relaxed">
                Absolutely! The entire project is open source. Clone the repository, install dependencies, and run your own instance. Perfect for organizations with strict data policies.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-2xl rounded-3xl border border-purple-400/30 p-12">
          <h2 className="text-3xl font-bold text-white/95 mb-4">Ready to Share?</h2>
          <p className="text-white/70 mb-8 max-w-2xl mx-auto">
            Experience private, peer-to-peer file sharing with no registration required.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link 
              to="/" 
              className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-semibold text-lg hover:shadow-xl hover:scale-105 transition-all"
            >
              Start Sharing Now
            </Link>
            <a 
              href="https://github.com/U1000000000000/BirdDrop"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-white/10 hover:bg-white/15 border border-white/20 text-white rounded-full font-semibold text-lg transition-all"
            >
              View Source Code
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
