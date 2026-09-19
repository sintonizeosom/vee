import { ProjectState, AnalyserFrame, VideoClip, TimelineTransition, ProjectFormat, TransitionType, VideoClipType, VideoEffectType, OverlayEffect } from '../types';
import { OverlayRenderer } from '../components/OverlayEffects';
import { drawWrappedText, drawShape, drawAnimatedBorder } from './canvasUtils';
import { FORMAT_DIMENSIONS, VIDEO_EFFECTS } from '../constants';
import { drawVisualizerFrame } from '../components/AudioVisualizer';
import { calculateFadeMultiplier, getPulseAmount } from './audio';

export const getAvcCodecString = (width: number, height: number, fps: number): string => {
  // Use High Profile for better compatibility with modern hardware encoders.
  const profile = '6400'; // High Profile (was '4d00' for Main)

  const macroblocksPerFrame = Math.ceil(width / 16) * Math.ceil(height / 16);
  const macroblocksPerSecond = macroblocksPerFrame * fps;
  
  let levelHex: string;

  // Select H.264 level based on the calculated macroblocks per second rate.
  // This is more accurate than just checking height and provides better compatibility.
  if (macroblocksPerSecond <= 40500) {
    levelHex = '1e'; // Level 3.0
  } else if (macroblocksPerSecond <= 108000) {
    levelHex = '1f'; // Level 3.1
  } else if (macroblocksPerSecond <= 245760) {
    levelHex = '28'; // Level 4.0
  } else if (macroblocksPerSecond <= 522240) {
    levelHex = '2a'; // Level 4.2
  } else if (macroblocksPerSecond <= 983040) {
    levelHex = '33'; // Level 5.1
  } else {
    levelHex = '34'; // Level 5.2, a safe upper bound for most web content
  }
  
  return `avc1.${profile}${levelHex}`;
};

export const loadAndCacheVideo = (src: string, cache: Map<string, HTMLVideoElement>): Promise<HTMLVideoElement> => {
    return new Promise((resolve, reject) => {
        if (!src) {
            reject(new Error('Vídeo inválido: URL não fornecida'));
            return;
        }

        if (cache.has(src)) {
            const cachedVid = cache.get(src)!;
            if (cachedVid.readyState >= 3) { // HAVE_FUTURE_DATA or more
                resolve(cachedVid);
                return;
            }
        }
        
        const video = document.createElement('video');
        video.muted = true;
        // Do NOT set crossOrigin on blob: or data: URLs to prevent browser CORS rejections
        if (!src.startsWith('blob:') && !src.startsWith('data:')) {
            video.crossOrigin = 'anonymous';
        }
        
        const timeoutId = setTimeout(() => {
            cleanup();
            reject(new Error(`O carregamento do vídeo demorou muito (${src}). O arquivo pode estar corrompido ou inacessível.`));
        }, 20000); // 20-second timeout

        const cleanup = () => {
            clearTimeout(timeoutId);
            video.removeEventListener('canplay', onCanPlay);
            video.removeEventListener('error', onError);
        };

        const onCanPlay = () => {
            cleanup();
            cache.set(src, video);
            resolve(video);
        };

        const onError = (e: Event) => {
            cleanup();
            const err = (e.target as HTMLVideoElement)?.error;
            reject(new Error(`Falha ao carregar o vídeo: ${src}. Code: ${err?.code}, Message: ${err?.message}`));
        };
        
        video.addEventListener('canplay', onCanPlay, { once: true });
        video.addEventListener('error', onError, { once: true });
        
        video.src = src;
        video.load(); // Some browsers need this to trigger loading
    });
};

const TRANSPARENT_FALLBACK_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAA=';

