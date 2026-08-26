import React, { useState, useEffect } from 'react';
import { X, Star, Check, Tv, Film, Clock, Calendar, Bookmark, Play, CheckCircle2, MessageSquare } from 'lucide-react';
import { api } from '../services/api.js';
import { TMDBMediaItem, TMDBEpisode, WatchlistItem } from '../types/index.js';

interface MediaDetailModalProps {
  media: { id: number; media_type: 'movie' | 'tv' };
  existingItem?: WatchlistItem | null;
  onClose: () => void;
  onSaved: () => void;
}

export const MediaDetailModal: React.FC<MediaDetailModalProps> = ({
  media,
  existingItem,
  onClose,
  onSaved
}) => {
  const [details, setDetails] = useState<TMDBMediaItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'watchlist' | 'watching' | 'watched'>(
    existingItem?.status === 'dropped' ? 'watchlist' : existingItem?.status || 'watchlist'
  );
  const [rating, setRating] = useState<number>(existingItem?.rating || 0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [notes, setNotes] = useState<string>(existingItem?.notes || '');
  const [currentSeason, setCurrentSeason] = useState<number>(existingItem?.currentSeason || 1);
  const [currentEpisode, setCurrentEpisode] = useState<number>(existingItem?.currentEpisode || 1);
  const [episodes, setEpisodes] = useState<TMDBEpisode[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadDetails() {
      try {
        setLoading(true);
        const res = await api.get(`/media/details/${media.media_type}/${media.id}`);
        setDetails(res.data.data);
      } catch (err) {
        console.error('Detaylar yüklenemedi:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDetails();
  }, [media]);

  useEffect(() => {
    if (media.media_type === 'tv' && details) {
      async function loadEpisodes() {
        try {
          setEpisodesLoading(true);
          const res = await api.get(`/media/season/${media.id}/${currentSeason}`);
          setEpisodes(res.data.data.episodes || []);
        } catch (err) {
          console.error('Bölümler yüklenemedi:', err);
        } finally {
          setEpisodesLoading(false);
        }
      }
      loadEpisodes();
    }
  }, [media, details, currentSeason]);

  const handleSave = async () => {
    if (!details) return;
    try {
      setSaving(true);
      const title = details.title || details.name || '';
      await api.post('/tracker', {
        tmdbId: details.id,
        mediaType: media.media_type,
        title,
        posterPath: details.poster_path,
        status,
        rating: rating || null,
        notes,
        currentSeason: media.media_type === 'tv' ? currentSeason : null,
        currentEpisode: media.media_type === 'tv' ? currentEpisode : null,
        totalSeasons: details.number_of_seasons || null,
        totalEpisodes: details.number_of_episodes || null,
        runtimeMinutes: details.runtime || null
      });
      onSaved();
      onClose();
    } catch (err) {
      console.error('Kaydedilemedi:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleEpisodeClick = (epNum: number) => {
    if (currentEpisode === epNum) {
      setCurrentEpisode(Math.max(0, epNum - 1));
    } else {
      setCurrentEpisode(epNum);
      if (status === 'watchlist') setStatus('watching');
    }
  };

  if (loading || !details) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
        <div className="glass-card rounded-3xl p-8 flex items-center gap-3 border border-white/10 shadow-2xl">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-slate-200">İçerik yükleniyor...</span>
        </div>
      </div>
    );
  }

  const title = details.title || details.name || '';
  const isTV = media.media_type === 'tv';
  const posterUrl = details.poster_path ? `https://image.tmdb.org/t/p/w342${details.poster_path}` : null;
  const backdropUrl = details.backdrop_path ? `https://image.tmdb.org/t/p/w1280${details.backdrop_path}` : null;
  const regularSeasons = (details.seasons || []).filter((s) => s.season_number > 0);
  const totalSeasonsCount = regularSeasons.length || details.number_of_seasons || 1;
  const releaseYear = (details.release_date || details.first_air_date || '').slice(0, 4);

  const watchedCount = Math.min(episodes.length, currentEpisode);
  const progressPct = episodes.length ? Math.round((watchedCount / episodes.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="glass-card w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-white/10 my-auto flex flex-col relative">
        
        {/* Backdrop Banner Header */}
        <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-slate-950">
          {backdropUrl ? (
            <img
              src={backdropUrl}
              alt={title}
              className="w-full h-full object-cover opacity-60 scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-emerald-950 to-slate-950" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e1411] via-[#0e1411]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0e1411]/80 via-transparent to-transparent" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white flex items-center justify-center transition-all z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Floating poster & title overlay */}
          <div className="absolute bottom-4 left-4 sm:left-6 right-4 flex items-end gap-4 z-10">
            {posterUrl ? (
              <img
                src={posterUrl}
                alt={title}
                className="w-20 sm:w-24 aspect-[2/3] object-cover rounded-xl shadow-2xl border-2 border-white/20 shrink-0"
              />
            ) : (
              <div className="w-20 sm:w-24 aspect-[2/3] bg-white/10 rounded-xl flex items-center justify-center border border-white/20 shrink-0">
                {isTV ? <Tv className="w-8 h-8 text-slate-400" /> : <Film className="w-8 h-8 text-slate-400" />}
              </div>
            )}
            
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                  isTV ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-black'
                }`}>
                  {isTV ? 'Dizi' : 'Film'}
                </span>
                {releaseYear && <span className="text-xs font-semibold text-slate-300">{releaseYear}</span>}
                {details.runtime ? (
                  <span className="text-xs text-slate-300 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-400" /> {details.runtime} dk
                  </span>
                ) : null}
              </div>
              <h2 className="text-lg sm:text-2xl font-extrabold text-white truncate drop-shadow-md">
                {title}
              </h2>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          
          {/* Rating, genres, and overview */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {details.vote_average ? (
                <span className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
                  <Star className="w-3.5 h-3.5 fill-amber-400" /> {details.vote_average.toFixed(1)} / 10 TMDB
                </span>
              ) : null}
              {details.genres?.map((g) => (
                <span key={g.id} className="text-xs font-medium text-slate-300 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                  {g.name}
                </span>
              ))}
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {details.overview || 'Bu içerik için henüz Türkçe açıklama girilmemiş.'}
            </p>
          </div>

          {/* Watch Status Selector Pills */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">İzleme Durumu</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('watchlist')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                  status === 'watchlist'
                    ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-md shadow-blue-500/10'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>İzlenecek</span>
              </button>
              
              <button
                type="button"
                onClick={() => setStatus('watching')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                  status === 'watching'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-md shadow-amber-500/10'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                <span>İzleniyor</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('watched')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                  status === 'watched'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/10'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>İzlendi</span>
              </button>
            </div>
          </div>

          {/* Interactive Rating (1-10 Stars) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Senin Puanın</label>
              <span className="text-xs font-bold text-amber-400">
                {hoverRating || rating ? `${hoverRating || rating} / 10` : 'Puan Verilmedi'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((starVal) => {
                const isFilled = starVal <= (hoverRating || rating);
                return (
                  <button
                    key={starVal}
                    type="button"
                    onMouseEnter={() => setHoverRating(starVal)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(starVal === rating ? 0 : starVal)}
                    className="p-1 transition-transform hover:scale-125 focus:outline-none"
                    aria-label={`${starVal} yıldız ver`}
                  >
                    <Star
                      className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors ${
                        isFilled
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-600 hover:text-slate-400'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* TV Series Episode Tracker Box */}
          {isTV && (
            <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Tv className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Sezon & Bölüm Takibi
                  </span>
                </div>
                <select
                  value={currentSeason}
                  onChange={(e) => {
                    setCurrentSeason(Number(e.target.value));
                    setCurrentEpisode(1);
                  }}
                  className="px-3 py-1.5 bg-slate-900 border border-white/15 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {Array.from({ length: totalSeasonsCount }, (_, i) => i + 1).map((s) => (
                    <option key={s} value={s} className="bg-slate-900 text-white">
                      {s}. Sezon
                    </option>
                  ))}
                </select>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                  <span>{watchedCount} / {episodes.length} Bölüm İzlendi</span>
                  <span className="text-emerald-400 font-bold">%{progressPct}</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300 rounded-full"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              {/* Episode list */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {episodesLoading ? (
                  <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <span>Bölümler yükleniyor...</span>
                  </div>
                ) : episodes.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    Bu sezon için bölüm bilgisi bulunamadı.
                  </div>
                ) : (
                  episodes.map((ep) => {
                    const isWatched = ep.episode_number <= currentEpisode;
                    const stillUrl = ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : null;
                    return (
                      <div
                        key={ep.id}
                        onClick={() => handleEpisodeClick(ep.episode_number)}
                        className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isWatched
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                            : 'bg-white/5 border-white/5 hover:border-white/20 text-slate-300'
                        }`}
                      >
                        {/* Thumbnail */}
                        <div className="relative w-20 h-12 rounded-lg overflow-hidden bg-black/50 shrink-0">
                          {stillUrl ? (
                            <img src={stillUrl} alt={ep.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600">
                              <Tv className="w-4 h-4" />
                            </div>
                          )}
                          {ep.runtime && (
                            <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/80 text-[8px] font-bold text-white">
                              {ep.runtime} dk
                            </span>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-emerald-400">
                              {ep.episode_number}. Bölüm
                            </span>
                            <span className="text-xs font-semibold truncate text-white">
                              {ep.name}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {ep.overview || 'Açıklama bulunmuyor.'}
                          </p>
                        </div>

                        {/* Circular Check Button */}
                        <button
                          type="button"
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${
                            isWatched
                              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                              : 'border-2 border-white/20 text-transparent hover:border-emerald-500'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Notes textarea */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Notlarım & İncelemem</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Bu dizi/film hakkında düşünceleriniz, kaldığınız yer veya hatırlatıcı notlarınız..."
              rows={2}
              className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500 placeholder:text-slate-600 transition-colors"
            />
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-6 border-t border-white/10 flex items-center justify-end gap-3 bg-[#0a0f0d]">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-white/10 text-xs sm:text-sm font-semibold text-slate-300 hover:bg-white/5 transition-colors"
          >
            Vazgeç
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? 'Kaydediliyor...' : existingItem ? 'Değişiklikleri Kaydet' : 'Listeye Ekle'}
          </button>
        </div>

      </div>
    </div>
  );
};
