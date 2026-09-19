export interface StickerItem {
  id: string;
  name: string;
  category: 'social' | 'music' | 'badges' | 'arrows' | 'emojis';
  categoryLabel: string;
  tags: string[];
  src: string; // SVG Data URL
  width: number;
  height: number;
  defaultAnimation?: 'zoom-in' | 'bounce' | 'pulse' | 'float' | 'ken-burns' | 'zoom-bounce';
}

const svgData = (svgString: string): string => {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString.trim())}`;
};

export const STICKER_CATEGORIES = [
  { id: 'all', label: 'Todos os Stickers' },
  { id: 'social', label: 'YouTube & Social' },
  { id: 'music', label: 'Música & DJ' },
  { id: 'badges', label: 'Selos & Promos' },
  { id: 'arrows', label: 'Setas & Balões' },
  { id: 'emojis', label: 'Emojis HD 3D' },
];

export const STICKERS_LIBRARY: StickerItem[] = [
  // --- YOUTUBE & SOCIAL ---
  {
    id: 'yt-subscribe',
    name: 'Botão Inscreva-se',
    category: 'social',
    categoryLabel: 'YouTube & Social',
    tags: ['youtube', 'subscribe', 'inscreva-se', 'canal', 'inscricao', 'red'],
    width: 320,
    height: 100,
    defaultAnimation: 'zoom-bounce',
    src: svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 100" width="320" height="100">
        <defs>
          <linearGradient id="ytGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FF0000"/>
            <stop offset="100%" stop-color="#C40000"/>
          </linearGradient>
          <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000000" flood-opacity="0.4"/>
          </filter>
        </defs>
        <rect x="10" y="15" width="300" height="70" rx="35" fill="url(#ytGrad)" filter="url(#shadow)"/>
        <path d="M 45 35 L 75 50 L 45 65 Z" fill="#FFFFFF"/>
        <text x="90" y="58" font-family="Arial, sans-serif" font-weight="900" font-size="22" fill="#FFFFFF" letter-spacing="0.5">INSCREVA-SE</text>
        <g transform="translate(250, 32) scale(1.1)">
          <path d="M 12 3 C 8.1 3 5 6.1 5 10 L 5 16 L 2 19 L 2 20 L 22 20 L 22 19 L 19 16 L 19 10 C 19 6.1 15.9 3 12 3 Z M 10 21 C 10 22.1 10.9 23 12 23 C 13.1 23 14 22.1 14 21 Z" fill="#FFDD00"/>
        </g>
      </svg>
    `)
  },
  {
    id: 'yt-like',
    name: 'Botão Deixe o Like',
    category: 'social',
    categoryLabel: 'YouTube & Social',
    tags: ['like', 'joinha', 'curtir', 'thumbsup', 'youtube', 'social'],
    width: 240,
    height: 90,
    defaultAnimation: 'bounce',
    src: svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 90" width="240" height="90">
        <defs>
          <linearGradient id="likeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#2563EB"/>
            <stop offset="100%" stop-color="#1D4ED8"/>
          </linearGradient>
          <filter id="likeShadow">
            <feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#1E40AF" flood-opacity="0.5"/>
          </filter>
        </defs>
        <rect x="10" y="10" width="220" height="70" rx="20" fill="url(#likeGrad)" filter="url(#likeShadow)" stroke="#60A5FA" stroke-width="2"/>
        <g transform="translate(28, 23) scale(1.3)" fill="#FFFFFF">
          <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.58 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
        </g>
        <text x="85" y="52" font-family="Arial, sans-serif" font-weight="900" font-size="24" fill="#FFFFFF" letter-spacing="1">DEIXE O LIKE</text>
      </svg>
    `)
  },
  {
    id: 'yt-bell',
    name: 'Sininho de Notificação',
    category: 'social',
    categoryLabel: 'YouTube & Social',
    tags: ['sininho', 'bell', 'notificacao', 'youtube', 'alerta'],
    width: 140,
    height: 140,
    defaultAnimation: 'pulse',
    src: svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
        <defs>
          <linearGradient id="bellGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FBBF24"/>
            <stop offset="100%" stop-color="#D97706"/>
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>
        </defs>
        <circle cx="70" cy="70" r="60" fill="#1E293B" stroke="#F59E0B" stroke-width="4" filter="url(#glow)"/>
        <g transform="translate(35, 30) scale(3)" fill="url(#bellGrad)">
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
        </g>
        <path d="M 25 45 C 15 55 15 85 25 95" stroke="#FBBF24" stroke-width="4" stroke-linecap="round" fill="none"/>
        <path d="M 115 45 C 125 55 125 85 115 95" stroke="#FBBF24" stroke-width="4" stroke-linecap="round" fill="none"/>
      </svg>
    `)
  },
  {
    id: 'verified-badge',
    name: 'Selo de Verificado',
    category: 'social',
    categoryLabel: 'YouTube & Social',
    tags: ['verificado', 'verified', 'check', 'oficial', 'badge', 'blue'],
    width: 140,
    height: 140,
    defaultAnimation: 'zoom-in',
    src: svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
        <defs>
          <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#38BDF8"/>
            <stop offset="100%" stop-color="#0284C7"/>
          </linearGradient>
        </defs>
        <path d="M 70 10 L 83 23 L 101 20 L 107 37 L 124 43 L 122 61 L 133 75 L 122 89 L 124 107 L 107 113 L 101 130 L 83 127 L 70 140 L 57 127 L 39 130 L 33 113 L 16 107 L 18 89 L 7 75 L 18 61 L 16 43 L 33 37 L 39 20 L 57 23 Z" fill="url(#blueGrad)"/>
        <path d="M 45 72 L 62 89 L 98 53" fill="none" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `)
  },
  {
    id: 'live-badge',
    name: 'Selo AO VIVO (Live)',
    category: 'social',
    categoryLabel: 'YouTube & Social',
    tags: ['live', 'aovivo', 'transmissao', 'stream', 'red', 'badge'],
    width: 220,
    height: 80,
    defaultAnimation: 'pulse',
    src: svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 80" width="220" height="80">
        <rect x="5" y="10" width="210" height="60" rx="16" fill="#DC2626" stroke="#EF4444" stroke-width="3"/>
        <circle cx="42" cy="40" r="12" fill="#FFFFFF"/>
        <circle cx="42" cy="40" r="6" fill="#DC2626"/>
        <text x="72" y="49" font-family="Impact, Arial Black, sans-serif" font-size="30" fill="#FFFFFF" letter-spacing="2">AO VIVO</text>
      </svg>
    `)
  },
  {
    id: 'instagram-badge',
    name: 'Siga no Instagram',
    category: 'social',
    categoryLabel: 'YouTube & Social',
    tags: ['instagram', 'insta', 'siga', 'social', 'reels'],
    width: 260,
    height: 80,
    defaultAnimation: 'float',
    src: svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 80" width="260" height="80">
        <defs>
          <linearGradient id="instaGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#FFDC80"/>
            <stop offset="25%" stop-color="#FCAF45"/>
            <stop offset="50%" stop-color="#F77737"/>
            <stop offset="75%" stop-color="#F56040"/>
            <stop offset="100%" stop-color="#C13584"/>
          </linearGradient>
        </defs>
        <rect x="5" y="10" width="250" height="60" rx="30" fill="url(#instaGrad)"/>
        <g transform="translate(25, 23) scale(1.4)" fill="none" stroke="#FFFFFF" stroke-width="2">
          <rect x="2" y="2" width="20" height="20" rx="5"/>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
        </g>
        <text x="80" y="47" font-family="Arial, sans-serif" font-weight="800" font-size="20" fill="#FFFFFF">@SIGA.NOS</text>
      </svg>
    `)
  },
  {
    id: 'tiktok-viral',
    name: 'Selo Viral TikTok',
    category: 'social',
    categoryLabel: 'YouTube & Social',
    tags: ['tiktok', 'viral', 'musica', 'trend', 'dance'],
    width: 220,
    height: 80,
    defaultAnimation: 'zoom-bounce',
    src: svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 80" width="220" height="80">
        <rect x="5" y="10" width="210" height="60" rx="15" fill="#000000" stroke="#25F4EE" stroke-width="2"/>
        <g transform="translate(25, 22) scale(1.5)">
          <path d="M12.5 2v10.5a3.5 3.5 0 1 1-3.5-3.5c.34 0 .67.05 1 .14V6.1A6.5 6.5 0 1 0 15.5 12.5V7a6.5 6.5 0 0 0 4 1.38V5.38A3.5 3.5 0 0 1 15.5 2h-3z" fill="#FE2C55"/>
          <path d="M12.5 2v10.5a3.5 3.5 0 1 1-3.5-3.5c.34 0 .67.05 1 .14V6.1A6.5 6.5 0 1 0 15.5 12.5V7a6.5 6.5 0 0 0 4 1.38V5.38A3.5 3.5 0 0 1 15.5 2h-3z" fill="#25F4EE" transform="translate(-1, -1)"/>
        </g>
        <text x="80" y="48" font-family="Impact, Arial Black, sans-serif" font-size="28" fill="#FFFFFF" letter-spacing="1">VIRAL!</text>
      </svg>
    `)
  },

  // --- MÚSICA & DJ ---
  {
    id: 'dj-headphones',
    name: 'Fone DJ Neon',
    category: 'music',
    categoryLabel: 'Música & DJ',
    tags: ['fone', 'headphone', 'dj', 'musica', 'audio', 'neon', 'cyan'],
    width: 160,
    height: 160,
    defaultAnimation: 'float',
    src: svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
        <defs>
          <filter id="neonGlow">
            <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <path d="M 30 90 A 50 50 0 0 1 130 90" fill="none" stroke="#00F0FF" stroke-width="12" stroke-linecap="round" filter="url(#neonGlow)"/>
        <rect x="15" y="80" width="30" height="50" rx="12" fill="#FF007F" filter="url(#neonGlow)"/>
        <rect x="115" y="80" width="30" height="50" rx="12" fill="#FF007F" filter="url(#neonGlow)"/>
        <circle cx="30" cy="105" r="8" fill="#00F0FF"/>
        <circle cx="130" cy="105" r="8" fill="#00F0FF"/>
      </svg>
    `)
  },
  {
    id: 'vinyl-record',
    name: 'Disco de Vinil Ouro',
    category: 'music',
    categoryLabel: 'Música & DJ',
    tags: ['vinil', 'vinyl', 'disco', 'retro', 'gold', 'dj', 'album'],
    width: 180,
    height: 180,
    defaultAnimation: 'ken-burns',
    src: svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="180" height="180">
        <circle cx="90" cy="90" r="85" fill="#111827" stroke="#374151" stroke-width="4"/>
        <circle cx="90" cy="90" r="72" fill="none" stroke="#1F2937" stroke-width="2"/>
        <circle cx="90" cy="90" r="60" fill="none" stroke="#374151" stroke-width="2"/>
        <circle cx="90" cy="90" r="48" fill="none" stroke="#1F2937" stroke-width="2"/>
        <!-- Gold Center Label -->
        <circle cx="90" cy="90" r="32" fill="#F59E0B" stroke="#FBBF24" stroke-width="3"/>
        <circle cx="90" cy="90" r="8" fill="#FFFFFF"/>
        <text x="90" y="78" font-family="Arial, sans-serif" font-weight="bold" font-size="8" fill="#78350F" text-anchor="middle">VEE MUSIC</text>
        <!-- Shine Overlay -->
        <path d="M 20 50 Q 90 90 160 50 Q 90 90 20 50 Z" fill="#FFFFFF" opacity="0.12"/>
      </svg>
    `)
  },
  {
    id: 'gold-music-notes',
    name: 'Notas Musicais 3D',
    category: 'music',
    categoryLabel: 'Música & DJ',
    tags: ['notas', 'musica', 'som', 'gold', 'clave', 'sparkles'],
    width: 160,
    height: 160,
    defaultAnimation: 'bounce',
    src: svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
        <defs>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FDE047"/>
            <stop offset="50%" stop-color="#EAB308"/>
            <stop offset="100%" stop-color="#CA8A04"/>
          </linearGradient>
        </defs>
        <!-- Eighth Notes -->
        <path d="M 40 110 A 18 14 0 1 1 58 96 L 58 35 L 120 20 L 120 80 A 18 14 0 1 1 138 66 L 138 10 L 58 28 L 58 96 Z" fill="url(#goldGrad)"/>
        <!-- Sparkles -->
        <path d="M 20 30 L 25 20 L 30 30 L 40 35 L 30 40 L 25 50 L 20 40 L 10 35 Z" fill="#FFF" opacity="0.9"/>
        <path d="M 130 110 L 133 103 L 140 110 L 147 113 L 140 116 L 133 123 L 130 116 L 123 113 Z" fill="#FFF" opacity="0.9"/>
      </svg>
    `)
  },
  {
    id: 'soundwave-equalizer',
    name: 'Equalizador de Áudio',
    category: 'music',
    categoryLabel: 'Música & DJ',
    tags: ['equalizador', 'soundwave', 'espectro', 'audio', 'ritmo'],
    width: 240,
    height: 120,
    defaultAnimation: 'pulse',
    src: svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 120" width="240" height="120">
        <defs>
          <linearGradient id="eqGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#10B981"/>
            <stop offset="50%" stop-color="#F59E0B"/>
            <stop offset="100%" stop-color="#EF4444"/>
          </linearGradient>
        </defs>
        <g fill="url(#eqGrad)">
          <rect x="15" y="40" width="16" height="70" rx="8"/>
          <rect x="42" y="20" width="16" height="90" rx="8"/>
          <rect x="69" y="55" width="16" height="55" rx="8"/>
          <rect x="96" y="10" width="16" height="100" rx="8"/>
          <rect x="123" y="30" width="16" height="80" rx="8"/>
          <rect x="150" y="65" width="16" height="45" rx="8"/>
          <rect x="177" y="15" width="16" height="95" rx="8"/>
          <rect x="204" y="50" width="16" height="60" rx="8"/>
        </g>
      </svg>
    `)
  },
  {
    id: 'retro-cassette',
    name: 'Fita Cassette Retrô 80s',
    category: 'music',
    categoryLabel: 'Música & DJ',
    tags: ['cassette', 'fita', 'retro', 'synthwave', '80s', 'vintage'],
    width: 220,
    height: 140,
    defaultAnimation: 'ken-burns',
    src: svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 140" width="220" height="140">
        <rect x="10" y="10" width="200" height="120" rx="12" fill="#1F2937" stroke="#A855F7" stroke-width="4"/>
        <!-- Sticker Label -->
        <rect x="25" y="22" width="170" height="60" rx="6" fill="#F43F5E"/>
        <text x="110" y="42" font-family="Courier, monospace" font-weight="bold" font-size="16" fill="#FFFFFF" text-anchor="middle">MIX TAPE #1</text>
        <!-- Reels Container -->
        <rect x="50" y="50" width="120" height="30" rx="15" fill="#111827"/>
        <circle cx="75" cy="65" r="10" fill="#FFFFFF" stroke="#374151" stroke-width="3"/>
        <circle cx="145" cy="65" r="10" fill="#FFFFFF" stroke="#374151" stroke-width="3"/>
        <!-- Bottom Trapezoid -->
        <polygon points="40,120 180,120 165,95 55,95" fill="#374151"/>
      </svg>
    `)
  },

  // --- SELOS & PROMOS ---
  {
    id: 'badge-novo',
    name: 'Selo NOVO! (New)',
    category: 'badges',
    categoryLabel: 'Selos & Promos',
    tags: ['novo', 'new', 'lancamento', 'badge', 'destaque', 'starburst'],
    width: 150,
    height: 150,
    defaultAnimation: 'zoom-bounce',
    src: svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150" width="150" height="150">
        <g fill="#FACC15" stroke="#EAB308" stroke-width="2">
          <path d="M 75 5 L 85 25 L 107 13 L 111 35 L 133 31 L 130 53 L 150 58 L 140 78 L 154 91 L 138 106 L 146 127 L 125 133 L 124 155 L 103 151 L 94 171 L 75 158 L 56 171 L 47 151 L 26 155 L 25 133 L 4 127 L 12 106 L -4 91 L 10 78 L 0 58 L 20 53 L 17 31 L 39 35 L 43 13 L 65 25 Z" transform="scale(0.85) translate(12, 10)"/>
        </g>
        <circle cx="75" cy="75" r="50" fill="#DC2626"/>
        <text x="75" y="85" font-family="Impact, Arial Black, sans-serif" font-size="34" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">NOVO!</text>
      </svg>
    `)
  },
  {
    id: 'badge-trending',
    name: 'Selo EM ALTA (Trending)',
    category: 'badges',
    categoryLabel: 'Selos & Promos',
    tags: ['emalta', 'trending', 'fogo', 'viral', 'top', 'hot'],
    width: 240,
    height: 90,
    defaultAnimation: 'bounce',
    src: svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 90" width="240" height="90">
        <defs>
          <linearGradient id="flameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#F97316"/>
            <stop offset="100%" stop-color="#EF4444"/>
          </linearGradient>
        </defs>
        <rect x="10" y="10" width="220" height="70" rx="35" fill="url(#flameGrad)"/>
        <!-- Flame Icon -->
        <g transform="translate(25, 20) scale(1.5)" fill="#FACC15">
          <path d="M12 23c-4.97 0-9-4.03-9-9 0-3.53 2.05-6.62 5.03-8.08C8.5 7.85 9.5 10 12 10c2.5 0 3-3 2-6 4 2 7 6 7 10 0 4.97-4.03 9-9 9z"/>
        </g>
        <text x="80" y="52" font-family="Impact, Arial Black, sans-serif" font-size="28" fill="#FFFFFF" letter-spacing="1">EM ALTA!</text>
      </svg>
    `)
  },
  {
    id: 'badge-top10',
    name: 'Selo #1 TOP 10',
    category: 'badges',
    categoryLabel: 'Selos & Promos',
    tags: ['top10', 'numero1', 'trofeu', 'sucesso', 'gold'],
    width: 160,
    height: 160,
    defaultAnimation: 'zoom-in',
    src: svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
        <circle cx="80" cy="80" r="70" fill="#0F172A" stroke="#F59E0B" stroke-width="6"/>
        <circle cx="80" cy="80" r="58" fill="#1E293B"/>
        <text x="80" y="65" font-family="Impact, Arial Black, sans-serif" font-size="36" fill="#FBBF24" text-anchor="middle">#1</text>
        <text x="80" y="105" font-family="Arial, sans-serif" font-weight="900" font-size="22" fill="#FFFFFF" text-anchor="middle">TOP 10</text>
      </svg>
    `)
  },
  {
    id: 'promo-50off',
    name: 'Tag PROMO 50% OFF',
    category: 'badges',
    categoryLabel: 'Selos & Promos',
    tags: ['promo', 'desconto', '50off', 'vendas', 'oferta', 'sale'],
    width: 220,
    height: 90,
    defaultAnimation: 'pulse',
    src: svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 90" width="220" height="90">
        <rect x="5" y="10" width="210" height="70" rx="15" fill="#16A34A" stroke="#4ADE80" stroke-width="3"/>
        <text x="110" y="42" font-family="Impact, Arial Black, sans-serif" font-size="26" fill="#FFFFFF" text-anchor="middle">PROMOÇÃO</text>
        <text x="110" y="68" font-family="Arial, sans-serif" font-weight="900" font-size="20" fill="#FACC15" text-anchor="middle">50% OFF</text>
      </svg>
    `)
  },

  // --- SETAS & BALÕES ---
  {
    id: 'arrow-down-neon',
    name: 'Seta Neon Aponte Aqui',
    category: 'arrows',
    categoryLabel: 'Setas & Balões',
    tags: ['seta', 'arrow', 'neon', 'indicador', 'clique', 'aqui'],
    width: 140,
    height: 180,
    defaultAnimation: 'bounce',
    src: svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 180" width="140" height="180">
        <defs>
          <filter id="yellowGlow">
            <feGaussianBlur stdDeviation="6" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <path d="M 70 10 L 70 110 M 30 90 L 70 140 L 110 90" fill="none" stroke="#FACC15" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" filter="url(#yellowGlow)"/>
        <text x="70" y="170" font-family="Arial, sans-serif" font-weight="900" font-size="16" fill="#FACC15" text-anchor="middle">CLIQUE AQUI</text>
      </svg>
    `)
  },
  {
    id: 'speech-bubble-ouca',
    name: 'Balão "OUÇA ISSO!"',
    category: 'arrows',
    categoryLabel: 'Setas & Balões',
    tags: ['balao', 'speech', 'ouca', 'listen', 'texto', 'mensagem'],
    width: 260,
    height: 120,
    defaultAnimation: 'zoom-bounce',
    src: svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 120" width="260" height="120">
        <path d="M 20 10 L 240 10 C 250 10 255 18 255 28 L 255 80 C 255 90 247 95 237 95 L 80 95 L 40 118 L 50 95 L 20 95 C 10 95 5 87 5 77 L 5 28 C 5 18 13 10 23 10 Z" fill="#6D28D9" stroke="#A78BFA" stroke-width="4"/>
        <text x="130" y="62" font-family="Impact, Arial Black, sans-serif" font-size="28" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">OUÇA ISSO! 🎧</text>
      </svg>
    `)
  },
  {
    id: 'flame-3d',
    name: 'Fogo / Chama 3D',
    category: 'arrows',
    categoryLabel: 'Setas & Balões',
    tags: ['fogo', 'fire', 'flame', 'quente', 'hot', '3d'],
    width: 140,
    height: 180,
    defaultAnimation: 'pulse',
    src: svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 180" width="140" height="180">
        <!-- Outer Flame -->
        <path d="M 70 10 C 100 60 135 90 135 130 C 135 160 105 175 70 175 C 35 175 5 160 5 130 C 5 90 40 60 70 10 Z" fill="#EF4444"/>
        <!-- Mid Flame -->
        <path d="M 70 45 C 92 80 115 105 115 135 C 115 158 95 168 70 168 C 45 168 25 158 25 135 C 25 105 48 80 70 45 Z" fill="#F97316"/>
        <!-- Inner Flame -->
        <path d="M 70 85 C 82 105 95 120 95 140 C 95 155 84 162 70 162 C 56 162 45 155 45 140 C 45 120 58 105 70 85 Z" fill="#FDE047"/>
      </svg>
    `)
  },
  {
    id: 'sparkles-gold',
    name: 'Estrelas Mágicas Gold',
    category: 'arrows',
    categoryLabel: 'Setas & Balões',
    tags: ['estrelas', 'sparkles', 'brilho', 'gold', 'magia'],
    width: 160,
    height: 160,
    defaultAnimation: 'float',
    src: svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
        <path d="M 80 10 L 92 68 L 150 80 L 92 92 L 80 150 L 68 92 L 10 80 L 68 68 Z" fill="#FACC15"/>
        <path d="M 30 30 L 35 50 L 55 55 L 35 60 L 30 80 L 25 60 L 5 55 L 25 50 Z" fill="#FDE047"/>
        <path d="M 130 110 L 133 123 L 146 126 L 133 129 L 130 142 L 127 129 L 114 126 L 127 123 Z" fill="#FFF"/>
      </svg>
    `)
  },

  // --- EMOJIS HD 3D ---
  {
    id: 'emoji-laugh',
    name: 'Emoji Rindo com Lágrimas',
    category: 'emojis',
    categoryLabel: 'Emojis HD 3D',
    tags: ['emoji', 'riso', 'engracado', 'lol', 'kkk', '3d'],
    width: 160,
    height: 160,
    defaultAnimation: 'bounce',
    src: svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
        <circle cx="80" cy="80" r="72" fill="#FACC15" stroke="#EAB308" stroke-width="4"/>
        <!-- Eyes -->
        <path d="M 35 55 Q 50 40 65 55" fill="none" stroke="#78350F" stroke-width="8" stroke-linecap="round"/>
        <path d="M 95 55 Q 110 40 125 55" fill="none" stroke="#78350F" stroke-width="8" stroke-linecap="round"/>
        <!-- Mouth -->
        <path d="M 35 85 Q 80 140 125 85 Z" fill="#78350F"/>
        <!-- Tears -->
        <path d="M 20 65 C 10 80 20 95 28 80 Z" fill="#38BDF8"/>
        <path d="M 140 65 C 150 80 140 95 132 80 Z" fill="#38BDF8"/>
      </svg>
    `)
  },
  {
    id: 'emoji-love-eyes',
    name: 'Emoji Olhos de Coração',
    category: 'emojis',
    categoryLabel: 'Emojis HD 3D',
    tags: ['emoji', 'coracao', 'amor', 'love', '3d', 'head'],
    width: 160,
    height: 160,
    defaultAnimation: 'zoom-bounce',
    src: svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
        <circle cx="80" cy="80" r="72" fill="#FACC15" stroke="#EAB308" stroke-width="4"/>
        <!-- Left Heart Eye -->
        <path d="M 45 45 C 35 30 20 45 45 68 C 70 45 55 30 45 45 Z" fill="#EF4444"/>
        <!-- Right Heart Eye -->
        <path d="M 115 45 C 105 30 90 45 115 68 C 140 45 125 30 115 45 Z" fill="#EF4444"/>
        <!-- Big Smile -->
        <path d="M 40 95 Q 80 135 120 95" fill="none" stroke="#78350F" stroke-width="10" stroke-linecap="round"/>
      </svg>
    `)
  },
  {
    id: 'emoji-sunglasses',
    name: 'Emoji Óculos Escuros',
    category: 'emojis',
    categoryLabel: 'Emojis HD 3D',
    tags: ['emoji', 'oculos', 'boss', 'cool', 'estilo', '3d'],
    width: 160,
    height: 160,
    defaultAnimation: 'float',
    src: svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
        <circle cx="80" cy="80" r="72" fill="#FACC15" stroke="#EAB308" stroke-width="4"/>
        <!-- Sunglasses -->
        <path d="M 20 55 L 140 55 L 130 90 Q 80 100 30 90 Z" fill="#111827"/>
        <line x1="15" y1="62" x2="145" y2="62" stroke="#111827" stroke-width="8"/>
        <!-- Lens Reflection -->
        <path d="M 35 60 L 65 60 L 45 85 Z" fill="#FFFFFF" opacity="0.3"/>
        <path d="M 95 60 L 125 60 L 105 85 Z" fill="#FFFFFF" opacity="0.3"/>
        <!-- Cool Smile -->
        <path d="M 50 115 Q 80 135 110 115" fill="none" stroke="#78350F" stroke-width="8" stroke-linecap="round"/>
      </svg>
    `)
  },
  {
    id: 'emoji-crown',
    name: 'Coroa Dourada Rei/Rainha',
    category: 'emojis',
    categoryLabel: 'Emojis HD 3D',
    tags: ['coroa', 'crown', 'rei', 'king', 'gold', 'luxo'],
    width: 180,
    height: 140,
    defaultAnimation: 'zoom-in',
    src: svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 140" width="180" height="140">
        <polygon points="15,115 165,115 150,35 110,75 90,15 70,75 30,35" fill="#F59E0B" stroke="#FBBF24" stroke-width="4"/>
        <rect x="15" y="115" width="150" height="18" rx="4" fill="#D97706"/>
        <!-- Jewels -->
        <circle cx="90" cy="30" r="10" fill="#EF4444"/>
        <circle cx="30" cy="48" r="8" fill="#3B82F6"/>
        <circle cx="150" cy="48" r="8" fill="#10B981"/>
        <circle cx="50" cy="124" r="5" fill="#EF4444"/>
        <circle cx="90" cy="124" r="5" fill="#3B82F6"/>
        <circle cx="130" cy="124" r="5" fill="#10B981"/>
      </svg>
    `)
  },
  {
    id: 'emoji-cash-bag',
    name: 'Saco de Dinheiro 3D',
    category: 'emojis',
    categoryLabel: 'Emojis HD 3D',
    tags: ['dinheiro', 'saco', 'cash', 'money', 'dolar', 'lucro'],
    width: 150,
    height: 170,
    defaultAnimation: 'bounce',
    src: svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 170" width="150" height="170">
        <path d="M 75 35 C 100 35 115 15 125 5 L 25 5 C 35 15 50 35 75 35 Z" fill="#15803D"/>
        <!-- Rope -->
        <rect x="40" y="32" width="70" height="12" rx="6" fill="#F59E0B"/>
        <!-- Bag Body -->
        <path d="M 75 42 C 125 42 145 80 140 130 C 135 165 105 168 75 168 C 45 168 15 165 10 130 C 5 80 25 42 75 42 Z" fill="#22C55E"/>
        <!-- Dollar Sign -->
        <text x="75" y="122" font-family="Arial, sans-serif" font-weight="900" font-size="64" fill="#15803D" text-anchor="middle">$</text>
      </svg>
    `)
  }
];
