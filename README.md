# 🎬 BingeTracker

Film ve dizi izleme takip uygulaması. Vanilla HTML/CSS/JS + Supabase + TMDB API.

## Kurulum (3 Adım)

### Adım 1 — API Anahtarları Alın

#### TMDB API Key (Ücretsiz)
1. https://www.themoviedb.org adresine gidin, ücretsiz hesap açın
2. Profil → Settings → API → "Create" tıklayın
3. API Key (v3 auth) kopyalayın

#### Supabase (Ücretsiz)
1. https://supabase.com → "New Project" oluşturun
2. Project Settings → API'dan şunları kopyalayın:
   - **Project URL** → `https://xxxx.supabase.co`
   - **anon public** anahtarı

---

### Adım 2 — Anahtarları Girin

**`js/supabase.js`** dosyasını açın:
```js
const SUPABASE_URL  = 'YOUR_SUPABASE_URL';   // ← buraya
const SUPABASE_ANON = 'YOUR_SUPABASE_ANON_KEY'; // ← buraya
```

**`js/tmdb.js`** dosyasını açın:
```js
const TMDB_API_KEY = 'YOUR_TMDB_API_KEY'; // ← buraya
```

---

### Adım 3 — Supabase Veritabanını Kurun

1. Supabase Dashboard → **SQL Editor** → **New Query**
2. `supabase_setup.sql` dosyasının tamamını kopyalayıp yapıştırın
3. **Run** tıklayın → "Success" mesajı görün

---

## Çalıştırma

VS Code'da **Live Server** eklentisiyle `index.html`'i açın.

> **Not:** `type="module"` JS kullandığı için doğrudan dosya açma (`file://`) çalışmaz.
> Mutlaka bir local server üzerinden çalıştırın (Live Server, http-server vb.)

---

## Özellikler

- 🔍 **TMDB entegrasyonu** — Milyonlarca film ve dizi, Türkçe
- 📋 **3 Durum** — İzlenecek / İzleniyor / İzlendi
- 📺 **Bölüm takibi** — Hangi sezon/bölüme kadar izledim
- ⭐ **Puan & not** — 10 üzerinden puanlama, kişisel notlar
- 📊 **İstatistikler** — Tür grafiği, aylık aktivite, top liste
- 🔐 **Güvenli** — Her kullanıcı sadece kendi verisini görür (RLS)

## Proje Yapısı

```
bingetracker/
├── index.html          ← Giriş / Kayıt
├── app.html            ← Ana uygulama
├── supabase_setup.sql  ← DB kurulum scripti
├── css/
│   ├── variables.css
│   ├── main.css
│   ├── auth.css
│   └── app.css
└── js/
    ├── supabase.js     ← ← API anahtarlarınızı buraya girin
    ├── tmdb.js         ← ← TMDB API key buraya
    ├── auth.js
    ├── tracker.js
    ├── stats.js
    └── app.js
```
