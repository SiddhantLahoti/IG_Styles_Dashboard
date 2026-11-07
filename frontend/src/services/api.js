// --- Auth Helpers & Storage ---
export function getAuthToken() {
  return localStorage.getItem('catalog_token');
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('catalog_token', token);
  } else {
    localStorage.removeItem('catalog_token');
  }
}

export function getStoredUser() {
  const user = localStorage.getItem('catalog_user');
  return user ? JSON.parse(user) : null;
}

export function setStoredUser(user) {
  if (user) {
    localStorage.setItem('catalog_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('catalog_user');
  }
}

export function logoutUser() {
  setAuthToken(null);
  setStoredUser(null);
}

// Global fetch wrapper with auto Authorization header and 401 interceptor
export async function authFetch(url, options = {}) {
  const token = getAuthToken();
  const headers = {
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });

  // Real-time revocation detection: If session expired or account suspended
  if (response.status === 401) {
    logoutUser();
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || 'Session expired or account suspended');
  }

  return response;
}

// Helper to construct query params cleanly
function buildQueryParams(filters, page = 1, pageSize = 24, search = '') {
  const params = new URLSearchParams();

  if (page) params.append('page', page);
  if (pageSize) params.append('page_size', pageSize);
  if (search && search.trim()) params.append('search', search.trim());

  const singleFields = [
    'start_date', 'end_date', 'min_total_wt', 'max_total_wt','min_wax_wt', 'max_wax_wt',
    'ln1', 'ln2', 'min_rm_wt', 'max_rm_wt', 'lab_grown','image_source', 'sieve_match_mode','min_pointed_wt', 'max_pointed_wt'
  ];

  singleFields.forEach((field) => {
    if (filters[field] !== undefined && filters[field] !== null && filters[field] !== '') {
      params.append(field, filters[field]);
    }
  });

  // Handle boolean checkboxes
  if (filters.has_set) {
    params.append('has_set', 'true');
  }
  if (filters.only_diamonds) {
    params.append('only_diamonds', 'true');
  }

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
    { key: 'size', queryKey: 'size' },
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

// 1. Initial Sync Status (Public)
export async function getSyncStatus() {
  const res = await fetch('/api/status');
  if (!res.ok) throw new Error('Failed to fetch status');
  return res.json();
}

// 2. Filter Dropdown Options (Protected)
export async function getFilterOptions(filters = {}, search = '') {
  const query = buildQueryParams(filters, null, null, search);
  const res = await authFetch(`/api/filters${query ? `?${query}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch filter options');
  return res.json();
}

// 3. Paginated Products (Protected)
export async function getProducts(filters, page, pageSize, search) {
  const query = buildQueryParams(filters, page, pageSize, search);
  const res = await authFetch(`/api/products?${query}`);
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

// 4. All Filtered Products (Protected)
export async function getAllFilteredProducts(filters, search) {
  const query = buildQueryParams(filters, 1, 300000, search);
  const res = await authFetch(`/api/products/all-filtered?${query}`);
  if (!res.ok) throw new Error('Failed to fetch all filtered products');
  return res.json();
}

// 5. Stone Details (Protected)
export async function getRmDetails(styleCode) {
  const res = await authFetch(`/api/rm-details/${encodeURIComponent(styleCode)}`);
  if (!res.ok) throw new Error('Failed to fetch raw material details');
  return res.json();
}

// 6. Force Refresh
export async function triggerExcelSync() {
  const res = await authFetch('/api/refresh', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to sync Excel');
  return res.json();
}

// 7. Start Export Background Job (Protected)
export async function startExportJob(items, exportType = 'row', perRow = 4) {
  const res = await authFetch(`/api/export-job/start?export_type=${exportType}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, per_row: perRow }),
  });
  if (!res.ok) throw new Error('Failed to start export job');
  return res.json();
}

// 8. Poll Export Job Progress
export async function getExportProgress(jobId) {
  const res = await authFetch(`/api/export-job/${jobId}/progress`);
  if (!res.ok) throw new Error('Failed to get export progress');
  return res.json();
}

// 9. Download Exported File URL
export function getExportDownloadUrl(jobId) {
  return `/api/export-job/${jobId}/download`;
}

// 10. Product Image URL Helper
export function getProductImageUrl(styleCode, full = false, view = null) {
  const params = new URLSearchParams();
  if (full) params.append('full', 'true');
  if (view) params.append('view', view);
  const q = params.toString();
  return `/api/image/${encodeURIComponent(styleCode)}${q ? `?${q}` : ''}`;
}

// --- Auth Endpoints ---
export async function loginUser(username, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Invalid username or password');
  }
  const data = await res.json();
  setAuthToken(data.access_token);
  setStoredUser(data.user);
  return data;
}

export async function getCurrentUser() {
  const token = getAuthToken();
  if (!token) return null;
  const res = await authFetch('/api/auth/me');
  if (!res.ok) {
    logoutUser();
    return null;
  }
  return res.json();
}

// --- Admin Management Endpoints ---
export async function getAdminUsers() {
  const res = await authFetch('/api/admin/users');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to load users');
  }
  return res.json();
}

export async function createAdminUser(username, password, role = 'user') {
  const res = await authFetch('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, role }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create user');
  }
  return res.json();
}

export async function deleteAdminUser(username) {
  const res = await authFetch(`/api/admin/users/${encodeURIComponent(username)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to delete user');
  }
  return res.json();
}

export async function updateUserPassword(username, newPassword) {
  const res = await authFetch(`/api/admin/users/${encodeURIComponent(username)}/password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ new_password: newPassword }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update password');
  }
  return res.json();
}

export async function toggleUserStatus(username, isActive) {
  const res = await authFetch(`/api/admin/users/${encodeURIComponent(username)}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_active: isActive }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update user status');
  }
  return res.json();
}