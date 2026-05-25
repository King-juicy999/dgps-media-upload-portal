/* Section 1 - Auth */
const AUTH_KEY = 'dgps_auth';
const MOCK_USERNAME = 'admin';
const MOCK_PASSWORD = 'dgps2026';

function login() {
  const username = document.getElementById('username');
  const password = document.getElementById('password');
  if (username.value.trim() === MOCK_USERNAME && password.value === MOCK_PASSWORD) {
    sessionStorage.setItem(AUTH_KEY, 'true');
    showApp();
    initApp();
    showToast('Login successful', 'success');
    return;
  }
  password.value = '';
  showToast('Invalid username or password', 'error');
}

function logout() {
  sessionStorage.removeItem(AUTH_KEY);
  showLogin();
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
}

function handleUsernameKey(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    document.getElementById('password').focus();
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
}

/* Section 2 - Navigation */
const PAGE_META = {
  'dashboard': { title: 'Dashboard', sub: 'Overview of your media content' },
  'blog-upload': { title: 'Upload Blog Post', sub: 'Fill in details and upload media' },
  'blog-manage': { title: 'Manage Posts', sub: 'Edit, delete, or feature posts' },
  'gallery-upload': { title: 'Upload Gallery Photo', sub: 'Add new photos to the gallery' },
  'gallery-manage': { title: 'Manage Gallery', sub: 'Browse and manage gallery photos' },
  'media-library': { title: 'Media Library', sub: 'All uploaded files' }
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

  if (id === 'blog-manage') renderBlogTable();
  if (id === 'gallery-manage') renderGalleryGrid(currentGalleryFilter, document.getElementById('gallery-search').value);
  if (id === 'media-library') renderLibraryGrid();
  if (id === 'dashboard') renderDashboard();
}

/* Section 3 - Mock Data */
const blogPosts = [
  { id: 1, title: 'Inter-House Sports 2026 — Highlights', cat: 'sports', type: 'video', status: 'published', featured: true, date: 'Apr 11 2026' },
  { id: 2, title: 'Green House Erupts — High Jump Champions', cat: 'sports', type: 'image', status: 'published', featured: false, date: 'Apr 11 2026' },
  { id: 3, title: 'High Jump — Inter-House Sports 2026 Day 1', cat: 'sports', type: 'image', status: 'published', featured: false, date: 'Apr 11 2026' },
  { id: 4, title: 'High Jump — Clearing the Bar', cat: 'sports', type: 'image', status: 'published', featured: false, date: 'Apr 11 2026' },
  { id: 5, title: 'High Jump — Eyes on the Bar', cat: 'sports', type: 'image', status: 'published', featured: false, date: 'Apr 11 2026' },
  { id: 6, title: 'Sports Training Vlog Episode 1', cat: 'sports', type: 'video', status: 'draft', featured: false, date: 'Apr 8 2026' },
  { id: 7, title: 'Student Presentation Activity', cat: 'academics', type: 'image', status: 'published', featured: false, date: 'Mar 20 2026' },
  { id: 8, title: 'Student Life Mixed Media Story', cat: 'student-life', type: 'video', status: 'draft', featured: false, date: 'Mar 15 2026' },
  { id: 9, title: 'Academic Excellence Feature', cat: 'academics', type: 'image', status: 'draft', featured: false, date: 'Mar 10 2026' }
];

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
  const res = await fetch(API_BASE + '/api/media/posts/', {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch blog posts');
  return res.json();
}

async function apiGetGalleryPhotos() {
  const res = await fetch(API_BASE + '/api/media/gallery/', {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch gallery photos');
  return res.json();
}

async function apiUploadBlogPost(formData) {
  const res = await fetch(API_BASE + '/api/media/posts/', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Upload failed');
  }
  return res.json();
}

async function apiUploadGalleryPhoto(formData) {
  const res = await fetch(API_BASE + '/api/media/gallery/', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Upload failed');
  }
  return res.json();
}

async function apiDeleteBlogPost(id) {
  const res = await fetch(API_BASE + '/api/media/posts/' + id + '/', {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Delete failed');
  return res.json();
}

async function apiDeleteGalleryPhoto(id) {
  const res = await fetch(API_BASE + '/api/media/gallery/' + id + '/', {
    method: 'DELETE',
  });
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
      <td><div class="row-actions"><button class="btn btn-secondary btn-sm" onclick="showToast('Edit flow is a UI stub for now.', 'info')"><i class="fas fa-pen"></i></button><button class="btn btn-danger btn-sm" onclick="deletePost(${post.id})"><i class="fas fa-trash"></i></button></div></td>
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
  try {
    await apiDeleteBlogPost(id);
    const idx = blogPosts.findIndex((p) => p.id === id);
    if (idx > -1) blogPosts.splice(idx, 1);
    renderBlogTable(
      !currentBlogFilter || currentBlogFilter === 'all' ? blogPosts : blogPosts.filter((p) => p.cat === currentBlogFilter)
    );
    document.getElementById('blog-badge').textContent = blogPosts.length;
    updateDashboardStats();
    if (activePage === 'dashboard') renderDashboard();
    if (activePage === 'media-library') renderLibraryGrid();
    showToast('Post deleted', 'success');
  } catch (e) {
    showToast('Could not delete post. Try again.', 'error');
  }
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
  wakeBackend();
  updateBlogPreview();
  updateGalPreview();
  loadBlogPosts();
  loadGalleryPhotos();
}

async function loadBlogPosts() {
  try {
    const result = await apiGetBlogPosts();
    const posts = Array.isArray(result.data) ? result.data : [];
    posts.forEach((p) => {
      if (!blogPosts.find((b) => b.id === p.id)) {
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
      }
    });
    document.getElementById('blog-badge').textContent = blogPosts.length;
    renderBlogTable(blogPosts);
    renderLibraryGrid();
    updateDashboardStats();
    if (activePage === 'dashboard') renderDashboard();
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
    if (activePage === 'dashboard') renderDashboard();
  } catch (e) {
    console.error('loadGalleryPhotos error:', e);
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

document.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem(AUTH_KEY) !== 'true') {
    showLogin();
    return;
  }
  showApp();
  initApp();
});
