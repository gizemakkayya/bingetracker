import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Star,
  Film,
  Tv,
  Plus,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  LayoutGrid,
  Loader2,
  X,
  Play,
  TrendingUp,
  Award,
  Sparkles,
  Info,
  Clock
} from 'lucide-react';
import { api } from '../services/api.js';
import { TMDBMediaItem, WatchlistItem } from '../types/index.js';
import { MediaDetailModal } from '../components/MediaDetailModal.js';

// Predefined TMDB genre list
const GENRES = [
  { id: '', name: 'Tüm Trendler', icon: Flame },
  { id: '28', name: 'Aksiyon' },
  { id: '12', name: 'Macera' },
  { id: '35', name: 'Komedi' },
  { id: '18', name: 'Dram' },
  { id: '878', name: 'Bilim Kurgu' },
  { id: '27', name: 'Korku' },
  { id: '53', name: 'Gerilim' },
  { id: '10749', name: 'Romantik' },
  { id: '16', name: 'Animasyon' },
  { id: '80', name: 'Suç' },
  { id: '9648', name: 'Gizem' },
  { id: '14', name: 'Fantastik' },
  { id: '99', name: 'Belgesel' },
  { id: '10751', name: 'Aile' },
  { id: '36', name: 'Tarih' },
  { id: '10752', name: 'Savaş' },
];

