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
  onOpenDesigners,
  onBadgeClick,
  filters = {},
}) {

  const isBadgeActive = (key, val) => Array.isArray(filters?.[key]) && filters[key].includes(val);
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
  // Helper for badge style: Grey if not selected, Blue if selected
  const getBadgeClass = (key, val) => {
    const active = isBadgeActive(key, val);
    return active
      ? "bg-blue-600 text-white font-semibold px-1.5 py-0.5 rounded text-[9px] shadow-xs cursor-pointer active:scale-95 transition-all"
      : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 font-medium px-1.5 py-0.5 rounded text-[9px] cursor-pointer active:scale-95 transition-all";
  };
  
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
      {/* 1. Image Thumbnail with Floating Badges & Shortlist Button */}
      <div
        onClick={() => onOpenZoom(styleCode)}
        className="relative h-44 bg-slate-50 flex items-center justify-center overflow-hidden border-b border-slate-100 p-2 cursor-pointer group"
      >
        
        {/* Shortlist Star Button (Floating Top Right) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleShortlist(item);
          }}
          title={isShortlisted ? "Remove from Shortlist" : "Add to Shortlist"}
          className={`absolute top-2 right-2 z-10 w-7 h-7 rounded-full flex items-center justify-center text-sm shadow-sm transition-all ${
            isShortlisted
              ? 'bg-amber-400 text-amber-950 scale-105 ring-2 ring-white'
              : 'bg-white/90 text-slate-400 hover:text-amber-500 hover:bg-white backdrop-blur-xs'
          }`}
        >
          {isShortlisted ? '★' : '☆'}
        </button>

        <img
          src={imgSrc}
          alt={styleCode}
          loading="lazy"
          onError={handleImageError}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
          style={{ imageRendering: '-webkit-optimize-contrast' }}
        />
      </div>

      {/* 2. Tight, High-Density Information Area */}
      <div className="p-2.5 flex-1 flex flex-col justify-between space-y-2">
        <div>
          {/* Card Header: Style Code + Stone Weight on Left, Date on Right */}
  <div className="flex items-center justify-between gap-1 mb-1">
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="font-bold text-slate-900 text-xs tracking-tight truncate">
        {item.Dmcd || item.drcd}
      </span>
      {/* Stone Carats directly next to Style Number (only the value) */}
      {(item.rm_stones_wt > 0 || item.DiaCts > 0) && (
        <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1 py-0.2 rounded border border-slate-200 whitespace-nowrap">
          {Number(item.rm_stones_wt || item.DiaCts || 0).toFixed(3)} CT
        </span>
      )}
    </div>
    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
      {item.DmCreatedDt || "-"}
    </span>
  </div>

          {/* Badges: Category, Sales Categories, Size */}
  <div className="flex flex-wrap gap-1 mt-1">
    {item.DefaultSz && (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onBadgeClick?.('size', item.DefaultSz); }}
        className={getBadgeClass('size', item.DefaultSz)}
      >
        Sz {item.DefaultSz}
      </button>
    )}
    {item.DmctgDesc && (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onBadgeClick?.('category', item.DmctgDesc); }}
        className={getBadgeClass('category', item.DmctgDesc)}
      >
        {item.DmctgDesc}
      </button>
    )}
    {item.SalctgDesc && (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onBadgeClick?.('sales_cat1', item.SalctgDesc); }}
        className={getBadgeClass('sales_cat1', item.SalctgDesc)}
      >
        {item.SalctgDesc}
      </button>
    )}
    {item.SalctgDesc2 && (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onBadgeClick?.('sales_cat2', item.SalctgDesc2); }}
        className={getBadgeClass('sales_cat2', item.SalctgDesc2)}
      >
        {item.SalctgDesc2}
      </button>
    )}
  </div>

  {/* Badges: Customer, Tone, Set Code */}
  {(item.Customer || item.Tone || item.SetCd) && (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      {item.Customer && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onBadgeClick?.('customer', item.Customer); }}
          className={getBadgeClass('customer', item.Customer)}
        >
          Cust: {item.Customer}
        </button>
      )}
      {item.Tone && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onBadgeClick?.('tone', item.Tone); }}
          className={getBadgeClass('tone', item.Tone)}
        >
          Tone: {item.Tone}
        </button>
      )}
      {item.SetCd && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onBadgeClick?.('set_cd', item.SetCd); }}
          className={getBadgeClass('set_cd', item.SetCd)}
        >
          Set: {item.SetCd}
        </button>
      )}
    </div>
  )}
        </div>

        {/* 3. Specifications Strip: Metal | Total Wt | Wax Wt */}
        <div className="grid grid-cols-3 divide-x divide-slate-200 bg-slate-50 py-1.5 px-1 rounded-md border border-slate-100 text-center">
          <div className="px-1">
            <span className="text-[9px] text-slate-400 block uppercase">Metal</span>
            <span className="text-[10px] text-slate-800 font-bold block truncate" title={metalStr}>
              {metalStr}
            </span>
          </div>
          <div className="px-1">
            <span className="text-[9px] text-slate-400 block uppercase">Total Wt</span>
            <span className="text-[10px] text-slate-800 font-bold block">
              {formatNumber(item.Totalwt)}g
            </span>
          </div>
          <div className="px-1">
            <span className="text-[9px] text-slate-400 block uppercase">
              {item.wax_label || 'waxwt'}
            </span>
            <span className="text-[10px] text-slate-800 font-bold block">
              {formatNumber(item.wax_value)}g
            </span>
          </div>
        </div>

          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={() => onOpenRmDetails(styleCode)}
              className="w-full py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 rounded-md transition-colors flex items-center justify-center gap-1 border border-indigo-100"
            >
              💎 Stones ({item.rm_stones_qty || 0})
            </button>

            <button
              type="button"
              onClick={() => onOpenDesigners(item)}
              className="w-full py-1 text-[11px] font-semibold text-purple-700 bg-purple-50/70 hover:bg-purple-100 rounded-md transition-colors flex items-center justify-center gap-1 border border-purple-100"
            >
              👤 Designers ▾
            </button>
          </div>
        </div>
      </div>
    
  );
}