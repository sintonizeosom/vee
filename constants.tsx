import React from 'react';
import { ProjectFormat, SpectrumStyle, TransitionType, VideoClip, VideoEffectType, TextInAnimation, TextOutAnimation, TextLoopAnimation } from './types';
import { Youtube, Instagram, Music, Clapperboard, BarChart2, CircleDot, Waves, Atom, Sun, SlidersHorizontal, Orbit, Zap, Spline, Triangle, Activity, BarChart4, Blend, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, ChevronsRight, ChevronsLeft, ChevronsUp, ChevronsDown, Circle, AppWindow, Grid, Disc, Palette, CloudFog, Contrast, Droplets, Bot, Meh, Aperture, VenetianMask, PanelBottomClose, Focus, RectangleHorizontal, ArrowUpRight, ZoomIn, ZoomOut, Signal, Wand2, Grid3X3, Dna, Flame, RotateCw, Repeat, Columns, Maximize, Heart, Star, Sparkles, Rows, MoveDownRight, Box, Radio, Layers, Cpu, Rainbow } from 'lucide-react';

export const FORMAT_DIMENSIONS: Record<ProjectFormat, { width: number; height: number; name: string; icon: React.ReactNode }> = {
  youtube: { width: 1920, height: 1080, name: 'YouTube (Full HD 16:9)', icon: <Youtube className="w-8 h-8 mr-4" /> },
  instagram: { width: 1080, height: 1080, name: 'Instagram (1:1)', icon: <Instagram className="w-8 h-8 mr-4" /> },
  tiktok: { width: 1080, height: 1920, name: 'TikTok (9:16)', icon: <Music className="w-8 h-8 mr-4" /> },
};

export interface FontGroup {
  category: string;
  fonts: string[];
}

export const FONT_GROUPS: FontGroup[] = [
  {
    category: '🔥 Destaques & Shorts Populares',
    fonts: [
      'Bebas Neue', 'Impact', 'Lilita One', 'Luckiest Guy', 'Anton', 'Space Grotesk',
      'Syne', 'Outfit', 'Montserrat', 'Poppins', 'Inter', 'Archivo Black', 'Kanit',
      'Unbounded', 'Bangers', 'Russo One', 'Fredoka', 'Plus Jakarta Sans'
    ]
  },
  {
    category: '📱 Sans-Serif Modernas & Limpas',
    fonts: [
      'Plus Jakarta Sans', 'Inter', 'Poppins', 'Montserrat', 'Roboto', 'Open Sans', 'Lato',
      'Raleway', 'Nunito', 'Quicksand', 'Sora', 'Manrope', 'Outfit', 'Barlow', 'Work Sans',
      'DM Sans', 'Urbanist', 'Rubik', 'Lexend', 'Figtree', 'Jost', 'Albert Sans', 'Segoe UI',
      'Helvetica Neue', 'Arial', 'Verdana', 'Trebuchet MS', 'Tahoma', 'Calibri', 'Century Gothic',
      'Avenir', 'Myriad Pro', 'Geneva', 'Droid Sans', 'Corbel'
    ]
  },
  {
    category: '⚡ Display, Impacto & Títulos Bold',
    fonts: [
      'Impact', 'Bebas Neue', 'Anton', 'Oswald', 'Archivo Black', 'Kanit', 'Russo One',
      'Bangers', 'Bungee', 'Black Ops One', 'Righteous', 'Chakra Petch', 'Orbitron',
      'Audiowide', 'Titan One', 'Lilita One', 'Carter One', 'Passion One', 'Changa One',
      'Luckiest Guy', 'Fredoka', 'Chewy', 'Sniglet', 'Arial Black', 'Copperplate', 'Rockwell'
    ]
  },
  {
    category: '📜 Serifadas, Elegantes & Luxo',
    fonts: [
      'Playfair Display', 'Cinzel', 'Merriweather', 'Lora', 'Cormorant Garamond',
      'Bodoni Moda', 'Prata', 'Fraunces', 'EB Garamond', 'Crimson Text', 'Georgia',
      'Times New Roman', 'Garamond', 'Palatino', 'Baskerville', 'Didot', 'American Typewriter',
      'PT Serif', 'Bookman Old Style', 'Cambria', 'Constantia', 'Bodoni MT', 'Hoefler Text'
    ]
  },
  {
    category: '✍️ Cursivas, Manuscritas & Pincel',
    fonts: [
      'Caveat', 'Pacifico', 'Lobster', 'Dancing Script', 'Satisfy', 'Permanent Marker',
      'Rock Salt', 'Great Vibes', 'Sacramento', 'Shadows Into Light', 'Kalam', 'Patrick Hand',
      'Kaushan Script', 'Yellowtail', 'Alex Brush', 'Architects Daughter', 'Lobster Two',
      'Comic Neue', 'Comic Sans MS', 'Brush Script MT', 'Papyrus'
    ]
  },
  {
    category: '🎮 Monospaçadas, Retro & Gamer',
    fonts: [
      'Press Start 2P', 'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'Inconsolata',
      'Space Mono', 'VT323', 'Silkscreen', 'Share Tech Mono', 'Courier New', 'Monaco', 'Consolas',
      'Menlo', 'Lucida Console', 'Andale Mono'
    ]
  },
  {
    category: '🎨 Temáticas & Especiais',
    fonts: [
      'Creepster', 'Bungee Inline', 'Amatic SC', 'Concert One'
    ]
  }
];

export const AVAILABLE_FONTS: string[] = Array.from(
  new Set(FONT_GROUPS.flatMap(group => group.fonts))
).sort((a, b) => a.localeCompare(b));

export const BASE_PIXELS_PER_SECOND = 60;

