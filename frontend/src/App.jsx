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

import {
  getFilterOptions,
  getProducts,
  getAllFilteredProducts,
  triggerExcelSync,
  startExportJob,
  getExportProgress,
  getExportDownloadUrl,
} from './services/api';

const initialFilters = {
  lab_grown: '',
  category: [],
  sales_cat1: [],
  sales_cat2: [],
  brand: [],
  tone: [],
  customer: [],
  metal: [],
  color: [],
  set_cd: [],
  concept_by: [],
  creative_by:[],
  weight_by: [],
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
  const [isBackendReady, setIsBackendReady] = useState(false);
  const [activeTab, setActiveTab] = useState('explore'); // 'explore' | 'shortlist'
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

  // Shortlist state: Map of styleCode -> product item
  const [shortlistedMap, setShortlistedMap] = useState(new Map());
  const [cataloguePerRow, setCataloguePerRow] = useState(4);

  // Modals state
  const [zoomCode, setZoomCode] = useState(null);
  const [rmCode, setRmCode] = useState(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [exportModal, setExportModal] = useState({
    isOpen: false,
    exportType: 'row',
    progress: { percent: 0, current: 0, total: 0 },
  });

  const [designerItem, setDesignerItem] = useState(null);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load initial dropdown options once backend is ready
  useEffect(() => {
    if (!isBackendReady) return;
    getFilterOptions()
      .then((opts) => setFilterOptions(opts || {}))
      .catch((err) => console.error('Failed to load filter options:', err));
  }, [isBackendReady]);

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

  // Update view whenever filters, pagination, or tab changes
  useEffect(() => {
    if (!isBackendReady) return;

    if (activeTab === 'explore') {
      fetchExploreProducts();
    } else {
      // In-memory pagination for Shortlist collection
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
  }, [isBackendReady, activeTab, fetchExploreProducts, shortlistedMap, currentPage, pageSize]);

  // Handlers
  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setCurrentPage(1);
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
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.set(code, item);
      }
      return next;
    });
  };

  const handleShortlistAllFiltered = async () => {
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
      setTimeout(() => {
        setShortlistAllBtnText('⭐ Shortlist All Filtered Results');
      }, 2000);
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

  // Export process runner with live polling
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
              progress: {
                percent: prog.percent,
                current: prog.current,
                total: prog.total,
              },
            }));
          } else if (prog.status === 'completed') {
            clearInterval(poll);
            setExportModal((prev) => ({
              ...prev,
              progress: { percent: 100, current: prog.total, total: prog.total },
            }));

            // Download file
            window.location.href = getExportDownloadUrl(job_id);

            setTimeout(() => {
              setExportModal((prev) => ({ ...prev, isOpen: false }));
            }, 600);
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

  return (
    <div className="bg-slate-50 text-slate-900 font-sans min-h-screen flex flex-col">
      {/* Full screen loader until backend finishes background index */}
      {!isBackendReady && <InitialLoader onReady={() => setIsBackendReady(true)} />}

      {/* Navigation Header */}
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
      />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-4 gap-6 flex-1 w-full">
        {/* Sidebar visible only in 'Explore' tab */}
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

        {/* Product Grid and Pagination */}
        <ProductGrid
          items={products}
          totalItems={totalItems}
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          activeTab={activeTab}
          shortlistedMap={shortlistedMap}
          cataloguePerRow={cataloguePerRow}
          onOpenDesigners={(item) => setDesignerItem(item)}
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
          onOpenZoom={(code) => setZoomCode(code)}
          onOpenRmDetails={(code) => setRmCode(code)}
          onExportRowWise={() => runExport('row')}
          onExportCatalogue={() => runExport('catalogue', cataloguePerRow)}
          onOpenClearConfirm={() => {
            if (shortlistedMap.size > 0) setIsClearModalOpen(true);
          }}
        />
      </div>

      {/* Modals */}
      <ImageZoomModal
        isOpen={Boolean(zoomCode)}
        styleCode={zoomCode}
        onClose={() => setZoomCode(null)}
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