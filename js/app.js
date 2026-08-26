// ── Main App Controller ───────────────────────────────────────────────────────
import { supabase, getProfile } from './supabase.js';
import { signOut, updateProfile, updatePassword } from './auth.js';
import {
  searchMulti, searchMovies, searchTV, getTrending, getDiscover,
  getMovieDetails, getTVDetails, getTVSeason,
  getPosterUrl, getTitle, getYear, mapGenres,
  getMovieGenres, getTVGenres
} from './tmdb.js';
import {
  fetchWatchlist, addToWatchlist, updateWatchlistItem,
  deleteWatchlistItem, checkExists, fetchStats
} from './tracker.js';
import { renderStatCards, renderGenreChart, renderMonthlyChart, renderTopRated } from './stats.js';

// ── State ─────────────────────────────────────────────────────────────────────
let currentUser   = null;
let currentProfile = null;
let watchlistItems = [];
let movieGenres   = [];
let tvGenres      = [];
let activeTab     = 'discover';
let listActiveTab = 'watching';
let searchFilter  = 'all'; // 'all'|'movie'|'tv'
let detailTarget  = null;  // item being edited in modal
let searchTimeout = null;
let currentSort   = 'added_at';
let currentPage   = 1;
let currentQuery  = '';
let isTrending    = true;
let isLoadingMore = false;
let scrollObserver = null;

// ── Lucide Icon Renderer ──────────────────────────────────────────────────────
export function renderIcons(root = document) {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons({ root });
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'index.html';
    return;
  }
  currentUser = session.user;
  currentProfile = await getProfile(currentUser.id);

  initTheme();
  renderUserInfo();
  bindEvents();

  // Load genres and watchlist asynchronously in background
  loadGenres();
  loadWatchlist();

  showTab('discover');
  loadTrending();
  renderIcons();
}

// ── Dark mode ─────────────────────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('binge-theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(saved);
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const current = document.documentElement.dataset.theme || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('binge-theme', next);
  });
}
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.innerHTML = `<i data-lucide="${theme === 'dark' ? 'sun' : 'moon'}" class="icon-sm"></i>`;
    renderIcons(btn);
  }
}

// ── Stub ──────────────────────────────────────────────────────────────────────
function stopInfiniteScroll() {
  if (scrollObserver) { scrollObserver.disconnect(); scrollObserver = null; }
}

// ── Load genres ───────────────────────────────────────────────────────────────
async function loadGenres() {
  try {
    [movieGenres, tvGenres] = await Promise.all([getMovieGenres(), getTVGenres()]);
  } catch (e) { /* offline / key not set */ }
}

// ── Load watchlist ────────────────────────────────────────────────────────────
async function loadWatchlist() {
  try {
    watchlistItems = await fetchWatchlist(currentUser.id);
    updateNavCounts();
  } catch (e) {
    showToast('Liste yüklenemedi', 'error');
  }
}

// ── Render user info in navbar ────────────────────────────────────────────────
function renderUserInfo() {
  const name = currentProfile?.username || currentUser.email.split('@')[0];
  const initials = name.slice(0, 2).toUpperCase();
  document.getElementById('user-initials').textContent = initials;
  document.getElementById('user-name-display').textContent = name;

  // Profile tab
  const pAvatar = document.getElementById('profile-avatar-initials');
  if (pAvatar) pAvatar.textContent = initials;
  const pName = document.getElementById('profile-display-name');
  if (pName) pName.textContent = name;
  const pEmail = document.getElementById('profile-email');
  if (pEmail) pEmail.textContent = currentUser.email;
  const pSince = document.getElementById('profile-since');
  if (pSince) {
    const d = new Date(currentUser.created_at);
    pSince.textContent = `Üye olma: ${d.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}`;
  }
  const pUsernameInput = document.getElementById('profile-username-input');
  if (pUsernameInput) pUsernameInput.value = name;
}

// ── Update nav badge counts ───────────────────────────────────────────────────
function updateNavCounts() {
  const watching = watchlistItems.filter(i => i.status === 'watching').length;
  const el = document.getElementById('watching-count');
  if (el) {
    el.textContent = watching;
    el.style.display = watching > 0 ? '' : 'none';
  }
}

