import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PairingPage from './components/PairingPage.jsx';
import FileSharingPage from './components/FileSharingPage.jsx';
import DownloadsPage from './components/DownloadsPage.jsx';
import AboutPage from './components/AboutPage.jsx';
import DownloadAppPage from './components/DownloadAppPage.jsx';
import Header from './components/Header.jsx';
import ToastProvider from './components/ToastProvider.jsx';

function App() {
  // Detect Android WebView for additional status bar padding
  const isAndroidWebView = typeof window.Android !== 'undefined';
  
  return (
    <BrowserRouter>
      <Header />
      {/* Extra padding for Android: account for status bar (32px) + header height (56px) */}
      <div className={isAndroidWebView ? "pt-24" : "pt-14 sm:pt-16"}>
        <Routes>
          <Route path="/" element={<PairingPage />} />
          <Route path="/share" element={<FileSharingPage />} />
          <Route path="/downloads" element={<DownloadsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/download-app" element={<DownloadAppPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ToastProvider>
    <App />
  </ToastProvider>
);
