import React, { useState, useEffect, useRef } from 'react';
import { getProductImageUrl } from '../../services/api';

export default function ImageZoomModal({ isOpen, onClose, item, styleCode: legacyCode }) {
  // Support both item object and legacy string styleCode
  const styleCode = typeof item === 'object' && item !== null 
    ? (item.Dmcd || item.drcd || '') 
    : (item || legacyCode || '');

  const has500 = item?.has_500 ?? true;
  const hasLd = item?.has_ld ?? false;
  const hasCad = item?.has_cad ?? false;

  // Determine initial default view based on availability
  const getDefaultView = () => {
    if (has500) return 'primary';
    if (hasLd) return 'secondary';
    if (hasCad) return 'cad';
    return 'primary';
  };

  const [currentView, setCurrentView] = useState(getDefaultView);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Reset zoom, position, and active view when modal opens or style changes
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setCurrentView(getDefaultView());
    }
  }, [isOpen, styleCode, has500, hasLd, hasCad]);

  // Keyboard navigation: Escape to close, 1/2/3 to switch views
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
      if (e.key === '1' && has500) setCurrentView('primary');
      if (e.key === '2' && hasLd) setCurrentView('secondary');
      if (e.key === '3' && hasCad) setCurrentView('cad');
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, has500, hasLd, hasCad]);

  if (!isOpen || !styleCode) return null;

  const handleWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.2 : 0.8;
    setScale((prev) => Math.min(Math.max(prev * factor, 0.4), 10));
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="relative w-full max-w-5xl h-[88vh] bg-slate-900 rounded-2xl overflow-hidden flex flex-col border border-slate-700 shadow-2xl">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-slate-800 bg-slate-950 text-white select-none">
          {/* Left: Style code and zoom percentage */}
          <div>
            <h3 className="font-bold text-base tracking-wide flex items-center gap-2">
              <span>{styleCode}</span>
              <span className="text-[11px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded font-mono">
                {Math.round(scale * 100)}%
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Scroll to zoom • Drag to pan • Keys 1, 2, 3</p>
          </div>

          {/* Center: Multi-View Toggle Bar */}
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
          </div>

          {/* Right: Zoom Controls and Close */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(s / 1.3, 0.4))}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-sm font-bold border border-slate-600 transition-colors cursor-pointer"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => {
                setScale(1);
                setPosition({ x: 0, y: 0 });
              }}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs border border-slate-600 transition-colors cursor-pointer"
            >
              Fit View
            </button>
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(s * 1.3, 10))}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-sm font-bold border border-slate-600 transition-colors cursor-pointer"
            >
              +
            </button>
            <button
              type="button"
              onClick={onClose}
              className="ml-3 text-slate-400 hover:text-white text-xl font-bold px-2 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Viewport */}
        <div
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="flex-1 overflow-hidden relative flex items-center justify-center cursor-grab active:cursor-grabbing bg-slate-950 p-6 select-none"
        >
          <div
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: isDragging ? 'none' : 'transform 75ms ease-out',
            }}
            className="origin-center"
          >
            <img
              key={`${styleCode}_${currentView}`}
              src={getProductImageUrl(styleCode, true, currentView)}
              alt={`${styleCode} (${currentView})`}
              className="max-h-[70vh] max-w-[80vw] object-contain select-none pointer-events-none rounded shadow-lg bg-white"
              style={{
                imageRendering: '-webkit-optimize-contrast',
                display: 'block',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}