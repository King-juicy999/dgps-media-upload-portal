/* Section 1 - Auth */
const AUTH_KEY = 'dgps_portal_token';
const AUTH_ROLE = 'dgps_portal_role';
const AUTH_EMAIL = 'dgps_portal_email';
const AUTH_STORE = sessionStorage;

function getAuthToken() {
  return AUTH_STORE.getItem(AUTH_KEY);
}

function getAuthHeaders() {
  const token = getAuthToken();
  return token ? { 'Authorization': 'Token ' + token, 'Accept': 'application/json' } : { 'Accept': 'application/json' };
}

async function login() {
  const emailEl = document.getElementById('login-email');
  const passwordEl = document.getElementById('login-password');
  const errorEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');

  const email = emailEl.value.trim().toLowerCase();
  const password = passwordEl.value;

  errorEl.style.display = 'none';
  errorEl.textContent = '';

  if (!email || !password) {
    errorEl.textContent = 'Please enter your email and password.';
    errorEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

  try {
    const controller = new AbortController();
    const loginTimeout = setTimeout(() => controller.abort(), 15000);
    let res;
    try {
      res = await fetch(API_BASE + '/api/media/admins/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(loginTimeout);
    }

    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data.error || 'Login failed. Please try again.';
      errorEl.style.display = 'block';
      passwordEl.value = '';
      return;
    }

    // Store token and session info
    AUTH_STORE.setItem(AUTH_KEY, data.token);
    AUTH_STORE.setItem(AUTH_ROLE, data.role);
    AUTH_STORE.setItem(AUTH_EMAIL, data.email);

    // Show app first
    showApp();
    setTimeout(initApp, 100);

    // If must change password, show modal after app loads
    if (data.must_change_password) {
      showChangePasswordModal();
      return;
    }

    showToast('Welcome back!', 'success');

  } catch (err) {
    errorEl.textContent = err.name === 'AbortError'
      ? 'Login is taking too long. The server may be starting up — please try again.'
      : 'Network error. Please check your connection.';
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-right-to-bracket"></i> Login';
  }
}

async function logout() {
  const token = getAuthToken();
  if (token) {
    try {
      await fetch(API_BASE + '/api/media/admins/logout/', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } catch (e) {
      // Proceed with local logout even if request fails
    }
  }
  AUTH_STORE.removeItem(AUTH_KEY);
  AUTH_STORE.removeItem(AUTH_ROLE);
  AUTH_STORE.removeItem(AUTH_EMAIL);
  showLogin();
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-error').style.display = 'none';
}

function handleEmailKey(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    document.getElementById('login-password').focus();
  }
}

function handlePasswordKey(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    login();
  }
}

function showLogin() {
  document.getElementById('login-screen').style.display = 'block';
  document.getElementById('app').style.display = 'none';
}

function showApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';

  // Update sidebar user chip with real email
  const email = AUTH_STORE.getItem(AUTH_EMAIL) || 'Admin';
  const role = AUTH_STORE.getItem(AUTH_ROLE) || 'normal_admin';
  const nameEl = document.querySelector('.user-name');
  const roleEl = document.querySelector('.user-role');
  const avatarEl = document.querySelector('.user-avatar');
  if (nameEl) nameEl.textContent = email.split('@')[0];
  if (roleEl) roleEl.textContent = role === 'super_admin' ? 'Super Admin' : 'Portal Manager';
  if (avatarEl) avatarEl.textContent = email.charAt(0).toUpperCase();

  // Show Manage Admins nav item only for super_admin
  const adminNav = document.getElementById('nav-manage-admins');
  if (adminNav) adminNav.style.display = role === 'super_admin' ? 'flex' : 'none';

  // Populate sidebar admin identity card
  const sidebarName = document.getElementById('sidebar-admin-name');
  const sidebarRole = document.getElementById('sidebar-admin-role');
  if (sidebarName) sidebarName.textContent = email.split('@')[0];
  if (sidebarRole) sidebarRole.textContent = role === 'super_admin' ? 'Super Admin · Online' : 'Portal Manager · Online';

  // Populate dashboard greeting and date
  const greetingEl = document.getElementById('dash-greeting');
  const dateEl = document.getElementById('dash-date');
  if (greetingEl) {
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    const shortName = email.split('@')[0];
    greetingEl.textContent = `Good ${timeOfDay}, ${shortName} 👋`;
  }
  if (dateEl) {
    function updateDashClock() {
      const now = new Date();
      const datePart = now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
      const timePart = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      dateEl.innerHTML = `${datePart} · <span id="dash-clock-time" style="transition:opacity 0.4s ease;">${timePart}</span>`;
    }
    updateDashClock();
    setInterval(() => {
      const clockEl = document.getElementById('dash-clock-time');
      if (clockEl) {
        clockEl.style.opacity = '0';
        setTimeout(() => {
          const now = new Date();
          clockEl.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          clockEl.style.opacity = '1';
        }, 400);
      }
    }, 60000);
  }

  showPage('dashboard');
}

function showChangePasswordModal() {
  const modal = document.getElementById('change-password-modal');
  if (modal) modal.style.display = 'flex';
}

function hideChangePasswordModal() {
  const modal = document.getElementById('change-password-modal');
  if (modal) modal.style.display = 'none';
}

async function submitChangePassword() {
  const currentEl = document.getElementById('cp-current');
  const newEl = document.getElementById('cp-new');
  const confirmEl = document.getElementById('cp-confirm');
  const errorEl = document.getElementById('cp-error');
  const btn = document.getElementById('cp-btn');

  const current = currentEl.value;
  const newPw = newEl.value;
  const confirm = confirmEl.value;

  errorEl.style.display = 'none';
  errorEl.textContent = '';

  if (!current || !newPw || !confirm) {
    errorEl.textContent = 'All fields are required.';
    errorEl.style.display = 'block';
    return;
  }

  if (newPw.length < 8) {
    errorEl.textContent = 'New password must be at least 8 characters.';
    errorEl.style.display = 'block';
    return;
  }

  if (newPw !== confirm) {
    errorEl.textContent = 'New passwords do not match.';
    errorEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

  try {
    const res = await fetch(API_BASE + '/api/media/admins/change-password/', {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: current, new_password: newPw }),
    });

    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data.error || 'Failed to change password.';
      errorEl.style.display = 'block';
      return;
    }

    hideChangePasswordModal();
    showToast('Password changed successfully!', 'success');

  } catch (err) {
    errorEl.textContent = 'Network error. Please try again.';
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-lock"></i> Set New Password';
  }
}

