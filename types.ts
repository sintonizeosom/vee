
export type ProjectFormat = 'youtube' | 'instagram' | 'tiktok';
export type PreviewQuality = 'auto' | '1080' | '720' | '480';

export type SpectrumStyle = 
  'aurora' | 'galaxy' | 'ripple' | 'nebula' | 'supernova' | 
  'equalizer' | 'firefly' | 'spikes' | 'cosmic-ripples' | 
  'trinity-pulse' | 'radiant-pulse' | 'circular-equalizer' | 'neon-ring' | 'arc-reactor' | 'chroma-wheel' |
  'cyber-synth-grid' | 'liquid-mercury' | 'dna-helix' | 'vortex-portal' |
  'quantum-wave' | 'cyber-matrix' | 'prism-beam' | 'hyper-cube' | 'sonic-pulse-radar' | 'hologram-waveform' | 'neon-equalizer-bars';

export type OverlayEffect = 'none' | 'snow' | 'bokeh' | 'digital-rain' | 'fire-particles' | 
  'particles_light' | 'water_waves' | 'smoke' | 'lens_flare' | 'falling_leaves' | 'lightning' | 
  'light-leaks' | 'film-grain' | 'dust-particles' | 'rain-on-glass' | 'glitch' | 'vhs' | 
  'crt' | 'neon-lights' | 'flames' |
  // New space effects (2025)
  'starfield-motion' | 'nebula-glow' | 'cosmic-dust' | 'galaxy-swirl' | 'aurora-wave' | 'deep-space-blur' | 'comet-trails' |
  // Audio-reactive effects
  'beat-flash' | 'beat-brightness' | 'beat-zoom' | 'beat-shake' |
  'beat-color-pop' | 'beat-particle-burst' | 'motion-scale-pulse' |
  'beat-stretch' | 'beat-flash-dual' | 'beat-border-glow';

export type LogoShape = 'original' | 'circular' | 'sphere';

export type TextInAnimation = 'none' | 'fade' | 'typewriter' | 'slide-in-left' | 'slide-in-right' | 'slide-in-up' | 'slide-in-down' | 'zoom-in' | 'reveal-up' | 'blur-in' | 'slide-in-up-by-char' | 'fade-in-by-word' | 'slide-in-up-by-word' | 'pop-in-by-word' | 'skew-in' | 'elastic-in' | 'tracking-expand' | 'rotate-in' | 'flicker-in' | 'bounce-in-by-word' | 'rotate-in-by-word' | 'color-glow-by-word' | 'flicker-by-word' | 'swing-in' | 'spin-bounce-in' | 'perspective-flip-in' | 'drop-impact-in' | 'glitch-reveal-in' | 'curtain-expand-in' | 'neon-flicker-in' | 'smoke-dissolve-in' | 'cyber-decode-in' | 'word-slide-down-by-word' | 'word-3d-flip-by-word' | 'zoom-rotate-by-char' | 'wave-enter-by-char';
export type TextOutAnimation = 'none' | 'fade' | 'slide-out-left' | 'slide-out-right' | 'slide-out-up' | 'slide-out-down' | 'zoom-out' | 'blur-out' | 'spin-out' | 'bounce-out' | 'shrink-out' | 'flicker-out' | 'fade-zoom-out' | 'blur-drop-out' | 'perspective-flip-out' | 'implode-out' | 'slide-out-diagonal' | 'glitch-out';
export type TextLoopAnimation = 'none' | 'pulse' | 'bounce' | 'scroll-up' | 'scroll-down' | 'glow' | 'jitter' | 'float' | 'wave' | 'rainbow' | 'glitch-loop' | 'pulse-glow' | 'float-rotate-3d' | 'typewriter-cursor-loop' | 'heartbeat' | 'wobble' | 'shimmer-wave' | 'breath' | 'credits-roll' | 'credits-star-wars' | 'teleprompter-roll' | 'credits-slow';

// Represents a media file in the media pool
export interface MediaPoolClip {
  id: string;
  src: string;
  fileName:string;
  duration: number;
  type: 'video' | 'audio' | 'image';
  width?: number;
  height?: number;
  waveform?: number[];
  progress?: number;
  error?: string;
  filePath?: string; // Path in zip archive for saving/loading
}

export type ShapeType = 'rectangle' | 'circle' | 'ellipse' | 'triangle' | 'star';

export type VideoClipType = 'video' | 'audio' | 'image' | 'text' | 'spectrum' | 'shape' | 'emoji';

export type TransitionType = 
  | 'fade' | 'wipe-right' | 'wipe-left' | 'wipe-up' | 'wipe-down' 
  | 'slide-right' | 'slide-left' | 'slide-up' | 'slide-down' 
  | 'circle-open' | 'circle-close' | 'dissolve' | 'wipe-angular' | 'zoom-in' | 'zoom-out'
  | 'flash-white' | 'slide-motion' | 'zoom-shake' | 'swirl' | 'glitch' | 'liquid-flow' | 'light-sweep'
  | 'spin-zoom' | 'flip-horizontal' | 'flip-vertical' | 'curtain-split' | 'cross-zoom'
  | 'heart-open' | 'star-open' | 'diamond-open' | 'color-flash' | 'bounce-in'
  | 'venetian-blinds' | 'pixelate' | 'slide-diagonal' | 'vortex-spin';

