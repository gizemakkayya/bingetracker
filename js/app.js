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
  const bodyEl   = document.getElementById('detail-modal-body');
  backdrop.classList.remove('hidden');

  // Loading state
  bodyEl.innerHTML = `<div class="loading-wrap" style="padding:var(--sp-12) 0"><div class="spinner-lg"></div></div>`;

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

    const poster = posterPath ? getPosterUrl(posterPath, 'w342') : null;
    const backdropImg = details.backdrop_path ? `https://image.tmdb.org/t/p/w780${details.backdrop_path}` : (poster || '');
    const year = (details.release_date || details.first_air_date || '').slice(0, 4);
    const isEnded = details.status === 'Ended' || details.status === 'Canceled';
    const statusTag = mediaType === 'tv' ? (isEnded ? 'Final Yaptı' : (details.status === 'Returning Series' ? 'Devam Ediyor' : '')) : '';
    const ratingVal = details.vote_average ? details.vote_average.toFixed(1) : '';
    const voteCount = details.vote_count ? (details.vote_count >= 1000 ? `${(details.vote_count / 1000).toFixed(1)}k` : details.vote_count) : null;
    const imdbId = details.imdb_id || details.external_ids?.imdb_id || null;

    const rawStatus  = existingItem?.status  || 'watchlist';
    const curStatus  = (mediaType === 'tv' && rawStatus === 'watched') ? 'watching' : rawStatus;
    const curRating  = existingItem?.rating  || 0;
    const curNotes   = existingItem?.notes   || '';
    const curSeason  = existingItem?.current_season  || (mediaType === 'tv' ? 1 : null);
    const curEpisode = existingItem?.current_episode || (mediaType === 'tv' ? 1 : null);
    const totalSeasons  = details.number_of_seasons  || existingItem?.total_seasons;
    const totalEpisodes = details.number_of_episodes || existingItem?.total_episodes;
    const castList = (details.credits?.cast || []).slice(0, 15);

    // Extract Watch Providers (Platforms)
    const wpResults = details['watch/providers']?.results || {};
    const trProviders = wpResults['TR'];
    const usProviders = wpResults['US'];
    const activeCountry = trProviders || usProviders || Object.values(wpResults)[0];
    const providersList = [];
    const seenProviders = new Set();

    if (activeCountry) {
      const addP = (arr, typeName) => {
        (arr || []).forEach(p => {
          if (!seenProviders.has(p.provider_id)) {
            seenProviders.add(p.provider_id);
            providersList.push({
              id: p.provider_id,
              name: p.provider_name,
              logo: p.logo_path ? `https://image.tmdb.org/t/p/w92${p.logo_path}` : null,
              type: typeName
            });
          }
        });
      };
      addP(activeCountry.flatrate, 'Yayın');
      addP(activeCountry.free, 'Ücretsiz');
      addP(activeCountry.ads, 'Reklamlı');
      addP(activeCountry.buy, 'Satın Al');
      addP(activeCountry.rent, 'Kirala');
    }

    bodyEl.innerHTML = `
      <!-- Top Backdrop Banner -->
      <div class="detail-modal-banner" style="${backdropImg ? `background-image: url('${backdropImg}')` : ''}">
        <div class="detail-modal-banner-gradient"></div>
        <button type="button" class="modal-banner-close-btn" onclick="closeDetailModal()" aria-label="Kapat">
          <i data-lucide="x" class="icon-sm"></i>
        </button>
      </div>

      <!-- Body Container -->
      <div class="detail-modal-body-wrap">
        <!-- Hero Section: Poster on Left + Meta & Providers on Right -->
        <div class="detail-hero-section">
          <div class="detail-floating-poster-wrap">
            ${poster
              ? `<img class="detail-floating-poster" src="${poster}" alt="${escHtml(title)}">`
              : `<div class="detail-floating-poster-placeholder"><i data-lucide="${mediaType === 'movie' ? 'film' : 'tv'}" class="icon-xl"></i></div>`
            }
          </div>

          <div class="detail-hero-info">
            <div class="detail-banner-badges">
              <span class="badge badge-${mediaType}">${mediaType === 'movie' ? 'Film' : 'Dizi'}</span>
              ${year ? `<span class="detail-year-badge">${year}</span>` : ''}
              ${statusTag ? `<span class="detail-status-badge ${isEnded ? 'ended' : ''}">${statusTag}</span>` : ''}
              ${ratingVal ? `
                <span class="detail-tmdb-badge" title="${details.vote_count ? `${details.vote_count.toLocaleString('tr-TR')} oy kullanıldı` : 'TMDB Puanı'}">
                  <span class="tmdb-star">★</span> ${ratingVal} <small class="rating-votes-count">${voteCount ? `(${voteCount})` : 'TMDB'}</small>
                </span>
              ` : ''}
              ${imdbId ? `
                <a href="https://www.imdb.com/title/${imdbId}/" target="_blank" rel="noopener noreferrer" class="detail-imdb-badge" title="Resmi IMDb sayfasını aç">
                  <span class="imdb-icon-box">IMDb</span>
                  ${ratingVal ? `<span class="imdb-score-text">★ ${ratingVal}</span>` : ''}
                  <i data-lucide="external-link" class="icon-xxs"></i>
                </a>
              ` : ''}
            </div>
            <h2 class="detail-banner-title">${escHtml(title)}</h2>
            <div class="detail-genre-tags">
              ${genres.slice(0, 4).map(g => `<span class="detail-genre-pill">${escHtml(g)}</span>`).join('')}
            </div>

            <!-- Watch Providers (Platformlar) -->
            ${providersList.length ? `
              <div class="detail-providers-bar">
                <span class="detail-providers-title">
                  <i data-lucide="tv" class="icon-xxs"></i>
                  <span>Platformlar:</span>
                </span>
                <div class="detail-providers-list">
                  ${providersList.slice(0, 4).map(p => `
                    <div class="detail-provider-badge" title="${escHtml(p.name)} (${p.type})">
                      ${p.logo ? `<img src="${p.logo}" alt="${escHtml(p.name)}" class="provider-logo-mini">` : ''}
                      <span class="provider-name-text">${escHtml(p.name)}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Option Switcher (Konusu / Oyuncular) -->
        <div class="detail-view-options-row">
          <div class="detail-view-options">
            <button type="button" class="detail-opt-btn active" id="btn-opt-overview" onclick="switchDetailTab('overview')">
              <i data-lucide="align-left" class="icon-xs"></i>
              <span>Konusu</span>
            </button>
            <button type="button" class="detail-opt-btn" id="btn-opt-cast" onclick="switchDetailTab('cast')">
              <i data-lucide="users" class="icon-xs"></i>
              <span>Oyuncular ${castList.length ? `(${castList.length})` : ''}</span>
            </button>
          </div>
        </div>

        <!-- Tab Content Area -->
        <div class="detail-tab-content-area">
          <div id="detail-overview-content" class="detail-tab-pane active">
            <p class="detail-overview-text">${escHtml(overview || 'Bu içerik için henüz Türkçe açıklama girilmemiş.')}</p>
          </div>

          <div id="detail-cast-content" class="detail-tab-pane">
            ${castList.length ? `
              <div class="detail-cast-scroll">
                ${castList.map(actor => {
                  const photo = actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : null;
                  return `
                    <div class="cast-card">
                      <div class="cast-photo-wrap">
                        ${photo 
                          ? `<img src="${photo}" alt="${escHtml(actor.name)}" class="cast-photo" loading="lazy">` 
                          : `<div class="cast-photo-placeholder"><i data-lucide="user" class="icon-sm"></i></div>`
                        }
                      </div>
                      <div class="cast-name" title="${escHtml(actor.name)}">${escHtml(actor.name)}</div>
                      <div class="cast-character" title="${escHtml(actor.character || 'Oyuncu')}">${escHtml(actor.character || 'Oyuncu')}</div>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : `<p class="detail-overview-text" style="font-style:italic">Oyuncu kadrosu bulunamadı.</p>`}
          </div>
        </div>

        <!-- Status & Rating Controls -->
        <div class="detail-controls-card">
          <input type="hidden" id="modal-status-val" value="${curStatus}">
          <input type="hidden" id="modal-rating-val" value="${curRating}">

          <div class="detail-controls-grid">
            <!-- Status Buttons -->
            <div class="detail-control-block">
              <label class="detail-control-label">İzleme Durumu</label>
              <div class="detail-status-pills">
                <button type="button" class="status-pill-btn ${curStatus === 'watchlist' ? 'active watchlist' : ''}" data-status="watchlist" onclick="setModalStatus('watchlist')">
                  <i data-lucide="bookmark" class="icon-xs"></i>
                  <span>İzlenecek</span>
                </button>
                ${mediaType === 'tv' ? `
                  <button type="button" class="status-pill-btn ${curStatus === 'watching' ? 'active watching' : ''}" data-status="watching" onclick="setModalStatus('watching')">
                    <i data-lucide="play" class="icon-xs"></i>
                    <span>İzleniyor</span>
                  </button>
                ` : `
                  <button type="button" class="status-pill-btn ${curStatus === 'watched' ? 'active watched' : ''}" data-status="watched" onclick="setModalStatus('watched')">
                    <i data-lucide="check-circle" class="icon-xs"></i>
                    <span>İzlendi</span>
                  </button>
                `}
              </div>
            </div>

            <!-- Star Rating -->
            <div class="detail-control-block">
              <div class="rating-header-row">
                <label class="detail-control-label">Senin Puanın</label>
                <span id="modal-rating-text" class="rating-score-text">${curRating ? `${curRating} / 10 ★` : 'Puan Ver'}</span>
              </div>
              <div id="modal-star-rating" class="star-rating-row">
                ${[1,2,3,4,5,6,7,8,9,10].map(v => `
                  <button type="button" class="star-btn ${v <= curRating ? 'active' : ''}" data-value="${v}" onclick="setModalRating(${v})">★</button>
                `).join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- TV Tracker (if TV) -->
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
          </div>
        ` : ''}

        <!-- Notes -->
        <div class="form-group" style="margin-top:var(--sp-2);margin-bottom:0">
          <label class="detail-control-label" for="modal-notes" style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
            <i data-lucide="message-square" class="icon-xs"></i>
            <span>Notlarım & İncelemem</span>
          </label>
          <textarea class="form-textarea detail-notes-input" id="modal-notes" placeholder="Bu içerik hakkında düşünceleriniz, kaldığınız yer veya hatırlatıcı notlarınız...">${escHtml(curNotes)}</textarea>
        </div>

        <!-- Hidden Data Fields -->
        <input type="hidden" id="modal-tmdb-id" value="${tmdbId}">
        <input type="hidden" id="modal-media-type" value="${mediaType}">
        <input type="hidden" id="modal-title" value="${escHtml(title)}">
        <input type="hidden" id="modal-poster" value="${posterPath || ''}">
        <input type="hidden" id="modal-genres" value="${escHtml(JSON.stringify(genres))}">
        <input type="hidden" id="modal-runtime" value="${runtime || ''}">
        <input type="hidden" id="modal-total-seasons" value="${totalSeasons || ''}">
        <input type="hidden" id="modal-total-episodes" value="${totalEpisodes || ''}">

        <!-- Footer Actions -->
        <div class="detail-modal-footer">
          ${existingItem
            ? `<button type="button" class="btn btn-danger btn-sm" id="detail-delete-btn" onclick="deleteFromModal()">
                <i data-lucide="trash-2" class="icon-xs"></i>
                <span>Kaldır</span>
              </button>`
            : ''
          }
          <div style="flex:1"></div>
          <button type="button" class="btn btn-secondary" onclick="closeDetailModal()">Vazgeç</button>
          <button type="button" class="btn btn-primary" id="detail-save-btn" onclick="saveDetailModal()">
            <i data-lucide="${existingItem ? 'check' : 'plus'}" class="icon-xs"></i>
            <span class="btn-text">${existingItem ? 'Güncelle' : 'Listeye Ekle'}</span>
          </button>
        </div>
      </div>
    `;

    renderIcons(bodyEl);

    // Star rating hover events
    bodyEl.querySelectorAll('#modal-star-rating .star-btn').forEach(star => {
      star.addEventListener('mouseenter', () => {
        const hoverVal = parseInt(star.dataset.value);
        bodyEl.querySelectorAll('#modal-star-rating .star-btn').forEach(s => {
          s.classList.toggle('hovered', parseInt(s.dataset.value) <= hoverVal);
        });
      });
      star.addEventListener('mouseleave', () => {
        bodyEl.querySelectorAll('#modal-star-rating .star-btn').forEach(s => s.classList.remove('hovered'));
      });
    });

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

              // Auto-set status to watching if in watchlist
              setModalStatus('watching');

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

              // Auto-save in background immediately without needing to click "Güncelle"
              autoSaveProgress(currentSavedSeason, currentSavedEpisode);

              // Check if entire series is completed!
              if (seasonNum === totalSeasonsCount && currentSavedEpisode === totalEpInSeason) {
                triggerCelebration(title, isEnded ? 'Final Yaptı • Dizi Bitti' : 'Tüm Sezonlar Tamamlandı');
              }
            });
          });

          async function autoSaveProgress(newSeason, newEpisode) {
            try {
              const tmdbId    = parseInt(document.getElementById('modal-tmdb-id')?.value);
              const mediaType = document.getElementById('modal-media-type')?.value;
              const title     = document.getElementById('modal-title')?.value;
              const poster    = document.getElementById('modal-poster')?.value;
              const rating    = parseInt(document.getElementById('modal-rating-val')?.value) || null;
              const notes     = document.getElementById('modal-notes')?.value || '';
              const runtime   = parseInt(document.getElementById('modal-runtime')?.value) || null;
              const totalSeasons  = parseInt(document.getElementById('modal-total-seasons')?.value) || null;
              const totalEpisodes = parseInt(document.getElementById('modal-total-episodes')?.value) || null;
              const genres = JSON.parse(document.getElementById('modal-genres')?.value || '[]');

              const payload = {
                tmdb_id: tmdbId,
                media_type: mediaType,
                title,
                poster_path: poster,
                genres,
                status: 'watching',
                rating,
                notes,
                runtime_minutes: runtime,
                current_season: newSeason,
                current_episode: newEpisode,
                total_seasons: totalSeasons,
                total_episodes: totalEpisodes,
              };

              if (detailTarget) {
                const updated = await updateWatchlistItem(detailTarget.id, payload);
                const idx = watchlistItems.findIndex(w => w.id === detailTarget.id);
                if (idx !== -1) watchlistItems[idx] = updated;
                detailTarget = updated;
              } else {
                const added = await addToWatchlist(currentUser.id, payload);
                watchlistItems.unshift(added);
                detailTarget = added;
              }
              updateNavCounts();
              if (activeTab === 'mylist') renderWatchlistTab();
              showToast(`S${newSeason}:B${newEpisode} kaydedildi ✓`, 'success', 1800);
            } catch (err) {
              console.error('Otomatik kaydetme hatası:', err);
            }
          }

        } catch (e) {
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
    bodyEl.innerHTML = `<div class="empty-state" style="padding:var(--sp-8)">
      <div class="empty-state-icon">⚠️</div>
      <p>Detaylar yüklenemedi. TMDB API anahtarınızı kontrol edin.</p>
    </div>`;
  }
}

// ── Status & Rating Modal Handlers ────────────────────────────────────────────
window.setModalStatus = function(newStatus) {
  const hidden = document.getElementById('modal-status-val');
  if (hidden) hidden.value = newStatus;

  document.querySelectorAll('.status-pill-btn').forEach(btn => {
    const s = btn.dataset.status;
    const isActive = s === newStatus;
    btn.classList.toggle('active', isActive);
    btn.className = `status-pill-btn ${s} ${isActive ? 'active ' + s : ''}`;
  });

  const tvWrap = document.getElementById('modal-tv-tracker-wrap');
  if (tvWrap) {
    tvWrap.classList.toggle('collapsed', newStatus === 'watchlist');
  }
};

window.setModalRating = function(val) {
  const hidden = document.getElementById('modal-rating-val');
  const textEl = document.getElementById('modal-rating-text');
  if (hidden) hidden.value = val;
  if (textEl) textEl.textContent = val ? `${val} / 10 ★` : 'Puan Ver';

  document.querySelectorAll('#modal-star-rating .star-btn').forEach(btn => {
    const v = parseInt(btn.dataset.value);
    btn.classList.toggle('active', v <= val);
  });
};

window.switchDetailTab = function(tab) {
  const btnOverview = document.getElementById('btn-opt-overview');
  const btnCast = document.getElementById('btn-opt-cast');
  const paneOverview = document.getElementById('detail-overview-content');
  const paneCast = document.getElementById('detail-cast-content');

  if (tab === 'overview') {
    btnOverview?.classList.add('active');
    btnCast?.classList.remove('active');
    paneOverview?.classList.add('active');
    paneCast?.classList.remove('active');
  } else {
    btnCast?.classList.add('active');
    btnOverview?.classList.remove('active');
    paneCast?.classList.add('active');
    paneOverview?.classList.remove('active');
  }
};

window.closeDetailModal = function() {
  document.getElementById('detail-modal-backdrop')?.classList.add('hidden');
  detailTarget = null;
};

// ── Fireworks & Celebration Engine ───────────────────────────────────────────
let fireworksAnimationId = null;

export function triggerCelebration(title, statusTag = 'Tüm Sezonlar Tamamlandı') {
  const overlay = document.getElementById('celebration-overlay');
  const titleEl = document.getElementById('celebration-title');
  const tagEl   = document.getElementById('celebration-status-tag');
  if (!overlay) return;

  if (titleEl) titleEl.textContent = title || 'Dizi';
  if (tagEl)   tagEl.textContent = `✨ ${statusTag || 'Final Yaptı • Tüm Sezonlar Bitti'}`;
  overlay.classList.remove('hidden');

  // 1. Trigger Canvas Confetti if loaded
  if (typeof window.confetti === 'function') {
    window.confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 }
    });

    const duration = 4.5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10001 };

    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        return clearInterval(interval);
      }
      const particleCount = 45 * (timeLeft / duration);
      window.confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
      window.confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);
  }

  // 2. Run Canvas Particle Fireworks
  startCanvasFireworks();
}
window.triggerCelebration = triggerCelebration;

export function closeCelebration() {
  const overlay = document.getElementById('celebration-overlay');
  if (overlay) overlay.classList.add('hidden');
  if (fireworksAnimationId) {
    cancelAnimationFrame(fireworksAnimationId);
    fireworksAnimationId = null;
  }
}
window.closeCelebration = closeCelebration;

function startCanvasFireworks() {
  const canvas = document.getElementById('fireworks-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const rockets = [];
  const colors = ['#10b981', '#34d399', '#f59e0b', '#fbbf24', '#3b82f6', '#ec4899', '#8b5cf6', '#ef4444', '#ffffff'];

  class Rocket {
    constructor() {
      this.x = Math.random() * canvas.width * 0.8 + canvas.width * 0.1;
      this.y = canvas.height;
      this.targetY = Math.random() * canvas.height * 0.45 + canvas.height * 0.1;
      this.speed = Math.random() * 4 + 7;
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.dead = false;
    }
    update() {
      this.y -= this.speed;
      if (this.y <= this.targetY) {
        this.dead = true;
        this.explode();
      }
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = this.color;
      ctx.fill();
    }
    explode() {
      const count = 75;
      for (let i = 0; i < count; i++) {
        particles.push(new Particle(this.x, this.y, this.color));
      }
    }
  }

  class Particle {
    constructor(x, y, color) {
      this.x = x;
      this.y = y;
      this.color = color;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 1.5;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.alpha = 1;
      this.decay = Math.random() * 0.015 + 0.012;
      this.gravity = 0.08;
      this.size = Math.random() * 2.5 + 1.5;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += this.gravity;
      this.vx *= 0.98;
      this.alpha -= this.decay;
    }
    draw() {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.alpha);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = this.color;
      ctx.fill();
      ctx.restore();
    }
  }

  let spawnTimer = 0;

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    spawnTimer++;
    if (spawnTimer % 18 === 0 && rockets.length < 6) {
      rockets.push(new Rocket());
    }

    for (let i = rockets.length - 1; i >= 0; i--) {
      rockets[i].update();
      rockets[i].draw();
      if (rockets[i].dead) rockets.splice(i, 1);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].update();
      particles[i].draw();
      if (particles[i].alpha <= 0) particles.splice(i, 1);
    }

    fireworksAnimationId = requestAnimationFrame(loop);
  }

  // initial rockets
  rockets.push(new Rocket());
  rockets.push(new Rocket());

  loop();
}

window.saveDetailModal = async function() {
  const tmdbId    = parseInt(document.getElementById('modal-tmdb-id')?.value);
  const mediaType = document.getElementById('modal-media-type')?.value;
  const title     = document.getElementById('modal-title')?.value;
  const poster    = document.getElementById('modal-poster')?.value;
  const status    = document.getElementById('modal-status-val')?.value || document.getElementById('modal-status')?.value || 'watchlist';
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
