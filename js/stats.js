// ── Statistics charts & rendering ─────────────────────────────────────────────
import { getPosterUrl } from './tmdb.js';

const GENRE_COLORS = [
  '#19A898', '#3B82F6', '#F59E0B', '#8B5CF6',
  '#EF4444', '#10B981', '#EC4899', '#06B6D4',
  '#F97316', '#84CC16'
];

// ── Render overview stat cards ────────────────────────────────────────────────
export function renderStatCards(stats) {
  const container = document.getElementById('stats-overview');
  if (!container) return;

  const cards = [
    { icon: 'film',           value: stats.totalMovies,    label: 'Film İzlendi' },
    { icon: 'tv',             value: stats.totalTV,        label: 'Dizi Takip Edildi' },
    { icon: 'check-circle-2', value: stats.totalWatched,   label: 'Toplam Bitti' },
    { icon: 'play-circle',    value: stats.totalWatching,  label: 'Şu An İzleniyor' },
    { icon: 'clock',          value: stats.totalWatchlist, label: 'Listede Bekliyor' },
    { icon: 'hourglass',      value: stats.totalHours,     label: 'Saat İzlendi', suffix: 'sa' },
  ];

  container.innerHTML = cards.map(c => `
    <div class="stat-card animate-fade-in">
      <div class="stat-icon" style="color:var(--clr-primary)">
        <i data-lucide="${c.icon}" class="icon-lg"></i>
      </div>
      <div class="stat-value">${c.value}${c.suffix ? `<span style="font-size:.5em;margin-left:4px;color:var(--clr-text-muted)">${c.suffix}</span>` : ''}</div>
      <div class="stat-label">${c.label}</div>
    </div>
  `).join('');

  if (window.lucide) window.lucide.createIcons({ root: container });
}

