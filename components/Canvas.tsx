import React, { useMemo, useState, forwardRef, useRef, useImperativeHandle, useEffect, useLayoutEffect, useCallback } from 'react';
import { ProjectFormat, VideoClip, AnalyserFrame, PreviewQuality, ProjectState, VideoClipType, SpectrumStyle, LogoShape, TransitionType, OverlayEffect, VideoEffectType, AnimatedBorder } from '../types';
import { FORMAT_DIMENSIONS, VIDEO_EFFECTS } from '../constants';
import DraggableResizable from './DraggableResizable';
import AudioVisualizer, { AudioVisualizerHandle, drawVisualizerFrame } from './AudioVisualizer';
import OverlayEffects, { OverlayEffectsHandle } from './OverlayEffects';
import TextRenderer from './TextRenderer';
import ShapeRenderer from './ShapeRenderer';
import { seekVideoAndGetFrameBitmap } from '../utils/export';
import { calculateFadeMultiplier, getPulseAmount } from '../utils/audio';
import { drawWrappedText, drawShape, drawAnimatedBorder } from '../utils/canvasUtils';
import { Move, ArrowUp, ArrowDown, AlignCenter, Zap, ZapOff, AlignJustify } from 'lucide-react';

interface CanvasProps {
  format: ProjectFormat;
  previewQuality: PreviewQuality;
  projectState: ProjectState;
  masterCurrentTime: number;
  selectedClipId: string | null;
  onSelectClip: (id: string | null) => void;
  onUpdateClip: (id: string, newProps: Partial<VideoClip>) => void;
  onUpdateMultipleClips: (updates: { id: string; props: Partial<VideoClip> }[]) => void;
  isPlaying: boolean;
  overlayEffect: OverlayEffect;
  zoom: number;
  fitScale: number;
  onInteractionStart: () => void;
  onInteractionEnd: () => void;
  captionClips: VideoClip[];
}

export interface CanvasHandle {
  drawForScrubbing: (projectStateForFrame: ProjectState, analyserFrame: AnalyserFrame, time: number, requestId?: number) => void;
  drawForPlayback: (projectStateForFrame: ProjectState, analyserFrame: AnalyserFrame, time: number) => void;
  playVideoAtTime: (clip: VideoClip, timeInClip: number) => void;
  syncVideoAtTime: (clip: VideoClip, timeInClip: number) => void;
  precueVideoClip?: (clip: VideoClip, targetTime?: number) => void;
  pauseAllVideos: () => void;
  pauseVideosByIds: (clipIds: string[]) => void;
}

const applyTransitionEffect = (
    ctx: CanvasRenderingContext2D,
    type: TransitionType,
    progress: number,
    width: number,
    height: number
) => {
    progress = Math.max(0, Math.min(1, progress));

    switch (type) {
        case 'fade':
        case 'dissolve':
            ctx.globalAlpha = progress;
            break;
        case 'wipe-right':
            ctx.beginPath();
            ctx.rect(0, 0, width * progress, height);
            ctx.clip();
            break;
        case 'wipe-left':
            ctx.beginPath();
            ctx.rect(width * (1 - progress), 0, width * progress, height);
            ctx.clip();
            break;
        case 'wipe-down':
            ctx.beginPath();
            ctx.rect(0, 0, width, height * progress);
            ctx.clip();
            break;
        case 'wipe-up':
            ctx.beginPath();
            ctx.rect(0, height * (1 - progress), width, height * progress);
            ctx.clip();
            break;
        case 'slide-right':
            ctx.translate(-width * (1 - progress), 0);
            break;
        case 'slide-left':
            ctx.translate(width * (1 - progress), 0);
            break;
        case 'slide-down':
            ctx.translate(0, -height * (1 - progress));
            break;
        case 'slide-up':
            ctx.translate(0, height * (1 - progress));
            break;
        case 'circle-open': {
            const radius = Math.sqrt(width*width + height*height) / 2 * progress;
            ctx.beginPath();
            ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
            ctx.clip();
            break;
        }
        case 'circle-close': {
            const radius = Math.sqrt(width*width + height*height) / 2 * (1 - progress);
            ctx.beginPath();
            ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
            ctx.clip();
            break;
        }
        case 'wipe-angular': {
            const d = progress * (width + height);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.min(d, width), 0);
            if (d > width) {
                ctx.lineTo(width, Math.min(d - width, height));
            }
            if (d > height) {
                ctx.lineTo(Math.max(0, d - height), height);
            }
            ctx.lineTo(0, Math.min(d, height));
            ctx.closePath();
            ctx.clip();
            break;
        }
        case 'zoom-in': {
            const scale = progress;
            ctx.translate(width / 2, height / 2);
            ctx.scale(scale, scale);
            ctx.translate(-width / 2, -height / 2);
            const blurAmount = (1 - progress) * 15; // blur decreases as it zooms in
            if (blurAmount > 0.5) {
                ctx.filter = `blur(${blurAmount}px)`;
            }
            break;
        }
        case 'spin-zoom': {
            const scale = progress;
            const angle = (1 - progress) * Math.PI * 2;
            ctx.translate(width / 2, height / 2);
            ctx.rotate(angle);
            ctx.scale(scale, scale);
            ctx.translate(-width / 2, -height / 2);
            ctx.globalAlpha = progress;
            break;
        }
        case 'cross-zoom': {
            const scale = 2.4 - progress * 1.4;
            ctx.translate(width / 2, height / 2);
            ctx.scale(scale, scale);
            ctx.translate(-width / 2, -height / 2);
            ctx.globalAlpha = progress;
            const blur = (1 - progress) * 15;
            if (blur > 0.5) ctx.filter = `blur(${blur}px)`;
            break;
        }
        case 'flip-horizontal': {
            ctx.translate(width / 2, height / 2);
            ctx.scale(progress, 1);
            ctx.translate(-width / 2, -height / 2);
            ctx.globalAlpha = progress;
            break;
        }
        case 'flip-vertical': {
            ctx.translate(width / 2, height / 2);
            ctx.scale(1, progress);
            ctx.translate(-width / 2, -height / 2);
            ctx.globalAlpha = progress;
            break;
        }
        case 'curtain-split': {
            const splitW = (width / 2) * progress;
            ctx.beginPath();
            ctx.rect(width / 2 - splitW, 0, splitW * 2, height);
            ctx.clip();
            break;
        }
        case 'heart-open': {
            const maxDim = Math.max(width, height) * 1.3;
            const r = progress * maxDim;
            const cx = width / 2;
            const cy = height / 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy + r * 0.35);
            ctx.bezierCurveTo(cx - r * 0.5, cy - r * 0.1, cx - r * 0.6, cy - r * 0.5, cx, cy - r * 0.35);
            ctx.bezierCurveTo(cx + r * 0.6, cy - r * 0.5, cx + r * 0.5, cy - r * 0.1, cx, cy + r * 0.35);
            ctx.closePath();
            ctx.clip();
            break;
        }
        case 'star-open': {
            const outerR = progress * Math.max(width, height) * 1.2;
            const innerR = outerR * 0.4;
            const cx = width / 2;
            const cy = height / 2;
            let rot = (Math.PI / 2) * 3;
            const step = Math.PI / 5;
            ctx.beginPath();
            ctx.moveTo(cx, cy - outerR);
            for (let i = 0; i < 5; i++) {
                ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
                rot += step;
                ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
                rot += step;
            }
            ctx.closePath();
            ctx.clip();
            break;
        }
        case 'diamond-open': {
            const size = progress * Math.max(width, height) * 1.5;
            const cx = width / 2;
            const cy = height / 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy - size / 2);
            ctx.lineTo(cx + size / 2, cy);
            ctx.lineTo(cx, cy + size / 2);
            ctx.lineTo(cx - size / 2, cy);
            ctx.closePath();
            ctx.clip();
            break;
        }
        case 'venetian-blinds': {
            const numSlats = 10;
            const slatH = height / numSlats;
            const openH = slatH * progress;
            ctx.beginPath();
            for (let i = 0; i < numSlats; i++) {
                ctx.rect(0, i * slatH, width, openH);
            }
            ctx.clip();
            break;
        }
        case 'bounce-in': {
            const p = progress;
            const bounce = 1 - Math.cos(p * Math.PI * 2.5) * Math.exp(-p * 3);
            const translateY = -height * (1 - Math.min(1, Math.max(0, bounce)));
            ctx.translate(0, translateY);
            ctx.globalAlpha = Math.min(1, progress * 1.5);
            break;
        }
        case 'slide-diagonal': {
            ctx.translate(-width * (1 - progress), -height * (1 - progress));
            break;
        }
        case 'vortex-spin': {
            const radius = progress * Math.sqrt(width * width + height * height) / 2;
            const angle = (1 - progress) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
            ctx.clip();
            ctx.translate(width / 2, height / 2);
            ctx.rotate(angle);
            ctx.translate(-width / 2, -height / 2);
            ctx.globalAlpha = progress;
            break;
        }
        case 'color-flash': {
            ctx.globalAlpha = progress;
            break;
        }
        case 'pixelate': {
            ctx.globalAlpha = progress;
            const blurAmount = Math.sin(progress * Math.PI) * 14;
            if (blurAmount > 0.5) {
                ctx.filter = `blur(${blurAmount}px) contrast(${100 + blurAmount * 4}%)`;
            }
            break;
        }
        case 'zoom-out': {
            // Handled in drawForPlayback/drawForScrubbing as it affects the outgoing clip (A)
            break;
        }
        default:
            ctx.globalAlpha = progress;
            break;
    }
};