// ── Bind all events ───────────────────────────────────────────────────────────
function bindEvents() {
  // Nav tabs
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab));
  });

  // Navbar search
  const nbSearch = document.getElementById('navbar-search');
  if (nbSearch) {
    nbSearch.addEventListener('input', e => {
      if (activeTab !== 'discover') showTab('discover');
      debounceSearch(e.target.value);
    });
    nbSearch.addEventListener('keydown', e => {
      if (e.key === 'Enter') doSearch(e.target.value);
    });
  }

  // Discover search bar
  const discoverSearch = document.getElementById('discover-search');
  if (discoverSearch) {
    discoverSearch.addEventListener('input', e => debounceSearch(e.target.value));
    discoverSearch.addEventListener('keydown', e => {
      if (e.key === 'Enter') doSearch(e.target.value);
    });
  }
  document.getElementById('discover-search-btn')?.addEventListener('click', () => {
    doSearch(document.getElementById('discover-search')?.value || '');
  });

  // Filter pills
  document.querySelectorAll('[data-filter]').forEach(pill => {
    pill.addEventListener('click', () => {
      searchFilter = pill.dataset.filter;
      document.querySelectorAll('[data-filter]').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const q = document.getElementById('discover-search')?.value || '';
      if (q) doSearch(q);
      else showGenreContent(activeGenre, 1, false);
    });
  });

  // Genre tabs
  document.querySelectorAll('[data-genre]').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-genre]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      // Clear search input
      const si = document.getElementById('discover-search');
      if (si) si.value = '';
      const navbar = document.getElementById('navbar-search');
      if (navbar) navbar.value = '';
      // Update label
      const label = document.getElementById('results-section-label');
      if (label) label.textContent = tab.textContent;
      showGenreContent(tab.dataset.genre, 1, false);
    });
  });

  // Genre horizontal scroll buttons & wheel
  const genreTabs = document.getElementById('genre-tabs');
  document.getElementById('genre-scroll-left')?.addEventListener('click', () => {
    genreTabs?.scrollBy({ left: -250, behavior: 'smooth' });
  });
  document.getElementById('genre-scroll-right')?.addEventListener('click', () => {
    genreTabs?.scrollBy({ left: 250, behavior: 'smooth' });
  });
  genreTabs?.addEventListener('wheel', (e) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      genreTabs.scrollLeft += e.deltaY;
    }
  }, { passive: false });

  // List tabs
  document.querySelectorAll('[data-list-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      listActiveTab = btn.dataset.listTab;
      document.querySelectorAll('[data-list-tab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderWatchlistTab();
    });
  });

  // Sort
  document.getElementById('list-sort-select')?.addEventListener('change', e => {
    currentSort = e.target.value;
    renderWatchlistTab();
  });

  // User menu
  document.getElementById('user-menu-btn')?.addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById('user-dropdown').classList.toggle('hidden');
  });
  document.addEventListener('click', () => {
    document.getElementById('user-dropdown')?.classList.add('hidden');
  });

  // Sign out
  document.getElementById('signout-btn')?.addEventListener('click', async () => {
    await signOut();
    window.location.href = 'index.html';
  });
  document.getElementById('signout-btn-2')?.addEventListener('click', async () => {
    await signOut();
    window.location.href = 'index.html';
  });

  // Modal close
  document.getElementById('detail-modal-backdrop')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeDetailModal();
  });
  document.getElementById('detail-modal-close')?.addEventListener('click', closeDetailModal);

  // Modal save
  document.getElementById('detail-save-btn')?.addEventListener('click', saveDetailModal);
  document.getElementById('detail-delete-btn')?.addEventListener('click', deleteFromModal);

  // Star rating in modal
  document.querySelectorAll('#modal-star-rating .star').forEach(star => {
    star.addEventListener('click', () => {
      const val = parseInt(star.dataset.value);
      document.getElementById('modal-rating-val').value = val;
      updateStarDisplay(val);
    });
    star.addEventListener('mouseenter', () => {
      const val = parseInt(star.dataset.value);
      highlightStars(val);
    });
    star.addEventListener('mouseleave', () => {
      const cur = parseInt(document.getElementById('modal-rating-val')?.value || 0);
      updateStarDisplay(cur);
    });
  });

  // Profile form save
  document.getElementById('profile-save-btn')?.addEventListener('click', saveProfile);
  document.getElementById('profile-password-btn')?.addEventListener('click', changePassword);
}

// ── Tab navigation ────────────────────────────────────────────────────────────
function showTab(tab) {
  activeTab = tab;
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  document.querySelectorAll('[data-page]').forEach(page => {
    page.style.display = page.dataset.page === tab ? '' : 'none';
  });
  if (tab === 'mylist') renderWatchlistTab();
  if (tab === 'stats') loadStats();
}

// ── Debounce search ───────────────────────────────────────────────────────────
function debounceSearch(q) {
  clearTimeout(searchTimeout);
  if (!q.trim()) { showGenreContent(activeGenre, 1, false); return; }
  searchTimeout = setTimeout(() => doSearch(q), 300);
}

async function doSearch(q, batch = 1, append = false) {
  if (!q.trim()) { showGenreContent(activeGenre, 1, false); return; }
  currentQuery = q;
  currentPage  = batch;
  isTrending   = false;

  const grid = document.getElementById('results-grid');
  const label = document.getElementById('results-section-label');
  if (!grid) return;

  if (!append) {
    grid.innerHTML = skeletonCards(12);
    clearLoadMoreBtn();
    if (label) label.textContent = `"${escHtml(q)}" için Sonuçlar`;
  }

  try {
    const p1 = (batch - 1) * 2 + 1;
    const p2 = p1 + 1;
    let r1, r2;
    if (searchFilter === 'movie') {
      [r1, r2] = await Promise.all([searchMovies(q, p1), searchMovies(q, p2)]);
    } else if (searchFilter === 'tv') {
      [r1, r2] = await Promise.all([searchTV(q, p1), searchTV(q, p2)]);
    } else {
      [r1, r2] = await Promise.all([searchMulti(q, p1), searchMulti(q, p2)]);
    }
    const results = [...r1, ...r2];

    if (!results.length && !append) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">🔍</div>
        <h3>Sonuç bulunamadı</h3>
        <p>"${escHtml(q)}" için herhangi bir içerik bulunamadı.</p>
      </div>`;
      return;
    }

    renderSearchResults(results, append);

    if (results.length >= 15) {
      showLoadMoreBtn(() => doSearch(q, batch + 1, true));
    } else {
      clearLoadMoreBtn();
    }
  } catch (e) {
    if (!append) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">⚠️</div>
        <h3>Arama hatası</h3>
        <p>Arama sırasında bir sorun oluştu. Lütfen tekrar deneyin.</p>
      </div>`;
    }
  }
}

async function showTrending(page = 1, append = false) {
  showGenreContent('', page, append);
}

function loadTrending() { showGenreContent('', 1, false); }

// ── Genre content loader (40-50 items per page) ──────────────────────────────
let activeGenre = '';

const GENRE_TV_MAP = {
  '28': '10759',    // Aksiyon -> Action & Adventure
  '12': '10759',    // Macera -> Action & Adventure
  '14': '10765',    // Fantastik -> Sci-Fi & Fantasy
  '878': '10765',   // Bilim Kurgu -> Sci-Fi & Fantasy
  '10749': '10766', // Romantik -> Soap
  '53': '9648',     // Gerilim -> Mystery
  '27': '9648',     // Korku -> Mystery
  '36': '10768',    // Tarih -> War & Politics
  '10752': '10768', // Savaş -> War & Politics
};

