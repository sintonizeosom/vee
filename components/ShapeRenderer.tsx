import React, { useRef, useEffect } from 'react';
import { VideoClip } from '../types';
import { drawShape } from '../utils/canvasUtils';

interface ShapeRendererProps {
    element: VideoClip;
    canvasScale: number;
}

const ShapeRenderer: React.FC<ShapeRendererProps> = ({ element, canvasScale }) => {
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
        // Scale only by DPR, as the draw function will handle the canvasScale.
        ctx.scale(dpr, dpr);
        
        drawShape(ctx, element, canvasScale);

        ctx.restore();

    }, [element, canvasScale]);

    return (
        <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
        />
    );
};

export default React.memo(ShapeRenderer);