export const SPECTRUM_MODELS: { id: SpectrumStyle; name: string; icon: React.ReactNode }[] = [
    { id: 'aurora', name: 'Aurora Boreal', icon: <BarChart2 className="w-5 h-5 mr-2" /> },
    { id: 'radiant-pulse', name: 'Pulso Radiante', icon: <Activity className="w-5 h-5 mr-2" /> },
    { id: 'neon-equalizer-bars', name: 'Equalizador Neon Moderno', icon: <BarChart4 className="w-5 h-5 mr-2" /> },
    { id: 'quantum-wave', name: 'Onda Quântica', icon: <Waves className="w-5 h-5 mr-2" /> },
    { id: 'cyber-matrix', name: 'Matriz Cyberpunk', icon: <Cpu className="w-5 h-5 mr-2" /> },
    { id: 'prism-beam', name: 'Feixe Prismático', icon: <Rainbow className="w-5 h-5 mr-2" /> },
    { id: 'hyper-cube', name: 'Cubo Tesseract 3D', icon: <Box className="w-5 h-5 mr-2" /> },
    { id: 'sonic-pulse-radar', name: 'Radar Sônico 360°', icon: <Radio className="w-5 h-5 mr-2" /> },
    { id: 'hologram-waveform', name: 'Onda Holográfica 3D', icon: <Layers className="w-5 h-5 mr-2" /> },
    { id: 'neon-ring', name: 'Anel de Neon', icon: <Disc className="w-5 h-5 mr-2" /> },
    { id: 'arc-reactor', name: 'Reator de Arcos', icon: <Orbit className="w-5 h-5 mr-2" /> },
    { id: 'chroma-wheel', name: 'Roda Cromática', icon: <Palette className="w-5 h-5 mr-2" /> },
    { id: 'galaxy', name: 'Galáxia', icon: <CircleDot className="w-5 h-5 mr-2" /> },
    { id: 'ripple', name: 'Onda de Neon', icon: <Waves className="w-5 h-5 mr-2" /> },
    { id: 'nebula', name: 'Nebulosa', icon: <Atom className="w-5 h-5 mr-2" /> },
    { id: 'supernova', name: 'Supernova', icon: <Sun className="w-5 h-5 mr-2" /> },
    { id: 'equalizer', name: 'Equalizador LED', icon: <SlidersHorizontal className="w-5 h-5 mr-2" /> },
    { id: 'circular-equalizer', name: 'Equalizador Circular', icon: <BarChart4 className="w-5 h-5 mr-2" /> },
    { id: 'firefly', name: 'Orbe Vagalume', icon: <Orbit className="w-5 h-5 mr-2" /> },
    { id: 'spikes', name: 'Picos de Voltagem', icon: <Zap className="w-5 h-5 mr-2" /> },
    { id: 'cosmic-ripples', name: 'Ondas Cósmicas', icon: <Spline className="w-5 h-5 mr-2" /> },
    { id: 'trinity-pulse', name: 'Pulso da Trindade', icon: <Triangle className="w-5 h-5 mr-2" /> },
    { id: 'cyber-synth-grid', name: 'Synthwave Grid', icon: <Grid3X3 className="w-5 h-5 mr-2" /> },
    { id: 'liquid-mercury', name: 'Mercúrio Líquido', icon: <Flame className="w-5 h-5 mr-2" /> },
    { id: 'dna-helix', name: 'Hélice DNA', icon: <Dna className="w-5 h-5 mr-2" /> },
    { id: 'vortex-portal', name: 'Portal Vórtice', icon: <Wand2 className="w-5 h-5 mr-2" /> },
];

export const TRANSITION_MODELS: { id: TransitionType; name: string; icon: React.ReactNode }[] = [
    { id: 'fade', name: 'Esmaecer', icon: <Blend className="w-7 h-7" /> },
    { id: 'dissolve', name: 'Dissolver', icon: <Grid className="w-7 h-7" /> },
    { id: 'cross-zoom', name: 'Zoom Cruzado', icon: <Maximize className="w-7 h-7" /> },
    { id: 'spin-zoom', name: 'Girar & Zoom', icon: <RotateCw className="w-7 h-7" /> },
    { id: 'flash-white', name: 'Flash Branco', icon: <Zap className="w-7 h-7" /> },
    { id: 'color-flash', name: 'Flash Colorido', icon: <Palette className="w-7 h-7" /> },
    { id: 'glitch', name: 'Glitch Digital', icon: <Signal className="w-7 h-7" /> },
    { id: 'zoom-shake', name: 'Zoom Tremido', icon: <Focus className="w-7 h-7" /> },
    { id: 'swirl', name: 'Girar Espiral', icon: <Orbit className="w-7 h-7" /> },
    { id: 'vortex-spin', name: 'Vórtice Mágico', icon: <Atom className="w-7 h-7" /> },
    { id: 'liquid-flow', name: 'Fluxo Líquido', icon: <Waves className="w-7 h-7" /> },
    { id: 'light-sweep', name: 'Varredura de Luz', icon: <Wand2 className="w-7 h-7" /> },
    { id: 'flip-horizontal', name: 'Virar Horiz. 3D', icon: <Repeat className="w-7 h-7" /> },
    { id: 'curtain-split', name: 'Cortina Dupla', icon: <Columns className="w-7 h-7" /> },
    { id: 'heart-open', name: 'Máscara Coração', icon: <Heart className="w-7 h-7" /> },
    { id: 'star-open', name: 'Máscara Estrela', icon: <Star className="w-7 h-7" /> },
    { id: 'diamond-open', name: 'Máscara Losango', icon: <Sparkles className="w-7 h-7" /> },
    { id: 'venetian-blinds', name: 'Persiana', icon: <Rows className="w-7 h-7" /> },
    { id: 'bounce-in', name: 'Impacto Quicar', icon: <Activity className="w-7 h-7" /> },
    { id: 'slide-diagonal', name: 'Deslizar Diagonal', icon: <MoveDownRight className="w-7 h-7" /> },
    { id: 'wipe-angular', name: 'Wipe Angular', icon: <ArrowUpRight className="w-7 h-7" /> },
    { id: 'zoom-in', name: 'Zoom In', icon: <ZoomIn className="w-7 h-7" /> },
    { id: 'zoom-out', name: 'Zoom Out', icon: <ZoomOut className="w-7 h-7" /> },
    { id: 'slide-motion', name: 'Slide Motion', icon: <ChevronsRight className="w-7 h-7" /> },
    { id: 'wipe-right', name: 'Limpar Direita', icon: <ArrowRight className="w-7 h-7" /> },
    { id: 'wipe-left', name: 'Limpar Esquerda', icon: <ArrowLeft className="w-7 h-7" /> },
    { id: 'wipe-up', name: 'Limpar Cima', icon: <ArrowUp className="w-7 h-7" /> },
    { id: 'wipe-down', name: 'Limpar Baixo', icon: <ArrowDown className="w-7 h-7" /> },
    { id: 'slide-right', name: 'Deslizar Direita', icon: <ChevronsRight className="w-7 h-7" /> },
    { id: 'slide-left', name: 'Deslizar Esquerda', icon: <ChevronsLeft className="w-7 h-7" /> },
    { id: 'slide-up', name: 'Deslizar Cima', icon: <ChevronsUp className="w-7 h-7" /> },
    { id: 'slide-down', name: 'Deslizar Baixo', icon: <ChevronsDown className="w-7 h-7" /> },
    { id: 'circle-open', name: 'Círculo (Abrir)', icon: <Circle className="w-7 h-7" /> },
    { id: 'circle-close', name: 'Círculo (Fechar)', icon: <AppWindow className="w-7 h-7" /> },
];

