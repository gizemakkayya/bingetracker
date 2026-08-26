 import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Star,
  Tv,
  Film,
  PlayCircle,
  Clock,
  CheckCircle2,
  Trash2,
  Plus,
  Search,
  LayoutGrid,
  List,
  ArrowUpDown,
  Compass,
  Sparkles,
  Flame,
  Check,
  ChevronRight,
  TrendingUp,
  Award,
  Layers,
  X
} from 'lucide-react';
import { api } from '../services/api.js';
import { WatchlistItem } from '../types/index.js';
import { MediaDetailModal } from '../components/MediaDetailModal.js';

export const MyListPage: React.FC = () => {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState<'all' | 'watching' | 'watchlist' | 'watched'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const [sortBy, setSortBy] = useState<'updated_desc' | 'rating_desc' | 'title_asc' | 'progress_desc'>('updated_desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedMedia, setSelectedMedia] = useState<{ id: number; media_type: 'movie' | 'tv' } | null>(null);
  const [updatingEpisodeId, setUpdatingEpisodeId] = useState<string | null>(null);

  const loadItems = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tracker');
      setItems(res.data.data || []);
    } catch (err) {
      console.error('Listeler yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  // Quick +1 episode increment directly from card
  const handleQuickStepEpisode = async (e: React.MouseEvent, item: WatchlistItem) => {
    e.stopPropagation();
    if (item.mediaType !== 'tv') return;

    const currentSeason = item.currentSeason || 1;
    const currentEpisode = item.currentEpisode || 1;
    const nextEpisode = currentEpisode + 1;

    try {
      setUpdatingEpisodeId(item.id);
      await api.post(`/tracker/episode/${item.id}`, {
        seasonNumber: currentSeason,
        episodeNumber: nextEpisode
      });

      // Update locally
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                currentEpisode: nextEpisode,
                status: 'watching'
              }
            : i
        )
      );
    } catch (err) {
      console.error('Bölüm güncellenemedi:', err);
    } finally {
      setUpdatingEpisodeId(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, itemId: string, title: string) => {
    e.stopPropagation();
    if (!confirm(`"${title}" içeriğini listeden silmek istediğinize emin misiniz?`)) return;
    try {
      await api.delete(`/tracker/${itemId}`);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (err) {
      console.error('Silinemedi:', err);
    }
  };

  // Quick change status from card
  const handleStatusChange = async (e: React.MouseEvent, item: WatchlistItem, newStatus: 'watchlist' | 'watching' | 'watched') => {
    e.stopPropagation();
    try {
      await api.post('/tracker', {
        tmdbId: item.tmdbId,
        mediaType: item.mediaType,
        title: item.title,
        status: newStatus
      });
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i))
      );
    } catch (err) {
      console.error('Durum değiştirilemedi:', err);
    }
  };

  // Calculate live summary stats
  const stats = useMemo(() => {
    const totalCount = items.length;
    const moviesCount = items.filter((i) => i.mediaType === 'movie').length;
    const tvCount = items.filter((i) => i.mediaType === 'tv').length;
    const watchingCount = items.filter((i) => i.status === 'watching').length;
    const watchlistCount = items.filter((i) => i.status === 'watchlist').length;
    const watchedCount = items.filter((i) => i.status === 'watched').length;

    let totalMinutes = 0;
    let ratedItemsCount = 0;
    let totalScore = 0;

    items.forEach((i) => {
      if (i.status === 'watched' && i.runtimeMinutes) {
        totalMinutes += i.runtimeMinutes;
      }
      if (i.rating) {
        totalScore += i.rating;
        ratedItemsCount++;
      }
    });

    const avgRating = ratedItemsCount ? (totalScore / ratedItemsCount).toFixed(1) : '—';
    const totalHours = Math.round(totalMinutes / 60);

    return {
      totalCount,
      moviesCount,
      tvCount,
      watchingCount,
      watchlistCount,
      watchedCount,
      totalHours,
      avgRating
    };
  }, [items]);

  // Filter & Sort list
  const filteredAndSortedItems = useMemo(() => {
    let result = items.filter((item) => {
      // Status filter
      if (statusTab !== 'all' && item.status !== statusTab) return false;
      // Type filter
      if (typeFilter !== 'all' && item.mediaType !== typeFilter) return false;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!item.title.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'rating_desc') {
        return (b.rating || 0) - (a.rating || 0);
      }
      if (sortBy === 'title_asc') {
        return a.title.localeCompare(b.title, 'tr');
      }
      if (sortBy === 'progress_desc') {
        const aEp = a.currentEpisode || 0;
        const bEp = b.currentEpisode || 0;
        return bEp - aEp;
      }
      // default: updated_desc
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    });

    return result;
  }, [items, statusTab, typeFilter, searchQuery, sortBy]);

  const tabs = [
    { id: 'all', label: 'Tüm Kütüphanem', count: stats.totalCount, icon: Layers, color: 'text-slate-400' },
    { id: 'watching', label: 'İzleniyor', count: stats.watchingCount, icon: PlayCircle, color: 'text-amber-400' },
    { id: 'watchlist', label: 'İzlenecek', count: stats.watchlistCount, icon: Clock, color: 'text-blue-400' },
    { id: 'watched', label: 'İzlendi', count: stats.watchedCount, icon: CheckCircle2, color: 'text-emerald-400' },
  ] as const;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 min-h-screen">
      
      {/* ── 1. CINEMA STATS OVERVIEW WIDGETS ──────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        
        {/* Total Items */}
        <div className="glass-card p-5 rounded-3xl border border-white/10 relative overflow-hidden group hover:border-emerald-500/40 transition-all shadow-xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kütüphane</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{stats.totalCount}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
            <span>{stats.moviesCount} Film</span> • <span>{stats.tvCount} Dizi</span>
          </div>
        </div>

        {/* Currently Watching */}
        <div className="glass-card p-5 rounded-3xl border border-white/10 relative overflow-hidden group hover:border-amber-500/40 transition-all shadow-xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aktif İzlenen</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <PlayCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400">{stats.watchingCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Kaldığın yerden devam et</div>
        </div>

        {/* Watch Time */}
        <div className="glass-card p-5 rounded-3xl border border-white/10 relative overflow-hidden group hover:border-blue-500/40 transition-all shadow-xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">İzleme Süresi</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {stats.totalHours} <span className="text-sm font-semibold text-slate-400">Saat</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{stats.watchedCount} tamamlanan içerik</div>
        </div>

        {/* Avg Rating */}
        <div className="glass-card p-5 rounded-3xl border border-white/10 relative overflow-hidden group hover:border-amber-400/40 transition-all shadow-xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/10 rounded-full blur-2xl group-hover:bg-amber-400/20 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ort. Puanın</span>
            <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center">
              <Star className="w-4 h-4 fill-amber-400" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400">
            {stats.avgRating} <span className="text-xs font-semibold text-slate-400">/ 10</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Sinematik zevk skoru</div>
        </div>

      </div>

      {/* ── 2. STATUS TABS BAR ────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-white/10 pb-4">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = statusTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setStatusTab(t.id)}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all shrink-0 ${
                isActive
                  ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/30 scale-105'
                  : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : t.color || 'text-slate-400'}`} />
              <span>{t.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                  isActive ? 'bg-black/30 text-white' : 'bg-white/10 text-slate-300'
                }`}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── 3. FILTERING, SEARCH & SORT CONTROLS BAR ─────── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 glass-card p-4 rounded-2xl border border-white/10 shadow-lg">
        
        {/* Search inside My List */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Listende ara (başlık, dizi adı)..."
            className="w-full h-10 pl-10 pr-9 bg-white/5 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Controls group */}
        <div className="flex items-center flex-wrap gap-2.5">
          
          {/* Format pills */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-xl">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                typeFilter === 'all' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tümü
            </button>
            <button
              onClick={() => setTypeFilter('movie')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                typeFilter === 'movie' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Filmler
            </button>
            <button
              onClick={() => setTypeFilter('tv')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                typeFilter === 'tv' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Diziler
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option value="updated_desc" className="bg-slate-900 text-white">Son Güncellenenler</option>
              <option value="rating_desc" className="bg-slate-900 text-white">En Yüksek Puanlılar</option>
              <option value="title_asc" className="bg-slate-900 text-white">İsim (A–Z)</option>
              <option value="progress_desc" className="bg-slate-900 text-white">İzlenen Bölüm Sayısı</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              title="Grid Görünümü"
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grid' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="Liste Görünümü"
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'list' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

      {/* ── 4. CONTENT AREA (GRID OR LIST) ────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse space-y-3">
              <div className="aspect-[2/3] bg-white/5 rounded-2xl" />
              <div className="h-4 bg-white/5 rounded w-3/4" />
              <div className="h-3 bg-white/5 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredAndSortedItems.length === 0 ? (
        <div className="text-center py-20 glass-card rounded-3xl p-8 border border-white/10 space-y-4 max-w-lg mx-auto shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-slate-500">
            <Compass className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-white">Bu listede henüz içerik yok</h3>
          <p className="text-xs sm:text-sm text-slate-400">
            Keşfet sekmesinden popüler film ve dizileri arayabilir, tek tıkla izleme listenize ekleyebilirsiniz.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm shadow-xl shadow-emerald-500/30 transition-all active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>Yeni İçerikler Keşfet</span>
          </Link>
        </div>
      ) : viewMode === 'grid' ? (
        
        /* ── GRID CARDS VIEW ────────────────────────────── */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
          {filteredAndSortedItems.map((item) => {
            const poster = item.posterPath ? `https://image.tmdb.org/t/p/w342${item.posterPath}` : null;
            const isTV = item.mediaType === 'tv';
            const isUpdating = updatingEpisodeId === item.id;

            return (
              <div
                key={item.id}
                onClick={() => setSelectedMedia({ id: item.tmdbId, media_type: item.mediaType as 'movie' | 'tv' })}
                className="group relative rounded-2xl overflow-hidden glass-card hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-950/60 transition-all duration-300 hover:-translate-y-2 cursor-pointer shadow-lg flex flex-col border border-white/10"
              >
                {/* Poster Area */}
                <div className="relative aspect-[2/3] overflow-hidden bg-slate-900">
                  {poster ? (
                    <img
                      src={poster}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 p-4 text-center">
                      {isTV ? <Tv className="w-10 h-10 mb-2" /> : <Film className="w-10 h-10 mb-2" />}
                      <span className="text-xs font-semibold text-slate-400 truncate w-full">{item.title}</span>
                    </div>
                  )}

                  {/* Format Badge */}
                  <span
                    className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider shadow-md backdrop-blur-md ${
                      isTV ? 'bg-indigo-500/90 text-white' : 'bg-amber-500/90 text-black'
                    }`}
                  >
                    {isTV ? 'Dizi' : 'Film'}
                  </span>

                  {/* Delete Button on Hover */}
                  <button
                    onClick={(e) => handleDelete(e, item.id, item.title)}
                    title="Listeden Kaldır"
                    className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 shadow-md hover:scale-110"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Status Indicator Pill */}
                  <div className="absolute bottom-2.5 left-2.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shadow-md backdrop-blur-md ${
                        item.status === 'watching'
                          ? 'bg-amber-500 text-black'
                          : item.status === 'watched'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-blue-500 text-white'
                      }`}
                    >
                      {item.status === 'watching' ? 'İzleniyor' : item.status === 'watched' ? 'İzlendi' : 'İzlenecek'}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-emerald-400 transition-colors" title={item.title}>
                      {item.title}
                    </h3>
                  </div>

                  {/* TV Episode Progress & Step +1 Button */}
                  {isTV ? (
                    <div className="space-y-1.5 pt-1 border-t border-white/5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-400">
                          S{item.currentSeason || 1} • E{item.currentEpisode || 1}
                        </span>
                        
                        {/* Direct +1 Stepper Button */}
                        <button
                          type="button"
                          onClick={(e) => handleQuickStepEpisode(e, item)}
                          disabled={isUpdating}
                          title="+1 Bölüm İlerlet"
                          className="px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-white text-[10px] font-extrabold border border-emerald-500/30 flex items-center gap-1 transition-all active:scale-95"
                        >
                          <Plus className="w-3 h-3 stroke-[3]" />
                          <span>Bölüm</span>
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {/* Rating / Runtime */}
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-white/5">
                    {item.rating ? (
                      <span className="flex items-center gap-1 font-bold text-amber-400">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span>{item.rating}/10</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500">Puan verilmedi</span>
                    )}

                    {item.runtimeMinutes && (
                      <span className="text-[11px] text-slate-400">{item.runtimeMinutes} dk</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        
        /* ── COMPACT LIST / TABLE VIEW ───────────────────── */
        <div className="glass-card rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
          <div className="divide-y divide-white/5">
            {filteredAndSortedItems.map((item) => {
              const poster = item.posterPath ? `https://image.tmdb.org/t/p/w185${item.posterPath}` : null;
              const isTV = item.mediaType === 'tv';
              const isUpdating = updatingEpisodeId === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedMedia({ id: item.tmdbId, media_type: item.mediaType as 'movie' | 'tv' })}
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-4 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  {/* Left: Thumbnail & Title */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="w-12 sm:w-14 aspect-[2/3] rounded-xl overflow-hidden bg-slate-900 border border-white/10 shrink-0">
                      {poster ? (
                        <img src={poster} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          {isTV ? <Tv className="w-5 h-5" /> : <Film className="w-5 h-5" />}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                            isTV ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {isTV ? 'Dizi' : 'Film'}
                        </span>
                        <h4 className="text-sm font-bold text-white truncate hover:text-emerald-400 transition-colors">
                          {item.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                        {isTV && (
                          <span className="font-semibold text-emerald-400">
                            {item.currentSeason || 1}. Sezon • {item.currentEpisode || 1}. Bölüm
                          </span>
                        )}
                        {item.runtimeMinutes ? <span>{item.runtimeMinutes} dk</span> : null}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Rating */}
                  <div className="hidden sm:flex items-center gap-1 text-xs font-bold text-amber-400 w-24">
                    {item.rating ? (
                      <>
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{item.rating} / 10</span>
                      </>
                    ) : (
                      <span className="text-slate-600 font-normal text-[11px]">—</span>
                    )}
                  </div>

                  {/* Status Badge & Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        item.status === 'watching'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : item.status === 'watched'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {item.status === 'watching' ? 'İzleniyor' : item.status === 'watched' ? 'İzlendi' : 'İzlenecek'}
                    </span>

                    {/* Step episode if TV */}
                    {isTV && (
                      <button
                        type="button"
                        onClick={(e) => handleQuickStepEpisode(e, item)}
                        disabled={isUpdating}
                        className="px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-white text-xs font-bold border border-emerald-500/30 hidden sm:flex items-center gap-1 transition-all"
                      >
                        <Plus className="w-3 h-3 stroke-[3]" />
                        <span>+1 Bölüm</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, item.id, item.title)}
                      className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Listeden Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Media Detail Modal */}
      {selectedMedia && (
        <MediaDetailModal
          media={selectedMedia}
          existingItem={items.find((i) => i.tmdbId === selectedMedia.id && i.mediaType === selectedMedia.media_type)}
          onClose={() => setSelectedMedia(null)}
          onSaved={loadItems}
        />
      )}

    </div>
  );
};
