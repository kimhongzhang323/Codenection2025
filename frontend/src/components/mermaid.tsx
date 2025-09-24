import React, { useEffect, useRef, useState, memo, useCallback, useMemo } from 'react';
import mermaid from 'mermaid';
import Modal from 'react-modal';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

// Initialize mermaid with defaults - Japanese aesthetic
mermaid.initialize({
  startOnLoad: true,
  theme: 'neutral',
  securityLevel: 'loose',
  suppressErrorRendering: true,
  logLevel: 'error',
  maxTextSize: 100000,
  htmlLabels: true,
  flowchart: {
    htmlLabels: true,
    curve: 'basis',
    nodeSpacing: 60,
    rankSpacing: 60,
    padding: 20,
  },
  themeCSS: `
    .node rect, .node circle, .node ellipse, .node polygon, .node path {
      fill: #ffffff;
      stroke: none;
      stroke-width: 0;
    }
    .edgePath .path {
      stroke: #9b7cb9;
      stroke-width: 1.5px;
    }
    .edgeLabel {
      background-color: transparent;
      color: #333333;
    }
    .label {
      color: #333333;
    }
    .cluster rect {
      fill: #ffffff;
      stroke: none;
      stroke-width: 0;
    }
    [data-theme="dark"] .node rect,
    [data-theme="dark"] .node circle,
    [data-theme="dark"] .node ellipse,
    [data-theme="dark"] .node polygon,
    [data-theme="dark"] .node path {
      fill: #ffffff;
      stroke: none;
    }
    [data-theme="dark"] .edgePath .path {
      stroke: #9370db;
    }
    [data-theme="dark"] .edgeLabel {
      color: #f0f0f0;
    }
    [data-theme="dark"] .label {
      color: #f0f0f0;
    }
    [data-theme="dark"] .cluster rect {
      fill: #ffffff;
      stroke: none;
    }
    .clickable {
      transition: all 0.3s ease;
    }
    .clickable:hover {
      transform: scale(1.03);
      cursor: pointer;
    }
  `,
  fontFamily: 'var(--font-geist-sans), var(--font-serif-jp), sans-serif',
  fontSize: 12,
});

interface MermaidProps {
  chart: string;
  className?: string;
}

// Set the app element for react-modal accessibility
if (typeof window !== 'undefined') {
  Modal.setAppElement(document.getElementById('root') || document.body);
}

// Global cache for rendered diagrams - persists across component unmounts
const GLOBAL_DIAGRAM_CACHE = new Map<string, { svg: string; originalSvg?: string; error: string | null }>();