/* Section 2 - Navigation */
const PAGE_META = {
  'dashboard': { title: 'Dashboard', sub: 'Overview of your media content' },
  'blog-upload': { title: 'Upload Blog Post', sub: 'Fill in details and upload media' },
  'blog-manage': { title: 'Manage Posts', sub: 'Edit, delete, or feature posts' },
  'gallery-upload': { title: 'Upload Gallery Photo', sub: 'Add new photos to the gallery' },
  'gallery-manage': { title: 'Manage Gallery', sub: 'Browse and manage gallery photos' },
  'media-library': { title: 'Media Library', sub: 'All uploaded files' },
  'manage-admins': { title: 'Manage Admins', sub: 'Create and control admin access' }
};

let activePage = 'dashboard';
let currentBlogFilter = null;
let currentGalleryFilter = null;
let selectedBlogFile = null;
let selectedGalleryFiles = [];

function showPage(id) {
  activePage = id;
  document.querySelectorAll('.page').forEach((page) => {
    page.classList.toggle('is-active', page.id === `page-${id}`);
  });
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.page === id);
  });
  document.getElementById('topbar-title').textContent = PAGE_META[id].title;
  document.getElementById('topbar-sub').textContent = PAGE_META[id].sub;

  if (id === 'blog-manage') {
    blogPosts.length = 0;
    document.getElementById('blog-tbody').innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;opacity:0.5;">Loading...</td></tr>';
    loadBlogPosts().then(() => renderBlogTable(blogPosts));
  }
  if (id === 'gallery-manage') renderGalleryGrid(currentGalleryFilter, document.getElementById('gallery-search').value);
  if (id === 'media-library') renderLibraryGrid();
  if (id === 'manage-admins') loadAdminList();
  if (id === 'dashboard') renderDashboard();
}

/* Section 3 - Mock Data */
const blogPosts = [];

const galleryPhotos = [
  { id: 1, caption: 'Diadematics 2024 — Opening', cat: 'events', layout: 'wide', date: 'Nov 2024' },
  { id: 2, caption: 'Graduation Celebration', cat: 'achievements', layout: 'wide', date: 'Jul 2024' },
  { id: 3, caption: 'Student Presentation Activity', cat: 'school-life', layout: '', date: 'Mar 2026' },
  { id: 4, caption: 'School Community Gathering', cat: 'community', layout: 'wide', date: 'Feb 2024' },
  { id: 5, caption: 'Award Presentation Ceremony', cat: 'achievements', layout: '', date: 'Jul 2024' },
  { id: 6, caption: 'Prepared School Event Space', cat: 'facilities', layout: 'portrait', date: 'Jan 2024' },
  { id: 7, caption: 'Cultural Celebration Scene', cat: 'events', layout: '', date: 'Dec 2023' },
  { id: 8, caption: 'Graduation Day Moment', cat: 'achievements', layout: 'portrait', date: 'Jul 2024' },
  { id: 9, caption: 'Student Event Performance', cat: 'events', layout: 'wide', date: 'Nov 2024' },
  { id: 10, caption: 'Inter-House Sports — High Jump', cat: 'school-life', layout: '', date: 'Apr 2026' },
  { id: 11, caption: 'Green House Champions', cat: 'school-life', layout: '', date: 'Apr 2026' },
  { id: 12, caption: 'Graduation (1)', cat: 'achievements', layout: '', date: 'Jul 2024' }
];

const CAT_LABELS = {
  sports: 'Sports', events: 'Events', academics: 'Academics',
  'student-life': 'Student Life', 'school-life': 'School Life',
  achievements: 'Achievements', facilities: 'Facilities', community: 'Community'
};

const CAT_BADGE = {
  sports: 'badge-sports', events: 'badge-school', academics: 'badge-achievements',
  'student-life': 'badge-student', 'school-life': 'badge-school',
  achievements: 'badge-achievements', facilities: 'badge-facilities', community: 'badge-community'
};

/* Section 4 - API */
const API_BASE = 'https://dgps-website.onrender.com';

function wakeBackend() {
  fetch(API_BASE + '/api/media/posts/', { method: 'HEAD' }).catch(() => {});
}

async function apiGetBlogPosts() {
  const res = await fetch(API_BASE + '/api/media/posts/?admin=true', {
    method: 'GET',
    headers: getAuthHeaders(),
    cache: 'no-store',
  });
  if (res.status === 401 || res.status === 403) { logout(); return; }
  if (!res.ok) throw new Error('Failed to fetch blog posts');
  return res.json();
}

async function apiGetGalleryPhotos() {
  const res = await fetch(API_BASE + '/api/media/gallery/', {
    method: 'GET',
    headers: getAuthHeaders(),
    cache: 'no-store',
  });
  if (res.status === 401 || res.status === 403) { logout(); return; }
  if (!res.ok) throw new Error('Failed to fetch gallery photos');
  return res.json();
}

async function apiUploadBlogPost(formData) {
  const token = getAuthToken();
  const headers = token ? { 'Authorization': 'Token ' + token } : {};
  const res = await fetch(API_BASE + '/api/media/posts/', {
    method: 'POST',
    headers,
    body: formData,
  });
  if (res.status === 401 || res.status === 403) { logout(); return; }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Upload failed');
  }
  return res.json();
}

async function apiUploadGalleryPhoto(formData) {
  const token = getAuthToken();
  const headers = token ? { 'Authorization': 'Token ' + token } : {};
  const res = await fetch(API_BASE + '/api/media/gallery/', {
    method: 'POST',
    headers,
    body: formData,
  });
  if (res.status === 401 || res.status === 403) { logout(); return; }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Upload failed');
  }
  return res.json();
}

