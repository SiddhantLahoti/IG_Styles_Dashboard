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
}) {
  const isShortlistTab = activeTab === 'shortlist';

  return (
    <main className={`${isShortlistTab ? 'md:col-span-4' : 'md:col-span-3'} space-y-4`}>
      {/* Top Action Bar */}
      <div className="flex flex-wrap justify-between items-center gap-2 text-sm text-slate-500 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <span className="font-medium text-xs text-slate-700">
          {isShortlistTab
            ? `Shortlisted Collection: Showing ${totalItems.toLocaleString()} total designs`
            : `Showing ${totalItems.toLocaleString()} total designs`}
        </span>

        <div className="flex flex-wrap items-center gap-2">
          {/* Shortlist Tab Export Actions */}
          {isShortlistTab && (
            <>
              <button
                type="button"
                onClick={onExportRowWise}
                className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                📥 Download Excel (Row-wise)
              </button>

              <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 p-1 rounded-lg">
                <span className="text-[11px] font-semibold text-indigo-900 pl-1">Catalogue:</span>
                <select
                  value={cataloguePerRow}
                  onChange={(e) => setCataloguePerRow(Number(e.target.value))}
                  className="text-xs border border-indigo-300 rounded px-1.5 py-0.5 bg-white font-medium text-slate-700"
                >
                  <option value={3}>3 per row</option>
                  <option value={4}>4 per row</option>
                  <option value={5}>5 per row</option>
                </select>
                <button
                  type="button"
                  onClick={onExportCatalogue}
                  className="px-3 py-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded shadow-sm transition-colors flex items-center gap-1"
                >
                  🖼️ Download (Catalogue)
                </button>
              </div>

              <button
                type="button"
                onClick={onOpenClearConfirm}
                className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors font-medium"
              >
                Clear All
              </button>
            </>
          )}

          {/* Page Size Selector */}
          <div className="flex items-center gap-1.5 ml-1">
            <label htmlFor="pageSizeSelect" className="text-xs text-slate-600">
              Per page:
            </label>
            <select
              id="pageSizeSelect"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="text-xs border border-slate-300 rounded p-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value={24}>24</option>
              <option value={48}>48</option>
              <option value={96}>96</option>
            </select>
          </div>
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
                onOpenRmDetails={onOpenRmDetails}
                onOpenDesigners={onOpenDesigners}  
              />
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex items-center justify-between border-t border-slate-200 pt-4 bg-white p-4 rounded-xl shadow-sm">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50 disabled:opacity-40 transition-colors"
        >
          Previous
        </button>
        <span className="text-xs text-slate-600 font-medium">
          Page {currentPage} of {totalPages || 1}
        </span>
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50 disabled:opacity-40 transition-colors"
        >
          Next
        </button>
      </div>
    </main>
  );
}