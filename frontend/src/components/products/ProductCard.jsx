import React, { useState } from 'react';
import { getProductImageUrl } from '../../services/api';

function formatNumber(val, decimals = 3) {
  if (val === null || val === undefined || isNaN(val)) return '0';
  return Number(val).toFixed(decimals);
}

function getPlaceholderSvg(code) {
  const safeCode = encodeURIComponent(code || '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="180" viewBox="0 0 300 180">
    <rect width="300" height="180" fill="#f8fafc"/>
    <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-size="32">💎</text>
    <text x="50%" y="72%" dominant-baseline="middle" text-anchor="middle" font-size="13" font-family="sans-serif" font-weight="600" fill="#64748b">${safeCode}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export default function ProductCard({
  item,
  isShortlisted,
  onToggleShortlist,
  onOpenZoom,
  onOpenRmDetails,
  onOpenDesigners
}) {
  const styleCode = item.Dmcd || item.drcd || '-';
  const [imgSrc, setImgSrc] = useState(getProductImageUrl(styleCode));
  const [hasError, setHasError] = useState(false);

  const stoneShapes =
    Array.isArray(item.rm_subctgs) && item.rm_subctgs.length
      ? item.rm_subctgs.join(', ')
      : 'None';

  const metalStr = `${item.Dmkt || ''} ${item.DmCol || ''}`.trim() || '-';

  const handleImageError = () => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(getPlaceholderSvg(styleCode));
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
      {/* Image Thumbnail with zoom trigger */}
      <div
        onClick={() => onOpenZoom(styleCode)}
        className="h-44 bg-slate-50 flex items-center justify-center overflow-hidden border-b border-slate-100 p-2 cursor-pointer group"
      >
        <img
          src={imgSrc}
          alt={styleCode}
          loading="lazy"
          onError={handleImageError}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
          style={{
            imageRendering: '-webkit-optimize-contrast',
          }}
        />
      </div>

      {/* Card Details */}
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
        <div>
          {/* Header Row: Style Code & Shortlist Star */}
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <h3
                className="font-bold text-slate-900 text-sm leading-tight truncate"
                title={styleCode}
              >
                {styleCode}
              </h3>
              <span className="text-[10px] text-slate-400 font-medium">
                📅 {item.DmCreatedDt || '-'}
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleShortlist(item);
              }}
              className={`shrink-0 text-[11px] px-2 py-0.5 rounded transition-colors ${
                isShortlisted
                  ? 'bg-amber-400 text-amber-950 font-bold shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
              }`}
            >
              {isShortlisted ? '★ Shortlisted' : '☆ Shortlist'}
            </button>
          </div>

          {/* Category Badges */}
          <div className="flex flex-wrap gap-1 mt-2">
            {item.DmctgDesc && (
              <span
                className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-1.5 py-0.5 rounded border border-indigo-100 truncate max-w-[120px]"
                title={`Category: ${item.DmctgDesc}`}
              >
                {item.DmctgDesc}
              </span>
            )}
            {item.SalctgDesc && (
              <span
                className="text-[10px] bg-slate-100 text-slate-700 font-medium px-1.5 py-0.5 rounded truncate max-w-[120px]"
                title={`Sales Cat 1: ${item.SalctgDesc}`}
              >
                {item.SalctgDesc}
              </span>
            )}
            {item.SalctgDesc2 && (
              <span
                className="text-[10px] bg-slate-100 text-slate-600 font-medium px-1.5 py-0.5 rounded truncate max-w-[120px]"
                title={`Sales Cat 2: ${item.SalctgDesc2}`}
              >
                {item.SalctgDesc2}
              </span>
            )}
          </div>

          {/* Customer, Brand, Tone, Set Code */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[10px] text-slate-500 font-medium">
            {item.Customer && (
              <span className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">
                Cust: {item.Customer}
              </span>
            )}
            {item.Brand && (
              <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                Collection: {item.Brand}
              </span>
            )}
            {item.Tone && (
              <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                Tone: {item.Tone}
              </span>
            )}
            {item.SetCd && (
              <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200">
                Set: {item.SetCd}
              </span>
            )}
          </div>
        </div>

        {/* Specifications Matrix */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100">
          <div>
            <span className="text-slate-400">Metal:</span>{' '}
            <b className="text-slate-700 font-semibold">{metalStr}</b>
          </div>
          <div>
            <span className="text-slate-400">Total Wt:</span>{' '}
            <b className="text-slate-700 font-semibold">{formatNumber(item.Totalwt)}g</b>
          </div>
        </div>

        {/* Raw Material Stones Breakdown Trigger */}
        <div className="space-y-1.5 pt-0.5">
          <div className="flex justify-between items-center text-[10px] text-slate-500 px-0.5">
            <span>
              Stones: <b className="text-slate-700">{formatNumber(item.rm_stones_wt)} CT</b>
            </span>
            <span className="truncate max-w-[130px]" title={stoneShapes}>
              Shapes: <b className="text-slate-700">{stoneShapes}</b>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 pt-1">
        <button 
          type="button" 
          onClick={() => onOpenRmDetails(styleCode)} 
          className="w-full py-1 text-[11px] font-semibold text-indigo-600 bg-indigo-50/70 hover:bg-indigo-100 rounded-md transition-colors flex items-center justify-center gap-1"
        >
          💎 Stones ({item.rm_stones_qty || 0})
        </button>

        <button 
          type="button" 
          onClick={() => onOpenDesigners(item)} 
          className="w-full py-1 text-[11px] font-semibold text-purple-600 bg-purple-50/70 hover:bg-purple-100 rounded-md transition-colors flex items-center justify-center gap-1"
        >
          👤 Designers ▾
        </button>
      </div>
      </div>
    </div>
    </div>
  );
}