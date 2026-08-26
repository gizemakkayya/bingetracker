-- ═══════════════════════════════════════════════════════════
-- BingeTracker — Supabase SQL Kurulum Scripti
-- Supabase Dashboard → SQL Editor → New Query → Çalıştır
-- ═══════════════════════════════════════════════════════════

-- ── 1. Profiles tablosu ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT NOT NULL DEFAULT '',
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── 2. Watchlist tablosu ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.watchlist (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tmdb_id          INTEGER NOT NULL,
  media_type       TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  title            TEXT NOT NULL,
  poster_path      TEXT,
  genres           TEXT[] DEFAULT '{}',
  status           TEXT NOT NULL DEFAULT 'watchlist'
                   CHECK (status IN ('watchlist', 'watching', 'watched')),
  rating           SMALLINT CHECK (rating >= 1 AND rating <= 10),
  notes            TEXT DEFAULT '',
  -- TV show progress
  current_season   SMALLINT,
  current_episode  SMALLINT,
  total_seasons    SMALLINT,
  total_episodes   INTEGER,
  -- Runtime (for stats)
  runtime_minutes  INTEGER,
  -- Timestamps
  added_at         TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  -- Prevent duplicate entries per user
  UNIQUE (user_id, tmdb_id, media_type)
);

-- ── 3. Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON public.watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_status  ON public.watchlist(status);
CREATE INDEX IF NOT EXISTS idx_watchlist_media   ON public.watchlist(media_type);

-- ── 4. Row Level Security (RLS) ──────────────────────────────
-- Her kullanıcı yalnızca kendi verisini okuyabilir/yazabilir

ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Watchlist policies
CREATE POLICY "Watchlist items are viewable by everyone"
  ON public.watchlist FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own watchlist"
  ON public.watchlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlist"
  ON public.watchlist FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlist"
  ON public.watchlist FOR DELETE
  USING (auth.uid() = user_id);

-- ── 5. Auto-create profile on signup ─────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── 6. Updated_at auto-update ────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS watchlist_updated_at ON public.watchlist;
CREATE TRIGGER watchlist_updated_at
  BEFORE UPDATE ON public.watchlist
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ═══════════════════════════════════════════════════════════
-- Kurulum tamamlandı! ✓
-- ═══════════════════════════════════════════════════════════
