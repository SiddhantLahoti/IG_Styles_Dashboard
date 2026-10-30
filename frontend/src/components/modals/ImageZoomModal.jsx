import React, { useState, useEffect, useRef } from 'react';
import { getProductImageUrl } from '../../services/api';

export default function ImageZoomModal({ isOpen, onClose, styleCode }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, styleCode]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-950 text-white select-none">
          <div>
            <h3 className="font-bold text-base tracking-wide flex items-center gap-2">
              <span>{styleCode}</span>
              <span className="text-[11px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded font-mono">
                {Math.round(scale * 100)}%
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Scroll wheel to zoom • Drag to pan</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(s / 1.3, 0.4))}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-sm font-bold border border-slate-600 transition-colors"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => {
                setScale(1);
                setPosition({ x: 0, y: 0 });
              }}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs border border-slate-600 transition-colors"
            >
              Fit View
            </button>
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(s * 1.3, 10))}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-sm font-bold border border-slate-600 transition-colors"
            >
              +
            </button>
            <button
              type="button"
              onClick={onClose}
              className="ml-4 text-slate-400 hover:text-white text-xl font-bold px-2 transition-colors"
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
              src={getProductImageUrl(styleCode, true)}
              alt={styleCode}
              className="max-w-none select-none pointer-events-none rounded shadow-lg bg-white"
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