async function apiDeleteBlogPost(id) {
  const res = await fetch(API_BASE + '/api/media/posts/' + id + '/', {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (res.status === 401 || res.status === 403) { logout(); return; }
  if (!res.ok) throw new Error('Delete failed');
  return res.json();
}

async function apiDeleteGalleryPhoto(id) {
  const res = await fetch(API_BASE + '/api/media/gallery/' + id + '/', {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (res.status === 401 || res.status === 403) { logout(); return; }
  if (!res.ok) throw new Error('Delete failed');
  return res.json();
}

/* Section 5 - Blog Upload */
function updateBlogPreview() {
  const title = valueOf('blog-title') || 'Untitled blog post';
  const cat = valueOf('blog-category');
  const type = valueOf('blog-media-type');
  const caption = valueOf('blog-caption') || 'No caption added yet.';
  const publish = document.getElementById('blog-publish').checked;
  const featured = document.getElementById('blog-featured').checked;
  document.getElementById('pv-title').textContent = title;
  document.getElementById('pv-cat').textContent = cat ? CAT_LABELS[cat] : 'Unassigned';
  document.getElementById('pv-type').textContent = type ? capitalize(type) : 'Not selected';
  document.getElementById('pv-caption').textContent = caption;
  document.getElementById('pv-status').textContent = publish ? (featured ? 'Published • Featured' : 'Published') : 'Draft';
  document.getElementById('preview-status').textContent = publish ? 'Published' : 'Draft';
  document.getElementById('preview-status').className = `status-pill ${publish ? 'published' : 'draft'}`;
}

function handleBlogFile(input) {
  selectedBlogFile = input.files && input.files[0] ? input.files[0] : null;
  const thumb = document.getElementById('preview-thumb');
  if (!selectedBlogFile) {
    thumb.innerHTML = '<i class="fas fa-image"></i>';
    return;
  }
  if (selectedBlogFile.type.startsWith('image/')) {
    thumb.innerHTML = `<img src="${URL.createObjectURL(selectedBlogFile)}" alt="Preview">`;
  } else {
    thumb.innerHTML = `<div class="file-placeholder"><i class="fas fa-video"></i><span>${selectedBlogFile.name}</span></div>`;
  }
  simulateProgress('blog');
}

function handleBlogDrop(e) {
  e.preventDefault();
  setDropState('blog-dropzone', false);
  if (e.dataTransfer.files.length) {
    document.getElementById('blog-file').files = e.dataTransfer.files;
    handleBlogFile(document.getElementById('blog-file'));
  }
}

async function submitBlogPost() {
  const title = document.getElementById('blog-title').value.trim();
  const category = document.getElementById('blog-category').value;
  const caption = document.getElementById('blog-caption').value.trim();
  const mediaType = document.getElementById('blog-media-type').value;
  const isPublished = document.getElementById('blog-publish').checked;
  const isFeatured = document.getElementById('blog-featured').checked;
  const fileInput = document.getElementById('blog-file');
  const file = fileInput.files[0];

  if (!title || !category || !caption) {
    showToast('Please fill in all required fields', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('title', title);
  formData.append('caption', caption);
  formData.append('category', category);
  formData.append('media_type', mediaType);
  formData.append('is_published', isPublished ? 'true' : 'false');
  formData.append('is_featured', isFeatured ? 'true' : 'false');
  if (file) formData.append('media_file', file);

  simulateProgress('blog');

  try {
    const result = await apiUploadBlogPost(formData);
    const p = result.data;
    blogPosts.unshift({
      id: p.id,
      title: p.title,
      cat: p.category,
      type: p.media_type,
      status: p.is_published ? 'published' : 'draft',
      featured: p.is_featured,
      date: new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      media_url: p.media_url,
    });
    document.getElementById('blog-badge').textContent = blogPosts.length;
    renderBlogTable(blogPosts);
    updateDashboardStats();
    if (activePage === 'dashboard') renderDashboard();
    if (activePage === 'media-library') renderLibraryGrid();
    showToast('Post uploaded successfully!', 'success');
    clearBlogForm();
  } catch (e) {
    showToast(e.message || 'Upload failed. Try again.', 'error');
  }
}

function clearBlogForm() {
  ['blog-title', 'blog-category', 'blog-media-type', 'blog-caption', 'blog-file'].forEach((id) => { document.getElementById(id).value = ''; });
  document.getElementById('blog-publish').checked = true;
  document.getElementById('blog-featured').checked = false;
  selectedBlogFile = null;
  document.getElementById('preview-thumb').innerHTML = '<i class="fas fa-image"></i>';
  updateBlogPreview();
}

/* Section 6 - Gallery Upload */
function updateGalPreview() {
  const caption = valueOf('gal-caption') || 'No caption added yet.';
  const cat = valueOf('gal-category');
  const layout = valueOf('gal-layout') || 'Auto';
  const publish = document.getElementById('gal-publish').checked;
  document.getElementById('gpv-caption').textContent = caption;
  document.getElementById('gpv-cat').textContent = cat ? CAT_LABELS[cat] : 'Unassigned';
  document.getElementById('gpv-layout').textContent = capitalize(layout);
  document.getElementById('gpv-count').textContent = `${selectedGalleryFiles.length} file${selectedGalleryFiles.length === 1 ? '' : 's'}`;
  document.getElementById('gpv-status').textContent = publish ? 'Published' : 'Draft';
  document.getElementById('gal-preview-status').textContent = publish ? 'Published' : 'Draft';
  document.getElementById('gal-preview-status').className = `status-pill ${publish ? 'published' : 'draft'}`;
  document.getElementById('gal-file-count').textContent = `${selectedGalleryFiles.length} files selected`;
}

function handleGalFile(input) {
  selectedGalleryFiles = Array.from(input.files || []).filter((file) => file.type.startsWith('image/'));
  const thumb = document.getElementById('gal-preview-thumb');
  const mini = document.getElementById('gal-multi-preview');
  const list = document.getElementById('gal-file-list');
  mini.innerHTML = '';
  list.innerHTML = '';
  if (selectedGalleryFiles[0]) {
    thumb.innerHTML = `<img src="${URL.createObjectURL(selectedGalleryFiles[0])}" alt="Preview">`;
  } else {
    thumb.innerHTML = '<i class="fas fa-image"></i>';
  }
  selectedGalleryFiles.slice(0, 4).forEach((file) => {
    mini.insertAdjacentHTML('beforeend', `<span class="mini-chip">${file.name}</span>`);
  });
  selectedGalleryFiles.forEach((file) => {
    list.insertAdjacentHTML('beforeend', `<span class="file-pill">${file.name}</span>`);
  });
  updateGalPreview();
  simulateProgress('gal');
}

function handleGalDrop(e) {
  e.preventDefault();
  setDropState('gal-dropzone', false);
  if (e.dataTransfer.files.length) {
    document.getElementById('gal-file').files = e.dataTransfer.files;
    handleGalFile(document.getElementById('gal-file'));
  }
}

async function submitGallery() {
  const caption = document.getElementById('gal-caption').value.trim();
  const category = document.getElementById('gal-category').value;
  const layout = document.getElementById('gal-layout').value;
  const isPublished = document.getElementById('gal-publish').checked;
  const fileInput = document.getElementById('gal-file');
  const files = Array.from(fileInput.files);

  if (!caption || !category) {
    showToast('Please add a caption and select a category', 'error');
    return;
  }
  if (!files.length) {
    showToast('Please select at least one photo', 'error');
    return;
  }

  simulateProgress('gal');

  let successCount = 0;
  for (const file of files) {
    const formData = new FormData();
    formData.append('caption', caption);
    formData.append('category', category);
    formData.append('layout', layout);
    formData.append('alt_text', caption);
    formData.append('is_published', isPublished ? 'true' : 'false');
    formData.append('media_file', file);

    try {
      const result = await apiUploadGalleryPhoto(formData);
      const p = result.data;
      galleryPhotos.unshift({
        id: p.id,
        caption: p.caption,
        cat: p.category,
        layout: p.layout || '',
        date: new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        media_url: p.media_url,
      });
      successCount++;
    } catch (e) {
      showToast(`Failed to upload ${file.name}: ${e.message}`, 'error');
    }
  }

  if (successCount > 0) {
    document.getElementById('gallery-badge').textContent = galleryPhotos.length;
    updateDashboardStats();
    if (activePage === 'gallery-manage') renderGalleryGrid(currentGalleryFilter, document.getElementById('gallery-search').value);
    if (activePage === 'dashboard') renderDashboard();
    if (activePage === 'media-library') renderLibraryGrid();
    showToast(`${successCount} photo${successCount > 1 ? 's' : ''} added to gallery!`, 'success');
    clearGalForm();
  }
}

function clearGalForm() {
  ['gal-caption', 'gal-category', 'gal-layout', 'gal-file'].forEach((id) => { document.getElementById(id).value = ''; });
  document.getElementById('gal-publish').checked = true;
  document.getElementById('gal-sports').checked = false;
  selectedGalleryFiles = [];
  document.getElementById('gal-preview-thumb').innerHTML = '<i class="fas fa-image"></i>';
  document.getElementById('gal-multi-preview').innerHTML = '';
  document.getElementById('gal-file-list').innerHTML = '';
  updateGalPreview();
}

/* Section 7 - Blog Manage */
function renderBlogTable(posts = null) {
  const data = posts || blogPosts.filter((post) => !currentBlogFilter || post.cat === currentBlogFilter);
  const tbody = document.getElementById('blog-tbody');
  tbody.innerHTML = data.map((post) => `
    <tr>
      <td><div class="title-cell">${post.title}${post.featured ? '<span class="badge badge-featured">Featured</span>' : ''}</div></td>
      <td><span class="badge ${CAT_BADGE[post.cat]}">${CAT_LABELS[post.cat]}</span></td>
      <td><span class="type-pill"><i class="fas fa-${post.type === 'video' ? 'video' : 'image'}"></i>${capitalize(post.type)}</span></td>
      <td><span class="badge badge-${post.status}">${capitalize(post.status)}</span></td>
      <td>${post.date}</td>
      <td><div class="row-actions"><button class="btn btn-secondary btn-sm" onclick="editPost(${post.id})"><i class="fas fa-pen"></i></button><button class="btn btn-danger btn-sm" onclick="deletePost(${post.id})"><i class="fas fa-trash"></i></button></div></td>
    </tr>
  `).join('');
}

function filterBlogTable(query) {
  const text = (query || '').toLowerCase();
  document.querySelectorAll('#blog-tbody tr').forEach((row) => {
    row.style.display = row.textContent.toLowerCase().includes(text) ? '' : 'none';
  });
}

function filterBlog(cat, btn) {
  currentBlogFilter = cat;
  document.querySelectorAll('#page-blog-manage .pill').forEach((pill) => pill.classList.remove('active'));
  btn.classList.add('active');
  renderBlogTable();
}

async function deletePost(id) {
  if (!confirm('Are you sure you want to delete this post? This cannot be undone.')) return;

  const token = localStorage.getItem('dgps_token') ||
                localStorage.getItem('token') ||
                localStorage.getItem('authToken') || '';

  try {
    const res = await fetch(`https://dgps-website.onrender.com/api/media/posts/${id}/`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (res.ok) {
      showToast('Post deleted successfully.', 'success');
      if (typeof loadBlogPosts === 'function') loadBlogPosts();
      if (typeof loadDashboard === 'function') loadDashboard();
    } else {
      let msg = `Delete failed (${res.status}).`;
      try {
        const err = await res.json();
        msg = err.detail || err.message || msg;
      } catch (_) {}
      showToast(msg, 'error');
    }
  } catch (err) {
    showToast('Network error. Check your connection and try again.', 'error');
  }
}

// ─── BLOG EDIT MODAL ────────────────────────────────────────────────

let editSelectedFile = null;

function editPost(id) {
  const post = (window.allBlogPosts || []).find((p) => String(p.id) === String(id));
  if (!post) {
    showToast('Could not load post data. Please refresh.', 'error');
    return;
  }
  openEditModal(post);
}

function openEditModal(post) {
  editSelectedFile = null;

  document.getElementById('edit-post-id').value = post.id;
  document.getElementById('edit-title').value = post.title || '';
  document.getElementById('edit-category').value = (post.category || '').toLowerCase().replace(/\s+/g, '-');
  document.getElementById('edit-media-type').value = post.media_type || '';
  document.getElementById('edit-caption').value = post.caption || '';
  document.getElementById('edit-publish').checked = post.is_published !== false;
  document.getElementById('edit-featured').checked = post.is_featured === true;

  document.getElementById('edit-media-preview').style.display = 'none';
  document.getElementById('edit-preview-img').style.display = 'none';
  document.getElementById('edit-preview-img').src = '';
  document.getElementById('edit-preview-video').style.display = 'none';
  document.getElementById('edit-preview-video').src = '';
  document.getElementById('edit-preview-name').textContent = '';
  document.getElementById('edit-progress').style.display = 'none';
  document.getElementById('edit-pbar').style.width = '0%';
  document.getElementById('edit-pct').textContent = '0%';
  document.getElementById('edit-error').style.display = 'none';
  document.getElementById('edit-file').value = '';

  const modal = document.getElementById('edit-modal');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
  document.body.style.overflow = '';
  editSelectedFile = null;
}

function handleEditFile(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  editSelectedFile = file;

  const previewWrap = document.getElementById('edit-media-preview');
  const previewImg = document.getElementById('edit-preview-img');
  const previewVid = document.getElementById('edit-preview-video');
  const previewName = document.getElementById('edit-preview-name');

  previewImg.style.display = 'none';
  previewVid.style.display = 'none';
  previewImg.src = '';
  previewVid.src = '';

  const url = URL.createObjectURL(file);
  if (file.type.startsWith('image/')) {
    previewImg.src = url;
    previewImg.style.display = 'block';
    document.getElementById('edit-media-type').value = 'image';
  } else if (file.type.startsWith('video/')) {
    previewVid.src = url;
    previewVid.style.display = 'block';
    document.getElementById('edit-media-type').value = 'video';
  }

  previewName.textContent = file.name;
  previewWrap.style.display = 'block';
  setDropState('edit-dropzone', false);
}

function handleEditDrop(event) {
  event.preventDefault();
  setDropState('edit-dropzone', false);
  const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
  if (!file) return;
  const dt = new DataTransfer();
  dt.items.add(file);
  const input = document.getElementById('edit-file');
  input.files = dt.files;
  handleEditFile(input);
}

async function saveEditPost() {
  const id = document.getElementById('edit-post-id').value;
  const title = document.getElementById('edit-title').value.trim();
  const category = document.getElementById('edit-category').value;
  const mediaType = document.getElementById('edit-media-type').value;
  const caption = document.getElementById('edit-caption').value.trim();
  const isPublished = document.getElementById('edit-publish').checked;
  const isFeatured = document.getElementById('edit-featured').checked;
  const errorEl = document.getElementById('edit-error');

  errorEl.style.display = 'none';

  if (!title) { showEditError('Post title is required.'); return; }
  if (!category) { showEditError('Please select a category.'); return; }
  if (!mediaType) { showEditError('Please select a media type.'); return; }
  if (!caption) { showEditError('Caption is required.'); return; }

  const saveBtn = document.getElementById('edit-save-btn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

  try {
    let mediaUrl = null;

    if (editSelectedFile) {
      mediaUrl = await uploadEditFile(editSelectedFile);
      if (!mediaUrl) {
        showEditError('File upload failed. Please try again.');
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-floppy-disk"></i> Save Changes';
        return;
      }
    }

    const payload = {
      title,
      category,
      media_type: mediaType,
      caption,
      is_published: isPublished,
      is_featured: isFeatured,
    };
    if (mediaUrl) payload.media_url = mediaUrl;

    const res = await fetch(API_BASE + '/api/media/posts/' + id + '/', {
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.status === 401 || res.status === 403) { logout(); return; }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showEditError(err.error || err.detail || err.message || `Save failed (${res.status}). Please try again.`);
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fas fa-floppy-disk"></i> Save Changes';
      return;
    }

    showToast('Post updated successfully!', 'success');
    closeEditModal();
    loadBlogPosts();
    renderDashboard();

  } catch (err) {
    showEditError('Network error. Check your connection and try again.');
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fas fa-floppy-disk"></i> Save Changes';
  }
}

async function uploadEditFile(file) {
  const progressShell = document.getElementById('edit-progress');
  const pbar = document.getElementById('edit-pbar');
  const pct = document.getElementById('edit-pct');

  progressShell.style.display = 'flex';
  pbar.style.width = '0%';
  pct.textContent = '0%';

  return new Promise((resolve) => {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', API_BASE + '/api/media/upload/', true);
    xhr.setRequestHeader('Accept', 'application/json');
    if (token) xhr.setRequestHeader('Authorization', 'Token ' + token);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const p = Math.round((e.loaded / e.total) * 100);
        pbar.style.width = p + '%';
        pct.textContent = p + '%';
      }
    });

    xhr.onload = () => {
      pbar.style.width = '100%';
      pct.textContent = '100%';
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data.url || data.media_url || data.file_url || null);
        } catch {
          resolve(null);
        }
      } else {
        resolve(null);
      }
    };

    xhr.onerror = () => resolve(null);
    xhr.send(formData);
  });
}

function showEditError(msg) {
  const el = document.getElementById('edit-error');
  el.textContent = msg;
  el.style.display = 'block';
}

/* Section 8 - Gallery Manage */
function renderGalleryGrid(filter = null, query = '') {
  const search = (query || '').toLowerCase();
  const items = galleryPhotos.filter((photo) => (!filter || photo.cat === filter) && photo.caption.toLowerCase().includes(search));
  const container = document.getElementById('gallery-grid-container');
  currentGalleryFilter = filter;
  if (!items.length) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><h3>No photos found</h3><p>Try a different category or search term.</p></div>';
    return;
  }
  container.innerHTML = items.map((photo) => `
    <article class="media-thumb ${photo.layout ? `layout-${photo.layout}` : ''}">
      <div class="thumb-frame">${photo.media_url ? `<img src="${photo.media_url}" alt="${photo.caption}" style="width:100%;height:100%;object-fit:cover;">` : `<i class="fas fa-image" style="font-size:2rem"></i>`}<div class="thumb-actions"><button class="btn btn-secondary btn-sm" onclick="showToast('Edit flow is a UI stub for now.', 'info')"><i class="fas fa-pen"></i></button><button class="btn btn-danger btn-sm" onclick="deleteGalleryPhoto(${photo.id})"><i class="fas fa-trash"></i></button></div></div>
      <div class="thumb-body"><h4>${photo.caption}</h4><div class="thumb-meta"><span class="badge ${CAT_BADGE[photo.cat]}">${CAT_LABELS[photo.cat]}</span><span>${photo.date}</span></div></div>
    </article>
  `).join('');
}

function filterGallery(cat, btn) {
  document.querySelectorAll('#page-gallery-manage .pill').forEach((pill) => pill.classList.remove('active'));
  btn.classList.add('active');
  renderGalleryGrid(cat, document.getElementById('gallery-search').value);
}

async function deleteGalleryPhoto(id) {
  try {
    await apiDeleteGalleryPhoto(id);
    const idx = galleryPhotos.findIndex((p) => p.id === id);
    if (idx > -1) galleryPhotos.splice(idx, 1);
    renderGalleryGrid(currentGalleryFilter, document.getElementById('gallery-search').value);
    document.getElementById('gallery-badge').textContent = galleryPhotos.length;
    updateDashboardStats();
    if (activePage === 'dashboard') renderDashboard();
    if (activePage === 'media-library') renderLibraryGrid();
    showToast('Photo removed from gallery', 'success');
  } catch (e) {
    showToast('Could not delete photo. Try again.', 'error');
  }
}

/* Section 9 - Media Library */
function renderLibraryGrid() {
  const libraryItems = [
    ...blogPosts.filter((post) => post.type === 'image').map((post) => ({ kind: 'blog', title: post.title, cat: post.cat, date: post.date, media_url: post.media_url })),
    ...galleryPhotos.slice(0, 8).map((photo) => ({ kind: 'gallery', title: photo.caption, cat: photo.cat, date: photo.date, media_url: photo.media_url }))
  ];
  const grid = document.getElementById('lib-grid');
  grid.innerHTML = libraryItems.map((item) => `
    <article class="media-thumb">
      <div class="thumb-frame">${item.media_url ? `<img src="${item.media_url}" alt="${item.title}" style="width:100%;height:100%;object-fit:cover;">` : `<i class="fas fa-image" style="font-size:2rem"></i>`}<div class="thumb-actions"><button class="btn btn-danger btn-sm" onclick="showToast('Delete action will be wired with backend later.', 'info')"><i class="fas fa-trash"></i></button></div></div>
      <div class="thumb-body"><h4>${item.title}</h4><div class="thumb-meta"><span class="badge ${CAT_BADGE[item.cat]}">${CAT_LABELS[item.cat]}</span><span>${item.date}</span></div></div>
    </article>
  `).join('');
}

function switchTab(id, btn) {
  document.querySelectorAll('.tab-content').forEach((panel) => panel.classList.toggle('active', panel.id === `tab-${id}`));
  document.querySelectorAll('.tab-btn').forEach((tab) => tab.classList.remove('active'));
  btn.classList.add('active');
}

/* Section 10 - Utilities */
function simulateProgress(prefix) {
  const shell = document.getElementById(`${prefix}-progress`);
  const bar = document.getElementById(`${prefix}-pbar`);
  const pct = document.getElementById(`${prefix}-pct`);
  let value = 0;
  shell.classList.add('is-visible');
  bar.style.width = '0%';
  pct.textContent = '0%';
  const timer = setInterval(() => {
    value += 7;
    if (value >= 100) {
      value = 100;
      clearInterval(timer);
      setTimeout(() => shell.classList.remove('is-visible'), 500);
    }
    bar.style.width = `${value}%`;
    pct.textContent = `${value}%`;
  }, 105);
}

function showToast(msg, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info';
  toast.innerHTML = `<i class="fas ${icon}"></i><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function initApp() {
  updateBlogPreview();
  updateGalPreview();
  loadBlogPosts();
  loadGalleryPhotos();
}

async function loadBlogPosts() {
  try {
    const result = await apiGetBlogPosts();
    const posts = Array.isArray(result.data) ? result.data : [];
    window.allBlogPosts = posts;
    // Replace mock array entirely with live data
    blogPosts.length = 0;
    posts.forEach((p) => {
      blogPosts.push({
        id: p.id,
        title: p.title,
        cat: p.category,
        type: p.media_type,
        status: p.is_published ? 'published' : 'draft',
        featured: p.is_featured,
        date: new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        media_url: p.media_url,
      });
    });
    document.getElementById('blog-badge').textContent = blogPosts.length;
    renderBlogTable(blogPosts);
    renderLibraryGrid();
    updateDashboardStats();
    renderDashboard();
  } catch (e) {
    console.error('loadBlogPosts error:', e);
  }
}

async function loadGalleryPhotos() {
  try {
    const result = await apiGetGalleryPhotos();
    const photos = Array.isArray(result.data) ? result.data : [];
    photos.forEach((p) => {
      if (!galleryPhotos.find((g) => g.id === p.id)) {
        galleryPhotos.unshift({
          id: p.id,
          caption: p.caption,
          cat: p.category,
          layout: p.layout || '',
          date: new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          media_url: p.media_url,
        });
      }
    });
    document.getElementById('gallery-badge').textContent = galleryPhotos.length;
    renderLibraryGrid();
    updateDashboardStats();
    renderDashboard();
  } catch (e) {
    console.error('loadGalleryPhotos error:', e);
  }
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  const icon = btn.querySelector('i');
  if (icon) {
    icon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
  }
}

function triggerFileInput(id) { document.getElementById(id).click(); }
function setDropState(id, state) { document.getElementById(id).classList.toggle('drag-over', state); }
function valueOf(id) { return document.getElementById(id).value.trim(); }
function capitalize(value) { return value ? value.charAt(0).toUpperCase() + value.slice(1) : ''; }

function updateDashboardStats() {
  const blogTotal = document.querySelector('#page-dashboard .stat-num:nth-of-type(1)') || document.getElementById('stat-blog-count');
  const galTotal = document.querySelector('#page-dashboard .stat-num:nth-of-type(2)') || document.getElementById('stat-gallery-count');
  const featuredTotal = document.querySelector('#page-dashboard .stat-num:nth-of-type(4)') || document.getElementById('stat-featured-count');
  if (blogTotal) blogTotal.textContent = blogPosts.length;
  if (galTotal) galTotal.textContent = galleryPhotos.length;
  if (featuredTotal) featuredTotal.textContent = blogPosts.filter((p) => p.featured).length;
}

function updateCounts() {
  document.getElementById('blog-badge').textContent = blogPosts.length;
  document.getElementById('gallery-badge').textContent = galleryPhotos.length;
  document.getElementById('stat-blog-count').textContent = blogPosts.length;
  document.getElementById('stat-blog-published').textContent = blogPosts.filter((post) => post.status === 'published').length;
  document.getElementById('stat-gallery-count').textContent = galleryPhotos.length;
  document.getElementById('stat-gallery-total').textContent = galleryPhotos.length;
  document.getElementById('stat-featured-count').textContent = blogPosts.filter((post) => post.featured).length;
  document.getElementById('stat-draft-count').textContent = blogPosts.filter((post) => post.status === 'draft').length;
}

function renderDashboard() {
  updateCounts();
  document.getElementById('activity-feed').innerHTML = [
    ...blogPosts.slice(0, 3).map((post) => `<div class="activity-item"><i class="fas fa-newspaper"></i><div><strong>${post.title}</strong><p>${CAT_LABELS[post.cat]} • ${post.date}</p></div></div>`),
    ...galleryPhotos.slice(0, 3).map((photo) => `<div class="activity-item"><i class="fas fa-image"></i><div><strong>${photo.caption}</strong><p>${CAT_LABELS[photo.cat]} • ${photo.date}</p></div></div>`)
  ].join('');
  document.getElementById('blog-breakdown').innerHTML = renderBreakdown(blogPosts.map((item) => item.cat));
  document.getElementById('gallery-breakdown').innerHTML = renderBreakdown(galleryPhotos.map((item) => item.cat));
}

function renderBreakdown(cats) {
  const counts = cats.reduce((acc, cat) => ({ ...acc, [cat]: (acc[cat] || 0) + 1 }), {});
  return Object.entries(counts).map(([cat, count]) => `<div class="breakdown-item"><span>${CAT_LABELS[cat]}</span><strong>${count}</strong></div>`).join('');
}

/* Section 11 - Manage Admins (Super Admin only) */

let generatedPasswordValue = '';

async function createAdmin() {
  const emailEl = document.getElementById('new-admin-email');
  const resultEl = document.getElementById('create-admin-result');
  const errorEl = document.getElementById('create-admin-error');
  const btn = document.getElementById('create-admin-btn');
  const email = emailEl.value.trim().toLowerCase();

  resultEl.style.display = 'none';
  errorEl.style.display = 'none';
  errorEl.textContent = '';

  if (!email) {
    errorEl.textContent = 'Please enter an email address.';
    errorEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';

  try {
    const res = await fetch(API_BASE + '/api/media/admins/create/', {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data.error || 'Failed to create admin.';
      errorEl.style.display = 'block';
      return;
    }

    generatedPasswordValue = data.generated_password;
    document.getElementById('generated-password-display').textContent = data.generated_password;
    resultEl.style.display = 'block';
    emailEl.value = '';
    showToast('Admin account created!', 'success');
    loadAdminList();

  } catch (err) {
    errorEl.textContent = 'Network error. Please try again.';
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Admin';
  }
}

function copyGeneratedPassword() {
  if (!generatedPasswordValue) return;
  navigator.clipboard.writeText(generatedPasswordValue).then(() => {
    showToast('Password copied to clipboard!', 'success');
  }).catch(() => {
    showToast('Could not copy — please copy it manually.', 'error');
  });
}

async function loadAdminList() {
  const tbody = document.getElementById('admins-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;opacity:0.5;">Loading...</td></tr>';

  try {
    const res = await fetch(API_BASE + '/api/media/admins/list/', {
      method: 'GET',
      headers: getAuthHeaders(),
      cache: 'no-store',
    });

    if (res.status === 401 || res.status === 403) { logout(); return; }
    if (!res.ok) throw new Error('Failed to fetch admins');

    const data = await res.json();
    const admins = Array.isArray(data.data) ? data.data : [];

    document.getElementById('admins-badge').textContent = admins.length;

    if (!admins.length) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;opacity:0.5;">No admin accounts yet. Create one above.</td></tr>';
      return;
    }

    tbody.innerHTML = admins.map((admin) => `
      <tr>
        <td><div class="title-cell"><i class="fas fa-user" style="color:var(--muted);font-size:13px;"></i>${admin.email}</div></td>
        <td>
          <span class="badge ${admin.is_approved ? 'badge-published' : 'badge-draft'}">
            ${admin.is_approved ? '<i class="fas fa-circle-check"></i> Approved' : '<i class="fas fa-clock"></i> Pending'}
          </span>
        </td>
        <td>${new Date(admin.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
        <td>
          <div class="row-actions">
            <button class="btn btn-secondary btn-sm" onclick="toggleAdminApproval(${admin.id}, ${admin.is_approved})" title="${admin.is_approved ? 'Suspend' : 'Approve'}">
              <i class="fas fa-${admin.is_approved ? 'ban' : 'circle-check'}"></i>
              ${admin.is_approved ? 'Suspend' : 'Approve'}
            </button>
            <button class="btn btn-secondary btn-sm" onclick="resetAdminPassword(${admin.id}, '${admin.email}')" title="Reset password">
              <i class="fas fa-key"></i>
            </button>
            <button class="btn btn-danger btn-sm" onclick="deleteAdmin(${admin.id}, '${admin.email}')">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:#c0392b;">Failed to load admins. Try refreshing.</td></tr>';
  }
}

async function toggleAdminApproval(id, currentlyApproved) {
  try {
    const res = await fetch(API_BASE + '/api/media/admins/' + id + '/approve/', {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to update');
    const data = await res.json();
    showToast(data.message || 'Admin status updated.', 'success');
    loadAdminList();
  } catch (err) {
    showToast('Could not update admin status. Try again.', 'error');
  }
}

async function deleteAdmin(id, email) {
  if (!confirm(`Delete admin account for ${email}? This cannot be undone.`)) return;
  try {
    const res = await fetch(API_BASE + '/api/media/admins/' + id + '/delete/', {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete');
    showToast('Admin deleted.', 'success');
    loadAdminList();
  } catch (err) {
    showToast('Could not delete admin. Try again.', 'error');
  }
}

async function resetAdminPassword(id, email) {
  const newPassword = prompt(`Set a new password for ${email}:\n\nMust be at least 8 characters.`);
  if (newPassword === null) return;
  if (newPassword.trim().length < 8) {
    showToast('Password must be at least 8 characters.', 'error');
    return;
  }

  try {
    const res = await fetch(API_BASE + '/api/media/admins/' + id + '/reset-password/', {
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_password: newPassword.trim() }),
    });

    if (res.status === 401 || res.status === 403) { logout(); return; }

    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Failed to reset password.', 'error');
      return;
    }

    showToast(`Password reset for ${email}. They will be prompted to change it on next login.`, 'success');

  } catch (err) {
    showToast('Network error. Could not reset password.', 'error');
  }
}

// ─── BATCH UPLOAD ─────────────────────────────────────────────

let batchFiles = [];
let batchModeActive = false;
let currentBatchMode = 'same';

function toggleBatchMode() {
  batchModeActive = !batchModeActive;
  const single = document.getElementById('blog-single-upload');
  const batch  = document.getElementById('blog-batch-upload');
  const btn    = document.getElementById('btb-switch');
  const label  = document.getElementById('btb-label');
  const desc   = document.getElementById('btb-desc');
  if (batchModeActive) {
    single.style.display = 'none';
    batch.style.display  = 'block';
    btn.innerHTML   = '<i class="fas fa-pen-to-square"></i> Switch to Single Upload';
    label.textContent = 'Batch Upload';
    desc.textContent  = 'Upload and configure multiple posts at once';
  } else {
    single.style.display = 'block';
    batch.style.display  = 'none';
    btn.innerHTML   = '<i class="fas fa-layer-group"></i> Switch to Batch Upload';
    label.textContent = 'Single Upload';
    desc.textContent  = 'Fill in details and upload one post at a time';
  }
}

function setBatchMode(mode) {
  currentBatchMode = mode;
  document.getElementById('mode-btn-same').classList.toggle('active', mode === 'same');
  document.getElementById('mode-btn-mix').classList.toggle('active', mode === 'mix');
}

function handleBatchDrop(e) {
  e.preventDefault();
  setDropState('batch-dropzone', false);
  handleBatchFiles(e.dataTransfer.files);
}

function handleBatchFiles(fileList) {
  Array.from(fileList).forEach(file => {
    batchFiles.push({
      file,
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type.startsWith('video/') ? 'video' : 'image',
      objectUrl: URL.createObjectURL(file),
      custom: false,
      title: '',
      category: '',
      caption: ''
    });
  });
  renderBatchQueue();
  updateBatchSummary();
}

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function renderBatchQueue() {
  const queue = document.getElementById('batch-queue');
  const countPill = document.getElementById('batch-file-count');
  countPill.textContent = batchFiles.length + ' file' + (batchFiles.length !== 1 ? 's' : '');
  queue.innerHTML = '';
  batchFiles.forEach((f, i) => {
    const card = document.createElement('div');
    card.className = 'batch-file-card' + (f.custom ? ' customised' : '');
    card.dataset.index = i;

    const thumbHtml = f.type === 'video'
      ? `<div class="batch-file-thumb video"><i class="fas fa-play"></i></div>`
      : `<div class="batch-file-thumb"><img src="${f.objectUrl}" alt=""></div>`;

    const badgeHtml = f.custom
      ? `<span class="file-badge-custom">Custom</span>`
      : `<span class="file-badge-shared">Shared</span>`;

    const actionIcon = f.custom ? 'fa-chevron-up' : 'fa-pen';
    const actionTitle = f.custom ? 'Collapse' : 'Customise this file';

    card.innerHTML = `
      <div class="batch-file-card-head">
        ${thumbHtml}
        <div class="batch-file-info">
          <div class="batch-file-name">${f.name}</div>
          <div class="batch-file-size">${f.size} · ${f.type.charAt(0).toUpperCase() + f.type.slice(1)}</div>
        </div>
        ${badgeHtml}
        <div style="display:flex;gap:6px;">
          <button class="batch-icon-btn" title="${actionTitle}"
            onclick="customiseBatchFile(${i})">
            <i class="fas ${actionIcon}"></i>
          </button>
          <button class="batch-icon-btn danger" title="Remove"
            onclick="removeBatchFile(${i})">
            <i class="fas fa-xmark"></i>
          </button>
        </div>
      </div>
      ${f.custom ? `
      <div class="batch-custom-fields">
        <div>
          <label>Title (this file only)</label>
          <input type="text" value="${f.title}"
            placeholder="Override title..."
            oninput="batchFiles[${i}].title = this.value">
        </div>
        <div>
          <label>Category override</label>
          <select onchange="batchFiles[${i}].category = this.value">
            <option value="">Use shared</option>
            <option value="events" ${f.category==='events'?'selected':''}>Events</option>
            <option value="sports" ${f.category==='sports'?'selected':''}>Sports</option>
            <option value="academics" ${f.category==='academics'?'selected':''}>Academics</option>
            <option value="student-life" ${f.category==='student-life'?'selected':''}>Student Life</option>
          </select>
        </div>
        <div class="full-span">
          <label>Caption override</label>
          <input type="text" value="${f.caption}"
            placeholder="Override caption..."
            oninput="batchFiles[${i}].caption = this.value">
        </div>
      </div>` : ''}
      <div class="batch-file-progress" id="batch-prog-${i}" style="display:none;">
        <span style="font-size:11px;color:#0a7a24;font-weight:600;white-space:nowrap;" id="batch-prog-label-${i}">Uploading...</span>
        <div class="batch-progress-track">
          <div class="batch-progress-bar" id="batch-pbar-${i}"></div>
        </div>
        <span style="font-size:11px;color:#0a7a24;font-weight:700;" id="batch-pct-${i}">0%</span>
      </div>`;
    queue.appendChild(card);
  });
}

function customiseBatchFile(index) {
  batchFiles[index].custom = !batchFiles[index].custom;
  renderBatchQueue();
  updateBatchSummary();
}

function removeBatchFile(index) {
  URL.revokeObjectURL(batchFiles[index].objectUrl);
  batchFiles.splice(index, 1);
  renderBatchQueue();
  updateBatchSummary();
}

function clearBatchQueue() {
  batchFiles.forEach(f => URL.revokeObjectURL(f.objectUrl));
  batchFiles = [];
  renderBatchQueue();
  updateBatchSummary();
}

function updateBatchSummary() {
  const total   = batchFiles.length;
  const custom  = batchFiles.filter(f => f.custom).length;
  const shared  = total - custom;
  document.getElementById('bs-total').textContent  = total;
  document.getElementById('bs-shared').textContent = shared;
  document.getElementById('bs-custom').textContent = custom;
  document.getElementById('bs-ready').textContent  = total + ' / ' + total;
}

async function submitBatchUpload() {
  if (batchFiles.length === 0) {
    showToast('No files in queue.', 'error'); return;
  }
  const sharedCategory = document.getElementById('batch-category').value;
  const sharedType     = document.getElementById('batch-media-type').value;
  const sharedTitle    = document.getElementById('batch-title').value.trim();
  const publish        = document.getElementById('batch-publish').checked;
  const featured       = document.getElementById('batch-featured').checked;

  if (!sharedCategory || !sharedType || !sharedTitle) {
    showToast('Please fill in all shared fields before uploading.', 'error'); return;
  }

  const btn = document.getElementById('batch-submit-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < batchFiles.length; i++) {
    const f = batchFiles[i];
    const progRow   = document.getElementById(`batch-prog-${i}`);
    const progBar   = document.getElementById(`batch-pbar-${i}`);
    const progPct   = document.getElementById(`batch-pct-${i}`);
    const progLabel = document.getElementById(`batch-prog-label-${i}`);

    progRow.style.display = 'flex';
    progBar.style.width   = '30%';
    progPct.textContent   = '30%';

    const formData = new FormData();
    formData.append('media_file', f.file);
    formData.append('title',      f.custom && f.title    ? f.title    : sharedTitle);
    formData.append('category',   f.custom && f.category ? f.category : sharedCategory);
    formData.append('caption',    f.custom && f.caption  ? f.caption  : sharedTitle);
    formData.append('media_type', sharedType);
    formData.append('is_published', publish ? 'true' : 'false');
    formData.append('is_featured',  featured ? 'true' : 'false');

    try {
      const token = getAuthToken();
      const headers = token ? { Authorization: 'Token ' + token } : {};
    const res = await fetch(
      `${API_BASE}/api/media/posts/`,
      { method: 'POST', headers, body: formData }
    );
      if (res.status === 401 || res.status === 403) { logout(); return; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }
      const result = await res.json();
      const p = result.data;
      blogPosts.unshift({
        id: p.id,
        title: p.title,
        cat: p.category,
        type: p.media_type,
        status: p.is_published ? 'published' : 'draft',
        featured: p.is_featured,
        date: new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        media_url: p.media_url,
      });
      progBar.style.width = '100%';
      progPct.textContent = '100%';
      progLabel.innerHTML = '<i class="fas fa-circle-check"></i> Done';
      progLabel.style.color = '#0a7a24';
      successCount++;
    } catch (err) {
      progBar.style.background = '#c0392b';
      progBar.style.width = '100%';
      progLabel.innerHTML = '<i class="fas fa-circle-xmark"></i> Failed';
      progLabel.style.color = '#c0392b';
      progPct.textContent = '';
      failCount++;
    }
  }

  document.getElementById('blog-badge').textContent = blogPosts.length;
  renderBlogTable(blogPosts);
  updateDashboardStats();
  if (activePage === 'dashboard') renderDashboard();
  if (activePage === 'media-library') renderLibraryGrid();

  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-cloud-arrow-up"></i> Publish All';

  if (failCount === 0) {
    showToast(`${successCount} post${successCount > 1 ? 's' : ''} uploaded successfully!`, 'success');
    clearBatchQueue();
  } else {
    showToast(`${successCount} succeeded, ${failCount} failed. Check the queue.`, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Always ping backend immediately on page load to wake Render free tier
  fetch(API_BASE + '/api/media/admins/login/', { method: 'HEAD' }).catch(() => {});

  const editModal = document.getElementById('edit-modal');
  if (editModal) {
    editModal.addEventListener('click', function (e) {
      if (e.target === this) closeEditModal();
    });
  }

  if (!AUTH_STORE.getItem(AUTH_KEY)) {
    showLogin();
    return;
  }
  showApp();
  initApp();
});
