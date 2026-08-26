import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';

// High-quality curated iconic posters for instant display
const CURATED_POSTERS = [
  'https://image.tmdb.org/t/p/w342/ggFHVNu6YYI5L9pCfOacjizRGt.jpg', // Breaking Bad
  'https://image.tmdb.org/t/p/w342/49WJfeN0moxb9IPfGn8AIqMGskD.jpg', // Stranger Things
  'https://image.tmdb.org/t/p/w342/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg', // Game of Thrones
  'https://image.tmdb.org/t/p/w342/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', // Interstellar
  'https://image.tmdb.org/t/p/w342/qJ2tW6WMUDux911r6m7haRef0WH.jpg', // The Dark Knight
  'https://image.tmdb.org/t/p/w342/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', // Fight Club
  'https://image.tmdb.org/t/p/w342/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg', // Inception
  'https://image.tmdb.org/t/p/w342/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg', // The Matrix
  'https://image.tmdb.org/t/p/w342/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', // Oppenheimer
  'https://image.tmdb.org/t/p/w342/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg', // Dune 2
  'https://image.tmdb.org/t/p/w342/fqldf2t8ztc9aiwn396mlX3YqFm.jpg', // Arcane
  'https://image.tmdb.org/t/p/w342/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg', // The Last of Us
  'https://image.tmdb.org/t/p/w342/fC2HDm5t0kHjUmYIMBYV3a3fX42.jpg', // Better Call Saul
  'https://image.tmdb.org/t/p/w342/vUUqzWa2LnHIVqkaKVlVGkVcZIW.jpg', // Peaky Blinders
  'https://image.tmdb.org/t/p/w342/apbrbWs8M9lyOpJYU5WXrpFbk1Z.jpg', // Dark
  'https://image.tmdb.org/t/p/w342/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg', // Pulp Fiction
  'https://image.tmdb.org/t/p/w342/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg', // Chernobyl
  'https://image.tmdb.org/t/p/w342/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg', // Spider-Verse
  'https://image.tmdb.org/t/p/w342/74xTEgt7R36Fpooo50r9T25onhq.jpg', // The Batman
  'https://image.tmdb.org/t/p/w342/kyeqWdyUXW608qlYkRqosgbbJyK.jpg', // Avatar
  'https://image.tmdb.org/t/p/w342/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg', // Gladiator
  'https://image.tmdb.org/t/p/w342/7fn624j5lj3xTme2SgiLCeuedmO.jpg', // Whiplash
  'https://image.tmdb.org/t/p/w342/hZkgoQYus5vegHoetLkCJzb17zJ.jpg', // Fight Club 2
  'https://image.tmdb.org/t/p/w342/6ooCvAVxPknwE55s08oZfTz55G9.jpg', // The Sopranos
  'https://image.tmdb.org/t/p/w342/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg', // Blade Runner 2049
  'https://image.tmdb.org/t/p/w342/3bhkrj58Vtu7enYsRolD1fZdja1.jpg', // The Godfather
  'https://image.tmdb.org/t/p/w342/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg', // Lord of the Rings
  'https://image.tmdb.org/t/p/w342/bX2v06r1ZVIws56tJg55x3p0kS1.jpg'  // Shutter Island
];

interface PosterRowProps {
  posters: string[];
  animationClass: string;
}

const PosterRow: React.FC<PosterRowProps> = ({ posters, animationClass }) => {
  // Duplicate array to ensure seamless infinite looping
  const infiniteList = [...posters, ...posters, ...posters];

  return (
    <div className="overflow-hidden whitespace-nowrap py-1.5 select-none pointer-events-none">
      <div className={`marquee-row ${animationClass} flex gap-3 sm:gap-4`}>
        {infiniteList.map((url, index) => (
          <div
            key={index}
            className="w-24 sm:w-36 md:w-44 aspect-[2/3] shrink-0 rounded-xl sm:rounded-2xl overflow-hidden border border-white/10 shadow-lg shadow-black/60 bg-slate-900"
          >
            <img
              src={url}
              alt="Poster"
              loading="lazy"
              className="w-full h-full object-cover opacity-80 transition-opacity hover:opacity-100"
              onError={(e) => {
                // Fallback in case of broken image URL
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export const PosterBackground: React.FC = () => {
  const [posterList, setPosterList] = useState<string[]>(CURATED_POSTERS);

  useEffect(() => {
    // Attempt to load fresh trending posters from TMDB API
    api.get('/media/trending?type=all&timeWindow=week')
      .then((res) => {
        if (res.data?.data && Array.isArray(res.data.data)) {
          const tmdbPosters = res.data.data
            .filter((item: any) => item.poster_path)
            .map((item: any) => `https://image.tmdb.org/t/p/w342${item.poster_path}`);
          
          if (tmdbPosters.length > 5) {
            // Merge with curated to have high density
            const combined = Array.from(new Set([...tmdbPosters, ...CURATED_POSTERS]));
            setPosterList(combined);
          }
        }
      })
      .catch(() => {
        // Fallback already in place
      });
  }, []);

  // Split posters into 4 distinct groups for the 4 scrolling rows
  const quarter = Math.ceil(posterList.length / 4);
  const row1 = posterList.slice(0, quarter);
  const row2 = posterList.slice(quarter, quarter * 2);
  const row3 = posterList.slice(quarter * 2, quarter * 3);
  const row4 = posterList.slice(quarter * 3);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* 3D Tilted container for cinematic perspective */}
      <div className="absolute -inset-16 sm:-inset-24 -rotate-3 scale-105 flex flex-col justify-center opacity-40 sm:opacity-50">
        <PosterRow posters={row1.length ? row1 : CURATED_POSTERS} animationClass="animate-marquee-left-fast" />
        <PosterRow posters={row2.length ? row2 : CURATED_POSTERS} animationClass="animate-marquee-right" />
        <PosterRow posters={row3.length ? row3 : CURATED_POSTERS} animationClass="animate-marquee-left" />
        <PosterRow posters={row4.length ? row4 : CURATED_POSTERS} animationClass="animate-marquee-right-slow" />
      </div>

      {/* Dark Vignette & Gradient Overlays for readable text and modern aesthetic */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#020806] via-[#020806]/80 to-[#020806]/75" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(2,8,6,0.4)_0%,rgba(2,8,6,0.85)_70%,#020806_100%)]" />
      
      {/* Ambient Emerald Glow Behind Card */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
};
