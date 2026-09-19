
import React, { useState, useRef, useCallback, useEffect, useMemo, useReducer, useLayoutEffect } from 'react';
// FIX: Imported VideoClipType to resolve multiple 'Cannot find name' errors.
import { ProjectFormat, OverlayEffect, VideoClip, Scene, MediaPoolClip, Track, AnalyserFrame, PreviewQuality as PreviewQualityType, SpectrumStyle, LogoShape, TimelineTransition, TransitionType, VideoEffectType, ShapeType, ProjectState, VideoClipType, AnimatedBorder } from '../types';
import { Canvas, type CanvasHandle } from './Canvas';
import Modal from './Modal';
import { ArrowLeft, ZoomIn, ZoomOut, FileDown, FileUp, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, CheckCircle, AlertCircle, Film, Edit, Copy, Check, Play, Pause, Square, Power, Menu, X, Monitor, Smartphone, Upload, Image as ImageIcon, Sparkles, Type as TypeIcon, Snowflake, Aperture, Code, Flame, Shapes, PlusCircle, Mic, Sprout, Wand2, Trash2, ImagePlay, Maximize, Minimize, SlidersHorizontal, Layers, GripVertical, Settings2, Video as VideoIcon, Music, Search, Camera, Clapperboard, Activity, Waves, CloudFog, Sun, Zap, Star, Circle as CircleIcon, Triangle as TriangleIcon, Smile, Captions, Bot, Plus, VolumeX, Volume2, Layers3, Undo, Redo, ClipboardPaste, Scissors, SkipBack, Magnet, Move, Grid, CloudRain, Signal, CassetteTape, Tv, Building2, RectangleHorizontal, Palette, Stars, Cloudy, Orbit, Rocket, Download, FileText, Layout, MoveVertical, RotateCw, Save, Clock } from 'lucide-react';
import ExportModal from './ExportModal';
import { Muxer, StreamTarget } from 'mp4-muxer';
import { OverlayRenderer } from './OverlayEffects';
import { Timeline } from './VideoTimelineEditor';
import { historyReducer, ActionType, HistoryState } from '../utils/history';
import { renderAudioAndGetAnalyserFrames, calculateFadeMultiplier, generateWaveformData, reverseAudioBuffer, getPulseAmount, audioBufferToWavBlob, renderOfflineAudio, setupAudioGraphForRendering, getAudioBufferFromFile, refineWordTimestampsWithAudioEnergy, WordChunk } from '../utils/audio';
import { getAvcCodecString, loadAndCacheImage, renderFrameOnCanvas, preloadVisualAssets, seekVideoAndGetFrameBitmap, loadAndCacheVideo, findOverlayEffectForTime } from '../utils/export';
import { FORMAT_DIMENSIONS, BASE_PIXELS_PER_SECOND, SPECTRUM_MODELS, TRANSITION_MODELS, VIDEO_EFFECTS, PRESET_TEXT_STYLES, CAPTION_PRESET_STYLES, hexToRgba } from '../constants';
import Splitter from './Splitter';
// FIX: The error "Module has no default export" suggests that TextEditor is a named export. Updated the import to use curly braces.
import { TextEditor } from './TextEditor';
import TransitionEditorModal from './TransitionEditorModal';
import { StickerLibraryModal } from './StickerLibraryModal';
import { EmojiLibraryModal } from './EmojiLibraryModal';
import { StickerItem } from '../data/stickers';
import JSZip from 'jszip';


declare var AudioEncoder: any;
declare var AudioData: any;
type EncodedAudioChunk = any;
declare var VideoEncoder: any;
declare var VideoFrame: any;
type VideoFrameCallbackMetadata = any;
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

// Moved effectInfoMap to module scope for reuse and to fix icon errors in one place.
const effectInfoMap: Record<OverlayEffect, { icon: React.ReactNode; name: string }> = {
    'none': { icon: <X size={16} />, name: 'Nenhum' },
    'snow': { icon: <Snowflake size={16} />, name: 'Neve' },
    'bokeh': { icon: <Aperture size={16} />, name: 'Bokeh' },
    'digital-rain': { icon: <Code size={16} />, name: 'Digital' },
    'fire-particles': { icon: <Flame size={16} />, name: 'Fogo' },
    'particles_light': { icon: <Sparkles size={16} />, name: 'Partículas' },
    'water_waves': { icon: <Waves size={16} />, name: 'Ondas' },
    'smoke': { icon: <CloudFog size={16} />, name: 'Fumaça' },
    'lens_flare': { icon: <Sun size={16} />, name: 'Flare' },
    'falling_leaves': { icon: <Sprout size={16} />, name: 'Folhas' },
    'lightning': { icon: <Zap size={16} />, name: 'Relâmpago' },
    'light-leaks': { icon: <Wand2 size={16} />, name: 'Vaz. Luz' },
    'film-grain': { icon: <Grid size={16} />, name: 'Granulação' },
    'dust-particles': { icon: <Sparkles size={16} />, name: 'Poeira' },
    'rain-on-glass': { icon: <CloudRain size={16} />, name: 'Chuva Vidro' },
    'glitch': { icon: <Signal size={16} />, name: 'Glitch' },
    'vhs': { icon: <CassetteTape size={16} />, name: 'VHS' },
    'crt': { icon: <Tv size={16} />, name: 'CRT' },
    'neon-lights': { icon: <Building2 size={16} />, name: 'Neon' },
    'flames': { icon: <Flame size={16} />, name: 'Chamas' },
    'starfield-motion': { icon: <Stars size={16} />, name: 'Estrelas' },
    'nebula-glow': { icon: <Cloudy size={16} />, name: 'Nebulosa' },
    'cosmic-dust': { icon: <Sparkles size={16} />, name: 'Poeira Cósmica' },
    'galaxy-swirl': { icon: <Orbit size={16} />, name: 'Galáxia' },
    'aurora-wave': { icon: <Waves size={16} />, name: 'Aurora' },
    'deep-space-blur': { icon: <Aperture size={16} />, name: 'Espaço Profundo' },
    'comet-trails': { icon: <Rocket size={16} />, name: 'Cometas' },
    'beat-flash': { icon: <Zap size={16} />, name: 'Flash Batida' },
    'beat-brightness': { icon: <Sun size={16} />, name: 'Brilho Batida' },
    'beat-zoom': { icon: <ZoomIn size={16} />, name: 'Zoom Batida' },
    'beat-shake': { icon: <Move size={16} />, name: 'Shake Batida' },
    'beat-color-pop': { icon: <Palette size={16} />, name: 'Cor Batida' },
    'beat-particle-burst': { icon: <Sparkles size={16} />, name: 'Explosão' },
    'motion-scale-pulse': { icon: <Activity size={16} />, name: 'Pulso' },
    'beat-stretch': { icon: <RectangleHorizontal size={16} />, name: 'Estica' },
    'beat-flash-dual': { icon: <Zap size={16} />, name: 'Flash Duplo' },
    'beat-border-glow': { icon: <Square size={16} />, name: 'Borda' },
};


// Polyfill for FileList to be used with Pexels API integration
class DataTransfer_Filelist extends Array<File> {
    get files() { return this; }
}

interface EditorProps {
  format: ProjectFormat;
  onBack: () => void;
  onGoToAbout: () => void;
  onGoToDonate: () => void;
  onOpenWindowsModal?: () => void;
  deferredPrompt?: any;
}

type Quality = '480p' | '720p' | '1080p';
type MobileTab = 'media' | 'editor' | 'properties' | 'timeline';

const PIX_KEY = 'rcaapps2@gmail.com';

const PEXELS_API_KEY = 'FFkIHrTg6YPdqyYUmZkqvUJsL8DJgvupBEHYlJk2vm6PgnxpB7j90kWn';

interface PexelsPhoto {
  id: number;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  photographer: string;
  photographer_url: string;
  avg_color: string;
  alt: string;
}

interface PexelsVideo {
  id: number;
  image: string; // This is the thumbnail
  duration: number;
  user: { name: string; url: string; };
  video_files: {
    id: number;
    quality: 'sd' | 'hd' | 'hls';
    file_type: string;
    width: number;
    height: number;
    link: string;
  }[];
}

const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00.0';
    const floorSeconds = Math.floor(seconds);
    const min = Math.floor(floorSeconds / 60);
    const sec = floorSeconds % 60;
    const ms = Math.floor((seconds - floorSeconds) * 10);
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${ms}`;
};

const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    return isMobile;
};


// --- Components moved from Sidebar.tsx ---

const SidebarButton: React.FC<{ onClick?: () => void; children: React.ReactNode; as?: 'label', htmlFor?: string, isActive?: boolean, disabled?: boolean, title?: string }> = ({ onClick, children, as, htmlFor, isActive, disabled, title }) => {
  const Tag = as || 'button';
  const activeClass = isActive ? 'bg-violet-600 text-white' : 'bg-gray-700 hover:bg-violet-600';
  const disabledClass = 'disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const commonProps = {
    onClick: onClick,
    className: `w-full flex items-center text-left ${activeClass} ${disabledClass} transition-colors duration-200 px-3 py-1.5 rounded-md font-medium text-sm cursor-pointer`,
    disabled: disabled,
    title: title
  };

  if (Tag === 'label') {
    return <label htmlFor={htmlFor} {...commonProps}>{children}</label>;
  }
  
  return <button {...commonProps}>{children}</button>;
};

const ToggleButton: React.FC<{ isEnabled: boolean; onClick: () => void; children: React.ReactNode }> = ({ isEnabled, onClick, children }) => (
    <button onClick={onClick} className={`w-full text-left p-1.5 rounded-md text-sm font-medium flex items-center justify-between ${isEnabled ? 'bg-violet-600 text-white' : 'bg-gray-800 hover:bg-gray-700'} transition-colors`}>
        <span>{children}</span>
        <div className={`w-10 h-5 flex items-center rounded-full p-1 duration-300 ease-in-out ${isEnabled ? 'bg-violet-400' : 'bg-gray-600'}`}>
            <div className={`bg-white w-3 h-3 rounded-full shadow-md transform duration-300 ease-in-out ${isEnabled ? 'translate-x-5' : ''}`}></div>
        </div>
    </button>
);


const MediaBin: React.FC<{
    mediaPool: MediaPoolClip[];
    onUpload: (files: FileList) => void;
    onAddClip: (clip: MediaPoolClip) => void;
    onClipTouchStart: (clip: MediaPoolClip, e: React.TouchEvent) => void;
}> = ({ mediaPool, onUpload, onAddClip, onClipTouchStart }) => {
    
    return (
        <div>
            <h3 className="text-base font-semibold text-violet-300">Mídia</h3>
             <p className="text-xs text-gray-400 mb-3">Carregue seus arquivos. Arraste para a linha do tempo ou clique no '+' para adicionar.</p>
            
            <div className="flex space-x-2 mb-3">
                <input type="file" id="media-pool-video-upload" className="hidden" accept="video/mp4,video/webm" multiple onChange={(e) => e.target.files && onUpload(e.target.files)} />
                <label htmlFor="media-pool-video-upload" className="flex-1 flex items-center justify-center text-center bg-gray-700 hover:bg-violet-600 transition-colors px-2 py-1.5 rounded-md font-medium text-xs cursor-pointer">
                    <Film className="w-4 h-4 mr-1.5" /> Vídeos
                </label>
                
                <input type="file" id="media-pool-image-upload" className="hidden" accept="image/jpeg,image/png,image/gif,image/webp" multiple onChange={(e) => e.target.files && onUpload(e.target.files)} />
                <label htmlFor="media-pool-image-upload" className="flex-1 flex items-center justify-center text-center bg-gray-700 hover:bg-violet-600 transition-colors px-2 py-1.5 rounded-md font-medium text-xs cursor-pointer">
                    <ImageIcon className="w-4 h-4 mr-1.5" /> Imagens
                </label>
                
                <input type="file" id="media-pool-audio-upload" className="hidden" accept="audio/mp3,audio/wav,audio/mpeg,audio/aac,audio/flac" multiple onChange={(e) => e.target.files && onUpload(e.target.files)} />
                <label htmlFor="media-pool-audio-upload" className="flex-1 flex items-center justify-center text-center bg-gray-700 hover:bg-violet-600 transition-colors px-2 py-1.5 rounded-md font-medium text-xs cursor-pointer">
                    <Mic className="w-4 h-4 mr-1.5" /> Áudios
                </label>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-2">
                {mediaPool.map(clip => (
                    <div key={clip.id} className="relative group aspect-video bg-black rounded-md overflow-hidden"
                         draggable={typeof clip.progress !== 'number' && !clip.error}
                         onDragStart={(e) => {
                             if (typeof clip.progress === 'number' || clip.error) {
                                 e.preventDefault();
                                 return;
                             }
                             const dragPayload = { type: 'media', id: clip.id, src: clip.src, clipType: clip.type };
                             (window as any).__activeDragData = dragPayload;
                             e.dataTransfer.setData('application/json', JSON.stringify(clip));
                             e.dataTransfer.setData('text/plain', JSON.stringify(clip));
                             e.dataTransfer.effectAllowed = 'copy';
                         }}
                         onDragEnd={() => {
                             (window as any).__activeDragData = null;
                         }}
                         onTouchStart={(e) => {
                            if (typeof clip.progress !== 'number' && !clip.error) {
                                onClipTouchStart(clip, e)
                            }
                         }}
                    >
                        {clip.type === 'video' && <video src={clip.src} muted className="w-full h-full object-cover pointer-events-none" />}
                        {clip.type === 'image' && <img src={clip.src} className="w-full h-full object-cover pointer-events-none" alt={clip.fileName} />}
                        {clip.type === 'audio' && <div className="w-full h-full bg-gray-900 flex items-center justify-center"><Mic className="w-8 h-8 text-violet-400" /></div>}

                        {/* Progress overlay */}
                        {typeof clip.progress === 'number' && (
                            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-2 z-10 text-center">
                                <div className="w-full bg-gray-600 rounded-full h-1.5 mb-2">
                                    <div className="bg-violet-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${clip.progress}%` }}></div>
                                </div>
                                <span className="text-xs text-white truncate">{clip.fileName}</span>
                                <span className="text-xs text-violet-300 font-mono">{Math.round(clip.progress)}%</span>
                            </div>
                        )}

                        {/* Error overlay */}
                        {clip.error && (
                             <div className="absolute inset-0 bg-red-900/90 flex flex-col items-center justify-center p-1 text-center z-10">
                                <AlertCircle size={16} className="text-white mb-1"/>
                                <p className="text-white text-xs leading-tight font-semibold">Erro</p>
                                <p className="text-red-200 text-xs leading-tight line-clamp-2" title={clip.error}>{clip.error}</p>
                            </div>
                        )}

                        {/* Normal hover overlay (only if not loading/error) */}
                        {typeof clip.progress !== 'number' && !clip.error && (
                            <>
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1">
                                   <div className="text-white text-xs truncate">{clip.fileName}</div>
                                   <div className="text-white text-xs font-mono self-end">{!isNaN(clip.duration) ? new Date(clip.duration * 1000).toISOString().substr(14, 5) : '--:--'}</div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAddClip(clip);
                                    }}
                                    className="absolute top-1 right-1 bg-gray-900/50 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-violet-600"
                                    title="Adicionar na posição do ponteiro"
                                >
                                    <PlusCircle size={16} />
                                </button>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