export const DiscoverPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || '';

  const [searchInput, setSearchInput] = useState(urlQuery);
  const [activeQuery, setActiveQuery] = useState(urlQuery);
  const [filterType, setFilterType] = useState<'all' | 'movie' | 'tv'>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  
  // Content states
  const [items, setItems] = useState<TMDBMediaItem[]>([]);
  const [spotlightItems, setSpotlightItems] = useState<TMDBMediaItem[]>([]);
  const [spotlightIndex, setSpotlightIndex] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [selectedMedia, setSelectedMedia] = useState<{ id: number; media_type: 'movie' | 'tv' } | null>(null);
  const [userWatchlist, setUserWatchlist] = useState<WatchlistItem[]>([]);
  const [quickAddingId, setQuickAddingId] = useState<number | null>(null);

  const genreScrollRef = useRef<HTMLDivElement>(null);

  // Sync state with URL query param
  useEffect(() => {
    setSearchInput(urlQuery);
    setActiveQuery(urlQuery);
    if (urlQuery) {
      setSelectedGenre('');
    }
  }, [urlQuery]);

  // Load user watchlist to show status tags
  const loadWatchlist = async () => {
    try {
      const res = await api.get('/tracker');
      setUserWatchlist(res.data.data || []);
    } catch {
      // Not logged in or error
    }
  };

  useEffect(() => {
    loadWatchlist();
  }, []);

  // Fetch Spotlight Items on mount
  useEffect(() => {
    async function loadSpotlight() {
      try {
        const res = await api.get('/media/trending?type=all&timeWindow=week');
        const list = (res.data.data || []).filter((item: TMDBMediaItem) => item.backdrop_path);
        setSpotlightItems(list.slice(0, 6));
      } catch (err) {
        console.error('Spotlight yüklenemedi:', err);
      }
    }
    loadSpotlight();
  }, []);

  // Auto rotate spotlight
  useEffect(() => {
    if (spotlightItems.length <= 1) return;
    const interval = setInterval(() => {
      setSpotlightIndex((prev) => (prev + 1) % spotlightItems.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [spotlightItems.length]);

  // Fetch grid content
  useEffect(() => {
    let isCancelled = false;

    async function loadContent() {
      setLoading(true);
      setPage(1);
      setHasMore(true);

      try {
        let results: TMDBMediaItem[] = [];

        if (activeQuery.trim()) {
          const res = await api.get(`/media/search?q=${encodeURIComponent(activeQuery.trim())}&page=1`);
          results = res.data.data || [];
        } else if (selectedGenre) {
          const type = filterType === 'tv' ? 'tv' : 'movie';
          const res = await api.get(`/media/discover?type=${type}&genreId=${selectedGenre}&page=1`);
          results = res.data.data || [];
        } else {
          const res = await api.get(`/media/trending?type=${filterType}&page=1`);
          results = res.data.data || [];
        }

        if (!isCancelled) {
          setItems(results);
          if (results.length < 12) setHasMore(false);
        }
      } catch (err) {
        console.error('İçerik yüklenemedi:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadContent();

    return () => {
      isCancelled = true;
    };
  }, [activeQuery, filterType, selectedGenre]);

  // Load more pagination
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;

    try {
      let nextResults: TMDBMediaItem[] = [];

      if (activeQuery.trim()) {
        const res = await api.get(`/media/search?q=${encodeURIComponent(activeQuery.trim())}&page=${nextPage}`);
        nextResults = res.data.data || [];
      } else if (selectedGenre) {
        const type = filterType === 'tv' ? 'tv' : 'movie';
        const res = await api.get(`/media/discover?type=${type}&genreId=${selectedGenre}&page=${nextPage}`);
        nextResults = res.data.data || [];
      } else {
        const res = await api.get(`/media/trending?type=${filterType}&page=${nextPage}`);
        nextResults = res.data.data || [];
      }

      if (nextResults.length === 0) {
        setHasMore(false);
      } else {
        setItems((prev) => [...prev, ...nextResults]);
        setPage(nextPage);
      }
    } catch (err) {
      console.error('Daha fazla içerik yüklenemedi:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Quick 1-click add to watchlist
  const handleQuickAdd = async (e: React.MouseEvent, item: TMDBMediaItem) => {
    e.stopPropagation();
    const type = (item.media_type || (item.title ? 'movie' : 'tv')) as 'movie' | 'tv';
    const exists = userWatchlist.find((w) => w.tmdbId === item.id && w.mediaType === type);
    
    if (exists) {
      setSelectedMedia({ id: item.id, media_type: type });
      return;
    }

    try {
      setQuickAddingId(item.id);
      const title = item.title || item.name || '';
      await api.post('/tracker', {
        tmdbId: item.id,
        mediaType: type,
        title,
        posterPath: item.poster_path,
        status: 'watchlist',
        runtimeMinutes: item.runtime || null
      });
      await loadWatchlist();
    } catch (err) {
      console.error('Hızlı eklenemedi:', err);
    } finally {
      setQuickAddingId(null);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchInput.trim();
    setActiveQuery(clean);
    if (clean) {
      setSearchParams({ q: clean });
    } else {
      setSearchParams({});
    }
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setActiveQuery('');
    setSearchParams({});
  };

  const scrollGenres = (direction: 'left' | 'right') => {
    if (genreScrollRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      genreScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Filter items by movie/tv if in all/search mode
  const filteredItems = items.filter((item) => {
    if (filterType === 'all') return true;
    const itemType = item.media_type || (item.title ? 'movie' : 'tv');
    return itemType === filterType;
  });

  const currentSpotlight = spotlightItems[spotlightIndex];

  return (
    <div className="min-h-screen pb-20 font-sans">

      {/* ── 1. CINEMATIC SPOTLIGHT HERO CAROUSEL (Only on home discover) ── */}
      {!activeQuery && currentSpotlight && (
        <div className="relative w-full h-[460px] sm:h-[540px] md:h-[600px] overflow-hidden select-none bg-black">
          {/* Backdrop Image */}
          <div className="absolute inset-0 transition-opacity duration-1000 ease-in-out">
            <img
              src={`https://image.tmdb.org/t/p/original${currentSpotlight.backdrop_path}`}
              alt={currentSpotlight.title || currentSpotlight.name}
              className="w-full h-full object-cover object-top opacity-50 sm:opacity-60 scale-105 animate-in fade-in zoom-in-95 duration-1000"
            />
          </div>

          {/* Cinematic Vignette Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#020806] via-[#020806]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#020806] via-[#020806]/80 to-transparent w-full md:w-3/4" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.15),transparent_60%)] pointer-events-none" />

          {/* Spotlight Content */}
          <div className="relative max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-12 sm:pb-16 z-10">
            <div className="max-w-2xl space-y-4">
              
              {/* Badge & Rating */}
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-extrabold uppercase tracking-wider backdrop-blur-md">
                  <Sparkles className="w-3.5 h-3.5" /> Öne Çıkan Trend
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 text-slate-200 border border-white/10 text-xs font-semibold backdrop-blur-md">
                  {currentSpotlight.media_type === 'tv' ? 'Dizi' : 'Film'}
                </span>
                {currentSpotlight.vote_average ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold backdrop-blur-md">
                    <Star className="w-3.5 h-3.5 fill-amber-400" /> {currentSpotlight.vote_average.toFixed(1)} / 10
                  </span>
                ) : null}
                <span className="text-xs text-slate-400 font-medium">
                  {(currentSpotlight.release_date || currentSpotlight.first_air_date || '').slice(0, 4)}
                </span>
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none drop-shadow-2xl">
                {currentSpotlight.title || currentSpotlight.name}
              </h1>

              {/* Synopsis */}
              <p className="text-xs sm:text-sm md:text-base text-slate-300 line-clamp-3 leading-relaxed max-w-xl">
                {currentSpotlight.overview || 'Bu yapım şu an sinema ve televizyon dünyasında haftanın en çok izlenen içerikleri arasında.'}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() =>
                    setSelectedMedia({
                      id: currentSpotlight.id,
                      media_type: (currentSpotlight.media_type || (currentSpotlight.title ? 'movie' : 'tv')) as 'movie' | 'tv'
                    })
                  }
                  className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-emerald-500/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                >
                  <Info className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                  <span>Detayları Gör & Takip Et</span>
                </button>

                <button
                  onClick={(e) => handleQuickAdd(e, currentSpotlight)}
                  className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-sm backdrop-blur-md flex items-center gap-2 transition-all"
                >
                  {userWatchlist.some((w) => w.tmdbId === currentSpotlight.id) ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Listende</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>İzleme Listeme Ekle</span>
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Spotlight Navigation Indicators */}
            <div className="flex items-center gap-2 pt-6">
              {spotlightItems.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => setSpotlightIndex(idx)}
                  aria-label={`Spotlight ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === spotlightIndex ? 'w-8 bg-emerald-400' : 'w-2 bg-white/30 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 2. SEARCH & DISCOVER HERO SECTION ─────────────── */}
      <div className="relative px-4 sm:px-6 lg:px-8 pt-8 pb-6 border-b border-white/5 bg-gradient-to-b from-[#020806] to-transparent">
        <div className="max-w-5xl mx-auto space-y-6">
          
          {/* Header text if searching */}
          {activeQuery && (
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                "{activeQuery}" için Arama Sonuçları
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Arama kriterlerinize en uygun dizi ve filmler listeleniyor
              </p>
            </div>
          )}

          {/* Glowing Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative max-w-3xl mx-auto">
            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-emerald-400 absolute left-4 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Milyonlarca film ve dizi arasında arayın (örn: Breaking Bad, Interstellar, The Bear...)"
                className="w-full h-14 pl-12 pr-28 sm:pr-32 bg-white/5 hover:bg-white/[0.08] focus:bg-white/[0.09] border-2 border-white/10 focus:border-emerald-500 rounded-2xl text-sm sm:text-base text-white placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 shadow-2xl transition-all"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-24 sm:right-28 text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                className="absolute right-2 h-10 px-5 sm:px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-500/30 flex items-center gap-1.5 transition-all active:scale-95"
              >
                <span>Ara</span>
              </button>
            </div>
          </form>

          {/* Quick Filters (Tümü, Filmler, Diziler) */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              onClick={() => setFilterType('all')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filterType === 'all'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 border border-emerald-400/40'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Tüm Formatlar</span>
            </button>
            <button
              onClick={() => setFilterType('movie')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filterType === 'movie'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 border border-emerald-400/40'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Sadece Filmler</span>
            </button>
            <button
              onClick={() => setFilterType('tv')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filterType === 'tv'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 border border-emerald-400/40'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Sadece Diziler</span>
            </button>
          </div>

        </div>
      </div>

      {/* ── 3. STICKY GENRE CAROUSEL BAR ───────────────────── */}
      {!activeQuery && (
        <div className="sticky top-16 z-30 bg-[#020806]/95 backdrop-blur-xl border-b border-white/10 py-3 shadow-xl shadow-black/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2">
            
            {/* Scroll Left Button */}
            <button
              onClick={() => scrollGenres('left')}
              aria-label="Sola Kaydır"
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center shrink-0 transition-colors shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Scrollable Genres */}
            <div
              ref={genreScrollRef}
              className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1"
            >
              {GENRES.map((g) => {
                const isActive = selectedGenre === g.id;
                const Icon = g.icon;
                return (
                  <button
                    key={g.id || 'all-genres'}
                    onClick={() => setSelectedGenre(g.id)}
                    className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                      isActive
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 border border-emerald-400/50 scale-105'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10'
                    }`}
                  >
                    {Icon ? (
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-emerald-400'}`} />
                    ) : null}
                    <span>{g.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Scroll Right Button */}
            <button
              onClick={() => scrollGenres('right')}
              aria-label="Sağa Kaydır"
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center shrink-0 transition-colors shadow-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

          </div>
        </div>
      )}

      {/* ── 4. MAIN RESULTS & CONTENT GRID ───────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        
        {/* Section Heading */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-8 bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-full" />
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                {activeQuery
                  ? `"${activeQuery}" Sonuçları`
                  : selectedGenre
                  ? `${GENRES.find((g) => g.id === selectedGenre)?.name || 'Kategori'} Yapımları`
                  : filterType === 'movie'
                  ? 'Haftanın Trend Filmleri'
                  : filterType === 'tv'
                  ? 'Haftanın Trend Dizileri'
                  : 'Haftanın En Popüler Yapımları'}
              </h2>
              <p className="text-xs text-slate-400">
                {filterType === 'tv' ? 'Diziler' : filterType === 'movie' ? 'Filmler' : 'Film ve Diziler'} • Güncel TMDB Veritabanı
              </p>
            </div>
          </div>

          {!loading && (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300">
              {filteredItems.length} İçerik
            </span>
          )}
        </div>

        {/* Media Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="animate-pulse space-y-3">
                <div className="aspect-[2/3] bg-white/5 rounded-2xl border border-white/5" />
                <div className="h-4 bg-white/5 rounded w-4/5" />
                <div className="h-3 bg-white/5 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 glass-card rounded-3xl p-8 space-y-4 max-w-lg mx-auto border border-white/10 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-slate-500">
              <Film className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">Sonuç Bulunamadı</h3>
            <p className="text-xs sm:text-sm text-slate-400">
              Aradığınız kriterlere uygun dizi veya film bulunamadı. Lütfen farklı bir arama terimi veya kategori deneyin.
            </p>
            {activeQuery && (
              <button
                onClick={handleClearSearch}
                className="mt-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-600"
              >
                Aramayı Temizle
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {filteredItems.map((item) => {
              const title = item.title || item.name || '';
              const type = (item.media_type || (item.title ? 'movie' : 'tv')) as 'movie' | 'tv';
              const poster = item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : null;
              const year = (item.release_date || item.first_air_date || '').slice(0, 4);
              const exists = userWatchlist.find((w) => w.tmdbId === item.id && w.mediaType === type);
              const isAdding = quickAddingId === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedMedia({ id: item.id, media_type: type })}
                  className="group relative rounded-2xl overflow-hidden glass-card hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-950/60 transition-all duration-300 hover:-translate-y-2 cursor-pointer flex flex-col border border-white/10"
                >
                  {/* Poster Area */}
                  <div className="relative aspect-[2/3] overflow-hidden bg-slate-900">
                    {poster ? (
                      <img
                        src={poster}
                        alt={title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 p-4 text-center">
                        {type === 'movie' ? <Film className="w-10 h-10 mb-2" /> : <Tv className="w-10 h-10 mb-2" />}
                        <span className="text-xs font-semibold text-slate-400 truncate w-full">{title}</span>
                      </div>
                    )}

                    {/* Media Type Badge */}
                    <span
                      className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider shadow-lg backdrop-blur-md z-10 ${
                        type === 'movie'
                          ? 'bg-amber-500/90 text-black'
                          : 'bg-emerald-500/90 text-white'
                      }`}
                    >
                      {type === 'movie' ? 'Film' : 'Dizi'}
                    </span>

                    {/* Quick Add Button / Checkmark Pin */}
                    <button
                      type="button"
                      onClick={(e) => handleQuickAdd(e, item)}
                      title={exists ? 'Listede (Düzenlemek için tıkla)' : 'İzleme Listeme Hızlı Ekle'}
                      className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center transition-all z-10 shadow-lg ${
                        exists
                          ? 'bg-emerald-500 text-white shadow-emerald-500/40'
                          : 'bg-black/60 hover:bg-emerald-500 text-white hover:text-white border border-white/20'
                      }`}
                    >
                      {isAdding ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : exists ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </button>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3.5">
                      <button className="w-full py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-xl shadow-emerald-500/40 transition-transform active:scale-95">
                        <Info className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{exists ? 'İncele & Güncelle' : 'İncele / Listeye Ekle'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Card Info */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                    <h3 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-emerald-400 transition-colors" title={title}>
                      {title}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-medium">{year || '—'}</span>
                      {item.vote_average ? (
                        <span className="flex items-center gap-1 font-bold text-amber-400">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          {item.vote_average.toFixed(1)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Load More Button */}
        {!loading && hasMore && filteredItems.length > 0 && (
          <div className="text-center pt-8">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-8 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold text-white hover:border-emerald-500/50 shadow-xl transition-all inline-flex items-center gap-2 active:scale-95"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Yeni İçerikler Yükleniyor...</span>
                </>
              ) : (
                <>
                  <span>Daha Fazla İçerik Göster</span>
                  <ChevronRight className="w-4 h-4 text-emerald-400" />
                </>
              )}
            </button>
          </div>
        )}

      </div>

      {/* Media Detail Modal */}
      {selectedMedia && (
        <MediaDetailModal
          media={selectedMedia}
          existingItem={userWatchlist.find((w) => w.tmdbId === selectedMedia.id && w.mediaType === selectedMedia.media_type)}
          onClose={() => setSelectedMedia(null)}
          onSaved={loadWatchlist}
        />
      )}

    </div>
  );
};