const CaptionControlToolbar: React.FC<{
  selectedClip: VideoClip;
  captionClips: VideoClip[];
  onUpdateMultipleClips: (updates: { id: string; props: Partial<VideoClip> }[]) => void;
  interactionScale: number;
  onInteractionStart: () => void;
  onInteractionEnd: () => void;
  setIsGroupDragging: (isDragging: boolean) => void;
  syncAllCaptions: boolean;
  setSyncAllCaptions: (sync: boolean) => void;
  canvasBounds: { width: number; height: number };
}> = ({
  selectedClip,
  captionClips,
  onUpdateMultipleClips,
  interactionScale,
  onInteractionStart,
  onInteractionEnd,
  setIsGroupDragging,
  syncAllCaptions,
  setSyncAllCaptions,
  canvasBounds
}) => {
  const [dragState, setDragState] = useState<{
    initialMouseX: number;
    initialMouseY: number;
    initialClipPositions: { id: string; x: number; y: number }[];
  } | null>(null);

  const handlePointerDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsGroupDragging(true);
    onInteractionStart();
    
    setDragState({
      initialMouseX: e.clientX,
      initialMouseY: e.clientY,
      initialClipPositions: captionClips.map(c => ({ id: c.id, x: c.x, y: c.y })),
    });
  }, [onInteractionStart, captionClips, setIsGroupDragging]);

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragState.initialMouseX) / interactionScale;
      const dy = (e.clientY - dragState.initialMouseY) / interactionScale;

      const updates = dragState.initialClipPositions.map(initial => ({
        id: initial.id,
        props: {
          x: initial.x + dx,
          y: initial.y + dy,
        }
      }));
      onUpdateMultipleClips(updates);
    };

    const handlePointerUp = () => {
      onInteractionEnd();
      setDragState(null);
      setIsGroupDragging(false);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      setIsGroupDragging(false);
    };
  }, [dragState, interactionScale, onUpdateMultipleClips, onInteractionEnd, setIsGroupDragging]);

  const handleAlign = (position: 'top' | 'center' | 'bottom') => {
    let targetY = canvasBounds.height * 0.78; // bottom default
    if (position === 'center') targetY = canvasBounds.height * 0.42;
    if (position === 'top') targetY = canvasBounds.height * 0.12;

    const targetClips = syncAllCaptions ? captionClips : [selectedClip];
    const updates = targetClips.map(c => ({
      id: c.id,
      props: { y: targetY }
    }));
    onUpdateMultipleClips(updates);
  };

  const handleCenterX = () => {
    const targetClips = syncAllCaptions ? captionClips : [selectedClip];
    const updates = targetClips.map(c => ({
      id: c.id,
      props: { x: (canvasBounds.width - c.width) / 2 }
    }));
    onUpdateMultipleClips(updates);
  };

  const isNearTop = selectedClip.y < 60;
  const topPos = isNearTop
    ? Math.min(canvasBounds.height - 50, selectedClip.y + selectedClip.height + 12)
    : Math.max(10, selectedClip.y - 50);

  const leftPos = Math.max(10, Math.min(canvasBounds.width - 380, selectedClip.x));

  const handleStyle: React.CSSProperties = {
    position: 'absolute',
    top: topPos,
    left: leftPos,
    zIndex: 9999,
  };

  return (
    <div
      style={handleStyle}
      className="flex items-center gap-1.5 p-1.5 bg-slate-900/95 text-white rounded-xl shadow-2xl border border-white/20 select-none backdrop-blur-md text-xs font-medium"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-600 hover:bg-violet-500 active:scale-95 transition-all text-white rounded-lg cursor-move shadow-md"
        onMouseDown={handlePointerDown}
        title="Clique e arraste para mover todas as legendas juntas"
      >
        <Move size={14} className="text-white shrink-0" />
        <span className="font-semibold whitespace-nowrap">Arrastar ({captionClips.length})</span>
      </div>

      <div className="h-4 w-px bg-white/20 my-auto mx-0.5" />

      <button
        onClick={() => setSyncAllCaptions(!syncAllCaptions)}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all ${
          syncAllCaptions
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
        }`}
        title={syncAllCaptions ? 'Sincronização ativada: Mover uma legenda move todas' : 'Sincronização desativada: Move apenas esta legenda'}
      >
        {syncAllCaptions ? <Zap size={13} className="text-emerald-400" /> : <ZapOff size={13} />}
        <span className="text-[11px] font-medium">{syncAllCaptions ? 'Sincronizado' : 'Individual'}</span>
      </button>

      <div className="h-4 w-px bg-white/20 my-auto mx-0.5" />

      <div className="flex items-center gap-0.5 bg-white/5 p-0.5 rounded-lg border border-white/10">
        <button
          onClick={() => handleAlign('top')}
          className="p-1 hover:bg-white/20 rounded text-slate-200 hover:text-white transition-colors"
          title="Alinhar todas as legendas no topo"
        >
          <ArrowUp size={13} />
        </button>
        <button
          onClick={() => handleAlign('center')}
          className="p-1 hover:bg-white/20 rounded text-slate-200 hover:text-white transition-colors"
          title="Centralizar todas as legendas verticalmente"
        >
          <AlignJustify size={13} />
        </button>
        <button
          onClick={() => handleAlign('bottom')}
          className="p-1 hover:bg-white/20 rounded text-slate-200 hover:text-white transition-colors"
          title="Alinhar todas as legendas na base"
        >
          <ArrowDown size={13} />
        </button>
        <button
          onClick={handleCenterX}
          className="p-1 hover:bg-white/20 rounded text-slate-200 hover:text-white transition-colors"
          title="Centralizar horizontalmente"
        >
          <AlignCenter size={13} />
        </button>
      </div>
    </div>
  );
};

// Determines the active overlay effect for a specific point in time,
// considering both clip-specific overrides and the global scene setting.
const findOverlayEffectForTime = (time: number, projectState: ProjectState): OverlayEffect => {
    const { tracks, timelineClips, scene } = projectState;
    if (!scene) return 'none';
    
    // Get the track order to determine which clip is on top. Lower index = higher track.
    const trackOrder = [...tracks].map(t => t.id);

    const activeClipsWithOverlay = timelineClips
        .filter(clip => {
            // A clip has an override if its overlayEffect is not undefined.
            // The "Default" option in the UI sets it to undefined.
            if (clip.overlayEffect === undefined) return false;

            const clipEnd = clip.timelineStart + (clip.endTime - clip.startTime) / (clip.speed || 1);
            return time >= clip.timelineStart && time < clipEnd;
        })
        // Sort clips by track order, from top to bottom.
        .sort((a, b) => trackOrder.indexOf(a.trackId) - trackOrder.indexOf(b.trackId));
        
    // The first clip in the sorted array is the topmost one with an effect.
    const topClip = activeClipsWithOverlay[0];
    
    // Use the top clip's effect if it exists, otherwise fall back to the global scene effect.
    return topClip?.overlayEffect ?? scene.overlayEffect;
};


export const Canvas = forwardRef<CanvasHandle, CanvasProps>((props, ref) => {
  const {
    format, previewQuality, projectState, masterCurrentTime,
    selectedClipId, onSelectClip, onUpdateClip, onUpdateMultipleClips, isPlaying, zoom, fitScale,
    onInteractionStart, onInteractionEnd, captionClips
  } = props;

  const { scene, tracks, timelineClips, timelineTransitions } = projectState;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<OverlayEffectsHandle>(null);
  const videoElementsRef = useRef<Map<string, HTMLVideoElement | HTMLImageElement>>(new Map());
  const lastFrameTimeRef = useRef(0);
  const lastDrawIdRef = useRef(0);
  const lastScrubArgsRef = useRef<{ projectStateForFrame: ProjectState; analyserFrame: AnalyserFrame; time: number } | null>(null);
  const scrubRafRef = useRef<number | null>(null);

  const triggerScrubRedraw = useCallback(() => {
    if (isPlaying) return;
    if (scrubRafRef.current) cancelAnimationFrame(scrubRafRef.current);
    scrubRafRef.current = requestAnimationFrame(() => {
      if (isPlaying) return;
      if (lastScrubArgsRef.current && (canvasRef.current as any)) {
        const { projectStateForFrame, analyserFrame, time } = lastScrubArgsRef.current;
        if ((ref as any)?.current?.drawForScrubbing) {
          (ref as any).current.drawForScrubbing(projectStateForFrame, analyserFrame, time);
        }
      }
    });
  }, [ref, isPlaying]);
  const [isGroupDragging, setIsGroupDragging] = useState(false);
  const [syncAllCaptions, setSyncAllCaptions] = useState(true);

  const handleClipUpdateWithSync = useCallback((id: string, newProps: Partial<VideoClip>) => {
    const targetClip = timelineClips.find(c => c.id === id);
    if (!targetClip) {
      onUpdateClip(id, newProps);
      return;
    }

    const isCaption = targetClip.id.startsWith('caption-clip-') ||
      tracks.find(t => t.id === targetClip.trackId)?.name.toLowerCase().includes('legendas');

    if (isCaption && syncAllCaptions && captionClips.length > 0) {
      const dx = newProps.x !== undefined ? (newProps.x - targetClip.x) : 0;
      const dy = newProps.y !== undefined ? (newProps.y - targetClip.y) : 0;

      const updates = captionClips.map(cap => {
        const propsForCap: Partial<VideoClip> = { ...newProps };

        if (newProps.y !== undefined) {
          propsForCap.y = newProps.y;
        }
        if (newProps.x !== undefined) {
          propsForCap.x = cap.x + dx;
        }
        if (newProps.width !== undefined) propsForCap.width = newProps.width;
        if (newProps.height !== undefined) propsForCap.height = newProps.height;
        if (newProps.fontSize !== undefined) propsForCap.fontSize = newProps.fontSize;
        if (newProps.rotation !== undefined) propsForCap.rotation = newProps.rotation;

        return { id: cap.id, props: propsForCap };
      });

      onUpdateMultipleClips(updates);
    } else {
      onUpdateClip(id, newProps);
    }
  }, [timelineClips, tracks, syncAllCaptions, captionClips, onUpdateMultipleClips, onUpdateClip]);
  
  const dimensions = useMemo(() => FORMAT_DIMENSIONS[format], [format]);
  const { canvasDimensions, interactionPlaneScale, netInteractionScale } = useMemo(() => {
    const base = dimensions;
    let cd;
    switch (previewQuality) {
      case '1080':
        cd = { width: base.width, height: base.height };
        break;
      case '720':
        cd = { width: Math.round(base.width * (720 / base.height)), height: 720 };
        break;
      case '480':
        cd = { width: Math.round(base.width * (480 / base.height)), height: 480 };
        break;
      case 'auto':
      default:
        const scale = Math.min(1, 1280 / base.width); // Cap auto quality around 720p equivalent
        cd = { width: Math.round(base.width * scale), height: Math.round(base.height * scale) };
    }
    const ips = cd.width / base.width; // interactionPlaneScale
    const nis = zoom * fitScale * ips; // netInteractionScale
    return { canvasDimensions: cd, interactionPlaneScale: ips, netInteractionScale: nis };
  }, [dimensions, previewQuality, zoom, fitScale]);


  const allMediaClips = useMemo(() => {
      const clipMap = new Map<string, VideoClip>();
      const { timelineClips, mediaPool } = projectState;
      // Pre-warm elements from media pool
      mediaPool?.forEach(item => {
          if (item.src && (item.type === 'video' || item.type === 'image')) {
              clipMap.set(`pool-${item.id}`, { ...item, id: `pool-${item.id}` } as any);
          }
      });
      // Add all timeline clips
      timelineClips.forEach(clip => {
          const src = clip.src || mediaPool?.find(mp => mp.id === clip.poolId)?.src;
          if ((clip.type === 'video' || clip.type === 'image') && src) {
              clipMap.set(clip.id, { ...clip, src });
          }
          if (clip.type === 'spectrum' && clip.logoSrc) {
              const logoClip = { ...clip, id: `logo-${clip.id}`, src: clip.logoSrc, type: 'image' as const };
              clipMap.set(logoClip.id, logoClip as any);
          }
      });
      return Array.from(clipMap.values());
  }, [projectState.timelineClips, projectState.mediaPool]);

  const getMediaElementForClip = useCallback((clip: VideoClip): HTMLVideoElement | HTMLImageElement | null => {
      // 1. Direct ID match (each timeline clip has its own dedicated element with key=clip.id)
      const byId = videoElementsRef.current.get(clip.id);
      if (byId) {
          if (byId.tagName === 'VIDEO') {
              const v = byId as HTMLVideoElement;
              if (v.readyState >= 1 && v.videoWidth > 0) return byId;
          } else if (byId.tagName === 'IMG') {
              if ((byId as HTMLImageElement).complete) return byId;
          }
      }

      // 2. Direct pool element match as backup
      if (clip.poolId) {
          const byPool = videoElementsRef.current.get(`pool-${clip.poolId}`);
          if (byPool) {
              if (byPool.tagName === 'VIDEO') {
                  const v = byPool as HTMLVideoElement;
                  if (v.readyState >= 1 && v.videoWidth > 0) return byPool;
              } else if (byPool.tagName === 'IMG') {
                  if ((byPool as HTMLImageElement).complete) return byPool;
              }
          }
      }

      // 3. Match any existing ready element with the same source URL
      if (clip.src) {
          for (const [, el] of videoElementsRef.current.entries()) {
              if (el.tagName === 'VIDEO') {
                  const v = el as HTMLVideoElement;
                  if ((v.src === clip.src || v.currentSrc === clip.src) && v.readyState >= 1 && v.videoWidth > 0) {
                      return v;
                  }
              }
          }
      }

      // 4. Fallback to byId even if still buffering
      if (byId) return byId;
      if (clip.poolId) {
          const byPool = videoElementsRef.current.get(`pool-${clip.poolId}`);
          if (byPool) return byPool;
      }
      return null;
  }, []);
  
  const visibleClips = useMemo(() => {
    return timelineClips.filter(clip => {
        const visualTypes: VideoClipType[] = ['video', 'image', 'text', 'spectrum', 'shape', 'emoji'];
        if (!visualTypes.includes(clip.type)) return false;

        const clipEnd = clip.timelineStart + (clip.endTime - clip.startTime) / (clip.speed || 1);
        return masterCurrentTime >= clip.timelineStart && masterCurrentTime < clipEnd;
    });
  }, [timelineClips, masterCurrentTime]);
  
  const selectedClip = useMemo(() => timelineClips.find(c => c.id === selectedClipId), [timelineClips, selectedClipId]);
  const showCaptionDragHandle = selectedClip && selectedClip.id.startsWith('caption-clip-') && captionClips.length > 0;

  const trackOrder = useMemo(() => {
    const orderMap = new Map<string, number>();
    [...tracks].reverse().forEach((track, index) => {
        orderMap.set(track.id, index);
    });
    return orderMap;
  }, [tracks]);

  const drawVisualClip = (ctx: CanvasRenderingContext2D, clip: VideoClip, time: number, analyserFrame: AnalyserFrame) => {
      const scale = ctx.canvas.width / dimensions.width;
      ctx.save();
      const scaledClip = {
          x: clip.x * scale,
          y: clip.y * scale,
          width: clip.width * scale,
          height: clip.height * scale,
      };
      
      // Apply transformations (position, rotation)
      ctx.translate(scaledClip.x + scaledClip.width / 2, scaledClip.y + scaledClip.height / 2);
      ctx.rotate((clip.rotation || 0) * Math.PI / 180);
      ctx.translate(-scaledClip.width / 2, -scaledClip.height / 2);

      const timeInClipDisplay = time - clip.timelineStart;
      const totalClipDuration = (clip.endTime - clip.startTime) / (clip.speed || 1);

      switch (clip.type) {
          case 'text':
          case 'emoji':
              drawWrappedText(ctx, clip, scale, timeInClipDisplay, totalClipDuration);
              break;
          case 'shape':
              drawShape(ctx, clip, scale);
              break;
          case 'spectrum':
              const logoImage = clip.logoSrc ? videoElementsRef.current.get(`logo-${clip.id}`) as HTMLImageElement : null;
              const transformedSpectrumClip = {
                  ...clip,
                  width: scaledClip.width,
                  height: scaledClip.height,
                  style: clip.spectrumStyle!,
                  color: clip.spectrumColor!,
                  color2: clip.spectrumColor2!,
                  color3: clip.spectrumColor3!,
                  pulseStrength: clip.pulseStrength
              };
              drawVisualizerFrame(ctx, analyserFrame.freqData, analyserFrame.timeDomainData, time, transformedSpectrumClip, logoImage);
              break;
          case 'video':
          case 'image':
              const el = getMediaElementForClip(clip);
              if (!el) break;
              if (el.tagName === 'VIDEO') {
                  const vel = el as HTMLVideoElement;
                  if (vel.videoWidth === 0 || vel.readyState < 1) break;
              } else if (el.tagName === 'IMG') {
                  if (!(el as HTMLImageElement).complete) break;
              }
              const pulseAmount = clip.pulsesWithMusic ? getPulseAmount(analyserFrame.freqData, clip.pulseStrength ?? 0.5) : 1.0;
              
              const effects = clip.effects || {};
              const cssEffects: Partial<Record<VideoEffectType, number>> = {};
              const canvasEffects: Partial<Record<VideoEffectType, number>> = {};

              for (const key in effects) {
                if (key === 'vignette' || key === 'letterbox') {
                    canvasEffects[key as VideoEffectType] = effects[key as keyof typeof effects]!;
                } else {
                    cssEffects[key as VideoEffectType] = effects[key as keyof typeof effects]!;
                }
              }

              ctx.save();
              if (Object.keys(cssEffects).length > 0) {
                  const filterString = Object.entries(cssEffects).map(([key, value]) => {
                      const effectDef = VIDEO_EFFECTS.find(e => e.id === key);
                      return `${key}(${value}${effectDef?.unit || ''})`;
                  }).join(' ');
                  ctx.filter = filterString;
              }

              if (pulseAmount !== 1.0) { 
                  ctx.translate(scaledClip.width / 2, scaledClip.height / 2);
                  ctx.scale(pulseAmount, pulseAmount);
                  ctx.translate(-scaledClip.width / 2, -scaledClip.height / 2);
              }

              // Apply Image/Video Animations & Zoom Effects
              if ((clip.type === 'image' || clip.type === 'video') && clip.imageAnimationType && clip.imageAnimationType !== 'none') {
                  const animType = clip.imageAnimationType;
                  const speed = clip.imageAnimationSpeed ?? 1.0;
                  const scaleVal = clip.imageAnimationScale ?? 1.25;
                  const progress = Math.max(0, Math.min(1, timeInClipDisplay / totalClipDuration));

                  switch (animType) {
                      case 'zoom-in': {
                          const currentScale = 1.0 + (scaleVal - 1.0) * progress;
                          ctx.translate(scaledClip.width / 2, scaledClip.height / 2);
                          ctx.scale(currentScale, currentScale);
                          ctx.translate(-scaledClip.width / 2, -scaledClip.height / 2);
                          break;
                      }
                      case 'zoom-out': {
                          const currentScale = scaleVal - (scaleVal - 1.0) * progress;
                          ctx.translate(scaledClip.width / 2, scaledClip.height / 2);
                          ctx.scale(currentScale, currentScale);
                          ctx.translate(-scaledClip.width / 2, -scaledClip.height / 2);
                          break;
                      }
                      case 'zoom-in-fast': {
                          const p = Math.min(1, progress * 1.8);
                          const ease = 1 - Math.pow(1 - p, 3);
                          const currentScale = 1.0 + (scaleVal - 1.0) * ease;
                          ctx.translate(scaledClip.width / 2, scaledClip.height / 2);
                          ctx.scale(currentScale, currentScale);
                          ctx.translate(-scaledClip.width / 2, -scaledClip.height / 2);
                          break;
                      }
                      case 'zoom-out-slow': {
                          const currentScale = (scaleVal * 1.15) - (scaleVal * 0.15) * Math.sqrt(progress);
                          ctx.translate(scaledClip.width / 2, scaledClip.height / 2);
                          ctx.scale(currentScale, currentScale);
                          ctx.translate(-scaledClip.width / 2, -scaledClip.height / 2);
                          break;
                      }
                      case 'zoom-bounce': {
                          const p = Math.min(1, progress * 1.5);
                          const elastic = Math.sin(p * Math.PI * 2.5) * Math.exp(-p * 3) * (scaleVal - 1.0);
                          const currentScale = 1.0 + (scaleVal - 1.0) * Math.min(1, p) + elastic;
                          ctx.translate(scaledClip.width / 2, scaledClip.height / 2);
                          ctx.scale(currentScale, currentScale);
                          ctx.translate(-scaledClip.width / 2, -scaledClip.height / 2);
                          break;
                      }
                      case 'zoom-pulse-beat': {
                          const p = (timeInClipDisplay * speed * 2) % 1;
                          const pulse = Math.sin(p * Math.PI) * (scaleVal - 1.0);
                          const currentScale = 1.0 + pulse;
                          ctx.translate(scaledClip.width / 2, scaledClip.height / 2);
                          ctx.scale(currentScale, currentScale);
                          ctx.translate(-scaledClip.width / 2, -scaledClip.height / 2);
                          break;
                      }
                      case 'zoom-rotate-in': {
                          const currentScale = 1.0 + (scaleVal - 1.0) * progress;
                          const rot = (1 - progress) * 0.15 * speed;
                          ctx.translate(scaledClip.width / 2, scaledClip.height / 2);
                          ctx.scale(currentScale, currentScale);
                          ctx.rotate(rot);
                          ctx.translate(-scaledClip.width / 2, -scaledClip.height / 2);
                          break;
                      }
                      case 'super-zoom-in': {
                          const p = Math.min(1, progress * 2.2);
                          const superScale = 1.0 + (scaleVal * 1.5 - 1.0) * Math.pow(p, 2);
                          ctx.translate(scaledClip.width / 2, scaledClip.height / 2);
                          ctx.scale(superScale, superScale);
                          ctx.translate(-scaledClip.width / 2, -scaledClip.height / 2);
                          break;
                      }
                      case 'dramatic-push-in': {
                          const ease = progress * progress * (3 - 2 * progress);
                          const currentScale = 1.0 + (scaleVal * 1.25 - 1.0) * ease;
                          ctx.translate(scaledClip.width / 2, scaledClip.height / 2);
                          ctx.scale(currentScale, currentScale);
                          ctx.translate(-scaledClip.width / 2, -scaledClip.height / 2);
                          break;
                      }
                      case 'pan-right': {
                          const panRange = (scaleVal - 1.0) * scaledClip.width;
                          const panX = -panRange / 2 + panRange * progress * speed;
                          ctx.translate(panX, 0);
                          break;
                      }
                      case 'pan-left': {
                          const panRange = (scaleVal - 1.0) * scaledClip.width;
                          const panX = panRange / 2 - panRange * progress * speed;
                          ctx.translate(panX, 0);
                          break;
                      }
                      case 'pan-up': {
                          const panRange = (scaleVal - 1.0) * scaledClip.height;
                          const panY = panRange / 2 - panRange * progress * speed;
                          ctx.translate(0, panY);
                          ctx.translate(scaledClip.width / 2, scaledClip.height / 2);
                          ctx.scale(1.08, 1.08);
                          ctx.translate(-scaledClip.width / 2, -scaledClip.height / 2);
                          break;
                      }
                      case 'pan-down': {
                          const panRange = (scaleVal - 1.0) * scaledClip.height;
                          const panY = -panRange / 2 + panRange * progress * speed;
                          ctx.translate(0, panY);
                          ctx.translate(scaledClip.width / 2, scaledClip.height / 2);
                          ctx.scale(1.08, 1.08);
                          ctx.translate(-scaledClip.width / 2, -scaledClip.height / 2);
                          break;
                      }
                      case 'pan-diagonal-tl': {
                          const rangeX = (scaleVal - 1.0) * scaledClip.width * 0.6;
                          const rangeY = (scaleVal - 1.0) * scaledClip.height * 0.6;
                          const panX = -rangeX / 2 + rangeX * progress * speed;
                          const panY = -rangeY / 2 + rangeY * progress * speed;
                          ctx.translate(panX, panY);
                          ctx.translate(scaledClip.width / 2, scaledClip.height / 2);
                          ctx.scale(1.1, 1.1);
                          ctx.translate(-scaledClip.width / 2, -scaledClip.height / 2);
                          break;
                      }
                      case 'pan-diagonal-br': {
                          const rangeX = (scaleVal - 1.0) * scaledClip.width * 0.6;
                          const rangeY = (scaleVal - 1.0) * scaledClip.height * 0.6;
                          const panX = rangeX / 2 - rangeX * progress * speed;
                          const panY = rangeY / 2 - rangeY * progress * speed;
                          ctx.translate(panX, panY);
                          ctx.translate(scaledClip.width / 2, scaledClip.height / 2);
                          ctx.scale(1.1, 1.1);
                          ctx.translate(-scaledClip.width / 2, -scaledClip.height / 2);
                          break;
                      }
                      case 'pan-right-left-pingpong': {
                          const wave = Math.sin(timeInClipDisplay * speed * 1.2) * 0.5 + 0.5;
                          const panRange = (scaleVal - 1.0) * scaledClip.width * 0.8;
                          const panX = -panRange / 2 + panRange * wave;
                          ctx.translate(panX, 0);
                          ctx.translate(scaledClip.width / 2, scaledClip.height / 2);
                          ctx.scale(1.1, 1.1);
                          ctx.translate(-scaledClip.width / 2, -scaledClip.height / 2);
                          break;
                      }
                      case 'ken-burns': {
                          const currentScale = 1.0 + (scaleVal - 1.0) * progress;
                          const panRangeX = (scaleVal - 1.0) * scaledClip.width * 0.2;
                          const panRangeY = (scaleVal - 1.0) * scaledClip.height * 0.1;
                          const panX = -panRangeX / 2 + panRangeX * progress * speed;
                          const panY = Math.sin(progress * Math.PI) * panRangeY * speed;
                          ctx.translate(panX, panY);
                          ctx.translate(scaledClip.width / 2, scaledClip.height / 2);
                          ctx.scale(currentScale, currentScale);
                          ctx.translate(-scaledClip.width / 2, -scaledClip.height / 2);
                          break;
                      }
                      case 'ken-burns-pan-up': {
                          const currentScale = 1.0 + (scaleVal - 1.0) * progress;
                          const panY = (scaleVal - 1.0) * scaledClip.height * (0.3 - progress * 0.6);
                          ctx.translate(0, panY);
                          ctx.translate(scaledClip.width / 2, scaledClip.height / 2);
                          ctx.scale(currentScale, currentScale);
                          ctx.translate(-scaledClip.width / 2, -scaledClip.height / 2);
                          break;
                      }
                      case 'ken-burns-pan-down': {
                          const currentScale = 1.0 + (scaleVal - 1.0) * progress;
                          const panY = (scaleVal - 1.0) * scaledClip.height * (-0.3 + progress * 0.6);
                          ctx.translate(0, panY);
                          ctx.translate(scaledClip.width / 2, scaledClip.height / 2);
                          ctx.scale(currentScale, currentScale);
                          ctx.translate(-scaledClip.width / 2, -scaledClip.height / 2);
                          break;
                      }
                      case 'ken-burns-in': {
                          const currentScale = 1.0 + (scaleVal - 1.0) * progress;
                          const panX = (1 - progress) * (scaleVal - 1.0) * scaledClip.width * 0.15;
                          const panY = (1 - progress) * (scaleVal - 1.0) * scaledClip.height * 0.15;
                          ctx.translate(-panX, -panY);
                          ctx.translate(scaledClip.width / 2, scaledClip.height / 2);
                          ctx.scale(currentScale, currentScale);
                          ctx.translate(-scaledClip.width / 2, -scaledClip.height / 2);
                          break;
                      }
                      case 'ken-burns-out': {
                          const currentScale = scaleVal - (scaleVal - 1.0) * progress;
                          const panX = progress * (scaleVal - 1.0) * scaledClip.width * 0.15;
                          const panY = progress * (scaleVal - 1.0) * scaledClip.height * 0.15;
                          ctx.translate(-panX, -panY);
                          ctx.translate(scaledClip.width / 2, scaledClip.height / 2);
                          ctx.scale(currentScale, currentScale);
                          ctx.translate(-scaledClip.width / 2, -scaledClip.height / 2);
                          break;
                      }
                      case '3d-tilt-forward': {
                          const currentScale = 1.0 + (scaleVal - 1.0) * progress;
                          const tiltY = Math.sin(progress * Math.PI) * (scaleVal - 1.0) * 15;
                          ctx.translate(scaledClip.width / 2, scaledClip.height / 2);
                          ctx.scale(currentScale, currentScale * (1 - tiltY * 0.01));
                          ctx.translate(-scaledClip.width / 2, -scaledClip.height / 2);
                          break;
                      }
                      case 'glitch-zoom': {
                          const stepProgress = Math.floor(progress * 12) / 12;
                          const jitter = (Math.random() - 0.5) * (scaleVal - 1.0) * 8;
                          const currentScale = 1.0 + (scaleVal - 1.0) * stepProgress;
                          ctx.translate(scaledClip.width / 2 + jitter, scaledClip.height / 2 + jitter);
                          ctx.scale(currentScale, currentScale);
                          ctx.translate(-scaledClip.width / 2, -scaledClip.height / 2);
                          break;
                      }
                      case 'spiral-zoom': {
                          const currentScale = 1.0 + (scaleVal - 1.0) * progress;
                          const angle = progress * Math.PI * 0.5 * speed;
                          ctx.translate(scaledClip.width / 2, scaledClip.height / 2);
                          ctx.scale(currentScale, currentScale);
                          ctx.rotate(angle);
                          ctx.translate(-scaledClip.width / 2, -scaledClip.height / 2);
                          break;
                      }
                      case 'whip-zoom-in': {
                          const p = Math.min(1, progress * 3.0);
                          const whipScale = 1.0 + (scaleVal - 1.0) * (1 - Math.pow(1 - p, 4));
                          ctx.translate(scaledClip.width / 2, scaledClip.height / 2);
                          ctx.scale(whipScale, whipScale);
                          ctx.translate(-scaledClip.width / 2, -scaledClip.height / 2);
                          break;
                      }
                      case 'camera-shake-action': {
                          const currentScale = 1.05 + (scaleVal - 1.0) * progress;
                          const freq = timeInClipDisplay * 35 * speed;
                          const shakeX = Math.sin(freq) * 6;
                          const shakeY = Math.cos(freq * 1.3) * 6;
                          ctx.translate(shakeX, shakeY);
                          ctx.translate(scaledClip.width / 2, scaledClip.height / 2);
                          ctx.scale(currentScale, currentScale);
                          ctx.translate(-scaledClip.width / 2, -scaledClip.height / 2);
                          break;
                      }
                      case 'breath-zoom': {
                          const breath = Math.sin(timeInClipDisplay * 1.2 * speed) * (scaleVal - 1.0) * 0.5;
                          const currentScale = 1.05 + breath;
                          ctx.translate(scaledClip.width / 2, scaledClip.height / 2);
                          ctx.scale(currentScale, currentScale);
                          ctx.translate(-scaledClip.width / 2, -scaledClip.height / 2);
                          break;
                      }
                      case 'float-rotate-3d': {
                          const floatY = Math.sin(timeInClipDisplay * 1.8 * speed) * 12;
                          const floatRot = Math.cos(timeInClipDisplay * 1.2 * speed) * 0.05;
                          const currentScale = 1.05 + Math.sin(timeInClipDisplay * 2.2 * speed) * 0.03;
                          ctx.translate(0, floatY);
                          ctx.translate(scaledClip.width / 2, scaledClip.height / 2);
                          ctx.scale(currentScale, currentScale);
                          ctx.rotate(floatRot);
                          ctx.translate(-scaledClip.width / 2, -scaledClip.height / 2);
                          break;
                      }
                      case 'pulse-beat-bass': {
                          const beat = Math.pow(Math.sin((timeInClipDisplay * speed * 3) % Math.PI), 4) * (scaleVal - 1.0);
                          const currentScale = 1.0 + beat;
                          ctx.translate(scaledClip.width / 2, scaledClip.height / 2);
                          ctx.scale(currentScale, currentScale);
                          ctx.translate(-scaledClip.width / 2, -scaledClip.height / 2);
                          break;
                      }
                      case 'retro-vhs-jitter': {
                          const currentScale = 1.05 + (scaleVal - 1.0) * progress;
                          const jitterX = (Math.random() - 0.5) * 4;
                          const jitterY = (Math.random() - 0.5) * 2;
                          ctx.translate(jitterX, jitterY);
                          ctx.translate(scaledClip.width / 2, scaledClip.height / 2);
                          ctx.scale(currentScale, currentScale);
                          ctx.translate(-scaledClip.width / 2, -scaledClip.height / 2);
                          break;
                      }
                      case 'spin-clockwise': {
                          const angle = timeInClipDisplay * 0.5 * speed * Math.PI;
                          ctx.translate(scaledClip.width / 2, scaledClip.height / 2);
                          ctx.rotate(angle);
                          ctx.translate(-scaledClip.width / 2, -scaledClip.height / 2);
                          break;
                      }
                      case 'spin-counter': {
                          const angle = -timeInClipDisplay * 0.5 * speed * Math.PI;
                          ctx.translate(scaledClip.width / 2, scaledClip.height / 2);
                          ctx.rotate(angle);
                          ctx.translate(-scaledClip.width / 2, -scaledClip.height / 2);
                          break;
                      }
                      case 'float': {
                          const amplitude = (scaleVal - 1.0) * scaledClip.height * 0.15 + 10;
                          const offset = Math.sin(timeInClipDisplay * Math.PI * speed) * amplitude;
                          ctx.translate(0, offset);
                          break;
                      }
                      case 'pulse': {
                          const amplitude = (scaleVal - 1.0) / 2;
                          const currentScale = 1.0 + amplitude + Math.sin(timeInClipDisplay * Math.PI * 2 * speed) * amplitude;
                          ctx.translate(scaledClip.width / 2, scaledClip.height / 2);
                          ctx.scale(currentScale, currentScale);
                          ctx.translate(-scaledClip.width / 2, -scaledClip.height / 2);
                          break;
                      }
                      case 'shake': {
                          const amplitude = (scaleVal - 1.0) * 10 + 2;
                          const seedX = Math.sin(timeInClipDisplay * 50 * speed) * amplitude;
                          const seedY = Math.cos(timeInClipDisplay * 40 * speed) * amplitude;
                          ctx.translate(seedX, seedY);
                          break;
                      }
                      case 'heartbeat': {
                          const t = (timeInClipDisplay * speed) % 1.5;
                          let s = 1.0;
                          const strength = (scaleVal - 1.0) * 0.8;
                          if (t < 0.15) { s = 1.0 + (t / 0.15) * (strength * 0.8); }
                          else if (t < 0.3) { s = (1.0 + strength * 0.8) - ((t - 0.15) / 0.15) * (strength * 0.4); }
                          else if (t < 0.45) { s = (1.0 + strength * 0.4) + ((t - 0.3) / 0.15) * strength; }
                          else if (t < 0.75) { s = (1.0 + strength * 1.4) - ((t - 0.45) / 0.30) * (strength * 1.4); }
                          ctx.translate(scaledClip.width / 2, scaledClip.height / 2);
                          ctx.scale(s, s);
                          ctx.translate(-scaledClip.width / 2, -scaledClip.height / 2);
                          break;
                      }
                      case 'bounce': {
                          const bouncePeriod = 1.0 / speed;
                          const t = timeInClipDisplay % bouncePeriod;
                          const normT = t / bouncePeriod;
                          const heightVal = Math.sin(normT * Math.PI) * (scaleVal - 1.0) * scaledClip.height * 0.3;
                          ctx.translate(0, -Math.abs(heightVal));
                          break;
                      }
                      case 'slide-in': {
                          const slideDuration = 0.5 / speed;
                          if (timeInClipDisplay < slideDuration) {
                              const p = timeInClipDisplay / slideDuration;
                              const ease = 1 - Math.pow(1 - p, 3); // easeOutCubic
                              const offset = (1 - ease) * scaledClip.height;
                              ctx.translate(0, offset);
                              ctx.globalAlpha = ctx.globalAlpha * p;
                          }
                          break;
                      }
                  }
              }

              try {
                  ctx.drawImage(el, 0, 0, scaledClip.width, scaledClip.height);
              } catch (drawErr) {
                  if (el.tagName === 'VIDEO' && (el as HTMLVideoElement).error) {
                      try { (el as HTMLVideoElement).load(); } catch (_) {}
                  }
              }
              ctx.restore(); // Restore from pulse and CSS filters
              
              // Apply canvas effects over the top
              if (canvasEffects.vignette) {
                const amount = canvasEffects.vignette / 100;
                const outerRadius = Math.sqrt(scaledClip.width**2 + scaledClip.height**2) / 2;
                const gradient = ctx.createRadialGradient(
                    scaledClip.width/2, scaledClip.height/2, outerRadius * (1 - amount),
                    scaledClip.width/2, scaledClip.height/2, outerRadius
                );
                gradient.addColorStop(0, 'rgba(0,0,0,0)');
                gradient.addColorStop(1, `rgba(0,0,0,${amount * 1.2})`);
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, scaledClip.width, scaledClip.height);
              }
              if (canvasEffects.letterbox) {
                  const barHeight = (scaledClip.height * (canvasEffects.letterbox / 100)) / 2;
                  ctx.fillStyle = 'black';
                  ctx.fillRect(0, 0, scaledClip.width, barHeight);
                  ctx.fillRect(0, scaledClip.height - barHeight, scaledClip.width, barHeight);
              }
              break;
      }
      ctx.restore();
  };

  useImperativeHandle(ref, () => ({
    precueVideoClip(clip, targetTime) {
        const videoEl = getMediaElementForClip(clip) as HTMLVideoElement;
        if (!videoEl || videoEl.tagName !== 'VIDEO') return;
        // Never precue an element that is actively playing or already seeking
        if (!videoEl.paused || videoEl.seeking) return;
        if (videoEl.readyState < 1) return;
        const target = targetTime !== undefined ? targetTime : clip.startTime;
        if (Math.abs(videoEl.currentTime - target) > 0.05) {
            const now = Date.now();
            const timeSincePrecue = now - ((videoEl as any)._lastPrecueTime || 0);
            if (timeSincePrecue > 400) {
                (videoEl as any)._lastPrecueTime = now;
                try { videoEl.currentTime = target; } catch (_) {}
            }
        }
    },

    playVideoAtTime(clip, timeInClip) {
        const videoEl = getMediaElementForClip(clip) as HTMLVideoElement;
        if (!videoEl || videoEl.tagName !== 'VIDEO') return;

        videoEl.muted = true;
        videoEl.playsInline = true;

        const clipSpeed = clip.speed || 1.0;
        const rawDuration = videoEl.duration;
        const hasValidDuration = rawDuration && !isNaN(rawDuration) && isFinite(rawDuration) && rawDuration > 0;
        const maxVideoTime = hasValidDuration ? Math.max(0, Math.min(clip.endTime, rawDuration - 0.03)) : clip.endTime;
        const targetVideoTime = Math.max(clip.startTime, Math.min(clip.startTime + timeInClip * clipSpeed, maxVideoTime));

        if (Math.abs(videoEl.playbackRate - clipSpeed) > 0.01) {
            videoEl.playbackRate = clipSpeed;
        }

        // Set starting currentTime only on initial play / seek if drift is noticeable (> 70ms)
        if (!videoEl.seeking && Math.abs(videoEl.currentTime - targetVideoTime) > 0.07) {
            try { 
                videoEl.currentTime = targetVideoTime; 
                (videoEl as any)._lastHardSeekTime = Date.now();
            } catch (_) {}
        }

        const now = Date.now();
        const timeSinceAttempt = now - ((videoEl as any)._lastPlayAttempt || 0);

        if ((videoEl.paused || videoEl.ended) && !(videoEl as any)._isPlayPending && timeSinceAttempt > 40) {
            (videoEl as any)._isPlayPending = true;
            (videoEl as any)._lastPlayAttempt = now;
            const playPromise = videoEl.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => { (videoEl as any)._isPlayPending = false; })
                    .catch(() => { (videoEl as any)._isPlayPending = false; });
            } else {
                (videoEl as any)._isPlayPending = false;
            }
        }
    },

    syncVideoAtTime(clip, timeInClip) {
        const videoEl = getMediaElementForClip(clip) as HTMLVideoElement;
        if (!videoEl || videoEl.tagName !== 'VIDEO') return;

        const clipSpeed = clip.speed || 1.0;
        const rawDuration = videoEl.duration;
        const hasValidDuration = rawDuration && !isNaN(rawDuration) && isFinite(rawDuration) && rawDuration > 0;
        const maxVideoTime = hasValidDuration ? Math.max(0, Math.min(clip.endTime, rawDuration - 0.03)) : clip.endTime;
        const targetVideoTime = Math.max(clip.startTime, Math.min(clip.startTime + timeInClip * clipSpeed, maxVideoTime));

        const now = Date.now();
        const isNearEnd = targetVideoTime >= maxVideoTime - 0.05;

        // If the video got paused or ended prematurely while it should still play
        if ((videoEl.paused || videoEl.ended) && !isNearEnd && !videoEl.seeking) {
            const timeSinceAttempt = now - ((videoEl as any)._lastPlayAttempt || 0);
            if (!(videoEl as any)._isPlayPending && timeSinceAttempt > 80) {
                (videoEl as any)._isPlayPending = true;
                (videoEl as any)._lastPlayAttempt = now;
                if (Math.abs(videoEl.playbackRate - clipSpeed) > 0.01) {
                    videoEl.playbackRate = clipSpeed;
                }
                const playPromise = videoEl.play();
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => { (videoEl as any)._isPlayPending = false; })
                        .catch(() => { (videoEl as any)._isPlayPending = false; });
                } else {
                    (videoEl as any)._isPlayPending = false;
                }
            }
            return;
        }

        // When video is actively playing, perform smooth rate-nudging sync (NO continuous seeking loops)
        if (!videoEl.paused && !videoEl.seeking) {
            const diff = targetVideoTime - videoEl.currentTime; // > 0 means video is behind target
            const drift = Math.abs(diff);

            if (drift > 0.45) {
                // Major timeline jump: perform throttled hard seek
                const timeSinceLastSeek = now - ((videoEl as any)._lastHardSeekTime || 0);
                if (timeSinceLastSeek > 500) {
                    try { 
                        videoEl.currentTime = targetVideoTime; 
                        (videoEl as any)._lastHardSeekTime = now;
                    } catch (_) {}
                    if (Math.abs(videoEl.playbackRate - clipSpeed) > 0.01) {
                        videoEl.playbackRate = clipSpeed;
                    }
                }
            } else if (drift > 0.04) {
                // Smooth dynamic rate adjustment: video gently catches up or slows down seamlessly without seeking
                const nudgeFactor = Math.max(0.85, Math.min(1.15, 1.0 + diff * 0.35));
                const dynamicRate = clipSpeed * nudgeFactor;
                if (Math.abs(videoEl.playbackRate - dynamicRate) > 0.02) {
                    videoEl.playbackRate = dynamicRate;
                }
            } else {
                if (Math.abs(videoEl.playbackRate - clipSpeed) > 0.02) {
                    videoEl.playbackRate = clipSpeed;
                }
            }
        }
    },

    pauseAllVideos() {
        videoElementsRef.current.forEach(el => {
            if (el.tagName === 'VIDEO') {
                const v = el as HTMLVideoElement;
                (v as any)._isPlayPending = false;
                if (!v.paused) {
                    try { v.pause(); } catch (_) {}
                }
            }
        });
    },

    pauseVideosByIds(clipIds: string[]) {
        for (const clipId of clipIds) {
            const el = videoElementsRef.current.get(clipId);
            if (el && el.tagName === 'VIDEO') {
                const v = el as HTMLVideoElement;
                (v as any)._isPlayPending = false;
                if (!v.paused) {
                    try { v.pause(); } catch (_) {}
                }
            }
        }
    },
    
    drawForPlayback(projectStateForFrame, analyserFrame, time) {
        lastDrawIdRef.current++; // Invalidate any pending scrub draws
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;
        
        const effectForTime = findOverlayEffectForTime(time, projectStateForFrame);
        overlayRef.current?.updateEffect(effectForTime);
        
        const renderer = overlayRef.current?.renderer;
        const deltaTime = time - lastFrameTimeRef.current;
        lastFrameTimeRef.current = time;
        overlayRef.current?.update(analyserFrame, deltaTime);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        if (renderer) {
            renderer.applyPreDrawTransforms(ctx, deltaTime);
        }
        
        const allActiveClips = projectStateForFrame.timelineClips.filter(clip => {
            const visualTypes: VideoClipType[] = ['video', 'image', 'text', 'spectrum', 'shape', 'emoji'];
            if (!visualTypes.includes(clip.type)) return false;

            const clipEnd = clip.timelineStart + (clip.endTime - clip.startTime) / (clip.speed || 1);

            const hasNextClipAtSameTrack = projectStateForFrame.timelineClips.some(other => other.id !== clip.id && other.trackId === clip.trackId && Math.abs(other.timelineStart - clipEnd) < 0.05);
            const isDirectlyActive = time >= clip.timelineStart && (time < clipEnd || (time <= clipEnd && !hasNextClipAtSameTrack));

            const isPartOfTransition = projectStateForFrame.timelineTransitions.some(t => {
                if (t.clipBId === clip.id) {
                    const clipA = projectStateForFrame.timelineClips.find(c => c.id === t.clipAId);
                    if (!clipA) return false;
                    const transitionEnd = clipA.timelineStart + (clipA.endTime - clipA.startTime) / (clipA.speed || 1);
                    const transitionStart = transitionEnd - t.duration;
                    return time >= transitionStart && time <= transitionEnd;
                }
                if (t.clipAId === clip.id) {
                    const transitionEnd = clipEnd;
                    const transitionStart = transitionEnd - t.duration;
                    return time >= transitionStart && time <= transitionEnd;
                }
                return false;
            });

            return isDirectlyActive || isPartOfTransition;
        });

        const localTrackOrder = [...projectStateForFrame.tracks].map(t => t.id);
        allActiveClips.sort((a, b) => localTrackOrder.indexOf(b.trackId) - localTrackOrder.indexOf(a.trackId));

        const clipsDrawnInTransition = new Set<string>();

        for (const clip of allActiveClips) {
            if (clip.id === projectStateForFrame.selectedClipIds[0] && (clip.type === 'text' || clip.type === 'emoji' || clip.type === 'shape')) {
                continue; // Don't draw on main canvas, it's handled by the interactive overlay
            }

            if (clipsDrawnInTransition.has(clip.id)) continue;
            
            const activeTransition = projectStateForFrame.timelineTransitions.find(t => {
                if (t.clipAId !== clip.id) return false;
                const clipA_displayDuration = (clip.endTime - clip.startTime) / (clip.speed || 1);
                const transitionEnd = clip.timelineStart + clipA_displayDuration;
                const transitionStart = transitionEnd - t.duration;
                return time >= transitionStart && time <= transitionEnd;
            });
            
            if (activeTransition) {
                const clipA = clip;
                const clipB = projectStateForFrame.timelineClips.find(c => c.id === activeTransition.clipBId);

                if (!clipB) { drawVisualClip(ctx, clipA, time, analyserFrame); continue; }
                clipsDrawnInTransition.add(clipB.id);

                const clipA_displayDuration = (clipA.endTime - clipA.startTime) / (clipA.speed || 1);
                const transitionEnd = clipA.timelineStart + clipA_displayDuration;
                const transitionStart = transitionEnd - activeTransition.duration;
                const progress = (time - transitionStart) / activeTransition.duration;
                const isFade = activeTransition.type === 'fade' || activeTransition.type === 'dissolve';
                const isZoomOut = activeTransition.type === 'zoom-out';
                const isFlash = activeTransition.type === 'flash-white';
                const isSlideMotion = activeTransition.type === 'slide-motion';
                const isZoomShake = activeTransition.type === 'zoom-shake';
                const isSwirl = activeTransition.type === 'swirl';
                const isGlitch = activeTransition.type === 'glitch';
                const isLiquidFlow = activeTransition.type === 'liquid-flow';
                const isLightSweep = activeTransition.type === 'light-sweep';

                if (isGlitch) {
                    const glitchAmount = Math.sin(progress * Math.PI); // 0 -> 1 -> 0
                    const { width, height } = canvas;
                    
                    const baseClip = progress < 0.5 ? clipA : clipB;
                    const secondaryClip = progress < 0.5 ? clipB : clipA;
                    drawVisualClip(ctx, baseClip, time, analyserFrame);
                    
                    ctx.save();
                    if (secondaryClip) {
                        for (let i = 0; i < 3; i++) {
                            if (Math.random() < glitchAmount * 0.5) {
                                ctx.save();
                                const y = Math.random() * height;
                                const h = (Math.random() * height / 8) + 10;
                                ctx.beginPath();
                                ctx.rect(0, y, width, h);
                                ctx.clip();
                                const xOffset = (Math.random() - 0.5) * 50 * glitchAmount;
                                ctx.translate(xOffset, 0);
                                drawVisualClip(ctx, secondaryClip, time, analyserFrame);
                                ctx.restore();
                            }
                        }
                    }
                    for (let i = 0; i < 5; i++) {
                        if (Math.random() < glitchAmount) {
                            const y = Math.random() * height;
                            const h = (Math.random() * height / 20) + 2;
                            const xOffset = (Math.random() - 0.5) * 50 * glitchAmount;
                            ctx.drawImage(canvas, 0, y, width, h, xOffset, y, width, h);
                        }
                    }

                    const offset = glitchAmount * 6;
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.globalAlpha = glitchAmount * 0.25;
                    ctx.fillStyle = '#ff003c';
                    ctx.fillRect(offset, 0, width, height);
                    ctx.fillStyle = '#00ffc8';
                    ctx.fillRect(-offset, 0, width, height);
                    ctx.restore();

                    ctx.save();
                    ctx.globalAlpha = glitchAmount * 0.1;
                    for (let i = 0; i < 40; i++) {
                        const y = Math.random() * height;
                        const h = Math.random() * 3 + 1;
                        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.4})`;
                        ctx.fillRect(0, y, width, h);
                    }
                    ctx.restore();
                } else if (isZoomShake) {
                    const shakeIntensity = 30; // pixels
                    const blurIntensity = 8; // pixels
                
                    const shakeX = (Math.random() - 0.5) * shakeIntensity * Math.sin(progress * Math.PI);
                    const shakeY = (Math.random() - 0.5) * shakeIntensity * Math.sin(progress * Math.PI);
                
                    // Draw outgoing clip (A)
                    ctx.save();
                    const scaleOut = 1.0 + progress * 0.1;
                    const blurOut = progress * blurIntensity;
                    ctx.globalAlpha = 1 - progress;
                    if (blurOut > 0.5) ctx.filter = `blur(${blurOut}px)`;
                    ctx.translate(canvas.width / 2, canvas.height / 2);
                    ctx.scale(scaleOut, scaleOut);
                    ctx.translate(-canvas.width / 2, -canvas.height / 2);
                    ctx.translate(shakeX, shakeY);
                    drawVisualClip(ctx, clipA, time, analyserFrame);
                    ctx.restore();
                
                    // Draw incoming clip (B)
                    ctx.save();
                    const scaleIn = 1.2 - 0.2 * progress;
                    const blurIn = (1 - progress) * blurIntensity;
                    ctx.globalAlpha = progress;
                    if (blurIn > 0.5) ctx.filter = `blur(${blurIn}px)`;
                    ctx.translate(canvas.width / 2, canvas.height / 2);
                    ctx.scale(scaleIn, scaleIn);
                    ctx.translate(-canvas.width / 2, -canvas.height / 2);
                    ctx.translate(shakeX, shakeY);
                    drawVisualClip(ctx, clipB, time, analyserFrame);
                    ctx.restore();
                } else if (isSwirl) {
                    const angle = 25; // degrees
                    const blurAmount = Math.sin(progress * Math.PI) * 4; // 4px max blur (leve)
            
                    // Draw outgoing clip (A)
                    ctx.save();
                    const scaleOut = 1 + progress * 0.2; // slight zoom out
                    const rotationOut = progress * angle;
                    if (blurAmount > 0.5) ctx.filter = `blur(${blurAmount}px)`;
                    ctx.globalAlpha = 1 - progress;
                    ctx.translate(canvas.width / 2, canvas.height / 2);
                    ctx.scale(scaleOut, scaleOut);
                    ctx.rotate(rotationOut * Math.PI / 180);
                    ctx.translate(-canvas.width / 2, -canvas.height / 2);
                    drawVisualClip(ctx, clipA, time, analyserFrame);
                    ctx.restore();
            
                    // Draw incoming clip (B)
                    ctx.save();
                    const scaleIn = 1.2 - progress * 0.2; // zoom in from slightly larger
                    const rotationIn = -angle + progress * angle;
                    if (blurAmount > 0.5) ctx.filter = `blur(${blurAmount}px)`;
                    ctx.globalAlpha = progress;
                    ctx.translate(canvas.width / 2, canvas.height / 2);
                    ctx.scale(scaleIn, scaleIn);
                    ctx.rotate(rotationIn * Math.PI / 180);
                    ctx.translate(-canvas.width / 2, -canvas.height / 2);
                    drawVisualClip(ctx, clipB, time, analyserFrame);
                    ctx.restore();
                } else if (isLiquidFlow) {
                    const maxAmplitude = canvas.width * 0.15; // medium intensity
                    const frequency = 6 * Math.PI / canvas.height; // smooth speed
                    const waveSpeed = 2;
            
                    const drawDistortedImage = (imageSource: CanvasImageSource, distortionProgress: number, alpha: number) => {
                        const amplitude = Math.sin(distortionProgress * Math.PI / 2) * maxAmplitude;
                        ctx.globalAlpha = alpha;
                        if (alpha <= 0) return;
            
                        let sourceWidth: number, sourceHeight: number;
                        if ('displayWidth' in imageSource) { // VideoFrame
                            sourceWidth = imageSource.displayWidth;
                            sourceHeight = imageSource.displayHeight;
                        } else if ('videoWidth' in imageSource && imageSource.videoWidth > 0) { // HTMLVideoElement
                            sourceWidth = imageSource.videoWidth;
                            sourceHeight = imageSource.videoHeight;
                        } else { // HTMLImageElement, HTMLCanvasElement, ImageBitmap, SVGImageElement
                            // FIX: Handle SVGAnimatedLength which can be returned for width/height on SVG elements.
                            const w = imageSource.width;
                            const h = imageSource.height;
                            sourceWidth = typeof w === 'number' ? w : w.baseVal.value;
                            sourceHeight = typeof h === 'number' ? h : h.baseVal.value;
                        }
                    
                        if(!sourceWidth || !sourceHeight) return;

                        const sliceHeight = 4; // Tweak for performance vs quality
                        for (let y = 0; y < canvas.height; y += sliceHeight) {
                            const waveOffset = Math.sin((y * frequency) + (time * waveSpeed)) * amplitude;
                            
                            const sourceY = Math.floor((y / canvas.height) * sourceHeight);
                            const sourceSliceHeight = Math.ceil((sliceHeight / canvas.height) * sourceHeight);
                            
                            if (sourceY < 0 || sourceY + sourceSliceHeight > sourceHeight) continue;
            
                            ctx.drawImage(
                                imageSource,
                                0, sourceY, sourceWidth, sourceSliceHeight,
                                waveOffset, y, canvas.width, sliceHeight
                            );
                        }
                    };
            
                    // Draw clip A (outgoing)
                    const imageSourceA = getMediaElementForClip(clipA);
                    if (imageSourceA && (imageSourceA.tagName === 'VIDEO' || imageSourceA.tagName === 'IMG')) {
                        drawDistortedImage(imageSourceA, progress, 1 - progress);
                    } else { // Fallback for text, shapes, etc.
                        ctx.save();
                        ctx.globalAlpha = 1 - progress;
                        drawVisualClip(ctx, clipA, time, analyserFrame);
                        ctx.restore();
                    }
            
                    // Draw clip B (incoming)
                    const imageSourceB = getMediaElementForClip(clipB);
                    if (imageSourceB && (imageSourceB.tagName === 'VIDEO' || imageSourceB.tagName === 'IMG')) {
                        drawDistortedImage(imageSourceB, 1 - progress, progress);
                    } else { // Fallback for text, shapes, etc.
                        ctx.save();
                        ctx.globalAlpha = progress;
                        drawVisualClip(ctx, clipB, time, analyserFrame);
                        ctx.restore();
                    }
                } else if (isLightSweep) {
                    const sweepWidth = canvas.width * 0.25;
                    const sweepPosition = progress * canvas.width;
            
                    // 1. Draw outgoing clip
                    drawVisualClip(ctx, clipA, time, analyserFrame);
            
                    // 2. Draw incoming clip, clipped
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(0, 0, sweepPosition, canvas.height);
                    ctx.clip();
                    drawVisualClip(ctx, clipB, time, analyserFrame);
                    ctx.restore();
            
                    // 3. Draw the light sweep effect
                    ctx.save();
                    const intensity = Math.sin(progress * Math.PI);
                    
                    const gradient = ctx.createLinearGradient(sweepPosition - sweepWidth / 2, 0, sweepPosition + sweepWidth / 2, 0);
                    gradient.addColorStop(0, `rgba(255, 255, 255, 0)`);
                    gradient.addColorStop(0.5, `rgba(255, 255, 255, ${intensity * 0.9})`);
                    gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
                    
                    ctx.fillStyle = gradient;
                    ctx.shadowColor = 'white';
                    ctx.shadowBlur = 30;
            
                    ctx.fillRect(sweepPosition - sweepWidth / 2, 0, sweepWidth, canvas.height);
                    ctx.restore();
                } else if (isSlideMotion) {
                    const blurAmount = Math.sin(progress * Math.PI) * 15; // Medium blur

                    // Draw outgoing clip (A)
                    ctx.save();
                    if (blurAmount > 0.5) ctx.filter = `blur(${blurAmount}px)`;
                    ctx.translate(-canvas.width * progress, 0);
                    drawVisualClip(ctx, clipA, time, analyserFrame);
                    ctx.restore();

                    // Draw incoming clip (B)
                    ctx.save();
                    if (blurAmount > 0.5) ctx.filter = `blur(${blurAmount}px)`;
                    ctx.translate(canvas.width * (1 - progress), 0);
                    drawVisualClip(ctx, clipB, time, analyserFrame);
                    ctx.restore();
                } else if (isFlash) {
                    if (progress < 0.5) {
                        drawVisualClip(ctx, clipA, time, analyserFrame);
                    } else {
                        drawVisualClip(ctx, clipB, time, analyserFrame);
                    }
                    const flashOpacity = Math.sin(progress * Math.PI);
                    ctx.save();
                    ctx.fillStyle = `rgba(255, 255, 255, ${flashOpacity})`;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.restore();
                } else if (isFade) {
                    ctx.save(); ctx.globalAlpha = 1 - progress;
                    drawVisualClip(ctx, clipA, time, analyserFrame);
                    ctx.restore();
                    
                    ctx.save(); ctx.globalAlpha = progress;
                    drawVisualClip(ctx, clipB, time, analyserFrame);
                    ctx.restore();
                } else if (isZoomOut) {
                    // For zoom-out, we draw B first, then A on top with the transform
                    drawVisualClip(ctx, clipB, time, analyserFrame);
                    ctx.save();
                    
                    // The effect needs to be inverted for clip A. Progress goes from 0 to 1. Scale should go from 1 to 0.
                    const scale = 1 - progress;
                    ctx.translate(canvas.width / 2, canvas.height / 2);
                    ctx.scale(scale, scale);
                    ctx.translate(-canvas.width / 2, -canvas.height / 2);

                    // Blur amount should increase as it zooms out.
                    const blurAmount = progress * 15;
                    if (blurAmount > 0.5) {
                        ctx.filter = `blur(${blurAmount}px)`;
                    }

                    drawVisualClip(ctx, clipA, time, analyserFrame);
                    ctx.restore();
                } else {
                    drawVisualClip(ctx, clipA, time, analyserFrame);
                    ctx.save();
                    applyTransitionEffect(ctx, activeTransition.type, progress, canvas.width, canvas.height);
                    drawVisualClip(ctx, clipB, time, analyserFrame);
                    ctx.restore();
                }
            } else {
                 drawVisualClip(ctx, clip, time, analyserFrame);
            }
        }
  
        ctx.restore(); // Restore from pre-draw transforms

        if (renderer) {
            renderer.drawOverlays(ctx, analyserFrame, deltaTime);
        }
        
        drawAnimatedBorder(ctx, projectStateForFrame.scene?.animatedBorder, analyserFrame, canvas.width, canvas.height, time);

    },

    drawForScrubbing(projectStateForFrame, analyserFrame, time, requestId) {
      if (requestId !== undefined) {
        lastDrawIdRef.current = requestId;
      }
      lastScrubArgsRef.current = { projectStateForFrame, analyserFrame, time };

      const effectForTime = findOverlayEffectForTime(time, projectStateForFrame);
      overlayRef.current?.updateEffect(effectForTime);

      const renderer = overlayRef.current?.renderer;
      if (renderer) {
          renderer.setTimeForScrub(time);
          renderer.update(analyserFrame, 0);
      }
      
      const allActiveClips = projectStateForFrame.timelineClips.filter(clip => {
          const visualTypes: VideoClipType[] = ['video', 'image', 'text', 'spectrum', 'shape', 'emoji'];
          if (!visualTypes.includes(clip.type)) return false;

          const clipEnd = clip.timelineStart + (clip.endTime - clip.startTime) / (clip.speed || 1);
          const hasNextClipAtSameTrack = projectStateForFrame.timelineClips.some(other => other.id !== clip.id && other.trackId === clip.trackId && Math.abs(other.timelineStart - clipEnd) < 0.05);
          const isDirectlyActive = time >= clip.timelineStart && (time < clipEnd || (time <= clipEnd && !hasNextClipAtSameTrack));

          const isPartOfTransition = projectStateForFrame.timelineTransitions.some(t => {
              if (t.clipBId === clip.id) {
                  const clipA = projectStateForFrame.timelineClips.find(c => c.id === t.clipAId);
                  if (!clipA) return false;
                  const transitionEnd = clipA.timelineStart + (clipA.endTime - clipA.startTime) / (clipA.speed || 1);
                  const transitionStart = transitionEnd - t.duration;
                  return time >= transitionStart && time <= transitionEnd;
              }
              if (t.clipAId === clip.id) {
                  const transitionEnd = clipEnd;
                  const transitionStart = transitionEnd - t.duration;
                  return time >= transitionStart && time <= transitionEnd;
              }
              return false;
          });
          return isDirectlyActive || isPartOfTransition;
      });

      // Synchronously set video element currentTime for all active clips without blocking
      allActiveClips.forEach(clip => {
          const src = clip.src || projectStateForFrame.mediaPool?.find(mp => mp.id === clip.poolId)?.src;
          if (clip.type === 'video' && src) {
              const el = getMediaElementForClip(clip) as HTMLVideoElement;
              if (el && el.tagName === 'VIDEO') {
                  if (!el.paused) {
                      try { el.pause(); } catch (_) {}
                  }
                  if (el.readyState === 0 && (el.networkState === 0 || el.networkState === 3)) {
                      try { el.load(); } catch (_) {}
                  }
                  let targetTime: number;
                  const incomingTransition = projectStateForFrame.timelineTransitions.find(t => {
                      const clipA = projectStateForFrame.timelineClips.find(c => c.id === t.clipAId);
                      if (!clipA || t.clipBId !== clip.id) return false;
                      const transitionEnd = clipA.timelineStart + (clipA.endTime - clipA.startTime) / (clipA.speed || 1);
                      const transitionStart = transitionEnd - t.duration;
                      return time >= transitionStart && time <= transitionEnd;
                  });

                  if (incomingTransition) {
                      const clipA = projectStateForFrame.timelineClips.find(c => c.id === incomingTransition.clipAId)!;
                      const transitionEnd = clipA.timelineStart + (clipA.endTime - clipA.startTime) / (clipA.speed || 1);
                      const transitionStart = transitionEnd - incomingTransition.duration;
                      const progress = (time - transitionStart) / incomingTransition.duration;
                      targetTime = clip.startTime + (progress * incomingTransition.duration * (clip.speed || 1));
                  } else {
                      const timeInClip = (time - clip.timelineStart) * (clip.speed || 1);
                      targetTime = clip.startTime + timeInClip;
                  }

                  const rawDuration = el.duration;
                  const hasValidDuration = rawDuration && !isNaN(rawDuration) && isFinite(rawDuration) && rawDuration > 0;
                  const maxVideoTime = hasValidDuration ? Math.min(clip.endTime, rawDuration - 0.05) : clip.endTime - 0.05;
                  let targetVideoTime = Math.max(clip.startTime, Math.min(targetTime, maxVideoTime));

                  if (Math.abs(el.currentTime - targetVideoTime) > 0.01) {
                      try { el.currentTime = targetVideoTime; } catch (_) {}
                  }
              }
          }
      });

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      if (renderer) {
          renderer.applyPreDrawTransforms(ctx, 0);
      }

      const localTrackOrder = [...projectStateForFrame.tracks].map(t => t.id);
      allActiveClips.sort((a, b) => localTrackOrder.indexOf(b.trackId) - localTrackOrder.indexOf(a.trackId));
      
      const drawScrubClip = (targetClip: VideoClip, alpha?: number) => {
          ctx.save();
          if (alpha !== undefined) ctx.globalAlpha = (ctx.globalAlpha || 1) * alpha;
          drawVisualClip(ctx, targetClip, time, analyserFrame);
          ctx.restore();
      };
      const clipsDrawnInTransition = new Set<string>();
      for (const clip of allActiveClips) {
          if (clip.id === projectStateForFrame.selectedClipIds[0] && (clip.type === 'text' || clip.type === 'emoji' || clip.type === 'shape')) {
              continue; 
          }

          if (clipsDrawnInTransition.has(clip.id)) continue;
          const activeTransition = projectStateForFrame.timelineTransitions.find(t => {
              if (t.clipAId !== clip.id) return false;
              const clipA_displayDuration = (clip.endTime - clip.startTime) / (clip.speed || 1);
              const transitionEnd = clip.timelineStart + clipA_displayDuration;
              const transitionStart = transitionEnd - t.duration;
              return time >= transitionStart && time <= transitionEnd;
          });
          if (activeTransition) {
              const clipA = clip;
              const clipB = projectStateForFrame.timelineClips.find(c => c.id === activeTransition.clipBId);
              if (!clipB) { drawScrubClip(clipA); continue; }
              clipsDrawnInTransition.add(clipB.id);
              const clipA_displayDuration = (clipA.endTime - clipA.startTime) / (clipA.speed || 1);
              const transitionEnd = clipA.timelineStart + clipA_displayDuration;
              const transitionStart = transitionEnd - activeTransition.duration;
              const progress = (time - transitionStart) / activeTransition.duration;
              const isFade = activeTransition.type === 'fade' || activeTransition.type === 'dissolve';
              const isZoomOut = activeTransition.type === 'zoom-out';
              const isFlash = activeTransition.type === 'flash-white';
              const isSlideMotion = activeTransition.type === 'slide-motion';
              const isZoomShake = activeTransition.type === 'zoom-shake';
              const isSwirl = activeTransition.type === 'swirl';
              const isGlitch = activeTransition.type === 'glitch';
              const isLiquidFlow = activeTransition.type === 'liquid-flow';
              const isLightSweep = activeTransition.type === 'light-sweep';
              
              if (isGlitch) {
                  const glitchAmount = Math.sin(progress * Math.PI);
                  const { width, height } = canvas;
                  const baseClip = progress < 0.5 ? clipA : clipB;
                  const secondaryClip = progress < 0.5 ? clipB : clipA;
                  drawScrubClip(baseClip);
                  
                  ctx.save();
                  if (secondaryClip) {
                      for (let i = 0; i < 3; i++) {
                          if (Math.random() < glitchAmount * 0.5) {
                              ctx.save();
                              const y = Math.random() * height;
                              const h = (Math.random() * height / 8) + 10;
                              ctx.beginPath();
                              ctx.rect(0, y, width, h);
                              ctx.clip();
                              const xOffset = (Math.random() - 0.5) * 50 * glitchAmount;
                              ctx.translate(xOffset, 0);
                              drawScrubClip(secondaryClip);
                              ctx.restore();
                          }
                      }
                  }
                  for (let i = 0; i < 5; i++) {
                      if (Math.random() < glitchAmount) {
                          const y = Math.random() * height;
                          const h = (Math.random() * height / 20) + 2;
                          const xOffset = (Math.random() - 0.5) * 50 * glitchAmount;
                          ctx.drawImage(ctx.canvas, 0, y, width, h, xOffset, y, width, h);
                      }
                  }

                  const offset = glitchAmount * 6;
                  ctx.globalCompositeOperation = 'lighter';
                  ctx.globalAlpha = glitchAmount * 0.25;
                  ctx.fillStyle = '#ff003c';
                  ctx.fillRect(offset, 0, width, height);
                  ctx.fillStyle = '#00ffc8';
                  ctx.fillRect(-offset, 0, width, height);
                  ctx.restore();

                  ctx.save();
                  ctx.globalAlpha = glitchAmount * 0.1;
                  for (let i = 0; i < 40; i++) {
                      const y = Math.random() * height;
                      const h = Math.random() * 3 + 1;
                      ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.4})`;
                      ctx.fillRect(0, y, width, h);
                  }
                  ctx.restore();
              } else if (isZoomShake) {
                const { width, height } = ctx.canvas;
                const shakeIntensity = 30;
                const blurIntensity = 8;
                const shakeX = (Math.random() - 0.5) * shakeIntensity * Math.sin(progress * Math.PI);
                const shakeY = (Math.random() - 0.5) * shakeIntensity * Math.sin(progress * Math.PI);
            
                // Draw A
                ctx.save();
                const scaleOut = 1.0 + progress * 0.1;
                const blurOut = progress * blurIntensity;
                if (blurOut > 0.5) ctx.filter = `blur(${blurOut}px)`;
                ctx.translate(width / 2, height / 2);
                ctx.scale(scaleOut, scaleOut);
                ctx.translate(-width / 2, -height / 2);
                ctx.translate(shakeX, shakeY);
                drawScrubClip(clipA, 1 - progress);
                ctx.restore();
                
                // Draw B
                ctx.save();
                const scaleIn = 1.2 - 0.2 * progress;
                const blurIn = (1 - progress) * blurIntensity;
                if (blurIn > 0.5) ctx.filter = `blur(${blurIn}px)`;
                ctx.translate(width / 2, height / 2);
                ctx.scale(scaleIn, scaleIn);
                ctx.translate(-width / 2, -height / 2);
                ctx.translate(shakeX, shakeY);
                drawScrubClip(clipB, progress);
                ctx.restore();
              } else if (isSwirl) {
                const { width, height } = ctx.canvas;
                const angle = 25;
                const blurAmount = Math.sin(progress * Math.PI) * 4;
        
                // Draw A
                ctx.save();
                const scaleOut = 1 + progress * 0.2;
                const rotationOut = progress * angle;
                if (blurAmount > 0.5) ctx.filter = `blur(${blurAmount}px)`;
                ctx.translate(width / 2, height / 2);
                ctx.scale(scaleOut, scaleOut);
                ctx.rotate(rotationOut * Math.PI / 180);
                ctx.translate(-width / 2, -height / 2);
                drawScrubClip(clipA, 1 - progress);
                ctx.restore();
                
                // Draw B
                ctx.save();
                const scaleIn = 1.2 - progress * 0.2;
                const rotationIn = -angle + progress * angle;
                if (blurAmount > 0.5) ctx.filter = `blur(${blurAmount}px)`;
                ctx.translate(width / 2, height / 2);
                ctx.scale(scaleIn, scaleIn);
                ctx.rotate(rotationIn * Math.PI / 180);
                ctx.translate(-width / 2, -height / 2);
                drawScrubClip(clipB, progress);
                ctx.restore();
              } else if (isLiquidFlow) {
                    const maxAmplitude = canvas.width * 0.15;
                    const frequency = 6 * Math.PI / canvas.height;
                    const waveSpeed = 2;
            
                    const drawDistortedScrubImage = (imageSource: HTMLVideoElement | HTMLImageElement | ImageBitmap, distortionProgress: number, alpha: number) => {
                        const amplitude = Math.sin(distortionProgress * Math.PI / 2) * maxAmplitude;
                        ctx.globalAlpha = alpha;
                        if (alpha <= 0) return;
            
                        const imgW = (imageSource as HTMLVideoElement).videoWidth || (imageSource as HTMLImageElement).width || canvas.width;
                        const imgH = (imageSource as HTMLVideoElement).videoHeight || (imageSource as HTMLImageElement).height || canvas.height;

                        const sliceHeight = 4;
                        for (let y = 0; y < canvas.height; y += sliceHeight) {
                            const waveOffset = Math.sin((y * frequency) + (time * waveSpeed)) * amplitude;
                            const sourceY = Math.floor((y / canvas.height) * imgH);
                            const sourceSliceHeight = Math.ceil((sliceHeight / canvas.height) * imgH);
                            
                            if (sourceY < 0 || sourceY + sourceSliceHeight > imgH) continue;
                            
                            ctx.drawImage(
                                imageSource,
                                0, sourceY, imgW, sourceSliceHeight,
                                waveOffset, y, canvas.width, sliceHeight
                            );
                        }
                    };
                    
                    // Draw clip A
                    const imageSourceA = getMediaElementForClip(clipA);
                    if (imageSourceA) {
                        drawDistortedScrubImage(imageSourceA, progress, 1 - progress);
                    } else {
                        drawScrubClip(clipA, 1 - progress);
                    }
                    
                    // Draw clip B
                    const imageSourceB = getMediaElementForClip(clipB);
                    if (imageSourceB) {
                        drawDistortedScrubImage(imageSourceB, 1 - progress, progress);
                    } else {
                        drawScrubClip(clipB, progress);
                    }
              } else if (isLightSweep) {
                const sweepWidth = canvas.width * 0.25;
                const sweepPosition = progress * canvas.width;
        
                // 1. Draw outgoing clip
                drawScrubClip(clipA);
        
                // 2. Draw incoming clip, clipped
                ctx.save();
                ctx.beginPath();
                ctx.rect(0, 0, sweepPosition, canvas.height);
                ctx.clip();
                drawScrubClip(clipB);
                ctx.restore();
        
                // 3. Draw the light sweep effect
                ctx.save();
                const intensity = Math.sin(progress * Math.PI); 
                
                const gradient = ctx.createLinearGradient(sweepPosition - sweepWidth / 2, 0, sweepPosition + sweepWidth / 2, 0);
                gradient.addColorStop(0, `rgba(255, 255, 255, 0)`);
                gradient.addColorStop(0.5, `rgba(255, 255, 255, ${intensity * 0.9})`);
                gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
                
                ctx.fillStyle = gradient;
                ctx.shadowColor = 'white';
                ctx.shadowBlur = 30;
        
                ctx.fillRect(sweepPosition - sweepWidth / 2, 0, sweepWidth, canvas.height);
                ctx.restore();
              } else if (isSlideMotion) {
                  const blurAmount = Math.sin(progress * Math.PI) * 15; // Medium blur

                  // Draw outgoing clip (A)
                  ctx.save();
                  if (blurAmount > 0.5) ctx.filter = `blur(${blurAmount}px)`;
                  ctx.translate(-canvas.width * progress, 0);
                  drawScrubClip(clipA);
                  ctx.restore();

                  // Draw incoming clip (B)
                  ctx.save();
                  if (blurAmount > 0.5) ctx.filter = `blur(${blurAmount}px)`;
                  ctx.translate(canvas.width * (1 - progress), 0);
                  drawScrubClip(clipB);
                  ctx.restore();
              } else if (isFlash) {
                  if (progress < 0.5) {
                      drawScrubClip(clipA);
                  } else {
                      drawScrubClip(clipB);
                  }
                  const flashOpacity = Math.sin(progress * Math.PI);
                  ctx.save();
                  ctx.fillStyle = `rgba(255, 255, 255, ${flashOpacity})`;
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                  ctx.restore();
              } else if (isFade) {
                  drawScrubClip(clipA, 1 - progress);
                  drawScrubClip(clipB, progress);
              } else if (isZoomOut) {
                  drawScrubClip(clipB); // Draw B first
                  ctx.save();

                  const scale = 1 - progress;
                  ctx.translate(canvas.width / 2, canvas.height / 2);
                  ctx.scale(scale, scale);
                  ctx.translate(-canvas.width / 2, -canvas.height / 2);

                  const blurAmount = progress * 15;
                  if (blurAmount > 0.5) {
                      ctx.filter = `blur(${blurAmount}px)`;
                  }
                  
                  drawScrubClip(clipA);
                  ctx.restore();
              } else {
                  drawScrubClip(clipA);
                  ctx.save();
                  applyTransitionEffect(ctx, activeTransition.type, progress, canvas.width, canvas.height);
                  drawScrubClip(clipB);
                  ctx.restore();
              }
          } else {
              drawScrubClip(clip);
          }
      }
      
      ctx.restore(); // Restore from pre-draw transforms

      if (renderer) {
          renderer.drawOverlays(ctx, analyserFrame, 0);
      }
      
      drawAnimatedBorder(ctx, projectStateForFrame.scene?.animatedBorder, analyserFrame, canvas.width, canvas.height, time);
    },
  }));

  const finalScale = zoom * fitScale;
  const contentWidth = canvasDimensions.width;
  const contentHeight = canvasDimensions.height;

  return (
    <div style={{
      width: contentWidth * finalScale,
      height: contentHeight * finalScale,
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div className="relative pointer-events-none" style={{ transform: `scale(${finalScale})`, transformOrigin: 'center center' }}>
        <canvas ref={canvasRef} width={canvasDimensions.width} height={canvasDimensions.height} className="block shadow-lg" />
        <OverlayEffects ref={overlayRef} effect={props.overlayEffect} width={canvasDimensions.width} height={canvasDimensions.height} />
        
        <div 
          id="interaction-plane"
          className="absolute top-0 left-0" 
          style={{ 
              width: dimensions.width, 
              height: dimensions.height, 
              transform: `scale(${interactionPlaneScale})`, 
              transformOrigin: 'top left',
              pointerEvents: 'auto',
          }}
          onMouseDown={(e) => { 
            if (e.target === e.currentTarget) onSelectClip(null);
          }}
        >
          {visibleClips.sort((a,b) => (trackOrder.get(a.trackId) ?? 0) - (trackOrder.get(b.trackId) ?? 0)).map((clip) => (
            <DraggableResizable
                key={clip.id}
                element={clip}
                isSelected={selectedClipId === clip.id}
                onSelect={(e) => { e.stopPropagation(); onSelectClip(clip.id); }}
                onUpdate={handleClipUpdateWithSync}
                interactionScale={netInteractionScale}
                containerId="interaction-plane"
                bounds={{ width: dimensions.width, height: dimensions.height }}
                onInteractionStart={onInteractionStart}
                onInteractionEnd={onInteractionEnd}
                zIndex={trackOrder.get(clip.id) ?? 0}
                isGroupDragging={isGroupDragging}
            >
              {selectedClipId === clip.id && (
                  <>
                      {clip.type === 'text' || clip.type === 'emoji' ? (
                          <TextRenderer element={clip} canvasScale={interactionPlaneScale} />
                      ) : clip.type === 'shape' ? (
                          <ShapeRenderer element={clip} canvasScale={interactionPlaneScale} />
                      ) : clip.type === 'spectrum' ? (
                          <div className="w-full h-full border border-dashed border-violet-500/50 pointer-events-none">
                              <AudioVisualizer
                                  style={clip.spectrumStyle}
                                  width={clip.width * interactionPlaneScale}
                                  height={clip.height * interactionPlaneScale}
                                  color={clip.spectrumColor!}
                                  color2={clip.spectrumColor2!}
                                  color3={clip.spectrumColor3!}
                                  logoSrc={clip.logoSrc}
                                  logoSize={clip.logoSize}
                                  logoShape={clip.logoShape}
                                  logoPulses={clip.logoPulses}
                              />
                          </div>
                      ) : null}
                  </>
              )}
            </DraggableResizable>
          ))}
          {showCaptionDragHandle && selectedClip && (
            <CaptionControlToolbar
              selectedClip={selectedClip}
              captionClips={captionClips}
              onUpdateMultipleClips={onUpdateMultipleClips}
              interactionScale={netInteractionScale}
              onInteractionStart={onInteractionStart}
              onInteractionEnd={onInteractionEnd}
              setIsGroupDragging={setIsGroupDragging}
              syncAllCaptions={syncAllCaptions}
              setSyncAllCaptions={setSyncAllCaptions}
              canvasBounds={dimensions}
            />
          )}
        </div>

        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.001, pointerEvents: 'none', zIndex: -10, overflow: 'hidden' }} aria-hidden="true">
          {allMediaClips.map(clip => {
              const elId = (clip.type === 'image' && clip.id.startsWith('logo-')) ? `logo-${clip.id.substring(5)}` : clip.id;
              if (clip.type === 'video') {
                  return (
                    <video
                      key={elId}
                      ref={el => {
                        if (el) {
                          videoElementsRef.current.set(elId, el);
                          videoElementsRef.current.set(clip.id, el);
                        } else {
                          const existing = videoElementsRef.current.get(elId);
                          if (existing && existing.tagName === 'VIDEO') {
                            const v = existing as HTMLVideoElement;
                            if (!v.paused) {
                              try { v.pause(); } catch (_) {}
                            }
                          }
                          videoElementsRef.current.delete(elId);
                          videoElementsRef.current.delete(clip.id);
                        }
                      }}
                      src={clip.src}
                      muted
                      playsInline
                      crossOrigin={clip.src && (clip.src.startsWith('blob:') || clip.src.startsWith('data:')) ? undefined : "anonymous"}
                      preload="auto"
                      onSeeked={() => {
                        triggerScrubRedraw();
                      }}
                      onLoadedData={() => {
                        triggerScrubRedraw();
                      }}
                      onCanPlay={() => {
                        triggerScrubRedraw();
                      }}
                    />
                  );
              } else if (clip.type === 'image') {
                  return (
                    <img
                      key={elId}
                      ref={el => {
                        if (el) {
                          videoElementsRef.current.set(elId, el);
                          videoElementsRef.current.set(clip.id, el);
                        } else {
                          videoElementsRef.current.delete(elId);
                          videoElementsRef.current.delete(clip.id);
                        }
                      }}
                      src={clip.src}
                      alt=""
                      crossOrigin={clip.src && (clip.src.startsWith('blob:') || clip.src.startsWith('data:')) ? undefined : "anonymous"}
                    />
                  );
              }
              return null;
          })}
        </div>
      </div>
    </div>
  );
});