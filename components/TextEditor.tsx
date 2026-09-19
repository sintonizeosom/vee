
import React from 'react';
import { VideoClip, TextInAnimation, TextOutAnimation, TextLoopAnimation } from '../types';
import { AVAILABLE_FONTS, FONT_GROUPS, PRESET_TEXT_STYLES, hexToRgba } from '../constants';
import { Type, MoveUp, MoveLeft, Eye, ZoomIn, Repeat, ArrowUpRight, Aperture, Sparkles, ScrollText, X, ChevronsUp, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

interface TextEditorProps {
    selectedClips: VideoClip[];
    updateClips: (newProps: Partial<VideoClip>) => void;
    onInteractionStart: () => void;
    onInteractionEnd: () => void;
}

interface AnimationPreset {
    name: string;
    animationClass: string;
    settings: {
        animationIn?: TextInAnimation;
        animationInDuration?: number;
        animationOut?: TextOutAnimation;
        animationOutDuration?: number;
        animationLoop?: TextLoopAnimation;
    };
}

const ToggleButton: React.FC<{ isEnabled: boolean; isIndeterminate?: boolean; onClick: () => void; children: React.ReactNode }> = ({ isEnabled, isIndeterminate, onClick, children }) => (
    <button onClick={onClick} className={`w-full text-left p-1.5 rounded-md text-sm font-medium flex items-center justify-between ${isEnabled && !isIndeterminate ? 'bg-violet-600 text-white' : 'bg-gray-800 hover:bg-gray-700'} transition-colors`}>
        <span>{children}</span>
        <div className={`w-10 h-5 flex items-center rounded-full p-1 duration-300 ease-in-out ${isIndeterminate ? 'bg-gray-500' : isEnabled ? 'bg-violet-400' : 'bg-gray-600'}`}>
            <div className={`bg-white w-3 h-3 rounded-full shadow-md transform duration-300 ease-in-out ${isIndeterminate ? 'translate-x-[9px]' : isEnabled ? 'translate-x-5' : ''}`}></div>
        </div>
    </button>
);

const LabeledSlider: React.FC<{ label: string; value: any; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; onMouseDown: () => void; onMouseUp: () => void; min?: number; max?: number; step?: number }> = ({ label, value, onChange, onMouseDown, onMouseUp, min = 0, max = 20, step = 1 }) => {
    const isIndeterminate = value === 'IS_MULTIPLE';
    const displayValue = isIndeterminate ? min : (value ?? min);

    return (
    <div>
        <label className="block text-xs font-medium text-gray-400 mb-1 flex justify-between">
            <span>{label}</span>
            <span>{isIndeterminate ? 'Múltiplos' : `${value ?? 0}px`}</span>
        </label>
        <input type="range" value={displayValue} onChange={onChange} onMouseDown={onMouseDown} onMouseUp={onMouseUp} min={min} max={max} step={step} className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${isIndeterminate ? 'bg-gray-500' : 'bg-gray-700'}`} />
    </div>
    );
};


const ANIMATION_PRESETS: AnimationPreset[] = [
  { name: '🎬 Créditos Cinema', animationClass: 'anim-preview-credits-roll', settings: { animationIn: 'none', animationOut: 'none', animationLoop: 'credits-roll' } },
  { name: '🌌 Star Wars 3D', animationClass: 'anim-preview-star-wars', settings: { animationIn: 'none', animationOut: 'none', animationLoop: 'credits-star-wars' } },
  { name: '📜 Teleprompter', animationClass: 'anim-preview-credits-roll', settings: { animationIn: 'none', animationOut: 'none', animationLoop: 'teleprompter-roll' } },
  { name: '🎥 Créditos Lentos', animationClass: 'anim-preview-credits-roll', settings: { animationIn: 'none', animationOut: 'none', animationLoop: 'credits-slow' } },
  { name: 'Nenhuma', animationClass: '', settings: { animationIn: 'none', animationOut: 'none', animationLoop: 'none' } },
  { name: 'Surgir', animationClass: 'anim-preview-fade', settings: { animationIn: 'fade', animationInDuration: 0.8, animationOut: 'fade', animationOutDuration: 0.8, animationLoop: 'none' } },
  { name: 'Digitação', animationClass: '', settings: { animationIn: 'typewriter', animationInDuration: 1.5, animationOut: 'fade', animationOutDuration: 0.5, animationLoop: 'none' } },
  { name: 'Balanço 3D', animationClass: 'anim-preview-swing-in', settings: { animationIn: 'swing-in', animationInDuration: 1.0, animationOut: 'fade-zoom-out', animationOutDuration: 0.6, animationLoop: 'none' } },
  { name: 'Spin & Quique', animationClass: 'anim-preview-spin-bounce', settings: { animationIn: 'spin-bounce-in', animationInDuration: 1.1, animationOut: 'implode-out', animationOutDuration: 0.6, animationLoop: 'none' } },
  { name: 'Flip 3D', animationClass: 'anim-preview-flip-3d', settings: { animationIn: 'perspective-flip-in', animationInDuration: 0.9, animationOut: 'perspective-flip-out', animationOutDuration: 0.7, animationLoop: 'none' } },
  { name: 'Queda Impacto', animationClass: 'anim-preview-drop-impact', settings: { animationIn: 'drop-impact-in', animationInDuration: 1.0, animationOut: 'blur-drop-out', animationOutDuration: 0.6, animationLoop: 'none' } },
  { name: 'Glitch Reveal', animationClass: '', settings: { animationIn: 'glitch-reveal-in', animationInDuration: 1.2, animationOut: 'glitch-out', animationOutDuration: 0.6, animationLoop: 'none' } },
  { name: 'Cortina Exp.', animationClass: '', settings: { animationIn: 'curtain-expand-in', animationInDuration: 1.0, animationOut: 'fade', animationOutDuration: 0.5, animationLoop: 'none' } },
  { name: 'Neon Piscante', animationClass: '', settings: { animationIn: 'neon-flicker-in', animationInDuration: 1.2, animationOut: 'flicker-out', animationOutDuration: 0.6, animationLoop: 'pulse-glow' } },
  { name: 'Fumaça Suave', animationClass: '', settings: { animationIn: 'smoke-dissolve-in', animationInDuration: 1.2, animationOut: 'blur-out', animationOutDuration: 0.7, animationLoop: 'none' } },
  { name: 'Cyber Decode', animationClass: '', settings: { animationIn: 'cyber-decode-in', animationInDuration: 1.4, animationOut: 'glitch-out', animationOutDuration: 0.5, animationLoop: 'none' } },
  { name: 'Letras (Subir)', animationClass: '', settings: { animationIn: 'slide-in-up-by-char', animationInDuration: 1.2, animationOut: 'fade', animationOutDuration: 0.5, animationLoop: 'none' } },
  { name: 'Letras (Girar)', animationClass: '', settings: { animationIn: 'zoom-rotate-by-char', animationInDuration: 1.3, animationOut: 'fade', animationOutDuration: 0.5, animationLoop: 'none' } },
  { name: 'Letras (Onda)', animationClass: '', settings: { animationIn: 'wave-enter-by-char', animationInDuration: 1.2, animationOut: 'fade', animationOutDuration: 0.5, animationLoop: 'none' } },
  { name: 'Foco (Blur)', animationClass: 'anim-preview-blur-in', settings: { animationIn: 'blur-in', animationInDuration: 1.0, animationOut: 'fade', animationOutDuration: 0.5, animationLoop: 'none' } },
  { name: 'Deslizar Esq.', animationClass: 'anim-preview-slide-in-left', settings: { animationIn: 'slide-in-left', animationInDuration: 0.8, animationOut: 'slide-out-right', animationOutDuration: 0.8, animationLoop: 'none' } },
  { name: 'Deslizar Cima', animationClass: 'anim-preview-slide-in-up', settings: { animationIn: 'slide-in-up', animationInDuration: 0.8, animationOut: 'slide-out-down', animationOutDuration: 0.8, animationLoop: 'none' } },
  { name: 'Revelar Cima', animationClass: 'anim-preview-reveal-up', settings: { animationIn: 'reveal-up', animationInDuration: 1.0, animationOut: 'fade', animationOutDuration: 0.5, animationLoop: 'none' } },
  { name: 'Zoom In', animationClass: 'anim-preview-zoom-in', settings: { animationIn: 'zoom-in', animationInDuration: 0.7, animationOut: 'zoom-out', animationOutDuration: 0.7, animationLoop: 'none' } },
  { name: 'Inclinado', animationClass: 'anim-preview-skew-in', settings: { animationIn: 'skew-in', animationInDuration: 0.8, animationOut: 'blur-out', animationOutDuration: 0.6, animationLoop: 'none' } },
  { name: 'Elástico', animationClass: 'anim-preview-elastic-in', settings: { animationIn: 'elastic-in', animationInDuration: 1.0, animationOut: 'zoom-out', animationOutDuration: 0.6, animationLoop: 'none' } },
  { name: 'Espaçamento', animationClass: 'anim-preview-tracking-expand', settings: { animationIn: 'tracking-expand', animationInDuration: 1.1, animationOut: 'fade', animationOutDuration: 0.5, animationLoop: 'none' } },
  { name: 'Girar Ent.', animationClass: 'anim-preview-rotate-in', settings: { animationIn: 'rotate-in', animationInDuration: 0.9, animationOut: 'spin-out', animationOutDuration: 0.7, animationLoop: 'none' } },
  { name: 'Flicker', animationClass: 'anim-preview-flicker-in', settings: { animationIn: 'flicker-in', animationInDuration: 1.0, animationOut: 'flicker-out', animationOutDuration: 0.6, animationLoop: 'none' } },
  { name: 'Cascata (Palavra)', animationClass: '', settings: { animationIn: 'word-slide-down-by-word', animationInDuration: 1.2, animationOut: 'fade', animationOutDuration: 0.5, animationLoop: 'none' } },
  { name: 'Flip 3D (Palavra)', animationClass: '', settings: { animationIn: 'word-3d-flip-by-word', animationInDuration: 1.3, animationOut: 'fade', animationOutDuration: 0.5, animationLoop: 'none' } },
  { name: 'Pop (Palavra)', animationClass: '', settings: { animationIn: 'pop-in-by-word', animationInDuration: 1.2, animationOut: 'fade', animationOutDuration: 0.5, animationLoop: 'none' } },
  { name: 'Surgir (Palavra)', animationClass: '', settings: { animationIn: 'fade-in-by-word', animationInDuration: 1.2, animationOut: 'fade', animationOutDuration: 0.5, animationLoop: 'none' } },
  { name: 'Deslizar (Palavra)', animationClass: '', settings: { animationIn: 'slide-in-up-by-word', animationInDuration: 1.2, animationOut: 'fade', animationOutDuration: 0.5, animationLoop: 'none' } },
  { name: 'Quicar (Palavra)', animationClass: '', settings: { animationIn: 'bounce-in-by-word', animationInDuration: 1.2, animationOut: 'fade', animationOutDuration: 0.5, animationLoop: 'none' } },
  { name: 'Girar (Palavra)', animationClass: '', settings: { animationIn: 'rotate-in-by-word', animationInDuration: 1.2, animationOut: 'fade', animationOutDuration: 0.5, animationLoop: 'none' } },
  { name: 'Glow (Palavra)', animationClass: '', settings: { animationIn: 'color-glow-by-word', animationInDuration: 1.4, animationOut: 'fade', animationOutDuration: 0.5, animationLoop: 'none' } },
  { name: 'Flicker (Palavra)', animationClass: '', settings: { animationIn: 'flicker-by-word', animationInDuration: 1.3, animationOut: 'fade', animationOutDuration: 0.5, animationLoop: 'none' } },
  { name: 'Batimento', animationClass: 'anim-preview-heartbeat', settings: { animationIn: 'fade', animationInDuration: 0.5, animationOut: 'fade', animationOutDuration: 0.5, animationLoop: 'heartbeat' } },
  { name: 'Wobble 3D', animationClass: 'anim-preview-wobble', settings: { animationIn: 'fade', animationInDuration: 0.5, animationOut: 'fade', animationOutDuration: 0.5, animationLoop: 'wobble' } },
  { name: 'Respiração', animationClass: 'anim-preview-breath', settings: { animationIn: 'fade', animationInDuration: 0.5, animationOut: 'fade', animationOutDuration: 0.5, animationLoop: 'breath' } },
  { name: 'Shimmer Wave', animationClass: 'anim-preview-shimmer', settings: { animationIn: 'none', animationOut: 'fade', animationOutDuration: 0.5, animationLoop: 'shimmer-wave' } },
  { name: 'Flutuar 3D', animationClass: 'anim-preview-float', settings: { animationIn: 'fade', animationInDuration: 0.5, animationOut: 'fade', animationOutDuration: 0.5, animationLoop: 'float-rotate-3d' } },
  { name: 'Pulso Neon', animationClass: 'anim-preview-pulse', settings: { animationIn: 'fade', animationInDuration: 0.5, animationOut: 'fade', animationOutDuration: 0.5, animationLoop: 'pulse-glow' } },
  { name: 'Pulsar', animationClass: 'anim-preview-pulse', settings: { animationIn: 'fade', animationInDuration: 0.5, animationOut: 'fade', animationOutDuration: 0.5, animationLoop: 'pulse' } },
  { name: 'Quicar', animationClass: 'anim-preview-bounce', settings: { animationIn: 'fade', animationInDuration: 0.5, animationOut: 'fade', animationOutDuration: 0.5, animationLoop: 'bounce' } },
  { name: 'Vibrar', animationClass: 'anim-preview-jitter', settings: { animationIn: 'fade', animationInDuration: 0.5, animationOut: 'fade', animationOutDuration: 0.5, animationLoop: 'jitter' } },
  { name: 'Flutuar', animationClass: 'anim-preview-float', settings: { animationIn: 'fade', animationInDuration: 0.5, animationOut: 'fade', animationOutDuration: 0.5, animationLoop: 'float' } },
  { name: 'Onda', animationClass: 'anim-preview-wave', settings: { animationIn: 'fade', animationInDuration: 0.5, animationOut: 'fade', animationOutDuration: 0.5, animationLoop: 'wave' } },
  { name: 'Arco-íris', animationClass: 'anim-preview-rainbow', settings: { animationIn: 'none', animationOut: 'fade', animationOutDuration: 0.5, animationLoop: 'rainbow' } },
  { name: 'Glitch Loop', animationClass: 'anim-preview-glitch-loop', settings: { animationIn: 'fade', animationInDuration: 0.5, animationOut: 'fade', animationOutDuration: 0.5, animationLoop: 'glitch-loop' } },
];

const animationToClassMap: Record<string, string> = {
    'fade': 'anim-preview-fade',
    'slide-in-up': 'anim-preview-slide-in-up',
    'slide-in-left': 'anim-preview-slide-in-left',
    'zoom-in': 'anim-preview-zoom-in',
    'reveal-up': 'anim-preview-reveal-up',
    'blur-in': 'anim-preview-blur-in',
    'pulse': 'anim-preview-pulse',
    'bounce': 'anim-preview-bounce',
    'typewriter': 'anim-preview-typing',
    'glow': 'anim-preview-glow',
    'skew-in': 'anim-preview-skew-in',
    'elastic-in': 'anim-preview-elastic-in',
    'tracking-expand': 'anim-preview-tracking-expand',
    'rotate-in': 'anim-preview-rotate-in',
    'flicker-in': 'anim-preview-flicker-in',
    'jitter': 'anim-preview-jitter',
    'float': 'anim-preview-float',
    'wave': 'anim-preview-wave',
    'rainbow': 'anim-preview-rainbow',
    'glitch-loop': 'anim-preview-glitch-loop',
    'swing-in': 'anim-preview-swing-in',
    'spin-bounce-in': 'anim-preview-spin-bounce',
    'perspective-flip-in': 'anim-preview-flip-3d',
    'drop-impact-in': 'anim-preview-drop-impact',
    'heartbeat': 'anim-preview-heartbeat',
    'wobble': 'anim-preview-wobble',
    'shimmer-wave': 'anim-preview-shimmer',
    'breath': 'anim-preview-breath',
    'credits-roll': 'anim-preview-credits-roll',
    'scroll-up': 'anim-preview-credits-roll',
    'credits-slow': 'anim-preview-credits-roll',
    'teleprompter-roll': 'anim-preview-credits-roll',
    'credits-star-wars': 'anim-preview-star-wars',
};

export const TextEditor: React.FC<TextEditorProps> = ({ selectedClips, updateClips, onInteractionStart, onInteractionEnd }) => {

    const commonProps = React.useMemo(() => {
        if (selectedClips.length === 0) return {} as Partial<VideoClip>;
        if (selectedClips.length === 1) return selectedClips[0];
        
        const firstClip = selectedClips[0];
        const common: { [key: string]: any } = {};
        const keys: (keyof VideoClip)[] = [ 'content', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'textAlign', 'letterSpacing', 'textTransform', 'textDecoration', 'color', 'textShadow', 'textShadowColor', 'textShadowBlur', 'textShadowOffsetX', 'textShadowOffsetY', 'textStroke', 'textStrokeColor', 'textStrokeWidth', 'animationIn', 'animationOut', 'animationLoop' ];
        
        for (const key of keys) {
            const firstValue = firstClip[key];
            if (selectedClips.every(clip => clip[key] === firstValue)) {
                common[key] = firstValue;
            } else {
                 common[key] = 'IS_MULTIPLE';
            }
        }
        return common as Partial<VideoClip>;
    }, [selectedClips]);

    const handleUpdate = (newProps: Partial<VideoClip>) => {
        updateClips(newProps);
    };

    const isMultiSelect = selectedClips.length > 1;

    // --- Prop states for multi-select ---
    const isContentMultiple = (commonProps as any).content === 'IS_MULTIPLE';
    const isFontFamilyMultiple = (commonProps as any).fontFamily === 'IS_MULTIPLE';
    const isColorMultiple = (commonProps as any).color === 'IS_MULTIPLE';
    const isFontSizeMultiple = (commonProps as any).fontSize === 'IS_MULTIPLE';
    const isFontWeightMultiple = (commonProps as any).fontWeight === 'IS_MULTIPLE';
    const isTextAlignMultiple = (commonProps as any).textAlign === 'IS_MULTIPLE';
    const isStrokeMultiple = (commonProps as any).textStroke === 'IS_MULTIPLE';
    const isStrokeColorMultiple = (commonProps as any).textStrokeColor === 'IS_MULTIPLE';
    const isStrokeWidthMultiple = (commonProps as any).textStrokeWidth === 'IS_MULTIPLE';
    const isShadowMultiple = (commonProps as any).textShadow === 'IS_MULTIPLE';
    const isShadowColorMultiple = (commonProps as any).textShadowColor === 'IS_MULTIPLE';

    // Helper for current animation state (with multi-select support)
    const currentAnim = React.useMemo(() => {
        if (selectedClips.length === 0) return { in: 'none', out: 'none', loop: 'none' };
        return {
            in: (commonProps as any).animationIn === 'IS_MULTIPLE' ? 'IS_MULTIPLE' : (selectedClips[0].animationIn || 'none'),
            out: (commonProps as any).animationOut === 'IS_MULTIPLE' ? 'IS_MULTIPLE' : (selectedClips[0].animationOut || 'none'),
            loop: (commonProps as any).animationLoop === 'IS_MULTIPLE' ? 'IS_MULTIPLE' : (selectedClips[0].animationLoop || 'none')
        };
    }, [selectedClips, commonProps]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-violet-300">EDITAR TEXTO ({selectedClips.length})</h3>
                {isMultiSelect && (
                    <span className="text-[10px] uppercase font-bold tracking-wider bg-violet-600/30 text-violet-400 px-2 py-0.5 rounded-full border border-violet-500/30 animate-pulse">
                        Modo Lote
                    </span>
                )}
            </div>

            {isMultiSelect && (
                <div className="bg-gradient-to-r from-violet-950/40 to-[#1e1b4b]/40 border border-violet-500/20 rounded-md p-2.5 text-xs text-violet-300/95 space-y-1">
                    <p className="font-semibold flex items-center gap-1">
                        <Sparkles size={12} className="text-violet-400" /> Edição em Lote Ativa ({selectedClips.length} itens)
                    </p>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                        Qualquer estilo ou animação que você alterar abaixo será aplicado instantaneamente a todos os clipes de legenda selecionados.
                    </p>
                </div>
            )}
            
            <div className="space-y-4">
                <div>
                    <label htmlFor="text-content" className="block text-xs font-medium text-gray-400 mb-1">Conteúdo</label>
                    <textarea
                        id="text-content"
                        rows={3}
                        value={isContentMultiple ? '(Vários valores)' : commonProps.content || ''}
                        onChange={(e) => handleUpdate({ content: e.target.value })}
                        className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-sm focus:ring-violet-500 focus:border-violet-500 resize-y"
                        disabled={isContentMultiple}
                        placeholder={isContentMultiple ? "Edição de conteúdo em massa não suportada" : ""}
                    />
                </div>

                {/* PRESETS GRID */}
                <div className="border-b border-gray-700 pb-4 mb-4">
                    <label className="block text-xs font-medium text-gray-400 mb-2">Estilos Prontos</label>
                    <div className="grid grid-cols-auto-fit-60 gap-2 max-h-40 overflow-y-auto pr-1">
                        {PRESET_TEXT_STYLES.map((preset) => {
                            const animationClass = animationToClassMap[preset.style.animationIn as string] || animationToClassMap[preset.style.animationLoop as string] || '';
                            
                            // Build inline styles for preview
                            const inlineStyle: React.CSSProperties = {
                                fontFamily: preset.style.fontFamily,
                                fontWeight: preset.style.fontWeight,
                                fontStyle: preset.style.fontStyle,
                                letterSpacing: `${preset.style.letterSpacing || 0}px`,
                                textTransform: preset.style.textTransform as any,
                                textDecoration: preset.style.textDecoration as any,
                                textShadow: preset.style.textShadow ? `${preset.style.textShadowOffsetX || 0}px ${preset.style.textShadowOffsetY || 0}px ${preset.style.textShadowBlur || 0}px ${preset.style.textShadowColor}` : 'none',
                                WebkitTextStroke: preset.style.textStroke ? `${preset.style.textStrokeWidth || 0}px ${preset.style.textStrokeColor}` : 'unset',
                                fontSize: '26px', // Larger font size for "Aa"
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
                            
                            if (preset.style.animationLoop === 'glow') {
                                const glowColor1 = hexToRgba(preset.raw.shadow.color, preset.raw.shadow.opacity);
                                const glowColor2 = glowColor1.replace(/, ?(\d?\.?\d*)\)$/, (_, alpha) => `, ${Math.max(0, parseFloat(alpha) - 0.3)})`);
                                (inlineStyle as any)['--glow-color-1'] = glowColor1;
                                (inlineStyle as any)['--glow-color-2'] = glowColor2;
                            }

                            return (
                                <button
                                    key={preset.id}
                                    onClick={() => handleUpdate(preset.style)}
                                    title={preset.name}
                                    className="aspect-square flex items-center justify-center text-center p-1 rounded-md transition-all bg-gray-700/50 border-2 border-transparent hover:border-violet-500 group overflow-hidden relative"
                                >
                                    <span style={inlineStyle} className={`pointer-events-none ${animationClass}`}>
                                        Aa
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label htmlFor="font-family" className="block text-xs font-medium text-gray-400 mb-1">Fonte</label>
                        <select
                            id="font-family"
                            value={isFontFamilyMultiple ? '' : commonProps.fontFamily}
                            onChange={(e) => handleUpdate({ fontFamily: e.target.value })}
                            className="w-full bg-gray-800 border border-gray-600 rounded-md p-1.5 text-sm text-white focus:outline-none focus:border-violet-500"
                        >
                            {isFontFamilyMultiple && <option value="">(Vários)</option>}
                            {FONT_GROUPS.map((group) => (
                                <optgroup key={group.category} label={group.category} className="bg-gray-900 text-violet-300 font-bold">
                                    {group.fonts.map((font) => (
                                        <option key={`${group.category}-${font}`} value={font} style={{ fontFamily: font }} className="bg-gray-800 text-white font-normal">
                                            {font}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="text-color" className="block text-xs font-medium text-gray-400 mb-1">Cor</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                id="text-color"
                                value={isColorMultiple ? '#ffffff' : commonProps.color || '#ffffff'}
                                onChange={(e) => handleUpdate({ color: e.target.value, fillGradient: undefined })}
                                onFocus={onInteractionStart}
                                onBlur={onInteractionEnd}
                                className="w-8 h-8 bg-transparent border-none rounded cursor-pointer"
                            />
                            <span className="text-xs text-gray-400">{isColorMultiple ? 'Misto' : commonProps.color}</span>
                        </div>
                    </div>
                </div>

                <LabeledSlider label="Tamanho" value={isFontSizeMultiple ? 'IS_MULTIPLE' : commonProps.fontSize} onChange={(e) => handleUpdate({ fontSize: parseInt(e.target.value) })} onMouseDown={onInteractionStart} onMouseUp={onInteractionEnd} min={10} max={400} />
                
                <div className="flex gap-2 pt-1">
                    <button 
                        onClick={() => handleUpdate({ textAlign: 'left' })} 
                        className={`flex-1 p-1.5 rounded flex justify-center ${commonProps.textAlign === 'left' && !isTextAlignMultiple ? 'bg-violet-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                        title="Esquerda"
                    >
                        <AlignLeft size={16} />
                    </button>
                    <button 
                        onClick={() => handleUpdate({ textAlign: 'center' })} 
                        className={`flex-1 p-1.5 rounded flex justify-center ${(!commonProps.textAlign || commonProps.textAlign === 'center') && !isTextAlignMultiple ? 'bg-violet-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                        title="Centralizar"
                    >
                        <AlignCenter size={16} />
                    </button>
                    <button 
                        onClick={() => handleUpdate({ textAlign: 'right' })} 
                        className={`flex-1 p-1.5 rounded flex justify-center ${commonProps.textAlign === 'right' && !isTextAlignMultiple ? 'bg-violet-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                        title="Direita"
                    >
                        <AlignRight size={16} />
                    </button>
                </div>

                <LabeledSlider label="Espaçamento" value={commonProps.letterSpacing} onChange={(e) => handleUpdate({ letterSpacing: parseInt(e.target.value) })} onMouseDown={onInteractionStart} onMouseUp={onInteractionEnd} min={-10} max={50} />

                <div className="flex gap-2 pt-1">
                    <button onClick={() => handleUpdate({ fontWeight: (commonProps.fontWeight === 700 ? 400 : 700) })} className={`flex-1 p-1.5 rounded text-xs font-bold ${commonProps.fontWeight === 700 && !isFontWeightMultiple ? 'bg-violet-600 text-white' : 'bg-gray-700 text-gray-300'}`}>B</button>
                    <button onClick={() => handleUpdate({ fontStyle: (commonProps.fontStyle === 'italic' ? 'normal' : 'italic') })} className={`flex-1 p-1.5 rounded text-xs italic ${commonProps.fontStyle === 'italic' ? 'bg-violet-600 text-white' : 'bg-gray-700 text-gray-300'}`}>I</button>
                    <button onClick={() => handleUpdate({ textDecoration: (commonProps.textDecoration === 'underline' ? 'none' : 'underline') })} className={`flex-1 p-1.5 rounded text-xs underline ${commonProps.textDecoration === 'underline' ? 'bg-violet-600 text-white' : 'bg-gray-700 text-gray-300'}`}>U</button>
                    <button onClick={() => handleUpdate({ textTransform: (commonProps.textTransform === 'uppercase' ? 'none' : 'uppercase') })} className={`flex-1 p-1.5 rounded text-xs ${commonProps.textTransform === 'uppercase' ? 'bg-violet-600 text-white' : 'bg-gray-700 text-gray-300'}`}>AA</button>
                </div>

                <div className="pt-4 border-t border-gray-700/50">
                    <ToggleButton isEnabled={!!commonProps.textStroke && !isStrokeMultiple} isIndeterminate={isStrokeMultiple} onClick={() => handleUpdate({ textStroke: !commonProps.textStroke })}>
                        Contorno
                    </ToggleButton>
                    {commonProps.textStroke && !isStrokeMultiple && (
                        <div className="pl-4 mt-3 space-y-3 border-l-2 border-violet-900/50 ml-2 pt-1 pb-2">
                            <div className="flex items-center gap-4">
                                <label htmlFor="stroke-color" className="text-xs font-medium text-gray-400">Cor</label>
                                <input type="color" id="stroke-color" value={isStrokeColorMultiple ? '#000000' : commonProps.textStrokeColor || '#000000'} onChange={(e) => handleUpdate({ textStrokeColor: e.target.value })} onFocus={onInteractionStart} onBlur={onInteractionEnd} className="w-8 h-8 bg-transparent border-none rounded cursor-pointer" />
                            </div>
                            <LabeledSlider label="Espessura" value={isStrokeWidthMultiple ? 'IS_MULTIPLE' : commonProps.textStrokeWidth} onChange={(e) => handleUpdate({ textStrokeWidth: Number(e.target.value) })} onMouseDown={onInteractionStart} onMouseUp={onInteractionEnd} min={0} max={20} step={0.5} />
                        </div>
                    )}
                </div>

                <div className="pt-4 border-t border-gray-700/50">
                    <ToggleButton isEnabled={!!commonProps.textShadow && !isShadowMultiple} isIndeterminate={isShadowMultiple} onClick={() => handleUpdate({ textShadow: !commonProps.textShadow })}>
                        Sombra
                    </ToggleButton>
                    {commonProps.textShadow && !isShadowMultiple && (
                        <div className="pl-4 mt-3 space-y-3 border-l-2 border-violet-900/50 ml-2 pt-1 pb-2">
                            <div className="flex items-center gap-4">
                                <label htmlFor="shadow-color" className="text-xs font-medium text-gray-400">Cor</label>
                                <input type="color" id="shadow-color" value={isShadowColorMultiple ? '#000000' : commonProps.textShadowColor || '#000000'} onChange={(e) => handleUpdate({ textShadowColor: e.target.value })} onFocus={onInteractionStart} onBlur={onInteractionEnd} className="w-8 h-8 bg-transparent border-none rounded cursor-pointer" />
                            </div>
                            <LabeledSlider label="Desfoque" value={commonProps.textShadowBlur} onChange={(e) => handleUpdate({ textShadowBlur: Number(e.target.value) })} onMouseDown={onInteractionStart} onMouseUp={onInteractionEnd} min={0} max={50} />
                            <LabeledSlider label="Desloc. X" value={commonProps.textShadowOffsetX} onChange={(e) => handleUpdate({ textShadowOffsetX: Number(e.target.value) })} onMouseDown={onInteractionStart} onMouseUp={onInteractionEnd} min={-50} max={50} />
                            <LabeledSlider label="Desloc. Y" value={commonProps.textShadowOffsetY} onChange={(e) => handleUpdate({ textShadowOffsetY: Number(e.target.value) })} onMouseDown={onInteractionStart} onMouseUp={onInteractionEnd} min={-50} max={50} />
                        </div>
                    )}
                </div>

                <div className="pt-4 border-t border-gray-700/50 space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-violet-300 flex items-center gap-2"><Sparkles size={14}/> Animações de Texto</h4>
                        <span className="text-[10px] bg-violet-900/60 text-violet-300 px-2 py-0.5 rounded-full font-medium">35+ Efeitos</span>
                    </div>

                    {/* Granular Animation Controls */}
                    <div className="space-y-3 bg-gray-900/60 p-3 rounded-lg border border-gray-800">
                        {/* Animation IN */}
                        <div>
                            <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center justify-between">
                                <span>Entrada (In)</span>
                                <span className="text-[10px] text-violet-400">{commonProps.animationInDuration ?? 0.8}s</span>
                            </label>
                            <select
                                value={commonProps.animationIn || 'none'}
                                onChange={(e) => handleUpdate({ animationIn: e.target.value as TextInAnimation })}
                                onFocus={onInteractionStart}
                                onBlur={onInteractionEnd}
                                className="w-full bg-gray-800 border border-gray-700 rounded-md p-1.5 text-xs text-white focus:outline-none focus:border-violet-500 mb-2"
                            >
                                <option value="none">Nenhuma</option>
                                <option value="fade">Esmaecer (Fade)</option>
                                <option value="typewriter">Digitação (Typewriter)</option>
                                <option value="swing-in">Balanço 3D (Swing)</option>
                                <option value="spin-bounce-in">Giro com Quique (Spin & Bounce)</option>
                                <option value="perspective-flip-in">Virada em Perspectiva 3D</option>
                                <option value="drop-impact-in">Impacto de Queda (Drop Impact)</option>
                                <option value="glitch-reveal-in">Glitch Revelação Digital</option>
                                <option value="curtain-expand-in">Expansão Cortina</option>
                                <option value="neon-flicker-in">Neon Piscante (Electric Neon)</option>
                                <option value="smoke-dissolve-in">Dissolver Fumaça (Smoke)</option>
                                <option value="cyber-decode-in">Decodificador Matrix (Cyber)</option>
                                <option value="word-slide-down-by-word">Cascata de Palavras</option>
                                <option value="word-3d-flip-by-word">Flip 3D por Palavra</option>
                                <option value="pop-in-by-word">Pop por Palavra</option>
                                <option value="fade-in-by-word">Surgir por Palavra</option>
                                <option value="slide-in-up-by-word">Deslizar por Palavra</option>
                                <option value="bounce-in-by-word">Quicar por Palavra</option>
                                <option value="rotate-in-by-word">Girar por Palavra</option>
                                <option value="color-glow-by-word">Glow Dourado por Palavra</option>
                                <option value="flicker-by-word">Flicker por Palavra</option>
                                <option value="slide-in-up-by-char">Subir Letra por Letra</option>
                                <option value="zoom-rotate-by-char">Girar Letra por Letra</option>
                                <option value="wave-enter-by-char">Onda Letra por Letra</option>
                                <option value="zoom-in">Zoom In</option>
                                <option value="slide-in-left">Deslizar da Esquerda</option>
                                <option value="slide-in-right">Deslizar da Direita</option>
                                <option value="slide-in-up">Deslizar de Baixo</option>
                                <option value="slide-in-down">Deslizar de Cima</option>
                                <option value="reveal-up">Revelar Cima</option>
                                <option value="blur-in">Foco de Desfoque (Blur In)</option>
                                <option value="skew-in">Inclinado (Skew)</option>
                                <option value="elastic-in">Elástico (Elastic)</option>
                                <option value="tracking-expand">Espaçamento Expandir</option>
                                <option value="rotate-in">Girar Entrada</option>
                                <option value="flicker-in">Flicker Entrada</option>
                            </select>
                            {commonProps.animationIn && commonProps.animationIn !== 'none' && (
                                <LabeledSlider
                                    label="Duração da Entrada"
                                    value={commonProps.animationInDuration ?? 0.8}
                                    onChange={(e) => handleUpdate({ animationInDuration: Number(e.target.value) })}
                                    onMouseDown={onInteractionStart}
                                    onMouseUp={onInteractionEnd}
                                    min={0.2}
                                    max={3.0}
                                    step={0.1}
                                />
                            )}
                        </div>

                        {/* Animation OUT */}
                        <div className="pt-2 border-t border-gray-800">
                            <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center justify-between">
                                <span>Saída (Out)</span>
                                <span className="text-[10px] text-violet-400">{commonProps.animationOutDuration ?? 0.5}s</span>
                            </label>
                            <select
                                value={commonProps.animationOut || 'none'}
                                onChange={(e) => handleUpdate({ animationOut: e.target.value as TextOutAnimation })}
                                onFocus={onInteractionStart}
                                onBlur={onInteractionEnd}
                                className="w-full bg-gray-800 border border-gray-700 rounded-md p-1.5 text-xs text-white focus:outline-none focus:border-violet-500 mb-2"
                            >
                                <option value="none">Nenhuma</option>
                                <option value="fade">Esmaecer (Fade Out)</option>
                                <option value="fade-zoom-out">Zoom & Sumir</option>
                                <option value="blur-drop-out">Desfocar & Cair (Blur Drop)</option>
                                <option value="perspective-flip-out">Flip 3D Saída</option>
                                <option value="implode-out">Implodir (Implode)</option>
                                <option value="slide-out-diagonal">Deslizar Diagonal</option>
                                <option value="glitch-out">Glitch Saída</option>
                                <option value="zoom-out">Zoom Out</option>
                                <option value="blur-out">Desfocar (Blur Out)</option>
                                <option value="spin-out">Girar Saída</option>
                                <option value="bounce-out">Quicar Saída</option>
                                <option value="shrink-out">Encolher</option>
                                <option value="flicker-out">Flicker Saída</option>
                                <option value="slide-out-left">Deslizar Esquerda</option>
                                <option value="slide-out-right">Deslizar Direita</option>
                                <option value="slide-out-up">Deslizar Cima</option>
                                <option value="slide-out-down">Deslizar Baixo</option>
                            </select>
                            {commonProps.animationOut && commonProps.animationOut !== 'none' && (
                                <LabeledSlider
                                    label="Duração da Saída"
                                    value={commonProps.animationOutDuration ?? 0.5}
                                    onChange={(e) => handleUpdate({ animationOutDuration: Number(e.target.value) })}
                                    onMouseDown={onInteractionStart}
                                    onMouseUp={onInteractionEnd}
                                    min={0.2}
                                    max={3.0}
                                    step={0.1}
                                />
                            )}
                        </div>

                        {/* Animation LOOP */}
                        <div className="pt-2 border-t border-gray-800">
                            <label className="block text-xs font-medium text-gray-300 mb-1">Efeito Contínuo (Loop)</label>
                            <select
                                value={commonProps.animationLoop || 'none'}
                                onChange={(e) => handleUpdate({ animationLoop: e.target.value as TextLoopAnimation })}
                                onFocus={onInteractionStart}
                                onBlur={onInteractionEnd}
                                className="w-full bg-gray-800 border border-gray-700 rounded-md p-1.5 text-xs text-white focus:outline-none focus:border-violet-500"
                            >
                                <option value="none">Nenhum</option>
                                <option value="credits-roll">🎬 Créditos de Cinema (Subindo na Tela)</option>
                                <option value="credits-star-wars">🌌 Créditos Star Wars 3D (Perspectiva)</option>
                                <option value="teleprompter-roll">📜 Teleprompter (Rolagem Suave)</option>
                                <option value="credits-slow">🎥 Créditos Lentos (Passagem Suave)</option>
                                <option value="scroll-up">⬆️ Rolar para Cima (Letreiro)</option>
                                <option value="scroll-down">⬇️ Rolar para Baixo</option>
                                <option value="pulse-glow">Pulso Neon Radiante</option>
                                <option value="float-rotate-3d">Flutuar com Inclinação 3D</option>
                                <option value="heartbeat">Batimento Cardíaco (Heartbeat)</option>
                                <option value="wobble">Wobble Elástico (Balanço Lateral)</option>
                                <option value="shimmer-wave">Brilho Metálico Shimmer</option>
                                <option value="breath">Respiração Suave (Breath)</option>
                                <option value="typewriter-cursor-loop">Cursor Pisca (Terminal)</option>
                                <option value="pulse">Pulsar Tamanho</option>
                                <option value="bounce">Quicar Contínuo</option>
                                <option value="float">Flutuar Leve</option>
                                <option value="wave">Onda Vibrante</option>
                                <option value="rainbow">Arco-íris Dinâmico</option>
                                <option value="jitter">Vibrar (Jitter/Tremor)</option>
                                <option value="glitch-loop">Glitch Digital Loop</option>
                                <option value="glow">Glow Iluminação</option>
                            </select>
                        </div>
                    </div>

                    {/* Presets Grid */}
                    <div>
                        <span className="text-xs font-medium text-gray-400 block mb-2">Presets Prontos Combinados</span>
                        <div className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                            {ANIMATION_PRESETS.map((anim) => {
                                const isSelected = 
                                    currentAnim.in === anim.settings.animationIn && 
                                    currentAnim.out === anim.settings.animationOut &&
                                    currentAnim.loop === anim.settings.animationLoop;
                                
                                return (
                                    <button
                                        key={anim.name}
                                        onClick={() => handleUpdate(anim.settings)}
                                        className={`p-2 text-[11px] font-medium rounded-md border transition-all text-left truncate ${isSelected ? 'bg-violet-600 border-violet-400 text-white shadow-md shadow-violet-900/40' : 'bg-gray-800/80 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                                        title={anim.name}
                                    >
                                        {anim.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
