// Helper to construct query params cleanly, handling multi-select arrays and numeric values
function buildQueryParams(filters, page = 1, pageSize = 24, search = '') {
  const params = new URLSearchParams();

  if (page) params.append('page', page);
  if (pageSize) params.append('page_size', pageSize);
  if (search && search.trim()) params.append('search', search.trim());

  // Range & single inputs
  const singleFields = [
    'start_date', 'end_date', 'min_total_wt', 'max_total_wt',
    'ln1', 'ln2', 'min_rm_wt', 'max_rm_wt', 'lab_grown'
  ];

  singleFields.forEach((field) => {
    if (filters[field] !== undefined && filters[field] !== null && filters[field] !== '') {
      params.append(field, filters[field]);
    }
  });

  // Multi-select dropdown arrays
  const arrayFields = [
    { key: 'category', queryKey: 'category' },
    { key: 'sales_cat1', queryKey: 'sales_cat1' },
    { key: 'sales_cat2', queryKey: 'sales_cat2' },
    { key: 'brand', queryKey: 'brand' },
    { key: 'tone', queryKey: 'tone' },
    { key: 'customer', queryKey: 'customer' },
    { key: 'metal', queryKey: 'metal' },
    { key: 'color', queryKey: 'color' },
    { key: 'set_cd', queryKey: 'set_cd' },
    { key: 'concept_by', queryKey: 'concept_by' },
    { key: 'creative_by', queryKey: 'creative_by' },
    { key: 'weight_by', queryKey: 'weight_by' },
    { key: 'rm_category', queryKey: 'rm_category' },
    { key: 'rm_subcategory', queryKey: 'rm_subcategory' },
  ];

  arrayFields.forEach(({ key, queryKey }) => {
    if (Array.isArray(filters[key])) {
      filters[key].forEach((val) => params.append(queryKey, val));
    }
  });

  return params.toString();
}

// 1. Initial Sync Status
export async function getSyncStatus() {
  const res = await fetch('/api/status');
  if (!res.ok) throw new Error('Failed to fetch status');
  return res.json();
}

// 2. Filter Dropdown Options
export async function getFilterOptions() {
  const res = await fetch('/api/filters');
  if (!res.ok) throw new Error('Failed to fetch filter options');
  return res.json();
}

// 3. Paginated Products
export async function getProducts(filters, page, pageSize, search) {
  const query = buildQueryParams(filters, page, pageSize, search);
  const res = await fetch(`/api/products?${query}`);
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

// 4. All Filtered Products (used for "Shortlist All Filtered")
export async function getAllFilteredProducts(filters, search) {
  const query = buildQueryParams(filters, 1, 300000, search);
  const res = await fetch(`/api/products/all-filtered?${query}`);
  if (!res.ok) throw new Error('Failed to fetch all filtered products');
  return res.json();
}

// 5. Stone & Raw Material Details for a Style Code
export async function getRmDetails(styleCode) {
  const res = await fetch(`/api/rm-details/${encodeURIComponent(styleCode)}`);
  if (!res.ok) throw new Error('Failed to fetch raw material details');
  return res.json();
}

// 6. Force Refresh / Excel Resync
export async function triggerExcelSync() {
  const res = await fetch('/api/refresh', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to sync Excel');
  return res.json();
}

// 7. Start Export Background Job
export async function startExportJob(items, exportType = 'row', perRow = 4) {
  const res = await fetch(`/api/export-job/start?export_type=${exportType}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, per_row: perRow }),
  });
  if (!res.ok) throw new Error('Failed to start export job');
  return res.json();
}

// 8. Poll Export Job Progress
export async function getExportProgress(jobId) {
  const res = await fetch(`/api/export-job/${jobId}/progress`);
  if (!res.ok) throw new Error('Failed to get export progress');
  return res.json();
}

// 9. Download Exported File URL
export function getExportDownloadUrl(jobId) {
  return `/api/export-job/${jobId}/download`;
}

// 10. Product Image URL Helper
export function getProductImageUrl(styleCode, full = false) {
  return `/api/image/${encodeURIComponent(styleCode)}${full ? '?full=true' : ''}`;
}