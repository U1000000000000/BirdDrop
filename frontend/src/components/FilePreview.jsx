import React, { useState, useEffect, useRef } from 'react';
import PDFViewer from './PDFViewer.jsx';

export default function FilePreview({ file, onClose, onDownload, isDownloading = false }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [textContent, setTextContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageDimensions, setImageDimensions] = useState(null);
  const [renderedSize, setRenderedSize] = useState(null);
  const imageRef = useRef(null);
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoDimensions, setVideoDimensions] = useState(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  const fileType = file?.name.split('.').pop().toLowerCase() || '';
  const fileName = file?.name || 'Unknown';
  
  const isVideo = [
    'mp4', 'webm', 'ogg', 'mov', 'avi'
  ].includes(fileType);

  useEffect(() => {
    if (file?.blob) {
      const url = URL.createObjectURL(file.blob);
      setBlobUrl(url);

      // Load text content for text-based files
      if ([
        'txt', 'md', 'json', 'xml', 'csv', 'log', 'js', 'jsx', 'css', 'html',
        'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'hpp'
      ].includes(fileType)) {
        setLoading(true);
        file.blob.text().then(text => {
          setTextContent(text);
          setLoading(false);
        }).catch(() => {
          setTextContent('Unable to load text content');
          setLoading(false);
        });
      }

      return () => URL.revokeObjectURL(url);
    }
  }, [file, fileType]);

  // Pause video when user switches tabs or windows
  useEffect(() => {
    if (isVideo && videoRef.current) {
      const handleVisibilityChange = () => {
        if (document.hidden && videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [isVideo]);

  const isImage = [
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'
  ].includes(fileType);

  useEffect(() => {
    if (blobUrl && isImage) {
      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = blobUrl;
    }
  }, [blobUrl, isImage]);

  // Update rendered size when image loads
  useEffect(() => {
    if (imageRef.current && isImage) {
      const updateSize = () => {
        if (imageRef.current) {
          setRenderedSize({
            width: imageRef.current.offsetWidth,
            height: imageRef.current.offsetHeight
          });
        }
      };
      
      // Wait for image to fully load and render
      if (imageRef.current.complete) {
        updateSize();
      } else {
        imageRef.current.onload = updateSize;
      }
    }
  }, [blobUrl, isImage, imageDimensions]);

  // Calculate optimal image dimensions based on aspect ratio and minimum width
  const getScaledImageDimensions = () => {
    if (!isImage || !imageDimensions) {
      return null;
    }

    const { width, height } = imageDimensions;
    const aspectRatio = width / height;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const isLandscape = aspectRatio > 1;
    const isMobile = viewportWidth < 640;
    
    // Footer height + padding - less padding on mobile
    const footerHeight = 80;
    const verticalPadding = isMobile ? 20 : 30; // Reduce to 20px on mobile
    const horizontalPadding = isMobile ? 40 : 60; // Reduce to 40px on mobile
    const maxAvailableHeight = viewportHeight - footerHeight - verticalPadding;
    const maxAvailableWidth = viewportWidth - horizontalPadding;

    let targetWidth, targetHeight;

    if (isLandscape) {
      // For landscape images, use maximum viewport space
      const widthPercentage = isMobile ? 0.98 : 0.95; // Use 98% on mobile
      targetWidth = Math.min(width, maxAvailableWidth * widthPercentage);
      targetHeight = targetWidth / aspectRatio;

      // If height still exceeds available space, scale down by height
      if (targetHeight > maxAvailableHeight) {
        targetHeight = maxAvailableHeight;
        targetWidth = targetHeight * aspectRatio;
      }
    } else {
      // For portrait images, use near-maximum available space with special handling for mobile
      const isTablet = viewportWidth >= 640 && viewportWidth < 1024;
      
      let heightPercentage;
      if (isMobile) {
        heightPercentage = 0.98; // 98% on mobile for maximum size
      } else if (isTablet) {
        heightPercentage = 0.95; // 95% on tablet
      } else {
        heightPercentage = 0.95; // 95% on desktop
      }
      
      targetHeight = Math.min(height, maxAvailableHeight * heightPercentage);
      targetWidth = targetHeight * aspectRatio;

      // If width exceeds available space, scale down by width
      if (targetWidth > maxAvailableWidth) {
        targetWidth = maxAvailableWidth;
        targetHeight = targetWidth / aspectRatio;
      }

      // Only apply minimum width if the image is extremely narrow to ensure controls fit
      const minWidth = Math.min(300, viewportWidth * 0.75);
      if (targetWidth < minWidth && aspectRatio < 0.5) {
        targetWidth = minWidth;
        targetHeight = targetWidth / aspectRatio;
        
        // Re-check height constraint after applying min width
        if (targetHeight > maxAvailableHeight * heightPercentage) {
          targetHeight = maxAvailableHeight * heightPercentage;
          targetWidth = targetHeight * aspectRatio;
        }
      }

      // Ensure a minimum height for portrait images so they scale up if too small
      const minHeight = isMobile 
        ? Math.min(700, maxAvailableHeight * 0.90) // 90% of available height or 700px on mobile
        : Math.min(650, maxAvailableHeight * 0.85); // 85% of available height or 650px on larger screens
      if (targetHeight < minHeight) {
        targetHeight = minHeight;
        targetWidth = targetHeight * aspectRatio;
      }
    }

    return {
      width: Math.round(targetWidth),
      height: Math.round(targetHeight)
    };
  };

  const scaledDimensions = getScaledImageDimensions();

  // Calculate optimal video dimensions
  const getScaledVideoDimensions = () => {
    if (!isVideo || !videoDimensions) {
      return null;
    }

    const { width, height } = videoDimensions;
    const aspectRatio = width / height;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const isLandscape = aspectRatio > 1;
    const isMobile = viewportWidth < 640;
    
    // Footer height + padding - less padding on mobile
    const footerHeight = 80;
    const verticalPadding = isMobile ? 20 : 30;
    const horizontalPadding = isMobile ? 40 : 60;
    const maxAvailableHeight = viewportHeight - footerHeight - verticalPadding;
    const maxAvailableWidth = viewportWidth - horizontalPadding;

    let targetWidth, targetHeight;

    if (isLandscape) {
      // For landscape videos, use maximum viewport space
      const widthPercentage = isMobile ? 0.98 : 0.95;
      targetWidth = Math.min(width, maxAvailableWidth * widthPercentage);
      targetHeight = targetWidth / aspectRatio;

      if (targetHeight > maxAvailableHeight) {
        targetHeight = maxAvailableHeight;
        targetWidth = targetHeight * aspectRatio;
      }
    } else {
      // For portrait videos, prioritize height with special handling for mobile
      const isTablet = viewportWidth >= 640 && viewportWidth < 1024;
      
      let heightPercentage;
      if (isMobile) {
        heightPercentage = 0.98; // 98% on mobile for maximum size
      } else if (isTablet) {
        heightPercentage = 0.95; // 95% on tablet
      } else {
        heightPercentage = 0.95; // 95% on desktop
      }
      
      targetHeight = Math.min(height, maxAvailableHeight * heightPercentage);
      targetWidth = targetHeight * aspectRatio;

      // Ensure minimum width for portrait videos so controls fit
      const minWidth = isMobile ? Math.min(300, viewportWidth * 0.85) : Math.min(350, viewportWidth * 0.80);
      if (targetWidth < minWidth) {
        targetWidth = minWidth;
        targetHeight = targetWidth / aspectRatio;
      }

      // If width still exceeds available space, scale down by width
      if (targetWidth > maxAvailableWidth) {
        targetWidth = maxAvailableWidth;
        targetHeight = targetWidth / aspectRatio;
      }
    }

    return {
      width: Math.round(targetWidth),
      height: Math.round(targetHeight)
    };
  };

  const scaledVideoDimensions = getScaledVideoDimensions();

  if (!file) return null;

  const renderPreviewContent = () => {
    // Images
    if (isImage) {
      // For portrait images, set a minimum width and allow max width to 90vw, but reduce maxHeight for a more balanced look
      let imgStyle;
      if (scaledDimensions && scaledDimensions.height > scaledDimensions.width) {
        // Portrait image - use exact scaled width without extra padding
        imgStyle = {
          width: `${scaledDimensions.width}px`,
          height: `${scaledDimensions.height}px`,
          maxHeight: '75vh',
          objectFit: 'contain',
          borderRadius: '24px 24px 0 0',
          display: 'block',
        };
      } else if (scaledDimensions) {
        imgStyle = {
          width: `${scaledDimensions.width}px`,
          height: `${scaledDimensions.height}px`,
          maxHeight: '75vh', // reduced from 90vh
          maxWidth: '90vw',
          objectFit: 'contain',
          borderRadius: '24px 24px 0 0',
          display: 'block',
        };
      } else {
        imgStyle = {
          maxWidth: '90vw',
          maxHeight: '75vh', // reduced from 90vh
          objectFit: 'contain',
          borderRadius: '24px 24px 0 0',
          display: 'block',
        };
      }
      return (
        <img 
          ref={imageRef}
          src={blobUrl} 
          alt={fileName} 
          className="shadow-2xl block"
          style={imgStyle}
        />
      );
    }

    // Videos
    if (isVideo) {
      return (
        <div className="relative">
          <video 
            ref={videoRef}
            playsInline
            preload="metadata"
            poster=""
            className="shadow-2xl block"
            style={scaledVideoDimensions ? {
              width: `${scaledVideoDimensions.width}px`,
              height: `${scaledVideoDimensions.height}px`,
              borderRadius: '24px 24px 0 0',
              display: 'block',
              objectFit: 'contain'
            } : {
              maxWidth: '75vw',
              maxHeight: '65vh',
              borderRadius: '24px 24px 0 0',
              display: 'block',
              objectFit: 'contain'
            }}
            src={blobUrl}
            onLoadedMetadata={(e) => {
              setDuration(e.target.duration);
              setVideoDimensions({
                width: e.target.videoWidth,
                height: e.target.videoHeight
              });
            }}
            onTimeUpdate={(e) => {
              setCurrentTime(e.target.currentTime);
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onClick={() => {
              if (videoRef.current) {
                if (videoRef.current.paused) {
                  videoRef.current.play();
                } else {
                  videoRef.current.pause();
                }
              }
            }}
          >
            Your browser does not support video playback.
          </video>
          
          {/* Custom Video Controls */}
          <div className="absolute bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-[85%] sm:w-[80%] md:w-[calc(100%-48px)] max-w-full">
            <div className="bg-white/10 backdrop-blur-xl rounded-full border border-white/20 shadow-2xl px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 flex items-center justify-center gap-2 sm:gap-3 md:gap-4 w-full" style={{ boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)' }}>
              {/* Play/Pause Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (videoRef.current) {
                    if (videoRef.current.paused) {
                      videoRef.current.play();
                    } else {
                      videoRef.current.pause();
                    }
                  }
                }}
                className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-all flex-shrink-0"
              >
                {isPlaying ? (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              
              {/* Timeline Slider */}
              <div className="relative flex items-center flex-1 min-w-0">
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={(e) => {
                    const time = parseFloat(e.target.value);
                    setCurrentTime(time);
                    if (videoRef.current) {
                      videoRef.current.currentTime = time;
                    }
                  }}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.8) ${(currentTime / duration) * 100}%, rgba(255,255,255,0.2) ${(currentTime / duration) * 100}%, rgba(255,255,255,0.2) 100%)`,
                    WebkitAppearance: 'none'
                  }}
                />
                <style jsx>{`
                  input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: white;
                    cursor: pointer;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                  }
                  input[type="range"]::-moz-range-thumb {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: white;
                    cursor: pointer;
                    border: none;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                  }
                `}</style>
              </div>
              
              {/* Mute Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (videoRef.current) {
                    videoRef.current.muted = !videoRef.current.muted;
                    setIsMuted(!isMuted);
                  }
                }}
                className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-all flex-shrink-0"
              >
                {isMuted ? (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Audio
    if ([
      'mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'
    ].includes(fileType)) {
      const formatTime = (seconds) => {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
      };

      return (
        <div className="h-full flex items-center justify-center p-4 md:p-8 overflow-auto">
          <div className="max-w-md w-full bg-white/10 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/20 p-6 md:p-8" style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          }}>
            {/* Audio Icon */}
            <div className="flex flex-col items-center mb-6">
              <div className="w-32 h-32 md:w-40 md:h-40 bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 rounded-[2rem] flex items-center justify-center mb-4 shadow-[0_8px_24px_rgba(168,85,247,0.4)] transform hover:scale-105 transition-all duration-500" style={{
                boxShadow: '0 8px 24px rgba(168, 85, 247, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              }}>
                <svg className="w-16 h-16 md:w-20 md:h-20 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                </svg>
              </div>
              <h3 className="text-white text-base md:text-lg font-bold text-center break-all px-2 drop-shadow-lg">
                {fileName}
              </h3>
            </div>

            {/* Hidden Audio Element */}
            <audio 
              ref={audioRef}
              src={blobUrl}
              onLoadedMetadata={(e) => {
                setAudioDuration(e.target.duration);
              }}
              onTimeUpdate={(e) => {
                setAudioCurrentTime(e.target.currentTime);
              }}
              onPlay={() => setAudioPlaying(true)}
              onPause={() => setAudioPlaying(false)}
              onEnded={() => setAudioPlaying(false)}
            />

            {/* Custom Audio Controls */}
            <div className="bg-white/8 backdrop-blur-xl rounded-2xl p-4 border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
              {/* Play/Pause Button */}
              <div className="flex items-center justify-center mb-4">
                <button
                  onClick={() => {
                    if (audioRef.current) {
                      if (audioRef.current.paused) {
                        audioRef.current.play();
                      } else {
                        audioRef.current.pause();
                      }
                    }
                  }}
                  className="w-16 h-16 flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-full transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                  style={{
                    boxShadow: '0 4px 16px rgba(168, 85, 247, 0.4)',
                  }}
                >
                  {audioPlaying ? (
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Timeline */}
              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max={audioDuration || 0}
                  value={audioCurrentTime}
                  onChange={(e) => {
                    const time = parseFloat(e.target.value);
                    setAudioCurrentTime(time);
                    if (audioRef.current) {
                      audioRef.current.currentTime = time;
                    }
                  }}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, rgba(168,85,247,0.8) 0%, rgba(168,85,247,0.8) ${(audioCurrentTime / audioDuration) * 100}%, rgba(255,255,255,0.2) ${(audioCurrentTime / audioDuration) * 100}%, rgba(255,255,255,0.2) 100%)`,
                    WebkitAppearance: 'none'
                  }}
                />
                <style jsx>{`
                  input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%);
                    cursor: pointer;
                    box-shadow: 0 2px 8px rgba(168, 85, 247, 0.5);
                  }
                  input[type="range"]::-moz-range-thumb {
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%);
                    cursor: pointer;
                    border: none;
                    box-shadow: 0 2px 8px rgba(168, 85, 247, 0.5);
                  }
                `}</style>

                {/* Time Display */}
                <div className="flex items-center justify-between text-xs text-white/70 font-medium">
                  <span>{formatTime(audioCurrentTime)}</span>
                  <span>{formatTime(audioDuration)}</span>
                </div>
              </div>

              {/* Volume Control */}
              <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-white/10">
                <button
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.muted = !audioRef.current.muted;
                      setAudioMuted(!audioMuted);
                    }
                  }}
                  className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-all"
                >
                  {audioMuted ? (
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                <span className="text-white/70 text-xs font-medium">Volume</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // PDF
    if (fileType === 'pdf') {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
      const pdfHeight = isMobile ? 'calc(95vh - 80px)' : 'calc(85vh - 80px)'; // Leave space for buttons only
      return (
        <div className="w-auto bg-[#525659] overflow-hidden flex items-center justify-center" style={{ height: pdfHeight, minHeight: '400px' }}>
          <PDFViewer url={blobUrl} fileName={fileName} />
        </div>
      );
    }

    // Text files
    if ([
      'txt', 'md', 'json', 'xml', 'csv', 'log', 'js', 'jsx', 'ts', 'tsx', 'css', 'html', 'py', 'java', 'c', 'cpp', 'h', 'hpp'
    ].includes(fileType)) {
      return (
        <div className="h-full overflow-auto bg-[#1e1e1e] p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-white/60">Loading content...</div>
            </div>
          ) : (
            <pre className="text-white/90 text-sm font-mono leading-relaxed whitespace-pre-wrap break-words">
              {textContent}
            </pre>
          )}
        </div>
      );
    }

    // File Info/Metadata view for unsupported file types
    const formatDate = (blob) => {
      if (blob && blob.lastModifiedDate) {
        return blob.lastModifiedDate.toLocaleString();
      }
      return new Date().toLocaleString();
    };

    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    return (
      <div className="h-full flex items-center justify-center p-4 md:p-8 overflow-auto">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/20 p-6 md:p-8" style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        }}>
          {/* File Icon with Filename */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-[1.5rem] flex items-center justify-center mb-4 shadow-[0_8px_24px_rgba(139,92,246,0.4)] transform hover:scale-105 transition-all duration-500 hover:shadow-[0_12px_32px_rgba(139,92,246,0.6)]" style={{
              boxShadow: '0 8px 24px rgba(139, 92, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
            }}>
              <svg className="w-10 h-10 md:w-12 md:h-12 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-white text-lg md:text-xl font-bold text-center break-all px-2 drop-shadow-lg">
              {fileName}
            </h3>
          </div>

          {/* File Information Grid */}
          <div className="space-y-2.5 mb-6">
            <div className="bg-white/8 backdrop-blur-xl rounded-2xl p-4 border border-white/20 hover:bg-white/12 hover:border-white/30 transition-all duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
              <div className="flex items-center justify-between">
                <span className="text-white/70 text-xs md:text-sm font-medium flex items-center gap-2">
                  <svg className="w-4 h-4 text-white/60" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                  Type
                </span>
                <span className="text-white text-xs md:text-sm font-bold uppercase bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent drop-shadow-sm">.{fileType}</span>
              </div>
            </div>
            
            <div className="bg-white/8 backdrop-blur-xl rounded-2xl p-4 border border-white/20 hover:bg-white/12 hover:border-white/30 transition-all duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
              <div className="flex items-center justify-between">
                <span className="text-white/70 text-xs md:text-sm font-medium flex items-center gap-2">
                  <svg className="w-4 h-4 text-white/60" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
                    <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
                    <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
                  </svg>
                  Size
                </span>
                <span className="text-white text-xs md:text-sm font-bold drop-shadow-sm">{formatBytes(file.size)}</span>
              </div>
            </div>
            
            <div className="bg-white/8 backdrop-blur-xl rounded-2xl p-4 border border-white/20 hover:bg-white/12 hover:border-white/30 transition-all duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
              <div className="flex items-center justify-between">
                <span className="text-white/70 text-xs md:text-sm font-medium flex items-center gap-2">
                  <svg className="w-4 h-4 text-white/60" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  Modified
                </span>
                <span className="text-white text-xs md:text-sm font-bold drop-shadow-sm">{formatDate(file.blob)}</span>
              </div>
            </div>
            
            <div className="bg-white/8 backdrop-blur-xl rounded-2xl p-4 border border-white/20 hover:bg-white/12 hover:border-white/30 transition-all duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-white/70 text-xs md:text-sm font-medium flex items-center gap-2 flex-shrink-0">
                  <svg className="w-4 h-4 text-white/60" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  MIME
                </span>
                <span className="text-white/95 text-xs font-mono text-right break-all drop-shadow-sm">{file.blob?.type || 'application/octet-stream'}</span>
              </div>
            </div>
          </div>

          {/* Info Note */}
          <div className="p-4 rounded-2xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]" style={{
            background: 'linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(245,158,11,0.15) 100%)',
            borderColor: 'rgba(251, 191, 36, 0.3)',
          }}>
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-300 flex-shrink-0 mt-0.5 drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-amber-100 text-sm font-semibold mb-1 drop-shadow-sm">Preview Not Available</p>
                <p className="text-white/80 text-xs leading-relaxed">
                  This file type can't be previewed. Use the download button below to save it.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const isPDF = fileType === 'pdf';

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center ${isImage || isVideo || isPDF ? 'p-0' : 'p-4'}`}
      onClick={onClose}
      style={isImage || isVideo || isPDF ? { background: 'transparent' } : {}}
    >
      {/* Outer wrapper to clip corners */}
      <div style={{ borderRadius: 32, overflow: 'hidden', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)', maxWidth: '100%', maxHeight: '95vh' }}>
        <div 
          className={`${isImage || isVideo || isPDF ? 'bg-transparent shadow-2xl' : 'bg-[#1a1a2e]/98 border border-white/10 shadow-2xl max-w-5xl'} ${isPDF ? '' : 'max-h-[90vh]'} backdrop-blur-xl rounded-3xl ${isImage || isVideo || isPDF ? '' : 'w-full'} overflow-hidden flex flex-col`}
          onClick={e => e.stopPropagation()}
          style={(isImage && imageRef.current) ? { width: `${imageRef.current.offsetWidth}px`, minWidth: 0, marginLeft: 0, marginRight: 0, border: 'none', borderRadius: 0, boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' } : (isImage && scaledDimensions) ? { width: `${scaledDimensions.width}px`, minWidth: 0, marginLeft: 0, marginRight: 0, border: 'none', borderRadius: 0, boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' } : (isVideo && scaledVideoDimensions) ? { width: `${scaledVideoDimensions.width}px` } : isPDF ? { border: 'none', borderRadius: 0, boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' } : {}}
        >
          {/* Render the preview content here */}
          {renderPreviewContent()}
          {/* Action buttons for download and close */}
          <div className="flex flex-row gap-4 justify-center py-4 bg-transparent">
            <button
              onClick={onDownload}
              disabled={isDownloading}
              className="px-6 py-2 bg-emerald-500/60 backdrop-blur-xl hover:bg-emerald-500/80 text-white rounded-full font-semibold text-sm transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl w-32 justify-center border border-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Download file"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="white" xmlns="http://www.w3.org/2000/svg" style={{ minWidth: '20px', minHeight: '20px' }}>
                <path d="M10 3C10.5523 3 11 3.44772 11 4V11.5858L13.2929 9.29289C13.6834 8.90237 14.3166 8.90237 14.7071 9.29289C15.0976 9.68342 15.0976 10.3166 14.7071 10.7071L10.7071 14.7071C10.3166 15.0976 9.68342 15.0976 9.29289 14.7071L5.29289 10.7071C4.90237 10.3166 4.90237 9.68342 5.29289 9.29289C5.68342 8.90237 6.31658 8.90237 6.70711 9.29289L9 11.5858V4C9 3.44772 9.44772 3 10 3Z" />
                <path d="M3 16C3 15.4477 3.44772 15 4 15H16C16.5523 15 17 15.4477 17 16C17 16.5523 16.5523 17 16 17H4C3.44772 17 3 16.5523 3 16Z" />
              </svg>
              {isDownloading ? 'Downloading...' : 'Download'}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-amber-500/60 backdrop-blur-xl hover:bg-amber-500/80 text-white rounded-full font-semibold text-sm transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl w-32 justify-center border border-white/30"
              title="Close preview"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="white" xmlns="http://www.w3.org/2000/svg" style={{ minWidth: '20px', minHeight: '20px' }}>
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
