import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import InitialLoader from './components/InitialLoader';
import FilterSidebar from './components/filters/FilterSidebar';
import ProductGrid from './components/products/ProductGrid';
import ImageZoomModal from './components/modals/ImageZoomModal';
import StoneBreakdownModal from './components/modals/StoneBreakdownModal';
import ExportProgressModal from './components/modals/ExportProgressModal';
import ClearConfirmModal from './components/modals/ClearConfirmModal';
import DesignerModal from './components/modals/DesignerModal';
import LoginPage from './components/auth/LoginPage';
import UserManager from './components/admin/UserManager';

import {
  getFilterOptions,
  getProducts,
  getAllFilteredProducts,
  triggerExcelSync,
  startExportJob,
  getExportProgress,
  getExportDownloadUrl,
  getCurrentUser,
  logoutUser,
  getStoredUser,
} from './services/api';

const initialFilters = {
  lab_grown: '',
  only_diamonds: false,
  image_source: '',        
  category: [],
  sales_cat1: [],
  sales_cat2: [],
  brand: [],
  tone: [],
  customer: [],
  metal: [],
  color: [],
  set_cd: [],
  has_set: false,
  size: [],
  concept_by: [],
  creative_by:[],
  weight_by: [],
  min_wax_wt: '',          
  max_wax_wt: '',
  min_pointed_wt: '',
  max_pointed_wt: '',
  start_date: '',
  end_date: '',
  min_total_wt: '',
  max_total_wt: '',
  rm_category: [],
  rm_subcategory: [],
  ln1: '',
  ln2: '',
  min_rm_wt: '',
  max_rm_wt: '',
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());
  const [isVerifyingAuth, setIsVerifyingAuth] = useState(true);

  const [isBackendReady, setIsBackendReady] = useState(false);
  const [activeTab, setActiveTab] = useState('explore'); // 'explore' | 'shortlist' | 'users'
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Filters and Dropdown Options
  const [filterOptions, setFilterOptions] = useState({});
  const [filters, setFilters] = useState(initialFilters);
  const [shortlistAllBtnText, setShortlistAllBtnText] = useState('⭐ Shortlist All Filtered Results');

  // Product Data & Pagination
  const [products, setProducts] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);

  // Shortlist state
  const [shortlistedMap, setShortlistedMap] = useState(new Map());
  const [cataloguePerRow, setCataloguePerRow] = useState(4);

  // Modals state
  const [zoomItem, setZoomItem] = useState(null);
  const [rmCode, setRmCode] = useState(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [exportModal, setExportModal] = useState({
    isOpen: false,
    exportType: 'row',
    progress: { percent: 0, current: 0, total: 0 },
  });

  const [designerItem, setDesignerItem] = useState(null);
  const [isShortlistingAll, setIsShortlistingAll] = useState(false);

  // Verify auth session token on mount & listen for real-time suspensions
  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        if (user) setCurrentUser(user);
        else setCurrentUser(null);
      })
      .catch(() => setCurrentUser(null))
      .finally(() => setIsVerifyingAuth(false));

    // Instant auto-kick handler if suspended or session expires
    const handleUnauthorized = () => {
      setCurrentUser(null);
      setActiveTab('explore');
      alert('Your access has been suspended or your session expired. Please log in again.');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setActiveTab('explore');
  };

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load cascading filter options
  useEffect(() => {
    if (!isBackendReady || !currentUser || activeTab === 'users') return;

    getFilterOptions(filters, debouncedSearch)
      .then((opts) => setFilterOptions(opts || {}))
      .catch((err) => console.error('Failed to load filter options:', err));
  }, [isBackendReady, currentUser, activeTab, filters, debouncedSearch]);

  // Fetch products for "Explore" tab
  const fetchExploreProducts = useCallback(async () => {
    try {
      const data = await getProducts(filters, currentPage, pageSize, debouncedSearch);
      setProducts(data.items || []);
      setTotalItems(data.total_items || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  }, [filters, currentPage, pageSize, debouncedSearch]);

  // Update view on tab or filter change
  useEffect(() => {
    if (!isBackendReady || !currentUser) return;

    if (activeTab === 'explore') {
      fetchExploreProducts();
    } else if (activeTab === 'shortlist') {
      const allShortlisted = Array.from(shortlistedMap.values());
      const total = allShortlisted.length;
      const pages = Math.ceil(total / pageSize) || 1;
      const validPage = Math.max(1, Math.min(currentPage, pages));

      const startIdx = (validPage - 1) * pageSize;
      const pageItems = allShortlisted.slice(startIdx, startIdx + pageSize);
      setProducts(pageItems);
      setTotalItems(total);
      setTotalPages(pages);
      if (validPage !== currentPage) {
        setCurrentPage(validPage);
      }
    }
  }, [isBackendReady, currentUser, activeTab, fetchExploreProducts, shortlistedMap, currentPage, pageSize]);

  // Handlers
  const handleFilterChange = (field, value) => {
  setFilters((prev) => {
    const nextFilters = { ...prev, [field]: value };

    // If 'Only Diamonds' is checked, remove Category 'C' and any 'C' shapes from active filters
    if (field === 'only_diamonds' && value === true) {
      if (Array.isArray(prev.rm_category)) {
        nextFilters.rm_category = prev.rm_category.filter((c) => c !== 'C');
      }
      if (Array.isArray(prev.rm_subcategory)) {
        nextFilters.rm_subcategory = prev.rm_subcategory.filter(
          (shapeStr) => !shapeStr.endsWith(': C')
        );
      }
    }

    // If stone type (rm_category) changes, keep existing shape filtering logic
    if (field === 'rm_category' && Array.isArray(value) && value.length > 0) {
      const currentShapes = Array.isArray(prev.rm_subcategory) ? prev.rm_subcategory : [];
      nextFilters.rm_subcategory = currentShapes.filter((shapeStr) => {
        if (!shapeStr.includes(' : ')) return true;
        const ctg = shapeStr.split(' : ')[1]?.trim();
        return value.includes(ctg);
      });
    }

    return nextFilters;
  });
  setCurrentPage(1);
};

  const handleBadgeClick = (filterKey, value) => {
    if (!value || value === '-') return;
    setFilters((prev) => {
      const currentList = Array.isArray(prev[filterKey]) ? prev[filterKey] : [];
      if (currentList.includes(value)) {
        return { ...prev, [filterKey]: currentList.filter((item) => item !== value) };
      }
      return { ...prev, [filterKey]: [...currentList, value] };
    });
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
    setSearchQuery('');
    setDebouncedSearch('');
    setCurrentPage(1);
  };

  const handleToggleShortlist = (item) => {
    const code = item.Dmcd || item.drcd;
    setShortlistedMap((prev) => {
      const next = new Map(prev);
      if (next.has(code)) next.delete(code);
      else next.set(code, item);
      return next;
    });
  };

  const handleShortlistAllFiltered = async () => {
    setIsShortlistingAll(true);
    setShortlistAllBtnText('⏳ Adding all matching items...');
    try {
      const res = await getAllFilteredProducts(filters, debouncedSearch);
      setShortlistedMap((prev) => {
        const next = new Map(prev);
        (res.items || []).forEach((it) => {
          const code = it.Dmcd || it.drcd;
          next.set(code, it);
        });
        return next;
      });
      setShortlistAllBtnText(`✓ Added ${(res.items || []).length} items!`);
    } catch (e) {
      alert('Failed to shortlist all items: ' + e.message);
      setShortlistAllBtnText('⭐ Shortlist All Filtered Results');
    } finally {
      setIsShortlistingAll(false);
      setTimeout(() => setShortlistAllBtnText('⭐ Shortlist All Filtered Results'), 2000);
    }
  };

  const handleSyncExcel = async () => {
    setIsSyncing(true);
    try {
      await triggerExcelSync();
      handleResetFilters();
      fetchExploreProducts();
    } catch (e) {
      alert('Excel sync failed: ' + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const runExport = async (exportType, perRow = 4) => {
    const items = Array.from(shortlistedMap.values());
    if (items.length === 0) {
      alert('Your shortlist is empty!');
      return;
    }

    setExportModal({
      isOpen: true,
      exportType,
      progress: { percent: 0, current: 0, total: items.length },
    });

    try {
      const { job_id } = await startExportJob(items, exportType, perRow);
      const poll = setInterval(async () => {
        try {
          const prog = await getExportProgress(job_id);
          if (prog.status === 'processing') {
            setExportModal((prev) => ({
              ...prev,
              progress: { percent: prog.percent, current: prog.current, total: prog.total },
            }));
          } else if (prog.status === 'completed') {
            clearInterval(poll);
            setExportModal((prev) => ({
              ...prev,
              progress: { percent: 100, current: prog.total, total: prog.total },
            }));
            window.location.href = getExportDownloadUrl(job_id);
            setTimeout(() => setExportModal((prev) => ({ ...prev, isOpen: false })), 600);
          } else if (prog.status === 'failed') {
            clearInterval(poll);
            setExportModal((prev) => ({ ...prev, isOpen: false }));
            alert('Export failed: ' + prog.error);
          }
        } catch (err) {
          clearInterval(poll);
          setExportModal((prev) => ({ ...prev, isOpen: false }));
          alert('Error checking progress: ' + err.message);
        }
      }, 350);
    } catch (err) {
      setExportModal((prev) => ({ ...prev, isOpen: false }));
      alert('Failed to initiate export: ' + err.message);
    }
  };

  // 1. Initial auth verification check
  if (isVerifyingAuth) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xs font-semibold tracking-wider animate-pulse">
          AUTHENTICATING SESSION...
        </div>
      </div>
    );
  }

  // 2. Gatekeeper: If user is not logged in, show Login Page
  if (!currentUser) {
    return <LoginPage onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="bg-slate-50 text-slate-900 font-sans min-h-screen flex flex-col">
      {!isBackendReady && <InitialLoader onReady={() => setIsBackendReady(true)} />}

      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setCurrentPage(1);
        }}
        shortlistCount={shortlistedMap.size}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSync={handleSyncExcel}
        isSyncing={isSyncing}
        totalItems={totalItems}                              
        onShortlistAllFiltered={handleShortlistAllFiltered}  
        isShortlistingAll={isShortlistingAll}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Render Users Admin Panel when "users" tab is active */}
      {activeTab === 'users' ? (
        <main className="flex-1">
          <UserManager />
        </main>
      ) : (
        /* Regular Explore and Shortlist views */
        <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-4 gap-6 flex-1 w-full">
          {activeTab === 'explore' && (
            <div className="md:col-span-1">
              <FilterSidebar
                options={filterOptions}
                filters={filters}
                onFilterChange={handleFilterChange}
                onReset={handleResetFilters}
                onShortlistAllFiltered={handleShortlistAllFiltered}
                shortlistAllBtnText={shortlistAllBtnText}
              />
            </div>
          )}

          <ProductGrid
            items={products}
            totalItems={totalItems}
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            activeTab={activeTab}
            shortlistedMap={shortlistedMap}
            cataloguePerRow={cataloguePerRow}
            filters={filters}
            onOpenDesigners={(item) => setDesignerItem(item)}
            onBadgeClick={handleBadgeClick}
            setCataloguePerRow={setCataloguePerRow}
            onPageChange={(page) => {
              setCurrentPage(page);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onPageSizeChange={(sz) => {
              setPageSize(sz);
              setCurrentPage(1);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onToggleShortlist={handleToggleShortlist}
            onOpenZoom={(item) => setZoomItem(item)}
            onOpenRmDetails={(code) => setRmCode(code)}
            onExportRowWise={() => runExport('row')}
            onExportCatalogue={() => runExport('catalogue', cataloguePerRow)}
            onOpenClearConfirm={() => {
              if (shortlistedMap.size > 0) setIsClearModalOpen(true);
            }}
          />
        </div>
      )}

      {/* Modals */}
      <ImageZoomModal
        isOpen={Boolean(zoomItem)}
        item={zoomItem}
        onClose={() => setZoomItem(null)}
      />

      <StoneBreakdownModal
        isOpen={Boolean(rmCode)}
        styleCode={rmCode}
        onClose={() => setRmCode(null)}
      />

      <DesignerModal
        isOpen={Boolean(designerItem)}
        item={designerItem}
        onClose={() => setDesignerItem(null)}
      />

      <ExportProgressModal
        isOpen={exportModal.isOpen}
        exportType={exportModal.exportType}
        progress={exportModal.progress}
      />

      <ClearConfirmModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={() => {
          setShortlistedMap(new Map());
          setIsClearModalOpen(false);
        }}
      />
    </div>
  );
}