async function showGenreContent(genreId = '', batch = 1, append = false) {
  activeGenre = genreId;
  isTrending = !genreId;
  currentPage = batch;

  const grid = document.getElementById('results-grid');
  const label = document.getElementById('results-section-label');
  if (!grid) return;

  if (!append) {
    grid.innerHTML = skeletonCards(12);
    clearLoadMoreBtn();
    if (label && !genreId) label.textContent = 'Trendler';
  }

  try {
    const p1 = (batch - 1) * 2 + 1;
    const p2 = p1 + 1;
    let allResults = [];
    const tvGenreId = GENRE_TV_MAP[genreId] || genreId;

    if (!genreId) {
      // Trendler (40 içerik)
      if (searchFilter === 'movie') {
        const [r1, r2] = await Promise.all([getTrending('movie', 'week', p1), getTrending('movie', 'week', p2)]);
        allResults = [...r1, ...r2];
      } else if (searchFilter === 'tv') {
        const [r1, r2] = await Promise.all([getTrending('tv', 'week', p1), getTrending('tv', 'week', p2)]);
        allResults = [...r1, ...r2];
      } else {
        const [r1, r2] = await Promise.all([getTrending('all', 'week', p1), getTrending('all', 'week', p2)]);
        allResults = [...r1, ...r2];
      }
    } else {
      // Belirli Bir Tür (40 içerik)
      if (searchFilter === 'movie') {
        const [r1, r2] = await Promise.all([getDiscover('movie', genreId, p1), getDiscover('movie', genreId, p2)]);
        allResults = [...r1, ...r2];
      } else if (searchFilter === 'tv') {
        const [r1, r2] = await Promise.all([getDiscover('tv', tvGenreId, p1), getDiscover('tv', tvGenreId, p2)]);
        allResults = [...r1, ...r2];
      } else {
        const [m1, m2, t1, t2] = await Promise.all([
          getDiscover('movie', genreId, p1),
          getDiscover('movie', genreId, p2),
          getDiscover('tv', tvGenreId, p1),
          getDiscover('tv', tvGenreId, p2)
        ]);
        const movies = [...m1, ...m2];
        const tvs = [...t1, ...t2];
        const maxLen = Math.max(movies.length, tvs.length);
        for (let i = 0; i < maxLen; i++) {
          if (movies[i]) allResults.push(movies[i]);
          if (tvs[i]) allResults.push(tvs[i]);
        }
      }
    }

    renderSearchResults(allResults, append);

    if (allResults.length >= 15) {
      showLoadMoreBtn(() => showGenreContent(genreId, batch + 1, true));
    } else {
      clearLoadMoreBtn();
    }

  } catch (e) {
    if (!append) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">⚠️</div>
        <h3>İçerikler yüklenemedi</h3>
        <p>Lütfen internet bağlantınızı veya API anahtarınızı kontrol edin.</p>
      </div>`;
    }
  }
}

function showLoadMoreBtn(onClick) {
  clearLoadMoreBtn();
  const container = document.getElementById('discover-load-more');
  if (!container) return;
  const btn = document.createElement('button');
  btn.id = 'load-more-btn';
  btn.className = 'btn btn-secondary';
  btn.style.cssText = 'min-width:240px;padding:var(--sp-3) var(--sp-8);font-size:var(--text-base);border-radius:var(--radius-full);font-weight:600;';
  btn.textContent = '⬇️ Daha Fazla Göster (+40)';
  btn.addEventListener('click', () => {
    btn.disabled = true;
    btn.textContent = '⏳ Yükleniyor...';
    onClick();
  });
  container.appendChild(btn);
}

function clearLoadMoreBtn() {
  document.getElementById('load-more-btn')?.remove();
}

function addLoadMoreBtn(onClick) { showLoadMoreBtn(onClick); }
function removeLoadMoreBtn() { clearLoadMoreBtn(); }



// ── Render search results ─────────────────────────────────────────────────────
function renderSearchResults(results, append = false) {
  const grid = document.getElementById('results-grid');
  if (!grid) return;
  const html = results.map(item => {
    const type   = item.media_type || 'movie';
    const title  = getTitle(item);
    const year   = getYear(item);
    const poster = item.poster_path ? getPosterUrl(item.poster_path, 'w342') : null;
    const rating = item.vote_average ? item.vote_average.toFixed(1) : '';
    const exists = watchlistItems.find(w => w.tmdb_id === item.id && w.media_type === type);

    return `
      <div class="media-card" data-id="${item.id}" data-type="${type}" onclick="openAddModal(${item.id},'${type}')">
        ${poster
          ? `<img class="media-card-poster" src="${poster}" alt="${escHtml(title)}" loading="lazy">`
          : `<div class="media-card-poster-placeholder"><i data-lucide="${type === 'movie' ? 'film' : 'tv'}" class="icon-lg"></i></div>`
        }
        <div class="media-card-overlay">
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); openAddModal(${item.id},'${type}')">
            <i data-lucide="${exists ? 'edit-3' : 'plus'}" class="icon-xs"></i>
            <span>${exists ? 'Düzenle' : 'Listeye Ekle'}</span>
          </button>
        </div>
        <div class="media-card-body">
          <div class="media-card-type">
            <span class="badge badge-${type}">${type === 'movie' ? 'Film' : 'Dizi'}</span>
          </div>
          <div class="media-card-title">${escHtml(title)}</div>
          <div class="media-card-meta">
            <span>${year}</span>
            ${rating ? `<span class="media-card-rating">★ ${rating}</span>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');

  if (append) {
    grid.insertAdjacentHTML('beforeend', html);
  } else {
    grid.innerHTML = html;
  }
  renderIcons(grid);
}

// ── Open add/edit modal (from search results) ─────────────────────────────────
window.openAddModal = async function(tmdbId, mediaType) {
  const existing = watchlistItems.find(w => w.tmdb_id === tmdbId && w.media_type === mediaType);
  showDetailModal(tmdbId, mediaType, existing || null);
};

// ── Open edit modal (from watchlist) ─────────────────────────────────────────
window.openEditModal = function(itemId) {
  const item = watchlistItems.find(w => w.id === itemId);
  if (!item) return;
  showDetailModal(item.tmdb_id, item.media_type, item);
};

// ── Show detail/add modal ─────────────────────────────────────────────────────
async function showDetailModal(tmdbId, mediaType, existingItem) {
  detailTarget = existingItem;
  const backdrop = document.getElementById('detail-modal-backdrop');
  const titleEl  = document.getElementById('detail-modal-title');
  const bodyEl   = document.getElementById('detail-modal-body');
  backdrop.classList.remove('hidden');

  // Loading state
  titleEl.textContent = 'Yükleniyor...';
  bodyEl.innerHTML = `<div class="loading-wrap"><div class="spinner-lg"></div></div>`;

  try {
    let details, title, genres, overview, posterPath, runtime;

    if (mediaType === 'movie') {
      details     = await getMovieDetails(tmdbId);
      title       = details.title;
      genres      = details.genres?.map(g => g.name) || [];
      overview    = details.overview;
      posterPath  = details.poster_path;
      runtime     = details.runtime;
    } else {
      details    = await getTVDetails(tmdbId);
      title      = details.name;
      genres     = details.genres?.map(g => g.name) || [];
      overview   = details.overview;
      posterPath = details.poster_path;
      runtime    = null; // will compute from episodes
    }

    titleEl.textContent = existingItem ? 'Düzenle' : 'Listeye Ekle';

    const poster = posterPath ? getPosterUrl(posterPath, 'w185') : null;
    const curStatus  = existingItem?.status  || 'watchlist';
    const curRating  = existingItem?.rating  || 0;
    const curNotes   = existingItem?.notes   || '';
    const curSeason  = existingItem?.current_season  || (mediaType === 'tv' ? 1 : null);
    const curEpisode = existingItem?.current_episode || (mediaType === 'tv' ? 1 : null);
    const totalSeasons  = details.number_of_seasons  || existingItem?.total_seasons;
    const totalEpisodes = details.number_of_episodes || existingItem?.total_episodes;

    bodyEl.innerHTML = `
      <div class="detail-modal-hero">
        ${poster
          ? `<img class="detail-poster" src="${poster}" alt="${escHtml(title)}">`
          : `<div class="detail-poster-placeholder"><i data-lucide="${mediaType === 'movie' ? 'film' : 'tv'}" class="icon-xl"></i></div>`
        }
        <div class="detail-info">
          <h2>${escHtml(title)}</h2>
          <div class="detail-meta">
            <span class="badge badge-${mediaType}">${mediaType === 'movie' ? 'Film' : 'Dizi'}</span>
            ${genres.slice(0,3).map(g => `<span class="badge" style="background:var(--clr-surface-2);color:var(--clr-text-secondary)">${g}</span>`).join('')}
          </div>
          <p class="detail-overview">${escHtml(overview || 'Açıklama bulunamadı.')}</p>
        </div>
      </div>

      <div class="detail-form">
        <input type="hidden" id="modal-tmdb-id" value="${tmdbId}">
        <input type="hidden" id="modal-media-type" value="${mediaType}">
        <input type="hidden" id="modal-title" value="${escHtml(title)}">
        <input type="hidden" id="modal-poster" value="${posterPath || ''}">
        <input type="hidden" id="modal-genres" value="${escHtml(JSON.stringify(genres))}">
        <input type="hidden" id="modal-runtime" value="${runtime || ''}">
        <input type="hidden" id="modal-total-seasons" value="${totalSeasons || ''}">
        <input type="hidden" id="modal-total-episodes" value="${totalEpisodes || ''}">
        <input type="hidden" id="modal-rating-val" value="${curRating}">

        <div class="detail-form-row">
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label" for="modal-status">Durum</label>
            <select class="form-select" id="modal-status">
              <option value="watchlist" ${curStatus === 'watchlist' ? 'selected' : ''}>İzlenecek</option>
              ${mediaType === 'tv' ? `<option value="watching" ${curStatus === 'watching' ? 'selected' : ''}>İzleniyor</option>` : ''}
              <option value="watched"   ${curStatus === 'watched'   ? 'selected' : ''}>İzlendi</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">Puanın (1–10)</label>
            <div id="modal-star-rating" class="star-rating" style="margin-top:6px">
              ${[1,2,3,4,5,6,7,8,9,10].map(v => `
                <span class="star ${v <= curRating ? 'active' : ''}" data-value="${v}" title="${v}">★</span>
              `).join('')}
            </div>
          </div>
        </div>

        ${mediaType === 'tv' ? `
        <div id="modal-tv-tracker-wrap" class="${curStatus === 'watchlist' ? 'collapsed' : ''}">
          <div class="season-tracker-header">
            <div class="season-header-left">
              <label class="form-label" style="margin:0;display:flex;align-items:center;gap:6px">
                <i data-lucide="tv" class="icon-xs"></i>
                <span>Sezon & Bölüm Takibi</span>
              </label>
              <span id="season-progress-label" class="season-progress-label">Yükleniyor...</span>
            </div>
            <div class="season-header-right">
              <select class="form-select season-select-sm" id="modal-season"></select>
            </div>
          </div>

          <div class="modal-ep-progress-bar">
            <div id="modal-season-progress-fill" class="modal-ep-progress-fill" style="width: 0%"></div>
          </div>

          <input type="hidden" id="modal-tracked-season" value="${curSeason || 1}">
          <input type="hidden" id="modal-tracked-episode" value="${curEpisode || 1}">
          <input type="hidden" id="modal-episode" value="${curEpisode || 1}">

          <div class="modal-episodes-container" id="modal-episodes-list">
            <div class="episodes-loading">
              <div class="spinner-sm"></div>
              <span>Bölümler yükleniyor...</span>
            </div>
          </div>
        </div>` : ''}

        <div class="form-group" style="margin-bottom:0">
          <label class="form-label" for="modal-notes">Notlarım</label>
          <textarea class="form-textarea" id="modal-notes" placeholder="Bu içerik hakkında notlarınız...">${escHtml(curNotes)}</textarea>
        </div>
      </div>

      <div style="display:flex;gap:var(--sp-3);margin-top:var(--sp-6)">
        ${existingItem
          ? `<button class="btn btn-danger btn-sm" id="detail-delete-btn" onclick="deleteFromModal()">
              <i data-lucide="trash-2" class="icon-xs"></i>
              <span>Kaldır</span>
            </button>`
          : ''
        }
        <button class="btn btn-secondary" onclick="closeDetailModal()" style="flex:1">İptal</button>
        <button class="btn btn-primary" id="detail-save-btn" onclick="saveDetailModal()" style="flex:2">
          <i data-lucide="${existingItem ? 'check' : 'plus'}" class="icon-xs"></i>
          <span class="btn-text">${existingItem ? 'Güncelle' : 'Ekle'}</span>
        </button>
      </div>
    `;

    // Re-bind stars
    bodyEl.querySelectorAll('#modal-star-rating .star').forEach(star => {
      star.addEventListener('click', () => {
        const val = parseInt(star.dataset.value);
        document.getElementById('modal-rating-val').value = val;
        updateStarDisplay(val, bodyEl);
      });
      star.addEventListener('mouseenter', () => highlightStars(parseInt(star.dataset.value), bodyEl));
      star.addEventListener('mouseleave', () => {
        const cur = parseInt(document.getElementById('modal-rating-val')?.value || 0);
        updateStarDisplay(cur, bodyEl);
      });
    });

    // Toggle episode tracker visibility smoothly based on status
    const statusSelect = document.getElementById('modal-status');
    const tvTrackerWrap = document.getElementById('modal-tv-tracker-wrap');
    if (statusSelect && tvTrackerWrap) {
      statusSelect.addEventListener('change', () => {
        tvTrackerWrap.classList.toggle('collapsed', statusSelect.value === 'watchlist');
      });
    }

    // Populate TV Show Season and Interactive Episodes List
    if (mediaType === 'tv') {
      const regularSeasons = (details.seasons || []).filter(s => s.season_number > 0);
      const totalSeasonsCount = regularSeasons.length || details.number_of_seasons || 1;

      let currentSavedSeason = Math.min(totalSeasonsCount, Math.max(1, curSeason || 1));
      let currentSavedEpisode = Math.max(1, curEpisode || 1);

      const seasonSelect = document.getElementById('modal-season');
      const hiddenEpInput = document.getElementById('modal-episode');
      const progressLabel = document.getElementById('season-progress-label');
      const progressFill = document.getElementById('modal-season-progress-fill');
      const episodesListEl = document.getElementById('modal-episodes-list');

      // Populate seasons dropdown
      if (seasonSelect) {
        seasonSelect.innerHTML = '';
        for (let s = 1; s <= totalSeasonsCount; s++) {
          const opt = document.createElement('option');
          opt.value = s;
          opt.textContent = `${s}. Sezon`;
          if (s === currentSavedSeason) opt.selected = true;
          seasonSelect.appendChild(opt);
        }
      }

      // Memory cache for season episodes
      const seasonCache = {};

      async function renderSeasonEpisodes(seasonNum) {
        if (!episodesListEl) return;
        episodesListEl.innerHTML = `
          <div class="episodes-loading">
            <div class="spinner-sm"></div>
            <span>${seasonNum}. Sezon bölümleri yükleniyor...</span>
          </div>`;

        try {
          if (!seasonCache[seasonNum]) {
            seasonCache[seasonNum] = await getTVSeason(tmdbId, seasonNum);
          }
          const seasonData = seasonCache[seasonNum];
          const episodes = seasonData.episodes || [];
          const totalEpInSeason = episodes.length || 1;

          function updateProgressUI() {
            let watchedCount = 0;
            if (seasonNum < currentSavedSeason) {
              watchedCount = totalEpInSeason;
            } else if (seasonNum === currentSavedSeason) {
              watchedCount = Math.min(totalEpInSeason, currentSavedEpisode);
            } else {
              watchedCount = 0;
            }
            const pct = Math.round((watchedCount / totalEpInSeason) * 100);
            if (progressLabel) {
              progressLabel.textContent = `${watchedCount} / ${totalEpInSeason} Bölüm İzlendi (%${pct})`;
            }
            if (progressFill) {
              progressFill.style.width = `${pct}%`;
            }
          }

          if (episodes.length === 0) {
            episodesListEl.innerHTML = `<div class="empty-state" style="padding:var(--sp-4)"><p>Bu sezon için bölüm bulunamadı.</p></div>`;
            return;
          }

          episodesListEl.innerHTML = episodes.map(ep => {
            const epNum = ep.episode_number;
            const epName = ep.name || `${epNum}. Bölüm`;
            const epOverview = ep.overview || 'Bu bölüm için henüz Türkçe açıklama eklenmedi.';
            const stillImg = ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : null;
            const runtime = ep.runtime ? `${ep.runtime} dk` : '';
            const airDate = ep.air_date ? new Date(ep.air_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
            const rating = ep.vote_average ? ep.vote_average.toFixed(1) : '';

            let isWatched = false;
            if (seasonNum < currentSavedSeason) {
              isWatched = true;
            } else if (seasonNum === currentSavedSeason && epNum <= currentSavedEpisode) {
              isWatched = true;
            }

            return `
              <div class="modal-ep-card ${isWatched ? 'watched' : ''}" data-ep="${epNum}">
                <div class="ep-thumb-wrap">
                  ${stillImg
                    ? `<img class="ep-thumb-img" src="${stillImg}" alt="${escHtml(epName)}" loading="lazy">`
                    : `<div class="ep-thumb-placeholder"><i data-lucide="tv" class="icon-md"></i></div>`
                  }
                  ${runtime ? `<span class="ep-runtime-badge">${runtime}</span>` : ''}
                </div>
                <div class="ep-card-body">
                  <div class="ep-card-title-row">
                    <span class="ep-number-tag">${epNum}. Bölüm</span>
                    <span class="ep-title-name">${escHtml(epName)}</span>
                  </div>
                  <div class="ep-card-meta">
                    ${airDate ? `<span>${airDate}</span>` : ''}
                    ${rating ? `<span class="ep-meta-rating">★ ${rating}</span>` : ''}
                  </div>
                  <p class="ep-card-overview">${escHtml(epOverview)}</p>
                </div>
                <div class="ep-card-action">
                  <button type="button" class="ep-circle-btn ${isWatched ? 'checked' : ''}" data-ep="${epNum}" aria-label="${epNum}. Bölümü İşaretle">
                    <i data-lucide="check" class="icon-xs"></i>
                  </button>
                </div>
              </div>
            `;
          }).join('');

          renderIcons(episodesListEl);
          updateProgressUI();

          // Episode click handler
          episodesListEl.querySelectorAll('.modal-ep-card').forEach(card => {
            card.addEventListener('click', () => {
              const epNum = parseInt(card.dataset.ep);
              // Toggle: if clicking currently active episode, toggle off to epNum - 1
              if (seasonNum === currentSavedSeason && currentSavedEpisode === epNum) {
                currentSavedEpisode = Math.max(0, epNum - 1);
              } else {
                currentSavedSeason = seasonNum;
                currentSavedEpisode = epNum;
              }

              const hiddenSeasonInput = document.getElementById('modal-tracked-season');
              const hiddenEpTrackedInput = document.getElementById('modal-tracked-episode');
              if (hiddenSeasonInput) hiddenSeasonInput.value = currentSavedSeason;
              if (hiddenEpTrackedInput) hiddenEpTrackedInput.value = currentSavedEpisode;
              if (hiddenEpInput) hiddenEpInput.value = currentSavedEpisode;

              // Auto-set status to watching if currently in watchlist
              const statusSel = document.getElementById('modal-status');
              if (statusSel && statusSel.value === 'watchlist') {
                statusSel.value = 'watching';
              }

              // Update all card states
              episodesListEl.querySelectorAll('.modal-ep-card').forEach(c => {
                const cEp = parseInt(c.dataset.ep);
                let cWatched = false;
                if (seasonNum < currentSavedSeason) {
                  cWatched = true;
                } else if (seasonNum === currentSavedSeason && cEp <= currentSavedEpisode) {
                  cWatched = true;
                }
                c.classList.toggle('watched', cWatched);
                const btn = c.querySelector('.ep-circle-btn');
                if (btn) btn.classList.toggle('checked', cWatched);
              });

              updateProgressUI();
            });
          });

        } catch (err) {
          episodesListEl.innerHTML = `<div class="empty-state" style="padding:var(--sp-4)"><p>Bölümler yüklenemedi.</p></div>`;
        }
      }

      // Initial season render
      renderSeasonEpisodes(currentSavedSeason);

      // On season dropdown change
      seasonSelect?.addEventListener('change', (e) => {
        const newSeason = parseInt(e.target.value) || 1;
        renderSeasonEpisodes(newSeason);
      });
    }

  } catch (e) {
    bodyEl.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">⚠️</div>
      <p>Detaylar yüklenemedi. TMDB API anahtarınızı kontrol edin.</p>
    </div>`;
  }
}