export const loadAndCacheImage = (src: string, cache: Map<string, HTMLImageElement>): Promise<HTMLImageElement> => {
    return new Promise((resolve) => {
        if (!src) {
            const fallback = new Image();
            fallback.src = TRANSPARENT_FALLBACK_IMAGE;
            fallback.onload = () => resolve(fallback);
            fallback.onerror = () => resolve(fallback);
            return;
        }

        if (cache.has(src)) {
            const cachedImg = cache.get(src)!;
            if (cachedImg.complete && cachedImg.naturalWidth > 0) {
                resolve(cachedImg);
                return;
            }
        }

        const isBlobOrData = src.startsWith('blob:') || src.startsWith('data:');
        const img = new Image();
        if (!isBlobOrData) {
            img.crossOrigin = 'anonymous';
        }

        let isSettled = false;
        const completeWith = (loadedImage: HTMLImageElement) => {
            if (isSettled) return;
            isSettled = true;
            cache.set(src, loadedImage);
            resolve(loadedImage);
        };

        const provideFallback = (reason?: string) => {
            console.warn(`[Export] Imagem não pôde ser carregada (${reason || src}). Usando fallback transparente para continuar a exportação.`);
            const fallback = new Image();
            fallback.onload = () => completeWith(fallback);
            fallback.onerror = () => completeWith(fallback);
            fallback.src = TRANSPARENT_FALLBACK_IMAGE;
        };

        // 10s safety timeout to never hang the export process
        const timer = setTimeout(() => {
            provideFallback('timeout');
        }, 10000);

        img.onload = () => {
            clearTimeout(timer);
            completeWith(img);
        };

        img.onerror = () => {
            clearTimeout(timer);
            // If it failed with crossOrigin on an external URL, retry once without crossOrigin
            if (img.crossOrigin) {
                const retryImg = new Image();
                retryImg.onload = () => completeWith(retryImg);
                retryImg.onerror = () => provideFallback('CORS/load error');
                retryImg.src = src;
            } else {
                provideFallback('load error');
            }
        };

        img.src = src;
    });
};

export const seekVideoAndGetFrameBitmap = (
    video: HTMLVideoElement,
    time: number
): Promise<ImageBitmap> => {
    return new Promise((resolve, reject) => {
        let timeoutId: number;

        const attemptGrab = async (retriesLeft: number) => {
            try {
                await new Promise(r => setTimeout(r, 0));
                
                if (video.videoWidth === 0 || video.videoHeight === 0 || video.readyState < video.HAVE_CURRENT_DATA) {
                    throw new Error('Video is not ready to provide frame data.');
                }
                
                try {
                    const bitmap = await createImageBitmap(video);
                    resolve(bitmap);
                } catch (errDirect) {
                    const tempCanvas = new OffscreenCanvas(video.videoWidth, video.videoHeight);
                    const tempCtx = tempCanvas.getContext('2d');
                    if (!tempCtx) {
                        throw errDirect;
                    }
                    tempCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                    const bitmap = await createImageBitmap(tempCanvas);
                    resolve(bitmap);
                }
            } catch (e) {
                if (retriesLeft > 0) {
                    setTimeout(() => attemptGrab(retriesLeft - 1), 100);
                } else {
                    try {
                        const fallbackCanvas = new OffscreenCanvas(1, 1);
                        const bitmap = await createImageBitmap(fallbackCanvas);
                        resolve(bitmap);
                    } catch {
                        reject(e);
                    }
                }
            }
        };

        const cleanup = () => {
            clearTimeout(timeoutId);
            video.removeEventListener('seeked', onSeeked);
            video.removeEventListener('error', onError);
        };

        const onSeeked = () => {
            cleanup();
            setTimeout(() => attemptGrab(3), 20);
        };

        const onError = () => {
            cleanup();
            attemptGrab(0);
        };

        const startSeek = () => {
            const duration = (video.duration && !isNaN(video.duration) && isFinite(video.duration) && video.duration > 0) ? video.duration : 0;
            const maxVideoTime = duration > 0 ? Math.max(0, duration - 0.2) : 0;
            const safeTime = duration > 0 ? Math.max(0, Math.min(time, maxVideoTime)) : 0;

            timeoutId = setTimeout(() => {
                cleanup();
                attemptGrab(0);
            }, 600) as unknown as number;

            video.addEventListener('seeked', onSeeked, { once: true });
            video.addEventListener('error', onError, { once: true });

            if (!video.error && Math.abs(video.currentTime - safeTime) > 0.05) {
                video.currentTime = safeTime;
            } else {
                onSeeked();
            }
        };

        if (video.readyState >= video.HAVE_METADATA) {
            startSeek();
        } else {
            const onCanPlay = () => {
                cleanup();
                startSeek();
            };
            video.addEventListener('loadedmetadata', onCanPlay, { once: true });
            video.addEventListener('canplaythrough', onCanPlay, { once: true });
            video.addEventListener('error', onError, { once: true });
            timeoutId = setTimeout(() => {
                cleanup();
                attemptGrab(0);
            }, 600) as unknown as number;
        }
    });
};

