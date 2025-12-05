import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function DownloadAppPage() {
  // Don't render on Android WebView since they already have the app
  if (typeof window.Android !== 'undefined') {
    return null;
  }

  const [latestRelease, setLatestRelease] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch latest release from GitHub API
    fetch('https://api.github.com/repos/U1000000000000/BirdDrop/releases/latest')
      .then(res => res.json())
      .then(data => {
        setLatestRelease(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch latest release:', err);
        setLoading(false);
      });
  }, []);

  // Find APK asset
  const apkAsset = latestRelease?.assets?.find(asset => 
    asset.name.endsWith('.apk')
  );

  const downloadUrl = apkAsset?.browser_download_url || 'https://github.com/U1000000000000/BirdDrop/releases';

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-4xl mx-auto px-5 pt-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-6">
            <svg className="h-20 w-20" viewBox="0 0 154 147" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="downloadBirdGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F7C9A8" />
                  <stop offset="40%" stopColor="#D27BFF" />
                  <stop offset="100%" stopColor="#E3A1C3" />
                </linearGradient>
              </defs>
              <path d="M48.127 27.6957C47.5106 28.6058 46.9656 29.5499 46.4206 30.4939C29.7403 59.3849 31.774 104.947 70.617 127.373C82.5841 134.282 95.7721 137.115 108.724 136.288C106.909 135.508 105.232 134.633 103.464 133.613C93.5898 127.912 86.4941 119.214 82.6297 109.134C92.0329 114.296 103.449 112.495 111.133 105.386C109.711 104.833 108.322 104.212 106.948 103.418C105.055 102.325 103.308 100.955 101.813 99.4627C112.671 103.026 125.001 98.4181 131.134 87.7949L131.291 87.5236C127.538 87.52 123.685 86.6483 120.146 84.7857C128.097 84.1535 135.695 79.6056 140.071 72.0261C142.414 67.9678 143.519 63.6434 143.562 59.3422C125.51 66.593 104.875 66.232 86.8012 57.063C88.066 55.623 89.2395 54.0508 90.2168 52.358C97.1708 40.3133 93.4159 25.0662 81.7111 18.3084C75.6279 14.7963 68.615 14.2631 62.2932 16.2992C58.0693 12.5946 54.552 8.12601 51.9372 3.28141C50.5763 9.25957 51.4547 15.4527 54.2705 20.6881C50.2931 17.7552 46.8729 14.1602 44.064 10.2814C44.4381 16.2702 45.8032 22.2017 48.127 27.6957Z" fill="url(#downloadBirdGradient)" />
              <ellipse cx="38.0462" cy="117.888" rx="8.48648" ry="5.44344" transform="rotate(-70 38.0462 117.888)" fill="white" />
              <circle cx="35.2611" cy="130.388" r="2.5" fill="white" />
            </svg>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white/95 tracking-tight mb-4">
            Download BirdDrop
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
            Get the Android app for NFC pairing, background transfers, and more native features
          </p>
        </div>

        {/* Download Card */}
        <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-2xl rounded-3xl border border-purple-400/30 p-8 mb-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white/95 mb-2">BirdDrop for Android</h2>
            {loading ? (
              <p className="text-white/60 mb-6">Loading latest version...</p>
            ) : latestRelease ? (
              <div className="mb-6">
                <p className="text-white/80 font-semibold mb-1">
                  Version {latestRelease.tag_name || latestRelease.name}
                </p>
                <p className="text-white/50 text-sm">
                  {apkAsset ? `${(apkAsset.size / 1024 / 1024).toFixed(2)} MB` : 'APK available on GitHub'}
                </p>
              </div>
            ) : (
              <p className="text-white/60 mb-6">Visit GitHub for latest release</p>
            )}
            
            <a
              href={downloadUrl}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-semibold text-lg hover:shadow-xl hover:scale-105 transition-all mb-4"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download APK
            </a>
            <p className="text-white/50 text-sm">
              Android 7.0 (API 24) or higher required
            </p>
          </div>
        </div>

        {/* Installation Instructions */}
        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 p-8 mb-8">
          <h2 className="text-2xl font-semibold text-white/95 mb-6">Installation Guide</h2>
          
          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-purple-500/20 flex items-center justify-center border border-purple-400/30">
                <span className="text-lg font-bold text-purple-200">1</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white/90 mb-2">Download the APK</h3>
                <p className="text-white/70 leading-relaxed">
                  Click the download button above to get the latest BirdDrop APK file to your device.
                </p>
              </div>
            </div>

            <div className="ml-5 h-6 w-0.5 bg-gradient-to-b from-purple-400/30 to-blue-400/30"></div>

            {/* Step 2 */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-400/30">
                <span className="text-lg font-bold text-blue-200">2</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white/90 mb-2">Enable Unknown Sources</h3>
                <p className="text-white/70 leading-relaxed mb-3">
                  Since this app is not from the Play Store, you'll need to allow installation from unknown sources:
                </p>
                <ul className="space-y-2 text-white/70 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-white/50">•</span>
                    <span>Go to <strong className="text-white/90">Settings → Security</strong> (or <strong className="text-white/90">Privacy</strong>)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-white/50">•</span>
                    <span>Find <strong className="text-white/90">Install unknown apps</strong> or <strong className="text-white/90">Unknown sources</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-white/50">•</span>
                    <span>Enable it for your browser or file manager</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="ml-5 h-6 w-0.5 bg-gradient-to-b from-blue-400/30 to-emerald-400/30"></div>

            {/* Step 3 */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-400/30">
                <span className="text-lg font-bold text-emerald-200">3</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white/90 mb-2">Install the App</h3>
                <p className="text-white/70 leading-relaxed">
                  Open the downloaded APK file and follow the on-screen prompts to install BirdDrop on your device.
                </p>
              </div>
            </div>

            <div className="ml-5 h-6 w-0.5 bg-gradient-to-b from-emerald-400/30 to-purple-400/30"></div>

            {/* Step 4 */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-purple-500/20 flex items-center justify-center border border-purple-400/30">
                <span className="text-lg font-bold text-purple-200">4</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white/90 mb-2">Start Sharing!</h3>
                <p className="text-white/70 leading-relaxed">
                  Open BirdDrop and enjoy all features including NFC pairing, background transfers, and download management.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Why Download Section */}
        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 p-8 mb-8">
          <h2 className="text-2xl font-semibold text-white/95 mb-6">Why Download the App?</h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-emerald-200" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white/90 mb-2">NFC Pairing</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Tap your devices together to instantly pair and start sharing. Works only in the native app.
              </p>
            </div>

            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-blue-200" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white/90 mb-2">Background Transfers</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Files continue transferring even when you switch apps or lock your screen.
              </p>
            </div>

            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-purple-200" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white/90 mb-2">Download History</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Access all received files in one place with search, sort, and management features.
              </p>
            </div>

            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-pink-200" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white/90 mb-2">Wake Locks</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Prevents your device from sleeping during transfers for reliable completion.
              </p>
            </div>

            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-yellow-200" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white/90 mb-2">Persistent Notifications</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Stay informed with ongoing transfer progress and completion notifications.
              </p>
            </div>

            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-teal-200" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white/90 mb-2">Better Reliability</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Native implementation provides more stable connections and improved transfer success rates.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 p-8 mb-8">
          <h2 className="text-2xl font-semibold text-white/95 mb-6">Common Questions</h2>
          
          <div className="space-y-4">
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <h3 className="text-lg font-semibold text-white/90 mb-2">Is the app safe to install?</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Yes! BirdDrop is completely open source. You can review the entire codebase on GitHub before installing. The APK is built directly from the source code with no modifications.
              </p>
            </div>

            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <h3 className="text-lg font-semibold text-white/90 mb-2">Why isn't it on the Play Store?</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                We prioritize open source distribution and rapid updates. You can always get the latest version directly from GitHub without Play Store delays or restrictions.
              </p>
            </div>

            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <h3 className="text-lg font-semibold text-white/90 mb-2">Can I use the web version instead?</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Absolutely! The web version works great for QR code and link-based pairing. Download the app only if you want NFC pairing or better background transfer support.
              </p>
            </div>

            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <h3 className="text-lg font-semibold text-white/90 mb-2">How do I update the app?</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Download the latest APK from this page and install it over your existing installation. Your settings and download history will be preserved.
              </p>
            </div>
          </div>
        </div>

        {/* Open Source Note */}
        <div className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 backdrop-blur-2xl rounded-3xl border border-emerald-400/20 p-8 text-center">
          <h2 className="text-2xl font-semibold text-white/95 mb-3">Open Source & Transparent</h2>
          <p className="text-white/70 leading-relaxed mb-6 max-w-2xl mx-auto">
            BirdDrop is fully open source. Inspect the code, build your own APK, or contribute improvements on GitHub.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a 
              href="https://github.com/U1000000000000/BirdDrop"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/15 border border-white/20 rounded-full text-white/90 font-medium transition-all"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
              </svg>
              View Source Code
            </a>
            <Link 
              to="/about"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/15 border border-white/20 rounded-full text-white/90 font-medium transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Learn More
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
