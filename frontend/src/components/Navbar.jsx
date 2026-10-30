import React from 'react';

export default function Navbar({
  activeTab,
  setActiveTab,
  shortlistCount,
  searchQuery,
  setSearchQuery,
  onSync,
  isSyncing,
}) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Brand */}
        <div>
          <h1 className="text-xl font-bold text-slate-800">Intergold Styles</h1>
          <p className="text-xs text-slate-500">Live dynamic Excel sync</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('explore')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'explore'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Explore All
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('shortlist')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'shortlist'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>★ Shortlisted Collection</span>
            {shortlistCount > 0 && (
              <span className="bg-indigo-600 text-white rounded-full px-1.5 py-0.2 text-[10px] font-bold">
                {shortlistCount}
              </span>
            )}
          </button>
        </div>

        {/* Search Input */}
        <div className="flex-1 max-w-xs">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Code, Category..."
            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Sync Excel Button */}
        {/* <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSync}
            disabled={isSyncing}
            className="px-3 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 rounded-lg border border-indigo-200 transition-colors"
          >
            {isSyncing ? '⏳ Syncing...' : '🔄 Sync Excel'}
          </button>
        </div> */}
      </div>
    </header>
  );
}