export const VIDEO_EFFECTS: {
    id: VideoEffectType;
    name: string;
    icon: React.ReactNode;
    min: number;
    max: number;
    step: number;
    defaultValue: number;
    unit: string;
}[] = [
    { id: 'brightness', name: 'Brilho', icon: <Sun size={20}/>, min: 0, max: 200, step: 1, defaultValue: 125, unit: '%' },
    { id: 'contrast', name: 'Contraste', icon: <Contrast size={20}/>, min: 0, max: 200, step: 1, defaultValue: 125, unit: '%' },
    { id: 'saturate', name: 'Saturação', icon: <Droplets size={20}/>, min: 0, max: 200, step: 1, defaultValue: 150, unit: '%' },
    { id: 'grayscale', name: 'Preto & Branco', icon: <Palette size={20}/>, min: 0, max: 100, step: 1, defaultValue: 100, unit: '%' },
    { id: 'sepia', name: 'Sépia', icon: <Bot size={20}/>, min: 0, max: 100, step: 1, defaultValue: 100, unit: '%' },
    { id: 'invert', name: 'Inverter', icon: <Meh size={20}/>, min: 0, max: 100, step: 1, defaultValue: 100, unit: '%' },
    { id: 'blur', name: 'Desfoque', icon: <Aperture size={20}/>, min: 0, max: 20, step: 0.1, defaultValue: 5, unit: 'px' },
    { id: 'hue-rotate', name: 'Girar Matiz', icon: <VenetianMask size={20}/>, min: 0, max: 360, step: 1, defaultValue: 90, unit: 'deg' },
    { id: 'opacity', name: 'Opacidade', icon: <PanelBottomClose size={20}/>, min: 0, max: 100, step: 1, defaultValue: 100, unit: '%' },
    { id: 'vignette', name: 'Vinheta', icon: <Focus size={20}/>, min: 0, max: 100, step: 1, defaultValue: 40, unit: '%' },
    { id: 'letterbox', name: 'Barras de Cinema', icon: <RectangleHorizontal size={20}/>, min: 0, max: 25, step: 1, defaultValue: 10, unit: '%' },
];

export const hexToRgba = (hex: string, opacity: number): string => {
    if (!/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) return `rgba(0,0,0,${opacity})`;
    let c: any = hex.substring(1).split('');
    if (c.length === 3) { c = [c[0], c[0], c[1], c[1], c[2], c[2]]; }
    c = '0x' + c.join('');
    return `rgba(${[(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',')},${opacity})`;
};

