
import React, { useRef, useEffect } from 'react';
import { VideoClip } from '../types';
import { drawWrappedText } from '../utils/canvasUtils';

interface TextRendererProps {
    element: VideoClip;
    canvasScale: number;
}

const TextRenderer: React.FC<TextRendererProps> = ({ element, canvasScale }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;
        
        const dpr = window.devicePixelRatio || 1;
        const canvasW = element.width * canvasScale * dpr;
        const canvasH = element.height * canvasScale * dpr;

        if (canvas.width !== canvasW || canvas.height !== canvasH) {
            canvas.width = canvasW;
            canvas.height = canvasH;
        } else {
            ctx.clearRect(0, 0, canvasW, canvasH);
        }
        
        ctx.save();
        ctx.scale(dpr, dpr);
        
        // Para a visualização interativa, queremos ver o texto em seu estado final, não animado
        // para facilitar o posicionamento e o estilo. Se for rolagem/créditos, usamos 50% do clipe para centralizar na caixa.
        const isScrolling = ['scroll-up', 'scroll-down', 'credits-roll', 'credits-star-wars', 'teleprompter-roll', 'credits-slow'].includes(element.animationLoop as string);
        const totalClipDuration = (element.endTime - element.startTime) / (element.speed || 1);
        const timeInClipForPreview = isScrolling 
            ? (totalClipDuration * 0.5) 
            : (element.animationInDuration || 1) + 0.1;

        drawWrappedText(ctx, element, canvasScale, timeInClipForPreview, totalClipDuration);

        ctx.restore();

    }, [element, canvasScale]);

    return (
        <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
        />
    );
};

export default React.memo(TextRenderer);
