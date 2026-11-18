import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getProductImageUrl } from '../../services/api';

export default function ImageZoomModal({ isOpen, onClose, item, styleCode: legacyCode }) {
  const styleCode =
    typeof item === 'object' && item !== null
      ? item.Dmcd || item.drcd || ''
      : item || legacyCode || '';

  const has500 = item?.has_500 ?? true;
  const hasLd = item?.has_ld ?? false;
  const hasCad = item?.has_cad ?? false;
  const hasBiodata = item?.has_biodata ?? false;

  const getDefaultView = useCallback(() => {
    if (has500) return 'primary';
    if (hasLd) return 'secondary';
    if (hasCad) return 'cad';
    if (hasBiodata) return 'biodata';
    return 'primary';
  }, [has500, hasLd, hasCad, hasBiodata]);

  const [currentView, setCurrentView] = useState(getDefaultView);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isImgLoading, setIsImgLoading] = useState(false);

  const viewportRef = useRef(null);
  const imgRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  // Clamp pan coordinates so the user can never drag the image completely off-screen
  const clampPosition = useCallback((x, y, targetScale) => {
    const vp = viewportRef.current;
    const img = imgRef.current;
    if (!vp || !img) return { x, y };

    const vpRect = vp.getBoundingClientRect();
    const scaledW = img.offsetWidth * targetScale;
    const scaledH = img.offsetHeight * targetScale;

    const maxX = Math.max(0, (scaledW - vpRect.width) / 2 + 80);
    const maxY = Math.max(0, (scaledH - vpRect.height) / 2 + 80);

    return {
      x: Math.min(Math.max(x, -maxX), maxX),
      y: Math.min(Math.max(y, -maxY), maxY),
    };
  }, []);

  // Reset to smart default view whenever modal opens or style changes
  useEffect(() => {
    if (isOpen) {
      setCurrentView(getDefaultView());
    }
  }, [isOpen, styleCode, getDefaultView]);

  // Reset zoom & position when switching between the 4 tabs
  useEffect(() => {
    if (!isOpen) return;
    setIsImgLoading(true);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [isOpen, styleCode, currentView]);

  // Apply smart "Fit Width & Align Top" automatically once a Biodata image finishes loading
  const handleImageLoad = () => {
    setIsImgLoading(false);
    if (currentView === 'biodata' && viewportRef.current && imgRef.current) {
      const vpRect = viewportRef.current.getBoundingClientRect();
      const baseW = imgRef.current.offsetWidth || 1;
      const baseH = imgRef.current.offsetHeight || 1;

      // Stretch comfortably across ~72% of modal width if taller than wide
      const desiredW = Math.min(vpRect.width * 0.72, 920);
      const fitWidthScale = Math.min(Math.max(desiredW / baseW, 1.15), 2.4);
      const scaledH = baseH * fitWidthScale;

      // Start aligned near the top of the document so user reads top-to-bottom naturally
      const topOffsetY = Math.max(0, (scaledH - vpRect.height) / 2 + 24);
      setScale(fitWidthScale);
      setPosition({ x: 0, y: topOffsetY });
    }
  };

  // Keyboard shortcuts: Esc to close, 1-4 for tabs, +/-/0 for zoom
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
      if (e.key === '1' && has500) setCurrentView('primary');
      if (e.key === '2' && hasLd) setCurrentView('secondary');
      if (e.key === '3' && hasCad) setCurrentView('cad');
      if (e.key === '4' && hasBiodata) setCurrentView('biodata');
      if (e.key === '+' || e.key === '=') zoomByFactor(1.25);
      if (e.key === '-') zoomByFactor(0.8);
      if (e.key === '0') resetView();
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, has500, hasLd, hasCad, hasBiodata, scale, position]);

  if (!isOpen || !styleCode) return null;

  const zoomByFactor = (factor, clientX = null, clientY = null) => {
    const nextScale = Math.min(Math.max(scale * factor, 0.5), 8);
    if (nextScale === scale) return;

    if (clientX !== null && clientY !== null && viewportRef.current) {
      // Cursor-targeted zoom: keep the exact point under the mouse cursor stationary
      const rect = viewportRef.current.getBoundingClientRect();
      const cx = clientX - (rect.left + rect.width / 2);
      const cy = clientY - (rect.top + rect.height / 2);
      const ratio = nextScale / scale;
      const nextX = cx - (cx - position.x) * ratio;
      const nextY = cy - (cy - position.y) * ratio;
      setScale(nextScale);
      setPosition(clampPosition(nextX, nextY, nextScale));
    } else {
      setScale(nextScale);
      setPosition((prev) => clampPosition(prev.x, prev.y, nextScale));
    }
  };

  const resetView = () => {
    if (currentView === 'biodata') {
      handleImageLoad();
    } else {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.18 : 0.85;
    zoomByFactor(factor, e.clientX, e.clientY);
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const rawX = e.clientX - dragStartRef.current.x;
    const rawY = e.clientY - dragStartRef.current.y;
    if (Math.abs(rawX - position.x) > 4 || Math.abs(rawY - position.y) > 4) {
      hasMovedRef.current = true;
    }
    setPosition(clampPosition(rawX, rawY, scale));
  };

  const handleMouseUp = (e) => {
    const wasClick = isDragging && !hasMovedRef.current;
    setIsDragging(false);

    // Single click toggles between default fit and 2.5x zoom right on the clicked spot
    if (wasClick) {
      const isDefault = currentView === 'biodata' ? scale > 1.8 : scale > 1.15;
      if (isDefault) {
        resetView();
      } else {
        zoomByFactor(2.4 / scale, e.clientX, e.clientY);
      }
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="relative w-full max-w-6xl h-[90vh] bg-slate-900 rounded-2xl overflow-hidden flex flex-col border border-slate-700 shadow-2xl">
        {/* Clean Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-slate-800 bg-slate-950 text-white select-none">
          {/* Left: Style code */}
          <div className="flex items-center gap-2.5">
            <h3 className="font-bold text-base tracking-wide">{styleCode}</h3>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Click or scroll to zoom • Drag to pan
            </span>
          </div>

          {/* Center: 4-Tab View Switcher */}
          <div className="flex items-center bg-slate-900 border border-slate-700 p-0.5 rounded-lg text-xs font-medium">
            <button
              type="button"
              disabled={!has500}
              onClick={() => setCurrentView('primary')}
              title="3D Render / 500x500 (Press 1)"
              className={`px-3 py-1.5 rounded-md transition-all ${
                currentView === 'primary'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : has500
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer'
                  : 'text-slate-600 cursor-not-allowed'
              }`}
            >
              500x500
            </button>

            <button
              type="button"
              disabled={!hasLd}
              onClick={() => setCurrentView('secondary')}
              title="Sketch / LD (Press 2)"
              className={`px-3 py-1.5 rounded-md transition-all ${
                currentView === 'secondary'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : hasLd
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer'
                  : 'text-slate-600 cursor-not-allowed'
              }`}
            >
              Sketch (LD)
            </button>

            <button
              type="button"
              disabled={!hasCad}
              onClick={() => setCurrentView('cad')}
              title="CAD Technical Model (Press 3)"
              className={`px-3 py-1.5 rounded-md flex items-center gap-1 transition-all ${
                currentView === 'cad'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : hasCad
                  ? 'text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 cursor-pointer'
                  : 'text-slate-600 cursor-not-allowed'
              }`}
            >
              <span>📐 CAD</span>
            </button>

            <button
              type="button"
              disabled={!hasBiodata}
              onClick={() => setCurrentView('biodata')}
              title="Style Biodata Sheet (Press 4)"
              className={`px-3 py-1.5 rounded-md flex items-center gap-1 transition-all ${
                currentView === 'biodata'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : hasBiodata
                  ? 'text-amber-400 hover:text-amber-300 hover:bg-slate-800 cursor-pointer'
                  : 'text-slate-600 cursor-not-allowed'
              }`}
            >
              <span>📄 Biodata</span>
            </button>
          </div>

          {/* Right: Close Button */}
          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-lg font-bold w-8 h-8 flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Interactive Viewport */}
        <div
          ref={viewportRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => setIsDragging(false)}
          onContextMenu={(e) => e.preventDefault()}
          className={`flex-1 overflow-hidden relative flex items-center justify-center bg-slate-950 select-none ${
            isDragging ? 'cursor-grabbing' : scale > 1.05 ? 'cursor-grab' : 'cursor-zoom-in'
          }`}
        >
          {isImgLoading && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/75 text-slate-200 pointer-events-none">
              <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mb-2" />
              <span className="text-xs font-medium">
                {currentView === 'biodata' ? 'Loading Biodata sheet...' : 'Loading image...'}
              </span>
            </div>
          )}

          <div
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: isDragging ? 'none' : 'transform 120ms cubic-bezier(0.2, 0, 0, 1)',
            }}
            className="origin-center will-change-transform"
          >
            <img
              ref={imgRef}
              key={`${styleCode}_${currentView}`}
              src={getProductImageUrl(styleCode, true, currentView)}
              alt={`${styleCode} (${currentView})`}
              onLoad={handleImageLoad}
              onError={() => setIsImgLoading(false)}
              draggable={false}
              className="max-h-[76vh] max-w-[84vw] object-contain select-none pointer-events-none rounded shadow-2xl bg-white"
              style={{
                imageRendering: '-webkit-optimize-contrast',
                display: 'block',
              }}
            />
          </div>

          {/* Floating Bottom Control Pill */}
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-2.5 py-1.5 rounded-full shadow-xl text-white select-none"
          >
            <button
              type="button"
              onClick={() => zoomByFactor(0.8)}
              title="Zoom Out (-)"
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-800 text-base font-bold transition-colors cursor-pointer"
            >
              −
            </button>

            <span className="px-2.5 text-xs font-mono font-semibold text-slate-200 min-w-[54px] text-center">
              {Math.round(scale * 100)}%
            </span>

            <button
              type="button"
              onClick={() => zoomByFactor(1.25)}
              title="Zoom In (+)"
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-800 text-base font-bold transition-colors cursor-pointer"
            >
              +
            </button>

            <div className="w-px h-4 bg-slate-700 mx-1" />

            <button
              type="button"
              onClick={resetView}
              title="Reset View (0)"
              className="px-2.5 py-1 rounded-full text-[11px] font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}