const mapPresetToStyle = (preset: any): Partial<VideoClip> => {
    const style: Partial<VideoClip> = {};

    style.fontFamily = preset.fontFamily;
    style.fontWeight = preset.fontWeight;
    style.fontStyle = preset.fontStyle;
    
    const fontSizeMatch = preset.fontSize.match(/clamp\((\d+)px/);
    style.fontSize = fontSizeMatch ? parseInt(fontSizeMatch[1], 10) : 48;
    
    style.letterSpacing = preset.letterSpacing;
    style.textTransform = preset.textTransform;
    style.textDecoration = preset.textDecoration;

    if (preset.fill.type === 'solid') {
        style.color = preset.fill.color;
        style.fillGradient = undefined;
    } else if (preset.fill.type === 'linear-gradient') {
        style.color = preset.fill.stops[0].color; // Fallback color
        style.fillGradient = {
            type: 'linear-gradient',
            angle: preset.fill.angle,
            stops: preset.fill.stops,
        };
    }

    style.textStroke = preset.stroke.width > 0;
    style.textStrokeColor = preset.stroke.color;
    style.textStrokeWidth = preset.stroke.width;

    style.textShadow = preset.shadow.opacity > 0 || preset.shadow.blur > 0 || preset.shadow.x !== 0 || preset.shadow.y !== 0;
    style.textShadowOffsetX = preset.shadow.x;
    style.textShadowOffsetY = preset.shadow.y;
    style.textShadowBlur = preset.shadow.blur;
    style.textShadowColor = hexToRgba(preset.shadow.color, preset.shadow.opacity);

    if (preset.animation) {
        style.animationIn = preset.animation.in as TextInAnimation || 'none';
        style.animationInDuration = preset.animation.inDuration || 0.5;
        style.animationOut = preset.animation.out as TextOutAnimation || 'none';
        style.animationOutDuration = preset.animation.outDuration || 0.5;
        style.animationLoop = preset.animation.loop as TextLoopAnimation || 'none';
    } else {
        // Default to no animation if not specified, to not carry over from previous preset
        style.animationIn = 'none';
        style.animationOut = 'none';
        style.animationLoop = 'none';
    }

    return style;
};

const NEW_PRESETS_DATA = [
    // Cinematic & Elegant
    { "id": "creditos-cinema", "name": "Créditos de Cinema", "fontFamily": "Cinzel, serif", "fontWeight": 700, "fontStyle": "normal", "fontSize": "clamp(26px,4.5vw,68px)", "letterSpacing": 2.5, "textTransform": "uppercase", "textDecoration": "none", "fill": { "type": "solid", "color": "#F8FAFC" }, "stroke": { "color": "#000000", "width": 0 }, "shadow": { "x": 0, "y": 4, "blur": 14, "color": "#000000", "opacity": 0.8 }, "animation": { "loop": "credits-roll" } },
    { "id": "creditos-star-wars", "name": "Créditos Star Wars 3D", "fontFamily": "Impact, Bebas Neue, sans-serif", "fontWeight": 700, "fontStyle": "normal", "fontSize": "clamp(30px,5.2vw,78px)", "letterSpacing": 2, "textTransform": "uppercase", "textDecoration": "none", "fill": { "type": "solid", "color": "#FFE81F" }, "stroke": { "color": "#111111", "width": 1 }, "shadow": { "x": 0, "y": 0, "blur": 18, "color": "#E5B80B", "opacity": 0.85 }, "animation": { "loop": "credits-star-wars" } },
    { "id": "creditos-minimal", "name": "Créditos Minimalistas", "fontFamily": "Inter, system-ui, sans-serif", "fontWeight": 400, "fontStyle": "normal", "fontSize": "clamp(22px,3.8vw,56px)", "letterSpacing": 3.0, "textTransform": "uppercase", "textDecoration": "none", "fill": { "type": "solid", "color": "#E2E8F0" }, "stroke": { "color": "#000000", "width": 0 }, "shadow": { "x": 0, "y": 2, "blur": 8, "color": "#000000", "opacity": 0.5 }, "animation": { "loop": "credits-roll" } },
    { "id": "creditos-ouro-epico", "name": "Créditos Ouro Épico", "fontFamily": "Cinzel, serif", "fontWeight": 800, "fontStyle": "normal", "fontSize": "clamp(28px,4.8vw,74px)", "letterSpacing": 2.0, "textTransform": "uppercase", "textDecoration": "none", "fill": { "type": "linear-gradient", "angle": 45, "stops": [{ "color": "#FFE259", "pos": 0 }, { "color": "#FFA751", "pos": 1 }] }, "stroke": { "color": "#5A380A", "width": 1 }, "shadow": { "x": 0, "y": 6, "blur": 16, "color": "#000000", "opacity": 0.7 }, "animation": { "loop": "credits-roll" } },
    { "id": "creditos-retro-vhs", "name": "Créditos Retro 80s", "fontFamily": "Courier New, monospace", "fontWeight": 700, "fontStyle": "normal", "fontSize": "clamp(24px,4vw,62px)", "letterSpacing": 1.5, "textTransform": "uppercase", "textDecoration": "none", "fill": { "type": "solid", "color": "#67E8F9" }, "stroke": { "color": "#000000", "width": 0 }, "shadow": { "x": 0, "y": 0, "blur": 16, "color": "#A855F7", "opacity": 0.9 }, "animation": { "loop": "credits-roll" } },
    { "id": "legenda-teleprompter", "name": "Legenda Teleprompter", "fontFamily": "Montserrat, sans-serif", "fontWeight": 600, "fontStyle": "normal", "fontSize": "clamp(26px,4.4vw,66px)", "letterSpacing": 0.8, "textTransform": "none", "textDecoration": "none", "fill": { "type": "solid", "color": "#FFFFFF" }, "stroke": { "color": "#000000", "width": 1 }, "shadow": { "x": 0, "y": 4, "blur": 12, "color": "#000000", "opacity": 0.75 }, "animation": { "loop": "teleprompter-roll" } },
    { "id": "cinematic-title", "name": "Cinematic Title", "fontFamily": "Playfair Display, serif", "fontWeight": 700, "fontStyle": "normal", "fontSize": "clamp(28px,5vw,72px)", "letterSpacing": 0.5, "textTransform": "none", "textDecoration": "none", "fill": { "type": "solid", "color": "#EAEAEA" }, "stroke": { "color": "#000000", "width": 0 }, "shadow": { "x": 0, "y": 4, "blur": 16, "color": "#000000", "opacity": 0.6 }, "animation": { "in": "fade", "inDuration": 1.5, "out": "fade", "outDuration": 1.0 } },
    { "id": "magazine-serif", "name": "Magazine Serif", "fontFamily": "Merriweather, Georgia, serif", "fontWeight": 700, "fontStyle": "normal", "fontSize": "clamp(28px,4.8vw,72px)", "letterSpacing": 0.4, "textTransform": "none", "textDecoration": "none", "fill": { "type": "solid", "color": "#1A1A1A" }, "stroke": { "color": "#000000", "width": 0 }, "shadow": { "x": 0, "y": 2, "blur": 10, "color": "#000000", "opacity": 0.15 } },
    { "id": "elegant-outline", "name": "Elegant Outline", "fontFamily": "Cinzel, serif", "fontWeight": 600, "fontStyle": "normal", "fontSize": "clamp(30px,5.2vw,78px)", "letterSpacing": 1, "textTransform": "uppercase", "textDecoration": "none", "fill": { "type": "solid", "color": "transparent" }, "stroke": { "color": "#E0C58F", "width": 1.5 }, "shadow": { "x": 0, "y": 2, "blur": 8, "color": "#000000", "opacity": 0.2 }, "animation": { "in": "reveal-up", "inDuration": 1.0 } },
    
    // Modern & Bold
    { "id": "kinetic-punch", "name": "Kinetic Punch", "fontFamily": "Archivo Black, sans-serif", "fontWeight": 900, "fontStyle": "italic", "fontSize": "clamp(36px,6.4vw,100px)", "letterSpacing": -0.5, "textTransform": "uppercase", "textDecoration": "none", "fill": { "type": "solid", "color": "#FDE047" }, "stroke": { "color": "#000000", "width": 0 }, "shadow": { "x": 6, "y": 6, "blur": 0, "color": "#111111", "opacity": 1 }, "animation": { "in": "slide-in-left", "inDuration": 0.7, "out": "slide-out-right", "outDuration": 0.5 } },
    { "id": "duotone-pop", "name": "Duotone Pop", "fontFamily": "Poppins, sans-serif", "fontWeight": 800, "fontStyle": "normal", "fontSize": "clamp(32px,5.6vw,88px)", "letterSpacing": 0.2, "textTransform": "uppercase", "textDecoration": "none", "fill": { "type": "solid", "color": "#FFFFFF" }, "stroke": { "color": "#000000", "width": 0 }, "shadow": { "x": 5, "y": 5, "blur": 0, "color": "#F72585", "opacity": 1 }, "animation": { "in": "zoom-in", "inDuration": 0.6 } },
    { "id": "minimal-clean", "name": "Minimal Clean", "fontFamily": "Inter, system-ui, sans-serif", "fontWeight": 700, "fontStyle": "normal", "fontSize": "clamp(28px,5vw,72px)", "letterSpacing": 0, "textTransform": "none", "textDecoration": "none", "fill": { "type": "solid", "color": "#FFFFFF" }, "stroke": { "color": "#000000", "width": 0 }, "shadow": { "x": 0, "y": 2, "blur": 8, "color": "#000000", "opacity": 0.25 } },

    // Retro & Y2K
    { "id": "vaporwave-glitch", "name": "Vaporwave Glitch", "fontFamily": "Kanit, sans-serif", "fontWeight": 700, "fontStyle": "italic", "fontSize": "clamp(30px,5.2vw,80px)", "letterSpacing": 1, "textTransform": "uppercase", "textDecoration": "none", "fill": { "type": "solid", "color": "#FF71CE" }, "stroke": { "color": "#01CDFE", "width": 2 }, "shadow": { "x": -4, "y": 4, "blur": 0, "color": "#B967FF", "opacity": 1 }, "animation": { "in": "fade", "inDuration": 0.5, "loop": "pulse" } },
    { "id": "retro-arcade", "name": "Retro Arcade", "fontFamily": "Press Start 2P, monospace", "fontWeight": 400, "fontStyle": "normal", "fontSize": "clamp(18px,3vw,36px)", "letterSpacing": 2, "textTransform": "uppercase", "textDecoration": "none", "fill": { "type": "solid", "color": "#FFD300" }, "stroke": { "color": "#000000", "width": 2 }, "shadow": { "x": 4, "y": 4, "blur": 0, "color": "#D00000", "opacity": 1 }, "animation": { "in": "slide-in-up", "inDuration": 0.8, "loop": "bounce" } },
    { "id": "holo-sheen", "name": "Holographic Sheen", "fontFamily": "Raleway, sans-serif", "fontWeight": 800, "fontStyle": "normal", "fontSize": "clamp(32px,5.6vw,84px)", "letterSpacing": 0.6, "textTransform": "uppercase", "textDecoration": "none", "fill": { "type": "linear-gradient", "angle": 90, "stops": [{ "color": "#FDEB71", "pos": 0 }, { "color": "#F8D800", "pos": 0.25 }, { "color": "#ABDCFF", "pos": 0.5 }, { "color": "#0396FF", "pos": 0.75 }, { "color": "#3EECAC", "pos": 1 }] }, "stroke": { "color": "#111111", "width": 0 }, "shadow": { "x": 0, "y": 8, "blur": 20, "color": "#0396FF", "opacity": 0.35 } },

    // Futuristic & Tech
    { "id": "cyberpunk-core", "name": "Cyberpunk Core", "fontFamily": "Oswald, sans-serif", "fontWeight": 700, "fontStyle": "normal", "fontSize": "clamp(34px,6.2vw,98px)", "letterSpacing": 1.6, "textTransform": "uppercase", "textDecoration": "none", "fill": { "type": "solid", "color": "#F8F8F8" }, "stroke": { "color": "#F72585", "width": 1 }, "shadow": { "x": 0, "y": 0, "blur": 16, "color": "#00E5FF", "opacity": 0.9 }, "animation": { "in": "blur-in", "inDuration": 1.2 } },
    { "id": "liquid-chrome", "name": "Liquid Chrome", "fontFamily": "Oswald, sans-serif", "fontWeight": 700, "fontStyle": "normal", "fontSize": "clamp(32px,5.4vw,90px)", "letterSpacing": 0.8, "textTransform": "uppercase", "textDecoration": "none", "fill": { "type": "linear-gradient", "angle": 120, "stops": [{ "color": "#FFFFFF", "pos": 0 }, { "color": "#D4D4D8", "pos": 0.4 }, { "color": "#A1A1AA", "pos": 0.6 }, { "color": "#E5E7EB", "pos": 1 }] }, "stroke": { "color": "#1F2937", "width": 1 }, "shadow": { "x": 0, "y": 6, "blur": 14, "color": "#A1A1AA", "opacity": 0.5 } },
    { "id": "tech-mono", "name": "Tech Mono", "fontFamily": "JetBrains Mono, monospace", "fontWeight": 700, "fontStyle": "normal", "fontSize": "clamp(22px,3.8vw,54px)", "letterSpacing": 1.2, "textTransform": "uppercase", "textDecoration": "none", "fill": { "type": "solid", "color": "#E0FBFC" }, "stroke": { "color": "#293241", "width": 0 }, "shadow": { "x": 0, "y": 0, "blur": 14, "color": "#98C1D9", "opacity": 0.6 }, "animation": { "in": "typewriter", "inDuration": 1.5 } },

    // Creative & Artistic
    { "id": "aurora-glow", "name": "Aurora Glow", "fontFamily": "Quicksand, sans-serif", "fontWeight": 600, "fontStyle": "normal", "fontSize": "clamp(30px,5.2vw,80px)", "letterSpacing": 0.5, "textTransform": "none", "textDecoration": "none", "fill": { "type": "solid", "color": "#FFFFFF" }, "stroke": { "color": "#000000", "width": 0 }, "shadow": { "x": 0, "y": 0, "blur": 24, "color": "#4FD1C5", "opacity": 0.8 }, "animation": { "loop": "glow" } },
    { "id": "claymorphic", "name": "Claymorphic 3D", "fontFamily": "Nunito, sans-serif", "fontWeight": 900, "fontStyle": "normal", "fontSize": "clamp(32px,5.8vw,92px)", "letterSpacing": 0, "textTransform": "none", "textDecoration": "none", "fill": { "type": "solid", "color": "#E2E8F0" }, "stroke": { "color": "#000000", "width": 0 }, "shadow": { "x": 5, "y": 5, "blur": 10, "color": "#000000", "opacity": 0.15 } },
    { "id": "gold-foil", "name": "Gold Foil", "fontFamily": "Cinzel, serif", "fontWeight": 800, "fontStyle": "normal", "fontSize": "clamp(28px,4.6vw,76px)", "letterSpacing": 0.4, "textTransform": "uppercase", "textDecoration": "none", "fill": { "type": "linear-gradient", "angle": 20, "stops": [{ "color": "#B88746", "pos": 0 }, { "color": "#F9D976", "pos": 0.5 }, { "color": "#A27E3E", "pos": 1 }] }, "stroke": { "color": "#3D2B1F", "width": 1 }, "shadow": { "x": 0, "y": 6, "blur": 14, "color": "#000000", "opacity": 0.3 } },

    // --- NEW PRESETS ---
    // Neon & Glow
    { "id": "neon-sign-blue", "name": "Neon Sign Blue", "fontFamily": "Bebas Neue, sans-serif", "fontWeight": 400, "fontStyle": "normal", "fontSize": "clamp(34px,6vw,96px)", "letterSpacing": 2, "textTransform": "uppercase", "textDecoration": "none", "fill": { "type": "solid", "color": "#E0FBFC" }, "stroke": { "color": "#000000", "width": 0 }, "shadow": { "x": 0, "y": 0, "blur": 24, "color": "#22D3EE", "opacity": 1 }, "animation": { "loop": "glow" } },
    { "id": "fire-ember", "name": "Fire Ember", "fontFamily": "Montserrat, sans-serif", "fontWeight": 800, "fontStyle": "normal", "fontSize": "clamp(30px,5.2vw,80px)", "letterSpacing": 0.5, "textTransform": "uppercase", "textDecoration": "none", "fill": { "type": "solid", "color": "#FFD700" }, "stroke": { "color": "#000000", "width": 0 }, "shadow": { "x": 0, "y": 0, "blur": 20, "color": "#FF4500", "opacity": 0.9 }, "animation": { "loop": "pulse" } },

    // Retro & Grunge
    { "id": "vintage-stamp", "name": "Vintage Stamp", "fontFamily": "Courier New, monospace", "fontWeight": 600, "fontStyle": "normal", "fontSize": "clamp(24px,4vw,60px)", "letterSpacing": 1, "textTransform": "uppercase", "textDecoration": "none", "fill": { "type": "solid", "color": "#212121" }, "stroke": { "color": "#000000", "width": 0 }, "shadow": { "x": 1, "y": 1, "blur": 1, "color": "#000000", "opacity": 0.3 } },
    { "id": "typewriter-ink", "name": "Typewriter Ink", "fontFamily": "American Typewriter, serif", "fontWeight": 400, "fontStyle": "normal", "fontSize": "clamp(26px,4.5vw,68px)", "letterSpacing": 0.2, "textTransform": "none", "textDecoration": "none", "fill": { "type": "solid", "color": "#333333" }, "stroke": { "color": "#000000", "width": 0 }, "shadow": { "x": 0, "y": 1, "blur": 2, "color": "#000000", "opacity": 0.1 } },

    // Gradients
    { "id": "sunset-gradient", "name": "Sunset Gradient", "fontFamily": "Lato, sans-serif", "fontWeight": 700, "fontStyle": "normal", "fontSize": "clamp(32px,5.5vw,86px)", "letterSpacing": 0.3, "textTransform": "none", "textDecoration": "none", "fill": { "type": "linear-gradient", "angle": 45, "stops": [{ "color": "#F97794", "pos": 0 }, { "color": "#F9B44A", "pos": 1 }] }, "stroke": { "color": "#000000", "width": 0 }, "shadow": { "x": 0, "y": 4, "blur": 10, "color": "#000000", "opacity": 0.2 } },
    { "id": "ocean-deep", "name": "Ocean Deep", "fontFamily": "Raleway, sans-serif", "fontWeight": 800, "fontStyle": "normal", "fontSize": "clamp(30px,5.2vw,80px)", "letterSpacing": 0.8, "textTransform": "uppercase", "textDecoration": "none", "fill": { "type": "linear-gradient", "angle": 135, "stops": [{ "color": "#2AF598", "pos": 0 }, { "color": "#009EFD", "pos": 1 }] }, "stroke": { "color": "#000000", "width": 0 }, "shadow": { "x": 0, "y": 5, "blur": 15, "color": "#000000", "opacity": 0.25 } },

    // Handwritten & Fun
    { "id": "handwritten-note", "name": "Handwritten Note", "fontFamily": "Caveat, cursive", "fontWeight": 700, "fontStyle": "normal", "fontSize": "clamp(36px,6vw,94px)", "letterSpacing": 0, "textTransform": "none", "textDecoration": "none", "fill": { "type": "solid", "color": "#1E3A8A" }, "stroke": { "color": "#000000", "width": 0 }, "shadow": { "x": 0, "y": 1, "blur": 2, "color": "#000000", "opacity": 0.1 } },
    { "id": "comic-book-boom", "name": "Comic Book Boom", "fontFamily": "Anton, sans-serif", "fontWeight": 400, "fontStyle": "normal", "fontSize": "clamp(38px,6.8vw,110px)", "letterSpacing": 1, "textTransform": "uppercase", "textDecoration": "none", "fill": { "type": "solid", "color": "#FFD300" }, "stroke": { "color": "#D00000", "width": 4 }, "shadow": { "x": 6, "y": 6, "blur": 0, "color": "#000000", "opacity": 1 }, "animation": { "in": "zoom-in", "inDuration": 0.6 } },

    // 3D & Cutout
    { "id": "hard-drop-shadow", "name": "Hard Drop Shadow", "fontFamily": "Poppins, sans-serif", "fontWeight": 900, "fontStyle": "normal", "fontSize": "clamp(34px,6.2vw,98px)", "letterSpacing": 0, "textTransform": "uppercase", "textDecoration": "none", "fill": { "type": "solid", "color": "#FFFFFF" }, "stroke": { "color": "#000000", "width": 0 }, "shadow": { "x": -8, "y": 8, "blur": 0, "color": "#111111", "opacity": 1 } },
    { "id": "cutout-paper", "name": "Cutout Paper", "fontFamily": "Nunito, sans-serif", "fontWeight": 800, "fontStyle": "normal", "fontSize": "clamp(32px,5.8vw,92px)", "letterSpacing": 0, "textTransform": "none", "textDecoration": "none", "fill": { "type": "solid", "color": "#F1F5F9" }, "stroke": { "color": "#000000", "width": 0 }, "shadow": { "x": 2, "y": 2, "blur": 4, "color": "#000000", "opacity": 0.1 } },

    // Elegance & Luxury
    { "id": "subtle-letterpress", "name": "Subtle Letterpress", "fontFamily": "Georgia Pro, serif", "fontWeight": 400, "fontStyle": "normal", "fontSize": "clamp(28px,4.8vw,74px)", "letterSpacing": 0.1, "textTransform": "none", "textDecoration": "none", "fill": { "type": "solid", "color": "#4A5568" }, "stroke": { "color": "#000000", "width": 0 }, "shadow": { "x": 0, "y": 1, "blur": 1, "color": "#FFFFFF", "opacity": 0.3 } },
    { "id": "rose-gold", "name": "Rose Gold", "fontFamily": "Playfair Display, serif", "fontWeight": 700, "fontStyle": "normal", "fontSize": "clamp(30px,5vw,78px)", "letterSpacing": 0.5, "textTransform": "none", "textDecoration": "none", "fill": { "type": "linear-gradient", "angle": 60, "stops": [{ "color": "#B76E79", "pos": 0 }, { "color": "#F7D1B8", "pos": 0.5 }, { "color": "#C88A92", "pos": 1 }] }, "stroke": { "color": "#4A2C2E", "width": 0.5 }, "shadow": { "x": 0, "y": 4, "blur": 10, "color": "#000000", "opacity": 0.15 } },

    // More styles
    { "id": "glacial-ice", "name": "Glacial Ice", "fontFamily": "Oswald, sans-serif", "fontWeight": 600, "fontStyle": "normal", "fontSize": "clamp(34px,6.2vw,98px)", "letterSpacing": 1.2, "textTransform": "uppercase", "textDecoration": "none", "fill": { "type": "linear-gradient", "angle": 0, "stops": [{ "color": "#E0FFFF", "pos": 0 }, { "color": "#B0E0E6", "pos": 1 }] }, "stroke": { "color": "#FFFFFF", "width": 2 }, "shadow": { "x": 0, "y": 0, "blur": 15, "color": "#00BFFF", "opacity": 0.6 }, "animation": { "loop": "pulse" } },
    { "id": "jungle-adventure", "name": "Jungle Adventure", "fontFamily": "Bebas Neue, sans-serif", "fontWeight": 400, "fontStyle": "normal", "fontSize": "clamp(36px,6.4vw,100px)", "letterSpacing": 1, "textTransform": "uppercase", "textDecoration": "none", "fill": { "type": "solid", "color": "#228B22" }, "stroke": { "color": "#000000", "width": 0 }, "shadow": { "x": 4, "y": 4, "blur": 0, "color": "#556B2F", "opacity": 1 } },
    { "id": "cosmic-dust", "name": "Cosmic Dust", "fontFamily": "Sora, sans-serif", "fontWeight": 600, "fontStyle": "normal", "fontSize": "clamp(30px,5.2vw,82px)", "letterSpacing": 0.5, "textTransform": "none", "textDecoration": "none", "fill": { "type": "solid", "color": "#D8BFD8" }, "stroke": { "color": "#000000", "width": 0 }, "shadow": { "x": 0, "y": 0, "blur": 20, "color": "#8A2BE2", "opacity": 0.7 }, "animation": { "loop": "pulse" } },
    { "id": "inverted-light", "name": "Inverted Light", "fontFamily": "Inter, sans-serif", "fontWeight": 900, "fontStyle": "normal", "fontSize": "clamp(32px,5.6vw,88px)", "letterSpacing": -0.5, "textTransform": "uppercase", "textDecoration": "none", "fill": { "type": "solid", "color": "#000000" }, "stroke": { "color": "#FFFFFF", "width": 2 }, "shadow": { "x": 0, "y": 0, "blur": 0, "color": "#000000", "opacity": 0 } },
    { "id": "candy-stripe", "name": "Candy Stripe", "fontFamily": "Quicksand, sans-serif", "fontWeight": 700, "fontStyle": "normal", "fontSize": "clamp(32px,5.5vw,86px)", "letterSpacing": 0.2, "textTransform": "none", "textDecoration": "none", "fill": { "type": "linear-gradient", "angle": 120, "stops": [{ "color": "#FFC0CB", "pos": 0 }, { "color": "#FFFFFF", "pos": 0.5 }, { "color": "#FFC0CB", "pos": 1 }] }, "stroke": { "color": "#DB7093", "width": 2 }, "shadow": { "x": 0, "y": 3, "blur": 6, "color": "#000000", "opacity": 0.1 } },
    { "id": "chalkboard", "name": "Chalkboard", "fontFamily": "Permanent Marker, cursive", "fontWeight": 400, "fontStyle": "normal", "fontSize": "clamp(34px,6vw,94px)", "letterSpacing": 1, "textTransform": "none", "textDecoration": "none", "fill": { "type": "solid", "color": "#FAFAFA" }, "stroke": { "color": "#000000", "width": 0 }, "shadow": { "x": 1, "y": 1, "blur": 0.5, "color": "#FFFFFF", "opacity": 0.2 } },
    { "id": "heavy-metal", "name": "Heavy Metal", "fontFamily": "Archivo Black, sans-serif", "fontWeight": 400, "fontStyle": "normal", "fontSize": "clamp(36px,6.4vw,100px)", "letterSpacing": 0.5, "textTransform": "uppercase", "textDecoration": "none", "fill": { "type": "linear-gradient", "angle": 90, "stops": [{ "color": "#CCCCCC", "pos": 0 }, { "color": "#777777", "pos": 1 }] }, "stroke": { "color": "#000000", "width": 1 }, "shadow": { "x": 3, "y": 3, "blur": 5, "color": "#000000", "opacity": 0.5 } },
    { "id": "pastel-dream", "name": "Pastel Dream", "fontFamily": "Josefin Sans, sans-serif", "fontWeight": 600, "fontStyle": "normal", "fontSize": "clamp(30px,5.2vw,82px)", "letterSpacing": 0.6, "textTransform": "none", "textDecoration": "none", "fill": { "type": "linear-gradient", "angle": 25, "stops": [{ "color": "#A7F3D0", "pos": 0 }, { "color": "#F3E8FF", "pos": 1 }] }, "stroke": { "color": "#FFFFFF", "width": 0 }, "shadow": { "x": 0, "y": 2, "blur": 10, "color": "#000000", "opacity": 0.1 } }
];

export const PRESET_TEXT_STYLES: { name: string; id: string; style: Partial<VideoClip>; raw: typeof NEW_PRESETS_DATA[0] }[] = NEW_PRESETS_DATA.map(preset => ({
    id: preset.id,
    name: preset.name,
    style: mapPresetToStyle(preset),
    raw: preset,
}));

export const CAPTION_PRESET_STYLES: { name: string; id: string; badge?: string; style: Partial<VideoClip>; raw: any }[] = [
  {
    id: 'tiktok-viral-yellow',
    name: 'TikTok Viral Amarelo',
    badge: 'Popular',
    style: {
      fontFamily: 'Montserrat, sans-serif',
      fontWeight: 900,
      fontStyle: 'normal',
      color: '#FFE600',
      textStroke: true,
      textStrokeColor: '#000000',
      textStrokeWidth: 4,
      textShadow: true,
      textShadowColor: 'rgba(0,0,0,0.9)',
      textShadowBlur: 8,
      textShadowOffsetX: 0,
      textShadowOffsetY: 3,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      textAlign: 'center',
      animationIn: 'none',
      animationLoop: 'none',
      animationOut: 'none',
    },
    raw: {
      id: 'tiktok-viral-yellow',
      name: 'TikTok Viral Amarelo',
      fontFamily: 'Montserrat, sans-serif',
      fontWeight: 900,
      fontStyle: 'normal',
      fontSize: 'clamp(36px,5.5vw,72px)',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      textDecoration: 'none',
      fill: { type: 'solid', color: '#FFE600' },
      stroke: { color: '#000000', width: 4 },
      shadow: { x: 0, y: 3, blur: 8, color: '#000000', opacity: 0.9 },
      animation: { loop: 'none' }
    }
  },
  {
    id: 'clean-white-stroke',
    name: 'Moderno Branco & Borda',
    badge: 'Universal',
    style: {
      fontFamily: 'Inter, Montserrat, sans-serif',
      fontWeight: 800,
      fontStyle: 'normal',
      color: '#FFFFFF',
      textStroke: true,
      textStrokeColor: '#000000',
      textStrokeWidth: 3.5,
      textShadow: true,
      textShadowColor: 'rgba(0,0,0,0.85)',
      textShadowBlur: 6,
      textShadowOffsetX: 0,
      textShadowOffsetY: 2,
      textTransform: 'none',
      letterSpacing: 0,
      textAlign: 'center',
      animationIn: 'none',
      animationLoop: 'none',
      animationOut: 'none',
    },
    raw: {
      id: 'clean-white-stroke',
      name: 'Moderno Branco & Borda',
      fontFamily: 'Inter, Montserrat, sans-serif',
      fontWeight: 800,
      fontStyle: 'normal',
      fontSize: 'clamp(34px,5.2vw,68px)',
      letterSpacing: 0,
      textTransform: 'none',
      textDecoration: 'none',
      fill: { type: 'solid', color: '#FFFFFF' },
      stroke: { color: '#000000', width: 3.5 },
      shadow: { x: 0, y: 2, blur: 6, color: '#000000', opacity: 0.85 },
      animation: { loop: 'none' }
    }
  },
  {
    id: 'cinema-netflix',
    name: 'Cinema / Streaming',
    badge: 'Elegante',
    style: {
      fontFamily: 'Roboto, "Helvetica Neue", sans-serif',
      fontWeight: 700,
      fontStyle: 'normal',
      color: '#F8FAFC',
      textStroke: false,
      textStrokeColor: '#000000',
      textStrokeWidth: 0,
      textShadow: true,
      textShadowColor: 'rgba(0,0,0,0.95)',
      textShadowBlur: 10,
      textShadowOffsetX: 0,
      textShadowOffsetY: 3,
      textTransform: 'none',
      letterSpacing: 0.2,
      textAlign: 'center',
      animationIn: 'none',
      animationLoop: 'none',
      animationOut: 'none',
    },
    raw: {
      id: 'cinema-netflix',
      name: 'Cinema / Streaming',
      fontFamily: 'Roboto, "Helvetica Neue", sans-serif',
      fontWeight: 700,
      fontStyle: 'normal',
      fontSize: 'clamp(30px,4.6vw,60px)',
      letterSpacing: 0.2,
      textTransform: 'none',
      textDecoration: 'none',
      fill: { type: 'solid', color: '#F8FAFC' },
      stroke: { color: '#000000', width: 0 },
      shadow: { x: 0, y: 3, blur: 10, color: '#000000', opacity: 0.95 },
      animation: { loop: 'none' }
    }
  },
  {
    id: 'cyber-cyan',
    name: 'Cyber Neon Azul',
    badge: 'Gamer',
    style: {
      fontFamily: 'Kanit, Oswald, sans-serif',
      fontWeight: 800,
      fontStyle: 'normal',
      color: '#00F5FF',
      textStroke: true,
      textStrokeColor: '#000000',
      textStrokeWidth: 3,
      textShadow: true,
      textShadowColor: '#00B4D8',
      textShadowBlur: 14,
      textShadowOffsetX: 0,
      textShadowOffsetY: 0,
      textTransform: 'uppercase',
      letterSpacing: 1,
      textAlign: 'center',
      animationIn: 'none',
      animationLoop: 'none',
      animationOut: 'none',
    },
    raw: {
      id: 'cyber-cyan',
      name: 'Cyber Neon Azul',
      fontFamily: 'Kanit, Oswald, sans-serif',
      fontWeight: 800,
      fontStyle: 'normal',
      fontSize: 'clamp(34px,5.4vw,70px)',
      letterSpacing: 1,
      textTransform: 'uppercase',
      textDecoration: 'none',
      fill: { type: 'solid', color: '#00F5FF' },
      stroke: { color: '#000000', width: 3 },
      shadow: { x: 0, y: 0, blur: 14, color: '#00B4D8', opacity: 1 },
      animation: { loop: 'none' }
    }
  },
  {
    id: 'viral-green',
    name: 'Verde Destaque Viral',
    badge: 'Destaque',
    style: {
      fontFamily: 'Montserrat, sans-serif',
      fontWeight: 900,
      fontStyle: 'normal',
      color: '#39FF14',
      textStroke: true,
      textStrokeColor: '#000000',
      textStrokeWidth: 4,
      textShadow: true,
      textShadowColor: 'rgba(0,0,0,0.9)',
      textShadowBlur: 8,
      textShadowOffsetX: 0,
      textShadowOffsetY: 3,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      textAlign: 'center',
      animationIn: 'none',
      animationLoop: 'none',
      animationOut: 'none',
    },
    raw: {
      id: 'viral-green',
      name: 'Verde Destaque Viral',
      fontFamily: 'Montserrat, sans-serif',
      fontWeight: 900,
      fontStyle: 'normal',
      fontSize: 'clamp(36px,5.5vw,72px)',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      textDecoration: 'none',
      fill: { type: 'solid', color: '#39FF14' },
      stroke: { color: '#000000', width: 4 },
      shadow: { x: 0, y: 3, blur: 8, color: '#000000', opacity: 0.9 },
      animation: { loop: 'none' }
    }
  },
  {
    id: 'sunset-gradient',
    name: 'Gradiente Fogo & Ouro',
    badge: 'Gradiente',
    style: {
      fontFamily: 'Montserrat, sans-serif',
      fontWeight: 900,
      fontStyle: 'normal',
      color: '#FF6B00',
      fillGradient: {
        type: 'linear-gradient',
        angle: 90,
        stops: [{ color: '#FFE600', pos: 0 }, { color: '#FF3D00', pos: 1 }]
      },
      textStroke: true,
      textStrokeColor: '#000000',
      textStrokeWidth: 3.5,
      textShadow: true,
      textShadowColor: 'rgba(0,0,0,0.85)',
      textShadowBlur: 8,
      textShadowOffsetX: 0,
      textShadowOffsetY: 3,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      textAlign: 'center',
      animationIn: 'none',
      animationLoop: 'none',
      animationOut: 'none',
    },
    raw: {
      id: 'sunset-gradient',
      name: 'Gradiente Fogo & Ouro',
      fontFamily: 'Montserrat, sans-serif',
      fontWeight: 900,
      fontStyle: 'normal',
      fontSize: 'clamp(34px,5.2vw,70px)',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      textDecoration: 'none',
      fill: {
        type: 'linear-gradient',
        angle: 90,
        stops: [{ color: '#FFE600', pos: 0 }, { color: '#FF3D00', pos: 1 }]
      },
      stroke: { color: '#000000', width: 3.5 },
      shadow: { x: 0, y: 3, blur: 8, color: '#000000', opacity: 0.85 },
      animation: { loop: 'none' }
    }
  },
  {
    id: 'gold-luxury',
    name: 'Ouro Épico',
    badge: 'Luxo',
    style: {
      fontFamily: 'Cinzel, serif',
      fontWeight: 800,
      fontStyle: 'normal',
      color: '#FFD700',
      fillGradient: {
        type: 'linear-gradient',
        angle: 45,
        stops: [{ color: '#FFE259', pos: 0 }, { color: '#FFA751', pos: 1 }]
      },
      textStroke: true,
      textStrokeColor: '#4A2800',
      textStrokeWidth: 1.5,
      textShadow: true,
      textShadowColor: 'rgba(0,0,0,0.85)',
      textShadowBlur: 10,
      textShadowOffsetX: 0,
      textShadowOffsetY: 3,
      textTransform: 'none',
      letterSpacing: 0.8,
      textAlign: 'center',
      animationIn: 'none',
      animationLoop: 'none',
      animationOut: 'none',
    },
    raw: {
      id: 'gold-luxury',
      name: 'Ouro Épico',
      fontFamily: 'Cinzel, serif',
      fontWeight: 800,
      fontStyle: 'normal',
      fontSize: 'clamp(32px,5vw,66px)',
      letterSpacing: 0.8,
      textTransform: 'none',
      textDecoration: 'none',
      fill: {
        type: 'linear-gradient',
        angle: 45,
        stops: [{ color: '#FFE259', pos: 0 }, { color: '#FFA751', pos: 1 }]
      },
      stroke: { color: '#4A2800', width: 1.5 },
      shadow: { x: 0, y: 3, blur: 10, color: '#000000', opacity: 0.85 },
      animation: { loop: 'none' }
    }
  }
];