// ── Drum Picker (iOS-style vertical scroll with dynamic max) ──────────────────
function initDrumPicker(drumId, hiddenInputId, maxVal = null, currentVal = null, onChange = null) {
  const drum = document.getElementById(drumId);
  const hidden = document.getElementById(hiddenInputId);
  if (!drum || !hidden) return;

  const max = maxVal !== null ? maxVal : (parseInt(drum.dataset.max) || 20);
  const initVal = Math.min(max, Math.max(1, currentVal !== null ? currentVal : (parseInt(drum.dataset.val) || 1)));
  const itemH = 44;

  drum.innerHTML = '';
  drum.style.cssText = `position:relative;height:${itemH*3}px;overflow:hidden;border-radius:12px;background:var(--clr-surface-2);cursor:grab;user-select:none;touch-action:none;`;

  const list = document.createElement('div');
  list.style.cssText = `display:flex;flex-direction:column;transition:transform .15s ease;will-change:transform;`;

  for (let i = 0; i < 2; i++) { const p = document.createElement('div'); p.style.height = itemH+'px'; list.appendChild(p); }
  for (let i = 1; i <= max; i++) {
    const item = document.createElement('div');
    item.textContent = i; item.dataset.val = i;
    item.style.cssText = `height:${itemH}px;display:flex;align-items:center;justify-content:center;font-size:1.1rem;font-weight:600;color:var(--clr-text-secondary);transition:color .1s,font-size .1s;`;
    list.appendChild(item);
  }
  for (let i = 0; i < 2; i++) { const p = document.createElement('div'); p.style.height = itemH+'px'; list.appendChild(p); }
  drum.appendChild(list);

  const hl = document.createElement('div');
  hl.style.cssText = `position:absolute;left:4px;right:4px;top:${itemH}px;height:${itemH}px;border-top:2px solid var(--clr-primary);border-bottom:2px solid var(--clr-primary);background:var(--clr-primary-50,rgba(16,185,129,.12));pointer-events:none;border-radius:6px;`;
  drum.appendChild(hl);

  let currentIdx = initVal - 1;
  function setIdx(idx, animate = true) {
    idx = Math.max(0, Math.min(max - 1, idx));
    currentIdx = idx;
    if (!animate) list.style.transition = 'none';
    list.style.transform = `translateY(${-idx * itemH}px)`;
    if (!animate) requestAnimationFrame(() => { list.style.transition = 'transform .15s ease'; });
    const selectedVal = idx + 1;
    hidden.value = selectedVal;
    list.querySelectorAll('[data-val]').forEach(item => {
      const active = parseInt(item.dataset.val) === selectedVal;
      item.style.color = active ? 'var(--clr-primary)' : 'var(--clr-text-secondary)';
      item.style.fontSize = active ? '1.4rem' : '1rem';
      item.style.fontWeight = active ? '800' : '500';
    });
    if (onChange) onChange(selectedVal);
  }
  setIdx(initVal - 1, false);

  let startY = 0, startIdx = 0, dragging = false;
  drum.onmousedown = e => { dragging=true; startY=e.clientY; startIdx=currentIdx; drum.style.cursor='grabbing'; };
  const onMouseMove = e => { if (!dragging) return; setIdx(startIdx + Math.round((startY - e.clientY) / itemH)); };
  const onMouseUp = () => { if (dragging) { dragging=false; drum.style.cursor='grab'; } };
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  drum.ontouchstart = e => { dragging=true; startY=e.touches[0].clientY; startIdx=currentIdx; };
  drum.ontouchmove = e => { if (!dragging) return; setIdx(startIdx + Math.round((startY - e.touches[0].clientY) / itemH)); };
  drum.ontouchend = () => { dragging=false; };

  drum.onwheel = e => { e.preventDefault(); setIdx(currentIdx + (e.deltaY > 0 ? 1 : -1)); };
}

