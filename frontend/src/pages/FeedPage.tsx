import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Tv, Film, Star, MessageSquare, Play, Sparkles } from 'lucide-react';
import { api } from '../services/api.js';
import { Activity } from '../types/index.js';
import { useAuthStore } from '../store/authStore.js';

export const FeedPage: React.FC = () => {
  const { user } = useAuthStore();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'friends' | 'global'>('friends');

  useEffect(() => {
    async function loadFeed() {
      try {
        setLoading(true);
        const endpoint = tab === 'friends' ? '/feed' : '/feed/global';
        const res = await api.get(endpoint);
        setActivities(res.data.data || []);
      } catch (err) {
        console.error('Akış yüklenemedi:', err);
      } finally {
        setLoading(false);
      }
    }
    loadFeed();
  }, [tab]);

  const getActivityDescription = (act: Activity) => {
    switch (act.type) {
      case 'WATCHED_EPISODE':
        return `bir bölüm izledi: ${act.seasonNum}. Sezon ${act.episodeNum}. Bölüm`;
      case 'WATCHED_MOVIE':
        return `filmini izledi.`;
      case 'STARTED_SERIES':
        return `dizisine başladı.`;
      case 'RATED':
        return `içeriğini puanladı.`;
      case 'REVIEWED':
        return `hakkında bir inceleme yazdı.`;
      default:
        return 'izleme listesini güncelledi.';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-emerald-400" />
            <span>Sosyal Akış</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Takip ettiğiniz arkadaşlarınızın izleme geçmişi ve anlık aktiviteleri
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 p-1.5 rounded-2xl shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setTab('friends')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              tab === 'friends'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Takip Ettiklerim
          </button>
          <button
            onClick={() => setTab('global')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              tab === 'global'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Keşfet Akışı
          </button>
        </div>
      </div>

      {/* Feed Stream */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card p-4 rounded-2xl animate-pulse flex gap-4">
              <div className="w-10 h-10 rounded-full bg-white/10 shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-white/10 rounded w-1/3" />
                <div className="h-3 bg-white/10 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-16 glass-card rounded-3xl border border-white/10 p-8 space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Henüz aktivite yok</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            {tab === 'friends'
              ? 'Takip ettiğiniz kişilerin izledikleri burada görünecek. Yeni arkadaşlar keşfetmek için arama yapın!'
              : 'Henüz platformda kayıtlı bir sosyal aktivite bulunmuyor.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((act) => {
            const timeAgo = new Date(act.createdAt).toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={act.id}
                className="glass-card p-4 sm:p-5 rounded-2xl border border-white/10 hover:border-emerald-500/30 transition-all flex items-start gap-4"
              >
                {/* Avatar */}
                <Link to={`/profile/${act.user.username}`} className="shrink-0 group">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-bold text-sm text-white shadow-md group-hover:scale-105 transition-transform">
                    {act.user.username.charAt(0).toUpperCase()}
                  </div>
                </Link>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-sm">
                    <Link
                      to={`/profile/${act.user.username}`}
                      className="font-bold text-white hover:text-emerald-400 transition-colors"
                    >
                      {act.user.username}
                    </Link>
                    <span className="text-slate-400">{getActivityDescription(act)}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-emerald-400 shrink-0">
                      {act.mediaType === 'tv' ? <Tv className="w-4 h-4" /> : <Film className="w-4 h-4" />}
                    </div>
                    <span className="font-bold text-white text-sm truncate">{act.mediaTitle}</span>
                  </div>

                  {/* Rating / Review note if any */}
                  {act.ratingVal && (
                    <div className="flex items-center gap-1 text-xs font-bold text-amber-400 pt-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{act.ratingVal} / 10 Puan Verdi</span>
                    </div>
                  )}

                  {act.reviewText && (
                    <p className="text-xs text-slate-300 italic bg-white/5 p-2 rounded-lg border border-white/5 mt-2">
                      "{act.reviewText}"
                    </p>
                  )}

                  <div className="text-[11px] text-slate-500 pt-1">
                    {timeAgo}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