export interface TimelineTransition {
  id: string;
  type: TransitionType;
  duration: number; // in seconds
  clipAId: string; // ID of the clip the transition comes FROM
  clipBId: string; // ID of the clip the transition goes TO
}

export type VideoEffectType = 'brightness' | 'contrast' | 'saturate' | 'grayscale' | 'sepia' | 'invert' | 'blur' | 'hue-rotate' | 'opacity' | 'vignette' | 'letterbox';

export interface GradientStop {
  color: string;
  pos: number;
}

export interface LinearGradient {
  type: 'linear-gradient';
  angle: number;
  stops: GradientStop[];
}

// Represents an instance of a clip on the timeline (video, audio, image, or text)
export interface VideoClip {
  id: string; // Unique instance ID
  trackId: string; // ID of the track this clip belongs to
  type: VideoClipType;
  timelineStart: number; // Start time on the main timeline (in seconds)
  
  // Media properties (video, audio, image)
  poolId?: string; // ID of the clip in the media pool
  src?: string;
  fileName?: string;
  duration?: number; // Original full duration of the source video
  startTime: number; // Trim start time, relative to source video (in seconds)
  endTime: number; // Trim end time, relative to source video (in seconds)
  fadeInDuration?: number; // Duration of fade in in seconds
  fadeOutDuration?: number; // Duration of fade out in seconds
  speed?: number; // Playback speed, 1.0 is normal
  isReversed?: boolean; // For reversing audio clips
  pulsesWithMusic?: boolean;
  pulseStrength?: number;

  // Element properties (for text clips, and potentially other graphic types in future)
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;

  // Text-specific properties
  content?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  fontStyle?: 'normal' | 'italic' | 'oblique';
  textAlign?: 'left' | 'center' | 'right';
  letterSpacing?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  textDecoration?: 'none' | 'underline' | 'line-through';
  color?: string;
  fillGradient?: LinearGradient;
  textShadow?: boolean;
  textShadowColor?: string;
  textShadowBlur?: number;
  textShadowOffsetX?: number;
  textShadowOffsetY?: number;
  textStroke?: boolean;
  textStrokeColor?: string;
  textStrokeWidth?: number;
  // Text animation properties
  animationIn?: TextInAnimation;
  animationInDuration?: number; // in seconds
  animationOut?: TextOutAnimation;
  animationOutDuration?: number; // in seconds
  animationLoop?: TextLoopAnimation;

  // Spectrum-specific properties
  spectrumStyle?: SpectrumStyle;
  spectrumColor?: string;
  spectrumColor2?: string;
  spectrumColor3?: string;
  audioSource?: string; // e.g., 'master' or a clip ID
  logoSrc?: string;
  logoSize?: number;
  logoShape?: LogoShape;
  logoPulses?: boolean;
  logoFilePath?: string; // Path in zip archive for saving/loading logos

  // Video/Image effects
  effects?: Partial<Record<VideoEffectType, number>>;
  overlayEffect?: OverlayEffect;
  
  // Image Animation properties
  imageAnimationType?: 'none' |
    'zoom-in' | 'zoom-out' | 'zoom-in-fast' | 'zoom-out-slow' | 'zoom-bounce' | 'zoom-pulse-beat' | 'zoom-rotate-in' | 'super-zoom-in' | 'dramatic-push-in' |
    'pan-right' | 'pan-left' | 'pan-up' | 'pan-down' | 'pan-diagonal-tl' | 'pan-diagonal-br' | 'pan-right-left-pingpong' |
    'ken-burns' | 'ken-burns-in' | 'ken-burns-out' | 'ken-burns-pan-up' | 'ken-burns-pan-down' |
    '3d-tilt-forward' | 'glitch-zoom' | 'spiral-zoom' | 'whip-zoom-in' | 'camera-shake-action' | 'breath-zoom' | 'float-rotate-3d' | 'pulse-beat-bass' | 'retro-vhs-jitter' |
    'spin-clockwise' | 'spin-counter' | 'float' | 'pulse' | 'shake' | 'heartbeat' | 'bounce' | 'slide-in';
  imageAnimationSpeed?: number;
  imageAnimationScale?: number;

  // Shape-specific properties
  shapeType?: ShapeType;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  opacity?: number;
  shapeShadow?: boolean;
  shapeShadowColor?: string;
  shapeShadowBlur?: number;
  shapeShadowOffsetX?: number;
  shapeShadowOffsetY?: number;
}

export interface Track {
  id:string;
  type: 'video' | 'audio' | 'text' | 'spectrum' | 'shape' | 'emoji';
  name: string;
  isMuted?: boolean;
  volume: number; // From 0.0 to 1.0
  preMuteVolume?: number; // To restore volume after unmuting
}

export interface AnimatedBorder {
  type: 'none' | 'solid' | 'gradient' | 'audio-glow' | 'flames';
  width: number; // Percentage of the smallest canvas dimension
  color1: string;
  color2: string;
  color3: string;
  gradientAngle: number;
}

export interface Scene {
  id: string;
  name: string;
  overlayEffect: OverlayEffect;
  animatedBorder?: AnimatedBorder;
}

export interface ProjectState {
  scene: Scene | null;
  tracks: Track[];
  timelineClips: VideoClip[];
  timelineTransitions: TimelineTransition[];
  mediaPool: MediaPoolClip[];
  selectedClipIds: string[];
  selectedTrackIds: string[];
}

export type AnalyserFrame = {
    freqData: Uint8Array;
    timeDomainData: Uint8Array;
};
