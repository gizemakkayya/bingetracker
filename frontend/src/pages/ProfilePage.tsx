import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { UserPlus, UserCheck, Users, Film, Tv, Star, Calendar } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';

export const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuthStore();
  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [followingState, setFollowingState] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/users/profile/${username}`);
      setProfile(res.data.data);
      setFollowingState(res.data.data.isFollowing || false);
    } catch (err) {
      console.error('Profil yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (username) loadProfile();
  }, [username]);

  const handleFollowToggle = async () => {
    if (!profile) return;
    try {
      setFollowLoading(true);
      if (followingState) {
        await api.delete(`/social/unfollow/${profile.id}`);
        setFollowingState(false);
      } else {
        await api.post(`/social/follow/${profile.id}`);
        setFollowingState(true);
      }
      loadProfile();
    } catch (err) {
      console.error('Takip işlemi başarısız:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Profil yükleniyor...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-400">
        Kullanıcı bulunamadı.
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profile.id;
  const joinDate = new Date(profile.createdAt).toLocaleDateString('tr-TR', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Profile Header Card */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-extrabold text-3xl text-white shadow-xl shadow-emerald-500/20">
            {profile.username.charAt(0).toUpperCase()}
          </div>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-extrabold text-white">{profile.username}</h1>
            <p className="text-sm text-slate-400 max-w-md">{profile.bio || 'Henüz bir biyografi eklenmedi.'}</p>
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-slate-500 pt-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{joinDate} tarihinde katıldı</span>
            </div>
          </div>
        </div>

        {/* Follow Button */}
        {!isOwnProfile && currentUser && (
          <button
            onClick={handleFollowToggle}
            disabled={followLoading}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg transition-all ${
              followingState
                ? 'bg-white/10 text-white hover:bg-red-500/20 hover:text-red-400 border border-white/15'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/25'
            }`}
          >
            {followingState ? (
              <>
                <UserCheck className="w-4 h-4" />
                <span>Takip Ediliyor</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Takip Et</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl text-center space-y-1">
          <div className="text-2xl font-black text-white">{profile._count?.watchlist || 0}</div>
          <div className="text-xs font-semibold text-slate-400">İzlenen / Liste</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl text-center space-y-1">
          <div className="text-2xl font-black text-emerald-400">{profile._count?.followers || 0}</div>
          <div className="text-xs font-semibold text-slate-400">Takipçi</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl text-center space-y-1">
          <div className="text-2xl font-black text-white">{profile._count?.following || 0}</div>
          <div className="text-xs font-semibold text-slate-400">Takip Edilen</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl text-center space-y-1">
          <div className="text-2xl font-black text-amber-400">{profile._count?.reviews || 0}</div>
          <div className="text-xs font-semibold text-slate-400">İnceleme</div>
        </div>
      </div>

      {/* Recent Watchlist */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">Son Aktiviteleri</h2>
        {profile.watchlist?.length === 0 ? (
          <div className="p-8 text-center text-slate-500 glass-card rounded-2xl">
            Henüz listesine bir film veya dizi eklemedi.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {profile.watchlist?.map((item: any) => {
              const poster = item.posterPath ? `https://image.tmdb.org/t/p/w342${item.posterPath}` : null;
              return (
                <div key={item.id} className="glass-card rounded-xl overflow-hidden group">
                  <div className="aspect-[2/3] bg-white/5 overflow-hidden relative">
                    {poster ? (
                      <img src={poster} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        {item.mediaType === 'tv' ? <Tv className="w-8 h-8" /> : <Film className="w-8 h-8" />}
                      </div>
                    )}
                    {item.rating && (
                      <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-bold text-amber-400 flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-amber-400" /> {item.rating}
                      </span>
                    )}
                  </div>
                  <div className="p-2">
                    <div className="text-xs font-bold text-white truncate">{item.title}</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">{item.status}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
