import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Set worker from the imported module
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// Suppress verbose warnings
pdfjsLib.GlobalWorkerOptions.verbosity = pdfjsLib.VerbosityLevel.ERRORS;

export default function PDFViewer({ url, fileName }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const renderTaskRef = useRef(null); // Track ongoing render task
  const currentPageRef = useRef(1); // Track current page being rendered
  const [pdf, setPdf] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [canvasWidth, setCanvasWidth] = useState(0);

  useEffect(() => {
    if (!url) return;

    const loadPDF = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // For blob URLs, we need to fetch and convert to typed array
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        
        const loadingTask = pdfjsLib.getDocument({
          data: arrayBuffer,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true,
          standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/',
          disableFontFace: false,
          useSystemFonts: true
        });
        const pdfDoc = await loadingTask.promise;
        setPdf(pdfDoc);
        setNumPages(pdfDoc.numPages);
        setLoading(false);
      } catch (error) {
        console.error('Error loading PDF:', error);
        setError(error.message || 'Failed to load PDF');
        setLoading(false);
      }
    };

    loadPDF();
  }, [url]);

  useEffect(() => {
    if (!pdf || !canvasRef.current || !containerRef.current) return;

    // Store the page we're trying to render
    currentPageRef.current = pageNum;

    const renderPage = async () => {
      try {
        // Cancel any ongoing render task immediately
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch (e) {
            // Ignore cancellation errors
          }
          renderTaskRef.current = null;
          // Give a small delay to ensure cancellation completes
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        // Check if page changed while we were cancelling
        if (currentPageRef.current !== pageNum) {
          return;
        }

        const page = await pdf.getPage(pageNum);
        
        // Check again if page changed during page load
        if (currentPageRef.current !== pageNum) {
          return;
        }

        const container = containerRef.current;
        const canvas = canvasRef.current;
        
        if (!container || !canvas) {
          return;
        }

        const containerWidth = container.clientWidth;
        
        // Calculate scale to fit width with device pixel ratio for crisp rendering
        const unscaledViewport = page.getViewport({ scale: 1 });
        const devicePixelRatio = window.devicePixelRatio || 1;
        
        // Determine optimal width based on viewport and PDF aspect ratio
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const isMobile = viewportWidth < 640;
        
        // Calculate max available dimensions (leaving space for buttons)
        const maxWidth = isMobile ? viewportWidth * 0.95 : Math.min(viewportWidth * 0.85, 1000);
        const maxHeight = viewportHeight * 0.85; // Leave space for buttons
        
        // Scale to fit within available space while maintaining aspect ratio
        const widthScale = maxWidth / unscaledViewport.width;
        const heightScale = maxHeight / unscaledViewport.height;
        const scale = Math.min(widthScale, heightScale) * Math.min(devicePixelRatio, 2); // Cap at 2x for performance
        
        const viewport = page.getViewport({ scale });
        
        const context = canvas.getContext('2d', { willReadFrequently: false, alpha: false });
        
        // Clear canvas before rendering
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // Set canvas dimensions
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Also set CSS height to ensure proper rendering
        canvas.style.height = `${viewport.height}px`;
        canvas.style.width = `${viewport.width}px`;
        
        setCanvasWidth(viewport.width);

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };

        // Check one more time before starting render
        if (currentPageRef.current !== pageNum) {
          return;
        }

        // Start render and store the task
        renderTaskRef.current = page.render(renderContext);
        await renderTaskRef.current.promise;
        
        // Only clear if this is still the current page
        if (currentPageRef.current === pageNum) {
          renderTaskRef.current = null;
        }
      } catch (error) {
        // Ignore cancellation errors
        if (error.name === 'RenderingCancelledException') {
          return;
        }
        console.error('Error rendering page:', error);
        setError(error.message || 'Failed to render page');
      }
    };

    renderPage();

    // Cleanup function to cancel render on unmount or page change
    return () => {
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {
          // Ignore
        }
        renderTaskRef.current = null;
      }
    };
  }, [pdf, pageNum]);

  const goToPrevPage = () => {
    if (pageNum > 1) {
      setPageNum((prev) => prev - 1);
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    }
  };

  const goToNextPage = () => {
    if (pageNum < numPages) {
      setPageNum((prev) => prev + 1);
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#525659]">
        <div className="text-white/70">Loading PDF...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#525659] px-4">
        <div className="w-20 h-20 bg-gradient-to-br from-red-400/20 to-red-600/20 rounded-2xl flex items-center justify-center mb-4 shadow-lg border border-red-400/20">
          <svg className="w-10 h-10 text-red-300" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="text-white/90 text-sm mb-2">Unable to preview PDF</div>
        <div className="text-white/50 text-xs text-center max-w-xs">{error}</div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full bg-black">
      {/* PDF Canvas Container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden bg-white flex justify-center"
        style={{ 
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(0,0,0,0.3) transparent',
          minHeight: 0
        }}
      >
        <canvas 
          ref={canvasRef} 
          style={{ 
            display: 'block',
            maxWidth: '100%',
            height: 'auto',
            margin: '0 auto'
          }}
        />
      </div>

      {/* Simple Navigation Controls */}
      {numPages > 1 && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 flex justify-center pointer-events-none w-full px-6">
          <div className="flex items-center gap-6 px-8 py-2.5 bg-black/40 backdrop-blur-xl rounded-full border border-white/20 shadow-2xl pointer-events-auto max-w-md sm:max-w-lg md:max-w-xl mx-auto w-full justify-between">
            <button
              onClick={goToPrevPage}
              disabled={pageNum <= 1}
              className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 active:bg-white/25 disabled:opacity-30 disabled:cursor-not-allowed rounded-full text-white transition-all shadow-md"
              style={{ transition: 'background 0.2s' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1 flex items-center justify-center select-none">
              <span className="text-white/90 text-[15px] font-medium whitespace-nowrap drop-shadow-md px-1">
                Page {pageNum} of {numPages}
              </span>
            </div>
            <button
              onClick={goToNextPage}
              disabled={pageNum >= numPages}
              className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 active:bg-white/25 disabled:opacity-30 disabled:cursor-not-allowed rounded-full text-white transition-all shadow-md"
              style={{ transition: 'background 0.2s' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
