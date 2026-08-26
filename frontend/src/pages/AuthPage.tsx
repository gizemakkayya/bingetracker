import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clapperboard, Mail, Lock, User as UserIcon, ArrowRight, Tv, Film, Clock, Star, AlertCircle, Users, Sparkles } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';
import { PosterBackground } from '../components/PosterBackground.js';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const res = await api.post('/auth/login', { email, password });
        setAuth(res.data.data.user, res.data.data.token);
        navigate('/');
      } else {
        const res = await api.post('/auth/register', { email, password, username });
        setAuth(res.data.data.user, res.data.data.token);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#020806] flex flex-col justify-between p-4 sm:p-6 font-sans">
      
      {/* Sliding Series & Movie Posters Background */}
      <PosterBackground />

      {/* Top logo */}
      <div className="max-w-7xl mx-auto w-full relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
            <Clapperboard className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white flex items-center gap-2">
            GizmesinkoTracker
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Live
            </span>
          </span>
        </div>
      </div>


      {/* Centered Auth Card */}
      <div className="max-w-md w-full mx-auto my-auto relative z-10">
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl shadow-black/80 space-y-6">
          
          {/* Card Top */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-emerald-400 mb-1">
              <Clapperboard className="w-3.5 h-3.5" />
              <span>Dizi & Film Sosyal Takip Platformu</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              {isLogin ? 'Sinema Dünyana Giriş Yap' : 'Ücretsiz Hesabını Oluştur'}
            </h1>
            <p className="text-xs text-slate-400">
              {isLogin
                ? 'Kaldığın bölümü kaydet, izleme listeni oluştur ve arkadaşlarınla paylaş.'
                : 'Birkaç saniyede hesabını oluşturup arkadaşlarınla dizi takibine başla.'}
            </p>

            {/* Badges bar */}
            <div className="flex flex-wrap justify-center gap-1.5 pt-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 text-[11px] text-slate-300">
                <Tv className="w-3 h-3 text-emerald-400" /> Sezon & Bölüm Takibi
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 text-[11px] text-slate-300">
                <Users className="w-3 h-3 text-emerald-400" /> Arkadaş Akışı
              </span>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {!isLogin && (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Kullanıcı Adı</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="kullaniciadi"
                    className="w-full h-12 pl-11 pr-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">E-posta</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@mail.com"
                  className="w-full h-12 pl-11 pr-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Şifre</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 pl-11 pr-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold text-sm shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading ? 'İşlem yapılıyor...' : isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Switch toggle link */}
          <div className="text-center text-xs text-slate-400 pt-2">
            <span>{isLogin ? 'Henüz üye değil misiniz? ' : 'Zaten hesabınız var mı? '}</span>
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="font-bold text-emerald-400 hover:underline"
            >
              {isLogin ? 'Hemen Kayıt Olun' : 'Giriş Yapın'}
            </button>
          </div>

        </div>
      </div>

      <div />
    </div>
  );
};
