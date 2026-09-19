import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Track, VideoClip, MediaPoolClip, TimelineTransition, TransitionType, VideoClipType } from '../types';
import { BASE_PIXELS_PER_SECOND, TRANSITION_MODELS } from '../constants';
import { Play, Pause, Square, SkipBack, Rewind, FastForward, ZoomIn, ZoomOut, Plus, Undo, Redo, Copy, ClipboardPaste, Trash2, Scissors, Magnet, GripVertical, Volume2, VolumeX, Edit, Mic, Bot, Music, Film, Type as TypeIcon, Shapes, Smile, Layers3, ChevronDown, Check, Maximize2 } from 'lucide-react';

const MIN_ZOOM = 0.02;
const MAX_ZOOM = 15.0;

const zoomToSlider = (zoom: number): number => {
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
    return (100 * Math.log(clamped / MIN_ZOOM)) / Math.log(MAX_ZOOM / MIN_ZOOM);
};

const sliderToZoom = (sliderVal: number): number => {
    const raw = MIN_ZOOM * Math.pow(MAX_ZOOM / MIN_ZOOM, sliderVal / 100);
    return Math.round(raw * 100) / 100;
};

// Define the props interface based on usage in Editor.tsx
interface TimelineProps {
  tracks: Track[];
  timelineClips: VideoClip[];
  timelineTransitions: TimelineTransition[];
  selectedClipIds: string[];
  onSelectClip: (clipId: string | null, metaKey: boolean, shiftKey: boolean) => void;
  selectedTrackIds: string[];
  onSelectTrack: (trackId: string, metaKey: boolean, shiftKey: boolean) => void;
  masterCurrentTime: number;
  masterDuration: number;
  onSeek: (time: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  isPlaying: boolean;
  onMoveClips: (updates: { clipId: string; newTrackId: string; newTimelineStart: number }[]) => void;
  onTrimClip: (clipId: string, newTimes: Partial<{ startTime: number; endTime: number; timelineStart: number }>) => void;
  onUpdateClip: (id: string, props: Partial<VideoClip>) => void;
  onSplitClipAtPlayhead: () => void;
  onDeleteSelectedClips: () => void;
  onAddClipToTrack: (poolClip: MediaPoolClip, trackId: string, time: number) => void;
  onAddRecordedAudio: (blob: Blob, duration: number) => void;
  onAddTrack: (type: 'video' | 'audio' | 'text' | 'spectrum' | 'shape' | 'emoji') => void;
  onEditTransitionBetween: (clipAId: string, clipBId: string) => void;
  onAddOrUpdateTransition: (data: { clipAId: string; clipBId: string; type: TransitionType; duration: number }) => void;
  onDeleteTransition: (clipAId: string, clipBId: string) => void;
  onRenameTrack: (trackId: string, newName: string) => void;
  onReorderTracks: (draggedId: string, targetId: string) => void;
  onDeleteTrack: (trackId: string) => void;
  onToggleMuteTrack: (trackId: string) => void;
  onSetTrackVolume: (trackId: string, volume: number) => void;
  onDuplicateSelectedTracks: () => void;
  timelineZoom: number;
  onSetTimelineZoom: (zoom: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onInteractionStart: () => void;
  onInteractionEnd: () => void;
  mediaPool: MediaPoolClip[];
  playheadRef: React.RefObject<HTMLDivElement>;
  timeDisplayRef: React.RefObject<HTMLSpanElement>;
  formatTime: (seconds: number) => string;
  defaultTransition: { type: TransitionType; duration: number };
  isSnappingEnabled: boolean;
  onSetIsSnappingEnabled: (enabled: boolean) => void;
  touchHoverInfo: { trackId: string; time: number; canDrop: boolean; } | null;
  copiedClip: VideoClip | null;
  onCopyClip: () => void;
  onPasteClip: () => void;
  onSelectAllClipsOnTrack: (trackId: string) => void;
}

type ClipDragState = {
    action: 'move' | 'trim-start' | 'trim-end';
    clips: { id: string, trackId: string, initialTimelineStart: number, initialStartTime: number, initialEndTime: number, speed: number }[];
    draggedClipId: string;
    initialX: number;
};

interface TrackLaneProps {
    track: Track;
    timelineClips: VideoClip[];
    timelineTransitions: TimelineTransition[];
    selectedClipIds: string[];
    mediaPool: MediaPoolClip[];
    pixelsPerSecond: number;
    onClipInteractionStart: (e: React.MouseEvent | React.TouchEvent, clipId: string, action: 'move' | 'trim-start' | 'trim-end') => void;
    onAddClipToTrack: (poolClip: MediaPoolClip, trackId: string, time: number) => void;
    onAddOrUpdateTransition: (data: { clipAId: string; clipBId: string; type: TransitionType; duration: number }) => void;
    defaultTransition: { type: TransitionType; duration: number };
    onEditTransitionBetween: (clipAId: string, clipBId: string) => void;
    transitionDropTarget: { clipAId: string; clipBId: string; position: number } | null;
    setTransitionDropTarget: (target: { clipAId: string; clipBId: string; position: number } | null) => void;
    touchHoverInfo: { trackId: string; time: number; canDrop: boolean; } | null;
}

const TrackLane: React.FC<TrackLaneProps> = (props) => {
    const { 
        track, timelineClips, pixelsPerSecond, selectedClipIds, onClipInteractionStart, onAddClipToTrack, 
        mediaPool, onAddOrUpdateTransition, defaultTransition, onEditTransitionBetween, timelineTransitions, 
        transitionDropTarget, setTransitionDropTarget, touchHoverInfo 
    } = props;

    const trackLaneRef = useRef<HTMLDivElement>(null);
    const clipsOnTrack = useMemo(() => timelineClips.filter(c => c.trackId === track.id).sort((a,b) => a.timelineStart - b.timelineStart), [timelineClips, track.id]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        
        const currentTrackLane = (e.target as HTMLElement).closest('.track-lane');
        if (!currentTrackLane) return;

        let data = (window as any).__activeDragData;
        if (!data && e.dataTransfer) {
            try {
                const dataString = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
                if (dataString) {
                    data = JSON.parse(dataString);
                }
            } catch (err) {
                // Ignore HTML5 security restriction during dragover
            }
        }

        const isVideoTrack = track.type === 'video';
        const isTransitionDrag = data?.type === 'transition' || (e.dataTransfer && Array.from(e.dataTransfer.types).includes('application/json'));

        if (isTransitionDrag && isVideoTrack) {
            e.dataTransfer.dropEffect = 'copy';
            
            const timelineContainer = currentTrackLane.closest('.overflow-auto');
            if (!timelineContainer) return;
            const trackRect = currentTrackLane.getBoundingClientRect();
            const dropX = e.clientX - trackRect.left + timelineContainer.scrollLeft;

            let bestTarget = null;
            let minPixelDistance = Infinity;
            const pixelTolerance = 60; // Generous tolerance for easy seam highlighting

            for (let i = 0; i < clipsOnTrack.length - 1; i++) {
                const clipA = clipsOnTrack[i];
                const clipB = clipsOnTrack[i + 1];

                const clipADisplayDuration = (clipA.endTime - clipA.startTime) / (clipA.speed || 1);
                const clipAEndTime = clipA.timelineStart + clipADisplayDuration;
                const timeGap = clipB.timelineStart - clipAEndTime;
                
                // Consider adjacent clips with time gap up to 0.5s
                if (Math.abs(timeGap) < 0.5) {
                    const seamPositionPixels = clipAEndTime * pixelsPerSecond;
                    const distanceToSeamPixels = Math.abs(dropX - seamPositionPixels);
                    
                    if (distanceToSeamPixels < pixelTolerance && distanceToSeamPixels < minPixelDistance) {
                        minPixelDistance = distanceToSeamPixels;
                        bestTarget = { 
                            clipAId: clipA.id, 
                            clipBId: clipB.id, 
                            position: seamPositionPixels 
                        };
                    }
                }
            }
            setTransitionDropTarget(bestTarget);
        } else if (data && data.type !== 'transition') {
            const typeMap: Record<Track['type'], VideoClipType[]> = {
                video: ['video', 'image'], audio: ['audio'], text: ['text'],
                spectrum: ['spectrum'], shape: ['shape', 'image'], emoji: ['emoji'],
            };
            const clipType = data.clipType || data.type;
            const canDropClip = typeMap[track.type]?.includes(clipType as VideoClipType);
            if (canDropClip) {
                e.dataTransfer.dropEffect = 'copy';
            } else {
                e.dataTransfer.dropEffect = 'none';
            }
            setTransitionDropTarget(null);
        } else {
            e.dataTransfer.dropEffect = 'copy';
            setTransitionDropTarget(null);
        }
    };
    
    const handleDragLeave = (e: React.DragEvent) => {
        // Only clear if actually leaving the track lane element
        const relatedTarget = e.relatedTarget as HTMLElement;
        if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
            setTransitionDropTarget(null);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        
        let data = (window as any).__activeDragData;
        if (!data) {
            try {
                const raw = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
                if (raw) data = JSON.parse(raw);
            } catch (err) {
                console.error("Drop data parse failed:", err);
            }
        }

        if (data && data.type === 'transition') {
            let target = transitionDropTarget;

            // Fallback: If dropTarget was null, find closest adjacent clip seam on this video track
            if (!target && track.type === 'video') {
                const currentTrackLane = (e.target as HTMLElement).closest('.track-lane');
                if (currentTrackLane) {
                    const timelineContainer = currentTrackLane.closest('.overflow-auto');
                    if (timelineContainer) {
                        const trackRect = currentTrackLane.getBoundingClientRect();
                        const dropX = e.clientX - trackRect.left + timelineContainer.scrollLeft;
                        let minDist = Infinity;
                        for (let i = 0; i < clipsOnTrack.length - 1; i++) {
                            const clipA = clipsOnTrack[i];
                            const clipB = clipsOnTrack[i + 1];
                            const clipADisplayDuration = (clipA.endTime - clipA.startTime) / (clipA.speed || 1);
                            const clipAEndTime = clipA.timelineStart + clipADisplayDuration;
                            if (Math.abs(clipB.timelineStart - clipAEndTime) < 0.5) {
                                const seamPx = clipAEndTime * pixelsPerSecond;
                                const dist = Math.abs(dropX - seamPx);
                                if (dist < minDist) {
                                    minDist = dist;
                                    target = { clipAId: clipA.id, clipBId: clipB.id, position: seamPx };
                                }
                            }
                        }
                    }
                }
            }

            if (target) {
                onAddOrUpdateTransition({ 
                    clipAId: target.clipAId, 
                    clipBId: target.clipBId,
                    type: data.id, 
                    duration: defaultTransition.duration 
                });
            }
        } else if (data) {
            const poolClip = mediaPool.find(c => c.id === data.id) || (data.src ? data : null);
            const currentTrackLane = (e.target as HTMLElement).closest('.track-lane');
            if (poolClip && currentTrackLane) {
                const timelineContainer = currentTrackLane.closest('.overflow-auto');
                if (timelineContainer) {
                    const trackRect = currentTrackLane.getBoundingClientRect();
                    const dropX = e.clientX - trackRect.left + timelineContainer.scrollLeft;
                    const time = Math.max(0, dropX / pixelsPerSecond);
                    onAddClipToTrack(poolClip, track.id, time);
                }
            }
        }

        (window as any).__activeDragData = null;
        setTransitionDropTarget(null);
    };
    
    const isVideoTrack = track.type === 'video';
    
    return (
        <div 
            ref={trackLaneRef}
            className="h-10 border-b border-black/30 relative track-lane group"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            data-track-id={track.id}
        >
            {/* Render Clips */}
            {clipsOnTrack.map(clip => {
                const poolClip = clip.poolId ? mediaPool.find(p => p.id === clip.poolId) : null;
                const colorClasses = {
                    video: 'bg-teal-500/50', image: 'bg-cyan-500/50', audio: 'bg-violet-500/50',
                    text: 'bg-orange-500/50', emoji: 'bg-yellow-500/50', spectrum: 'bg-pink-500/50',
                    shape: 'bg-indigo-500/50'
                };
                const baseClass = colorClasses[clip.type as keyof typeof colorClasses] || 'bg-gray-500/50';

                return (
                    <div 
                        key={clip.id}
                        className={`absolute h-8 top-1 rounded-md overflow-hidden transition-all duration-100 ${baseClass} ${selectedClipIds.includes(clip.id) ? 'ring-2 ring-violet-400 z-20' : 'hover:opacity-80 z-10'}`}
                        style={{
                            left: clip.timelineStart * pixelsPerSecond,
                            width: ((clip.endTime - clip.startTime) / (clip.speed || 1)) * pixelsPerSecond,
                        }}
                        onMouseDown={(e) => onClipInteractionStart(e, clip.id, 'move')}
                        onTouchStart={(e) => onClipInteractionStart(e, clip.id, 'move')}
                    >
                        {clip.type === 'audio' && poolClip?.waveform && (
                            <div className="absolute inset-0 flex items-center overflow-hidden">
                                {poolClip.waveform.map((val, i) => (
                                    <div key={i} className="bg-violet-400/50" style={{ width: `${100/poolClip.waveform.length}%`, height: `${val * 100}%` }} />
                                ))}
                            </div>
                        )}
                        <div className="w-full h-full flex items-center px-2 text-xs text-white truncate relative">
                            {clip.fileName || clip.content}
                        </div>
                        {clip.type !== 'image' && (
                            <>
                                <div className="absolute left-0 top-0 h-full w-2 cursor-ew-resize z-10" onMouseDown={(e) => onClipInteractionStart(e, clip.id, 'trim-start')} onTouchStart={(e) => onClipInteractionStart(e, clip.id, 'trim-start')}></div>
                                <div className="absolute right-0 top-0 h-full w-2 cursor-ew-resize z-10" onMouseDown={(e) => onClipInteractionStart(e, clip.id, 'trim-end')} onTouchStart={(e) => onClipInteractionStart(e, clip.id, 'trim-end')}></div>
                            </>
                        )}
                    </div>
                )
            })}
            
            {/* Render Transitions and Clickable Seams */}
            {isVideoTrack && clipsOnTrack.map((clipA, index) => {
                if (index >= clipsOnTrack.length - 1) return null;
                const clipB = clipsOnTrack[index + 1];

                const clipA_displayDuration = (clipA.endTime - clipA.startTime) / (clipA.speed || 1);
                const clipA_end_time = clipA.timelineStart + clipA_displayDuration;

                if (Math.abs(clipB.timelineStart - clipA_end_time) > 0.1) return null;

                const existingTransition = timelineTransitions.find(t => t.clipAId === clipA.id && t.clipBId === clipB.id);
                const position = clipA_end_time * pixelsPerSecond;
                
                if (existingTransition) {
                    const transitionModel = TRANSITION_MODELS.find(m => m.id === existingTransition.type);
                    const transitionWidth = existingTransition.duration * pixelsPerSecond;
                    const transitionPosition = position - transitionWidth / 2;

                    return (
                        <button
                            key={existingTransition.id}
                            className="absolute h-6 top-2 rounded bg-violet-800/80 hover:bg-violet-700/80 border border-violet-500/50 flex items-center justify-center z-20"
                            style={{ left: transitionPosition, width: transitionWidth }}
                            onClick={(e) => { e.stopPropagation(); onEditTransitionBetween(clipA.id, clipB.id); }}
                            title={`Editar Transição: ${transitionModel?.name}`}
                        >
                            {transitionModel && React.cloneElement(transitionModel.icon as React.ReactElement<{ className?: string }>, { className: 'w-4 h-4 text-violet-300' })}
                        </button>
                    )
                } else {
                    return (
                        <button
                            key={`seam-${clipA.id}-${clipB.id}`}
                            className="group absolute h-6 w-6 top-2 bg-gray-800 hover:bg-violet-700 scale-90 hover:scale-100 rounded-full z-20 flex items-center justify-center border-2 border-gray-600 hover:border-violet-500 transition-all duration-200"
                            style={{ left: position, transform: 'translateX(-50%)' }}
                            onClick={(e) => { e.stopPropagation(); onEditTransitionBetween(clipA.id, clipB.id); }}
                            title="Adicionar Transição"
                        >
                            <Plus size={14} className="text-violet-400 group-hover:text-white transition-colors" />
                        </button>
                    )
                }
            })}

            {/* Drag-and-drop target highlight */}
            {transitionDropTarget && track.id === clipsOnTrack.find(c => c.id === transitionDropTarget.clipAId)?.trackId && (
                <div 
                    className="absolute h-full w-1.5 bg-violet-400 rounded-full top-0 z-40 pointer-events-none shadow-lg animate-pulse"
                    style={{ left: transitionDropTarget.position, transform: 'translateX(-50%)' }}
                />
            )}
            
            {/* Touch drop highlight */}
            {touchHoverInfo && touchHoverInfo.trackId === track.id && (
                <div 
                    className={`absolute h-full w-1 top-0 z-40 pointer-events-none ${touchHoverInfo.canDrop ? 'bg-violet-500' : 'bg-red-500'}`}
                    style={{ left: touchHoverInfo.time * pixelsPerSecond, transform: 'translateX(-50%)' }}
                >
                    <div className={`absolute -top-1 -left-1 w-3 h-3 rounded-full ${touchHoverInfo.canDrop ? 'bg-violet-500' : 'bg-red-500'}`} />
                </div>
            )}
        </div>
    );
};

const TimelineGrid: React.FC<{ width: number; duration: number; pixelsPerSecond: number }> = ({ width, duration, pixelsPerSecond }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const height = 24; // Ruler height
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        ctx.fillStyle = '#131519';
        ctx.fillRect(0, 0, width, height);

        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#888';
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;

        const majorTickInterval = pixelsPerSecond > 20 ? 1 : pixelsPerSecond > 5 ? 5 : 10;
        const minorTickInterval = majorTickInterval / 5;

        for (let time = 0; time < duration; time += minorTickInterval) {
            const x = time * pixelsPerSecond;
            
            if (time % majorTickInterval === 0) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
                const minutes = Math.floor(time / 60);
                const seconds = time % 60;
                ctx.fillText(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`, x + 4, 14);
            } else if (pixelsPerSecond > 10) {
                 ctx.beginPath();
                 ctx.moveTo(x, height * 0.65);
                 ctx.lineTo(x, height);
                 ctx.stroke();
            }
        }
    }, [width, duration, pixelsPerSecond]);

    return <canvas ref={canvasRef} className="absolute top-0 left-0" style={{ width, height: 24 }} />;
};

const Playhead = React.forwardRef<HTMLDivElement, { currentTime: number; pixelsPerSecond: number; onSeek: (time: number) => void; containerRef: React.RefObject<HTMLDivElement> }>((props, ref) => {
    const { currentTime, pixelsPerSecond, onSeek, containerRef } = props;
    const isDraggingRef = useRef(false);

    const handleInteractionStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        e.preventDefault();
        isDraggingRef.current = true;
        
        const onMove = (moveEvent: MouseEvent | TouchEvent) => {
            if (isDraggingRef.current && containerRef.current) {
                if ('touches' in moveEvent && moveEvent.cancelable) moveEvent.preventDefault();
                const rect = containerRef.current.getBoundingClientRect();
                const clientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
                const x = clientX - rect.left;
                const scrollLeft = containerRef.current.scrollLeft;
                const targetTime = Math.max(0, (x + scrollLeft) / pixelsPerSecond);
                
                if (typeof ref === 'object' && ref && 'current' in ref && ref.current) {
                    ref.current.style.left = `${targetTime * pixelsPerSecond}px`;
                }
                onSeek(targetTime);
            }
        };

        const onUp = () => {
            isDraggingRef.current = false;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('touchend', onUp);
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('mouseup', onUp);
        window.addEventListener('touchend', onUp);
    }, [onSeek, pixelsPerSecond, containerRef]);

    return (
        <div 
            ref={ref}
            className="absolute top-0 h-full w-0.5 bg-violet-400 z-30 pointer-events-none"
            style={{ left: currentTime * pixelsPerSecond }}
        >
            <div 
                className="absolute -top-1.5 -left-2 w-5 h-5 rounded-full bg-violet-400 cursor-ew-resize pointer-events-auto"
                onMouseDown={handleInteractionStart}
                onTouchStart={handleInteractionStart}
            />
        </div>
    );
});

interface TrackHeadersProps extends Pick<TimelineProps, 'tracks' | 'selectedTrackIds' | 'onSelectTrack' | 'onRenameTrack' | 'onDeleteTrack' | 'onToggleMuteTrack' | 'onSetTrackVolume' | 'onAddTrack' | 'onReorderTracks' | 'onDuplicateSelectedTracks' | 'timelineClips' | 'selectedClipIds' | 'onSelectAllClipsOnTrack' | 'onInteractionStart' | 'onInteractionEnd'> {
  scrollRef: React.RefObject<HTMLDivElement>;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

const TrackHeaders: React.FC<TrackHeadersProps> = (props) => {
    const { tracks, selectedTrackIds, onSelectTrack, onRenameTrack, onDeleteTrack, onToggleMuteTrack, onSetTrackVolume, onAddTrack, onReorderTracks, onDuplicateSelectedTracks, scrollRef, onScroll, onSelectAllClipsOnTrack, timelineClips, selectedClipIds, onInteractionStart, onInteractionEnd } = props;
    const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
    const [menuTrackId, setMenuTrackId] = useState<string | null>(null);
    const [addMenuOpen, setAddMenuOpen] = useState(false);
    const addMenuRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const draggedTrackIdRef = useRef<string|null>(null);

    const iconMap: Record<Track['type'], React.ReactNode> = {
        video: <Film size={16} />,
        audio: <Music size={16} />,
        text: <TypeIcon size={16} />,
        spectrum: <Bot size={16} />,
        shape: <Shapes size={16} />,
        emoji: <Smile size={16} />
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) setAddMenuOpen(false);
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuTrackId(null);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const handleDragStart = (e: React.DragEvent, trackId: string) => {
        draggedTrackIdRef.current = trackId;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', trackId);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetTrackId: string) => {
        e.preventDefault();
        if (draggedTrackIdRef.current && draggedTrackIdRef.current !== targetTrackId) {
            onReorderTracks(draggedTrackIdRef.current, targetTrackId);
        }
        draggedTrackIdRef.current = null;
    };
    
    return (
        <div className="w-64 bg-gray-800 border-r border-black/30 flex flex-col">
            <div className="h-6 px-2 border-b border-black/30 flex-shrink-0 flex items-center relative">
                 <button onClick={() => setAddMenuOpen(o => !o)} className="w-full h-full flex items-center justify-center bg-gray-700 hover:bg-violet-600 rounded-sm text-sm">
                    <Plus size={16} className="mr-2" /> Adicionar Trilha
                </button>
                 {addMenuOpen && (
                    <div ref={addMenuRef} className="absolute top-full left-0 mt-1 w-52 bg-gray-900 border border-gray-700 rounded-md shadow-lg z-50">
                        {(['video', 'audio', 'text', 'spectrum', 'shape', 'emoji'] as Track['type'][]).map(type => (
                            <button key={type} onClick={() => { onAddTrack(type); setAddMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-700">
                                {iconMap[type]}
                                <span className="capitalize">{type === 'video' ? 'Vídeo/Imagem' : type === 'audio' ? 'Áudio' : type === 'text' ? 'Texto' : type === 'spectrum' ? 'Espectro' : type === 'shape' ? 'Forma' : 'Emoji'}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <div ref={scrollRef} onScroll={onScroll} className="overflow-y-auto flex-grow">
                {tracks.map(track => {
                    const captionClipsOnTrack = timelineClips.filter(c => c.trackId === track.id && c.id.startsWith('caption-clip-'));
                    const hasCaptions = captionClipsOnTrack.length > 0;
                    const areAllCaptionsSelected = hasCaptions && captionClipsOnTrack.every(c => selectedClipIds.includes(c.id));

                    return (
                        <div key={track.id} 
                            className={`h-10 border-b border-black/30 flex items-center p-2 gap-2 cursor-pointer ${selectedTrackIds.includes(track.id) ? 'bg-violet-900/50' : 'hover:bg-gray-700/50'}`}
                            onClick={(e) => onSelectTrack(track.id, e.metaKey || e.ctrlKey, e.shiftKey)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, track.id)}
                        >
                            <div 
                                className="cursor-move"
                                draggable
                                onDragStart={(e) => {
                                    e.stopPropagation();
                                    handleDragStart(e, track.id);
                                }}
                            >
                                <GripVertical size={16} className="text-gray-500" />
                            </div>
                            <div className="text-violet-400">{iconMap[track.type]}</div>
                            <div className="flex-grow">
                                {editingTrackId === track.id ? (
                                    <input
                                        type="text"
                                        defaultValue={track.name}
                                        autoFocus
                                        onBlur={(e) => { onRenameTrack(track.id, e.target.value); setEditingTrackId(null); }}
                                        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                        className="w-full bg-gray-900 border border-violet-500 rounded px-1 text-xs"
                                        onClick={e => e.stopPropagation()}
                                    />
                                ) : (
                                    <p onDoubleClick={() => setEditingTrackId(track.id)} className="text-xs font-semibold truncate">{track.name}</p>
                                )}
                            </div>
                            {hasCaptions && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onSelectAllClipsOnTrack(track.id); }}
                                    title={areAllCaptionsSelected ? "Desmarcar todas as legendas" : "Selecionar todas as legendas"}
                                    className={`p-1 rounded-full transition-colors ${areAllCaptionsSelected ? 'bg-violet-600 text-white' : 'hover:bg-gray-600 text-gray-400'}`}
                                >
                                    <Layers3 size={16} />
                                </button>
                            )}
                            {(track.type === 'audio' || track.type === 'video') && (
                                <>
                                    <input
                                        type="range"
                                        min="0" max="1" step="0.01"
                                        value={track.volume}
                                        onChange={(e) => onSetTrackVolume(track.id, parseFloat(e.target.value))}
                                        onMouseDown={(e) => { e.stopPropagation(); onInteractionStart(); }}
                                        onMouseUp={onInteractionEnd}
                                        onTouchStart={(e) => { e.stopPropagation(); onInteractionStart(); }}
                                        onTouchEnd={onInteractionEnd}
                                        className="w-12 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                                        onClick={e => e.stopPropagation()}
                                    />
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onToggleMuteTrack(track.id); }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        className="p-1 hover:bg-gray-600 rounded-full"
                                    >
                                        {track.isMuted ? <VolumeX size={16} className="text-red-400"/> : <Volume2 size={16} className="text-gray-400"/>}
                                    </button>
                                </>
                            )}
                             <div className="relative">
                                <button onClick={(e) => { e.stopPropagation(); setMenuTrackId(menuTrackId === track.id ? null : track.id); }} className="p-1 hover:bg-gray-600 rounded-full">
                                    <ChevronDown size={16} className="text-gray-400"/>
                                </button>
                                {menuTrackId === track.id && (
                                    <div ref={menuRef} className="absolute bottom-full right-0 mb-1 w-40 bg-gray-900 border border-gray-700 rounded-md shadow-lg z-50">
                                        <button onClick={() => { onDuplicateSelectedTracks(); setMenuTrackId(null); }} className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-700"><Layers3 size={14}/> Duplicar</button>
                                        <button onClick={() => { onDeleteTrack(track.id); setMenuTrackId(null); }} className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20"><Trash2 size={14}/> Excluir</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

export const Timeline: React.FC<TimelineProps> = (props) => {
    const { onUndo, onRedo, canUndo, canRedo, onCopyClip, onPasteClip, copiedClip, onDeleteSelectedClips, onSplitClipAtPlayhead, selectedClipIds, isSnappingEnabled, onSetIsSnappingEnabled, timelineZoom, onSetTimelineZoom, masterDuration, playheadRef, onSeek, masterCurrentTime, formatTime, isPlaying, onPlay, onPause, onStop, timeDisplayRef, tracks, onMoveClips, onTrimClip, timelineClips, mediaPool, onSelectClip } = props;
    
    const timelineContainerRef = useRef<HTMLDivElement>(null);
    const headersScrollRef = useRef<HTMLDivElement>(null);
    const lanesContainerRef = useRef<HTMLDivElement>(null);
    const isScrollingProgrammatically = useRef(false);

    const [timelineWidth, setTimelineWidth] = useState(2000);
    const [clipDragState, setClipDragState] = useState<ClipDragState | null>(null);
    const [transitionDropTarget, setTransitionDropTarget] = useState<{ clipAId: string; clipBId: string; position: number } | null>(null);
    const [isZoomPresetOpen, setIsZoomPresetOpen] = useState(false);

    const pixelsPerSecond = BASE_PIXELS_PER_SECOND * timelineZoom;

    const handleFitTimeline = useCallback(() => {
        if (!lanesContainerRef.current) return;
        const containerWidth = lanesContainerRef.current.clientWidth;
        const padding = 120;
        const availableWidth = Math.max(200, containerWidth - padding);
        
        let maxContentDuration = masterDuration;
        timelineClips.forEach(clip => {
            const displayDuration = (clip.endTime - clip.startTime) / (clip.speed || 1);
            const clipEnd = clip.timelineStart + displayDuration;
            if (clipEnd > maxContentDuration) maxContentDuration = clipEnd;
        });

        if (maxContentDuration <= 0) return;

        const targetZoom = availableWidth / (maxContentDuration * BASE_PIXELS_PER_SECOND);
        const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(targetZoom * 100) / 100));
        
        onSetTimelineZoom(clampedZoom);
        if (lanesContainerRef.current) {
            lanesContainerRef.current.scrollLeft = 0;
        }
    }, [masterDuration, timelineClips, onSetTimelineZoom]);

    useEffect(() => {
        const container = lanesContainerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.altKey || e.metaKey) {
                e.preventDefault();
                e.stopPropagation();

                const rect = container.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const currentScrollLeft = container.scrollLeft;

                const currentPps = BASE_PIXELS_PER_SECOND * timelineZoom;
                const timeAtCursor = (currentScrollLeft + mouseX) / Math.max(0.001, currentPps);

                const zoomFactor = e.deltaY < 0 ? 1.18 : 0.82;
                const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(timelineZoom * zoomFactor * 100) / 100));

                if (newZoom !== timelineZoom) {
                    onSetTimelineZoom(newZoom);

                    requestAnimationFrame(() => {
                        const newPps = BASE_PIXELS_PER_SECOND * newZoom;
                        const newScrollLeft = (timeAtCursor * newPps) - mouseX;
                        container.scrollLeft = Math.max(0, newScrollLeft);
                    });
                }
            }
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, [timelineZoom, onSetTimelineZoom]);
    
    const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        // Deselect if the click is on the background container itself
        // or on an element that is clearly part of the "empty" timeline area, like a track lane.
        if (e.target === e.currentTarget || target.classList.contains('track-lane')) {
            onSelectClip(null, false, false);
        }
    };
    
    useEffect(() => {
        const newWidth = Math.max(2000, masterDuration * pixelsPerSecond + 500);
        if(timelineWidth !== newWidth) setTimelineWidth(newWidth);
    }, [masterDuration, pixelsPerSecond, timelineWidth]);
    
    useEffect(() => {
        if (lanesContainerRef.current) {
            const container = lanesContainerRef.current;
            const playheadPosition = masterCurrentTime * pixelsPerSecond;
            const containerWidth = container.clientWidth;
            const scrollLeft = container.scrollLeft;
            const buffer = 80;

            if (playheadPosition < scrollLeft + buffer && scrollLeft > 0) {
                container.scrollTo({
                    left: playheadPosition - containerWidth / 2,
                    behavior: isPlaying ? 'smooth' : 'auto'
                });
            } else if (playheadPosition > scrollLeft + containerWidth - buffer) {
                container.scrollTo({
                    left: playheadPosition - containerWidth / 2,
                    behavior: isPlaying ? 'smooth' : 'auto'
                });
            }
        }
    }, [masterCurrentTime, isPlaying, pixelsPerSecond]);


    const handleLanesScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        if (isScrollingProgrammatically.current) return;

        if (lanesContainerRef.current && headersScrollRef.current) {
            isScrollingProgrammatically.current = true;
            headersScrollRef.current.scrollTop = e.currentTarget.scrollTop;
            requestAnimationFrame(() => {
                isScrollingProgrammatically.current = false;
            });
        }
    }, []);

    const handleHeadersScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        if (isScrollingProgrammatically.current) return;
        
        if (lanesContainerRef.current && headersScrollRef.current) {
            isScrollingProgrammatically.current = true;
            lanesContainerRef.current.scrollTop = e.currentTarget.scrollTop;
            requestAnimationFrame(() => {
                isScrollingProgrammatically.current = false;
            });
        }
    }, []);
    
    const handleRulerInteraction = (e: React.MouseEvent | React.TouchEvent) => {
        if (!lanesContainerRef.current) return;
        
        e.preventDefault();
        e.stopPropagation();

        const container = lanesContainerRef.current;
        const rect = container.getBoundingClientRect();
        
        const calculateTime = (clientX: number) => {
            const x = clientX - rect.left;
            const time = (x + container.scrollLeft) / pixelsPerSecond;
            return Math.max(0, Math.min(time, masterDuration));
        };
        
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const initialTime = calculateTime(clientX);
        if (playheadRef && 'current' in playheadRef && playheadRef.current) {
            playheadRef.current.style.left = `${initialTime * pixelsPerSecond}px`;
        }
        onSeek(initialTime);

        const onMove = (moveEvent: MouseEvent | TouchEvent) => {
            if ('touches' in moveEvent && moveEvent.cancelable) moveEvent.preventDefault();
            const currentClientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
            const newTime = calculateTime(currentClientX);
            if (playheadRef && 'current' in playheadRef && playheadRef.current) {
                playheadRef.current.style.left = `${newTime * pixelsPerSecond}px`;
            }
            onSeek(newTime);
        };

        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('touchend', onUp);
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('mouseup', onUp);
        window.addEventListener('touchend', onUp);
    };

    const handleClipInteractionStart = useCallback((e: React.MouseEvent | React.TouchEvent, clipId: string, action: 'move' | 'trim-start' | 'trim-end') => {
        e.stopPropagation();
        props.onInteractionStart();
        
        let clipsToDrag: { id: string, trackId: string, initialTimelineStart: number, initialStartTime: number, initialEndTime: number, speed: number }[];
        if (selectedClipIds.includes(clipId)) {
            clipsToDrag = timelineClips.filter(c => selectedClipIds.includes(c.id)).map(c => ({
                id: c.id, trackId: c.trackId, initialTimelineStart: c.timelineStart,
                initialStartTime: c.startTime, initialEndTime: c.endTime, speed: c.speed || 1,
            }));
        } else {
            props.onSelectClip(clipId, false, false);
            const clip = timelineClips.find(c => c.id === clipId)!;
            clipsToDrag = [{
                id: clip.id, trackId: clip.trackId, initialTimelineStart: clip.timelineStart,
                initialStartTime: clip.startTime, initialEndTime: clip.endTime, speed: clip.speed || 1,
            }];
        }
        
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        setClipDragState({ action, clips: clipsToDrag, draggedClipId: clipId, initialX: clientX });
    }, [selectedClipIds, timelineClips, props.onSelectClip, props.onInteractionStart]);

    useEffect(() => {
        if (!clipDragState) return;

        const handleMove = (e: MouseEvent | TouchEvent) => {
            if ('touches' in e && e.cancelable) e.preventDefault();
            
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const dx = clientX - clipDragState.initialX;
            const timeDelta = dx / pixelsPerSecond;
            
            if (clipDragState.action === 'move') {
                const targetTrackElement = (e.target as HTMLElement).closest('.track-lane');
                const targetTrackId = targetTrackElement?.getAttribute('data-track-id');
                const draggedClip = timelineClips.find(c => c.id === clipDragState.draggedClipId);
                if (!draggedClip) return;
                
                let canDrop = false;
                if(targetTrackId) {
                    const targetTrack = tracks.find(t => t.id === targetTrackId);
                    const typeMap: Record<Track['type'], VideoClipType[]> = {
                        video: ['video', 'image'], audio: ['audio'], text: ['text'], spectrum: ['spectrum'], shape: ['shape', 'image'], emoji: ['emoji'],
                    };
                    if (targetTrack && typeMap[targetTrack.type].includes(draggedClip.type as VideoClipType)) {
                        canDrop = true;
                    }
                }
                
                const updates = clipDragState.clips.map(clip => {
                    let newTimelineStart = clip.initialTimelineStart + timeDelta;
                    if (isSnappingEnabled) {
                        const snapPoints = [0, ...timelineClips.flatMap(c => [c.timelineStart, c.timelineStart + (c.endTime-c.startTime)/(c.speed||1)])];
                        for(const point of snapPoints) {
                            if(Math.abs(newTimelineStart - point) < (5 / pixelsPerSecond)) newTimelineStart = point;
                        }
                    }

                    return {
                        clipId: clip.id,
                        newTrackId: canDrop ? targetTrackId! : clip.trackId,
                        newTimelineStart: Math.max(0, newTimelineStart),
                    }
                });
                onMoveClips(updates);

            } else { // Trim
                const draggedClip = clipDragState.clips[0];
                if (!draggedClip) return;
                
                if (clipDragState.action === 'trim-start') {
                    const newStartTime = Math.max(0, draggedClip.initialStartTime + timeDelta * draggedClip.speed);
                    const newTimelineStart = draggedClip.initialTimelineStart + timeDelta;
                    if (newStartTime < draggedClip.initialEndTime && newTimelineStart >= 0) {
                        onTrimClip(draggedClip.id, { startTime: newStartTime, timelineStart: newTimelineStart });
                    }
                } else if (clipDragState.action === 'trim-end') {
                    const poolClip = mediaPool.find(p => p.id === timelineClips.find(c=>c.id === draggedClip.id)?.poolId);
                    const maxDuration = poolClip?.duration || Infinity;
                    const newEndTime = Math.min(maxDuration, draggedClip.initialEndTime + timeDelta * draggedClip.speed);
                    if (newEndTime > draggedClip.initialStartTime) {
                         onTrimClip(draggedClip.id, { endTime: newEndTime });
                    }
                }
            }
        };

        const handleUp = () => {
            setClipDragState(null);
            props.onInteractionEnd();
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('mouseup', handleUp);
        window.addEventListener('touchend', handleUp);
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('touchend', handleUp);
        };
    }, [clipDragState, pixelsPerSecond, onMoveClips, onTrimClip, timelineClips, tracks, mediaPool, isSnappingEnabled, props.onInteractionEnd]);

    return (
        <div className="h-full flex flex-col bg-gray-900 text-white">
            {/* Timeline Controls */}
            <div className="flex-shrink-0 h-12 bg-gray-800 border-b border-black/30 flex items-center justify-between px-3 gap-4">
                <div className="flex items-center gap-2">
                    <button onClick={onUndo} disabled={!canUndo} className="p-2 hover:bg-gray-700 rounded-full disabled:opacity-50"><Undo size={18} /></button>
                    <button onClick={onRedo} disabled={!canRedo} className="p-2 hover:bg-gray-700 rounded-full disabled:opacity-50"><Redo size={18} /></button>
                    <div className="w-px h-6 bg-gray-600 mx-2"></div>
                    <button onClick={onCopyClip} disabled={selectedClipIds.length !== 1} className="p-2 hover:bg-gray-700 rounded-full disabled:opacity-50"><Copy size={18} /></button>
                    <button onClick={onPasteClip} disabled={!copiedClip} className="p-2 hover:bg-gray-700 rounded-full disabled:opacity-50"><ClipboardPaste size={18} /></button>
                    <button onClick={onSplitClipAtPlayhead} disabled={selectedClipIds.length !== 1} className="p-2 hover:bg-gray-700 rounded-full disabled:opacity-50"><Scissors size={18} /></button>
                    <button onClick={onDeleteSelectedClips} disabled={selectedClipIds.length === 0} className="p-2 hover:bg-gray-700 rounded-full disabled:opacity-50"><Trash2 size={18} /></button>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => onSeek(0)} className="p-2 hover:bg-gray-700 rounded-full"><SkipBack size={20} /></button>
                    {isPlaying ? (
                        <button onClick={onPause} className="p-3 bg-violet-600 hover:bg-violet-700 rounded-full"><Pause size={24} /></button>
                    ) : (
                        <button onClick={onPlay} className="p-3 bg-violet-600 hover:bg-violet-700 rounded-full"><Play size={24} /></button>
                    )}
                    <button onClick={onStop} className="p-2 hover:bg-gray-700 rounded-full"><Square size={20} /></button>
                     <span ref={timeDisplayRef} className="text-lg font-mono w-28 text-center">{formatTime(masterCurrentTime)}</span>
                </div>
                <div className="flex items-center gap-2">
                     <button 
                        onClick={() => onSetIsSnappingEnabled(!isSnappingEnabled)} 
                        className={`p-2 rounded-full transition-colors ${isSnappingEnabled ? 'bg-violet-600 text-white' : 'hover:bg-gray-700 text-gray-300'}`}
                        title={isSnappingEnabled ? "Snap ativado (Magnet)" : "Snap desativado"}
                     >
                        <Magnet size={18}/>
                     </button>
                     <div className="w-px h-6 bg-gray-700 mx-1"></div>

                     <div className="flex items-center gap-1 bg-gray-800/90 p-1 rounded-lg border border-gray-700/60">
                        <button 
                            onClick={handleFitTimeline} 
                            className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-700/80 rounded transition-colors"
                            title="Ajustar projeto à tela (Shift + Z)"
                        >
                            <Maximize2 size={16} />
                        </button>
                        <div className="w-px h-4 bg-gray-700"></div>
                        <button 
                            onClick={() => {
                                const newZ = Math.max(MIN_ZOOM, Math.round((timelineZoom * 0.8) * 100) / 100);
                                onSetTimelineZoom(newZ);
                            }} 
                            className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-700/80 rounded transition-colors"
                            title="Diminuir Zoom (Ctrl -)"
                        >
                            <ZoomOut size={16} />
                        </button>
                        
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="0.5"
                            value={zoomToSlider(timelineZoom)}
                            onChange={(e) => onSetTimelineZoom(sliderToZoom(parseFloat(e.target.value)))}
                            onDoubleClick={() => onSetTimelineZoom(1.0)}
                            className="w-24 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-violet-500 hover:accent-violet-400"
                            title="Duplo clique para 100%"
                        />

                        <button 
                            onClick={() => {
                                const newZ = Math.min(MAX_ZOOM, Math.round((timelineZoom * 1.25) * 100) / 100);
                                onSetTimelineZoom(newZ);
                            }} 
                            className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-700/80 rounded transition-colors"
                            title="Aumentar Zoom (Ctrl +)"
                        >
                            <ZoomIn size={16} />
                        </button>

                        <div className="relative">
                            <button
                                onClick={() => setIsZoomPresetOpen(!isZoomPresetOpen)}
                                onDoubleClick={() => onSetTimelineZoom(1.0)}
                                className="px-2 py-0.5 text-xs font-mono text-violet-300 bg-violet-950/60 hover:bg-violet-900/80 border border-violet-800/50 rounded flex items-center gap-1 transition-colors select-none"
                                title="Menu de Zoom (Duplo clique para 100%)"
                            >
                                <span>{Math.round(timelineZoom * 100)}%</span>
                                <ChevronDown size={12} className="opacity-70" />
                            </button>

                            {isZoomPresetOpen && (
                                <div 
                                    className="absolute right-0 bottom-full mb-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-1 text-xs"
                                    onMouseLeave={() => setIsZoomPresetOpen(false)}
                                >
                                    <button
                                        onClick={() => { handleFitTimeline(); setIsZoomPresetOpen(false); }}
                                        className="w-full text-left px-3 py-1.5 hover:bg-violet-600/30 hover:text-violet-200 flex items-center justify-between transition-colors"
                                    >
                                        <span className="font-medium">Ajustar à Tela</span>
                                        <Maximize2 size={12} className="opacity-60" />
                                    </button>
                                    <div className="my-1 border-t border-gray-700"></div>
                                    {[0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 4.0, 8.0, 15.0].map(preset => (
                                        <button
                                            key={preset}
                                            onClick={() => { onSetTimelineZoom(preset); setIsZoomPresetOpen(false); }}
                                            className={`w-full text-left px-3 py-1.5 hover:bg-gray-700/80 flex items-center justify-between transition-colors ${Math.abs(timelineZoom - preset) < 0.02 ? 'text-violet-400 font-bold bg-violet-900/20' : 'text-gray-200'}`}
                                        >
                                            <span>{Math.round(preset * 100)}% {preset === 1.0 ? '(Padrão)' : preset === 15.0 ? '(Precisão)' : ''}</span>
                                            {Math.abs(timelineZoom - preset) < 0.02 && <Check size={12} />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {/* Main timeline area */}
            <div className="flex-grow flex flex-row overflow-hidden" ref={timelineContainerRef}>
                <TrackHeaders
                    tracks={props.tracks}
                    selectedTrackIds={props.selectedTrackIds}
                    onSelectTrack={props.onSelectTrack}
                    onRenameTrack={props.onRenameTrack}
                    onDeleteTrack={props.onDeleteTrack}
                    onToggleMuteTrack={props.onToggleMuteTrack}
                    onSetTrackVolume={props.onSetTrackVolume}
                    onAddTrack={props.onAddTrack}
                    onReorderTracks={props.onReorderTracks}
                    onDuplicateSelectedTracks={props.onDuplicateSelectedTracks}
                    scrollRef={headersScrollRef}
                    onScroll={handleHeadersScroll}
                    onSelectAllClipsOnTrack={props.onSelectAllClipsOnTrack}
                    timelineClips={props.timelineClips}
                    selectedClipIds={props.selectedClipIds}
                    onInteractionStart={props.onInteractionStart}
                    onInteractionEnd={props.onInteractionEnd}
                />
                <div className="flex-grow overflow-auto relative" ref={lanesContainerRef} onScroll={handleLanesScroll}>
                    <div
                        className="relative"
                        style={{ width: timelineWidth, height: `${24 + tracks.length * 40}px` }}
                        onClick={handleBackgroundClick}
                    >
                        <div className="absolute top-0 h-full w-full">
                            <div className="sticky top-0 z-30 h-6 cursor-pointer" onMouseDown={handleRulerInteraction} onTouchStart={handleRulerInteraction}>
                                <TimelineGrid width={timelineWidth} duration={masterDuration} pixelsPerSecond={pixelsPerSecond} />
                            </div>
                            <div className="relative" style={{height: `${tracks.length * 40}px`}}>
                                {tracks.map(track => (
                                    <TrackLane
                                        key={track.id}
                                        track={track}
                                        timelineClips={timelineClips}
                                        timelineTransitions={props.timelineTransitions}
                                        selectedClipIds={selectedClipIds}
                                        mediaPool={mediaPool}
                                        pixelsPerSecond={pixelsPerSecond}
                                        onClipInteractionStart={handleClipInteractionStart}
                                        onAddClipToTrack={props.onAddClipToTrack}
                                        onAddOrUpdateTransition={props.onAddOrUpdateTransition}
                                        defaultTransition={props.defaultTransition}
                                        onEditTransitionBetween={props.onEditTransitionBetween}
                                        transitionDropTarget={transitionDropTarget}
                                        setTransitionDropTarget={setTransitionDropTarget}
                                        touchHoverInfo={props.touchHoverInfo}
                                    />
                                ))}
                            </div>
                        </div>
                         <Playhead ref={playheadRef} currentTime={masterCurrentTime} pixelsPerSecond={pixelsPerSecond} onSeek={onSeek} containerRef={lanesContainerRef} />
                    </div>
                </div>
            </div>
        </div>
    );
};