export async function preloadVisualAssets(
    time: number,
    projectState: ProjectState,
    videoCache: Map<string, HTMLVideoElement>,
    imageCache: Map<string, HTMLImageElement>
): Promise<Map<string, ImageBitmap>> {
    const preloadedFrames = new Map<string, ImageBitmap>();
    const { timelineClips, timelineTransitions } = projectState;

    const activeVisualClips = timelineClips.filter(clip => {
        const src = clip.src || projectState.mediaPool.find(mp => mp.id === clip.poolId)?.src;
        if (clip.type !== 'video' || !src) return false;
        
        const clipEnd = clip.timelineStart + (clip.endTime - clip.startTime) / (clip.speed || 1);
        const isDirectlyActive = time >= clip.timelineStart && time < clipEnd;

        const isPartOfTransition = timelineTransitions.some(t => {
            if (t.clipBId === clip.id) {
                const clipA = timelineClips.find(c => c.id === t.clipAId);
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

    for (const clip of activeVisualClips) {
        if (clip.type === 'video') {
            const src = clip.src || projectState.mediaPool.find(mp => mp.id === clip.poolId)?.src;
            const videoEl = src ? videoCache.get(src) : undefined;
            if (!videoEl) continue;
            
            let timeInClipSeconds: number;
            const incomingTransition = timelineTransitions.find(t => {
                const clipA = timelineClips.find(c => c.id === t.clipAId);
                if (!clipA || t.clipBId !== clip.id) return false;
                const transitionEnd = clipA.timelineStart + (clipA.endTime - clipA.startTime) / (clipA.speed || 1);
                const transitionStart = transitionEnd - t.duration;
                return time >= transitionStart && time <= transitionEnd;
            });

            if (incomingTransition) {
                const clipA = timelineClips.find(c => c.id === incomingTransition.clipAId)!;
                const transitionEnd = clipA.timelineStart + (clipA.endTime - clipA.startTime) / (clipA.speed || 1);
                const transitionStart = transitionEnd - incomingTransition.duration;
                timeInClipSeconds = time - transitionStart; // Time elapsed since this clip started visually appearing
            } else {
                timeInClipSeconds = time - clip.timelineStart; // Normal calculation
            }

            const clipSpeed = clip.speed || 1;
            const rawDuration = videoEl.duration;
            const maxVideoTime = (rawDuration && !isNaN(rawDuration) && isFinite(rawDuration) && rawDuration > 0)
                ? Math.min(clip.endTime, rawDuration - 0.05)
                : clip.endTime;

            let effectiveTime = timeInClipSeconds * clipSpeed;
            let targetTime = clip.startTime + effectiveTime;
            targetTime = Math.max(clip.startTime, Math.min(targetTime, maxVideoTime));

            try {
                const bitmap = await seekVideoAndGetFrameBitmap(videoEl, targetTime);
                preloadedFrames.set(clip.id, bitmap);
            } catch (e) {
                console.error(`Falha ao pré-carregar quadro de vídeo para ${clip.fileName} em ${targetTime.toFixed(2)}s.`, e);
            }
        }
    }

    return preloadedFrames;
}

function applyTransitionEffect(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    type: TransitionType,
    progress: number,
    width: number,
    height: number
) {
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
            const blurAmount = (1 - progress) * 15;
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
            // Handled in renderFrameOnCanvas as it affects the outgoing clip (A)
            break;
        }
        default:
            ctx.globalAlpha = progress;
            break;
    }
}

export const findOverlayEffectForTime = (time: number, projectState: ProjectState): OverlayEffect => {
    const { tracks, timelineClips, scene } = projectState;
    if (!scene) return 'none';
    
    const trackOrder = [...tracks].map(t => t.id);

    const activeClipsWithOverlay = timelineClips
        .filter(clip => {
            if (clip.overlayEffect === undefined) return false;

            const clipEnd = clip.timelineStart + (clip.endTime - clip.startTime) / (clip.speed || 1);
            return time >= clip.timelineStart && time < clipEnd;
        })
        .sort((a, b) => trackOrder.indexOf(a.trackId) - trackOrder.indexOf(b.trackId));
        
    const topClip = activeClipsWithOverlay[0];
    
    return topClip?.overlayEffect ?? scene.overlayEffect;
};


export function renderFrameOnCanvas(
    options: {
        ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
        projectState: ProjectState,
        frameTime: number,
        analyserFrame: AnalyserFrame,
        imageCache: Map<string, HTMLImageElement>,
        preloadedFrames: Map<string, ImageBitmap>,
        overlayRenderer: OverlayRenderer,
        findClipForTimestamp: (timestamp: number, trackType: 'video' | 'audio', opts?: { ignoreMute?: boolean }) => { clip: VideoClip | null, timeInClip: number },
        frameRate: number,
        spectrumCanvasCache: Map<string, { canvas: HTMLCanvasElement | OffscreenCanvas, ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D }>,
        projectDimensions: { width: number; height: number };
        skipOverlay?: boolean;
    }
): void {
    const { ctx, projectState, frameTime, analyserFrame, imageCache, preloadedFrames, overlayRenderer, frameRate, spectrumCanvasCache, projectDimensions } = options;
    const { scene, timelineClips, tracks, timelineTransitions } = projectState;
    if (!scene) return;

    const { width, height } = ctx.canvas;
    const scale = width / projectDimensions.width;
    const deltaTime = 1 / frameRate;

    overlayRenderer.update(analyserFrame, deltaTime);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    overlayRenderer.applyPreDrawTransforms(ctx, deltaTime);

    const allActiveClips = timelineClips.filter(clip => {
        const visualTypes: VideoClipType[] = ['video', 'image', 'text', 'spectrum', 'shape', 'emoji'];
        if (!visualTypes.includes(clip.type)) return false;

        const clipEnd = clip.timelineStart + (clip.endTime - clip.startTime) / (clip.speed || 1);
        const isDirectlyActive = frameTime >= clip.timelineStart && frameTime < clipEnd;

        const isPartOfTransition = timelineTransitions.some(t => {
            if (t.clipBId === clip.id) {
                const clipA = timelineClips.find(c => c.id === t.clipAId);
                if (!clipA) return false;
                const transitionEnd = clipA.timelineStart + (clipA.endTime - clipA.startTime) / (clipA.speed || 1);
                const transitionStart = transitionEnd - t.duration;
                return frameTime >= transitionStart && frameTime <= transitionEnd;
            }
            if (t.clipAId === clip.id) {
                const transitionEnd = clipEnd;
                const transitionStart = transitionEnd - t.duration;
                return frameTime >= transitionStart && frameTime <= transitionEnd;
            }
            return false;
        });

        return isDirectlyActive || isPartOfTransition;
    });

    const trackOrder = [...tracks].map(t => t.id);
    allActiveClips.sort((a, b) => trackOrder.indexOf(b.trackId) - trackOrder.indexOf(a.trackId));

    const clipsDrawnInTransition = new Set<string>();
    
    const drawVisualClip = (targetClip: VideoClip, time: number, alpha?: number) => {
        ctx.save();
        
        const sourceTime = targetClip.startTime + (time - targetClip.timelineStart) * (targetClip.speed || 1);
        const fadeMultiplier = calculateFadeMultiplier(targetClip, sourceTime);
        ctx.globalAlpha = (alpha !== undefined ? alpha : 1) * fadeMultiplier;

        if (ctx.globalAlpha <= 0) {
            ctx.restore();
            return;
        }

        const scaledClip = {
            x: targetClip.x * scale,
            y: targetClip.y * scale,
            width: targetClip.width * scale,
            height: targetClip.height * scale,
        };

        ctx.translate(scaledClip.x + scaledClip.width / 2, scaledClip.y + scaledClip.height / 2);
        ctx.rotate((targetClip.rotation || 0) * Math.PI / 180);
        ctx.translate(-scaledClip.width / 2, -scaledClip.height / 2);

        switch (targetClip.type) {
            case 'text':
            case 'emoji':
                drawWrappedText(ctx, targetClip, scale, time - targetClip.timelineStart, (targetClip.endTime - targetClip.startTime) / (targetClip.speed || 1));
                break;
            case 'shape':
                drawShape(ctx, targetClip, scale);
                break;
            case 'spectrum': {
                const spectrumId = targetClip.id;
                let spectrumCanvasInfo = spectrumCanvasCache.get(spectrumId);
                if (!spectrumCanvasInfo) {
                    const canvas = new OffscreenCanvas(Math.round(scaledClip.width), Math.round(scaledClip.height));
                    const specCtx = canvas.getContext('2d', { willReadFrequently: true })!;
                    spectrumCanvasInfo = { canvas, ctx: specCtx };
                    spectrumCanvasCache.set(spectrumId, spectrumCanvasInfo);
                }
                const logoImage = targetClip.logoSrc ? imageCache.get(targetClip.logoSrc) : null;
                spectrumCanvasInfo.ctx.clearRect(0, 0, scaledClip.width, scaledClip.height);
                drawVisualizerFrame(spectrumCanvasInfo.ctx, analyserFrame.freqData, analyserFrame.timeDomainData, time, {
                    ...targetClip,
                    width: scaledClip.width,
                    height: scaledClip.height,
                    style: targetClip.spectrumStyle!,
                    color: targetClip.spectrumColor!,
                    color2: targetClip.spectrumColor2!,
                    color3: targetClip.spectrumColor3!,
                }, logoImage);
                ctx.drawImage(spectrumCanvasInfo.canvas, 0, 0);
                break;
            }
            case 'video':
            case 'image': {
                let imageSource: ImageBitmap | HTMLImageElement | undefined = preloadedFrames.get(targetClip.id);
                const src = targetClip.src || projectState.mediaPool.find(mp => mp.id === targetClip.poolId)?.src;
                if (!imageSource && targetClip.type === 'image' && src) {
                    imageSource = imageCache.get(src);
                }
                if (imageSource) {
                    const pulseAmount = targetClip.pulsesWithMusic ? getPulseAmount(analyserFrame.freqData, targetClip.pulseStrength ?? 0.5) : 1.0;
                    
                    const effects = targetClip.effects || {};
                    const cssEffects: Partial<Record<VideoEffectType, number>> = {};
                    const canvasEffects: Partial<Record<VideoEffectType, number>> = {};
                    for (const key in effects) {
                        if (key === 'vignette' || key === 'letterbox') canvasEffects[key as VideoEffectType] = effects[key as keyof typeof effects]!;
                        else cssEffects[key as VideoEffectType] = effects[key as keyof typeof effects]!;
                    }
                    
                    ctx.save();
                    if (Object.keys(cssEffects).length > 0) ctx.filter = Object.entries(cssEffects).map(([key, value]) => {
                         const effectDef = VIDEO_EFFECTS.find(e => e.id === key);
                         return `${key}(${value}${effectDef?.unit || ''})`
                    }).join(' ');
                    
                    if (pulseAmount !== 1.0) {
                        ctx.translate(scaledClip.width / 2, scaledClip.height / 2);
                        ctx.scale(pulseAmount, pulseAmount);
                        ctx.translate(-scaledClip.width / 2, -scaledClip.height / 2);
                    }

                    // Apply Image/Video Animations & Zoom Effects
                    if ((targetClip.type === 'image' || targetClip.type === 'video') && targetClip.imageAnimationType && targetClip.imageAnimationType !== 'none') {
                        const animType = targetClip.imageAnimationType;
                        const speed = targetClip.imageAnimationSpeed ?? 1.0;
                        const scaleVal = targetClip.imageAnimationScale ?? 1.25;
                        const timeInClipDisplay = time - targetClip.timelineStart;
                        const totalClipDuration = (targetClip.endTime - targetClip.startTime) / (targetClip.speed || 1);
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
                                    const ease = 1 - Math.pow(1 - p, 3);
                                    const offset = (1 - ease) * scaledClip.height;
                                    ctx.translate(0, offset);
                                    ctx.globalAlpha = ctx.globalAlpha * p;
                                }
                                break;
                            }
                        }
                    }

                    ctx.drawImage(imageSource, 0, 0, scaledClip.width, scaledClip.height);
                    ctx.restore(); // from pulse and css filters
                    
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
                }
                break;
            }
        }
        ctx.restore();
    };

    for (const clip of allActiveClips) {
        if (clipsDrawnInTransition.has(clip.id)) continue;

        const activeTransition = timelineTransitions.find(t => {
            if (t.clipAId !== clip.id) return false;
            const clipA_displayDuration = (clip.endTime - clip.startTime) / (clip.speed || 1);
            const transitionEnd = clip.timelineStart + clipA_displayDuration;
            const transitionStart = transitionEnd - t.duration;
            return frameTime >= transitionStart && frameTime <= transitionEnd;
        });
        
        if (activeTransition) {
            const clipA = clip;
            const clipB = timelineClips.find(c => c.id === activeTransition.clipBId);

            if (!clipB) { drawVisualClip(clipA, frameTime); continue; }
            clipsDrawnInTransition.add(clipB.id);

            const clipA_displayDuration = (clipA.endTime - clipA.startTime) / (clipA.speed || 1);
            const transitionEnd = clipA.timelineStart + clipA_displayDuration;
            const transitionStart = transitionEnd - activeTransition.duration;
            const progress = (frameTime - transitionStart) / activeTransition.duration;
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
                const baseClip = progress < 0.5 ? clipA : clipB;
                const secondaryClip = progress < 0.5 ? clipB : clipA;
                drawVisualClip(baseClip, frameTime);
                
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
                            drawVisualClip(secondaryClip, frameTime);
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
                drawVisualClip(clipA, frameTime, 1 - progress);
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
                drawVisualClip(clipB, frameTime, progress);
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
                drawVisualClip(clipA, frameTime, 1 - progress);
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
                drawVisualClip(clipB, frameTime, progress);
                ctx.restore();
            } else if (isLiquidFlow) {
                const maxAmplitude = width * 0.15;
                const frequency = 6 * Math.PI / height;
                const waveSpeed = 2;
        
                const drawDistortedExportImage = (imageSource: ImageBitmap, distortionProgress: number, alpha: number) => {
                    const amplitude = Math.sin(distortionProgress * Math.PI / 2) * maxAmplitude;
                    ctx.globalAlpha = alpha;
                    if (alpha <= 0) return;
        
                    const sliceHeight = 4;
                    for (let y = 0; y < height; y += sliceHeight) {
                        const waveOffset = Math.sin((y * frequency) + (frameTime * waveSpeed)) * amplitude;
                        const sourceY = Math.floor((y / height) * imageSource.height);
                        const sourceSliceHeight = Math.ceil((sliceHeight / height) * imageSource.height);
                        
                        if (sourceY < 0 || sourceY + sourceSliceHeight > imageSource.height) continue;
        
                        ctx.drawImage(
                            imageSource,
                            0, sourceY, imageSource.width, sourceSliceHeight,
                            waveOffset, y, width, sliceHeight
                        );
                    }
                };
        
                // Draw clip A
                const imageSourceA = preloadedFrames.get(clipA.id);
                if (imageSourceA) {
                    drawDistortedExportImage(imageSourceA, progress, 1 - progress);
                } else { // Fallback for text/shapes
                    drawVisualClip(clipA, frameTime, 1 - progress);
                }
        
                // Draw clip B
                const imageSourceB = preloadedFrames.get(clipB.id);
                if (imageSourceB) {
                    drawDistortedExportImage(imageSourceB, 1 - progress, progress);
                } else { // Fallback
                    drawVisualClip(clipB, frameTime, progress);
                }
            } else if (isLightSweep) {
                const sweepWidth = width * 0.25;
                const sweepPosition = progress * width;
        
                // 1. Draw outgoing clip
                drawVisualClip(clipA, frameTime);
        
                // 2. Draw incoming clip, clipped
                ctx.save();
                ctx.beginPath();
                ctx.rect(0, 0, sweepPosition, height);
                ctx.clip();
                drawVisualClip(clipB, frameTime);
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
        
                ctx.fillRect(sweepPosition - sweepWidth / 2, 0, sweepWidth, height);
                ctx.restore();
            } else if (isSlideMotion) {
                const blurAmount = Math.sin(progress * Math.PI) * 15; // Medium blur

                // Draw outgoing clip (A)
                ctx.save();
                if (blurAmount > 0.5) ctx.filter = `blur(${blurAmount}px)`;
                ctx.translate(-width * progress, 0);
                drawVisualClip(clipA, frameTime);
                ctx.restore();

                // Draw incoming clip (B)
                ctx.save();
                if (blurAmount > 0.5) ctx.filter = `blur(${blurAmount}px)`;
                ctx.translate(width * (1 - progress), 0);
                drawVisualClip(clipB, frameTime);
                ctx.restore();
            } else if (isFlash) {
                if (progress < 0.5) {
                    drawVisualClip(clipA, frameTime);
                } else {
                    drawVisualClip(clipB, frameTime);
                }
                const flashOpacity = Math.sin(progress * Math.PI);
                ctx.save();
                ctx.fillStyle = `rgba(255, 255, 255, ${flashOpacity})`;
                ctx.fillRect(0, 0, width, height);
                ctx.restore();
            } else if (isFade) {
                drawVisualClip(clipA, frameTime, 1 - progress);
                drawVisualClip(clipB, frameTime, progress);
            } else if (isZoomOut) {
                drawVisualClip(clipB, frameTime);
                ctx.save();
                
                const scale = 1 - progress;
                ctx.translate(width / 2, height / 2);
                ctx.scale(scale, scale);
                ctx.translate(-width / 2, -height / 2);
                
                const blurAmount = progress * 15;
                if (blurAmount > 0.5) {
                    ctx.filter = `blur(${blurAmount}px)`;
                }
                
                drawVisualClip(clipA, frameTime);
                ctx.restore();
            } else {
                drawVisualClip(clipA, frameTime);
                ctx.save();
                applyTransitionEffect(ctx, activeTransition.type, progress, width, height);
                drawVisualClip(clipB, frameTime);
                ctx.restore();
            }
        } else {
            drawVisualClip(clip, frameTime);
        }
    }

    ctx.restore(); // Restore from pre-draw transforms
    if(!options.skipOverlay) {
      overlayRenderer.drawOverlays(ctx, analyserFrame, deltaTime);
    }
    
    drawAnimatedBorder(ctx, projectState.scene?.animatedBorder, analyserFrame, width, height, frameTime);
}