// Zoomable Modal Dialog component for the diagram
const ZoomableModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  svg: string;
}> = memo(({ isOpen, onClose, svg }) => {
  // Calculate responsive initial scale that fits diagram within viewer bounds
  const calculateInitialScale = (svgString: string) => {
    const widthMatch = svgString.match(/width="([^"]*)"/) || svgString.match(/viewBox="[^"]*?\s+[^"]*?\s+([^"]*?)\s+[^"]*?"/);
    const heightMatch = svgString.match(/height="([^"]*)"/) || svgString.match(/viewBox="[^"]*?\s+[^"]*?\s+[^"]*?\s+([^"]*?)"/);
    
    // Modal viewer dimensions (accounting for padding and UI elements)
    const viewerWidth = window.innerWidth * 0.9; // 90% of viewport width
    const viewerHeight = window.innerHeight * 0.8; // 80% of viewport height
    
    console.log('Viewer dimensions:', { viewerWidth, viewerHeight });
    
    if (!widthMatch || !heightMatch) {
      console.log('No dimensions detected, using moderate default scale');
      return 1.5;
    }
    
    const diagramWidth = parseFloat(widthMatch[1]);
    const diagramHeight = parseFloat(heightMatch[1]);
    
    console.log('Diagram dimensions:', { diagramWidth, diagramHeight });
    
    if (!diagramWidth || !diagramHeight) {
      console.log('Invalid dimensions, using moderate default scale');
      return 1.5;
    }
    
    // Calculate scale needed to fit within viewer bounds
    const scaleToFitWidth = viewerWidth / diagramWidth;
    const scaleToFitHeight = viewerHeight / diagramHeight;
    const scaleToFit = Math.min(scaleToFitWidth, scaleToFitHeight);
    
    console.log('Scale calculations:', { scaleToFitWidth, scaleToFitHeight, scaleToFit });
    
    // Determine optimal initial scale based on diagram characteristics
    const aspectRatio = diagramWidth / diagramHeight;
    let targetScale;
    
    if (aspectRatio > 2) {
      // Wide diagrams - can use more of the available space
      targetScale = scaleToFit * 0.95; // Use 95% of available space
    } else if (aspectRatio < 0.5) {
      // Tall diagrams - be more conservative to prevent overflow
      targetScale = scaleToFit * 0.90; // Use 90% of available space
    } else {
      // Square-ish diagrams - balanced approach
      targetScale = scaleToFit * 0.92; // Use 92% of available space
    }
    
    // Ensure minimum readability and maximum bounds
    const finalScale = Math.max(0.5, Math.min(6, targetScale));
    
    console.log('Final scale calculation:', { 
      aspectRatio, 
      targetScale, 
      finalScale,
      diagramType: aspectRatio > 2 ? 'wide' : aspectRatio < 0.5 ? 'tall' : 'square'
    });
    
    return finalScale;
  };
  
  const initialScale = calculateInitialScale(svg);
  const customStyles = {
    overlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      position: 'relative' as const,
      top: 'auto',
      left: 'auto',
      right: 'auto',
      bottom: 'auto',
      width: '95vw',
      height: '95vh',
      maxWidth: '1200px',
      maxHeight: '900px',
      padding: '0',
      border: 'none',
      borderRadius: '12px',
      overflow: 'hidden',
      background: '#374151',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      outline: 'none',
    },
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      style={customStyles}
      contentLabel="Diagram Viewer"
      shouldCloseOnOverlayClick={true}
      shouldCloseOnEsc={true}
    >
      {/* Zoomable content area */}
      <div className="h-full bg-gray-50 dark:bg-gray-900 relative">
        <TransformWrapper
          initialScale={initialScale}
          initialPositionX={0}
          initialPositionY={0}
          minScale={0.2}
          maxScale={8}
          limitToBounds={false}
          centerOnInit={true}
          wheel={{
            step: 0.15,
          }}
          doubleClick={{
            disabled: false,
            mode: 'zoomIn',
            step: 0.7,
          }}
          panning={{
            velocityDisabled: true,
          }}
        >
          {() => (
            <TransformComponent
              wrapperStyle={{
                width: '100%',
                height: '100%',
              }}
              contentStyle={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div 
                dangerouslySetInnerHTML={{ __html: svg }} 
                className="select-none"
              />
            </TransformComponent>
          )}
        </TransformWrapper>
        
        {/* Close button - positioned after TransformWrapper to avoid event conflicts */}
        <button
          onClick={(e) => {
            console.log('Close button clicked');
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
           className="text-white hover:text-gray-300 p-3 cursor-pointer border-none outline-none focus:outline-none transition-colors duration-200"
           aria-label="Close"
           style={{ 
             position: 'absolute',
             top: '16px',
             right: '16px',
             zIndex: 99999,
             pointerEvents: 'auto',
             border: 'none',
             outline: 'none',
             backgroundColor: 'transparent'
           }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </Modal>
  );
});

const Mermaid: React.FC<MermaidProps> = memo(({ chart, className = '' }) => {
  const [svg, setSvg] = useState<string>('');
  const [originalSvg, setOriginalSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const mermaidRef = useRef<HTMLDivElement>(null);
  
  // Use global cache and rendering lock
  const isRenderingRef = useRef(false);
  
  // Memoize the unique ID so it doesn't change on re-renders
  const mermaidId = useMemo(() => 
    `mermaid-${Math.random().toString(36).substring(2, 9)}`, []
  );
  
  // Memoize dark mode detection
  const isDarkMode = useMemo(() => 
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches, []
  );

  // Memoize the cache key to prevent unnecessary effect runs
  const cacheKey = useMemo(() => `${chart}-${isDarkMode}`, [chart, isDarkMode]);
  
  // Check cache immediately and set initial state
  useMemo(() => {
    if (!chart) return;
    
    const cached = GLOBAL_DIAGRAM_CACHE.get(cacheKey);
    if (cached && svg !== cached.svg) {
      setSvg(cached.svg);
      setOriginalSvg(cached.originalSvg || cached.svg);
      setError(cached.error);
    }
  }, [cacheKey, chart, svg]);

  useEffect(() => {
    if (!chart) return;

    // Skip if already cached - this prevents useEffect from running
    const cached = GLOBAL_DIAGRAM_CACHE.get(cacheKey);
    if (cached) {
      return; // Exit early, don't run any rendering logic
    }

    // Prevent multiple simultaneous renders of the same content
    if (isRenderingRef.current) return;

    let isMounted = true;
    isRenderingRef.current = true;

    const renderChart = async () => {
      if (!isMounted) return;

      try {
        setError(null);
        // Only show loading if we don't have any content yet
        if (!svg) {
          setSvg('');
        }

        const { svg: renderedSvg } = await mermaid.render(mermaidId, chart);

        if (!isMounted) return;

        // Store original SVG for modal display
        let modalSvg = renderedSvg;
        if (isDarkMode) {
          modalSvg = modalSvg.replace('<svg ', '<svg data-theme="dark" ');
        }
        
        // Process SVG for component display with size constraints
        let processedSvg = renderedSvg.replace(
          '<svg ', 
          '<svg style="display: block; margin: 0 auto; width: auto; height: auto; max-width: calc(100% - 32px); max-height: 350px;" '
        );
        
        if (isDarkMode) {
          processedSvg = processedSvg.replace('<svg ', '<svg data-theme="dark" ');
        }

        // Cache the result with both versions
        GLOBAL_DIAGRAM_CACHE.set(cacheKey, { svg: processedSvg, originalSvg: modalSvg, error: null });
        
        setSvg(processedSvg);
        setOriginalSvg(modalSvg);
        setError(null);

        setTimeout(() => {
          mermaid.contentLoaded();
        }, 50);
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        if (isMounted) {
          const errorMsg = `Failed to render diagram: ${err instanceof Error ? err.message : String(err)}`;
          
          // Cache the error too
          GLOBAL_DIAGRAM_CACHE.set(cacheKey, { svg: '', originalSvg: '', error: errorMsg });
          
          setError(errorMsg);
          if (mermaidRef.current) {
            mermaidRef.current.innerHTML = `
              <div class="text-red-500 dark:text-red-400 text-xs mb-1">Syntax error in diagram</div>
              <pre class="text-xs overflow-auto p-2 bg-gray-100 dark:bg-gray-800 rounded">${chart}</pre>
            `;
          }
        }
      } finally {
        isRenderingRef.current = false;
      }
    };

    renderChart();

    return () => {
      isMounted = false;
      isRenderingRef.current = false;
    };
  }, [cacheKey, mermaidId]); // Only depend on cache key and mermaid ID

  const handleDiagramClick = useCallback(() => {
    if (!error && svg) {
      setIsDialogOpen(true);
    }
  }, [error, svg]);

  const handleCloseModal = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  if (error) {
    return (
      <div className={`border border-red-300 dark:border-red-600 rounded-md p-4 bg-red-50 dark:bg-red-900/10 ${className}`}>
        <div className="flex items-center mb-3">
          <div className="text-red-600 dark:text-red-400 text-xs font-medium flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Diagram Rendering Error
          </div>
        </div>
        <div ref={mermaidRef} className="text-xs overflow-auto"></div>
        <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
          There is a syntax error in the diagram and it cannot be rendered.
        </div>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className={`flex justify-center items-center p-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-500/70 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-blue-500/70 rounded-full animate-pulse delay-75"></div>
          <div className="w-2 h-2 bg-blue-500/70 rounded-full animate-pulse delay-150"></div>
          <span className="text-gray-600 dark:text-gray-400 text-xs ml-2">Rendering diagram...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`w-full h-[400px] p-4 flex justify-center items-center ${className}`}>
        <div
          ref={mermaidRef}
          className="clickable w-full overflow-visible text-center cursor-zoom-in flex justify-center items-center"
          dangerouslySetInnerHTML={{ __html: svg }}
          onClick={handleDiagramClick}
          title="Click to open in zoomable viewer"
          style={{
            cursor: 'zoom-in',
            height: '350px',
            padding: '0 28px 0 0px',
            boxSizing: 'border-box',
          }}
        />
      </div>
      <ZoomableModal
        isOpen={isDialogOpen}
        onClose={handleCloseModal}
        svg={originalSvg}
      />
    </>
  );
});

Mermaid.displayName = 'Mermaid';

export default Mermaid;