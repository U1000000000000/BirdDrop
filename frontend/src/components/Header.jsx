import React from 'react';
import { Link } from 'react-router-dom';

export default function Header() {
  // Detect Android WebView for additional status bar spacing
  const isAndroidWebView = typeof window.Android !== 'undefined';
  
  return (
    <>
      {/* Single unified blurred background covering status bar + header in WebView */}
      {isAndroidWebView ? (
        <div className="fixed top-0 left-0 right-0 z-50">
          {/* Combined blur background for status bar + header */}
          <div className="absolute top-0 left-0 right-0 h-24 bg-white/6 backdrop-blur-md" />
          
          {/* Header content */}
          <div className="relative top-8 h-14 sm:h-16 px-4 flex items-center justify-between">
            <div className="relative w-full flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link to="/" className="flex items-center gap-3">
                  {/* Inline SVG logo (small) */}
                  <svg className="h-10 w-10 sm:h-12 sm:w-12" viewBox="0 0 154 147" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="birdGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#F7C9A8" />
                        <stop offset="40%" stopColor="#D27BFF" />
                        <stop offset="100%" stopColor="#E3A1C3" />
                      </linearGradient>
                    </defs>
                    <path d="M48.127 27.6957C47.5106 28.6058 46.9656 29.5499 46.4206 30.4939C29.7403 59.3849 31.774 104.947 70.617 127.373C82.5841 134.282 95.7721 137.115 108.724 136.288C106.909 135.508 105.232 134.633 103.464 133.613C93.5898 127.912 86.4941 119.214 82.6297 109.134C92.0329 114.296 103.449 112.495 111.133 105.386C109.711 104.833 108.322 104.212 106.948 103.418C105.055 102.325 103.308 100.955 101.813 99.4627C112.671 103.026 125.001 98.4181 131.134 87.7949L131.291 87.5236C127.538 87.52 123.685 86.6483 120.146 84.7857C128.097 84.1535 135.695 79.6056 140.071 72.0261C142.414 67.9678 143.519 63.6434 143.562 59.3422C125.51 66.593 104.875 66.232 86.8012 57.063C88.066 55.623 89.2395 54.0508 90.2168 52.358C97.1708 40.3133 93.4159 25.0662 81.7111 18.3084C75.6279 14.7963 68.615 14.2631 62.2932 16.2992C58.0693 12.5946 54.552 8.12601 51.9372 3.28141C50.5763 9.25957 51.4547 15.4527 54.2705 20.6881C50.2931 17.7552 46.8729 14.1602 44.064 10.2814C44.4381 16.2702 45.8032 22.2017 48.127 27.6957Z" fill="url(#birdGradient)" />
                    <ellipse cx="38.0462" cy="117.888" rx="8.48648" ry="5.44344" transform="rotate(-70 38.0462 117.888)" fill="white" />
                    <circle cx="35.2611" cy="130.388" r="2.5" fill="white" />
                  </svg>

                  <span className="hidden sm:inline text-white text-2xl font-bold tracking-tight">BirdDrop</span>
                </Link>
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center gap-2">
                <Link 
                  to="/about" 
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-all"
                  title="About"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </Link>
                {!isAndroidWebView && (
                  <Link 
                    to="/download-app" 
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-all"
                    title="Download App"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </Link>
                )}
                {isAndroidWebView && (
                  <Link 
                    to="/downloads" 
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-all"
                    title="Downloads"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <header className="fixed top-0 left-0 right-0 z-50 h-14 sm:h-16 px-4 flex items-center justify-between">
          {/* translucent frosted background */}
          <div className="absolute inset-0 pointer-events-none rounded-none bg-white/6 backdrop-blur-md border border-transparent" />
          <div className="relative w-full flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-3">
                {/* Inline SVG logo (small) */}
                <svg className="h-10 w-10 sm:h-12 sm:w-12" viewBox="0 0 154 147" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="birdGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#F7C9A8" />
                      <stop offset="40%" stopColor="#D27BFF" />
                      <stop offset="100%" stopColor="#E3A1C3" />
                    </linearGradient>
                  </defs>
                  <path d="M48.127 27.6957C47.5106 28.6058 46.9656 29.5499 46.4206 30.4939C29.7403 59.3849 31.774 104.947 70.617 127.373C82.5841 134.282 95.7721 137.115 108.724 136.288C106.909 135.508 105.232 134.633 103.464 133.613C93.5898 127.912 86.4941 119.214 82.6297 109.134C92.0329 114.296 103.449 112.495 111.133 105.386C109.711 104.833 108.322 104.212 106.948 103.418C105.055 102.325 103.308 100.955 101.813 99.4627C112.671 103.026 125.001 98.4181 131.134 87.7949L131.291 87.5236C127.538 87.52 123.685 86.6483 120.146 84.7857C128.097 84.1535 135.695 79.6056 140.071 72.0261C142.414 67.9678 143.519 63.6434 143.562 59.3422C125.51 66.593 104.875 66.232 86.8012 57.063C88.066 55.623 89.2395 54.0508 90.2168 52.358C97.1708 40.3133 93.4159 25.0662 81.7111 18.3084C75.6279 14.7963 68.615 14.2631 62.2932 16.2992C58.0693 12.5946 54.552 8.12601 51.9372 3.28141C50.5763 9.25957 51.4547 15.4527 54.2705 20.6881C50.2931 17.7552 46.8729 14.1602 44.064 10.2814C44.4381 16.2702 45.8032 22.2017 48.127 27.6957Z" fill="url(#birdGradient)" />
                  <ellipse cx="38.0462" cy="117.888" rx="8.48648" ry="5.44344" transform="rotate(-70 38.0462 117.888)" fill="white" />
                  <circle cx="35.2611" cy="130.388" r="2.5" fill="white" />
                </svg>

                <span className="hidden sm:inline text-white text-2xl font-bold tracking-tight">BirdDrop</span>
              </Link>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-2">
              <Link 
                to="/about" 
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-all"
                title="About"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Link>
              {!isAndroidWebView && (
                <Link 
                  to="/download-app" 
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-all"
                  title="Download App"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </Link>
              )}
              {isAndroidWebView && (
                <Link 
                  to="/downloads" 
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-all"
                  title="Downloads"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                </Link>
              )}
            </div>
          </div>
        </header>
      )}
    </>
  );
}