function updateStarDisplay(val, scope = document) {
  scope.querySelectorAll('#modal-star-rating .star').forEach(s => {
    s.classList.toggle('active', parseInt(s.dataset.value) <= val);
  });
}
function highlightStars(val, scope = document) {
  scope.querySelectorAll('#modal-star-rating .star').forEach(s => {
    s.classList.toggle('hovered', parseInt(s.dataset.value) <= val);
  });
}

window.closeDetailModal = function() {
  document.getElementById('detail-modal-backdrop')?.classList.add('hidden');
  detailTarget = null;
};

window.saveDetailModal = async function() {
  const tmdbId    = parseInt(document.getElementById('modal-tmdb-id')?.value);
  const mediaType = document.getElementById('modal-media-type')?.value;
  const title     = document.getElementById('modal-title')?.value;
  const poster    = document.getElementById('modal-poster')?.value;
  const status    = document.getElementById('modal-status')?.value;
  const rating    = parseInt(document.getElementById('modal-rating-val')?.value) || null;
  const notes     = document.getElementById('modal-notes')?.value || '';
  const runtime   = parseInt(document.getElementById('modal-runtime')?.value) || null;
  const totalSeasons  = parseInt(document.getElementById('modal-total-seasons')?.value) || null;
  const totalEpisodes = parseInt(document.getElementById('modal-total-episodes')?.value) || null;
  const genres = JSON.parse(document.getElementById('modal-genres')?.value || '[]');

  let currentSeason  = null, currentEpisode = null;
  if (mediaType === 'tv') {
    currentSeason  = parseInt(document.getElementById('modal-tracked-season')?.value || document.getElementById('modal-season')?.value)  || 1;
    currentEpisode = parseInt(document.getElementById('modal-tracked-episode')?.value || document.getElementById('modal-episode')?.value) || 1;
  }

  const payload = {
    tmdb_id: tmdbId,
    media_type: mediaType,
    title,
    poster_path: poster,
    genres,
    status,
    rating,
    notes,
    runtime_minutes: runtime,
    current_season: currentSeason,
    current_episode: currentEpisode,
    total_seasons: totalSeasons,
    total_episodes: totalEpisodes,
  };

  const btn = document.getElementById('detail-save-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner-lg" style="width:18px;height:18px;border-width:2px"></div>'; }

  try {
    if (detailTarget) {
      const updated = await updateWatchlistItem(detailTarget.id, payload);
      const idx = watchlistItems.findIndex(w => w.id === detailTarget.id);
      if (idx !== -1) watchlistItems[idx] = updated;
      showToast('Güncellendi ✓', 'success');
    } else {
      const added = await addToWatchlist(currentUser.id, payload);
      watchlistItems.unshift(added);
      showToast('Listeye eklendi ✓', 'success');
    }
    updateNavCounts();
    if (activeTab === 'mylist') renderWatchlistTab();
    closeDetailModal();
  } catch (e) {
    showToast('Bir hata oluştu: ' + e.message, 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '<span class="btn-text">Kaydet</span>'; }
  }
};