const ClipEditor: React.FC<{
  clip: VideoClip;
  onUpdate: (id: string, props: Partial<VideoClip>) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}> = ({ clip, onUpdate, onInteractionStart, onInteractionEnd }) => {
  const handleUpdate = (props: Partial<VideoClip>) => {
    onUpdate(clip.id, props);
  };
  
  const handleAddEffect = (effect: typeof VIDEO_EFFECTS[0]) => {
    handleUpdate({
      effects: {
        ...clip.effects,
        [effect.id]: effect.defaultValue,
      },
    });
  };
  
  const availableEffects = VIDEO_EFFECTS.filter(effect => !clip.effects || clip.effects[effect.id as VideoEffectType] === undefined);

  const clipSourceDuration = clip.type === 'image' ? Infinity : clip.duration;
  const clipTrimmedDuration = clip.endTime - clip.startTime;
  
const allEffects = [{ id: undefined, name: 'Padrão', icon: <Layers size={16}/> }].concat(
    (Object.keys(effectInfoMap) as OverlayEffect[]).map(effect => ({
        id: effect,
        ...effectInfoMap[effect]
    }))
);

  return (
      <div className="space-y-4">
          <h3 className="text-sm font-semibold text-violet-300">EDITAR CLIPE SELECIONADO</h3>
          <p className="text-xs text-gray-400 truncate -mt-2" title={clip.fileName}>{clip.fileName}</p>

          <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                  <label htmlFor="clip-timeline-start" className="block text-xs font-medium text-gray-400 mb-1">Início (Timeline)</label>
                  <input
                      type="number" id="clip-timeline-start"
                      value={clip.timelineStart.toFixed(3)}
                      onChange={(e) => handleUpdate({ timelineStart: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-gray-800 border border-gray-600 rounded-md p-1.5 text-sm focus:ring-violet-500 focus:border-violet-500"
                      step="0.01" min="0"
                  />
              </div>
               <div>
                  <label htmlFor="clip-speed" className="block text-xs font-medium text-gray-400 mb-1">Velocidade</label>
                  <input
                      type="number" id="clip-speed"
                      value={clip.speed || 1}
                      onChange={(e) => handleUpdate({ speed: parseFloat(e.target.value) || 1 })}
                      className="w-full bg-gray-800 border border-gray-600 rounded-md p-1.5 text-sm focus:ring-violet-500 focus:border-violet-500"
                      step="0.1" min="0.1"
                  />
              </div>

              {(clip.type === 'image' || clip.type === 'spectrum' || clip.type === 'shape' || clip.type === 'emoji') ? (
                <div className="col-span-2">
                    <label htmlFor="clip-image-duration" className="block text-xs font-medium text-gray-400 mb-1">Duração (s)</label>
                    <input
                        type="number"
                        id="clip-image-duration"
                        value={(clip.endTime - clip.startTime).toFixed(3)}
                        onChange={(e) => handleUpdate({ endTime: (parseFloat(e.target.value) || 0.1) })}
                        className="w-full bg-gray-800 border border-gray-600 rounded-md p-1.5 text-sm focus:ring-violet-500 focus:border-violet-500"
                        step="0.1"
                        min="0.1"
                    />
                </div>
              ) : (
                <>
                    <div>
                        <label htmlFor="clip-start-time" className="block text-xs font-medium text-gray-400 mb-1">Corte Início (Fonte)</label>
                        <input
                            type="number" id="clip-start-time"
                            value={clip.startTime.toFixed(3)}
                            onChange={(e) => handleUpdate({ startTime: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-gray-800 border border-gray-600 rounded-md p-1.5 text-sm focus:ring-violet-500 focus:border-violet-500"
                            step="0.01" min="0" max={clip.endTime}
                        />
                    </div>
                    <div>
                        <label htmlFor="clip-end-time" className="block text-xs font-medium text-gray-400 mb-1">Corte Fim (Fonte)</label>
                        <input
                            type="number" id="clip-end-time"
                            value={clip.endTime.toFixed(3)}
                            onChange={(e) => handleUpdate({ endTime: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-gray-800 border border-gray-600 rounded-md p-1.5 text-sm focus:ring-violet-500 focus:border-violet-500"
                            step="0.01" min={clip.startTime} max={clipSourceDuration}
                        />
                    </div>
                </>
              )}
              {(clip.type === 'audio' || clip.type === 'video') && (
                <>
                  <div>
                      <label htmlFor="clip-fadein" className="block text-xs font-medium text-gray-400 mb-1">Fade In (s)</label>
                      <input
                          type="number" id="clip-fadein"
                          value={clip.fadeInDuration || 0}
                          onChange={(e) => handleUpdate({ fadeInDuration: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-gray-800 border border-gray-600 rounded-md p-1.5 text-sm focus:ring-violet-500 focus:border-violet-500"
                          step="0.1" min="0" max={clipTrimmedDuration - (clip.fadeOutDuration || 0)}
                      />
                  </div>
                  <div>
                      <label htmlFor="clip-fadeout" className="block text-xs font-medium text-gray-400 mb-1">Fade Out (s)</label>
                      <input
                          type="number" id="clip-fadeout"
                          value={clip.fadeOutDuration || 0}
                          onChange={(e) => handleUpdate({ fadeOutDuration: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-gray-800 border border-gray-600 rounded-md p-1.5 text-sm focus:ring-violet-500 focus:border-violet-500"
                          step="0.1" min="0" max={clipTrimmedDuration - (clip.fadeInDuration || 0)}
                      />
                  </div>
                </>
              )}
          </div>
            {clip.type === 'shape' && (
              <div className="pt-4 border-t border-gray-600 space-y-4">
                  <h4 className="text-sm font-semibold text-violet-300">Propriedades da Forma</h4>
                   <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="shape-fill-color" className="block text-xs font-medium text-gray-300 mb-1">Preenchimento</label>
                            <input
                                type="color"
                                id="shape-fill-color"
                                value={clip.fillColor || '#FFFFFF'}
                                onChange={(e) => handleUpdate({ fillColor: e.target.value })}
                                onFocus={onInteractionStart}
                                onBlur={onInteractionEnd}
                                className="w-full h-10 bg-gray-900 border border-gray-600 rounded-md p-1 cursor-pointer"
                            />
                        </div>
                        <div>
                            <label htmlFor="shape-stroke-color" className="block text-xs font-medium text-gray-300 mb-1">Contorno</label>
                            <input
                                type="color"
                                id="shape-stroke-color"
                                value={clip.strokeColor || '#000000'}
                                onChange={(e) => handleUpdate({ strokeColor: e.target.value })}
                                onFocus={onInteractionStart}
                                onBlur={onInteractionEnd}
                                className="w-full h-10 bg-gray-900 border border-gray-600 rounded-md p-1 cursor-pointer"
                            />
                        </div>
                   </div>
                   <div>
                        <label htmlFor="shape-stroke-width" className="block text-xs font-medium text-gray-300 mb-1">Largura do Contorno (px)</label>
                        <input
                            type="number"
                            id="shape-stroke-width"
                            value={clip.strokeWidth || 0}
                            onChange={(e) => handleUpdate({ strokeWidth: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-gray-800 border border-gray-600 rounded-md p-1.5 text-sm"
                            min="0"
                            step="1"
                        />
                    </div>
                    <div>
                        <label htmlFor="shape-opacity" className="block text-xs font-medium text-gray-300 mb-1">Opacidade ({Math.round((clip.opacity ?? 1) * 100)}%)</label>
                        <input
                            type="range"
                            id="shape-opacity"
                            min="0"
                            max="1"
                            step="0.01"
                            value={clip.opacity ?? 1}
                            onChange={(e) => handleUpdate({ opacity: parseFloat(e.target.value) })}
                            onMouseDown={onInteractionStart}
                            onMouseUp={onInteractionEnd}
                            onTouchStart={onInteractionStart}
                            onTouchEnd={onInteractionEnd}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    <div className="pt-4 border-t border-gray-700/50">
                        <ToggleButton 
                            isEnabled={!!clip.shapeShadow} 
                            onClick={() => handleUpdate({ shapeShadow: !clip.shapeShadow })}
                        >
                            Sombra
                        </ToggleButton>
                        {clip.shapeShadow && (
                            <div className="pl-4 mt-3 space-y-3 border-l-2 border-violet-900/50 ml-2 pt-1 pb-2">
                                <div className="flex items-center gap-4">
                                    <label htmlFor="shape-shadow-color" className="text-xs font-medium text-gray-400">Cor</label>
                                    <input 
                                        type="color" 
                                        id="shape-shadow-color" 
                                        value={clip.shapeShadowColor || '#000000'} 
                                        onChange={(e) => handleUpdate({ shapeShadowColor: e.target.value })} 
                                        onFocus={onInteractionStart} 
                                        onBlur={onInteractionEnd} 
                                        className="w-8 h-8 bg-transparent border-none rounded cursor-pointer" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1 flex justify-between">
                                        <span>Desfoque</span>
                                        <span>{clip.shapeShadowBlur || 0}px</span>
                                    </label>
                                    <input type="range" value={clip.shapeShadowBlur || 0} onChange={(e) => handleUpdate({ shapeShadowBlur: Number(e.target.value) })} onMouseDown={onInteractionStart} onMouseUp={onInteractionEnd} min="0" max="50" step="1" className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1 flex justify-between">
                                        <span>Desloc. X</span>
                                        <span>{clip.shapeShadowOffsetX || 0}px</span>
                                    </label>
                                    <input type="range" value={clip.shapeShadowOffsetX || 0} onChange={(e) => handleUpdate({ shapeShadowOffsetX: Number(e.target.value) })} onMouseDown={onInteractionStart} onMouseUp={onInteractionEnd} min="-50" max="50" step="1" className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1 flex justify-between">
                                        <span>Desloc. Y</span>
                                        <span>{clip.shapeShadowOffsetY || 0}px</span>
                                    </label>
                                    <input type="range" value={clip.shapeShadowOffsetY || 0} onChange={(e) => handleUpdate({ shapeShadowOffsetY: Number(e.target.value) })} onMouseDown={onInteractionStart} onMouseUp={onInteractionEnd} min="-50" max="50" step="1" className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                                </div>
                            </div>
                        )}
                    </div>
              </div>
            )}
           {(clip.type === 'video' || clip.type === 'image' || clip.type === 'shape' || clip.type === 'emoji') && (
            <>
              <div className="pt-4 border-t border-gray-600">
                  <ToggleButton 
                      isEnabled={!!clip.pulsesWithMusic} 
                      onClick={() => handleUpdate({ 
                          pulsesWithMusic: !clip.pulsesWithMusic,
                          ...(clip.pulseStrength === undefined ? { pulseStrength: 0.5 } : {})
                      })}
                  >
                      Pulsar com a música
                  </ToggleButton>
                  {clip.pulsesWithMusic && (
                    <div className="mt-2">
                        <label className="block text-xs font-medium text-gray-400 mb-1 flex justify-between">
                            <span>Força do Pulso</span>
                            <span>{((clip.pulseStrength ?? 0.5) * 100).toFixed(0)}% ({(clip.pulseStrength ?? 0.5).toFixed(2)})</span>
                        </label>
                        <input 
                            type="range" 
                            value={clip.pulseStrength ?? 0.5} 
                            onChange={(e) => handleUpdate({ pulseStrength: Number(e.target.value) })} 
                            onMouseDown={onInteractionStart} 
                            onMouseUp={onInteractionEnd} 
                            min="0" 
                            max="1.0" 
                            step="0.01" 
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" 
                        />
                    </div>
                  )}
              </div>

              {(clip.type === 'image' || clip.type === 'video') && (
                  <div className="pt-4 border-t border-gray-600 space-y-4">
                      <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-violet-300 flex items-center gap-2">
                              <Sparkles size={16} />
                              Efeitos de Zoom & Animação de Mídia
                          </h4>
                      </div>
                      <p className="text-xs text-gray-400 -mt-2">Escolha o estilo de movimento dinâmico, zoom ou pan para esta imagem ou vídeo:</p>

                      {/* Efeitos de Zoom */}
                      <div className="space-y-2">
                          <div className="text-xs font-semibold text-violet-400 flex items-center gap-1.5">
                              <ZoomIn size={14} />
                              <span>Efeitos de Zoom Cinematográfico</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                              {[
                                  { id: 'none', name: 'Nenhum', icon: <X size={16} /> },
                                  { id: 'zoom-in', name: 'Zoom In Suave', icon: <ZoomIn size={16} /> },
                                  { id: 'zoom-out', name: 'Zoom Out Suave', icon: <ZoomOut size={16} /> },
                                  { id: 'zoom-in-fast', name: 'Zoom In Impacto', icon: <Maximize size={16} /> },
                                  { id: 'zoom-out-slow', name: 'Zoom Out Revelação', icon: <Minimize size={16} /> },
                                  { id: 'super-zoom-in', name: 'Super Zoom Reels', icon: <Rocket size={16} /> },
                                  { id: 'dramatic-push-in', name: 'Aproximação Dramática', icon: <Film size={16} /> },
                                  { id: 'zoom-rotate-in', name: 'Zoom Rotação', icon: <Orbit size={16} /> },
                                  { id: 'zoom-bounce', name: 'Zoom Elástico', icon: <Star size={16} /> },
                                  { id: 'zoom-pulse-beat', name: 'Zoom no Ritmo', icon: <Activity size={16} /> },
                                  { id: 'whip-zoom-in', name: 'Whip Zoom', icon: <Zap size={16} /> },
                                  { id: 'breath-zoom', name: 'Zoom Respiração', icon: <Waves size={16} /> },
                              ].map(anim => {
                                  const isSelected = (clip.imageAnimationType || 'none') === anim.id;
                                  return (
                                      <button
                                          key={anim.id}
                                          onClick={() => handleUpdate({ imageAnimationType: anim.id as any })}
                                          className={`p-2 rounded-lg flex flex-col items-center justify-center gap-1 transition-all border text-center text-xs ${isSelected ? 'bg-violet-700/80 border-violet-400 text-white font-bold shadow-md' : 'bg-gray-800/60 border-gray-700/50 hover:border-violet-500/50 hover:bg-gray-700/80 text-gray-300'}`}
                                          title={anim.name}
                                      >
                                          {anim.icon}
                                          <span className="text-[10px] leading-tight block truncate w-full">{anim.name}</span>
                                      </button>
                                  );
                              })}
                          </div>
                      </div>

                      {/* Movimento de Câmera & Ken Burns */}
                      <div className="space-y-2 pt-1">
                          <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                              <Camera size={14} />
                              <span>Movimento Ken Burns & Pan</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                              {[
                                  { id: 'ken-burns', name: 'Ken Burns Clássico', icon: <Camera size={16} /> },
                                  { id: 'ken-burns-in', name: 'Ken Burns Foco', icon: <ZoomIn size={16} /> },
                                  { id: 'ken-burns-out', name: 'Ken Burns Amplitude', icon: <ZoomOut size={16} /> },
                                  { id: 'ken-burns-pan-up', name: 'Ken Burns Cima', icon: <ChevronUp size={16} /> },
                                  { id: 'ken-burns-pan-down', name: 'Ken Burns Baixo', icon: <ChevronDown size={16} /> },
                                  { id: 'pan-right-left-pingpong', name: 'Pan Ida & Volta', icon: <Move size={16} /> },
                                  { id: 'pan-right', name: 'Pan Direita', icon: <ChevronRight size={16} /> },
                                  { id: 'pan-left', name: 'Pan Esquerda', icon: <ChevronLeft size={16} /> },
                                  { id: 'pan-up', name: 'Pan Cima', icon: <ChevronUp size={16} /> },
                                  { id: 'pan-down', name: 'Pan Baixo', icon: <ChevronDown size={16} /> },
                                  { id: 'pan-diagonal-tl', name: 'Diagonal Topo', icon: <MoveVertical size={16} /> },
                                  { id: 'pan-diagonal-br', name: 'Diagonal Base', icon: <Move size={16} /> },
                              ].map(anim => {
                                  const isSelected = (clip.imageAnimationType || 'none') === anim.id;
                                  return (
                                      <button
                                          key={anim.id}
                                          onClick={() => handleUpdate({ imageAnimationType: anim.id as any })}
                                          className={`p-2 rounded-lg flex flex-col items-center justify-center gap-1 transition-all border text-center text-xs ${isSelected ? 'bg-emerald-700/80 border-emerald-400 text-white font-bold shadow-md' : 'bg-gray-800/60 border-gray-700/50 hover:border-emerald-500/50 hover:bg-gray-700/80 text-gray-300'}`}
                                          title={anim.name}
                                      >
                                          {anim.icon}
                                          <span className="text-[10px] leading-tight block truncate w-full">{anim.name}</span>
                                      </button>
                                  );
                              })}
                          </div>
                      </div>

                      {/* Efeitos Especiais & 3D */}
                      <div className="space-y-2 pt-1">
                          <div className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                              <Sparkles size={14} />
                              <span>Efeitos Dinâmicos, Bass & 3D</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                              {[
                                  { id: 'pulse-beat-bass', name: 'Grave / Bass Beat', icon: <Zap size={16} /> },
                                  { id: 'float-rotate-3d', name: 'Flutuação 3D', icon: <Orbit size={16} /> },
                                  { id: 'retro-vhs-jitter', name: 'Retro VHS Tremor', icon: <Tv size={16} /> },
                                  { id: '3d-tilt-forward', name: 'Inclinado 3D', icon: <Layers size={16} /> },
                                  { id: 'glitch-zoom', name: 'Glitch Zoom', icon: <Code size={16} /> },
                                  { id: 'spiral-zoom', name: 'Espiral 3D', icon: <Orbit size={16} /> },
                                  { id: 'camera-shake-action', name: 'Câmera Ação', icon: <Flame size={16} /> },
                                  { id: 'float', name: 'Flutuar Suave', icon: <Waves size={16} /> },
                                  { id: 'pulse', name: 'Pulsar Lento', icon: <Activity size={16} /> },
                                  { id: 'heartbeat', name: 'Batimento Duplo', icon: <Zap size={16} /> },
                                  { id: 'bounce', name: 'Quicar', icon: <Star size={16} /> },
                                  { id: 'slide-in', name: 'Entrada Suave', icon: <ChevronDown size={16} /> },
                                  { id: 'spin-clockwise', name: 'Girar Horário', icon: <Orbit size={16} /> },
                                  { id: 'spin-counter', name: 'Girar Anti-Hor.', icon: <RotateCw size={16} /> },
                                  { id: 'shake', name: 'Tremer', icon: <Move size={16} /> },
                              ].map(anim => {
                                  const isSelected = (clip.imageAnimationType || 'none') === anim.id;
                                  return (
                                      <button
                                          key={anim.id}
                                          onClick={() => handleUpdate({ imageAnimationType: anim.id as any })}
                                          className={`p-2 rounded-lg flex flex-col items-center justify-center gap-1 transition-all border text-center text-xs ${isSelected ? 'bg-amber-700/80 border-amber-400 text-white font-bold shadow-md' : 'bg-gray-800/60 border-gray-700/50 hover:border-amber-500/50 hover:bg-gray-700/80 text-gray-300'}`}
                                          title={anim.name}
                                      >
                                          {anim.icon}
                                          <span className="text-[10px] leading-tight block truncate w-full">{anim.name}</span>
                                      </button>
                                  );
                              })}
                          </div>
                      </div>

                      {clip.imageAnimationType && clip.imageAnimationType !== 'none' && (
                          <div className="space-y-3 pt-2 bg-gray-800/40 p-3 rounded-lg border border-gray-700/50">
                              <div>
                                  <div className="text-xs font-semibold text-gray-300 flex justify-between items-center mb-1">
                                      <span>Velocidade da Animação</span>
                                      <span className="text-violet-300 font-mono">{(clip.imageAnimationSpeed ?? 1.0).toFixed(1)}x</span>
                                  </div>
                                  <input
                                      type="range"
                                      min="0.1"
                                      max="3.0"
                                      step="0.1"
                                      value={clip.imageAnimationSpeed ?? 1.0}
                                      onChange={(e) => handleUpdate({ imageAnimationSpeed: parseFloat(e.target.value) })}
                                      onMouseDown={onInteractionStart}
                                      onMouseUp={onInteractionEnd}
                                      className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-violet-400"
                                  />
                              </div>

                              <div>
                                  <div className="text-xs font-semibold text-gray-300 flex justify-between items-center mb-1">
                                      <span>Intensidade / Zoom Máximo</span>
                                      <span className="text-violet-300 font-mono">{(clip.imageAnimationScale ?? 1.25).toFixed(2)}x</span>
                                  </div>
                                  <input
                                      type="range"
                                      min="1.05"
                                      max="2.5"
                                      step="0.05"
                                      value={clip.imageAnimationScale ?? 1.25}
                                      onChange={(e) => handleUpdate({ imageAnimationScale: parseFloat(e.target.value) })}
                                      onMouseDown={onInteractionStart}
                                      onMouseUp={onInteractionEnd}
                                      className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-violet-400"
                                  />
                              </div>
                               
                              <button
                                  type="button"
                                  onClick={() => handleUpdate({ imageAnimationType: 'none', imageAnimationSpeed: 1.0, imageAnimationScale: 1.25 })}
                                  className="w-full py-1 text-xs text-red-400 hover:text-red-300 hover:underline bg-red-950/20 rounded border border-red-500/10"
                              >
                                  Resetar Animação
                              </button>
                          </div>
                      )}
                  </div>
              )}

               <div className="pt-4 border-t border-gray-600 space-y-4">
                    <h4 className="text-sm font-semibold text-violet-300">Efeito de Sobreposição do Clipe</h4>
                    <p className="text-xs text-gray-400 -mt-2">Substitui o efeito global durante a exibição deste clipe. 'Padrão' usa a configuração global.</p>
                    <div className="grid grid-cols-auto-fit-50 gap-2">
                        {allEffects.map(effectItem => (
                            <button
                                key={effectItem.id ?? 'default'}
                                onClick={() => handleUpdate({ overlayEffect: effectItem.id })}
                                title={effectItem.name}
                                className={`aspect-square flex flex-col items-center justify-center gap-1 p-1 rounded-lg transition-all border-2 ${(clip.overlayEffect === effectItem.id) ? 'bg-violet-700/80 border-violet-400' : 'bg-gray-700/50 border-transparent hover:border-violet-500'}`}
                            >
                                {React.cloneElement(effectItem.icon as React.ReactElement, { className: `w-4 h-4 ${(clip.overlayEffect === effectItem.id) ? 'text-white' : 'text-gray-300'}` })}
                                <span className={`text-[9px] text-center leading-tight ${(clip.overlayEffect === effectItem.id) ? 'text-white' : 'text-gray-400'}`}>{effectItem.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
              <div className="pt-4 border-t border-gray-600 space-y-4">
                  <h4 className="text-sm font-semibold text-violet-300">Efeitos de Vídeo</h4>

                  {/* Applied Effects */}
                  <div className="space-y-3">
                      {clip.effects && Object.keys(clip.effects).length > 0 ? (
                          Object.entries(clip.effects).map(([key, value]) => {
                              const effect = VIDEO_EFFECTS.find(e => e.id === key);
                              if (!effect) return null;

                              const handleEffectChange = (newValue: number) => {
                                  handleUpdate({
                                      effects: { ...clip.effects, [key]: newValue }
                                  });
                              };

                              const handleRemoveEffect = () => {
                                  const newEffects = { ...clip.effects };
                                  delete newEffects[key as VideoEffectType];
                                  handleUpdate({ effects: newEffects });
                              };

                              return (
                                  <div key={effect.id}>
                                      <label className="block text-xs font-medium text-gray-400 mb-1 flex justify-between items-center">
                                          <span className="flex items-center gap-2">
                                              {React.cloneElement(effect.icon as React.ReactElement<{ size?: number }>, { size: 14 })}
                                              {effect.name}
                                          </span>
                                          <div className="flex items-center gap-2">
                                              <span>{value}{effect.unit}</span>
                                              <button onClick={handleRemoveEffect} className="p-0.5 text-gray-500 hover:text-red-400 rounded-full"><X size={14} /></button>
                                          </div>
                                      </label>
                                      <input
                                          type="range"
                                          min={effect.min}
                                          max={effect.max}
                                          step={effect.step}
                                          value={value}
                                          onChange={(e) => handleEffectChange(parseFloat(e.target.value))}
                                          onMouseDown={onInteractionStart}
                                          onMouseUp={onInteractionEnd}
                                          onTouchStart={onInteractionStart}
                                          onTouchEnd={onInteractionEnd}
                                          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                      />
                                  </div>
                              );
                          })
                      ) : (
                          <p className="text-xs text-gray-500 italic">Nenhum efeito aplicado.</p>
                      )}
                  </div>

                  {/* Available Effects */}
                  {availableEffects.length > 0 && (
                      <div className="pt-4 border-t border-gray-700/50">
                          <h5 className="text-xs font-semibold text-gray-400 mb-2">Adicionar Efeito</h5>
                          <div className="grid grid-cols-auto-fit-80 gap-2">
                              {availableEffects.map(effect => (
                                  <button
                                      key={effect.id}
                                      onClick={() => handleAddEffect(effect)}
                                      title={effect.name}
                                      className="aspect-square flex flex-col items-center justify-center gap-1 p-1 rounded-lg transition-all border-2 bg-gray-700/50 border-transparent hover:border-violet-500"
                                  >
                                      {React.cloneElement(effect.icon as React.ReactElement<{ className?: string }>, { className: 'w-6 h-6 text-gray-300' })}
                                      <span className="text-xs text-center leading-tight text-gray-400">{effect.name}</span>
                                  </button>
                              ))}
                          </div>
                      </div>
                  )}
              </div>
            </>
          )}
      </div>
  );
};

const SpectrumEditor: React.FC<{
    clip: VideoClip;
    onUpdate: (id: string, props: Partial<VideoClip>) => void;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => void;
    onInteractionStart: () => void;
    onInteractionEnd: () => void;
    audioClipsOnTimeline: VideoClip[];
}> = ({ clip, onUpdate, onFileUpload, onInteractionStart, onInteractionEnd, audioClipsOnTimeline }) => {
    if (clip.type !== 'spectrum') return null;

    const handleUpdate = (props: Partial<VideoClip>) => {
        onUpdate(clip.id, props);
    };

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold text-violet-300">EDITAR ESPECTRO</h3>
            <ClipEditor clip={clip} onUpdate={onUpdate} onInteractionStart={onInteractionStart} onInteractionEnd={onInteractionEnd} />

            <div className="pt-4 border-t border-gray-600 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Estilo do Espectro</label>
                    <div className="grid grid-cols-auto-fit-80 gap-2">
                        {SPECTRUM_MODELS.map(model => (
                            <button key={model.id} onClick={() => handleUpdate({ spectrumStyle: model.id })} title={model.name} className={`aspect-square flex flex-col items-center justify-center gap-1 p-1 rounded-lg transition-all border-2 ${clip.spectrumStyle === model.id ? 'bg-violet-700/80 border-violet-400' : 'bg-gray-700/50 border-transparent hover:border-violet-500'}`}>
                                {React.cloneElement(model.icon as React.ReactElement<{ className?: string }>, { className: `w-6 h-6 ${clip.spectrumStyle === model.id ? 'text-white' : 'text-gray-300'}` })}
                                <span className={`text-xs text-center leading-tight ${clip.spectrumStyle === model.id ? 'text-white' : 'text-gray-400'}`}>{model.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label htmlFor="audio-source" className="block text-sm font-medium text-gray-300 mb-1 mt-4">Fonte de Áudio</label>
                    <select id="audio-source" value={clip.audioSource || 'master'} onChange={(e) => handleUpdate({ audioSource: e.target.value })} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 text-sm focus:ring-violet-500 focus:border-violet-500">
                        <option value="master">Mix Principal</option>
                        {audioClipsOnTimeline.map(audioClip => (<option key={audioClip.id} value={audioClip.id}>{audioClip.fileName}</option>))}
                    </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <div><label htmlFor="spectrum-color" className="block text-xs font-medium text-gray-300 mb-1">Cor 1</label><input type="color" id="spectrum-color" value={clip.spectrumColor || '#FFFFFF'} onChange={(e) => handleUpdate({ spectrumColor: e.target.value })} onFocus={onInteractionStart} onBlur={onInteractionEnd} className="w-full h-10 bg-gray-900 border border-gray-600 rounded-md p-1 cursor-pointer" /></div>
                    <div><label htmlFor="spectrum-color-2" className="block text-xs font-medium text-gray-300 mb-1">Cor 2</label><input type="color" id="spectrum-color-2" value={clip.spectrumColor2 || '#8A2BE2'} onChange={(e) => handleUpdate({ spectrumColor2: e.target.value })} onFocus={onInteractionStart} onBlur={onInteractionEnd} className="w-full h-10 bg-gray-900 border border-gray-600 rounded-md p-1 cursor-pointer" /></div>
                    <div><label htmlFor="spectrum-color-3" className="block text-xs font-medium text-gray-300 mb-1">Cor 3</label><input type="color" id="spectrum-color-3" value={clip.spectrumColor3 || '#4f46e5'} onChange={(e) => handleUpdate({ spectrumColor3: e.target.value })} onFocus={onInteractionStart} onBlur={onInteractionEnd} className="w-full h-10 bg-gray-900 border border-gray-600 rounded-md p-1 cursor-pointer" /></div>
                </div>
                 <input type="file" id={`spectrum-logo-upload-${clip.id}`} className="hidden" accept="image/png" onChange={(e) => onFileUpload(e, url => handleUpdate({ logoSrc: url }))} />
                 <SidebarButton as="label" htmlFor={`spectrum-logo-upload-${clip.id}`}><ImagePlay className="w-5 h-5 mr-3" /> LOGO NO ESPECTRO</SidebarButton>
                 {clip.logoSrc && (
                     <div className="space-y-4 pt-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Tamanho do Logo</label>
                            <input
                                type="range"
                                min="0.1"
                                max="2"
                                step="0.05"
                                value={clip.logoSize || 0.5}
                                onChange={(e) => handleUpdate({ logoSize: parseFloat(e.target.value) })}
                                onMouseDown={onInteractionStart}
                                onMouseUp={onInteractionEnd}
                                onTouchStart={onInteractionStart}
                                onTouchEnd={onInteractionEnd}
                                className="w-full"
                            />
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-gray-300 mb-1">Forma do Logo</label>
                           <div className="flex gap-2">
                                {(['original', 'circular', 'sphere'] as LogoShape[]).map(shape => (
                                    <button 
                                      key={shape} 
                                      onClick={() => handleUpdate({ logoShape: shape })}
                                      className={`px-4 py-2 text-sm rounded-md flex-1 transition-colors capitalize ${(clip.logoShape || 'original') === shape ? 'bg-violet-600 text-white' : 'bg-gray-700/50 hover:bg-gray-600'}`}
                                    >
                                        {shape}
                                    </button>
                                ))}
                           </div>
                        </div>
                        <div className="pt-2">
                            <ToggleButton isEnabled={!!clip.logoPulses} onClick={() => handleUpdate({ logoPulses: !clip.logoPulses })}>
                                Pulsar com a música
                            </ToggleButton>
                            {clip.logoPulses && (
                                <div className="mt-2">
                                    <label className="block text-xs font-medium text-gray-400 mb-1 flex justify-between">
                                        <span>Força do Pulso</span>
                                        <span>{(clip.pulseStrength ?? 0.5).toFixed(2)}</span>
                                    </label>
                                    <input 
                                        type="range" 
                                        value={clip.pulseStrength ?? 0.5} 
                                        onChange={(e) => handleUpdate({ pulseStrength: Number(e.target.value) })} 
                                        onMouseDown={onInteractionStart} 
                                        onMouseUp={onInteractionEnd} 
                                        min="0.1" 
                                        max="1.0" 
                                        step="0.05" 
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" 
                                    />
                                </div>
                            )}
                        </div>
                         <button onClick={() => handleUpdate({ logoSrc: undefined, logoSize: undefined, logoShape: undefined, logoPulses: false })} className="text-red-400 text-xs hover:underline mt-2">Remover logo</button>
                     </div>
                 )}
            </div>
        </div>
    );
};

const MobileEditor: React.FC<any> = (props) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-900 text-white text-center">
      <Monitor size={48} className="mb-4 text-violet-400" />
      <h1 className="text-xl font-bold mb-2">Editor não otimizado para dispositivos móveis</h1>
      <p className="text-gray-300">Para uma melhor experiência, por favor, acesse em um computador desktop.</p>
      <button 
        onClick={props.onBack} 
        className="mt-6 px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-md text-sm font-bold"
      >
        Voltar
      </button>
    </div>
  );
};

const DesktopEditor: React.FC<any> = (props) => {
    const {
        format, onBack,
        projectState, onGoToAbout, onGoToDonate, onOpenWindowsModal, deferredPrompt,
        masterCurrentTime, masterDuration, isPlaying, zoom, timelineZoom, previewQuality, showExportModal, exportProgress, exportStatus, isExporting, isFileMenuOpen, isFullscreen, isSavingProject, isLoadingProject, projectStatus, pixCopied, isSpectrumModalOpen, isShapeModalOpen, isEmojiModalOpen, isStickerModalOpen, editingTransitionTarget, defaultTransition, isSnappingEnabled,
        isCanvasFullscreen, handleToggleCanvasFullscreen,
        contentDuration,
        handleInteractionStart, handleInteractionEnd, undo, redo, canUndo, canRedo, setZoom, onSetTimelineZoom, setShowExportModal, setFileMenuOpen, setIsSnappingEnabled,
        fileMenuRef, canvasWrapperRef, canvasRef, playheadRef, timeDisplayRef,
        leftPanelWidth, rightPanelWidth, timelineHeight, isResizing, fitScale,
        isLeftPanelCollapsed, isRightPanelCollapsed, toggleLeftPanel, toggleRightPanel,
        findClipForTimestamp, editingTransition, captionClips,
        handleLeftPanelResize, handleRightPanelResize, handleTimelineResize, handleAddTextClip, handleAddSpectrumClip, handleAddShapeClip, handleAddEmojiClip, handleAddStickerClip, handleUpdateScene, handleUpdateClip, handleUpdateMultipleClips, handleSelectClip, handleTrackSelection, handleAddMediaToPool, handleAddRecordedAudio, handleAddClipToTrack, handleAddClipAtPlayhead, handleSplitClipAtPlayhead, handleDeleteSelectedClips, handleAddTrack, handleReorderTracks, handleRenameTrack, handleDeleteTrack, handleToggleMuteTrack, handleSetTrackVolume, handleAddOrUpdateTransition, handleDeleteTransition, handleApplyTransitionToAll,
        pause, seek, stop, play, onMoveClips, onTrimClip, handleExport, handleSaveProject, handleSaveProjectAs, handleLoadProject, handleCopyPix, handleCloseExportModal, handleToggleFullscreen, hasAudioClip, audioClipsOnTimeline, handleFileChange, setIsSpectrumModalOpen, setIsShapeModalOpen, setIsEmojiModalOpen, setIsStickerModalOpen, setEditingTransitionTarget, setDefaultTransition, handleDuplicateSelectedTracks,
        // Pexels props
        pexelsSearchQuery, setPexelsSearchQuery, pexelsPhotoResults, pexelsVideoResults, isSearchingPexels, pexelsHasMore, settingPexelsBgId, handlePexelsSearch, handleAddPexelsItemToTimeline, pexelsSearchType, setPexelsSearchType,
        // Copy/Paste props
        copiedClip, handleCopyClip, handlePasteClip, clipboardStatus,
        // Captions props
        isCaptionsModalOpen, setIsCaptionsModalOpen, handleCloseCaptionsModal, isGeneratingCaptions, captionStatus, captionSource, setCaptionSource, handleGenerateCaptions,
        generatedCaptions, selectedCaptionStyleId, setSelectedCaptionStyleId, handleApplyCaptions,
        captionModel, setCaptionModel, captionLanguage, setCaptionLanguage,
        captionDensityMode, setCaptionDensityMode, handleDensityChange,
        captionVerticalPosition, setCaptionVerticalPosition,
        captionAnimationIn, setCaptionAnimationIn,
        captionSyncOffsetMs, handleNudgeSync, handleResetSync, handleRealignWithAudioEnergy,
        handleExportSRT, handleImportSRTFile,
        handleUpdateCaptionText, handleUpdateCaptionStart, handleUpdateCaptionEnd,
        handleDeleteCaptionLine, handleMergeCaptionWithNext, handleAddCaptionLineAfter,
        findText, setFindText, replaceText, setReplaceText, handleBulkReplace, handleAutoCorrectCaptions,
        // New caption selection prop
        handleSelectAllClipsOnTrack,
        // Save before exit props
        isSaveBeforeExitModalOpen, setIsSaveBeforeExitModalOpen,
        isSavingAndExiting, handleConfirmSaveAndExit, handleConfirmExitWithoutSaving,
        hasUnsavedChanges
    } = props;
    const { scene, mediaPool, tracks, timelineClips, selectedClipIds, selectedTrackIds, timelineTransitions } = projectState;
    
    const [touchDragState, setTouchDragState] = useState<{ clip: MediaPoolClip; x: number; y: number; } | null>(null);
    const [touchHoverInfo, setTouchHoverInfo] = useState<{ trackId: string; time: number; canDrop: boolean; } | null>(null);
    const [showAllTextPresets, setShowAllTextPresets] = useState(false);

    // Windows Native Keyboard Shortcuts Listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeEl = document.activeElement;
            const isTyping = activeEl && (
                activeEl.tagName === 'INPUT' ||
                activeEl.tagName === 'TEXTAREA' ||
                (activeEl as HTMLElement).isContentEditable
            );

            // Ctrl + Z: Undo
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
                if (!isTyping && canUndo) {
                    e.preventDefault();
                    undo();
                }
            }
            // Ctrl + Y or Ctrl + Shift + Z: Redo
            if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')) {
                if (!isTyping && canRedo) {
                    e.preventDefault();
                    redo();
                }
            }
            // Ctrl + S: Save Project
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                handleSaveProject();
            }
            // Ctrl + E: Export Video
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
                e.preventDefault();
                setShowExportModal(true);
            }
            // Space: Toggle Play/Pause
            if (e.code === 'Space' && !isTyping) {
                e.preventDefault();
                if (isPlaying) pause(); else play();
            }
            // Delete / Backspace: Delete selected clip(s)
            if ((e.key === 'Delete' || e.key === 'Backspace') && !isTyping) {
                if (selectedClipIds.length > 0) {
                    e.preventDefault();
                    handleDeleteSelectedClips();
                }
            }
            // F11: Toggle Fullscreen
            if (e.key === 'F11') {
                e.preventDefault();
                handleToggleFullscreen();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [canUndo, undo, canRedo, redo, handleSaveProject, setShowExportModal, isPlaying, pause, play, selectedClipIds, handleDeleteSelectedClips, handleToggleFullscreen]);

    const animationToClassMap: Record<string, string> = {
        'fade': 'anim-preview-fade', 'slide-in-up': 'anim-preview-slide-in-up', 'slide-in-left': 'anim-preview-slide-in-left',
        'zoom-in': 'anim-preview-zoom-in', 'reveal-up': 'anim-preview-reveal-up', 'blur-in': 'anim-preview-blur-in',
        'pulse': 'anim-preview-pulse', 'bounce': 'anim-preview-bounce', 'typewriter': 'anim-preview-typing', 'glow': 'anim-preview-glow',
        'skew-in': 'anim-preview-skew-in', 'elastic-in': 'anim-preview-elastic-in', 'tracking-expand': 'anim-preview-tracking-expand',
        'rotate-in': 'anim-preview-rotate-in', 'flicker-in': 'anim-preview-flicker-in', 'jitter': 'anim-preview-jitter',
        'float': 'anim-preview-float', 'wave': 'anim-preview-wave', 'rainbow': 'anim-preview-rainbow', 'glitch-loop': 'anim-preview-glitch-loop'
    };

    const selectedClips = useMemo(() =>
        projectState.timelineClips.filter(c => projectState.selectedClipIds.includes(c.id)),
        [projectState.timelineClips, projectState.selectedClipIds]
    );

    const areAllSelectedClipsTexty = useMemo(() =>
        selectedClips.length > 0 && selectedClips.every(c => c.type === 'text' || c.type === 'emoji'),
        [selectedClips]
    );

    const handleUpdateSelectedClipsProps = useCallback((props: Partial<VideoClip>) => {
        if (selectedClipIds.length === 0) return;
        handleUpdateMultipleClips(selectedClipIds.map((id: string) => ({ id, props })));
    }, [selectedClipIds, handleUpdateMultipleClips]);


    const TouchDragGhost: React.FC<{ dragState: { clip: MediaPoolClip; x: number; y: number } }> = ({ dragState }) => {
        const { clip, x, y } = dragState;
        const size = 80;
        return (
            <div
                className="fixed top-0 left-0 bg-gray-700/80 backdrop-blur-sm border-2 border-violet-500 rounded-lg p-1 flex items-center gap-2 pointer-events-none z-50 shadow-2xl"
                style={{
                    transform: `translate(${x - (size * 1.77) / 2}px, ${y - size / 2}px)`,
                    width: size * 1.77,
                    height: size,
                }}
            >
                {clip.type === 'video' && <video src={clip.src} muted className="w-full h-full object-cover rounded-md pointer-events-none" />}
                {clip.type === 'image' && <img src={clip.src} className="w-full h-full object-cover rounded-md pointer-events-none" alt={clip.fileName} />}
                {clip.type === 'audio' && <div className="w-full h-full bg-gray-900 flex items-center justify-center"><Mic className="w-8 h-8 text-violet-400" /></div>}
            </div>
        );
    };

    const handleClipTouchStart = useCallback((clip: MediaPoolClip, e: React.TouchEvent) => {
        e.preventDefault();
        const touch = e.touches[0];
        if (!touch) return;
        setTouchDragState({ clip, x: touch.clientX, y: touch.clientY });
    }, []);

    useEffect(() => {
        if (!touchDragState) return;

        const pixelsPerSecond = BASE_PIXELS_PER_SECOND * props.timelineZoom;

        const handleTouchMove = (e: TouchEvent) => {
            if (e.cancelable) e.preventDefault();
            const touch = e.touches[0];
            if (!touch) return;

            setTouchDragState(prev => prev ? { ...prev, x: touch.clientX, y: touch.clientY } : null);
            const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
            const trackLane = dropTarget?.closest('.track-lane');

            if (trackLane) {
                const trackId = trackLane.getAttribute('data-track-id');
                const targetTrack = tracks.find((t:Track) => t.id === trackId);
                const draggedClip = touchDragState.clip;

                if (trackId && targetTrack) {
                    const typeMap: Record<Track['type'], VideoClipType[]> = {
                        video: ['video', 'image'],
                        audio: ['audio'],
                        text: ['text'],
                        spectrum: ['spectrum'],
                        shape: ['shape', 'image'],
                        emoji: ['emoji'],
                    };
                    const canDrop = typeMap[targetTrack.type].includes(draggedClip.type as VideoClipType);
                    const gridRect = trackLane.getBoundingClientRect();
                    const dropX = touch.clientX - gridRect.left;
                    const time = Math.max(0, dropX / pixelsPerSecond);

                    setTouchHoverInfo({ trackId, time, canDrop });
                    return;
                }
            }
            setTouchHoverInfo(null);
        };

        const handleTouchEnd = () => {
            if (touchHoverInfo?.canDrop && touchDragState) {
                handleAddClipToTrack(touchDragState.clip, touchHoverInfo.trackId, touchHoverInfo.time);
            }
            setTouchDragState(null);
            setTouchHoverInfo(null);
        };

        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd);
        window.addEventListener('touchcancel', handleTouchEnd);

        return () => {
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
            window.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [touchDragState, props.timelineZoom, tracks, handleAddClipToTrack]);
    
    // Helper for animated border UI
    const animatedBorder = scene?.animatedBorder || { type: 'none', width: 2, color1: '#FFA500', color2: '#FF4500', color3: '#4f46e5', gradientAngle: 45 };

    const handleUpdateBorder = (props: Partial<AnimatedBorder>) => {
        handleUpdateScene({
            animatedBorder: {
                ...animatedBorder,
                ...props
            }
        });
    };


    return (
    <div className="flex flex-col h-screen bg-gray-900 text-white font-sans">
      {touchDragState && <TouchDragGhost dragState={touchDragState} />}
      <header className="flex items-center justify-between p-3 h-20 bg-gray-800 border-b border-gray-700 flex-shrink-0 z-20 gap-2">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <button onClick={onBack} className="p-2 hover:bg-gray-700 rounded-full flex-shrink-0" title="Voltar à seleção de formato"><ArrowLeft size={20} /></button>
              <img src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhXaPyBpGiGT_pbEsUUAYUOFSRUrr2kWkMjLSa1U1BvGjW8y8LaCcJJ3xbgCb0p8YyiOOOaOiwb4aWJeh85k-zajRSG0EO0H8DUkG_66-lTGTWo6BagR96gQSQTaPDuL_uOntW3G_dTty_TMmV7EfoRfczF8r1bIOtCO1vO6YKJ0tyHNJGeKWVA05RFoZw/s1600/Design%20sem%20nome%20-%202025-08-17T190801.283.png" alt="VEE Logo" className="h-6 md:h-8 flex-shrink-0" />
              <div ref={fileMenuRef} className="relative flex-shrink-0">
                  <button onClick={() => setFileMenuOpen((o:any) => !o)} className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md text-xs md:text-sm font-medium">
                    <span className="hidden sm:inline">Arquivo</span>
                    <Menu size={16} className="sm:hidden" />
                    <ChevronDown size={16}/>
                  </button>
                  {isFileMenuOpen && (
                      <div className="absolute top-full left-0 mt-2 w-56 bg-gray-800 rounded-md shadow-lg border border-gray-700 z-50">
                           <button onClick={() => handleSaveProject()} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-3 disabled:opacity-50" disabled={isSavingProject}>{isSavingProject ? 'Salvando...' : 'Salvar Projeto'} <FileDown size={16}/></button>
                           <button onClick={handleSaveProjectAs} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-3 disabled:opacity-50" disabled={isSavingProject}>{isSavingProject ? 'Salvando...' : 'Salvar Como...'} <FileDown size={16}/></button>
                           <label className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-3 cursor-pointer disabled:opacity-50">
                               <input type="file" className="hidden" accept=".vee" onChange={handleLoadProject} disabled={isLoadingProject}/>
                               {isLoadingProject ? 'Carregando...' : 'Carregar Projeto'} <FileUp size={16}/>
                           </label>
                           <div className="h-px bg-gray-700 my-1"></div>
                           <button onClick={onBack} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 flex items-center justify-between gap-3">
                               <span className="flex items-center gap-3">Fechar Editor <Power size={16}/></span>
                               {(hasUnsavedChanges || timelineClips.length > 0) && (
                                   <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">Não salvo</span>
                               )}
                           </button>
                      </div>
                  )}
              </div>
              <div className="text-xs text-gray-400">{clipboardStatus || projectStatus}</div>
          </div>
          
          <div className="flex-grow flex items-center justify-center gap-4">
            <a href="https://open.spotify.com/playlist/5Fpvwbrv1koXk2bqnZjFMR" target="_blank" rel="noopener noreferrer" className="flex items-center hidden md:flex hover:opacity-90 transition-opacity">
                <img 
                  src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiQ6w0ySLfQHmNqT9rEZ9McimO3m1wPHbcvL-VXr4kdJryqXCLzODP6NYmOR1Di82FFR9FTQGlKkyA6b5E1jajfEaR7ZOZLl3I46KGLISnjsFjzKNrSup15WHXdQm-aRVEk0eQf_CYpap3jm57wj39X0iEMv2GDGGwfXCuUWc9EoVLhGepUE5gR2z13bLo/s1600/Banner%20playlist%20na%20estrada%20com%20m%C3%BAsica%20boa.png" 
                  alt="Banner playlist na estrada com música boa" 
                  className="h-12 w-auto object-contain rounded"
                />
            </a>
            
            <a href="https://www.infinitepay.io/?rid=brotherdescartaveis" target="_blank" rel="noopener noreferrer" className="flex items-center hidden md:flex hover:opacity-90 transition-opacity">
                <img 
                  src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhTmu-3ANkoSbebOZCHHr_-vyoxDvWNLBrEMhdpXWbsrwEH-HD9xgMVckathM1Z1zVjdTlx-KODQqli3IgGqSSwyhdvbpqqvruqdOiEgfZSZH9xcpYFiH1akuwqG6ZGZHGAIMX2ak7mieUVz9zQvEAeqVbedwknFiohlg5OII7caO6zzxGgwyD5JPGMY8U/s1600/banner%20infinitypay.png" 
                  alt="Banner Infinity Pay" 
                  className="h-12 w-auto object-contain rounded"
                />
            </a>
          </div>

          <div className="flex items-center justify-end gap-2 min-w-0">
              {onOpenWindowsModal && (
                <button
                  onClick={onOpenWindowsModal}
                  className="px-2.5 md:px-3 py-1.5 bg-emerald-700/80 hover:bg-emerald-600 rounded-md text-xs font-semibold flex items-center gap-1.5 text-white flex-shrink-0 border border-emerald-500/50 shadow-sm"
                  title="Recursos do Windows & Instalação"
                >
                  <Monitor size={16} />
                  <span className="hidden sm:inline">Windows</span>
                </button>
              )}

              <button onClick={handleToggleFullscreen} className="p-2 hover:bg-gray-700 rounded-full flex-shrink-0" title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}>
                  {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>

              <button 
                onClick={() => setShowExportModal(true)} 
                className="px-3 md:px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-md text-xs md:text-sm font-bold disabled:bg-gray-600 disabled:cursor-not-allowed flex-shrink-0"
                disabled={contentDuration === 0}
                title={contentDuration === 0 ? "Adicione clipes à linha do tempo para exportar" : "Exportar vídeo"}
              >
                Exportar
              </button>
          </div>
      </header>
      
      <div className="flex-grow flex flex-col overflow-hidden">
        <div className="flex-grow flex flex-row overflow-hidden relative">
            {/* LEFT PANEL */}
            <div 
                style={{ width: isLeftPanelCollapsed ? 48 : leftPanelWidth }} 
                className={`bg-gray-800 flex flex-col border-r border-gray-700 transition-all duration-300 ease-in-out relative ${isLeftPanelCollapsed ? 'overflow-hidden' : ''}`}
            >
                <div className="p-3 border-b border-gray-700 flex-shrink-0 flex items-center justify-between">
                    {!isLeftPanelCollapsed && <h2 className="text-base font-semibold text-violet-300 truncate">Recursos</h2>}
                    <button 
                        onClick={toggleLeftPanel} 
                        className={`p-1.5 hover:bg-gray-700 rounded-md text-gray-400 hover:text-white transition-colors ${isLeftPanelCollapsed ? 'mx-auto' : ''}`}
                        title={isLeftPanelCollapsed ? "Expandir Painel" : "Recolher Painel"}
                    >
                        {isLeftPanelCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>
                </div>
                {!isLeftPanelCollapsed && (
                    <div className="flex-grow flex flex-col overflow-hidden">
                        <div className="overflow-y-auto p-3 space-y-4 flex-grow">
                        <MediaBin mediaPool={mediaPool} onUpload={handleAddMediaToPool} onAddClip={handleAddClipAtPlayhead} onClipTouchStart={handleClipTouchStart} />
                        <div className="pt-4 border-t border-gray-700 space-y-2">
                         <div className="p-3 my-2 border border-gray-700 rounded-lg bg-gray-900/30 space-y-3">
                            <h3 className="text-sm font-semibold text-violet-300 flex items-center gap-2"><Camera size={18}/> Banco de Mídia Pexels</h3>
                            <p className="text-xs text-gray-400 -mt-2">Use fotos e vídeos gratuitos de alta qualidade como fundo ou clipes.</p>
                            <div className="flex bg-gray-800 rounded-md p-0.5">
                                <button onClick={() => setPexelsSearchType('photos')} className={`flex-1 text-sm py-1 rounded ${pexelsSearchType === 'photos' ? 'bg-violet-600 text-white' : 'hover:bg-gray-700'}`}>Fotos</button>
                                <button onClick={() => setPexelsSearchType('videos')} className={`flex-1 text-sm py-1 rounded ${pexelsSearchType === 'videos' ? 'bg-violet-600 text-white' : 'hover:bg-gray-700'}`}>Vídeos</button>
                            </div>
                             <form onSubmit={(e) => { e.preventDefault(); handlePexelsSearch(true); }} className="flex gap-2">
                                <input
                                    type="text"
                                    value={pexelsSearchQuery}
                                    onChange={(e) => setPexelsSearchQuery(e.target.value)}
                                    placeholder="Ex: 'dark abstract'..."
                                    className="flex-grow bg-gray-900/80 border border-gray-600 rounded-md p-2 text-sm focus:ring-violet-500 focus:border-violet-500"
                                />
                                <button type="submit" disabled={isSearchingPexels} className="p-2 bg-violet-600 hover:bg-violet-700 rounded-md disabled:bg-gray-600"><Search size={20}/></button>
                             </form>
                             <div className="max-h-72 overflow-y-auto pr-2">
                                 {isSearchingPexels && pexelsPhotoResults.length === 0 && pexelsVideoResults.length === 0 && <div className="text-center p-4 text-gray-400">Buscando...</div>}
                                 {!isSearchingPexels && pexelsPhotoResults.length === 0 && pexelsVideoResults.length === 0 && pexelsSearchQuery && <div className="text-center p-4 text-gray-500 text-sm">Nenhum resultado.</div>}
                                 <div className="grid grid-cols-2 gap-2">
                                     {pexelsSearchType === 'photos' && pexelsPhotoResults.map((photo: PexelsPhoto) => (
                                         <button key={photo.id} onClick={() => handleAddPexelsItemToTimeline(photo)} className="relative group aspect-video bg-gray-700 rounded-md overflow-hidden" disabled={settingPexelsBgId !== null}>
                                             <img src={photo.src.small} alt={photo.alt} className="w-full h-full object-cover"/>
                                             <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                 {settingPexelsBgId === photo.id ? (
                                                     <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                                                 ) : (
                                                     <span className="text-white text-xs text-center p-1">Adicionar à timeline</span>
                                                 )}
                                             </div>
                                         </button>
                                     ))}
                                     {pexelsSearchType === 'videos' && pexelsVideoResults.map((video: PexelsVideo) => (
                                         <button key={video.id} onClick={() => handleAddPexelsItemToTimeline(video)} className="relative group aspect-video bg-gray-700 rounded-md overflow-hidden" disabled={settingPexelsBgId !== null}>
                                             <img src={video.image} alt={video.user.name} className="w-full h-full object-cover"/>
                                             <div className="absolute top-1 right-1 bg-black/50 rounded p-0.5"><VideoIcon size={12} className="text-white"/></div>
                                             <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                 {settingPexelsBgId === video.id ? (
                                                     <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                                                 ) : (
                                                     <span className="text-white text-xs text-center p-1">Adicionar à timeline</span>
                                                 )}
                                             </div>
                                         </button>
                                     ))}
                                 </div>
                                 {pexelsHasMore && !isSearchingPexels && (
                                     <button onClick={() => handlePexelsSearch(false)} className="w-full mt-2 bg-gray-700 hover:bg-gray-600 text-sm p-2 rounded-md">Carregar Mais</button>
                                 )}
                                  {isSearchingPexels && (pexelsPhotoResults.length > 0 || pexelsVideoResults.length > 0) && <div className="text-center p-4 text-gray-400">Buscando...</div>}
                             </div>
                        </div>
                        <SidebarButton onClick={handleAddTextClip}><TypeIcon className="w-5 h-5 mr-3" /> ADICIONAR CLIPE DE TEXTO</SidebarButton>
                        <div className="pt-4 border-t border-gray-700 space-y-2">
                            <SidebarButton onClick={() => { handleSelectClip(null, false, false); setIsSpectrumModalOpen(true); }} disabled={!hasAudioClip} title={!hasAudioClip ? "Carregue um áudio primeiro" : "Adicionar Espectro"}>
                                <PlusCircle className="w-5 h-5 mr-3" /> ADICIONAR ESPECTRO
                            </SidebarButton>
                        </div>
                        <div className="pt-4 border-t border-gray-700 space-y-2">
                            <SidebarButton onClick={() => { handleSelectClip(null, false, false); setIsStickerModalOpen(true); }} className="bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/40">
                                <Sparkles className="w-5 h-5 mr-3 text-violet-400" /> BIBLIOTECA DE STICKERS
                            </SidebarButton>
                            <SidebarButton onClick={() => { handleSelectClip(null, false, false); setIsShapeModalOpen(true); }}>
                                <Shapes className="w-5 h-5 mr-3" /> ADICIONAR FORMAS
                            </SidebarButton>
                            <SidebarButton onClick={() => { handleSelectClip(null, false, false); setIsEmojiModalOpen(true); }}>
                                <Smile className="w-5 h-5 mr-3" /> ADICIONAR EMOJI
                            </SidebarButton>
                        </div>
                        <div className="pt-4 border-t border-gray-700 space-y-2">
                            <SidebarButton onClick={() => setIsCaptionsModalOpen(true)} disabled={!hasAudioClip} title={!hasAudioClip ? "Carregue um áudio primeiro" : "Gerar legendas automáticas"}>
                                <Captions className="w-5 h-5 mr-3" /> LEGENDAS AUTOMÁTICAS
                            </SidebarButton>
                        </div>
                    </div>
                    <div className="pt-4 border-t border-gray-700">
                        <h3 className="text-base font-semibold text-violet-300 mb-2 flex items-center gap-2">
                            <ImagePlay className="w-5 h-5" /> Transições
                        </h3>
                        <p className="text-xs text-gray-400 mb-3">Arraste uma transição para o espaço entre dois clipes na linha do tempo para aplicá-la.</p>
                        <div className="max-h-36 overflow-y-auto pr-2">
                            <div className="grid grid-cols-auto-fit-44 gap-2">
                                {TRANSITION_MODELS.map(model => (
                                    <button
                                        key={model.id}
                                        draggable
                                        onDragStart={(e) => {
                                            const dragPayload = { type: 'transition', id: model.id };
                                            (window as any).__activeDragData = dragPayload;
                                            e.dataTransfer.setData('application/json', JSON.stringify(dragPayload));
                                            e.dataTransfer.setData('text/plain', JSON.stringify(dragPayload));
                                            e.dataTransfer.effectAllowed = 'copy';
                                        }}
                                        onDragEnd={() => {
                                            (window as any).__activeDragData = null;
                                        }}
                                        title={model.name}
                                        className="aspect-square flex flex-col items-center justify-center p-1 rounded-lg transition-all border-2 bg-gray-700/50 border-transparent hover:border-violet-500 cursor-grab active:cursor-grabbing hover:bg-gray-700"
                                    >
                                        {React.cloneElement(model.icon as React.ReactElement<{ className?: string }>, { className: 'w-5 h-5 text-gray-300' })}
                                        <span className="text-[8px] text-gray-400 text-center truncate max-w-full leading-tight mt-0.5">{model.name}</span>
                                    </button>
                            ))}
                        </div>
                    </div>
                </div>
                </div>
                </div>
                )}
                {isLeftPanelCollapsed && (
                    <div className="flex flex-col items-center py-4 gap-6">
                        <button onClick={toggleLeftPanel} className="p-2 hover:bg-gray-700 rounded-md text-violet-400" title="Mídia"><Film size={20}/></button>
                        <button onClick={handleAddTextClip} className="p-2 hover:bg-gray-700 rounded-md text-violet-400" title="Texto"><TypeIcon size={20}/></button>
                        <button onClick={() => setIsStickerModalOpen(true)} className="p-2 hover:bg-gray-700 rounded-md text-violet-400" title="Stickers"><Sparkles size={20}/></button>
                        <button onClick={() => setIsEmojiModalOpen(true)} className="p-2 hover:bg-gray-700 rounded-md text-violet-400" title="Emoji"><Smile size={20}/></button>
                        <button onClick={() => setIsSpectrumModalOpen(true)} className="p-2 hover:bg-gray-700 rounded-md text-violet-400" title="Espectro"><Activity size={20}/></button>
                        <button onClick={() => setIsShapeModalOpen(true)} className="p-2 hover:bg-gray-700 rounded-md text-violet-400" title="Forma"><Shapes size={20}/></button>
                    </div>
                )}
            </div>
            {!isLeftPanelCollapsed && <Splitter direction="vertical" onDrag={handleLeftPanelResize} className={isResizing ? 'bg-violet-600' : ''}/>}

            <div className="flex-grow flex flex-col bg-black relative overflow-hidden">
                <div ref={canvasWrapperRef} className="flex-grow flex items-center justify-center p-4 overflow-hidden">
                    <Canvas
                        ref={canvasRef}
                        format={format}
                        previewQuality={previewQuality}
                        projectState={projectState}
                        masterCurrentTime={masterCurrentTime}
                        selectedClipId={selectedClipIds[0] || null}
                        onSelectClip={(id) => handleSelectClip(id, false, false)}
                        onUpdateClip={handleUpdateClip}
                        onUpdateMultipleClips={handleUpdateMultipleClips}
                        isPlaying={isPlaying}
                        overlayEffect={scene.overlayEffect}
                        zoom={zoom}
                        fitScale={fitScale}
                        onInteractionStart={handleInteractionStart}
                        onInteractionEnd={handleInteractionEnd}
                        captionClips={captionClips}
                    />
                </div>
                 {/* NEW CONTROLS TOOLBAR */}
                <div className="flex-shrink-0 bg-gray-800 border-t border-gray-700 p-2 flex items-center justify-center">
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <button onClick={() => setZoom((z:number) => Math.max(0.1, z - 0.1))} className="p-1 hover:bg-gray-700 rounded-full" title="Diminuir zoom"><ZoomOut size={18}/></button>
                            <span>{Math.round(zoom*100)}%</span>
                            <button onClick={() => setZoom((z:number) => Math.min(5, z + 0.1))} className="p-1 hover:bg-gray-700 rounded-full" title="Aumentar zoom"><ZoomIn size={18}/></button>
                        </div>
                        <div className="w-px h-5 bg-gray-600"></div>
                        <button onClick={handleToggleCanvasFullscreen} className="p-1 hover:bg-gray-700 rounded-full" title={isCanvasFullscreen ? "Sair da Tela Cheia" : "Visualizar Canvas em Tela Cheia"}>
                            {isCanvasFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                        </button>
                    </div>
                </div>
            </div>
            {!isRightPanelCollapsed && <Splitter direction="vertical" onDrag={handleRightPanelResize} className={isResizing ? 'bg-violet-600' : ''}/>}

            {/* RIGHT PANEL */}
            <div 
                style={{width: isRightPanelCollapsed ? 48 : rightPanelWidth}} 
                className={`bg-gray-800 flex flex-col border-l border-gray-700 transition-all duration-300 ease-in-out relative ${isRightPanelCollapsed ? 'overflow-hidden' : ''}`}
            >
                 <div className="p-3 border-b border-gray-700 flex-shrink-0 flex items-center justify-between">
                    <button 
                        onClick={toggleRightPanel} 
                        className={`p-1.5 hover:bg-gray-700 rounded-md text-gray-400 hover:text-white transition-colors ${isRightPanelCollapsed ? 'mx-auto' : ''}`}
                        title={isRightPanelCollapsed ? "Expandir Painel" : "Recolher Painel"}
                    >
                        {isRightPanelCollapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                    </button>
                    {!isRightPanelCollapsed && <h2 className="text-base font-semibold text-violet-300 truncate">Propriedades</h2>}
                </div>
                {!isRightPanelCollapsed && (
                    <div className="overflow-y-auto p-3 space-y-4 flex-grow">
                    {(() => {
                        if (selectedClips.length === 0) {
                            return (
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold text-violet-300">CONFIGURAÇÕES GLOBAIS</h3>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Efeito de Sobreposição</label>
                                        <div className="grid grid-cols-auto-fit-50 gap-2">
                                            {(Object.keys(effectInfoMap) as OverlayEffect[]).map(effect => {
                                                const effectInfo = effectInfoMap[effect];
                                                return (
                                                    <button
                                                        key={effect}
                                                        onClick={() => handleUpdateScene({ overlayEffect: effect })}
                                                        title={effectInfo.name}
                                                        className={`aspect-square flex flex-col items-center justify-center gap-1 p-1 rounded-lg transition-all border-2 ${scene?.overlayEffect === effect ? 'bg-violet-700/80 border-violet-400' : 'bg-gray-700/50 border-transparent hover:border-violet-500'}`}
                                                    >
                                                        {React.cloneElement(effectInfo.icon as React.ReactElement, { className: `w-4 h-4 ${scene?.overlayEffect === effect ? 'text-white' : 'text-gray-300'}` })}
                                                        <span className={`text-[9px] text-center leading-tight ${scene?.overlayEffect === effect ? 'text-white' : 'text-gray-400'}`}>{effectInfo.name}</span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-gray-700 space-y-4">
                                        <h3 className="text-sm font-semibold text-violet-300">Bordas Animadas</h3>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Borda</label>
                                            <div className="grid grid-cols-5 gap-2">
                                                {(['none', 'solid', 'gradient', 'audio-glow', 'flames'] as const).map((type) => (
                                                    <button
                                                        key={type}
                                                        onClick={() => handleUpdateBorder({ type })}
                                                        className={`px-3 py-2 text-xs rounded-md transition-colors capitalize truncate ${animatedBorder.type === type ? 'bg-violet-600 text-white' : 'bg-gray-700/50 hover:bg-gray-600'}`}
                                                    >
                                                        {type === 'none' ? 'Nenhuma' : type === 'solid' ? 'Sólida' : type === 'gradient' ? 'Gradiente' : type === 'audio-glow' ? 'Reativa' : 'Chamas'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {animatedBorder.type !== 'none' && (
                                            <div className="space-y-4">
                                                <div>
                                                    <label htmlFor="border-width" className="block text-xs font-medium text-gray-300 mb-1">
                                                        Largura da Borda ({animatedBorder.width.toFixed(1)}%)
                                                    </label>
                                                    <input
                                                        id="border-width"
                                                        type="range"
                                                        min="0.1"
                                                        max="10"
                                                        step="0.1"
                                                        value={animatedBorder.width}
                                                        onChange={(e) => handleUpdateBorder({ width: parseFloat(e.target.value) })}
                                                        onMouseDown={handleInteractionStart}
                                                        onMouseUp={handleInteractionEnd}
                                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-3 gap-3">
                                                    <div className={animatedBorder.type === 'solid' ? 'col-span-3' : ''}>
                                                        <label htmlFor="border-color1" className="block text-xs font-medium text-gray-300 mb-1">
                                                            Cor 1
                                                        </label>
                                                        <input
                                                            type="color"
                                                            id="border-color1"
                                                            value={animatedBorder.color1}
                                                            onChange={(e) => handleUpdateBorder({ color1: e.target.value })}
                                                            onFocus={handleInteractionStart}
                                                            onBlur={handleInteractionEnd}
                                                            className="w-full h-10 bg-gray-900 border border-gray-600 rounded-md p-1 cursor-pointer"
                                                        />
                                                    </div>
                                                    { (animatedBorder.type !== 'solid') && (
                                                        <>
                                                        <div>
                                                            <label htmlFor="border-color2" className="block text-xs font-medium text-gray-300 mb-1">
                                                                Cor 2
                                                            </label>
                                                            <input
                                                                type="color"
                                                                id="border-color2"
                                                                value={animatedBorder.color2}
                                                                onChange={(e) => handleUpdateBorder({ color2: e.target.value })}
                                                                onFocus={handleInteractionStart}
                                                                onBlur={handleInteractionEnd}
                                                                className="w-full h-10 bg-gray-900 border border-gray-600 rounded-md p-1 cursor-pointer"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label htmlFor="border-color3" className="block text-xs font-medium text-gray-300 mb-1">
                                                                Cor 3
                                                            </label>
                                                            <input
                                                                type="color"
                                                                id="border-color3"
                                                                value={animatedBorder.color3 || '#4f46e5'}
                                                                onChange={(e) => handleUpdateBorder({ color3: e.target.value })}
                                                                onFocus={handleInteractionStart}
                                                                onBlur={handleInteractionEnd}
                                                                className="w-full h-10 bg-gray-900 border border-gray-600 rounded-md p-1 cursor-pointer"
                                                            />
                                                        </div>
                                                        </>
                                                    )}
                                                </div>

                                                {animatedBorder.type === 'gradient' && (
                                                    <div>
                                                        <label htmlFor="gradient-angle" className="block text-xs font-medium text-gray-300 mb-1">
                                                            Ângulo do Gradiente ({animatedBorder.gradientAngle}°)
                                                        </label>
                                                        <input
                                                            id="gradient-angle"
                                                            type="range"
                                                            min="0"
                                                            max="360"
                                                            step="1"
                                                            value={animatedBorder.gradientAngle}
                                                            onChange={(e) => handleUpdateBorder({ gradientAngle: parseInt(e.target.value, 10) })}
                                                            onMouseDown={handleInteractionStart}
                                                            onMouseUp={handleInteractionEnd}
                                                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        }
                        
                        if (areAllSelectedClipsTexty) {
                            return (
                                <TextEditor 
                                    selectedClips={selectedClips} 
                                    updateClips={handleUpdateSelectedClipsProps} 
                                    onInteractionStart={handleInteractionStart} 
                                    onInteractionEnd={handleInteractionEnd} 
                                />
                            );
                        }

                        if (selectedClips.length === 1) {
                            const clip = selectedClips[0];
                            if (clip.type === 'spectrum') {
                                return <SpectrumEditor clip={clip} onUpdate={handleUpdateClip} onFileUpload={handleFileChange} onInteractionStart={handleInteractionStart} onInteractionEnd={handleInteractionEnd} audioClipsOnTimeline={audioClipsOnTimeline} />;
                            }
// FIX: Corrected prop names from onInteractionStart/End to handleInteractionStart/End
                            return <ClipEditor clip={clip} onUpdate={handleUpdateClip} onInteractionStart={handleInteractionStart} onInteractionEnd={handleInteractionEnd} />;
                        }

                        // Default case for multi-select of non-text clips
                        return (
                            <div className="text-center p-4 bg-gray-900/50 rounded-lg">
                                <p className="font-bold">{selectedClips.length} clipes selecionados</p>
                                <p className="text-xs text-gray-400">A edição em massa está disponível apenas para clipes de texto/legenda.</p>
                            </div>
                        );
                    })()}
                     <div className="border-t border-gray-700 mt-4 pt-4">
                        <div className="text-center p-3 bg-gray-900/40 rounded-lg border border-gray-700/50">
                            <p className="text-sm text-gray-300 mb-3">
                                Gostou do nosso editor? Sua doação nos ajuda a mantê-lo gratuito e sempre melhorando. ❤️
                            </p>
                            <p className="text-xs text-gray-400 mb-2">Doe diretamente via PIX (Chave E-mail):</p>
                            <div className="flex items-center justify-center bg-gray-800/80 border border-gray-600 rounded-lg p-2 max-w-sm mx-auto">
                                <span className="text-sm font-mono text-violet-300 mr-2 break-all">{PIX_KEY}</span>
                                <button
                                    onClick={handleCopyPix}
                                    className={`p-2 rounded-md transition-colors flex-shrink-0 text-white ${pixCopied ? 'bg-green-600' : 'bg-violet-600 hover:bg-violet-700'}`}
                                    title="Copiar Chave PIX"
                                >
                                    {pixCopied ? <Check size={18} /> : <Copy size={18} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                )}
            </div>
        </div>

        <Splitter direction="horizontal" onDrag={handleTimelineResize} className={isResizing ? 'bg-violet-600' : ''}/>
        
        {/* BOTTOM PANEL - TIMELINE */}
        <div style={{height: timelineHeight}} className="flex-shrink-0">
             <Timeline 
                tracks={tracks}
                timelineClips={timelineClips}
                timelineTransitions={timelineTransitions}
                selectedClipIds={selectedClipIds}
                onSelectClip={handleSelectClip}
                selectedTrackIds={selectedTrackIds}
                onSelectTrack={handleTrackSelection}
                masterCurrentTime={masterCurrentTime}
                masterDuration={masterDuration}
                onSeek={seek}
                onPlay={play}
                onPause={pause}
                onStop={stop}
                isPlaying={isPlaying}
                onMoveClips={onMoveClips}
                onTrimClip={onTrimClip}
                onUpdateClip={handleUpdateClip}
                onSplitClipAtPlayhead={handleSplitClipAtPlayhead}
                onDeleteSelectedClips={handleDeleteSelectedClips}
                onAddClipToTrack={handleAddClipToTrack}
                onAddRecordedAudio={handleAddRecordedAudio}
                onAddTrack={handleAddTrack}
                onEditTransitionBetween={(clipAId, clipBId) => setEditingTransitionTarget({ clipAId, clipBId })}
                onAddOrUpdateTransition={handleAddOrUpdateTransition}
                onDeleteTransition={handleDeleteTransition}
                onApplyTransitionToAll={handleApplyTransitionToAll}
                onRenameTrack={handleRenameTrack}
                onReorderTracks={handleReorderTracks}
                onDeleteTrack={handleDeleteTrack}
                onToggleMuteTrack={handleToggleMuteTrack}
                onSetTrackVolume={handleSetTrackVolume}
                onDuplicateSelectedTracks={handleDuplicateSelectedTracks}
                timelineZoom={timelineZoom}
                onSetTimelineZoom={onSetTimelineZoom}
                onUndo={undo}
                onRedo={redo}
                canUndo={canUndo}
                canRedo={canRedo}
                onInteractionStart={handleInteractionStart}
                onInteractionEnd={handleInteractionEnd}
                mediaPool={mediaPool}
                playheadRef={playheadRef}
                timeDisplayRef={timeDisplayRef}
                formatTime={formatTime}
                defaultTransition={defaultTransition}
                isSnappingEnabled={isSnappingEnabled}
                onSetIsSnappingEnabled={setIsSnappingEnabled}
                touchHoverInfo={touchHoverInfo}
                copiedClip={copiedClip}
                onCopyClip={handleCopyClip}
                onPasteClip={handlePasteClip}
                onSelectAllClipsOnTrack={handleSelectAllClipsOnTrack}
             />
        </div>
      </div>

      <ExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} onExport={handleExport} format={format} />
      
      {editingTransitionTarget && (
        <TransitionEditorModal
            transition={editingTransition}
            onClose={() => setEditingTransitionTarget(null)}
            onUpdate={(data) => {
                if(editingTransitionTarget) {
                    handleAddOrUpdateTransition({ ...editingTransitionTarget, ...data });
                }
                setEditingTransitionTarget(null);
            }}
            onDelete={() => {
                if(editingTransitionTarget) {
                    handleDeleteTransition(editingTransitionTarget.clipAId, editingTransitionTarget.clipBId);
                }
                setEditingTransitionTarget(null);
            }}
            onSetDefault={setDefaultTransition}
            // FIX: Corrected typo from handleApplyToAll to handleApplyTransitionToAll
            onApplyToAll={handleApplyTransitionToAll}
        />
      )}
      
      <Modal isOpen={isShapeModalOpen} onClose={() => setIsShapeModalOpen(false)}>
            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold flex items-center"><Shapes className="mr-3 text-violet-400"/>Adicionar Forma Geométrica</h2>
                    <button onClick={() => setIsShapeModalOpen(false)} className="p-1 rounded-full hover:bg-gray-700"><X size={20}/></button>
                </div>
                <p className="text-sm text-gray-400 mb-6">Selecione uma forma para adicionar à linha do tempo na posição atual.</p>
                <div className="grid grid-cols-auto-fit-80 gap-6 max-h-96 overflow-y-auto p-1 pr-3">
                    {(['rectangle', 'circle', 'ellipse', 'triangle', 'star'] as ShapeType[]).map(shape => {
                        const iconMap: Record<ShapeType, React.ReactNode> = {
                            rectangle: <Square size={28} />,
                            circle: <CircleIcon size={28} />,
                            ellipse: <CircleIcon size={28} className="transform scale-x-150" />,
                            triangle: <TriangleIcon size={28} />,
                            star: <Star size={28} />,
                        };
                        return (
                            <button
                                key={shape}
                                onClick={() => handleAddShapeClip(shape)}
                                title={shape.charAt(0).toUpperCase() + shape.slice(1)}
                                className="aspect-square flex flex-col items-center justify-center gap-1 p-1 rounded-lg transition-all border-2 bg-gray-700/50 border-transparent hover:border-violet-500"
                            >
                                <div className="w-14 h-10 flex items-center justify-center text-gray-300">
                                  {iconMap[shape]}
                                </div>
                                <span className="text-xs capitalize text-gray-400">{shape}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
      </Modal>

      <StickerLibraryModal
        isOpen={isStickerModalOpen}
        onClose={() => setIsStickerModalOpen(false)}
        onAddSticker={handleAddStickerClip}
      />

      <EmojiLibraryModal
        isOpen={isEmojiModalOpen}
        onClose={() => setIsEmojiModalOpen(false)}
        onAddEmoji={handleAddEmojiClip}
      />

      <Modal isOpen={isCaptionsModalOpen} onClose={handleCloseCaptionsModal}>
          <div className="p-6 max-w-4xl mx-auto">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-3 border-b border-gray-800">
                  <h2 className="text-lg font-bold flex items-center">
                      <Captions className="mr-3 text-violet-400" size={22} />
                      {generatedCaptions ? 'Estilizar e Personalizar Legendas' : 'Gerar Legendas Automáticas'}
                  </h2>
                  <div className="flex items-center gap-2">
                      <label className="cursor-pointer text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-medium">
                          <Upload size={14} className="text-violet-400" />
                          <span>Importar .SRT</span>
                          <input 
                              type="file" 
                              accept=".srt,.vtt,.txt" 
                              className="hidden" 
                              onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                      handleImportSRTFile(e.target.files[0]);
                                      e.target.value = '';
                                  }
                              }} 
                          />
                      </label>
                      {generatedCaptions && generatedCaptions.length > 0 && (
                          <button 
                              type="button"
                              onClick={handleExportSRT}
                              className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-medium"
                          >
                              <Download size={14} className="text-green-400" />
                              <span>Exportar .SRT</span>
                          </button>
                      )}
                      <button onClick={handleCloseCaptionsModal} className="p-1.5 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"><X size={18}/></button>
                  </div>
              </div>

              {!generatedCaptions && (
                  <>
                      <p className="text-sm text-gray-400 mb-5">
                          Gere legendas automáticas com a tecnologia Whisper AI direto no seu navegador.
                      </p>
                      
                      <div className="space-y-4">
                          <div>
                              <label htmlFor="caption-audio-source" className="block text-sm font-medium text-gray-300 mb-1">Fonte de Áudio</label>
                              <select id="caption-audio-source" value={captionSource} onChange={(e) => setCaptionSource(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-sm focus:ring-violet-500 focus:border-violet-500 text-gray-100" disabled={isGeneratingCaptions}>
                                  <option value="master">Mix Principal da Linha do Tempo</option>
                                  {audioClipsOnTimeline.map(audioClip => (<option key={audioClip.id} value={audioClip.id}>{audioClip.fileName}</option>))}
                              </select>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                  <label htmlFor="caption-model-select" className="block text-sm font-medium text-gray-300 mb-1">Modelo Whisper AI</label>
                                  <select 
                                      id="caption-model-select" 
                                      value={captionModel} 
                                      onChange={(e) => setCaptionModel(e.target.value as any)} 
                                      className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-sm focus:ring-violet-500 focus:border-violet-500 text-white" 
                                      disabled={isGeneratingCaptions}
                                  >
                                      <option value="Xenova/whisper-tiny">Whisper Tiny (~39MB) - Mais Rápido</option>
                                      <option value="Xenova/whisper-base">Whisper Base (~73MB) - Recomendado</option>
                                      <option value="Xenova/whisper-small">Whisper Small (~240MB) - Maior Precisão</option>
                                  </select>
                              </div>
                              <div>
                                  <label htmlFor="caption-lang-select" className="block text-sm font-medium text-gray-300 mb-1">Idioma da Fala</label>
                                  <select 
                                      id="caption-lang-select" 
                                      value={captionLanguage} 
                                      onChange={(e) => setCaptionLanguage(e.target.value)} 
                                      className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-sm focus:ring-violet-500 focus:border-violet-500 text-white" 
                                      disabled={isGeneratingCaptions}
                                  >
                                      <option value="portuguese">Português (Brasil)</option>
                                      <option value="english">Inglês</option>
                                      <option value="spanish">Espanhol</option>
                                      <option value="auto">Detectar Automático</option>
                                  </select>
                              </div>
                          </div>

                          {/* Estilo e Densidade de Palavras Inicial */}
                          <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1.5">Estilo de Divisão (Palavras por trecho)</label>
                              <div className="grid grid-cols-3 gap-2">
                                  <button
                                      type="button"
                                      onClick={() => setCaptionDensityMode('shorts')}
                                      className={`p-2.5 rounded-lg border text-left text-xs transition-all ${captionDensityMode === 'shorts' ? 'bg-violet-600/30 border-violet-500 text-violet-200' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600'}`}
                                  >
                                      <div className="font-bold flex items-center gap-1"><Zap size={13} /> Curto (Reels/TikTok)</div>
                                      <div className="text-[10px] opacity-80 mt-0.5">1-3 palavras por tela</div>
                                  </button>
                                  <button
                                      type="button"
                                      onClick={() => setCaptionDensityMode('balanced')}
                                      className={`p-2.5 rounded-lg border text-left text-xs transition-all ${captionDensityMode === 'balanced' ? 'bg-violet-600/30 border-violet-500 text-violet-200' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600'}`}
                                  >
                                      <div className="font-bold flex items-center gap-1"><Layout size={13} /> Equilibrado</div>
                                      <div className="text-[10px] opacity-80 mt-0.5">4-7 palavras por tela</div>
                                  </button>
                                  <button
                                      type="button"
                                      onClick={() => setCaptionDensityMode('long')}
                                      className={`p-2.5 rounded-lg border text-left text-xs transition-all ${captionDensityMode === 'long' ? 'bg-violet-600/30 border-violet-500 text-violet-200' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600'}`}
                                  >
                                      <div className="font-bold flex items-center gap-1"><FileText size={13} /> Frases Longas</div>
                                      <div className="text-[10px] opacity-80 mt-0.5">8-12 palavras por tela</div>
                                  </button>
                              </div>
                          </div>
                      </div>

                      {isGeneratingCaptions ? (
                          <div className="mt-6 p-6 bg-gray-950/80 rounded-xl border border-violet-500/30 text-center">
                              <div className="w-10 h-10 text-violet-400 mx-auto animate-spin mb-3">
                                  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M16 4C9.37258 4 4 9.37258 4 16C4 22.6274 9.37258 28 16 28" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="30 100"/>
                                  </svg>
                              </div>
                              <p className="text-sm font-semibold text-gray-200">{captionStatus || 'Carregando modelo e transcrevendo áudio...'}</p>
                          </div>
                      ) : (
                          <button onClick={handleGenerateCaptions} className="w-full mt-6 bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-violet-900/30 transition-all flex items-center justify-center gap-2">
                              <Sparkles size={18} />
                              <span>Gerar Legendas Automáticas</span>
                          </button>
                      )}
                      {!isGeneratingCaptions && captionStatus && <p className={`text-center mt-3 text-xs ${captionStatus.toLowerCase().includes('falha') ? 'text-red-400' : 'text-gray-400'}`}>{captionStatus}</p>}
                  </>
              )}

              {generatedCaptions && !isGeneratingCaptions && (
                  <>
                      {/* Control Controls Toolbar */}
                      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-gray-950/80 rounded-xl border border-gray-800">
                          {/* Densidade de Palavras */}
                          <div>
                              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Divisão de Palavras</span>
                              <div className="flex bg-gray-900 p-0.5 rounded-lg border border-gray-800">
                                  <button 
                                      type="button" 
                                      onClick={() => handleDensityChange('shorts')}
                                      className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-all ${captionDensityMode === 'shorts' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                                  >
                                      ⚡ 1-3 Palavras
                                  </button>
                                  <button 
                                      type="button" 
                                      onClick={() => handleDensityChange('balanced')}
                                      className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-all ${captionDensityMode === 'balanced' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                                  >
                                      ⚖️ 4-7
                                  </button>
                                  <button 
                                      type="button" 
                                      onClick={() => handleDensityChange('long')}
                                      className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-all ${captionDensityMode === 'long' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                                  >
                                      📜 8-12
                                  </button>
                              </div>
                          </div>

                          {/* Posição Vertical */}
                          <div>
                              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Posição na Tela</span>
                              <div className="flex bg-gray-900 p-0.5 rounded-lg border border-gray-800">
                                  <button 
                                      type="button" 
                                      onClick={() => setCaptionVerticalPosition('bottom')}
                                      className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-all ${captionVerticalPosition === 'bottom' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                                  >
                                      Inferior
                                  </button>
                                  <button 
                                      type="button" 
                                      onClick={() => setCaptionVerticalPosition('center')}
                                      className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-all ${captionVerticalPosition === 'center' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                                  >
                                      Centro
                                  </button>
                                  <button 
                                      type="button" 
                                      onClick={() => setCaptionVerticalPosition('top')}
                                      className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-all ${captionVerticalPosition === 'top' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                                  >
                                      Topo
                                  </button>
                              </div>
                          </div>

                          {/* Animação */}
                          <div>
                              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Animação de Entrada</span>
                              <select 
                                  value={captionAnimationIn} 
                                  onChange={(e) => setCaptionAnimationIn(e.target.value)}
                                  className="w-full bg-gray-900 border border-gray-800 rounded-lg p-1.5 text-xs text-gray-200 focus:ring-violet-500"
                              >
                                  <option value="pop-in-by-word">Pop por Palavra (Estilo Viral)</option>
                                  <option value="fade-in-by-word">Esmaecer por Palavra</option>
                                  <option value="bounce-in-by-word">Salto por Palavra</option>
                                  <option value="slide-in-up">Deslizar para Cima</option>
                                  <option value="none">Sem Animação (Estático)</option>
                              </select>
                          </div>
                      </div>

                      {/* Sincronização & Calibração de Tempo */}
                      <div className="mb-4 p-3 bg-violet-950/20 border border-violet-900/40 rounded-xl">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-1.5">
                                  <Clock size={15} className="text-violet-400" />
                                  <span className="text-xs font-bold text-gray-200">Sincronização Acústica da Fala</span>
                                  {captionSyncOffsetMs !== 0 && (
                                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-violet-600/30 text-violet-300 font-mono font-medium">
                                          {captionSyncOffsetMs > 0 ? `+${captionSyncOffsetMs}ms` : `${captionSyncOffsetMs}ms`}
                                      </span>
                                  )}
                              </div>
                              <button
                                  type="button"
                                  onClick={handleRealignWithAudioEnergy}
                                  title="Recalcula o tempo das palavras detectando as vibrações sonoras do áudio"
                                  className="text-xs bg-violet-600/30 text-violet-200 hover:bg-violet-600/50 border border-violet-500/40 px-2.5 py-1 rounded-md transition-all flex items-center gap-1 font-medium"
                              >
                                  <Volume2 size={13} className="text-violet-300" /> Auto-Alinhar por Onda Sonora
                              </button>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[11px] text-gray-400">Calibrar atraso/avanço geral:</span>
                              <div className="inline-flex rounded-lg border border-gray-800 bg-gray-900/90 p-0.5">
                                  <button
                                      type="button"
                                      onClick={() => handleNudgeSync(-200)}
                                      title="Adiantar 200 milissegundos"
                                      className="px-2 py-1 text-[11px] font-mono font-semibold text-gray-300 hover:text-white hover:bg-gray-800 rounded transition-colors"
                                  >
                                      -200ms
                                  </button>
                                  <button
                                      type="button"
                                      onClick={() => handleNudgeSync(-50)}
                                      title="Adiantar 50 milissegundos"
                                      className="px-2 py-1 text-[11px] font-mono font-semibold text-gray-300 hover:text-white hover:bg-gray-800 rounded transition-colors"
                                  >
                                      -50ms
                                  </button>
                                  <button
                                      type="button"
                                      onClick={handleResetSync}
                                      title="Zerar calibração"
                                      className="px-2 py-1 text-[11px] font-mono text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors border-x border-gray-800"
                                  >
                                      0ms
                                  </button>
                                  <button
                                      type="button"
                                      onClick={() => handleNudgeSync(50)}
                                      title="Atrasar 50 milissegundos"
                                      className="px-2 py-1 text-[11px] font-mono font-semibold text-gray-300 hover:text-white hover:bg-gray-800 rounded transition-colors"
                                  >
                                      +50ms
                                  </button>
                                  <button
                                      type="button"
                                      onClick={() => handleNudgeSync(200)}
                                      title="Atrasar 200 milissegundos"
                                      className="px-2 py-1 text-[11px] font-mono font-semibold text-gray-300 hover:text-white hover:bg-gray-800 rounded transition-colors"
                                  >
                                      +200ms
                                  </button>
                              </div>
                              <span className="text-[10px] text-gray-500 italic">Dica: Se a legenda surge antes da voz, use +50ms. Se surge depois, use -50ms.</span>
                          </div>
                      </div>

                      {/* Interactive Captions List */}
                      <div className="mb-5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                              <span className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Edição dos Trechos ({generatedCaptions.length})</span>
                              <div className="flex items-center gap-2">
                                  <button 
                                      type="button"
                                      onClick={handleAutoCorrectCaptions}
                                      title="Remove palavras duplicadas e aplica correções gramaticais em Português"
                                      className="text-xs bg-amber-600/20 text-amber-300 hover:bg-amber-600/40 border border-amber-500/30 px-2.5 py-1 rounded-md transition-all flex items-center gap-1 font-medium"
                                  >
                                      <Sparkles size={13} /> Otimizar Textos
                                  </button>
                                  <button 
                                      type="button"
                                      onClick={() => handleAddCaptionLineAfter(generatedCaptions.length - 1)}
                                      className="text-xs bg-violet-600/30 text-violet-300 hover:bg-violet-600/60 border border-violet-500/30 px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 font-medium"
                                  >
                                      <Plus size={13} /> Nova Linha
                                  </button>
                              </div>
                          </div>

                          {/* Bulk Search and Replace Tool */}
                          <div className="mb-3 p-2.5 bg-gray-950/60 rounded-lg border border-gray-800 flex flex-col md:flex-row md:items-end gap-2">
                              <div className="flex-1">
                                  <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5 font-semibold">Localizar</label>
                                  <input 
                                      type="text"
                                      placeholder="Ex: vc, pra..."
                                      value={findText}
                                      onChange={(e) => setFindText(e.target.value)}
                                      className="w-full bg-gray-900 border border-gray-700 rounded p-1.5 text-xs text-gray-200 placeholder-gray-500"
                                  />
                              </div>
                              <div className="flex-1">
                                  <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5 font-semibold">Substituir por</label>
                                  <input 
                                      type="text"
                                      placeholder="Ex: você, para..."
                                      value={replaceText}
                                      onChange={(e) => setReplaceText(e.target.value)}
                                      className="w-full bg-gray-900 border border-gray-700 rounded p-1.5 text-xs text-gray-200 placeholder-gray-500"
                                  />
                              </div>
                              <button
                                  type="button"
                                  disabled={!findText}
                                  onClick={handleBulkReplace}
                                  className="shrink-0 bg-violet-700 hover:bg-violet-600 disabled:opacity-40 disabled:hover:bg-violet-700 text-white text-xs px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1"
                              >
                                  <Search size={13} /> Substituir Tudo
                              </button>
                          </div>

                          <div className="max-h-52 overflow-y-auto space-y-2 p-2 bg-gray-950/80 rounded-lg border border-gray-700/60 custom-scrollbar">
                              {generatedCaptions.map((caption, index) => (
                                  <div key={index} className="flex flex-col sm:flex-row gap-2 p-2 bg-gray-900/60 border border-gray-800 rounded-md hover:border-gray-700/80 transition-colors">
                                      <div className="flex sm:flex-col justify-between sm:justify-center gap-1 shrink-0 sm:w-28 text-center text-xs font-mono text-gray-400">
                                          <div className="flex items-center gap-1">
                                              <span className="text-[10px] uppercase text-gray-500 w-8 text-left">Início</span>
                                              <input 
                                                  type="number" 
                                                  step="0.1" 
                                                  min="0"
                                                  value={parseFloat(caption.start.toFixed(2))}
                                                  onChange={(e) => handleUpdateCaptionStart(index, parseFloat(e.target.value) || 0)}
                                                  className="w-16 bg-gray-950 border border-gray-700 rounded p-1 text-center text-gray-200"
                                              />
                                          </div>
                                          <div className="flex items-center gap-1">
                                              <span className="text-[10px] uppercase text-gray-500 w-8 text-left">Fim</span>
                                              <input 
                                                  type="number" 
                                                  step="0.1" 
                                                  min="0"
                                                  value={parseFloat(caption.end.toFixed(2))}
                                                  onChange={(e) => handleUpdateCaptionEnd(index, parseFloat(e.target.value) || 0)}
                                                  className="w-16 bg-gray-950 border border-gray-700 rounded p-1 text-center text-gray-200"
                                              />
                                          </div>
                                          <button
                                              type="button"
                                              onClick={() => seek(caption.start)}
                                              title="Ir para este trecho no vídeo"
                                              className="mt-0.5 py-0.5 px-1 bg-gray-800/80 hover:bg-violet-600/40 text-gray-400 hover:text-violet-200 rounded text-[10px] flex items-center justify-center gap-1 transition-colors"
                                          >
                                              <Play size={10} /> Testar
                                          </button>
                                      </div>

                                      <div className="grow">
                                          <textarea
                                              value={caption.text}
                                              onChange={(e) => handleUpdateCaptionText(index, e.target.value)}
                                              rows={1}
                                              className="w-full h-full min-h-[38px] bg-gray-950 border border-gray-700 rounded p-2 text-sm text-gray-100 focus:outline-none focus:border-violet-500 resize-none"
                                              placeholder="..."
                                          />
                                      </div>

                                      <div className="flex items-center sm:flex-col justify-end gap-1 shrink-0">
                                          {index < generatedCaptions.length - 1 && (
                                              <button 
                                                  onClick={() => handleMergeCaptionWithNext(index)}
                                                  title="Mesclar com a seguinte"
                                                  className="p-1.5 text-gray-400 hover:text-violet-400 hover:bg-violet-950/30 rounded transition-colors"
                                              >
                                                  <Layers size={14} />
                                              </button>
                                          )}
                                          <button 
                                              onClick={() => handleAddCaptionLineAfter(index)}
                                              title="Inserir linha abaixo"
                                              className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-green-950/30 rounded transition-colors"
                                          >
                                              <Plus size={14} />
                                          </button>
                                          <button 
                                              onClick={() => handleDeleteCaptionLine(index)}
                                              title="Excluir trecho"
                                              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-950/30 rounded transition-colors"
                                          >
                                              <Trash2 size={14} />
                                          </button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>

                      <div className="mb-2 flex items-center justify-between">
                          <p className="text-xs text-gray-300 font-semibold flex items-center gap-1.5">
                              <span>Estilo Visual das Legendas:</span>
                              <span className="text-[10px] text-violet-400 bg-violet-950/60 border border-violet-800/60 px-1.5 py-0.5 rounded font-medium">Recomendados</span>
                          </p>
                          <button
                              type="button"
                              onClick={() => setShowAllTextPresets(prev => !prev)}
                              className="text-[11px] text-gray-400 hover:text-gray-200 underline transition-colors"
                          >
                              {showAllTextPresets ? 'Ocultar outros estilos' : `Ver outros estilos (+${PRESET_TEXT_STYLES.length})`}
                          </button>
                      </div>

                      {/* Curated Caption Presets Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                          {CAPTION_PRESET_STYLES.map((preset) => {
                              const isActive = selectedCaptionStyleId === preset.id;
                              const inlineStyle: React.CSSProperties = {
                                  fontFamily: preset.style.fontFamily,
                                  fontWeight: preset.style.fontWeight,
                                  fontStyle: preset.style.fontStyle,
                                  letterSpacing: `${preset.style.letterSpacing || 0}px`,
                                  textTransform: preset.style.textTransform as any,
                                  textDecoration: preset.style.textDecoration as any,
                                  textShadow: preset.style.textShadow ? `${preset.style.textShadowOffsetX || 0}px ${preset.style.textShadowOffsetY || 0}px ${preset.style.textShadowBlur || 0}px ${preset.style.textShadowColor}` : 'none',
                                  WebkitTextStroke: preset.style.textStroke ? `${preset.style.textStrokeWidth || 0}px ${preset.style.textStrokeColor}` : 'unset',
                                  fontSize: '18px',
                              };
                              if (preset.style.fillGradient) {
                                  const { angle, stops } = preset.style.fillGradient;
                                  inlineStyle.backgroundImage = `linear-gradient(${angle}deg, ${stops.map(s => `${s.color} ${s.pos * 100}%`).join(', ')})`;
                                  inlineStyle.backgroundClip = 'text';
                                  inlineStyle.WebkitBackgroundClip = 'text';
                                  inlineStyle.color = 'transparent';
                              } else {
                                  inlineStyle.color = preset.style.color;
                              }
                              return (
                                  <button
                                      key={preset.id}
                                      type="button"
                                      onClick={() => setSelectedCaptionStyleId(preset.id)}
                                      className={`flex flex-col items-center justify-between p-2 rounded-lg border transition-all text-center ${
                                          isActive
                                              ? 'bg-violet-950/80 border-violet-400 shadow-md ring-2 ring-violet-500/50 scale-[1.02]'
                                              : 'bg-gray-900/90 border-gray-800 hover:border-gray-600 hover:bg-gray-800/80'
                                      }`}
                                  >
                                      <div className="h-10 w-full flex items-center justify-center overflow-hidden">
                                          <span style={inlineStyle} className="truncate select-none">
                                              Aa Legenda
                                          </span>
                                      </div>
                                      <span className="text-[11px] font-semibold text-gray-200 mt-1 truncate max-w-full">
                                          {preset.name}
                                      </span>
                                  </button>
                              );
                          })}
                      </div>

                      {/* Extended General Presets (Accordion) */}
                      {showAllTextPresets && (
                          <div className="mb-3">
                              <p className="text-[11px] text-gray-400 mb-1.5 font-medium">Estilos Gerais de Títulos e Textos:</p>
                              <div className="max-h-40 overflow-y-auto p-1.5 pr-2 bg-gray-950/80 rounded-md border border-gray-800">
                                  <div className="grid grid-cols-auto-fit-60 gap-2">
                                      {PRESET_TEXT_STYLES.map((preset) => {
                                          const animationClass = animationToClassMap[preset.style.animationIn as string] || animationToClassMap[preset.style.animationLoop as string] || '';
                                          const isActive = selectedCaptionStyleId === preset.id;
                                          const inlineStyle: React.CSSProperties = {
                                              fontFamily: preset.style.fontFamily, fontWeight: preset.style.fontWeight, fontStyle: preset.style.fontStyle,
                                              letterSpacing: `${preset.style.letterSpacing || 0}px`, textTransform: preset.style.textTransform as any,
                                              textDecoration: preset.style.textDecoration as any,
                                              textShadow: preset.style.textShadow ? `${preset.style.textShadowOffsetX || 0}px ${preset.style.textShadowOffsetY || 0}px ${preset.style.textShadowBlur || 0}px ${preset.style.textShadowColor}` : 'none',
                                              WebkitTextStroke: preset.style.textStroke ? `${preset.style.textStrokeWidth || 0}px ${preset.style.textStrokeColor}` : 'unset',
                                              fontSize: '24px',
                                          };
                                          if (preset.style.fillGradient) {
                                              const { angle, stops } = preset.style.fillGradient;
                                              inlineStyle.backgroundImage = `linear-gradient(${angle}deg, ${stops.map(s => `${s.color} ${s.pos * 100}%`).join(', ')})`;
                                              inlineStyle.backgroundClip = 'text'; inlineStyle.WebkitBackgroundClip = 'text'; inlineStyle.color = 'transparent';
                                          } else { inlineStyle.color = preset.style.color; }
                                          return (
                                              <button key={preset.id} title={preset.name} onClick={() => setSelectedCaptionStyleId(preset.id)}
                                                  className={`aspect-square flex items-center justify-center text-center p-1 rounded-md transition-all ${isActive ? 'bg-violet-700 border-2 border-violet-400 shadow-md scale-105' : 'bg-gray-900/80 border border-gray-700 hover:border-violet-500'}`}>
                                                  <span style={inlineStyle} className={`pointer-events-none ${animationClass}`}>
                                                      Aa
                                                  </span>
                                              </button>
                                          );
                                      })}
                                  </div>
                              </div>
                          </div>
                      )}

                      <button onClick={handleApplyCaptions} className="w-full mt-5 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-green-900/30 transition-all flex items-center justify-center gap-2">
                          <CheckCircle size={18} />
                          <span>Aplicar {generatedCaptions.length} Legendas à Linha do Tempo</span>
                      </button>
                  </>
              )}
          </div>
      </Modal>

      <Modal isOpen={isExporting || exportProgress !== null} onClose={handleCloseExportModal} progress={exportProgress}>
        {isExporting ? (
          <div className="p-6 md:p-8 text-white relative">
            <div className="absolute top-4 right-4">
                <button onClick={handleCloseExportModal} className="p-1.5 text-gray-400 rounded-full hover:bg-gray-700 hover:text-white transition-colors"><X size={24}/></button>
            </div>
            
            <div className="flex items-center gap-4 mb-4 text-left w-full">
                <div className="w-10 h-10 shrink-0 text-violet-400">
                   <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-spin">
                      <path d="M16 4C9.37258 4 4 9.37258 4 16C4 22.6274 9.37258 28 16 28" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="30 100"/>
                   </svg>
                </div>
                <div>
                    <h2 className="text-2xl font-bold">Exportando Vídeo</h2>
                    <p className="text-sm text-gray-400">{exportStatus || 'Renderizando quadros de vídeo...'}</p>
                </div>
            </div>

            <div className="my-8 text-center">
                <p className="text-gray-400 uppercase tracking-widest text-sm">Progresso</p>
                <p className="text-7xl font-bold text-white my-2">{Math.round(exportProgress || 0)}<span className="text-5xl text-gray-400">%</span></p>
            </div>

            <div className="bg-gray-900/40 border border-gray-700/50 rounded-lg p-4 my-6 text-sm text-center">
                <p className="text-gray-300 mb-3">
                    Gostou do nosso editor? Sua doação nos ajuda a mantê-lo gratuito e sempre melhorando. ❤️
                </p>
                <p className="text-xs text-gray-400 mb-2">Doe diretamente via PIX (Chave E-mail):</p>
                <div className="flex items-center justify-center bg-gray-800/80 border border-gray-600 rounded-lg p-2 max-w-sm mx-auto">
                    <span className="text-sm font-mono text-violet-300 mr-2 break-all">{PIX_KEY}</span>
                    <button
                        onClick={handleCopyPix}
                        className={`p-2 rounded-md transition-colors flex-shrink-0 text-white ${pixCopied ? 'bg-green-600' : 'bg-violet-600 hover:bg-violet-700'}`}
                        title="Copiar Chave PIX"
                    >
                        {pixCopied ? <Check size={18} /> : <Copy size={18} />}
                    </button>
                </div>
            </div>
            
            <p className="text-xs text-gray-500 text-center">
                Este processo pode levar alguns minutos. Por favor, não feche esta aba.
            </p>
          </div>
        ) : (
          <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center">
                      {exportStatus.includes('concluída') ? 
                      <CheckCircle size={32} className="text-green-400 mr-4 flex-shrink-0"/> :
                      <AlertCircle size={32} className="text-red-400 mr-4 flex-shrink-0"/>
                      }
                      <div>
                          <h2 className="text-lg font-bold">Status da Exportação</h2>
                          <p className="text-sm text-gray-400">{exportStatus}</p>
                      </div>
                  </div>
                  <button onClick={handleCloseExportModal} className="p-1 rounded-full hover:bg-gray-700"><X size={20}/></button>
              </div>
          </div>
        )}
      </Modal>

       <Modal isOpen={isSpectrumModalOpen} onClose={() => setIsSpectrumModalOpen(false)}>
            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold flex items-center"><PlusCircle className="mr-3 text-violet-400"/>Adicionar Espectro de Áudio</h2>
                    <button onClick={() => setIsSpectrumModalOpen(false)} className="p-1 rounded-full hover:bg-gray-700"><X size={20}/></button>
                </div>
                <p className="text-sm text-gray-400 mb-6">Selecione um estilo de espectro para adicionar à linha do tempo na posição atual.</p>
                <div className="grid grid-cols-auto-fit-80 gap-3 max-h-96 overflow-y-auto p-1 pr-3">
                    {SPECTRUM_MODELS.map(model => (
                        <button key={model.id} onClick={() => { handleAddSpectrumClip(model.id); setIsSpectrumModalOpen(false); }} title={model.name} className="aspect-square flex flex-col items-center justify-center gap-1 p-1 rounded-lg transition-all border-2 bg-gray-700/50 border-transparent hover:border-violet-500">
                            {React.cloneElement(model.icon as React.ReactElement<{ className?: string }>, { className: 'w-7 h-7 text-gray-300' })}
                            <span className="text-xs text-center leading-tight text-gray-400">{model.name}</span>
                        </button>
                    ))}
                </div>
            </div>
      </Modal>

      {/* Modal: Salvar Antes de Fechar o App */}
      <Modal isOpen={isSaveBeforeExitModalOpen} onClose={() => { if (!isSavingAndExiting) setIsSaveBeforeExitModalOpen(false); }}>
          <div className="p-6 text-white max-w-md w-full">
              <div className="flex items-center justify-between pb-4 border-b border-gray-700/80 mb-4">
                  <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-violet-500/20 text-violet-400 rounded-lg border border-violet-500/30">
                          <Save size={22} />
                      </div>
                      <div>
                          <h2 className="text-lg font-bold text-gray-100">Salvar antes de fechar?</h2>
                          <p className="text-xs text-gray-400">Proteja seu trabalho antes de sair do editor</p>
                      </div>
                  </div>
                  {!isSavingAndExiting && (
                      <button 
                          onClick={() => setIsSaveBeforeExitModalOpen(false)} 
                          className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
                          title="Cancelar"
                      >
                          <X size={20} />
                      </button>
                  )}
              </div>

              <p className="text-sm text-gray-300 mb-4 leading-relaxed">
                  Você possui edições em andamento no projeto. Deseja salvar o arquivo do projeto (<span className="font-mono text-violet-300 font-semibold">.vee</span>) com todas as suas mídias, faixas e configurações antes de fechar?
              </p>

              <div className="bg-gray-900/70 rounded-lg p-3.5 border border-gray-700/60 mb-5 space-y-2">
                  <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Duração do projeto:</span>
                      <span className="font-semibold text-gray-200">{formatTime(masterDuration)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Clipes na linha do tempo:</span>
                      <span className="font-semibold text-gray-200">{timelineClips.length} itens</span>
                  </div>
                  <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Arquivos de mídia:</span>
                      <span className="font-semibold text-gray-200">{mediaPool.length} itens</span>
                  </div>
                  {isSavingAndExiting && (
                      <div className="pt-2 border-t border-gray-800 flex items-center gap-2 text-xs text-violet-400 font-medium">
                          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-spin w-3.5 h-3.5 shrink-0">
                              <path d="M16 4C9.37258 4 4 9.37258 4 16C4 22.6274 9.37258 28 16 28" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="30 100"/>
                          </svg>
                          <span>{projectStatus || 'Compactando e salvando projeto...'}</span>
                      </div>
                  )}
              </div>

              <div className="flex flex-col gap-2.5">
                  <button
                      onClick={handleConfirmSaveAndExit}
                      disabled={isSavingAndExiting}
                      className="w-full py-2.5 px-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-violet-900/30 transition-all cursor-pointer"
                  >
                      {isSavingAndExiting ? (
                          <>
                              <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-spin w-4 h-4">
                                  <path d="M16 4C9.37258 4 4 9.37258 4 16C4 22.6274 9.37258 28 16 28" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="30 100"/>
                              </svg>
                              <span>Salvando e Fechando...</span>
                          </>
                      ) : (
                          <>
                              <FileDown size={18} />
                              <span>Salvar Projeto e Fechar</span>
                          </>
                      )}
                  </button>

                  <button
                      onClick={handleConfirmExitWithoutSaving}
                      disabled={isSavingAndExiting}
                      className="w-full py-2.5 px-4 bg-gray-700/60 hover:bg-red-500/20 text-gray-300 hover:text-red-300 text-sm font-medium rounded-lg flex items-center justify-center gap-2 border border-gray-600/50 hover:border-red-500/50 transition-all cursor-pointer"
                  >
                      <Power size={16} />
                      <span>Sair sem Salvar</span>
                  </button>

                  <button
                      onClick={() => setIsSaveBeforeExitModalOpen(false)}
                      disabled={isSavingAndExiting}
                      className="w-full py-2 px-4 text-gray-400 hover:text-gray-200 text-xs font-medium transition-colors text-center mt-1 cursor-pointer"
                  >
                      Cancelar e Continuar Editando
                  </button>
              </div>
          </div>
      </Modal>
    </div>
    );
};

// --- Main Editor Component ---
type ClipUpdate = { id: string; props: Partial<VideoClip> };

// Helper functions for initial layout calculation, run before first render
const getInitialTimelineHeight = () => {
    const headerHeight = 80; // from h-20 in header
    const splitterHeight = 4; // from h-1 on splitter
    const controlsToolbarHeight = 48; // Approximate height of the canvas controls toolbar
    const availableHeight = window.innerHeight - headerHeight - splitterHeight - controlsToolbarHeight;
    // Allocate a balanced portion of the screen (~40%) to the timeline initially.
    const idealTimelineHeight = availableHeight * 0.40;
    return Math.max(200, Math.min(450, Math.round(idealTimelineHeight)));
};

const getInitialPanelWidth = () => {
    const windowWidth = window.innerWidth;
    // Give more space to canvas on smaller screens
    if (windowWidth < 1600) {
        return 320;
    }
    if (windowWidth < 1920) {
        const idealPanelWidth = windowWidth * 0.18;
        return Math.max(320, Math.min(360, Math.round(idealPanelWidth)));
    }
    return 360;
};

const getInitialTimelineZoom = (duration: number) => {
    const trackHeadersWidth = 256; // w-64
    const buffer = 40; // Provide a buffer for vertical scrollbar and padding
    const availableWidth = window.innerWidth - trackHeadersWidth - buffer;
    const contentWidthAtZoom1 = duration * BASE_PIXELS_PER_SECOND;

    if (contentWidthAtZoom1 > availableWidth) {
        // Fit content just within the available width
        return availableWidth / contentWidthAtZoom1;
    }
    return 1; // Default zoom if content already fits
};

// No longer used for insertion to add new tracks to the top per user request.
// const TRACK_TYPE_ORDER: Track['type'][] = ['text', 'emoji', 'shape', 'spectrum', 'video', 'audio'];

const insertTrackInOrder = (tracks: Track[], newTrack: Track): Track[] => {
    // Per user request, new tracks are added to the top of the timeline.
    return [newTrack, ...tracks];
};

export const Editor: React.FC<EditorProps> = (props) => {
  const { format, onBack, onGoToAbout, onGoToDonate } = props;
  
  const [initialState] = useState(() => {
    // New default track order
    const initialTracks: Track[] = [
      { id: `s-track-${Date.now()}-2`, type: 'spectrum', name: 'Espectro 1', isMuted: false, volume: 1 },
      { id: `v-track-${Date.now()}-3`, type: 'video', name: 'Vídeo 1', isMuted: false, volume: 1, preMuteVolume: 1 },
      { id: `a-track-${Date.now()}-4`, type: 'audio', name: 'Áudio 1', isMuted: false, volume: 1, preMuteVolume: 1 },
    ];
    
    const initialProjectState: ProjectState = {
        scene: { 
            id: 'scene-1', 
            name: 'Cena Principal', 
            overlayEffect: 'none',
            animatedBorder: {
                type: 'none',
                width: 2,
                color1: '#FFA500',
                color2: '#FF4500',
                color3: '#4f46e5',
                gradientAngle: 45,
            }
        },
        tracks: initialTracks,
        timelineClips: [],
        timelineTransitions: [],
        mediaPool: [],
        selectedClipIds: [],
        selectedTrackIds: [],
    };
    
    return {
        past: [],
        present: initialProjectState,
        future: [],
        grouping: false,
    };
  });
  
  const [history, dispatch] = useReducer(historyReducer, initialState);
  const { present: projectState, past, future } = history;
  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const projectStateRef = useRef(projectState);
  projectStateRef.current = projectState;

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaveBeforeExitModalOpen, setIsSaveBeforeExitModalOpen] = useState(false);
  const [isSavingAndExiting, setIsSavingAndExiting] = useState(false);
  const isFirstMountRef = useRef(true);

  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    setHasUnsavedChanges(true);
  }, [projectState]);

  const hasUnsavedChangesRef = useRef(hasUnsavedChanges);
  hasUnsavedChangesRef.current = hasUnsavedChanges;

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const latestProjectState = projectStateRef.current;
      const hasContent = latestProjectState.timelineClips.length > 0 || latestProjectState.mediaPool.length > 0;
      if (hasContent || hasUnsavedChangesRef.current) {
        e.preventDefault();
        e.returnValue = 'Você tem alterações não salvas no projeto. Tem certeza que deseja sair?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const updateProject = useCallback((updater: (state: ProjectState) => ProjectState, isInteraction: boolean = false) => {
    if (isInteraction) {
        dispatch({
            type: ActionType.SET,
            payload: updater,
        });
    } else {
        // For non-interaction updates, ensure we commit the state before and after.
        dispatch({ type: ActionType.END_INTERACTION }); // End any previous interaction
        dispatch({ type: ActionType.SET, payload: updater });
    }
  }, []);

  const handleInteractionStart = useCallback(() => {
      dispatch({ type: ActionType.START_INTERACTION });
  }, []);

  const handleInteractionEnd = useCallback(() => {
      dispatch({ type: ActionType.END_INTERACTION });
  }, []);
  
  const undo = useCallback(() => dispatch({ type: ActionType.UNDO }), []);
  const redo = useCallback(() => dispatch({ type: ActionType.REDO }), []);

  const [masterCurrentTime, setMasterCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(1); // Canvas zoom
  
  const [previewQuality] = useState<PreviewQualityType>('auto');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [exportStatus, setExportStatus] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  
  const [isFileMenuOpen, setFileMenuOpen] = useState(false);
  const fileMenuRef = useRef<HTMLDivElement>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCanvasFullscreen, setIsCanvasFullscreen] = useState(false);

  const [isSavingProject, setIsSavingProject] = useState(false);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [projectStatus, setProjectStatus] = useState('');
  
  const [pixCopied, setPixCopied] = useState(false);

  const [isSpectrumModalOpen, setIsSpectrumModalOpen] = useState(false);
  const [isShapeModalOpen, setIsShapeModalOpen] = useState(false);
  const [isEmojiModalOpen, setIsEmojiModalOpen] = useState(false);
  const [isStickerModalOpen, setIsStickerModalOpen] = useState(false);
  const [isCaptionsModalOpen, setIsCaptionsModalOpen] = useState(false);

  // Transitions
  const [editingTransitionTarget, setEditingTransitionTarget] = useState<{ clipAId: string, clipBId: string } | null>(null);
  const [defaultTransition, setDefaultTransition] = useState<{ type: TransitionType; duration: number }>({ type: 'fade', duration: 1.0 });

  const [isSnappingEnabled, setIsSnappingEnabled] = useState(true);
  const [rangeSelectionAnchorTrackId, setRangeSelectionAnchorTrackId] = useState<string | null>(null);

  // Copy/Paste
  const [copiedClip, setCopiedClip] = useState<VideoClip | null>(null);
  const [clipboardStatus, setClipboardStatus] = useState('');

  // Pexels State
  const [pexelsSearchQuery, setPexelsSearchQuery] = useState('');
  const [pexelsSearchType, setPexelsSearchType] = useState<'photos' | 'videos'>('photos');
  const [pexelsPhotoResults, setPexelsPhotoResults] = useState<PexelsPhoto[]>([]);
  const [pexelsVideoResults, setPexelsVideoResults] = useState<PexelsVideo[]>([]);
  const [isSearchingPexels, setIsSearchingPexels] = useState(false);
  const [pexelsPage, setPexelsPage] = useState(1);
  const [pexelsHasMore, setPexelsHasMore] = useState(false);
  const [settingPexelsBgId, setSettingPexelsBgId] = useState<number | null>(null);

  // Captions State
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  const [captionStatus, setCaptionStatus] = useState('');
  const [captionSource, setCaptionSource] = useState('master');
  const [generatedCaptions, setGeneratedCaptions] = useState<{ start: number, end: number, text: string }[] | null>(null);
  const [selectedCaptionStyleId, setSelectedCaptionStyleId] = useState<string>('tiktok-viral-yellow');
  const transcriptionWorkerRef = useRef<Worker | null>(null);

  const [captionModel, setCaptionModel] = useState<'Xenova/whisper-tiny' | 'Xenova/whisper-base' | 'Xenova/whisper-small'>('Xenova/whisper-base');
  const [captionLanguage, setCaptionLanguage] = useState<string>('portuguese');

  const [captionDensityMode, setCaptionDensityMode] = useState<'shorts' | 'balanced' | 'long'>('balanced');
  const [captionVerticalPosition, setCaptionVerticalPosition] = useState<'bottom' | 'center' | 'top'>('bottom');
  const [captionAnimationIn, setCaptionAnimationIn] = useState<string>('none');
  const [captionSyncOffsetMs, setCaptionSyncOffsetMs] = useState<number>(0);
  const rawWordChunksRef = useRef<any[] | null>(null);
  const lastAudioDataRef = useRef<Float32Array | null>(null);

  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');

  const cleanCaptionText = useCallback((text: string): string => {
    let clean = (text || "").trim();
    if (!clean) return "";

    // 1. Remove bracketed/parenthetical sound descriptions like [Música], (risos), [aplausos], etc.
    clean = clean.replace(/\[.*?\]|\(.*?\)/g, "").trim();

    // 2. Remove standalone Whisper sound tags
    clean = clean.replace(/^(música|music|som ambiente|risos|aplausos|inaudível|silêncio)$/gi, "").trim();

    // 3. Normalize multiple punctuation marks
    clean = clean.replace(/\.{2,}/g, '.').replace(/\?{2,}/g, '?').replace(/!{2,}/g, '!');

    // 4. Stutter cleanup: eliminate immediate duplicate stutter words (e.g. "o o cara", "de de"),
    // but preserve natural Portuguese repetitions (e.g. "já já", "não não", "bem bem", "muito muito")
    const words = clean.split(/\s+/).filter(Boolean);
    const uniqueWords: string[] = [];
    const allowedRepetitions = new Set(['já', 'não', 'bem', 'muito', 'pouco', 'sim', 'bora', 'olha']);

    for (let i = 0; i < words.length; i++) {
      const current = words[i];
      const next = words[i + 1];
      if (next) {
        const curClean = current.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
        const nextClean = next.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
        if (curClean && curClean === nextClean && !allowedRepetitions.has(curClean)) {
          if (/[.,!?;:]$/.test(next) && !/[.,!?;:]$/.test(current)) {
            uniqueWords.push(current + next.slice(-1));
            i++;
            continue;
          }
          continue; // skip duplicate stutter
        }
      }
      uniqueWords.push(current);
    }
    clean = uniqueWords.join(" ");

    // 5. Common informal Portuguese abbreviations to clear legible text
    const commonCorrections: [RegExp, string][] = [
      [/\bneh\b/gi, "né"],
      [/\bne\b/gi, "né"],
      [/\btah\b/gi, "tá"],
      [/\bvc\b/gi, "você"],
      [/\bvcs\b/gi, "vocês"],
      [/\bnd\b/gi, "nada"],
      [/\btb\b/gi, "também"],
      [/\btbm\b/gi, "também"],
      [/\bpq\b/gi, "porque"],
      [/\bmt\b/gi, "muito"],
      [/\bmto\b/gi, "muito"],
      [/\bgte\b/gi, "gente"],
      [/\btd\b/gi, "tudo"],
      [/\btds\b/gi, "todos"],
      [/\bñ\b/gi, "não"],
      [/\bnao\b/gi, "não"],
      [/\bvoce\b/gi, "você"],
      [/\bvoces\b/gi, "vocês"],
      [/\bja\b/gi, "já"],
      [/\bate\b/gi, "até"],
      [/\bso\b/gi, "só"],
      [/\beu\s+acho\s+q\b/gi, "eu acho que"],
    ];

    commonCorrections.forEach(([regex, replacement]) => {
      clean = clean.replace(regex, replacement);
    });

    // 6. Fix spaces around punctuation
    clean = clean.replace(/\s+([.,!?;:])/g, '$1');
    clean = clean.replace(/([.,!?;:])([A-Za-zÀ-ÿ])/g, '$1 $2');

    // 7. Capitalize first letter
    if (clean.length > 0) {
      clean = clean.charAt(0).toUpperCase() + clean.slice(1);
    }

    clean = clean.replace(/\s+/g, ' ').trim();
    return clean;
  }, []);

  const sanitizeCaptionTimestamps = useCallback((captions: { start: number; end: number; text: string }[]) => {
    if (!captions || captions.length === 0) return [];

    const valid = captions.filter(c => c && c.text && c.text.trim().length > 0);
    if (valid.length === 0) return [];

    const sorted = [...valid].sort((a, b) => a.start - b.start);
    const sanitized: { start: number; end: number; text: string }[] = [];

    for (let i = 0; i < sorted.length; i++) {
      let { start, end, text } = sorted[i];
      text = text.trim();
      if (!text) continue;

      if (isNaN(start) || start < 0) start = 0;
      if (isNaN(end) || end <= start) {
        end = start + Math.max(0.3, Math.min(2.5, text.length * 0.055));
      }

      // Check distance to next caption
      const nextCaption = sorted[i + 1];
      const maxAllowedEnd = nextCaption ? Math.max(start + 0.25, nextCaption.start - 0.03) : start + 6.0;

      // Natural readability: minimum 0.35s display, without artificially extending across speech silences
      const naturalMinDuration = Math.max(0.35, Math.min(1.8, text.length * 0.055));
      if (end - start < naturalMinDuration && start + naturalMinDuration <= maxAllowedEnd) {
        end = Math.min(maxAllowedEnd, start + naturalMinDuration);
      }

      if (sanitized.length > 0) {
        const prev = sanitized[sanitized.length - 1];

        // Deduplicate identical repetitive phrases (Whisper repetition artifact)
        const prevNormalized = prev.text.toLowerCase().replace(/[^\w\d]/g, '');
        const currNormalized = text.toLowerCase().replace(/[^\w\d]/g, '');
        if (prevNormalized.length > 2 && prevNormalized === currNormalized && Math.abs(start - prev.start) < 2.0) {
          prev.end = Math.max(prev.end, end);
          continue;
        }

        // True acoustic alignment: clamp previous caption's end so it doesn't overlap current start
        if (prev.end > start) {
          prev.end = Math.max(prev.start + 0.20, start - 0.02);
          if (prev.end <= prev.start) {
            prev.end = prev.start + 0.20;
          }
        }
      }

      // Bound maximum subtitle duration to avoid runaway clips
      if (end - start > 7.0) {
        end = start + 7.0;
      }

      sanitized.push({
        start: Math.round(start * 100) / 100,
        end: Math.round(end * 100) / 100,
        text
      });
    }

    return sanitized;
  }, []);

  const rechunkWordChunks = useCallback((chunks: any[], mode: 'shorts' | 'balanced' | 'long') => {
    if (!chunks || !Array.isArray(chunks) || chunks.length === 0) return [];

    let maxWords = 3;
    let maxChars = 24;
    let maxPause = 0.42;
    let naturalBreakPause = 0.28;

    if (mode === 'balanced') {
      maxWords = 6;
      maxChars = 44;
      maxPause = 0.55;
      naturalBreakPause = 0.36;
    } else if (mode === 'long') {
      maxWords = 12;
      maxChars = 75;
      maxPause = 0.85;
      naturalBreakPause = 0.50;
    }

    const finalCaptions: { start: number; end: number; text: string }[] = [];
    let currentWords: { word: string; start: number; end: number }[] = [];

    const flushGroup = () => {
      if (currentWords.length === 0) return;
      const first = currentWords[0];
      const last = currentWords[currentWords.length - 1];
      const combinedText = cleanCaptionText(currentWords.map(w => w.word).join(' '));
      if (combinedText) {
        // Tight acoustic boundary: give 30ms release padding so trailing consonant is natural, but never hang
        const computedEnd = Math.max(first.start + 0.28, last.end + 0.03);
        finalCaptions.push({
          start: Math.round(first.start * 100) / 100,
          end: Math.round(computedEnd * 100) / 100,
          text: combinedText,
        });
      }
      currentWords = [];
    };

    const isDanglingWord = (w: string) => {
      const cleanW = w.toLowerCase().replace(/[^\wÀ-ÿ]/g, '');
      return /^(de|do|da|dos|das|em|no|na|nos|nas|para|pra|pro|pras|pros|com|por|que|se|o|a|os|as|um|uma|uns|umas|meu|minha|seu|sua|ao|aos|à|às|e|ou|mas)$/i.test(cleanW);
    };

    chunks.forEach((wordChunk: any) => {
      const rawText = (wordChunk.text || "").trim();
      if (!rawText) return;
      if (/^(\[|\().*?(\]|\))$/.test(rawText)) return; // Ignore sound descriptions like [Música]

      let start = (wordChunk.timestamp && wordChunk.timestamp[0] !== null && wordChunk.timestamp[0] !== undefined)
        ? Number(wordChunk.timestamp[0])
        : 0;
      let end = (wordChunk.timestamp && wordChunk.timestamp[1] !== null && wordChunk.timestamp[1] !== undefined)
        ? Number(wordChunk.timestamp[1])
        : start + Math.max(0.18, rawText.length * 0.06);

      if (isNaN(start) || start < 0) start = 0;
      if (isNaN(end) || end <= start) {
        end = start + 0.22;
      }

      if (currentWords.length === 0) {
        currentWords.push({ word: rawText, start, end });
        return;
      }

      const prev = currentWords[currentWords.length - 1];
      const pauseDuration = start - prev.end;
      const wordCount = currentWords.length;
      const currentChars = currentWords.reduce((acc, w) => acc + w.word.length, 0) + (wordCount - 1);
      const nextChars = currentChars + 1 + rawText.length;

      const isSentenceEnd = /[.?!]$/.test(prev.word) && wordCount >= 2;
      const isLongPause = pauseDuration > maxPause;
      const isNaturalBreak = pauseDuration > naturalBreakPause && currentChars > 12;
      const isTooLong = nextChars > maxChars;
      const tooManyWords = wordCount >= maxWords;

      // Don't cut off right after a dangling preposition/article/connector unless it's way too long or pause is significant
      const dangling = isDanglingWord(prev.word);
      const allowBreak = (!dangling || nextChars > maxChars * 1.3 || wordCount >= maxWords + 2) || (pauseDuration > maxPause * 0.9);

      if ((isSentenceEnd || isLongPause || isNaturalBreak || isTooLong || tooManyWords) && allowBreak) {
        flushGroup();
      }

      currentWords.push({ word: rawText, start, end });
    });

    // If leftover words has only 1 short word and we have previous captions, attach it if gap is small
    if (currentWords.length === 1 && finalCaptions.length > 0) {
      const loneWord = currentWords[0];
      const lastGroup = finalCaptions[finalCaptions.length - 1];
      const gap = loneWord.start - lastGroup.end;
      if (gap < 0.35 && lastGroup.text.length + 1 + loneWord.word.length <= maxChars * 1.3) {
        lastGroup.text = cleanCaptionText(lastGroup.text + ' ' + loneWord.word);
        lastGroup.end = Math.max(lastGroup.end, loneWord.end + 0.03);
        currentWords = [];
      }
    }

    flushGroup();

    return sanitizeCaptionTimestamps(finalCaptions);
  }, [cleanCaptionText, sanitizeCaptionTimestamps]);

  const handleDensityChange = useCallback((newMode: 'shorts' | 'balanced' | 'long') => {
    setCaptionDensityMode(newMode);
    if (rawWordChunksRef.current && rawWordChunksRef.current.length > 0) {
      const rechunked = rechunkWordChunks(rawWordChunksRef.current, newMode);
      if (rechunked.length > 0) {
        setGeneratedCaptions(rechunked);
        const modeLabel = newMode === 'shorts' ? 'Divertido (1-3 palavras)' : newMode === 'balanced' ? 'Equilibrado (4-6 palavras)' : 'Frases Longas';
        setCaptionStatus(`✨ Legendas reagrupadas no formato ${modeLabel}! (${rechunked.length} trechos)`);
      }
    }
  }, [rechunkWordChunks]);

  const handleNudgeSync = useCallback((deltaMs: number) => {
    const deltaSec = deltaMs / 1000;
    setCaptionSyncOffsetMs(prev => prev + deltaMs);
    setGeneratedCaptions(prev => {
      if (!prev) return null;
      return prev.map(c => ({
        ...c,
        start: Math.max(0, Math.round((c.start + deltaSec) * 100) / 100),
        end: Math.max(0.15, Math.round((c.end + deltaSec) * 100) / 100),
      }));
    });
    if (rawWordChunksRef.current) {
      rawWordChunksRef.current = rawWordChunksRef.current.map(chunk => ({
        ...chunk,
        timestamp: [
          Math.max(0, Math.round(((chunk.timestamp?.[0] ?? 0) + deltaSec) * 1000) / 1000),
          Math.max(0.1, Math.round(((chunk.timestamp?.[1] ?? 0) + deltaSec) * 1000) / 1000),
        ]
      }));
    }
    const direction = deltaMs < 0 ? `Adiantadas em ${Math.abs(deltaMs)}ms` : `Atrasadas em ${deltaMs}ms`;
    setCaptionStatus(`⏱️ Legendas ${direction}. Calibração total: ${captionSyncOffsetMs + deltaMs > 0 ? '+' : ''}${captionSyncOffsetMs + deltaMs}ms`);
  }, [captionSyncOffsetMs]);

  const handleResetSync = useCallback(() => {
    if (captionSyncOffsetMs === 0) return;
    const deltaSec = -captionSyncOffsetMs / 1000;
    setCaptionSyncOffsetMs(0);
    setGeneratedCaptions(prev => {
      if (!prev) return null;
      return prev.map(c => ({
        ...c,
        start: Math.max(0, Math.round((c.start + deltaSec) * 100) / 100),
        end: Math.max(0.15, Math.round((c.end + deltaSec) * 100) / 100),
      }));
    });
    if (rawWordChunksRef.current) {
      rawWordChunksRef.current = rawWordChunksRef.current.map(chunk => ({
        ...chunk,
        timestamp: [
          Math.max(0, Math.round(((chunk.timestamp?.[0] ?? 0) + deltaSec) * 1000) / 1000),
          Math.max(0.1, Math.round(((chunk.timestamp?.[1] ?? 0) + deltaSec) * 1000) / 1000),
        ]
      }));
    }
    setCaptionStatus(`⏱️ Calibração temporal redefinida para 0ms.`);
  }, [captionSyncOffsetMs]);

  const handleRealignWithAudioEnergy = useCallback(() => {
    if (!lastAudioDataRef.current || !rawWordChunksRef.current || rawWordChunksRef.current.length === 0) {
      setCaptionStatus("Áudio bruto não disponível para calibração acústica.");
      return;
    }
    try {
      const realigned = refineWordTimestampsWithAudioEnergy(rawWordChunksRef.current, lastAudioDataRef.current, 16000);
      rawWordChunksRef.current = realigned;
      const rechunked = rechunkWordChunks(realigned, captionDensityMode);
      setGeneratedCaptions(rechunked);
      setCaptionSyncOffsetMs(0);
      setCaptionStatus(`⚡ Auto-sincronização por onda sonora aplicada! Legendas cravadas na fala.`);
    } catch (err) {
      console.error("Falha no alinhamento acústico:", err);
      setCaptionStatus("Não foi possível alinhar pela onda sonora.");
    }
  }, [captionDensityMode, rechunkWordChunks]);

  const handleExportSRT = useCallback(() => {
    if (!generatedCaptions || generatedCaptions.length === 0) return;

    const formatSRTTime = (seconds: number) => {
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      const ms = Math.floor((seconds % 1) * 1000);
      const pad = (num: number, size = 2) => String(num).padStart(size, '0');
      const padMs = (num: number) => String(num).padStart(3, '0');
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${padMs(ms)}`;
    };

    let srtContent = '';
    generatedCaptions.forEach((cap, idx) => {
      srtContent += `${idx + 1}\n`;
      srtContent += `${formatSRTTime(cap.start)} --> ${formatSRTTime(cap.end)}\n`;
      srtContent += `${cap.text.trim()}\n\n`;
    });

    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `legendas-vee-${new Date().toISOString().slice(0, 10)}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setCaptionStatus(`📥 Arquivo .SRT baixado com sucesso!`);
  }, [generatedCaptions]);

  const handleImportSRTFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;

      const parseTime = (timeStr: string) => {
        const parts = timeStr.trim().replace(',', '.').split(':');
        if (parts.length < 3) return 0;
        const hrs = parseFloat(parts[0]) || 0;
        const mins = parseFloat(parts[1]) || 0;
        const secs = parseFloat(parts[2]) || 0;
        return hrs * 3600 + mins * 60 + secs;
      };

      const blocks = content.trim().split(/\n\s*\n/);
      const result: { start: number; end: number; text: string }[] = [];
      const fakeWordChunks: any[] = [];

      for (const block of blocks) {
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) continue;

        let timeLineIdx = 0;
        if (/^\d+$/.test(lines[0])) {
          timeLineIdx = 1;
        }

        if (lines[timeLineIdx] && lines[timeLineIdx].includes('-->')) {
          const timeParts = lines[timeLineIdx].split('-->');
          const start = parseTime(timeParts[0]);
          const end = parseTime(timeParts[1]);
          const textLines = lines.slice(timeLineIdx + 1);
          const text = textLines.join(' ').trim();

          if (text && end > start) {
            result.push({ start, end, text });
            const words = text.split(/\s+/);
            const wordDur = (end - start) / Math.max(1, words.length);
            words.forEach((w, i) => {
              fakeWordChunks.push({
                text: w,
                timestamp: [start + i * wordDur, start + (i + 1) * wordDur]
              });
            });
          }
        }
      }

      if (result.length > 0) {
        const sanitized = sanitizeCaptionTimestamps(result);
        rawWordChunksRef.current = fakeWordChunks;
        setGeneratedCaptions(sanitized);
        setCaptionStatus(`✨ ${sanitized.length} legendas carregadas com sucesso do arquivo ${file.name}!`);
      } else {
        setCaptionStatus(`⚠️ Não foi possível extrair legendas do arquivo selecionado.`);
      }
    };
    reader.readAsText(file);
  }, []);

  const handleBulkReplace = useCallback(() => {
    if (!findText) return;
    setGeneratedCaptions(prev => {
      if (!prev) return null;
      return prev.map(caption => {
        const escaped = findText.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(escaped, 'gi');
        return {
          ...caption,
          text: caption.text.replace(regex, replaceText)
        };
      });
    });
    setCaptionStatus(`Substituições concluídas de "${findText}" para "${replaceText}".`);
  }, [findText, replaceText]);

  const handleAutoCorrectCaptions = useCallback(() => {
    setGeneratedCaptions(prev => {
      if (!prev) return null;
      return prev.map(caption => ({ ...caption, text: cleanCaptionText(caption.text) }));
    });
    setCaptionStatus("✨ Legendas corrigidas, otimizadas e desduplicadas com sucesso!");
  }, [cleanCaptionText]);

  const handleUpdateCaptionText = useCallback((index: number, text: string) => {
    setGeneratedCaptions(prev => {
      if (!prev) return null;
      const copy = [...prev];
      copy[index] = { ...copy[index], text };
      return copy;
    });
  }, []);

  const handleUpdateCaptionStart = useCallback((index: number, start: number) => {
    setGeneratedCaptions(prev => {
      if (!prev) return null;
      const copy = [...prev];
      copy[index] = { ...copy[index], start };
      return copy;
    });
  }, []);

  const handleUpdateCaptionEnd = useCallback((index: number, end: number) => {
    setGeneratedCaptions(prev => {
      if (!prev) return null;
      const copy = [...prev];
      copy[index] = { ...copy[index], end };
      return copy;
    });
  }, []);

  const handleDeleteCaptionLine = useCallback((index: number) => {
    setGeneratedCaptions(prev => {
      if (!prev) return null;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleMergeCaptionWithNext = useCallback((index: number) => {
    setGeneratedCaptions(prev => {
      if (!prev || index >= prev.length - 1) return prev;
      const copy = [...prev];
      const current = copy[index];
      const next = copy[index + 1];
      copy[index] = {
        ...current,
        text: `${current.text} ${next.text}`,
        end: next.end
      };
      copy.splice(index + 1, 1);
      return copy;
    });
  }, []);

  const handleAddCaptionLineAfter = useCallback((index: number) => {
    setGeneratedCaptions(prev => {
      if (!prev) return null;
      const copy = [...prev];
      const current = copy[index];
      const newStart = current ? current.end + 0.1 : 0;
      const newEnd = current ? current.end + 2.1 : 2;
      const newCaption = { start: newStart, end: newEnd, text: '' };
      copy.splice(index + 1, 0, newCaption);
      return copy;
    });
  }, []);

  // -- Refs and derived state --
  const canvasRef = useRef<CanvasHandle>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const timeDisplayRef = useRef<HTMLSpanElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  const decodedAudioBuffersRef = useRef<Map<string, AudioBuffer>>(new Map());
  const reversedAudioBuffersRef = useRef<Map<string, AudioBuffer>>(new Map());
  const animationFrameIdRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>(0);
  const playbackTimeRef = useRef<number>(0);
  const playbackAudioStartContextTimeRef = useRef<number>(0);
  const playbackAudioStartTimeRef = useRef<number>(0);
  const playingVideosRef = useRef<Set<string>>(new Set());
  const freqDataBufferRef = useRef<Uint8Array | null>(null);
  const timeDomainDataBufferRef = useRef<Uint8Array | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const masterAnalyserRef = useRef<AnalyserNode | null>(null);
  const activeAudioSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  
  const contentDuration = useMemo(() => {
      const { timelineClips } = projectState;
      if (timelineClips.length === 0) return 0;
      // FIX: Correctly calculates the latest end time of all clips to determine the actual content duration for export, preventing blank footage at the end.
      return timelineClips.reduce((maxDuration, clip) => {
          const clipEnd = clip.timelineStart + (clip.endTime - clip.startTime) / (clip.speed || 1);
          return Math.max(maxDuration, clipEnd);
      }, 0);
  }, [projectState.timelineClips]);
  
  const masterDuration = useMemo(() => {
      // Provide ample working space on the timeline beyond the last clip.
      // The ruler extends for at least 5 minutes, or 60 seconds past the last clip.
      // This does not affect the final export duration, which is based on contentDuration.
      return Math.max(300, contentDuration + 60);
  }, [contentDuration]);
  
  const editingTransition = useMemo(() => {
      if (!editingTransitionTarget) return null;
      return projectState.timelineTransitions.find(t => t.clipAId === editingTransitionTarget.clipAId && t.clipBId === editingTransitionTarget.clipBId) || null;
  }, [editingTransitionTarget, projectState.timelineTransitions]);
  
  const captionClips = useMemo(() => projectState.timelineClips.filter(c => c.id.startsWith('caption-clip-')), [projectState.timelineClips]);
  
  const hasAudioClip = useMemo(() =>
    projectState.mediaPool.some(c =>
        c.src && (
            c.type === 'audio' ||
            (c.type === 'video' && decodedAudioBuffersRef.current.has(c.src))
        )
    ),
  [projectState.mediaPool]);
  
  const audioClipsOnTimeline = useMemo(() =>
      projectState.timelineClips.filter(c =>
          c.src && c.fileName && (
              c.type === 'audio' ||
              (c.type === 'video' && decodedAudioBuffersRef.current.has(c.src))
          )
      ),
  [projectState.timelineClips, projectState.mediaPool]);

  const findClipForTimestamp = useCallback((timestamp: number, trackType: 'video' | 'audio', opts?: { ignoreMute?: boolean }): { clip: VideoClip | null, timeInClip: number } => {
    const { tracks, timelineClips } = projectState;
    const clips = timelineClips.filter(clip => {
        const track = tracks.find(t => t.id === clip.trackId);
        if (!track || (trackType === 'audio' && !opts?.ignoreMute && track.isMuted)) return false;
        
        const isCorrectType = trackType === 'audio' ? (clip.type === 'audio' || clip.type === 'video') : (clip.type === 'video');
        if (!isCorrectType) return false;
        
        const clipEnd = clip.timelineStart + (clip.endTime - clip.startTime) / (clip.speed || 1);
        return timestamp >= clip.timelineStart && timestamp < clipEnd;
    });
    
    // Prioritize clips on higher tracks (lower index in `tracks` array)
    const sortedClips = clips.sort((a,b) => tracks.findIndex(t => t.id === a.trackId) - tracks.findIndex(t => t.id === b.trackId));
    const finalClip = sortedClips[0] || null;

    if (!finalClip) return { clip: null, timeInClip: 0 };
    
    return {
        clip: finalClip,
        timeInClip: (timestamp - finalClip.timelineStart) * (finalClip.speed || 1),
    };
  }, [projectState]);

  // -- Layout state --
  const isMobile = useIsMobile();
  const [leftPanelWidth, setLeftPanelWidth] = useState(getInitialPanelWidth);
  const [rightPanelWidth, setRightPanelWidth] = useState(getInitialPanelWidth);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  const [timelineHeight, setTimelineHeight] = useState(getInitialTimelineHeight);
  const timelineHeightBeforeFullscreen = useRef<number | null>(null);
  const [timelineZoom, setTimelineZoom] = useState(() => getInitialTimelineZoom(30)); // Initialize with a 30s view for better UX
  const [isResizing, setIsResizing] = useState(false);
  const [fitScale, setFitScale] = useState(1);
  
  // This effect ensures the canvas always fits its container, both on initial load
  // and when the window or internal layout is resized. This fixes issues with
  // incorrect initial sizing, especially for vertical formats like TikTok.
  useLayoutEffect(() => {
    const wrapperEl = canvasWrapperRef.current;
    if (!wrapperEl) return;

    const calculateScale = () => {
      const { width: containerW, height: containerH } = wrapperEl.getBoundingClientRect();
      const { width: contentW, height: contentH } = FORMAT_DIMENSIONS[format];
      
      if (containerW <= 0 || containerH <= 0) return;

      const padding = 40;
      const scale = Math.min(
          (containerW - padding) / contentW, 
          (containerH - padding) / contentH, 
          1
      );
      setFitScale(Math.max(0.1, scale));
    };

    // Use ResizeObserver to reliably calculate scale when the container's size changes.
    const observer = new ResizeObserver(calculateScale);
    observer.observe(wrapperEl);

    // Initial calculation.
    calculateScale();
    
    return () => observer.disconnect();
  }, [format]);

  const createPanelDragHandler = (setter: React.Dispatch<React.SetStateAction<number>>, side: 'left' | 'right') => (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const startWidth = side === 'left' ? leftPanelWidth : rightPanelWidth;
    
    const handleDrag = (moveEvent: MouseEvent | TouchEvent) => {
        const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
        const deltaX = currentX - startX;
        const newWidth = startWidth + (side === 'left' ? deltaX : -deltaX);
        setter(Math.max(320, Math.min(800, newWidth)));
    };
    const stopDrag = () => {
        setIsResizing(false);
        window.removeEventListener('mousemove', handleDrag);
        window.removeEventListener('touchmove', handleDrag);
        window.removeEventListener('mouseup', stopDrag);
        window.removeEventListener('touchend', stopDrag);
    };
    
    window.addEventListener('mousemove', handleDrag);
    window.addEventListener('touchmove', handleDrag);
    window.addEventListener('mouseup', stopDrag);
    window.addEventListener('touchend', stopDrag);
  };

  const toggleLeftPanel = () => setIsLeftPanelCollapsed(!isLeftPanelCollapsed);
  const toggleRightPanel = () => setIsRightPanelCollapsed(!isRightPanelCollapsed);

  const handleLeftPanelResize = createPanelDragHandler(setLeftPanelWidth, 'left');
  const handleRightPanelResize = createPanelDragHandler(setRightPanelWidth, 'right');
  const handleTimelineResize = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      setIsResizing(true);
      const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const startHeight = timelineHeight;

      const handleDrag = (moveEvent: MouseEvent | TouchEvent) => {
          const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
          const deltaY = currentY - startY;
          setTimelineHeight(Math.max(120, Math.min(500, startHeight - deltaY)));
      };
      const stopDrag = () => {
          setIsResizing(false);
          window.removeEventListener('mousemove', handleDrag);
          window.removeEventListener('touchmove', handleDrag);
          window.removeEventListener('mouseup', stopDrag);
          window.removeEventListener('touchend', stopDrag);
      };

      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('touchmove', handleDrag);
      window.addEventListener('mouseup', stopDrag);
      window.addEventListener('touchend', stopDrag);
  };

  useEffect(() => {
    if (isMobile) return;

    if (isFullscreen) {
        if (timelineHeightBeforeFullscreen.current === null) {
            timelineHeightBeforeFullscreen.current = timelineHeight;
        }

        const headerHeight = 80;
        const timelineControlsHeight = 48;
        const timelineRulerHeight = 24;
        const trackHeight = 40;
        const scrollbarPadding = 16;
        const minCanvasContainerHeight = 250;
        const splitterHeight = 4;
        
        const requiredContentHeight = timelineRulerHeight + (projectState.tracks.length * trackHeight) + scrollbarPadding;
        const idealTimelineHeight = timelineControlsHeight + requiredContentHeight;

        const availableHeight = window.innerHeight - headerHeight - splitterHeight;
        const maxTimelineHeight = availableHeight - minCanvasContainerHeight;

        setTimelineHeight(Math.max(120, Math.min(idealTimelineHeight, maxTimelineHeight)));
    } else {
        if (timelineHeightBeforeFullscreen.current !== null) {
            setTimelineHeight(timelineHeightBeforeFullscreen.current);
            timelineHeightBeforeFullscreen.current = null;
        }
    }
  }, [isFullscreen, projectState.tracks.length, isMobile]);


  // -- Core Project Manipulation --
  const handleUpdateClip = useCallback((id: string, props: Partial<VideoClip>) => {
    updateProject(state => ({ ...state, timelineClips: state.timelineClips.map(c => c.id === id ? { ...c, ...props } : c) }), true);
  }, [updateProject]);
  
  const handleUpdateMultipleClips = useCallback((updates: ClipUpdate[]) => {
      updateProject(state => {
          const newClips = state.timelineClips.map(clip => {
              const update = updates.find(u => u.id === clip.id);
              return update ? { ...clip, ...update.props } : clip;
          });
          return { ...state, timelineClips: newClips };
      }, true);
  }, [updateProject]);

  const handleUpdateScene = (props: Partial<Scene>) => {
      updateProject(state => ({ ...state, scene: { ...state.scene!, ...props }}));
  };
  
  const handleSelectClip = useCallback((clipId: string | null, metaKey: boolean, shiftKey: boolean) => {
    setRangeSelectionAnchorTrackId(null);
    updateProject(state => {
        let newSelection = [...state.selectedClipIds];

        if (clipId === null) {
            newSelection = [];
        } else if (shiftKey) {
            // Complex range selection is not implemented, shift acts like meta for now
            if (newSelection.includes(clipId)) {
                newSelection = newSelection.filter(id => id !== clipId);
            } else {
                newSelection.push(clipId);
            }
        } else if (metaKey) {
            if (newSelection.includes(clipId)) {
                newSelection = newSelection.filter(id => id !== clipId);
            } else {
                newSelection.push(clipId);
            }
        } else {
            newSelection = [clipId];
        }

        return { ...state, selectedClipIds: newSelection, selectedTrackIds: [] };
    });
  }, [updateProject]);

  const handleTrackSelection = useCallback((trackId: string, metaKey: boolean, shiftKey: boolean) => {
    const { tracks, selectedTrackIds } = projectState;
    
    const clickedIndex = tracks.findIndex(t => t.id === trackId);
    if (clickedIndex === -1) return;

    let newSelection: string[];
    let newAnchor: string | null = rangeSelectionAnchorTrackId;

    if (shiftKey && newAnchor) {
        const anchorIndex = tracks.findIndex(t => t.id === newAnchor);
        if (anchorIndex !== -1) {
            const start = Math.min(anchorIndex, clickedIndex);
            const end = Math.max(anchorIndex, clickedIndex);
            newSelection = tracks.slice(start, end + 1).map(t => t.id);
        } else {
            // Anchor not found, treat as single click
            newSelection = [trackId];
            newAnchor = trackId;
        }
    } else if (metaKey) {
        if (selectedTrackIds.includes(trackId)) {
            newSelection = selectedTrackIds.filter(id => id !== trackId);
            // If the anchor was removed, the new anchor becomes the last selected item, or null.
            if (newAnchor === trackId) {
                // FIX: Correctly update the newAnchor instead of reassigning newSelection, which caused a type error.
                newAnchor = newSelection.length > 0 ? newSelection[newSelection.length - 1] : null;
            }
        } else {
            newSelection = [...selectedTrackIds, trackId];
            newAnchor = trackId; // The newly added track is the anchor.
        }
    } else {
        newSelection = [trackId];
        newAnchor = trackId;
    }

    setRangeSelectionAnchorTrackId(newAnchor);
    updateProject(state => ({ ...state, selectedTrackIds: newSelection, selectedClipIds: [] }));
  }, [projectState, rangeSelectionAnchorTrackId, updateProject]);

  const handleSelectAllClipsOnTrack = useCallback((trackId: string) => {
    updateProject(state => {
        const { timelineClips, selectedClipIds } = state;

        const captionClipIdsOnTrack = timelineClips
            .filter(clip => clip.trackId === trackId && clip.id.startsWith('caption-clip-'))
            .map(clip => clip.id);

        if (captionClipIdsOnTrack.length === 0) {
            return state; // No captions on this track
        }
        
        const selectedCaptionClipsOnTrack = captionClipIdsOnTrack.filter(id => selectedClipIds.includes(id));
        const areAllSelected = selectedCaptionClipsOnTrack.length === captionClipIdsOnTrack.length && captionClipIdsOnTrack.length > 0;

        let newSelectedClipIds: string[];

        if (areAllSelected) {
            // Deselect all captions on this track
            const idsToDeselect = new Set(captionClipIdsOnTrack);
            newSelectedClipIds = selectedClipIds.filter(id => !idsToDeselect.has(id));
        } else {
            // Select all captions on this track, adding to the current selection
            const selectionSet = new Set([...selectedClipIds, ...captionClipIdsOnTrack]);
            newSelectedClipIds = Array.from(selectionSet);
        }

        return {
            ...state,
            selectedClipIds: newSelectedClipIds,
            selectedTrackIds: [] // Deselect tracks when selecting clips
        };
    });
  }, [updateProject]);

  // -- Media Pool & File Handling --
  const processAndAddFile = async (file: File) => {
        const id = `pool-clip-${Date.now()}-${Math.random()}`;
        const src = URL.createObjectURL(file);
        let clip: Omit<MediaPoolClip, 'progress'> = { id, src, fileName: file.name, type: 'image', duration: 10 };
        
        const updateProgress = (progress: number) => {
            updateProject(state => ({
                ...state,
                mediaPool: state.mediaPool.map(c => c.id === id ? { ...c, progress } : c)
            }), true);
        };
        
        const completeProcessing = (finalProps: Partial<MediaPoolClip>) => {
             updateProject(state => ({
                ...state,
                mediaPool: state.mediaPool.map(c => c.id === id ? { ...(state.mediaPool.find(mp=>mp.id===id)!), ...finalProps, progress: undefined, error: undefined } : c)
            }));
        };

        const failProcessing = (error: string) => {
            updateProject(state => ({
                ...state,
                mediaPool: state.mediaPool.map(c => c.id === id ? { ...(state.mediaPool.find(mp=>mp.id===id)!), progress: undefined, error } : c)
            }));
            console.error(`Falha ao processar ${file.name}:`, error);
        };
        
        updateProject(state => ({
            ...state,
            mediaPool: [{ ...clip, progress: 0 }, ...state.mediaPool]
        }));

        try {
            if (file.type.startsWith('video/')) {
                clip.type = 'video';
                const video = document.createElement('video');
                video.preload = 'metadata';
                video.onloadedmetadata = async () => {
                    updateProgress(25);
                    clip = { ...clip, duration: video.duration, width: video.videoWidth, height: video.videoHeight };
                    
                    try {
                        if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                        const audioBuffer = await getAudioBufferFromFile(file, audioContextRef.current);
                        decodedAudioBuffersRef.current.set(src, audioBuffer);
                        updateProgress(66);
                        clip = { ...clip, waveform: await generateWaveformData(audioBuffer) };
                        updateProgress(100);
                        completeProcessing(clip);
                    } catch (audioError) {
                        console.warn(`Could not extract audio from ${file.name}. Proceeding without audio.`, audioError);
                        completeProcessing(clip); // Still add the video clip without audio
                    }
                };
                video.onerror = () => failProcessing('Falha ao carregar metadados do vídeo.');
                video.src = src;
            } else if (file.type.startsWith('audio/')) {
                clip.type = 'audio';
                try {
                    if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                    const audioBuffer = await getAudioBufferFromFile(file, audioContextRef.current);
                    decodedAudioBuffersRef.current.set(src, audioBuffer);
                    updateProgress(50);
                    clip = { ...clip, duration: audioBuffer.duration, waveform: await generateWaveformData(audioBuffer) };
                    updateProgress(100);
                    completeProcessing(clip);
                } catch (e: any) {
                    failProcessing(`Falha ao decodificar áudio: ${e.message}`);
                }
            } else if (file.type.startsWith('image/')) {
                clip.type = 'image';
                const img = new Image();
                img.onload = () => {
                    clip = { ...clip, width: img.width, height: img.height };
                    completeProcessing(clip);
                };
                img.onerror = () => failProcessing('Falha ao carregar imagem.');
                img.src = src;
            } else {
                failProcessing('Tipo de arquivo não suportado.');
            }
        } catch (e: any) {
            failProcessing(e.message || 'Erro desconhecido.');
        }
    };

    const handleAddMediaToPool = useCallback(async (files: FileList) => {
        const fileArray = Array.from(files);
        // Process files in parallel but with a slight delay between starts to avoid UI freezing
        await Promise.all(fileArray.map(async (file, index) => {
            // Stagger the start of each file processing slightly
            await new Promise(resolve => setTimeout(resolve, index * 100));
            return processAndAddFile(file);
        }));
    }, [processAndAddFile]);
    
    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            
            const id = `pool-clip-${Date.now()}-${Math.random()}`;
            const src = URL.createObjectURL(file);
            let clip: MediaPoolClip = { id, src, fileName: file.name, type: 'image', duration: 10, progress: 0 };
            
            dispatch({
                type: ActionType.SET,
                payload: (state: ProjectState) => ({
                    ...state,
                    mediaPool: [clip, ...state.mediaPool]
                })
            });
    
            try {
                const img = new Image();
                await new Promise<void>((resolve, reject) => {
                    img.onload = () => resolve();
                    img.onerror = () => reject(new Error('Falha ao carregar imagem.'));
                    img.src = src;
                });
    
                const finalClip: MediaPoolClip = { ...clip, width: img.width, height: img.height, progress: undefined };
                
                dispatch({
                    type: ActionType.SET,
                    payload: (state: ProjectState) => ({
                        ...state,
                        mediaPool: state.mediaPool.map(c => c.id === id ? finalClip : c)
                    })
                });
                
                callback(src);
            } catch (error) {
                console.error("Failed to process uploaded image:", error);
                const errorClip: MediaPoolClip = { ...clip, progress: undefined, error: 'Falha ao carregar.' };
                dispatch({
                    type: ActionType.SET,
                    payload: (state: ProjectState) => ({
                        ...state,
                        mediaPool: state.mediaPool.map(c => c.id === id ? errorClip : c)
                    })
                });
            }
        }
    }, [dispatch]);

    const findOrCreateTrack = useCallback((state: ProjectState, type: Track['type']): { newState: ProjectState, track: Track } => {
        let track = state.tracks.find(t => t.type === type);
        if (track) {
            return { newState: state, track };
        }
        
        const existingTracksOfType = state.tracks.filter(t => t.type === type);
        const newTrack: Track = {
            id: `${type}-track-${Date.now()}`,
            type: type,
            name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${existingTracksOfType.length + 1}`,
            isMuted: false,
            volume: 1
        };
        const newTracks = insertTrackInOrder(state.tracks, newTrack);
        return { newState: { ...state, tracks: newTracks }, track: newTrack };
    }, []);

    // -- Track & Clip Creation --
    const rippleInsertClips = useCallback((
        clipsToAdd: (Omit<VideoClip, 'id'> & { id?: string; trackId: string })[],
        currentState: ProjectState
    ): ProjectState => {
        let newTimelineClips = [...currentState.timelineClips];
        const sortedClipsToAdd = clipsToAdd.sort((a, b) => a.timelineStart - b.timelineStart);
    
        for (const clipData of sortedClipsToAdd) {
            const newClip: VideoClip = {
                id: clipData.id || `clip-${Date.now()}-${Math.random()}`,
                ...clipData
            } as VideoClip;
    
            const displayDuration = (newClip.endTime - newClip.startTime) / (newClip.speed || 1);
            const insertionTime = newClip.timelineStart;
            const newClipEnd = insertionTime + displayDuration;
    
            const clipsOnTrack = newTimelineClips
                .filter(c => c.trackId === newClip.trackId)
                .sort((a, b) => a.timelineStart - b.timelineStart);
    
            const anchorClip = clipsOnTrack.find(c => {
                const c_duration = (c.endTime - c.startTime) / (c.speed || 1);
                return c.timelineStart + c_duration > insertionTime && c.timelineStart < newClipEnd;
            });
    
            let pushAmount = 0;
            const clipIdsToPush = new Set<string>();
    
            if (anchorClip) {
                const firstPushPoint = Math.max(insertionTime, anchorClip.timelineStart);
                const calculatedPush = newClipEnd - firstPushPoint;

                if (calculatedPush > 0) {
                    pushAmount = calculatedPush;
                    const anchorIndex = clipsOnTrack.findIndex(c => c.id === anchorClip.id);
                    for (let i = anchorIndex; i < clipsOnTrack.length; i++) {
                        clipIdsToPush.add(clipsOnTrack[i].id);
                    }
                }
            }
            
            if (pushAmount > 0) {
                newTimelineClips = newTimelineClips.map(c => {
                    if (clipIdsToPush.has(c.id)) {
                        return { ...c, timelineStart: c.timelineStart + pushAmount };
                    }
                    return c;
                });
            }
            
            newTimelineClips.push(newClip);
        }
        
        return {
            ...currentState,
            timelineClips: newTimelineClips,
        };
    }, []);

    const handleAddTrack = useCallback((type: Track['type']) => {
        updateProject(state => {
            const existingTracksOfType = state.tracks.filter(t => t.type === type);
            const newTrack: Track = {
                id: `${type}-track-${Date.now()}`,
                type: type,
                name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${existingTracksOfType.length + 1}`,
                isMuted: false,
                volume: 1,
                preMuteVolume: 1,
            };
            const newTracks = insertTrackInOrder(state.tracks, newTrack);
            return { ...state, tracks: newTracks };
        });
    }, [updateProject]);
        
    const handleAddTextClip = useCallback(() => {
        updateProject(state => {
            let { newState, track } = findOrCreateTrack(state, 'text');
            const { width, height } = FORMAT_DIMENSIONS[format];
            const newClipData = {
                trackId: track.id,
                type: 'text' as VideoClipType,
                timelineStart: masterCurrentTime,
                startTime: 0, endTime: 10,
                x: width * 0.1, y: height * 0.75, width: width * 0.8, height: height * 0.15, rotation: 0,
                content: 'Seu texto aqui', fontFamily: 'Impact', fontSize: 40, fontWeight: 800, color: '#FFFFFF',
                textShadow: true, textShadowColor: 'rgba(0,0,0,0.8)', textShadowBlur: 10, textShadowOffsetX: 2, textShadowOffsetY: 2,
            };
            return rippleInsertClips([newClipData], newState);
        });
    }, [masterCurrentTime, format, updateProject, findOrCreateTrack, rippleInsertClips]);

    const handleAddStickerClip = useCallback((sticker: StickerItem, customAnimation?: string) => {
        updateProject(state => {
            let { newState, track } = findOrCreateTrack(state, 'image');
            const { width, height } = FORMAT_DIMENSIONS[format];
            
            const defaultW = Math.min(sticker.width || 300, width * 0.45);
            const aspect = (sticker.height && sticker.width) ? (sticker.height / sticker.width) : 1;
            const defaultH = defaultW * aspect;
            
            const newClipData = {
                trackId: track.id,
                type: 'image' as VideoClipType,
                src: sticker.src,
                fileName: `Sticker: ${sticker.name}`,
                timelineStart: masterCurrentTime,
                startTime: 0,
                endTime: 5,
                x: (width - defaultW) / 2,
                y: (height - defaultH) / 2,
                width: defaultW,
                height: defaultH,
                rotation: 0,
                opacity: 1,
                imageAnimationType: (customAnimation || sticker.defaultAnimation || 'zoom-bounce') as any,
                imageAnimationSpeed: 1,
                imageAnimationScale: 1.25,
            };
            const finalState = rippleInsertClips([newClipData], newState);
            const addedClipId = finalState.timelineClips[finalState.timelineClips.length - 1].id;
            setIsStickerModalOpen(false);
            return { ...finalState, selectedClipIds: [addedClipId] };
        });
    }, [masterCurrentTime, format, updateProject, findOrCreateTrack, rippleInsertClips]);

    const handleAddEmojiClip = useCallback((options: string | { emoji: string; fontSize?: number; animationIn?: string; animationLoop?: string }) => {
        const emojiStr = typeof options === 'string' ? options : options.emoji;
        const fontSize = typeof options === 'object' && options.fontSize ? options.fontSize : 150;
        const animIn = typeof options === 'object' && options.animationIn ? options.animationIn : 'pop-in-by-word';
        const animLoop = typeof options === 'object' && options.animationLoop ? options.animationLoop : 'none';

        updateProject(state => {
            let { newState, track } = findOrCreateTrack(state, 'emoji');
            const { width, height } = FORMAT_DIMENSIONS[format];
            const sizeOffset = Math.max(80, fontSize);
            const newClipData = {
                trackId: track.id,
                type: 'emoji' as VideoClipType,
                timelineStart: masterCurrentTime,
                startTime: 0, endTime: 5,
                x: width / 2 - sizeOffset / 2, y: height / 2 - sizeOffset / 2, width: sizeOffset, height: sizeOffset, rotation: 0,
                content: emojiStr, fontSize: fontSize, color: '#FFFFFF',
                animationIn: animIn as any,
                animationInDuration: 0.8,
                animationLoop: animLoop as any,
            };
            const finalState = rippleInsertClips([newClipData], newState);
            const addedClipId = finalState.timelineClips[finalState.timelineClips.length-1].id;
            setIsEmojiModalOpen(false);
            return {...finalState, selectedClipIds: [addedClipId]};
        });
    }, [masterCurrentTime, format, updateProject, findOrCreateTrack, rippleInsertClips]);

    const handleAddSpectrumClip = useCallback((style: SpectrumStyle) => {
        updateProject(state => {
            let { newState, track } = findOrCreateTrack(state, 'spectrum');
            const { width, height } = FORMAT_DIMENSIONS[format];

            // Calculate duration based on actual content, not ruler display length
            const currentContentDuration = state.timelineClips.reduce((maxDuration, clip) => {
                // Exclude existing spectrum clips from this calculation to avoid feedback loop
                if (clip.type === 'spectrum') return maxDuration;
                const clipEnd = clip.timelineStart + (clip.endTime - clip.startTime) / (clip.speed || 1);
                return Math.max(maxDuration, clipEnd);
            }, 0);

            let spectrumDuration = currentContentDuration;

            // If timeline is empty, use longest audio in media pool as a sensible default
            if (spectrumDuration === 0) {
                 const audioClipsInPool = state.mediaPool.filter(c => 
                    c.src && (
                        c.type === 'audio' ||
                        (c.type === 'video' && decodedAudioBuffersRef.current.has(c.src))
                    )
                 );
                 if (audioClipsInPool.length > 0) {
                    spectrumDuration = Math.max(...audioClipsInPool.map(c => c.duration));
                 } else {
                    spectrumDuration = 30; // Fallback if no audio uploaded yet (shouldn't happen)
                 }
            }
            
            const newClipData = {
                trackId: track.id,
                type: 'spectrum' as VideoClipType,
                timelineStart: masterCurrentTime,
                startTime: 0, 
                endTime: spectrumDuration, // Use the new calculated duration
                x: 0, y: 0, width, height, rotation: 0,
                spectrumStyle: style, spectrumColor: '#FFFFFF', spectrumColor2: '#8A2BE2', spectrumColor3: '#4f46e5', audioSource: 'master',
            };
            return rippleInsertClips([newClipData], newState);
        });
    }, [format, updateProject, findOrCreateTrack, rippleInsertClips, masterCurrentTime, decodedAudioBuffersRef]);

    const handleAddShapeClip = useCallback((shape: ShapeType) => {
        updateProject(state => {
            let { newState, track } = findOrCreateTrack(state, 'shape');
            const { width, height } = FORMAT_DIMENSIONS[format];
            const newClipData = {
                trackId: track.id,
                type: 'shape' as VideoClipType,
                shapeType: shape,
                timelineStart: masterCurrentTime,
                startTime: 0, endTime: 10,
                x: width / 2 - 100, y: height / 2 - 100, width: 200, height: 200, rotation: 0,
                fillColor: '#FFFFFF', strokeWidth: 0, strokeColor: '#000000', opacity: 1,
            };
            const finalState = rippleInsertClips([newClipData], newState);
            const addedClipId = finalState.timelineClips[finalState.timelineClips.length-1].id;
            setIsShapeModalOpen(false);
            return {...finalState, selectedClipIds: [addedClipId]};
        });
    }, [masterCurrentTime, format, updateProject, findOrCreateTrack, rippleInsertClips]);

    const handleAddClipToTrack = useCallback((poolClip: MediaPoolClip, trackId: string, time: number) => {
        updateProject(state => {
            const { width: canvasWidth, height: canvasHeight } = FORMAT_DIMENSIONS[format];
            const isVisualMedia = poolClip.type === 'video' || poolClip.type === 'image';

            const newClipData = {
                trackId: trackId,
                type: poolClip.type,
                poolId: poolClip.id,
                src: poolClip.src,
                fileName: poolClip.fileName,
                timelineStart: time,
                startTime: 0,
                endTime: poolClip.duration,
                duration: poolClip.duration,
                x: 0, y: 0, 
                width: isVisualMedia ? canvasWidth : (poolClip.width || canvasWidth), 
                height: isVisualMedia ? canvasHeight : (poolClip.height || canvasHeight), 
                rotation: 0,
                speed: 1,
            };
            return rippleInsertClips([newClipData], state);
        });
    }, [format, updateProject, rippleInsertClips]);
    
    const handleAddClipAtPlayhead = useCallback((poolClip: MediaPoolClip) => {
        updateProject(state => {
            const { width: canvasWidth, height: canvasHeight } = FORMAT_DIMENSIONS[format];
            const isVisualMedia = poolClip.type === 'video' || poolClip.type === 'image';
            
            let track: Track | undefined;
            let newState = state;
    
            if (poolClip.type === 'image' || poolClip.type === 'video') {
                // Prefer video track for images to allow transitions
                const result = findOrCreateTrack(state, 'video');
                newState = result.newState;
                track = result.track;
            } else if (poolClip.type === 'audio') {
                const result = findOrCreateTrack(state, 'audio');
                newState = result.newState;
                track = result.track;
            }
    
            if (!track) return newState; // Should not happen
    
            const newClipData = {
                trackId: track.id,
                type: poolClip.type,
                poolId: poolClip.id,
                src: poolClip.src,
                fileName: poolClip.fileName,
                timelineStart: masterCurrentTime,
                startTime: 0, endTime: poolClip.duration, duration: poolClip.duration,
                x: 0, y: 0, 
                width: isVisualMedia ? canvasWidth : (poolClip.width || canvasWidth),
                height: isVisualMedia ? canvasHeight : (poolClip.height || canvasHeight), 
                rotation: 0,
                speed: 1,
            };
            return rippleInsertClips([newClipData], newState);
        });
    }, [masterCurrentTime, format, updateProject, findOrCreateTrack, rippleInsertClips]);

    const handleAddRecordedAudio = useCallback((blob: Blob, duration: number) => {
        const file = new File([blob], `gravacao-${Date.now()}.wav`, { type: 'audio/wav' });
        processAndAddFile(file).then(() => {
            updateProject(state => {
                const newPoolClip = state.mediaPool.find(c => c.fileName === file.name);
                if (!newPoolClip) return state;

                let { newState, track } = findOrCreateTrack(state, 'audio');
                
                const newClipData = {
                    trackId: track.id,
                    type: 'audio' as VideoClipType,
                    poolId: newPoolClip.id, src: newPoolClip.src, fileName: newPoolClip.fileName,
                    timelineStart: masterCurrentTime, startTime: 0, endTime: duration, duration,
                    x: 0, y: 0, width: 0, height: 0, rotation: 0, speed: 1,
                };
                return rippleInsertClips([newClipData], newState);
            });
        });
    }, [processAndAddFile, masterCurrentTime, updateProject, findOrCreateTrack, rippleInsertClips]);

    // -- Playback Controls --
    const pause = useCallback(() => {
        setIsPlaying(false);
        setMasterCurrentTime(playbackTimeRef.current);
    }, []);
    
    // -- Timeline Actions --
    const onMoveClips = useCallback((updates: { clipId: string; newTrackId: string; newTimelineStart: number }[]) => {
        if (isPlaying) {
            pause();
        }
        updateProject(state => {
            const newClips = state.timelineClips.map(c => {
                const update = updates.find(u => u.clipId === c.id);
                if (update) {
                    return { ...c, trackId: update.newTrackId, timelineStart: update.newTimelineStart };
                }
                return c;
            });
            return { ...state, timelineClips: newClips };
        }, true);
    }, [updateProject, isPlaying, pause]);
    
    const onTrimClip = useCallback((clipId: string, newTimes: Partial<{ startTime: number, endTime: number, timelineStart: number }>) => {
        if (isPlaying) {
            pause();
        }
        updateProject(state => ({
            ...state,
            timelineClips: state.timelineClips.map(c => c.id === clipId ? { ...c, ...newTimes } : c)
        }), true);
    }, [updateProject, isPlaying, pause]);

    const handleSplitClipAtPlayhead = useCallback(() => {
        const clipId = projectState.selectedClipIds[0];
        if (!clipId) return;

        if (isPlaying) {
            pause();
        }

        updateProject(state => {
            const clipToSplit = state.timelineClips.find(c => c.id === clipId);
            if (!clipToSplit) return state;
            
            const clipDuration = (clipToSplit.endTime - clipToSplit.startTime) / (clipToSplit.speed || 1);
            const clipEnd = clipToSplit.timelineStart + clipDuration;

            if (masterCurrentTime <= clipToSplit.timelineStart || masterCurrentTime >= clipEnd) {
                return state;
            }
            
            const timeInClipAtSplit = (masterCurrentTime - clipToSplit.timelineStart) * (clipToSplit.speed || 1);
            const sourceTimeAtSplit = clipToSplit.startTime + timeInClipAtSplit;
            
            const firstPart = {
                ...clipToSplit,
                endTime: sourceTimeAtSplit,
            };
            const secondPart = {
                ...clipToSplit,
                id: `clip-${Date.now()}`,
                timelineStart: masterCurrentTime,
                startTime: sourceTimeAtSplit,
            };
            
            const newClips = state.timelineClips.map(c => c.id === clipId ? firstPart : c);
            newClips.push(secondPart);
            
            return { ...state, timelineClips: newClips, selectedClipIds: [secondPart.id] };
        });
    }, [masterCurrentTime, projectState.selectedClipIds, updateProject, isPlaying, pause]);

    const handleDeleteSelectedClips = useCallback(() => {
        if(projectState.selectedClipIds.length === 0) return;
        if (isPlaying) {
            pause();
        }
        updateProject(state => {
            const newClips = state.timelineClips.filter(c => !state.selectedClipIds.includes(c.id));
            const newTransitions = state.timelineTransitions.filter(t => 
                !state.selectedClipIds.includes(t.clipAId) && !state.selectedClipIds.includes(t.clipBId)
            );
            return { ...state, timelineClips: newClips, timelineTransitions: newTransitions, selectedClipIds: [] };
        });
    }, [projectState.selectedClipIds, updateProject, isPlaying, pause]);

    const handleReorderTracks = useCallback((draggedId: string, targetId: string) => {
        updateProject(state => {
            const tracks = [...state.tracks];
            const draggedIndex = tracks.findIndex(t => t.id === draggedId);
            const targetIndex = tracks.findIndex(t => t.id === targetId);
            if (draggedIndex === -1 || targetIndex === -1) return state;

            const [draggedItem] = tracks.splice(draggedIndex, 1);
            tracks.splice(targetIndex, 0, draggedItem);
            return { ...state, tracks };
        });
    }, [updateProject]);

    const handleRenameTrack = useCallback((trackId: string, newName: string) => {
        updateProject(state => ({
            ...state,
            tracks: state.tracks.map(t => t.id === trackId ? { ...t, name: newName } : t)
        }));
    }, [updateProject]);

    const handleDeleteTrack = useCallback((trackId: string) => {
        if (rangeSelectionAnchorTrackId === trackId) {
            setRangeSelectionAnchorTrackId(null);
        }
        updateProject(state => ({
            ...state,
            tracks: state.tracks.filter(t => t.id !== trackId),
            timelineClips: state.timelineClips.filter(c => c.trackId !== trackId),
            selectedTrackIds: state.selectedTrackIds.filter(id => id !== trackId),
        }));
    }, [updateProject, rangeSelectionAnchorTrackId]);
    
    const handleToggleMuteTrack = useCallback((trackId: string) => {
        updateProject(state => ({
            ...state,
            tracks: state.tracks.map(t => {
                if (t.id === trackId) {
                    if (t.isMuted) { // Unmuting
                        return { ...t, isMuted: false, volume: t.preMuteVolume || 1 };
                    } else { // Muting
                        return { ...t, isMuted: true, preMuteVolume: t.volume, volume: 0 };
                    }
                }
                return t;
            })
        }));
    }, [updateProject]);

    const handleSetTrackVolume = useCallback((trackId: string, volume: number) => {
        updateProject(state => ({
            ...state,
            tracks: state.tracks.map(t => t.id === trackId ? { ...t, volume, isMuted: volume === 0 } : t)
        }), true);
    }, [updateProject]);
    
    const handleDuplicateSelectedTracks = useCallback(() => {
        setRangeSelectionAnchorTrackId(null);
        updateProject(state => {
            const tracksToDuplicate = state.tracks.filter(t => state.selectedTrackIds.includes(t.id));
            if (tracksToDuplicate.length === 0) return state;

            const newTracks: Track[] = [];
            const newClips: VideoClip[] = [];
            const idMap = new Map<string, string>(); // old ID -> new ID

            tracksToDuplicate.forEach(track => {
                const newTrackId = `${track.type}-track-${Date.now()}-${Math.random()}`;
                idMap.set(track.id, newTrackId);
                newTracks.push({ ...track, id: newTrackId, name: `${track.name} Cópia` });
                
                state.timelineClips.filter(c => c.trackId === track.id).forEach(clip => {
                    const newClipId = `clip-${Date.now()}-${Math.random()}`;
                    idMap.set(clip.id, newClipId);
                    newClips.push({ ...clip, id: newClipId, trackId: newTrackId });
                });
            });

            const newTransitions = state.timelineTransitions
                .filter(t => idMap.has(t.clipAId) && idMap.has(t.clipBId))
                .map(t => ({
                    ...t,
                    id: `transition-${Date.now()}-${Math.random()}`,
                    clipAId: idMap.get(t.clipAId)!,
                    clipBId: idMap.get(t.clipBId)!,
                }));
            
            const insertionIndex = state.tracks.findIndex(t => t.id === tracksToDuplicate[0].id);
            const finalTracks = [...state.tracks];
            finalTracks.splice(insertionIndex, 0, ...newTracks);

            return {
                ...state,
                tracks: finalTracks,
                timelineClips: [...state.timelineClips, ...newClips],
                timelineTransitions: [...state.timelineTransitions, ...newTransitions],
                selectedTrackIds: newTracks.map(t => t.id)
            };
        });
    }, [updateProject]);

    // -- Transitions --
    const handleAddOrUpdateTransition = useCallback((data: { clipAId: string; clipBId: string; type: TransitionType; duration: number }) => {
        updateProject(state => {
            const existingIndex = state.timelineTransitions.findIndex(t => t.clipAId === data.clipAId && t.clipBId === data.clipBId);
            if (existingIndex > -1) {
                const newTransitions = [...state.timelineTransitions];
                newTransitions[existingIndex] = { ...newTransitions[existingIndex], type: data.type, duration: data.duration };
                return { ...state, timelineTransitions: newTransitions };
            } else {
                const newTransition: TimelineTransition = {
                    id: `transition-${Date.now()}`,
                    ...data,
                };
                return { ...state, timelineTransitions: [...state.timelineTransitions, newTransition] };
            }
        });
    }, [updateProject]);

    const handleDeleteTransition = useCallback((clipAId: string, clipBId: string) => {
        updateProject(state => ({
            ...state,
            timelineTransitions: state.timelineTransitions.filter(t => t.clipAId !== clipAId || t.clipBId !== clipBId)
        }));
    }, [updateProject]);

    const handleApplyTransitionToAll = useCallback((data: { type: TransitionType, duration: number }) => {
        updateProject(state => {
            const newTransitions: TimelineTransition[] = [];
            state.tracks.forEach(track => {
                if(track.type !== 'video') return;
                const clipsOnTrack = state.timelineClips.filter(c => c.trackId === track.id).sort((a, b) => a.timelineStart - b.timelineStart);
                for (let i = 0; i < clipsOnTrack.length - 1; i++) {
                    const clipA = clipsOnTrack[i];
                    const clipB = clipsOnTrack[i+1];
                    const clipA_displayDuration = (clipA.endTime - clipA.startTime) / (clipA.speed || 1);
                    const clipA_end_time = clipA.timelineStart + clipA_displayDuration;
                    if (Math.abs(clipB.timelineStart - clipA_end_time) < 0.1) {
                         newTransitions.push({
                            id: `transition-${clipA.id}-${clipB.id}`,
                            clipAId: clipA.id,
                            clipBId: clipB.id,
                            ...data
                         });
                    }
                }
            });
            return {...state, timelineTransitions: newTransitions};
        });
    }, [updateProject]);

    // -- Copy/Paste --
    const handleCopyClip = useCallback(() => {
        const selectedClip = projectState.timelineClips.find(c => c.id === projectState.selectedClipIds[0]);
        if (selectedClip) {
            setCopiedClip(selectedClip);
            setClipboardStatus('Clipe copiado!');
            setTimeout(() => setClipboardStatus(''), 2000);
        }
    }, [projectState.timelineClips, projectState.selectedClipIds]);

    const handlePasteClip = useCallback(() => {
        if (copiedClip) {
            updateProject(state => {
                // Deep clone the copied clip to make it fully independent.
                const newClipData = JSON.parse(JSON.stringify(copiedClip));

                // Assign a new unique ID.
                newClipData.id = `clip-${Date.now()}-${Math.random()}`;

                // Set the start time to the current playhead position.
                newClipData.timelineStart = masterCurrentTime;
                
                return rippleInsertClips([newClipData], state);
            });
        }
    }, [copiedClip, masterCurrentTime, updateProject, rippleInsertClips]);

    // -- Playback Controls --
    const seek = useCallback((time: number) => {
        if (isPlaying) {
            pause();
        }
        const newTime = Math.max(0, Math.min(time, masterDuration));
        setMasterCurrentTime(newTime);
    }, [masterDuration, isPlaying, pause]);

    const stop = useCallback(() => {
        if (isPlaying) {
            pause();
        } else {
            seek(0);
        }
    }, [isPlaying, pause, seek]);

    const play = useCallback(async () => {
        if (isPlaying) return;

        let timeToPlayFrom = masterCurrentTime;
        // If playback is at or after the content's end, loop back to the start.
        const effectiveDuration = contentDuration > 0 ? contentDuration : masterDuration;
        if (timeToPlayFrom >= effectiveDuration) {
            timeToPlayFrom = 0;
            setMasterCurrentTime(0); // Also update state
        }
    
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }
        const context = audioContextRef.current;
    
        activeAudioSourcesRef.current.forEach(source => {
            try { source.stop(0); } catch (e) {}
            source.disconnect();
        });
        activeAudioSourcesRef.current = [];
    
        if (!masterAnalyserRef.current) {
            masterAnalyserRef.current = context.createAnalyser();
            masterAnalyserRef.current.fftSize = 1024;
        }
        masterAnalyserRef.current.connect(context.destination);

        playbackAudioStartContextTimeRef.current = context.currentTime;
        playbackAudioStartTimeRef.current = timeToPlayFrom;
    
        const clipsToPlay = projectState.timelineClips.filter(c => {
            const track = projectState.tracks.find(t => t.id === c.trackId);
            if (!track || track.isMuted) return false;
            if (c.type !== 'audio' && c.type !== 'video') return false;
            
            const displayDuration = (c.endTime - c.startTime) / (c.speed || 1);
            const displayEnd = c.timelineStart + displayDuration;
            return timeToPlayFrom < displayEnd;
        });

        clipsToPlay.forEach(clip => {
            const src = clip.src || projectState.mediaPool?.find(mp => mp.id === clip.poolId)?.src;
            if (!src) return;
            let buffer = decodedAudioBuffersRef.current.get(src);
            if (clip.isReversed && buffer) {
                let reversedBuffer = reversedAudioBuffersRef.current.get(src);
                if (!reversedBuffer) {
                    reversedBuffer = reverseAudioBuffer(buffer, context);
                    reversedAudioBuffersRef.current.set(src, reversedBuffer);
                }
                buffer = reversedBuffer;
            }
            if (!buffer) return;
    
            const source = context.createBufferSource();
            source.buffer = buffer;
            const clipSpeed = clip.speed || 1;
            source.playbackRate.value = clipSpeed;
            
            const gainNode = context.createGain();
            const track = projectState.tracks.find(t => t.id === clip.trackId);
            if (!track) return;
            gainNode.connect(masterAnalyserRef.current!);
            source.connect(gainNode);
            
            let startDelay = 0;
            let startOffset = 0;
    
            if (timeToPlayFrom > clip.timelineStart) {
                startOffset = clip.isReversed
                    ? buffer.duration - clip.endTime + (timeToPlayFrom - clip.timelineStart) * clipSpeed
                    : clip.startTime + (timeToPlayFrom - clip.timelineStart) * clipSpeed;
            } else {
                startDelay = clip.timelineStart - timeToPlayFrom;
                startOffset = clip.isReversed ? buffer.duration - clip.endTime : clip.startTime;
            }
    
            const remainingDuration = (clip.endTime - (clip.isReversed ? (buffer.duration - startOffset) : startOffset)) / clipSpeed;
            const safeStartOffset = Math.max(0, Math.min(startOffset, buffer.duration - 0.001));
            const maxPlayableDuration = Math.max(0, (buffer.duration - safeStartOffset) / clipSpeed);
            const safeDuration = Math.min(remainingDuration, maxPlayableDuration);
            if (safeDuration <= 0.002) return;
    
            const startTimeOnAudioClock = context.currentTime + startDelay;
            const stopTimeOnAudioClock = startTimeOnAudioClock + safeDuration;

            source.start(startTimeOnAudioClock, safeStartOffset, safeDuration);
            activeAudioSourcesRef.current.push(source);
    
            const sourceTimeAtStart = clip.startTime + (timeToPlayFrom > clip.timelineStart ? (timeToPlayFrom - clip.timelineStart) * clipSpeed : 0);
            const initialGain = track.volume * calculateFadeMultiplier(clip, sourceTimeAtStart);
            
            // Micro-fade (4ms) to eliminate all digital DC-offset pops and clicks at cut boundaries
            const microFade = Math.min(0.004, safeDuration / 4);

            if (startDelay > 0.001) {
                gainNode.gain.setValueAtTime(0, context.currentTime);
                gainNode.gain.setValueAtTime(0, startTimeOnAudioClock);
                gainNode.gain.linearRampToValueAtTime(initialGain, startTimeOnAudioClock + microFade);
            } else {
                gainNode.gain.setValueAtTime(0, context.currentTime);
                gainNode.gain.linearRampToValueAtTime(initialGain, context.currentTime + microFade);
            }
    
            if (clip.fadeInDuration && clip.fadeInDuration > 0) {
                const fadeInEndSourceTime = clip.startTime + clip.fadeInDuration;
                if (sourceTimeAtStart < fadeInEndSourceTime) {
                    const remainingFadeTime = (fadeInEndSourceTime - sourceTimeAtStart) / clipSpeed;
                    gainNode.gain.setValueAtTime(0, startTimeOnAudioClock);
                    gainNode.gain.linearRampToValueAtTime(track.volume, startTimeOnAudioClock + remainingFadeTime);
                }
            }
            if (clip.fadeOutDuration && clip.fadeOutDuration > 0) {
                const fadeOutStartSourceTime = clip.endTime - clip.fadeOutDuration;
                const timeUntilFadeStart = (fadeOutStartSourceTime - sourceTimeAtStart) / clipSpeed;
                if (timeUntilFadeStart > 0 && timeUntilFadeStart < safeDuration) {
                     gainNode.gain.setValueAtTime(track.volume, startTimeOnAudioClock + timeUntilFadeStart);
                     gainNode.gain.linearRampToValueAtTime(0, startTimeOnAudioClock + timeUntilFadeStart + (clip.fadeOutDuration / clipSpeed));
                }
            } else {
                if (safeDuration > microFade * 2) {
                    gainNode.gain.setValueAtTime(initialGain, stopTimeOnAudioClock - microFade);
                    gainNode.gain.linearRampToValueAtTime(0, stopTimeOnAudioClock);
                }
            }
        });
        
        playingVideosRef.current.clear();
        playbackTimeRef.current = timeToPlayFrom;
        setIsPlaying(true);
    }, [isPlaying, masterCurrentTime, projectState, masterDuration, contentDuration]);

    useEffect(() => {
        if (!isPlaying) {
            activeAudioSourcesRef.current.forEach(source => {
                try { source.stop(0); } catch (e) { /* ignore */ }
                source.disconnect();
            });
            activeAudioSourcesRef.current = [];
            if (audioContextRef.current?.state === 'running') {
                audioContextRef.current.suspend();
            }
            canvasRef.current?.pauseAllVideos();
        }
    }, [isPlaying]);
    
    // -- Project I/O --
    const handleSaveProject = useCallback(async (fileName?: string) => {
        setIsSavingProject(true);
        setProjectStatus('Preparando projeto...');
        try {
            const zip = new JSZip();
            const mediaFolder = zip.folder('media');
            
            const stateToSave: ProjectState = JSON.parse(JSON.stringify(projectState));
            stateToSave.selectedClipIds = [];
            stateToSave.selectedTrackIds = [];
    
            const urlToPathMap = new Map<string, string>();
            setProjectStatus('Processando mídias...');
            const totalMedia = stateToSave.mediaPool.length;
            let currentCount = 0;
    
            for (const clip of stateToSave.mediaPool) {
                currentCount++;
                setProjectStatus(`Processando mídia (${currentCount}/${totalMedia})...`);
                if (clip.src?.startsWith('blob:')) {
                    if (!urlToPathMap.has(clip.src)) {
                        try {
                            const response = await fetch(clip.src);
                            const blob = await response.blob();
                            const uniqueFileName = `${clip.id}-${clip.fileName}`;
                            // Use STORE compression to prevent browser RAM overflow on heavy video/audio files
                            mediaFolder!.file(uniqueFileName, blob, { compression: "STORE" });
                            urlToPathMap.set(clip.src, `media/${uniqueFileName}`);
                        } catch (mediaErr) {
                            console.warn("Erro ao empacotar mídia no projeto:", clip.fileName, mediaErr);
                        }
                    }
                    clip.filePath = urlToPathMap.get(clip.src);
                }
                delete clip.src;
                delete clip.waveform;
            }
            
            for (const clip of stateToSave.timelineClips) {
                if (clip.logoSrc?.startsWith('blob:')) {
                     if (!urlToPathMap.has(clip.logoSrc)) {
                        try {
                            const response = await fetch(clip.logoSrc);
                            const blob = await response.blob();
                            const uniqueFileName = `logo-${clip.id}.png`; 
                            mediaFolder!.file(uniqueFileName, blob, { compression: "STORE" });
                            urlToPathMap.set(clip.logoSrc, `media/${uniqueFileName}`);
                        } catch (logoErr) {
                            console.warn("Erro ao empacotar logo no projeto:", logoErr);
                        }
                    }
                    clip.logoFilePath = urlToPathMap.get(clip.logoSrc);
                }
                delete clip.logoSrc;
                delete clip.src;
            }
            
            const finalSaveObject = { version: '2.1', project: stateToSave };
            setProjectStatus('Criando arquivo de projeto...');
            zip.file('project.json', JSON.stringify(finalSaveObject));
    
            setProjectStatus('Compactando projeto...');
            let zipBlob: Blob;
            let isJsonFallback = false;

            try {
                zipBlob = await zip.generateAsync({
                    type: 'blob',
                    compression: "STORE"
                }, (metadata) => {
                    setProjectStatus(`Compactando... ${Math.round(metadata.percent)}%`);
                });
            } catch (zipErr) {
                console.warn("Falha ao gerar ZIP completo devido ao tamanho das mídias em memória. Salvando estrutura do projeto em JSON...", zipErr);
                setProjectStatus('Tamanho limite de memória excedido. Salvando estrutura leve...');
                zipBlob = new Blob([JSON.stringify(finalSaveObject, null, 2)], { type: 'application/json' });
                isJsonFallback = true;
            }
    
            const a = document.createElement('a');
            a.href = URL.createObjectURL(zipBlob);
            const defaultExt = isJsonFallback ? '.vee.json' : '.vee';
            const nameToUse = fileName ? fileName : `projeto-vee-${new Date().toISOString().slice(0, 10)}${defaultExt}`;
            a.download = nameToUse;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
            
            if (isJsonFallback) {
                setProjectStatus('⚠️ Salvo como Estrutura de Projeto (.vee.json) devido ao grande tamanho das mídias.');
            } else {
                setProjectStatus('Projeto salvo com sucesso!');
            }
            setHasUnsavedChanges(false);
            return true;
        } catch (error) {
            console.error("Falha ao salvar projeto:", error);
            setProjectStatus(`Falha ao salvar: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
            return false;
        } finally {
            setIsSavingProject(false);
            setTimeout(() => setProjectStatus(''), 6000);
        }
    }, [projectState]);

    const handleSaveProjectAs = useCallback(async () => {
        const defaultFileName = `projeto-vee-${new Date().toISOString().slice(0, 10)}.vee`;
        const fileNameInput = window.prompt("Salvar projeto como:", defaultFileName);
    
        if (fileNameInput) {
            // Sanitize filename
            let sanitizedFileName = fileNameInput.replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/^\.+/, '');
            if (!sanitizedFileName.toLowerCase().endsWith('.vee')) {
                sanitizedFileName += '.vee';
            }
            return await handleSaveProject(sanitizedFileName);
        }
        return false;
    }, [handleSaveProject]);

    // Handlers para o recurso "Salvar antes de fechar"
    const handleRequestClose = useCallback(() => {
        const state = projectStateRef.current;
        const hasContent = state.timelineClips.length > 0 || state.mediaPool.length > 0 || past.length > 0;
        if (!hasContent && !hasUnsavedChanges) {
            onBack();
            return;
        }
        setIsSaveBeforeExitModalOpen(true);
    }, [past.length, hasUnsavedChanges, onBack]);

    const handleConfirmExitWithoutSaving = useCallback(() => {
        setIsSaveBeforeExitModalOpen(false);
        onBack();
    }, [onBack]);

    const handleConfirmSaveAndExit = useCallback(async () => {
        setIsSavingAndExiting(true);
        try {
            const success = await handleSaveProject();
            if (success) {
                setHasUnsavedChanges(false);
                setProjectStatus('Projeto salvo com sucesso! Fechando editor...');
                setTimeout(() => {
                    setIsSaveBeforeExitModalOpen(false);
                    setIsSavingAndExiting(false);
                    onBack();
                }, 1000);
            } else {
                setIsSavingAndExiting(false);
            }
        } catch (e) {
            console.error("Erro ao salvar antes de fechar:", e);
            setIsSavingAndExiting(false);
        }
    }, [handleSaveProject, onBack]);
    
    const processLegacyProject = useCallback(async (loadedData: any) => {
        const loadedProject: Partial<ProjectState> = loadedData.project;

        const sanitizedState: ProjectState = {
            scene: loadedProject.scene || { id: 'scene-1', name: 'Cena Principal', overlayEffect: 'none' },
            tracks: loadedProject.tracks || [],
            timelineClips: loadedProject.timelineClips || [],
            timelineTransitions: loadedProject.timelineTransitions || [],
            mediaPool: [],
            selectedClipIds: loadedProject.selectedClipIds || [],
            selectedTrackIds: loadedProject.selectedTrackIds || [],
        };

        setProjectStatus('Restaurando mídias (formato antigo)...');
        const newMediaPool: MediaPoolClip[] = await Promise.all((loadedProject.mediaPool || []).map(async (clip) => {
            const newClip: MediaPoolClip = { ...clip } as MediaPoolClip;
            if ((clip as any).base64Data) {
                try {
                    const response = await fetch((clip as any).base64Data);
                    const blob = await response.blob();
                    newClip.src = URL.createObjectURL(blob);
                } catch (e) {
                    console.error("Erro ao restaurar mídia base64:", e);
                }
            }
            delete (newClip as any).base64Data;
            return newClip;
        }));
        sanitizedState.mediaPool = newMediaPool;

        await Promise.all(sanitizedState.timelineClips.map(async (clip) => {
            if (clip.poolId) {
                const poolClip = sanitizedState.mediaPool.find(p => p.id === clip.poolId);
                if (poolClip) clip.src = poolClip.src;
            }
            if ((clip as any).logoBase64Data) {
                try {
                    const response = await fetch((clip as any).logoBase64Data);
                    const blob = await response.blob();
                    clip.logoSrc = URL.createObjectURL(blob);
                } catch (e) {
                    console.error("Erro ao restaurar logo base64:", e);
                }
            }
            delete (clip as any).logoBase64Data;
        }));

        return sanitizedState;
    }, []);

    const handleLoadProject = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
    
        setIsLoadingProject(true);
        setProjectStatus(`Carregando ${file.name}...`);
    
        try {
            let loadedProject: ProjectState;
            const blobMap = new Map<string, Blob>();

            try {
                setProjectStatus('Extraindo arquivos do projeto...');
                const zip = await JSZip.loadAsync(file);
                const projectFile = zip.file('project.json');
                if (!projectFile) throw new Error('Arquivo de projeto (project.json) não encontrado no ZIP.');
                
                const jsonString = await projectFile.async('string');
                const loadedData = JSON.parse(jsonString);

                if (!loadedData.project || loadedData.version !== '2.1') {
                     throw new Error('Versão de projeto ZIP incompatível.');
                }
                loadedProject = loadedData.project;
        
                setProjectStatus('Restaurando mídias...');
                
                await Promise.all(loadedProject.mediaPool.map(async (clip) => {
                    if ((clip as any).filePath) {
                        try {
                            const fileBlob = await zip.file((clip as any).filePath)!.async('blob');
                            clip.src = URL.createObjectURL(fileBlob);
                            blobMap.set(clip.src, fileBlob);
                        } catch (e) {
                            console.error("Erro ao restaurar mídia do ZIP:", e);
                        }
                    }
                }));
                
                await Promise.all(loadedProject.timelineClips.map(async (clip) => {
                    if (clip.poolId) {
                        const poolClip = loadedProject.mediaPool.find(p => p.id === clip.poolId);
                        if (poolClip) clip.src = poolClip.src;
                    }
                    if ((clip as any).logoFilePath) {
                        try {
                            const logoBlob = await zip.file((clip as any).logoFilePath)!.async('blob');
                            clip.logoSrc = URL.createObjectURL(logoBlob);
                        } catch (e) {
                            console.error("Erro ao restaurar logo do ZIP:", e);
                        }
                    }
                }));

            } catch (zipError) {
                // Not a zip file, assume JSON project format (e.g. lightweight .vee.json)
                const jsonString = await file.text();
                const loadedData = JSON.parse(jsonString);
                if (loadedData.project && (loadedData.version === '2.0' || loadedData.version === '2.1')) {
                    loadedProject = loadedData.version === '2.0' ? (await processLegacyProject(loadedData) as ProjectState) : loadedData.project;
                } else {
                    throw new Error('Arquivo de projeto inválido ou incompatível.');
                }
            }
            
            decodedAudioBuffersRef.current.clear();
            reversedAudioBuffersRef.current.clear();
            setProjectStatus('Processando áudio...');
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
    
            const mediaToProcess = loadedProject.mediaPool.filter(clip => clip.src && (clip.type === 'audio' || clip.type === 'video'));
            const concurrencyLimit = 2; // Process 2 audio/video files at a time to avoid browser overhead
            
            for (let i = 0; i < mediaToProcess.length; i += concurrencyLimit) {
                const chunk = mediaToProcess.slice(i, i + concurrencyLimit);
                setProjectStatus(`Processando áudio (${i + 1}/${mediaToProcess.length})...`);
                
                await Promise.all(chunk.map(async (clip) => {
                    try {
                        let blob = blobMap.get(clip.src!);
                        if (!blob) {
                            const response = await fetch(clip.src!);
                            blob = await response.blob();
                        }
                        
                        const fileForProcessing = new File([blob], clip.fileName, { type: blob.type });
    
                        const audioBuffer = await getAudioBufferFromFile(fileForProcessing, audioContextRef.current!);
                        decodedAudioBuffersRef.current.set(clip.src!, audioBuffer);
                        if (audioContextRef.current) {
                            reversedAudioBuffersRef.current.set(clip.src!, reverseAudioBuffer(audioBuffer, audioContextRef.current));
                        }
                        clip.waveform = await generateWaveformData(audioBuffer);
                    } catch (err) {
                        if (clip.type === 'video') console.warn(`Could not extract audio from video ${clip.fileName} on load.`, err);
                        else {
                            console.error(`Error processing audio for ${clip.fileName} on load:`, err);
                            clip.error = 'Falha no processamento de áudio.';
                        }
                    }
                }));
            }
    
            dispatch({
                type: ActionType.REPLACE_HISTORY, payload: {
                    past: [], present: loadedProject, future: [], grouping: false,
                }
            });
    
            setProjectStatus('Projeto carregado com sucesso!');
    
        } catch (error) {
            console.error("Falha ao carregar projeto:", error);
            const errorMessage = error instanceof Error ? error.message : "Erro desconhecido.";
            setProjectStatus(`Falha ao carregar: ${errorMessage}`);
        } finally {
            setIsLoadingProject(false);
            setTimeout(() => setProjectStatus(''), 5000);
            if (e.target) e.target.value = '';
        }
    }, [dispatch, processLegacyProject]);
    
class ChunkedBufferTarget {
    private blockSize: number;
    private blocks: Uint8Array[] = [];
    private totalSize = 0;

    constructor(blockSize = 2 * 1024 * 1024) {
        this.blockSize = blockSize;
    }

    public write(data: Uint8Array, position: number) {
        const end = position + data.length;
        if (end > this.totalSize) this.totalSize = end;

        let srcOffset = 0;
        while (srcOffset < data.length) {
            const currentPos = position + srcOffset;
            const blockIndex = Math.floor(currentPos / this.blockSize);
            const blockOffset = currentPos % this.blockSize;
            const bytesToWrite = Math.min(data.length - srcOffset, this.blockSize - blockOffset);

            if (!this.blocks[blockIndex]) {
                this.blocks[blockIndex] = new Uint8Array(this.blockSize);
            }

            this.blocks[blockIndex].set(
                data.subarray(srcOffset, srcOffset + bytesToWrite),
                blockOffset
            );

            srcOffset += bytesToWrite;
        }
    }

    public toBlobParts(): Uint8Array[] {
        const parts: Uint8Array[] = [];
        let remaining = this.totalSize;
        for (let i = 0; i < this.blocks.length && remaining > 0; i++) {
            const block = this.blocks[i] || new Uint8Array(Math.min(remaining, this.blockSize));
            const size = Math.min(remaining, block.length);
            parts.push(block.subarray(0, size));
            remaining -= size;
        }
        return parts;
    }
}

    // -- Exporting --
    const handleExport = useCallback(async (settings: { width: number; height: number; quality: Quality; fps: number }) => {
        setShowExportModal(false);
        setIsExporting(true);
        setExportProgress(0);
        setExportStatus('Iniciando exportação...');

        if (!contentDuration || contentDuration <= 0) {
            setExportStatus('A linha do tempo está vazia. Adicione fotos, vídeos ou áudio antes de exportar.');
            setIsExporting(false);
            setExportProgress(null);
            return;
        }

        if (typeof VideoEncoder === 'undefined' || typeof OffscreenCanvas === 'undefined') {
            setExportStatus('Seu navegador não possui suporte a WebCodecs. Recomendamos usar o Chrome, Edge ou navegador Chromium recente.');
            setIsExporting(false);
            setExportProgress(null);
            return;
        }

        let muxer: Muxer<StreamTarget> | null = null;
        let chunkedTarget: ChunkedBufferTarget | null = null;
        let videoEncoder: any | null = null;
        let audioEncoder: any | null = null;
        
        const offscreenCanvas = new OffscreenCanvas(settings.width, settings.height);
        const ctx = offscreenCanvas.getContext('2d', { alpha: false });

        if (!ctx) {
            setExportStatus('Falha ao criar contexto do canvas de renderização.');
            setIsExporting(false);
            setExportProgress(null);
            return;
        }

        try {
            // 1. Process and prepare all audio data first
            setExportStatus('Carregando áudio...');
            const audioClips = projectState.timelineClips.filter(c => (c.type === 'audio' || c.type === 'video'));
            for (const clip of audioClips) {
                const src = clip.src || projectState.mediaPool.find(mp => mp.id === clip.poolId)?.src;
                if (src && !decodedAudioBuffersRef.current.has(src)) {
                    try {
                        const response = await fetch(src);
                        const arrayBuffer = await response.arrayBuffer();
                        if (!audioContextRef.current) {
                            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                        }
                        const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
                        decodedAudioBuffersRef.current.set(src, audioBuffer);
                    } catch (e) {
                        console.warn(`Failed to load audio buffer for export: ${src}`, e);
                    }
                }
            }

            setExportStatus('Processando áudio e sintetizando faixas...');
            const { mixedAudio, analyserFrames } = await renderAudioAndGetAnalyserFrames(
                projectState,
                decodedAudioBuffersRef.current,
                reversedAudioBuffersRef.current,
                contentDuration,
                settings.fps
            );

            if (mixedAudio) {
                console.log(`Audio rendered for export: ${mixedAudio.duration}s, ${mixedAudio.numberOfChannels} channels, ${mixedAudio.sampleRate}Hz`);
            }

            // 2. Negotiate video & audio codec compatibility
            setExportStatus('Inicializando encoders...');
            const desiredCodec = getAvcCodecString(settings.width, settings.height, settings.fps);
            let chosenVideoCodec = desiredCodec;
            const candidateCodecs = [
                desiredCodec,
                'avc1.4d002a', // Main Profile Level 4.2
                'avc1.42001f', // Baseline Level 3.1
                'avc1.420028', // Baseline Level 4.0
                'avc1.640028', // High Level 4.0
                'avc1.64001f', // High Level 3.1
            ];

            if (typeof VideoEncoder.isConfigSupported === 'function') {
                for (const codec of candidateCodecs) {
                    try {
                        const support = await VideoEncoder.isConfigSupported({
                            codec,
                            width: settings.width,
                            height: settings.height,
                            bitrate: (settings.height >= 1080 ? 8_000_000 : settings.height >= 720 ? 5_000_000 : 2_500_000),
                            framerate: settings.fps,
                        });
                        if (support && support.supported) {
                            chosenVideoCodec = codec;
                            break;
                        }
                    } catch {
                        // Keep checking candidates
                    }
                }
            }

            let isAudioSupported = false;
            if (mixedAudio && typeof AudioEncoder !== 'undefined') {
                try {
                    const audioConfig = {
                        codec: 'mp4a.40.2',
                        sampleRate: mixedAudio.sampleRate,
                        numberOfChannels: mixedAudio.numberOfChannels,
                        bitrate: 192_000,
                    };
                    if (typeof AudioEncoder.isConfigSupported === 'function') {
                        const support = await AudioEncoder.isConfigSupported(audioConfig);
                        isAudioSupported = !!(support && support.supported);
                    } else {
                        isAudioSupported = true;
                    }
                } catch (e) {
                    console.warn("AudioEncoder support check failed:", e);
                    isAudioSupported = false;
                }
            }

            chunkedTarget = new ChunkedBufferTarget(2 * 1024 * 1024);
            muxer = new Muxer({
                target: new StreamTarget(
                    (data, position) => chunkedTarget?.write(data, position),
                    undefined,
                    { chunkSize: 2 * 1024 * 1024 }
                ),
                video: {
                    codec: 'avc',
                    width: settings.width,
                    height: settings.height,
                },
                audio: (mixedAudio && isAudioSupported) ? {
                    codec: 'aac',
                    sampleRate: mixedAudio.sampleRate,
                    numberOfChannels: mixedAudio.numberOfChannels,
                } : undefined,
            });

            let encoderError: Error | null = null;

            videoEncoder = new VideoEncoder({
                output: (chunk, meta) => muxer?.addVideoChunk(chunk, meta),
                error: (e) => {
                    encoderError = new Error(`Erro na codificação de vídeo: ${e.message}`);
                    console.error("VideoEncoder error:", e);
                }
            });

            videoEncoder.configure({
                codec: chosenVideoCodec,
                width: settings.width,
                height: settings.height,
                bitrate: (settings.height >= 1080 ? 8_000_000 : settings.height >= 720 ? 5_000_000 : 2_500_000),
                framerate: settings.fps,
                latencyMode: 'quality',
            });

            let audioChunksCount = 0;
            if (mixedAudio && isAudioSupported) {
                audioEncoder = new AudioEncoder({
                    output: (chunk, meta) => {
                        audioChunksCount++;
                        muxer?.addAudioChunk(chunk, meta);
                    },
                    error: (e) => { 
                        console.error("AudioEncoder error:", e);
                    }
                });

                try {
                    audioEncoder.configure({
                        codec: 'mp4a.40.2',
                        sampleRate: mixedAudio.sampleRate,
                        numberOfChannels: mixedAudio.numberOfChannels,
                        bitrate: 192_000,
                    });
                } catch (configError) {
                    console.warn("Failed to configure AudioEncoder, proceeding with video-only:", configError);
                    audioEncoder = null;
                }

                // 3. Encode Audio
                if (audioEncoder) {
                    setExportStatus('Codificando áudio...');
                    const sampleRate = mixedAudio.sampleRate;
                    const numChannels = mixedAudio.numberOfChannels;
                    
                    const ch0 = mixedAudio.getChannelData(0);
                    const ch1 = numChannels > 1 ? mixedAudio.getChannelData(1) : ch0;

                    const chunkSize = 4096;
                    for (let i = 0; i < mixedAudio.length; i += chunkSize) {
                        const frameCount = Math.min(chunkSize, mixedAudio.length - i);
                        const interleavedData = new Float32Array(frameCount * numChannels);
                        
                        if (numChannels === 2) {
                            for (let j = 0; j < frameCount; j++) {
                                const idx = i + j;
                                interleavedData[j * 2] = ch0[idx];
                                interleavedData[j * 2 + 1] = ch1[idx];
                            }
                        } else {
                            for (let j = 0; j < frameCount; j++) {
                                interleavedData[j] = ch0[i + j];
                            }
                        }

                        const audioChunk = new AudioData({
                            format: 'f32',
                            sampleRate: sampleRate,
                            numberOfFrames: frameCount,
                            numberOfChannels: numChannels,
                            timestamp: Math.round((i / sampleRate) * 1_000_000),
                            data: interleavedData,
                        });
                        
                        if (audioEncoder.state === 'configured') {
                            audioEncoder.encode(audioChunk);
                        }
                        audioChunk.close();

                        while (audioEncoder.encodeQueueSize > 40) {
                            await new Promise(resolve => setTimeout(resolve, 10));
                        }
                    }
                }
            }
            
            // 4. Preload all visual media assets
            setExportStatus('Pré-carregando mídias visuais...');
            const imageCache = new Map<string, HTMLImageElement>();
            const videoCache = new Map<string, HTMLVideoElement>();
            const videoSources = new Set<string>();
            const imageSources = new Set<string>();

            projectState.timelineClips.forEach(clip => {
                const src = clip.src || projectState.mediaPool.find(mp => mp.id === clip.poolId)?.src;
                if (src) {
                    const poolItem = projectState.mediaPool.find(mp => mp.id === clip.poolId || mp.src === src);
                    const isVideo = clip.type === 'video' || poolItem?.type === 'video';
                    if (isVideo) {
                        videoSources.add(src);
                    } else if (clip.type === 'image' || poolItem?.type === 'image') {
                        imageSources.add(src);
                    }
                }
                if (clip.logoSrc) {
                    imageSources.add(clip.logoSrc);
                }
            });

            projectState.mediaPool.forEach(mp => {
                if (mp.src) {
                    if (mp.type === 'video') videoSources.add(mp.src);
                    else if (mp.type === 'image') imageSources.add(mp.src);
                }
            });

            await Promise.all([
                ...Array.from(videoSources).map(src => loadAndCacheVideo(src, videoCache).catch(err => {
                    console.warn(`[Export] Aviso ao pré-carregar vídeo (${src}):`, err);
                    return null;
                })),
                ...Array.from(imageSources).map(src => loadAndCacheImage(src, imageCache))
            ]);

            // 5. Render and Encode Video Frames in Batches
            await new Promise<void>((resolve, reject) => {
                const totalFrames = Math.max(1, Math.floor(contentDuration * settings.fps));
                const spectrumCanvasCache = new Map<string, { canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D }>();
                
                const initialEffect = findOverlayEffectForTime(0, projectState);
                const overlayRenderer = new OverlayRenderer(initialEffect, settings.width, settings.height);
                let currentOverlayEffect = initialEffect;
                
                const BATCH_SIZE = Math.max(10, Math.round(settings.fps / 2)); // e.g., 15 for 30fps

                const processBatch = async (startFrame: number) => {
                    try {
                        if (encoderError) {
                            reject(encoderError);
                            return;
                        }

                        const endFrame = Math.min(startFrame + BATCH_SIZE, totalFrames);

                        for (let i = startFrame; i < endFrame; i++) {
                            if (encoderError) {
                                reject(encoderError);
                                return;
                            }

                            const frameTime = i / settings.fps;

                            const effectForFrame = findOverlayEffectForTime(frameTime, projectState);
                            if (effectForFrame !== currentOverlayEffect) {
                                overlayRenderer.updateEffect(effectForFrame);
                                currentOverlayEffect = effectForFrame;
                            }

                            const preloadedFrames = await preloadVisualAssets(frameTime, projectState, videoCache, imageCache);

                            renderFrameOnCanvas({
                                ctx, projectState, frameTime,
                                analyserFrame: analyserFrames[i] || analyserFrames[analyserFrames.length - 1],
                                imageCache, preloadedFrames, overlayRenderer,
                                findClipForTimestamp, frameRate: settings.fps, spectrumCanvasCache,
                                projectDimensions: { width: FORMAT_DIMENSIONS[format].width, height: FORMAT_DIMENSIONS[format].height }
                            });

                            preloadedFrames.forEach(bitmap => bitmap.close());

                            const videoFrame = new VideoFrame(offscreenCanvas, {
                                timestamp: Math.round(frameTime * 1_000_000),
                                duration: Math.round(1_000_000 / settings.fps),
                            });
                            
                            if (videoEncoder.state === 'configured') {
                                videoEncoder.encode(videoFrame);
                            }
                            videoFrame.close();
                            
                            while (videoEncoder.encodeQueueSize > 12) {
                                await new Promise(resolve => setTimeout(resolve, 15));
                            }
                        }

                        setExportStatus(`Renderizando quadro ${endFrame} de ${totalFrames}`);
                        setExportProgress((endFrame / totalFrames) * 100);

                        if (endFrame < totalFrames) {
                            setTimeout(() => processBatch(endFrame), 0);
                        } else {
                            resolve();
                        }
                    } catch (e) {
                        reject(e);
                    }
                };
                
                processBatch(0);
            });
            
            // 6. Finalize encoders and muxer
            setExportStatus('Finalizando arquivo MP4...');
            
            if (videoEncoder && videoEncoder.state === 'configured') {
                try {
                    await videoEncoder.flush();
                } catch (e) {
                    console.error("Video flush error:", e);
                }
            }
            
            if (audioEncoder && audioEncoder.state === 'configured') {
                try {
                    await audioEncoder.flush();
                } catch (e) {
                    console.error("Audio flush error:", e);
                }
            }
            
            muxer.finalize();

            // 7. Trigger download
            const blobParts = chunkedTarget ? chunkedTarget.toBlobParts() : [];
            const blob = new Blob(blobParts, { type: 'video/mp4' });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `VEE-Export-${new Date().toISOString().slice(0,10)}.mp4`;
            
            document.body.appendChild(a);
            a.click();
            
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            setExportStatus('Exportação concluída com sucesso!');
        } catch (e) {
            console.error('Falha na exportação:', e);
            setExportStatus(`Falha na exportação: ${e instanceof Error ? e.message : 'Erro desconhecido'}`);
        } finally {
            // 8. Cleanup resources
            if (videoEncoder && videoEncoder.state !== 'closed') {
                try { videoEncoder.close(); } catch {}
            }
            if (audioEncoder && audioEncoder.state !== 'closed') {
                try { audioEncoder.close(); } catch {}
            }
            setIsExporting(false);
        }
    }, [projectState, contentDuration, format, findClipForTimestamp]);

    // -- Captions --
    const createTranscriptionWorker = useCallback(() => {
        if (transcriptionWorkerRef.current) {
            transcriptionWorkerRef.current.terminate();
        }
        const workerCode = `
            import { pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1';
            let transcriber = null;
            let currentModel = null;

            self.onmessage = async (event) => {
                const { audio, modelName, language } = event.data;
                const model = modelName || 'Xenova/whisper-base';
                const lang = language || 'portuguese';
                try {
                    if (!transcriber || currentModel !== model) {
                        self.postMessage({ status: 'model_loading', model });
                        transcriber = await pipeline('automatic-speech-recognition', model, {
                            quantized: true,
                            progress_callback: progress => {
                                self.postMessage({ status: 'progress', data: progress });
                            },
                        });
                        currentModel = model;
                    }
                    self.postMessage({ status: 'model_loaded' });

                    const totalDuration = audio.length / 16000;
                    const estimatedChunks = Math.max(1, Math.ceil(totalDuration / 25));
                    let currentChunkIndex = 0;

                    self.postMessage({
                        status: 'transcribing_progress',
                        data: {
                            current: 1,
                            total: estimatedChunks,
                            percent: 5,
                        }
                    });

                    let output = null;

                    // First attempt: request word-level timestamps for maximum precision
                    try {
                        const wordOptions = {
                            task: 'transcribe',
                            return_timestamps: 'word',
                        };
                        if (totalDuration > 25) {
                            wordOptions.chunk_length_s = 24;
                            wordOptions.stride_length_s = 4;
                            wordOptions.chunk_callback = (chunkData) => {
                                currentChunkIndex++;
                                const pct = Math.min(98, Math.round((currentChunkIndex / estimatedChunks) * 100));
                                self.postMessage({
                                    status: 'transcribing_progress',
                                    data: {
                                        current: Math.min(currentChunkIndex, estimatedChunks),
                                        total: estimatedChunks,
                                        percent: pct,
                                    }
                                });
                            };
                        }
                        if (lang !== 'auto') {
                            wordOptions.language = lang;
                        }
                        output = await transcriber(audio, wordOptions);
                    } catch (wordErr) {
                        console.warn("Word-level timestamp attempt failed, falling back to chunk timestamps:", wordErr);
                        const fallbackOptions = {
                            task: 'transcribe',
                            return_timestamps: true,
                        };
                        if (totalDuration > 25) {
                            fallbackOptions.chunk_length_s = 24;
                            fallbackOptions.stride_length_s = 4;
                        }
                        if (lang !== 'auto') {
                            fallbackOptions.language = lang;
                        }
                        output = await transcriber(audio, fallbackOptions);
                    }

                    const wordChunks = [];
                    if (output && output.chunks && Array.isArray(output.chunks) && output.chunks.length > 0) {
                        for (const chunk of output.chunks) {
                            let rawText = (chunk.text || '').trim();
                            if (!rawText) continue;
                            rawText = rawText.replace(/\[.*?\]|\(.*?\)/g, '').trim();
                            if (!rawText) continue;

                            let cStart = (chunk.timestamp && chunk.timestamp[0] !== null && !isNaN(chunk.timestamp[0])) ? Number(chunk.timestamp[0]) : 0;
                            let cEnd = (chunk.timestamp && chunk.timestamp[1] !== null && !isNaN(chunk.timestamp[1])) ? Number(chunk.timestamp[1]) : cStart + 0.35;
                            if (cStart < 0) cStart = 0;
                            if (cEnd <= cStart) cEnd = cStart + Math.max(0.25, rawText.length * 0.055);

                            const words = rawText.split(/\s+/).filter(Boolean);
                            if (words.length <= 1) {
                                wordChunks.push({
                                    text: rawText,
                                    timestamp: [
                                        Math.round(cStart * 100) / 100,
                                        Math.round(cEnd * 100) / 100
                                    ]
                                });
                            } else {
                                const totalWeight = words.reduce((acc, w) => acc + Math.max(1, w.length), 0);
                                const dur = cEnd - cStart;
                                let curS = cStart;
                                for (let w = 0; w < words.length; w++) {
                                    const fraction = Math.max(1, words[w].length) / totalWeight;
                                    const wDur = dur * fraction;
                                    const wEnd = (w === words.length - 1) ? cEnd : curS + wDur;
                                    wordChunks.push({
                                        text: words[w],
                                        timestamp: [
                                            Math.round(curS * 100) / 100,
                                            Math.round(wEnd * 100) / 100
                                        ]
                                    });
                                    curS = wEnd;
                                }
                            }
                        }
                    } else if (output && output.text && output.text.trim()) {
                        let rawText = output.text.trim().replace(/\[.*?\]|\(.*?\)/g, '').trim();
                        const words = rawText.split(/\s+/).filter(Boolean);
                        if (words.length > 0) {
                            const dur = totalDuration;
                            const wordDur = dur / words.length;
                            for (let w = 0; w < words.length; w++) {
                                wordChunks.push({
                                    text: words[w],
                                    timestamp: [
                                        Math.round((w * wordDur) * 100) / 100,
                                        Math.round(((w + 1) * wordDur) * 100) / 100
                                    ]
                                });
                            }
                        }
                    }

                    self.postMessage({ status: 'complete', data: { chunks: wordChunks } });
                } catch (e) {
                    self.postMessage({ status: 'error', data: e.message });
                }
            };
        `;
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const worker = new Worker(URL.createObjectURL(blob), { type: 'module' });
        transcriptionWorkerRef.current = worker;
    }, []);

    useEffect(() => {
        createTranscriptionWorker();
        return () => {
            if (transcriptionWorkerRef.current) {
                transcriptionWorkerRef.current.terminate();
            }
        };
    }, [createTranscriptionWorker]);

    const handleCloseCaptionsModal = useCallback(() => {
        setIsCaptionsModalOpen(false);
        setGeneratedCaptions(null);
        setCaptionStatus('');
        setCaptionSyncOffsetMs(0);
        lastAudioDataRef.current = null;
        if (isGeneratingCaptions) {
            createTranscriptionWorker(); // Terminate running worker and create a fresh one
        }
        setIsGeneratingCaptions(false);
    }, [isGeneratingCaptions, createTranscriptionWorker]);

    const handleGenerateCaptions = useCallback(async () => {
        if (!transcriptionWorkerRef.current) {
            setCaptionStatus('Falha: Worker de transcrição não está pronto.');
            return;
        }

        setIsGeneratingCaptions(true);
        setGeneratedCaptions(null);
        setCaptionStatus('Inicializando motor de legendas...');

        const worker = transcriptionWorkerRef.current;
        let realAudioDuration = 0;

        worker.onmessage = (event) => {
            const { status, data, model } = event.data;
            switch(status) {
                case 'model_loading': {
                    const modelShort = model ? model.split('/').pop() : 'whisper-base';
                    setCaptionStatus(`Baixando/Iniciando modelo ${modelShort} (só na 1ª vez)...`);
                    break;
                }
                case 'progress':
                    const progressData = data;
                    if (progressData.status === 'progress') {
                        setCaptionStatus(`Baixando o modelo: ${progressData.file} (${Math.round(progressData.progress)}%)`);
                    } else {
                        setCaptionStatus(progressData.status);
                    }
                    break;
                case 'model_loaded':
                    setCaptionStatus('IA pronta! Processando áudio e gerando legendas...');
                    break;
                case 'transcribing_progress': {
                    const { current, total, percent } = data;
                    setCaptionStatus(`Transcrevendo trecho ${current} de ${total} (${percent}%)... Sincronizando fala`);
                    break;
                }
                case 'complete': {
                    setCaptionStatus('Refinando sincronização acústica milissegundo a milissegundo...');
                    const output = data;
                    const wordChunks = output.chunks;

                    if (!wordChunks || !Array.isArray(wordChunks) || wordChunks.length === 0) {
                        setCaptionStatus('Falha na geração: nenhuma fala foi detectada pela IA.');
                        setIsGeneratingCaptions(false);
                        return;
                    }

                    // Apply acoustic energy envelope alignment (VAD) using raw 16kHz audio buffer
                    let alignedChunks = wordChunks;
                    if (lastAudioDataRef.current && lastAudioDataRef.current.length > 0) {
                        try {
                            alignedChunks = refineWordTimestampsWithAudioEnergy(wordChunks, lastAudioDataRef.current, 16000);
                        } catch (alignErr) {
                            console.warn("Acoustic energy refinement error, using raw timestamps:", alignErr);
                        }
                    }

                    rawWordChunksRef.current = alignedChunks;
                    setCaptionSyncOffsetMs(0);
                    const finalCaptions = rechunkWordChunks(alignedChunks, captionDensityMode);
                    
                    if (finalCaptions.length === 0) {
                        setCaptionStatus('Nenhuma fala foi detectada pela IA.');
                    } else {
                        setGeneratedCaptions(finalCaptions);
                        setCaptionStatus(`✨ ${finalCaptions.length} legendas geradas com sincronização acústica de alta precisão! Personalize o formato ou ajuste o tempo abaixo.`);
                    }
                    setIsGeneratingCaptions(false);
                    break;
                }
                case 'error':
                    console.error("Caption generation worker failed:", data);
                    setCaptionStatus(`Falha na geração: ${data}`);
                    setGeneratedCaptions(null);
                    setIsGeneratingCaptions(false);
                    break;
            }
        };

        worker.onerror = (error) => {
            console.error("Caption generation worker error:", error);
            setCaptionStatus(`Falha na geração: ${error.message}`);
            setGeneratedCaptions(null);
            setIsGeneratingCaptions(false);
        };

        try {
            await new Promise(resolve => setTimeout(resolve, 50));

            // Garantir que todos os clipes de áudio e vídeo na timeline tenham seus buffers de áudio decodificados
            setCaptionStatus('Preparando áudio dos clipes...');
            const audioClipsToPreload = projectState.timelineClips.filter(c => (c.type === 'audio' || c.type === 'video'));
            for (const clip of audioClipsToPreload) {
                const src = clip.src || projectState.mediaPool.find(mp => mp.id === clip.poolId)?.src;
                if (src && !decodedAudioBuffersRef.current.has(src)) {
                    try {
                        const response = await fetch(src);
                        const arrayBuffer = await response.arrayBuffer();
                        if (!audioContextRef.current) {
                            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                        }
                        const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
                        decodedAudioBuffersRef.current.set(src, audioBuffer);
                    } catch (e) {
                        console.warn(`Não foi possível decodificar áudio do clipe: ${src}`, e);
                    }
                }
            }

            let renderDuration = 0;
            if (captionSource === 'master') {
                renderDuration = projectState.timelineClips
                    .filter(clip => {
                        const track = projectState.tracks.find(t => t.id === clip.trackId);
                        if (!track || track.isMuted) return false;
                        const src = clip.src || projectState.mediaPool.find(mp => mp.id === clip.poolId)?.src;
                        return (clip.type === 'audio' || clip.type === 'video') && src && decodedAudioBuffersRef.current.has(src);
                    })
                    .reduce((maxDuration, clip) => {
                        const clipEnd = clip.timelineStart + (clip.endTime - clip.startTime) / (clip.speed || 1);
                        return Math.max(maxDuration, clipEnd);
                    }, 0);
            } else {
                const sourceClip = projectState.timelineClips.find(c => c.id === captionSource);
                if (sourceClip) renderDuration = (sourceClip.endTime - sourceClip.startTime) / (sourceClip.speed || 1);
            }

            if (renderDuration <= 0) throw new Error('A fonte de áudio selecionada tem duração zero.');

            setCaptionStatus('Mixando áudio (Etapa 1/2)...');
            const highQualityContext = new OfflineAudioContext({ numberOfChannels: 1, length: Math.ceil(renderDuration * 48000), sampleRate: 48000 });
            const graph = setupAudioGraphForRendering(highQualityContext, projectState, decodedAudioBuffersRef.current, reversedAudioBuffersRef.current, captionSource);
            if (!graph) throw new Error('Não foi possível criar o gráfico de áudio.');
            graph.connect(highQualityContext.destination);
            const highQualityBuffer = await renderOfflineAudio(highQualityContext);

            setCaptionStatus('Preparando áudio para IA (Etapa 2/2)...');
            const targetSampleRate = 16000;
            const resampleContext = new OfflineAudioContext(1, Math.ceil(highQualityBuffer.duration * targetSampleRate), targetSampleRate);
            const bufferSource = resampleContext.createBufferSource();
            bufferSource.buffer = highQualityBuffer;
            bufferSource.connect(resampleContext.destination);
            bufferSource.start(0);
            const audioBuffer = await renderOfflineAudio(resampleContext);
            if (!audioBuffer) throw new Error('Não foi possível obter a fonte de áudio final.');
            
            realAudioDuration = audioBuffer.duration;
            
            const audioData = audioBuffer.getChannelData(0);

            // Audio signal normalization: boost quiet audio peaks so Whisper gets maximum acoustic clarity
            let maxAmp = 0;
            for (let i = 0; i < audioData.length; i++) {
                const abs = Math.abs(audioData[i]);
                if (abs > maxAmp) maxAmp = abs;
            }
            if (maxAmp > 0.005 && maxAmp < 0.85) {
                const gain = Math.min(8.0, 0.92 / maxAmp);
                for (let i = 0; i < audioData.length; i++) {
                    audioData[i] *= gain;
                }
            }

            // Save audio data for real-time waveform acoustic sync and re-alignments
            lastAudioDataRef.current = new Float32Array(audioData);

            worker.postMessage({ audio: audioData, modelName: captionModel, language: captionLanguage });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Erro desconhecido.";
            console.error("Caption generation failed:", error);
            setCaptionStatus(`Falha na geração: ${errorMessage}`);
            setGeneratedCaptions(null);
            setIsGeneratingCaptions(false);
        }
    }, [captionSource, projectState, createTranscriptionWorker, captionModel, captionLanguage, captionDensityMode, rechunkWordChunks]);
    
    const handleApplyCaptions = useCallback(() => {
        if (!generatedCaptions) return;
    
        updateProject(state => {
            const sourceClipOffset = captionSource !== 'master'
                ? state.timelineClips.find(c => c.id === captionSource)?.timelineStart || 0
                : 0;
    
            // Find selected preset from curated caption presets or general presets
            const preset = CAPTION_PRESET_STYLES.find(p => p.id === selectedCaptionStyleId)
                || PRESET_TEXT_STYLES.find(p => p.id === selectedCaptionStyleId)
                || CAPTION_PRESET_STYLES[0];
            const { width, height } = FORMAT_DIMENSIONS[format];

            let posY = height * 0.78; // bottom default
            if (captionVerticalPosition === 'center') posY = height * 0.44;
            else if (captionVerticalPosition === 'top') posY = height * 0.12;

            const animIn = captionAnimationIn !== 'default' ? captionAnimationIn : (preset.style.animationIn || 'none');
            const sanitizedCaptions = sanitizeCaptionTimestamps(generatedCaptions);

            // Calculate responsive font size and box height
            const baseDim = Math.min(width, height);
            const optimalFontSize = Math.round(baseDim * (format === 'tiktok' ? 0.052 : 0.045));
            const captionBoxHeight = Math.max(90, Math.round(optimalFontSize * 3.0));

            // Reuse existing caption track to keep timeline clean
            const existingCaptionTrack = state.tracks.find(t => t.name.startsWith('Legendas'));
            let targetTrack: Track;
            let updatedTracks = [...state.tracks];

            if (existingCaptionTrack) {
                targetTrack = existingCaptionTrack;
            } else {
                targetTrack = {
                    id: `track-captions-${Date.now()}`,
                    type: 'text',
                    name: 'Legendas',
                    isMuted: false,
                    volume: 1,
                    preMuteVolume: 1,
                };
                updatedTracks = [targetTrack, ...state.tracks];
            }

            // Remove previous auto-generated caption clips on this track to prevent messy overlapping
            const cleanTimelineClips = state.timelineClips.filter(c =>
                !(c.trackId === targetTrack.id && c.id.startsWith('caption-clip-'))
            );

            const newClipsData = sanitizedCaptions.map((caption, index) => ({
                id: `caption-clip-${Date.now()}-${index}`,
                trackId: targetTrack.id,
                type: 'text' as VideoClipType,
                timelineStart: sourceClipOffset + caption.start,
                startTime: 0,
                endTime: Math.max(0.2, caption.end - caption.start),
                x: width * 0.08,
                y: posY,
                width: width * 0.84,
                height: captionBoxHeight,
                rotation: 0,
                content: caption.text,
                ...preset.style,
                fontSize: optimalFontSize,
                textAlign: 'center' as const,
                animationIn: animIn as any,
                animationLoop: 'none' as any,
                animationOut: 'none' as any,
            }));

            return {
                ...state,
                tracks: updatedTracks,
                timelineClips: [...cleanTimelineClips, ...newClipsData],
                selectedClipIds: newClipsData.length > 0 ? [newClipsData[0].id] : []
            };
        });
    
        handleCloseCaptionsModal();
    }, [
        generatedCaptions,
        captionSource,
        selectedCaptionStyleId,
        captionVerticalPosition,
        captionAnimationIn,
        format,
        updateProject,
        handleCloseCaptionsModal,
        sanitizeCaptionTimestamps
    ]);

    // -- Keyboard Shortcuts --
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore shortcuts if user is typing in an input/textarea
            const target = e.target as HTMLElement;
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
                return;
            }

            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const metaKey = isMac ? e.metaKey : e.ctrlKey;
            
            switch (e.code) {
                case 'Space': e.preventDefault(); isPlaying ? pause() : play(); break;
                case 'ArrowLeft': e.preventDefault(); seek(masterCurrentTime - (e.shiftKey ? 1 : 0.1)); break;
                case 'ArrowRight': e.preventDefault(); seek(masterCurrentTime + (e.shiftKey ? 1 : 0.1)); break;
                case 'Delete':
                case 'Backspace': e.preventDefault(); handleDeleteSelectedClips(); break;
                case 'KeyZ': 
                    if (metaKey) { 
                        e.preventDefault(); 
                        e.shiftKey ? redo() : undo(); 
                    } else if (e.shiftKey) {
                        e.preventDefault();
                        // Shift+Z: Fit timeline zoom
                        const availableWidth = window.innerWidth - 300;
                        if (masterDuration > 0 && availableWidth > 0) {
                            const fitZoom = availableWidth / (masterDuration * BASE_PIXELS_PER_SECOND);
                            setTimelineZoom(Math.max(0.02, Math.min(15, Math.round(fitZoom * 100) / 100)));
                        }
                    }
                    break;
                case 'KeyY': if (metaKey) { e.preventDefault(); redo(); } break;
                case 'KeyC': if (metaKey) { e.preventDefault(); handleCopyClip(); } break;
                case 'KeyV': if (metaKey) { e.preventDefault(); handlePasteClip(); } break;
                case 'Equal':
                case 'NumpadAdd':
                    if (metaKey) {
                        e.preventDefault();
                        setTimelineZoom(z => Math.min(15, Math.round(z * 1.25 * 100) / 100));
                    }
                    break;
                case 'Minus':
                case 'NumpadSubtract':
                    if (metaKey) {
                        e.preventDefault();
                        setTimelineZoom(z => Math.max(0.02, Math.round(z * 0.8 * 100) / 100));
                    }
                    break;
                case 'Digit0':
                case 'Numpad0':
                    if (metaKey) {
                        e.preventDefault();
                        setTimelineZoom(1.0);
                    }
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying, masterCurrentTime, seek, play, pause, handleDeleteSelectedClips, undo, redo, handleCopyClip, handlePasteClip]);


    // -- Pexels API --
    const handlePexelsSearch = useCallback(async (isNewSearch: boolean) => {
        if (!pexelsSearchQuery) return;
        setIsSearchingPexels(true);
        const pageToFetch = isNewSearch ? 1 : pexelsPage;
        if (isNewSearch) {
            setPexelsPhotoResults([]);
            setPexelsVideoResults([]);
        }
        
        try {
            const url = pexelsSearchType === 'photos' 
                ? `https://api.pexels.com/v1/search?query=${encodeURIComponent(pexelsSearchQuery)}&page=${pageToFetch}&per_page=20`
                : `https://api.pexels.com/videos/search?query=${encodeURIComponent(pexelsSearchQuery)}&page=${pageToFetch}&per_page=20`;

            const response = await fetch(url, { headers: { 'Authorization': PEXELS_API_KEY }});
            if (!response.ok) throw new Error(`Pexels API error: ${response.statusText}`);
            const data = await response.json();
            
            const MAX_PEXELS_RESULTS = 100;
            if (pexelsSearchType === 'photos') {
                setPexelsPhotoResults(prev => {
                    const combined = isNewSearch ? data.photos : [...prev, ...data.photos];
                    return combined.slice(-MAX_PEXELS_RESULTS);
                });
            } else {
                setPexelsVideoResults(prev => {
                    const combined = isNewSearch ? data.videos : [...prev, ...data.videos];
                    return combined.slice(-MAX_PEXELS_RESULTS);
                });
            }
            setPexelsHasMore(data.next_page !== undefined);
            setPexelsPage(pageToFetch + 1);
        } catch(e) {
            console.error("Pexels search failed:", e);
            setProjectStatus('Falha na busca Pexels.');
        } finally {
            setIsSearchingPexels(false);
        }
    }, [pexelsSearchQuery, pexelsSearchType, pexelsPage]);

    const handleAddPexelsItemToTimeline = useCallback(async (item: PexelsPhoto | PexelsVideo) => {
        setSettingPexelsBgId(item.id);
        setProjectStatus('Baixando mídia...');
        try {
            const isVideo = 'video_files' in item;
            const url = isVideo ? item.video_files.find(f => f.quality === 'hd')?.link || item.video_files[0].link : item.src.large2x;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('Falha ao baixar mídia do Pexels.');
            const blob = await response.blob();
            
            const fileName = isVideo ? `pexels-video-${item.id}.mp4` : `pexels-photo-${item.id}.jpg`;
            const file = new File([blob], fileName, { type: blob.type });

            const fileList = new DataTransfer_Filelist();
            fileList.push(file);

            await handleAddMediaToPool(fileList.files);
            setProjectStatus('Mídia adicionada!');
            
            updateProject(state => {
                const newPoolClip = state.mediaPool.find(c => c.fileName === fileName);
                if (!newPoolClip) return state;
    
                let track: Track | undefined;
                let newState = state;

                // For both videos and photos from Pexels, place them on a video track
                // to ensure transitions can be applied.
                const result = findOrCreateTrack(state, 'video');
                newState = result.newState;
                track = result.track;

                if (!track) return newState; // Should not happen

                const { width: canvasWidth, height: canvasHeight } = FORMAT_DIMENSIONS[format];

                const newTimelineClipData = {
                    trackId: track.id, type: newPoolClip.type,
                    poolId: newPoolClip.id, src: newPoolClip.src, fileName: newPoolClip.fileName,
                    timelineStart: masterCurrentTime, startTime: 0, endTime: newPoolClip.duration,
                    duration: newPoolClip.duration, x: 0, y: 0,
                    width: canvasWidth,
                    height: canvasHeight,
                    rotation: 0, speed: 1,
                };
                return rippleInsertClips([newTimelineClipData], newState);
            });

        } catch(e) {
            console.error("Failed to add Pexels item:", e);
            setProjectStatus('Falha ao adicionar mídia.');
        } finally {
            setSettingPexelsBgId(null);
        }
    }, [handleAddMediaToPool, masterCurrentTime, format, updateProject, findOrCreateTrack, rippleInsertClips]);
    

    // --- Other Handlers & Effects ---
    const handleCloseExportModal = () => {
        setShowExportModal(false);
        if(!isExporting) {
            setExportProgress(null);
            setExportStatus('');
        }
    };
    
    const handleToggleFullscreen = () => {
        const elem = document.documentElement;
        if (!document.fullscreenElement) {
            elem.requestFullscreen().catch(err => alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`));
        } else {
            document.exitFullscreen();
        }
    };

    const handleToggleCanvasFullscreen = useCallback(() => {
        if (!canvasWrapperRef.current) return;

        if (document.fullscreenElement === canvasWrapperRef.current) {
            document.exitFullscreen();
        } else {
            canvasWrapperRef.current.requestFullscreen().catch(err => {
                console.error("Error attempting to enable fullscreen:", err);
                alert(`Não foi possível entrar em tela cheia: ${err.message}`);
            });
        }
    }, []);

    const handleCopyPix = () => {
        navigator.clipboard.writeText(PIX_KEY).then(() => {
            setPixCopied(true);
            setTimeout(() => setPixCopied(false), 2000);
        });
    };

    useEffect(() => {
        const handler = () => {
            setIsFullscreen(!!document.fullscreenElement);
            setIsCanvasFullscreen(document.fullscreenElement === canvasWrapperRef.current);
        }
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (fileMenuRef.current && !fileMenuRef.current.contains(event.target as Node)) {
                setFileMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    
  const timelineZoomRef = useRef(timelineZoom);
  timelineZoomRef.current = timelineZoom;
  const contentDurationRef = useRef(contentDuration);
  contentDurationRef.current = contentDuration;
  const masterDurationRef = useRef(masterDuration);
  masterDurationRef.current = masterDuration;

  // -- Playback Loop --
  useEffect(() => {
      if (!isPlaying) {
          if (animationFrameIdRef.current) {
              cancelAnimationFrame(animationFrameIdRef.current);
          }
          canvasRef.current?.pauseAllVideos();
          playingVideosRef.current.clear();
          return;
      }

      const loop = (time: number) => {
          if (!isPlaying) return;

          const elapsed = Math.min(0.1, Math.max(0, (time - lastFrameTimeRef.current) / 1000));
          const currentProjectState = projectStateRef.current;
          const { scene, tracks, timelineClips, selectedClipIds, timelineTransitions, mediaPool } = currentProjectState;
          const projectStateForFrame: ProjectState = { scene, tracks, timelineClips, selectedClipIds, timelineTransitions, mediaPool, selectedTrackIds: [] };

          const cDur = contentDurationRef.current;
          const mDur = masterDurationRef.current;
          const effectiveDuration = cDur > 0 ? cDur : mDur;
          
          let currentTimelineTime: number;
          if (audioContextRef.current && audioContextRef.current.state === 'running' && playbackAudioStartContextTimeRef.current > 0) {
              const audioElapsed = audioContextRef.current.currentTime - playbackAudioStartContextTimeRef.current;
              currentTimelineTime = playbackAudioStartTimeRef.current + audioElapsed;
          } else {
              const elapsed = Math.min(0.1, Math.max(0, (time - lastFrameTimeRef.current) / 1000));
              currentTimelineTime = playbackTimeRef.current + elapsed;
          }
          const newTime = Math.min(Math.max(0, currentTimelineTime), effectiveDuration);
          playbackTimeRef.current = newTime;
          
          if (timeDisplayRef.current) {
              timeDisplayRef.current.textContent = formatTime(newTime);
          }
          if (playheadRef.current) {
              const pixelsPerSecond = BASE_PIXELS_PER_SECOND * timelineZoomRef.current;
              playheadRef.current.style.left = `${newTime * pixelsPerSecond}px`;
          }

          const visibleVideoClips = new Set<string>();
          timelineClips.forEach(clip => {
              const src = clip.src || mediaPool.find(mp => mp.id === clip.poolId)?.src;
              if (clip.type === 'video' && src) {
                  const clipEnd = clip.timelineStart + (clip.endTime - clip.startTime) / (clip.speed || 1);
                  const hasNextClipAtSameTrack = timelineClips.some(other => other.id !== clip.id && other.trackId === clip.trackId && Math.abs(other.timelineStart - clipEnd) < 0.05);
                  const isDirectlyActive = newTime >= clip.timelineStart && (newTime < clipEnd || (newTime <= clipEnd && !hasNextClipAtSameTrack));

                  const isPartOfTransition = timelineTransitions.some(t => {
                      if (t.clipBId === clip.id) {
                          const clipA = timelineClips.find(c => c.id === t.clipAId);
                          if (!clipA) return false;
                          const transitionEnd = clipA.timelineStart + (clipA.endTime - clipA.startTime) / (clipA.speed || 1);
                          const transitionStart = transitionEnd - t.duration;
                          return newTime >= transitionStart && newTime <= transitionEnd;
                      }
                      if (t.clipAId === clip.id) {
                          const transitionEnd = clipEnd;
                          const transitionStart = transitionEnd - t.duration;
                          return newTime >= transitionStart && newTime <= transitionEnd;
                      }
                      return false;
                  });

                  if (isDirectlyActive || isPartOfTransition) {
                      visibleVideoClips.add(clip.id);
                  }
              }
          });

          // Identify active media sources so we do not pause shared elements during split/cut transitions
          const activeMediaSources = new Set<string>();
          visibleVideoClips.forEach(clipId => {
              const clip = timelineClips.find(c => c.id === clipId);
              if (clip) {
                  activeMediaSources.add(clip.id);
                  if (clip.src) activeMediaSources.add(clip.src);
                  if (clip.poolId) activeMediaSources.add(clip.poolId);
              }
          });

          const videosToPause = [...playingVideosRef.current].filter(clipId => !visibleVideoClips.has(clipId));

          if (videosToPause.length > 0) {
              canvasRef.current?.pauseVideosByIds(videosToPause);
          }

          // Pre-cue upcoming video clips that are not currently playing/active
          timelineClips.forEach(clip => {
              if (clip.type === 'video' && clip.timelineStart > newTime && clip.timelineStart - newTime <= 3.0) {
                  const src = clip.src || mediaPool.find(mp => mp.id === clip.poolId)?.src;
                  if (src && !activeMediaSources.has(src) && !activeMediaSources.has(clip.id)) {
                      canvasRef.current?.precueVideoClip?.(clip, clip.startTime);
                  }
              }
          });

          visibleVideoClips.forEach(clipId => {
              const clip = timelineClips.find(c => c.id === clipId);
              if (clip) {
                  const timeInClip = newTime - clip.timelineStart;
                  if (!playingVideosRef.current.has(clipId)) {
                      canvasRef.current?.playVideoAtTime(clip, timeInClip);
                  } else {
                      canvasRef.current?.syncVideoAtTime(clip, timeInClip);
                  }
              }
          });

          playingVideosRef.current = visibleVideoClips;

          const staticSilentFreq = freqDataBufferRef.current || new Uint8Array(512);
          const staticSilentTime = timeDomainDataBufferRef.current || new Uint8Array(1024).fill(128);

          if (masterAnalyserRef.current) {
            const binCount = masterAnalyserRef.current.frequencyBinCount;
            const fftSize = masterAnalyserRef.current.fftSize;
            if (!freqDataBufferRef.current || freqDataBufferRef.current.length !== binCount) {
              freqDataBufferRef.current = new Uint8Array(binCount);
            }
            if (!timeDomainDataBufferRef.current || timeDomainDataBufferRef.current.length !== fftSize) {
              timeDomainDataBufferRef.current = new Uint8Array(fftSize);
            }
            masterAnalyserRef.current.getByteFrequencyData(freqDataBufferRef.current);
            masterAnalyserRef.current.getByteTimeDomainData(timeDomainDataBufferRef.current);
            
            canvasRef.current?.drawForPlayback(projectStateForFrame, { freqData: freqDataBufferRef.current, timeDomainData: timeDomainDataBufferRef.current }, newTime);
          } else {
            canvasRef.current?.drawForPlayback(projectStateForFrame, { freqData: staticSilentFreq, timeDomainData: staticSilentTime }, newTime);
          }

          if (newTime >= effectiveDuration) {
              canvasRef.current?.pauseAllVideos();
              playingVideosRef.current.clear();
              setIsPlaying(false);
              setMasterCurrentTime(effectiveDuration);
          } else {
              lastFrameTimeRef.current = time;
              animationFrameIdRef.current = requestAnimationFrame(loop);
          }
      };

      lastFrameTimeRef.current = performance.now();
      animationFrameIdRef.current = requestAnimationFrame(loop);

      return () => {
          if (animationFrameIdRef.current) {
              cancelAnimationFrame(animationFrameIdRef.current);
          }
          canvasRef.current?.pauseAllVideos();
          playingVideosRef.current.clear();
      };
  }, [isPlaying]);

  // -- Scrubbing and Static Preview Redraw --
  useEffect(() => {
      if (!isPlaying) {
          const { scene, tracks, timelineClips, selectedClipIds, timelineTransitions, mediaPool } = projectState;
          const projectStateForFrame: ProjectState = { scene, tracks, timelineClips, selectedClipIds, timelineTransitions, mediaPool, selectedTrackIds: [] };
          const requestId = Date.now();
          const silentFrame = { freqData: new Uint8Array(512), timeDomainData: new Uint8Array(1024).fill(128) };
          canvasRef.current?.drawForScrubbing(projectStateForFrame, silentFrame, masterCurrentTime, requestId);
      }
  }, [isPlaying, masterCurrentTime, projectState]);

  const allProps = { ...props, ...{
    projectState, masterCurrentTime, masterDuration, isPlaying, zoom, timelineZoom, previewQuality, showExportModal, exportProgress, exportStatus, isExporting, isFileMenuOpen, isFullscreen, isSavingProject, isLoadingProject, projectStatus, pixCopied, isSpectrumModalOpen, isShapeModalOpen, isEmojiModalOpen, isStickerModalOpen, editingTransitionTarget, defaultTransition, isSnappingEnabled, contentDuration,
    isCanvasFullscreen, handleToggleCanvasFullscreen,
    isLeftPanelCollapsed, isRightPanelCollapsed, toggleLeftPanel, toggleRightPanel,
    handleInteractionStart, handleInteractionEnd, undo, redo, canUndo, canRedo, setZoom, onSetTimelineZoom: setTimelineZoom, setShowExportModal, setFileMenuOpen, setIsSnappingEnabled,
    fileMenuRef, canvasWrapperRef, canvasRef, playheadRef, timeDisplayRef, leftPanelWidth, rightPanelWidth, timelineHeight, isResizing, fitScale,
    findClipForTimestamp, editingTransition, captionClips, handleLeftPanelResize, handleRightPanelResize, handleTimelineResize, handleAddTextClip, handleAddSpectrumClip, handleAddShapeClip, handleAddEmojiClip, handleAddStickerClip, handleUpdateScene, handleUpdateClip, handleUpdateMultipleClips, handleSelectClip, handleTrackSelection, handleAddMediaToPool, handleAddRecordedAudio, handleAddClipToTrack, handleAddClipAtPlayhead, handleSplitClipAtPlayhead, handleDeleteSelectedClips, handleAddTrack, handleReorderTracks, handleRenameTrack, handleDeleteTrack, handleToggleMuteTrack, handleSetTrackVolume, handleAddOrUpdateTransition, handleDeleteTransition, handleApplyTransitionToAll,
    pause, seek, stop, play, onMoveClips, onTrimClip, handleExport, handleSaveProject, handleSaveProjectAs, handleLoadProject, handleCopyPix, handleCloseExportModal, handleToggleFullscreen, hasAudioClip, audioClipsOnTimeline, handleFileChange, setIsSpectrumModalOpen, setIsShapeModalOpen, setIsEmojiModalOpen, setIsStickerModalOpen, setEditingTransitionTarget, setDefaultTransition, handleDuplicateSelectedTracks,
    pexelsSearchQuery, setPexelsSearchQuery, pexelsPhotoResults, pexelsVideoResults, isSearchingPexels, pexelsHasMore, settingPexelsBgId, handlePexelsSearch, handleAddPexelsItemToTimeline, pexelsSearchType, setPexelsSearchType,
    copiedClip, handleCopyClip, handlePasteClip, clipboardStatus,
    isCaptionsModalOpen, setIsCaptionsModalOpen, handleCloseCaptionsModal, isGeneratingCaptions, captionStatus, captionSource, setCaptionSource, handleGenerateCaptions,
    generatedCaptions, selectedCaptionStyleId, setSelectedCaptionStyleId, handleApplyCaptions,
    captionModel, setCaptionModel, captionLanguage, setCaptionLanguage,
    captionDensityMode, setCaptionDensityMode, handleDensityChange,
    captionVerticalPosition, setCaptionVerticalPosition,
    captionAnimationIn, setCaptionAnimationIn,
    captionSyncOffsetMs, handleNudgeSync, handleResetSync, handleRealignWithAudioEnergy,
    handleExportSRT, handleImportSRTFile,
    handleUpdateCaptionText, handleUpdateCaptionStart, handleUpdateCaptionEnd,
    handleDeleteCaptionLine, handleMergeCaptionWithNext, handleAddCaptionLineAfter,
    findText, setFindText, replaceText, setReplaceText, handleBulkReplace, handleAutoCorrectCaptions,
    handleSelectAllClipsOnTrack,
    formatTime,
    onBack: handleRequestClose,
    isSaveBeforeExitModalOpen,
    setIsSaveBeforeExitModalOpen,
    isSavingAndExiting,
    handleConfirmSaveAndExit,
    handleConfirmExitWithoutSaving,
    hasUnsavedChanges,
  }};

  if (isMobile) {
    return <MobileEditor onBack={handleRequestClose} />;
  }

  return <DesktopEditor {...allProps} />;
};
