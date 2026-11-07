import React from 'react';

export default function Navbar({
  activeTab,
  setActiveTab,
  shortlistCount,
  searchQuery,
  setSearchQuery,
  totalItems = 0,
  onShortlistAllFiltered,
  isShortlistingAll = false,
  currentUser,
  onLogout,
}) {
  const isAdmin = currentUser?.role === 'admin';
  const [localSearch, setLocalSearch] = React.useState(searchQuery || '');

  React.useEffect(() => {
    setLocalSearch(searchQuery || '');
  }, [searchQuery]);

  const commitSearch = () => {
    if (localSearch !== searchQuery) {
      setSearchQuery(localSearch);
    }
  };
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Brand */}
        <div>
          <h1 className="text-xl font-bold text-slate-800">Inter Gold Styles</h1>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('explore')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'explore'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Explore All
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('shortlist')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'shortlist'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>★ Shortlisted</span>
            {shortlistCount > 0 && (
              <span className="bg-indigo-600 text-white rounded-full px-1.5 py-0.2 text-[10px] font-bold">
                {shortlistCount}
              </span>
            )}
          </button>

          {/* Admin Tab (Visible only to admin) */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-white text-purple-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>👥 Users</span>
            </button>
          )}
        </div>

        {/* Center/Right Header Controls (Only when in explore tab) */}
        {activeTab !== 'users' && (
          <div className="flex items-center gap-2.5">
            <div className="text-xs font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-md whitespace-nowrap">
              <span className="font-bold text-slate-800">{(totalItems || 0).toLocaleString()}</span> designs
            </div>

            {activeTab === 'explore' && (
              <button
                type="button"
                onClick={onShortlistAllFiltered}
                disabled={isShortlistingAll || totalItems === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 active:scale-95 transition-all shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
                title="Shortlist all designs matching current filters"
              >
                <span>⭐</span>
                {isShortlistingAll ? 'Shortlisting...' : 'Shortlist All Filtered'}
              </button>
            )}
          </div>
        )}

        {/* Search Input (Only when browsing products) */}
        {activeTab !== 'users' && (
          <div className="flex-1 max-w-xs">
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onBlur={commitSearch}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitSearch();
                  e.target.blur();
                }
              }}
              placeholder="Search Code, Category... (Press Enter)"
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        {/* User Info & Logout Button */}
        <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
          <div className="text-right hidden sm:block">
            <p className="text-[11px] font-bold text-slate-700 leading-tight">{currentUser?.username}</p>
            <p className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">{currentUser?.role}</p>
          </div>
          <button
            onClick={onLogout}
            title="Sign out"
            className="px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}