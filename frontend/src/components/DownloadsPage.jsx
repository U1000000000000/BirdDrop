import { useState, useEffect } from 'react';

export default function DownloadsPage() {
  const [files, setFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date'); // 'date' or 'name'
  const [loading, setLoading] = useState(true);

  // Load files from Android
  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = () => {
    if (typeof window.Android !== 'undefined' && window.Android.getDownloadedFiles) {
      setLoading(true);
      try {
        const filesJson = window.Android.getDownloadedFiles();
        const filesList = JSON.parse(filesJson);
        setFiles(filesList);
      } catch (error) {
        console.error('Error loading files:', error);
        setFiles([]);
      }
      setLoading(false);
    } else {
      setLoading(false);
    }
  };

  const filteredFiles = files
    .filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'date') {
        return b.lastModified - a.lastModified;
      } else {
        return a.name.localeCompare(b.name);
      }
    });

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const mins = Math.floor(diff / (1000 * 60));
        return mins <= 1 ? 'Just now' : `${mins} mins ago`;
      }
      return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
    const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'];
    const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'm4a'];
    const docExts = ['pdf', 'doc', 'docx', 'txt', 'rtf'];
    const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz'];

    if (imageExts.includes(ext)) {
      return (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
      );
    } else if (videoExts.includes(ext)) {
      return (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
        </svg>
      );
    } else if (audioExts.includes(ext)) {
      return (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
        </svg>
      );
    } else if (docExts.includes(ext)) {
      return (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      );
    } else if (archiveExts.includes(ext)) {
      return (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
        </svg>
      );
    } else {
      return (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
    }
  };

  const handleOpenFile = (filePath) => {
    if (typeof window.Android !== 'undefined' && window.Android.openFile) {
      window.Android.openFile(filePath);
    }
  };

  const handleShareFile = (filePath) => {
    if (typeof window.Android !== 'undefined' && window.Android.shareFile) {
      window.Android.shareFile(filePath);
    }
  };

  const handleDeleteFile = (filePath, fileName) => {
    if (typeof window.Android !== 'undefined' && window.Android.deleteFile) {
      try {
        const success = window.Android.deleteFile(filePath);
        if (success) {
          loadFiles(); // Reload the list
          // Show Android toast
          if (window.Android.showToast) {
            window.Android.showToast('File deleted');
          }
        } else {
          if (window.Android.showToast) {
            window.Android.showToast('Failed to delete file');
          }
        }
      } catch (e) {
        if (window.Android.showToast) {
          window.Android.showToast('Error deleting file');
        }
      }
    }
  };



  if (typeof window.Android === 'undefined') {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Downloads</h1>
          <p className="text-white/60 text-sm">Files saved to Downloads/BirdDrop/</p>
        </div>

        {/* Search and Controls */}
        <div className="mb-6 space-y-4">
          {/* Pill-shaped Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-5 py-3 pl-12 bg-white/10 border border-white/20 rounded-full text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-transparent transition-all"
            />
            <svg className="w-5 h-5 text-white/40 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Sort Chips */}
          <div className="flex items-center gap-2">
            <span className="text-white/50 text-sm font-medium">Sort by:</span>
            <button
              onClick={() => setSortBy('date')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                sortBy === 'date' 
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
                  : 'bg-white/10 text-white/60 hover:bg-white/15 border border-white/10'
              }`}
            >
              Date
            </button>
            <button
              onClick={() => setSortBy('name')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                sortBy === 'name' 
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
                  : 'bg-white/10 text-white/60 hover:bg-white/15 border border-white/10'
              }`}
            >
              Name
            </button>
          </div>
        </div>

        {/* File Count */}
        {!loading && (
          <div className="mb-4 text-white/60 text-sm">
            {filteredFiles.length} {filteredFiles.length === 1 ? 'file' : 'files'}
            {searchQuery && ` matching "${searchQuery}"`}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin mb-3"></div>
            <p className="text-white/60">Loading files...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && files.length === 0 && (
          <div className="text-center py-12 bg-white/5 rounded-3xl border border-white/10">
            <svg className="w-16 h-16 mx-auto mb-4 text-white/20" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H8a3 3 0 00-3 3v1.5a1.5 1.5 0 01-3 0V6z" clipRule="evenodd" />
              <path d="M6 12a2 2 0 012-2h8a2 2 0 012 2v2a2 2 0 01-2 2H2h2a2 2 0 002-2v-2z" />
            </svg>
            <h3 className="text-xl font-semibold text-white mb-2">No downloads yet</h3>
            <p className="text-white/60 text-sm">Files you receive will appear here</p>
          </div>
        )}

        {/* No Results */}
        {!loading && files.length > 0 && filteredFiles.length === 0 && (
          <div className="text-center py-12 bg-white/5 rounded-3xl border border-white/10">
            <svg className="w-16 h-16 mx-auto mb-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="text-xl font-semibold text-white mb-2">No results found</h3>
            <p className="text-white/60 text-sm">Try a different search term</p>
          </div>
        )}

        {/* File List */}
        {!loading && filteredFiles.length > 0 && (
          <div className="space-y-3">
            {filteredFiles.map((file, idx) => (
              <div
                key={idx}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all group"
              >
                <div className="flex items-center gap-4">
                  {/* File Icon with Thumbnail */}
                  <div className="relative flex-shrink-0">
                    {file.thumbnail ? (
                      <img
                        src={file.thumbnail}
                        alt={file.name}
                        className="w-12 h-12 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300">
                        {getFileIcon(file.name)}
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0" onClick={() => handleOpenFile(file.path)}>
                    <p className="text-white font-medium truncate mb-1 cursor-pointer hover:text-purple-300 transition-colors">
                      {file.name}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-white/50">
                      <span>{formatSize(file.size)}</span>
                      <span>•</span>
                      <span>{formatDate(file.lastModified)}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleShareFile(file.path)}
                      className="w-9 h-9 flex items-center justify-center hover:bg-blue-500/20 text-white/60 hover:text-blue-300 rounded-full transition-all"
                      title="Share"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteFile(file.path, file.name)}
                      className="w-9 h-9 flex items-center justify-center hover:bg-red-500/20 text-white/60 hover:text-red-300 rounded-full transition-all"
                      title="Delete"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
  );
}