// ── Donut chart — genre distribution ─────────────────────────────────────────
export function renderGenreChart(stats) {
  const canvas = document.getElementById('genre-chart');
  const legend = document.getElementById('genre-legend');
  if (!canvas || !stats.genreData?.length) {
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#9ca3af';
      ctx.font = '13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Henüz yeterli veri yok', canvas.width / 2, canvas.height / 2);
    }
    return;
  }

  const ctx = canvas.getContext('2d');
  const total = stats.genreData.reduce((s, g) => s + g.count, 0);
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;
  const outerR = Math.min(W, H) / 2 - 10;
  const innerR = outerR * 0.58;

  ctx.clearRect(0, 0, W, H);

  let startAngle = -Math.PI / 2;
  stats.genreData.forEach((g, i) => {
    const slice = (g.count / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outerR, startAngle, startAngle + slice);
    ctx.closePath();
    ctx.fillStyle = GENRE_COLORS[i % GENRE_COLORS.length];
    ctx.fill();
    startAngle += slice;
  });

  // Inner hole
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, 2 * Math.PI);
  ctx.fillStyle = getComputedStyle(document.documentElement)
    .getPropertyValue('--clr-surface').trim() || '#ffffff';
  ctx.fill();

  // Center text
  ctx.fillStyle = getComputedStyle(document.documentElement)
    .getPropertyValue('--clr-text-primary').trim() || '#111827';
  ctx.font = `bold ${Math.round(outerR * 0.32)}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(total, cx, cy - 8);
  ctx.font = `${Math.round(outerR * 0.16)}px Inter, sans-serif`;
  ctx.fillStyle = getComputedStyle(document.documentElement)
    .getPropertyValue('--clr-text-muted').trim() || '#9ca3af';
  ctx.fillText('içerik', cx, cy + 14);

  // Legend
  if (legend) {
    legend.innerHTML = stats.genreData.map((g, i) => `
      <div class="genre-legend-item">
        <div class="genre-legend-left">
          <div class="genre-dot" style="background:${GENRE_COLORS[i % GENRE_COLORS.length]}"></div>
          <span class="genre-name">${g.name}</span>
        </div>
        <span class="genre-count">${g.count}</span>
      </div>
    `).join('');
  }
}

// ── Bar chart — monthly activity ──────────────────────────────────────────────
export function renderMonthlyChart(stats) {
  const canvas = document.getElementById('monthly-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const months = stats.monthlyData || [];
  const maxVal = Math.max(...months.map(m => m.count), 1);
  const padLeft = 36, padBottom = 36, padTop = 16, padRight = 12;
  const chartW = W - padLeft - padRight;
  const chartH = H - padBottom - padTop;
  const barW = (chartW / months.length) * 0.6;
  const gap   = (chartW / months.length) * 0.4;

  ctx.clearRect(0, 0, W, H);

  const accent = getComputedStyle(document.documentElement)
    .getPropertyValue('--clr-accent').trim() || '#19A898';
  const border = getComputedStyle(document.documentElement)
    .getPropertyValue('--clr-border').trim() || '#e4e8ef';
  const textMuted = getComputedStyle(document.documentElement)
    .getPropertyValue('--clr-text-muted').trim() || '#9ca3af';
  const textSec = getComputedStyle(document.documentElement)
    .getPropertyValue('--clr-text-secondary').trim() || '#6b7280';

  // Grid lines
  ctx.strokeStyle = border;
  ctx.lineWidth = 1;
  [0, 0.25, 0.5, 0.75, 1].forEach(t => {
    const y = padTop + chartH * (1 - t);
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(padLeft, y);
    ctx.lineTo(W - padRight, y);
    ctx.stroke();
    // Y label
    if (t > 0) {
      ctx.fillStyle = textMuted;
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.setLineDash([]);
      ctx.fillText(Math.round(maxVal * t), padLeft - 4, y);
    }
  });
  ctx.setLineDash([]);

  // Bars
  months.forEach((m, i) => {
    const x = padLeft + i * (barW + gap) + gap / 2;
    const barH = maxVal > 0 ? (m.count / maxVal) * chartH : 0;
    const y = padTop + chartH - barH;

    // Bar gradient
    const grad = ctx.createLinearGradient(0, y, 0, padTop + chartH);
    grad.addColorStop(0, accent);
    grad.addColorStop(1, accent + '55');
    ctx.fillStyle = m.count > 0 ? grad : border;
    ctx.beginPath();
    const r = 4;
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + barW - r, y);
    ctx.arcTo(x + barW, y, x + barW, y + r, r);
    ctx.lineTo(x + barW, padTop + chartH);
    ctx.lineTo(x, padTop + chartH);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.fill();

    // Value on bar
    if (m.count > 0) {
      ctx.fillStyle = accent;
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(m.count, x + barW / 2, y - 2);
    }

    // Month label
    ctx.fillStyle = textSec;
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(m.label, x + barW / 2, padTop + chartH + 6);
  });
}

// ── Top rated list ────────────────────────────────────────────────────────────
export function renderTopRated(stats) {
  const container = document.getElementById('top-rated-list');
  if (!container) return;

  if (!stats.topRated?.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding:var(--sp-8)">
        <div class="empty-state-icon">⭐</div>
        <p>Henüz puan verilen içerik yok</p>
      </div>`;
    return;
  }

  container.innerHTML = stats.topRated.map((item, i) => {
    const stars = '★'.repeat(Math.round(item.rating / 2));
    const posterUrl = item.poster_path ? getPosterUrl(item.poster_path, 'w92') : null;
    return `
      <div class="top-rated-item">
        <div class="top-rated-rank">#${i + 1}</div>
        ${posterUrl
          ? `<img class="top-rated-img" src="${posterUrl}" alt="${item.title}" loading="lazy">`
          : `<div class="top-rated-img" style="background:var(--clr-surface-2);display:flex;align-items:center;justify-content:center;font-size:1.2rem">
              ${item.media_type === 'movie' ? '🎬' : '📺'}
            </div>`
        }
        <div class="top-rated-info">
          <div class="top-rated-title truncate">${item.title}</div>
          <div class="top-rated-sub">${item.media_type === 'movie' ? 'Film' : 'Dizi'}</div>
        </div>
        <div class="top-rated-rating">
          <span>★</span>
          <span>${item.rating}/10</span>
        </div>
      </div>`;
  }).join('');
}
