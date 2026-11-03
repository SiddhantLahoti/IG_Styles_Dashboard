import React from 'react';
import ProductCard from './ProductCard';

export default function ProductGrid({
  items = [],
  totalItems = 0,
  currentPage = 1,
  totalPages = 1,
  pageSize = 24,
  activeTab = 'explore',
  shortlistedMap = new Map(),
  cataloguePerRow = 4,
  setCataloguePerRow,
  onPageChange,
  onPageSizeChange,
  onToggleShortlist,
  onOpenZoom,
  onOpenRmDetails,
  onOpenDesigners,
  onExportRowWise,
  onExportCatalogue,
  onOpenClearConfirm,
  onBadgeClick,
  filters
}) {
  const isShortlistTab = activeTab === 'shortlist';
  // Computes a sliding window of up to 10 visible page buttons
  const getPageNumbers = () => {
    const maxVisible = 10;
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = start + maxVisible - 1;

    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - maxVisible + 1);
    }

    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <main className={`${isShortlistTab ? 'md:col-span-4' : 'md:col-span-3'} space-y-4`}>
      {/* Top Bar: Action Toolbar on Left, Per-Page on Right */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        
        {/* Left Side: Shortlist Actions (Only visible in Shortlist tab) */}
        <div className="flex items-center gap-2">
          {activeTab === 'shortlist' ? (
            <div className="flex flex-wrap items-center gap-2">
              
              
             {/* Export Buttons */}
              <button
                type="button"
                onClick={onExportRowWise}
                className="px-2.5 py-1 text-xs font-medium bg-white text-slate-700 border border-slate-300 rounded hover:bg-slate-50 cursor-pointer transition-all"
              >
                📥 Export Excel
              </button>

              {/* Grouped Export Catalogue Button + Per Row Selector */}
              <div className="flex items-center rounded border border-slate-300 bg-white shadow-2xs overflow-hidden">
                <button
                  type="button"
                  onClick={onExportCatalogue}
                  className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
                  title={`Export Excel catalogue with ${cataloguePerRow} items per row`}
                >
                  📑 Export Catalogue
                </button>

                <div className="flex items-center border-l border-slate-200 bg-slate-50 px-1.5 py-0.5">
                  <select
                    value={cataloguePerRow}
                    onChange={(e) => setCataloguePerRow(Number(e.target.value))}
                    className="text-xs font-semibold text-slate-700 bg-transparent border-none focus:outline-hidden cursor-pointer"
                    title="Choose number of cards per row"
                  >
                    <option value={3}>3 / row</option>
                    <option value={4}>4 / row</option>
                    <option value={5}>5 / row</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenClearConfirm}
                className="px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded border border-transparent hover:border-red-200 cursor-pointer transition-all"
              >
                Clear All
              </button>
            </div>
          ) : (
            /* In 'all' tab, keep empty since total count is in the top header */
            <div />
          )}
        </div>

        {/* Right Side: Per Page Selector (Always stays visible) */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="border border-slate-200 rounded px-2 py-1 bg-white text-slate-700 font-medium focus:outline-hidden cursor-pointer"
          >
            <option value={12}>12</option>
            <option value={24}>24</option>
            <option value={48}>48</option>
            <option value={96}>96</option>
          </select>
        </div>

      </div>

      {/* Product Cards Grid */}
      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center text-slate-400 text-sm">
          {isShortlistTab
            ? 'No designs in your shortlist yet. Star designs from the Explore tab to add them here.'
            : 'No designs match your selected criteria.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const code = item.Dmcd || item.drcd;
            return (
              <ProductCard
                key={code}
                item={item}
                isShortlisted={shortlistedMap.has(code)}
                onToggleShortlist={onToggleShortlist}
                onOpenZoom={onOpenZoom}
                filters={filters}
                onOpenRmDetails={onOpenRmDetails}
                onOpenDesigners={onOpenDesigners} 
                onBadgeClick={onBadgeClick} 
              />
            );
          })}
        </div>
      )}

      {/* Pagination Footer: 10 Visible Page Blocks */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-1.5 py-6 mt-4 border-t border-slate-200">
          {/* First & Prev Buttons */}
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="px-2.5 py-1 text-xs font-medium rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="First Page"
          >
            « First
          </button>
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-2.5 py-1 text-xs font-medium rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            ‹ Prev
          </button>

          {/* 10 Page Number Blocks */}
          {getPageNumbers().map((pageNumber) => {
            const isActive = pageNumber === currentPage;
            return (
              <button
                key={pageNumber}
                type="button"
                onClick={() => onPageChange(pageNumber)}
                className={`min-w-[32px] h-8 px-2 text-xs font-semibold rounded border transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                {pageNumber}
              </button>
            );
          })}

          {/* Next & Last Buttons */}
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-2.5 py-1 text-xs font-medium rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Next ›
          </button>
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="px-2.5 py-1 text-xs font-medium rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Last Page"
          >
            Last »
          </button>
        </div>
      )}
    </main>
  );
}