window.deleteFromModal = async function() {
  if (!detailTarget) return;
  if (!confirm(`"${detailTarget.title}" listeden kaldırılsın mı?`)) return;
  try {
    await deleteWatchlistItem(detailTarget.id);
    watchlistItems = watchlistItems.filter(w => w.id !== detailTarget.id);
    updateNavCounts();
    if (activeTab === 'mylist') renderWatchlistTab();
    closeDetailModal();
    showToast('Listeden kaldırıldı', 'info');
  } catch (e) {
    showToast('Silinemedi: ' + e.message, 'error');
  }
};

// ── Watchlist tab rendering ───────────────────────────────────────────────────
function renderWatchlistTab() {
  let items = watchlistItems.filter(i => i.status === listActiveTab);

  // Sort
  items = [...items].sort((a, b) => {
    if (currentSort === 'title') return a.title.localeCompare(b.title, 'tr');
    if (currentSort === 'rating') return (b.rating || 0) - (a.rating || 0);
    return new Date(b.added_at) - new Date(a.added_at); // default: newest
  });

  const container = document.getElementById('watchlist-grid');
  if (!container) return;

  // Update list tab counts
  ['watchlist', 'watching', 'watched'].forEach(s => {
    const el = document.getElementById(`list-count-${s}`);
    if (el) el.textContent = watchlistItems.filter(i => i.status === s).length;
  });

  if (!items.length) {
    const labels = { watchlist: 'İzlenecek listesi', watching: 'İzleniyor listesi', watched: 'İzlendi listesi' };
    const emptyIcons = { watchlist: 'clock', watching: 'play-circle', watched: 'check-circle' };
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon" style="color:var(--clr-primary)">
          <i data-lucide="${emptyIcons[listActiveTab]}" class="icon-xl"></i>
        </div>
        <h3>${labels[listActiveTab]} boş</h3>
        <p>İçerik aramak için Keşfet sekmesini kullanın.</p>
      </div>`;
    renderIcons(container);
    return;
  }

  container.innerHTML = items.map(item => {
    const poster = item.poster_path ? getPosterUrl(item.poster_path, 'w342') : null;
    const isTV   = item.media_type === 'tv';
    const progress = isTV && item.total_episodes && item.current_episode
      ? Math.round((item.current_episode / item.total_episodes) * 100)
      : null;

    return `
      <div class="wl-card" onclick="openEditModal('${item.id}')">
        ${poster
          ? `<img class="wl-card-poster" src="${poster}" alt="${escHtml(item.title)}" loading="lazy">`
          : `<div class="wl-card-poster-placeholder"><i data-lucide="${isTV ? 'tv' : 'film'}" class="icon-lg"></i></div>`
        }
        <div class="wl-card-body">
          <div class="wl-card-top">
            <div class="wl-card-title">${escHtml(item.title)}</div>
            <div class="wl-card-actions">
              <button class="btn btn-ghost btn-icon" onclick="event.stopPropagation(); openEditModal('${item.id}')" title="Düzenle">
                <i data-lucide="edit-3" class="icon-xs"></i>
              </button>
            </div>
          </div>

          ${item.rating ? `
            <div class="wl-card-rating">
              ${'★'.repeat(Math.round(item.rating / 2))}${'☆'.repeat(5 - Math.round(item.rating / 2))}
              <span style="color:var(--clr-text-muted);font-size:10px;margin-left:4px">${item.rating}/10</span>
            </div>` : ''
          }

          ${item.notes ? `<p style="font-size:var(--text-xs);color:var(--clr-text-muted);margin-bottom:var(--sp-2);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${escHtml(item.notes)}</p>` : ''}

          ${isTV && item.current_season ? `
            <div class="wl-card-ep" style="display:flex;align-items:center;gap:4px">
              <i data-lucide="tv" class="icon-xs" style="color:var(--clr-primary)"></i>
              <span>S${item.current_season} E${item.current_episode || 1}</span>
              ${item.total_episodes ? `<span style="color:var(--clr-text-muted)">/ ${item.total_episodes} bölüm</span>` : ''}
            </div>
            ${progress !== null ? `
            <div class="ep-progress">
              <div class="ep-progress-bar">
                <div class="ep-progress-fill" style="width:${progress}%"></div>
              </div>
              <div class="ep-progress-label">
                <span>${item.current_episode || 0} bölüm</span>
                <span>%${progress}</span>
              </div>
            </div>` : ''}
          ` : ''}

          <div class="wl-card-footer">
            <span class="badge badge-${item.media_type}">${isTV ? 'Dizi' : 'Film'}</span>
            ${item.genres?.length ? `<span style="font-size:10px;color:var(--clr-text-muted)">${item.genres[0]}</span>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');

  renderIcons(container);
}

// ── Stats ─────────────────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const stats = await fetchStats(currentUser.id);
    renderStatCards(stats);
    setTimeout(() => {
      renderGenreChart(stats);
      renderMonthlyChart(stats);
    }, 50);
    renderTopRated(stats);
  } catch (e) {
    showToast('İstatistikler yüklenemedi', 'error');
  }
}

// ── Profile ───────────────────────────────────────────────────────────────────
async function saveProfile() {
  const username = document.getElementById('profile-username-input')?.value?.trim();
  if (!username) { showToast('Kullanıcı adı boş olamaz', 'error'); return; }
  const btn = document.getElementById('profile-save-btn');
  if (btn) btn.disabled = true;
  try {
    await updateProfile(currentUser.id, { username });
    currentProfile = { ...currentProfile, username };
    renderUserInfo();
    showToast('Profil güncellendi ✓', 'success');
  } catch (e) {
    showToast('Güncelleme başarısız: ' + e.message, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function changePassword() {
  const newPass  = document.getElementById('profile-new-password')?.value;
  const confPass = document.getElementById('profile-confirm-password')?.value;
  if (!newPass || newPass.length < 6) { showToast('Şifre en az 6 karakter olmalı', 'error'); return; }
  if (newPass !== confPass) { showToast('Şifreler eşleşmiyor', 'error'); return; }
  const btn = document.getElementById('profile-password-btn');
  if (btn) btn.disabled = true;
  try {
    await updatePassword(newPass);
    document.getElementById('profile-new-password').value = '';
    document.getElementById('profile-confirm-password').value = '';
    showToast('Şifre güncellendi ✓', 'success');
  } catch (e) {
    showToast('Şifre değiştirilemedi: ' + e.message, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ── Toast notifications ───────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
window.showToast = showToast;

// ── Helpers ───────────────────────────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
window.escHtml = escHtml;

function skeletonCards(n) {
  return Array.from({ length: n }, () => `
    <div class="media-card" style="pointer-events:none">
      <div class="skeleton" style="width:100%;aspect-ratio:2/3"></div>
      <div class="media-card-body">
        <div class="skeleton" style="height:12px;width:40%;margin-bottom:8px"></div>
        <div class="skeleton" style="height:14px;width:85%;margin-bottom:4px"></div>
        <div class="skeleton" style="height:14px;width:60%"></div>
      </div>
    </div>`).join('');
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
init();
