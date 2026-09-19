import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { SpectrumStyle, AnalyserFrame, LogoShape } from '../types';

interface AudioVisualizerProps {
  style?: SpectrumStyle;
  width: number;
  height: number;
  color: string;
  color2: string;
  color3: string;
  logoSrc?: string;
  logoSize?: number;
  logoShape?: LogoShape;
  logoPulses?: boolean;
  pulseStrength?: number;
}

export interface AudioVisualizerHandle {
    draw: (analyserFrame: AnalyserFrame, time: number) => void;
}

interface AudioMetrics {
    bass: number;
    mid: number;
    treble: number;
}

interface DrawProps {
    style: SpectrumStyle;
    width: number;
    height: number;
    color: string;
    color2: string;
    color3: string;
    logoSize?: number;
    logoShape?: LogoShape;
    logoPulses?: boolean;
    pulseStrength?: number;
}

export const drawVisualizerFrame = (
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    frequencyData: Uint8Array,
    timeDomainData: Uint8Array,
    time: number,
    props: DrawProps,
    logoImage?: HTMLImageElement | null,
    audioMetrics?: AudioMetrics
) => {
    const { style, width, height, color, color2, color3, logoShape, logoPulses } = props;

    const bufferLength = frequencyData.length;
    const fftSize = timeDomainData.length;

    const centerX = width / 2;
    const centerY = height / 2;

    // Helper to safely convert hex values to RGB format for drawing clean semi-transparent shadows and glows
    const hexToRgb = (hex: string) => {
        const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 138, g: 43, b: 226 };
    };

    switch (style) {
      case 'chroma-wheel': {
        const barCount = 48;
        const radius = Math.min(width, height) / 3.5;
        const barBaseLength = Math.min(width, height) * 0.03;
        const barMaxLength = Math.min(width, height) * 0.12;
        const barDisplayWidth = (Math.PI * 2 * radius * 0.8) / barCount;
        const cornerRadius = barDisplayWidth / 2;
        const bassAvg = (frequencyData.slice(0, 10).reduce((a, b) => a + b, 0) / 10) / 255;
        
        ctx.shadowBlur = 15;

        // Draw tech radar ring baseline
        ctx.save();
        ctx.strokeStyle = `rgba(${hexToRgb(color2).r}, ${hexToRgb(color2).g}, ${hexToRgb(color2).b}, 0.15)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Compass tick marks every 30 degrees
        ctx.strokeStyle = `rgba(${hexToRgb(color).r}, ${hexToRgb(color).g}, ${hexToRgb(color).b}, 0.25)`;
        for (let j = 0; j < 12; j++) {
            const tickAngle = (j / 12) * Math.PI * 2 + time * 0.05;
            ctx.beginPath();
            ctx.moveTo(centerX + Math.cos(tickAngle) * (radius - 5), centerY + Math.sin(tickAngle) * (radius - 5));
            ctx.lineTo(centerX + Math.cos(tickAngle) * (radius + 5), centerY + Math.sin(tickAngle) * (radius + 5));
            ctx.stroke();
        }
        ctx.restore();

        const points: {x: number, y: number, color: string}[] = [];

        for (let i = 0; i < barCount; i++) {
            const dataIndex = Math.floor((i / barCount) * (bufferLength * 0.7));
            const magnitude = Math.pow(frequencyData[dataIndex] / 255, 2.5);
            const barLength = barBaseLength + magnitude * barMaxLength;

            const angle = (i / barCount) * Math.PI * 2 + time * 0.15;
            const hue = (i / barCount) * 360 + time * 30;

            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(angle);
            
            const barColor = `hsl(${hue}, 100%, 60%)`;
            ctx.fillStyle = barColor;
            ctx.shadowColor = barColor;
            
            if (typeof (ctx as any).roundRect === 'function') {
                ctx.beginPath();
                (ctx as any).roundRect(radius, -barDisplayWidth / 2, barLength, barDisplayWidth, cornerRadius);
                ctx.fill();
            } else {
                ctx.fillRect(radius, -barDisplayWidth / 2, barLength, barDisplayWidth);
            }
            
            // Store coordinates for beautiful molecular webbing bridges
            const px = centerX + Math.cos(angle) * (radius + barLength);
            const py = centerY + Math.sin(angle) * (radius + barLength);
            points.push({ x: px, y: py, color: barColor });

            if (magnitude > 0.6) {
                const particleCount = 2;
                for (let p = 0; p < particleCount; p++) {
                    const sparkOffset = barLength + Math.sin(time * 10 + p) * 30;
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(radius + sparkOffset, 0, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.restore();
        }

        // Draw molecular webbing threads connecting matching peaks
        ctx.save();
        ctx.globalAlpha = 0.25;
        for (let i = 0; i < barCount; i++) {
            const target = (i + 4) % barCount;
            ctx.beginPath();
            ctx.moveTo(points[i].x, points[i].y);
            ctx.quadraticCurveTo(centerX, centerY, points[target].x, points[target].y);
            ctx.strokeStyle = points[i].color;
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }
        ctx.restore();

        break;
      }
      case 'arc-reactor': {
        const numArcs = 4;
        const arcDegrees = 70;
        const gapDegrees = 30;

        const toRad = (deg: number) => deg * (Math.PI / 180);
        const arcRad = toRad(arcDegrees);
        const gapRad = toRad(gapDegrees);

        let bassAvg, midAvg, trebleAvg;
        if (audioMetrics) {
            bassAvg = audioMetrics.bass;
            midAvg = audioMetrics.mid;
            trebleAvg = audioMetrics.treble;
        } else {
            const bassSlice = frequencyData.slice(0, 3);
            const midSlice = frequencyData.slice(3, 24);
            const trebleSlice = frequencyData.slice(24, 140);
            bassAvg = (bassSlice.reduce((a, b) => a + b, 0) / (bassSlice.length || 1)) / 255;
            midAvg = (midSlice.reduce((a, b) => a + b, 0) / (midSlice.length || 1)) / 255;
            trebleAvg = (trebleSlice.reduce((a, b) => a + b, 0) / (trebleSlice.length || 1)) / 255;
        }

        // Concentric dotted calibration grid circles
        ctx.save();
        ctx.strokeStyle = `rgba(${hexToRgb(color2).r}, ${hexToRgb(color2).g}, ${hexToRgb(color2).b}, 0.12)`;
        ctx.setLineDash([2, 6]);
        const maxCircleRadius = Math.min(width, height) / 2.2;
        for (let r = 50; r <= maxCircleRadius; r += 60) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, r - time * 5 % 60, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();

        // Technical Monospace Telemetry markings
        ctx.save();
        ctx.fillStyle = `rgba(${hexToRgb(color3).r}, ${hexToRgb(color3).g}, ${hexToRgb(color3).b}, 0.5)`;
        ctx.font = '9px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`SYS.REACTOR_CORE // ONLINE`, centerX - 140, centerY - maxCircleRadius + 20);
        ctx.textAlign = 'right';
        ctx.fillText(`GAIN_SCALE.EQ // ${(bassAvg * 100).toFixed(0)}%`, centerX + 140, centerY - maxCircleRadius + 20);
        ctx.restore();

        // Precision outer compass ticks
        ctx.save();
        ctx.strokeStyle = `rgba(${hexToRgb(color2).r}, ${hexToRgb(color2).g}, ${hexToRgb(color2).b}, 0.3)`;
        ctx.lineWidth = 1;
        const compassRadius = Math.min(width, height) / 3.1;
        for (let angleDeg = 0; angleDeg < 360; angleDeg += 10) {
            const rRad = toRad(angleDeg + time * 2);
            const length = angleDeg % 90 === 0 ? 12 : (angleDeg % 30 === 0 ? 8 : 4);
            ctx.beginPath();
            ctx.moveTo(centerX + Math.cos(rRad) * compassRadius, centerY + Math.sin(rRad) * compassRadius);
            ctx.lineTo(centerX + Math.cos(rRad) * (compassRadius + length), centerY + Math.sin(rRad) * (compassRadius + length));
            ctx.stroke();
        }
        ctx.restore();

        // Center Disc - Neon Magenta pulsing on bass
        const centerDiscRadius = height * (234 / 1080);
        ctx.fillStyle = '#ff00ff';
        ctx.globalAlpha = 0.4 + Math.pow(bassAvg, 2) * 0.5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, centerDiscRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // Reactive Arc properties
        const radiusExpansion = Math.pow(bassAvg, 2) * (18 / 1080 * height);
        const thicknessExpansion = Math.pow(midAvg, 1.3) * (14 / 1080 * height);
        const opacity = 0.65 + Math.pow(trebleAvg, 1.1) * 0.35;
        
        const baseInnerRadius = centerDiscRadius;
        const baseThickness = (34 / 1080 * height);
        
        const currentRadius = baseInnerRadius + radiusExpansion;
        const currentThickness = baseThickness + thicknessExpansion;
        
        ctx.lineWidth = currentThickness;

        // Swirling conic neon gradient
        const gradient = ctx.createConicGradient(time * 0.8, centerX, centerY);
        gradient.addColorStop(0, '#ff00ff');
        gradient.addColorStop(0.5, '#00ffff');
        gradient.addColorStop(1, '#ff00ff');
        ctx.strokeStyle = gradient;

        ctx.globalAlpha = opacity;
        ctx.lineCap = 'round';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 10 + bassAvg * 20;
        
        for (let i = 0; i < numArcs; i++) {
            const startAngle = i * (arcRad + gapRad) + time * 0.4;
            const endAngle = startAngle + arcRad;
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, currentRadius + currentThickness / 2, startAngle, endAngle);
            ctx.stroke();
        }

        // Secondary revolving orbit node for a complete HUD look
        const dotAngle = time * 2;
        const rx = centerX + Math.cos(dotAngle) * (currentRadius + currentThickness + 20);
        const ry = centerY + Math.sin(dotAngle) * (currentRadius + currentThickness + 20);
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.arc(rx, ry, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        ctx.globalAlpha = 1.0;
        
        break;
      }
      case 'neon-ring': {
        const bassAvg = (frequencyData.slice(0, 16).reduce((a, b) => a + b, 0) / 16) / 255;
        const pulse = Math.pow(bassAvg, 2.5);
        
        const baseRadius = Math.min(width, height) / 3.5;
        const baseThickness = Math.max(8, baseRadius * 0.08);
        const currentThickness = baseThickness + pulse * baseRadius * 0.15;
        const glowAmount = 15 + pulse * 40;

        // Nested Holographic energy rings (Outer opposite counter-orbit)
        ctx.save();
        ctx.shadowBlur = glowAmount * 0.5;
        ctx.shadowColor = color3;
        ctx.strokeStyle = color3;
        ctx.lineWidth = currentThickness * 0.4;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        
        const outerSegments = 120;
        for (let i = 0; i <= outerSegments; i++) {
            const angle = (i / outerSegments) * Math.PI * 2;
            const sym = Math.sin(angle * 2);
            const freqIdx = Math.floor(Math.abs(sym) * (bufferLength * 0.2));
            const val = frequencyData[freqIdx] / 255;
            const offset = Math.pow(val, 2.0) * (baseRadius * 0.12) * Math.sin(-angle * 8 + time * 4);
            const r = baseRadius * 1.25 + offset + (pulse * (baseRadius * 0.08));
            const px = centerX + Math.cos(angle - time * 0.1) * r;
            const py = centerY + Math.sin(angle - time * 0.1) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.restore();

        // Main holographic center ring
        const gradient = ctx.createConicGradient(time * 0.5, centerX, centerY);
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.25, color2);
        gradient.addColorStop(0.5, color3);
        gradient.addColorStop(0.75, color2);
        gradient.addColorStop(1, color);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = currentThickness;
        ctx.lineCap = 'round';
        
        ctx.shadowColor = color2;
        ctx.shadowBlur = glowAmount;
        
        const ringSegments = 180;
        ctx.beginPath();
        for (let i = 0; i <= ringSegments; i++) {
            const angle = (i / ringSegments) * Math.PI * 2;
            
            const symIdRatio = Math.sin(angle);
            const freqIdx = Math.floor(Math.abs(symIdRatio) * (bufferLength * 0.5));
            const val = frequencyData[freqIdx] / 255;
            
            const offset = Math.pow(val, 2.2) * (baseRadius * 0.18) * Math.sin(angle * 12 + time * 6);
            const r = baseRadius + offset + (pulse * (baseRadius * 0.05));
            
            const px = centerX + Math.cos(angle) * r;
            const py = centerY + Math.sin(angle) * r;
            
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Draw crosshair hud elements around the ring
        ctx.save();
        ctx.strokeStyle = `rgba(${hexToRgb(color2).r}, ${hexToRgb(color2).g}, ${hexToRgb(color2).b}, 0.25)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Crosshair ticks
        const gap = baseRadius * 0.7;
        const tickL = 10;
        ctx.moveTo(centerX - gap, centerY); ctx.lineTo(centerX - gap - tickL, centerY);
        ctx.moveTo(centerX + gap, centerY); ctx.lineTo(centerX + gap + tickL, centerY);
        ctx.moveTo(centerX, centerY - gap); ctx.lineTo(centerX, centerY - gap - tickL);
        ctx.moveTo(centerX, centerY + gap); ctx.lineTo(centerX, centerY + gap + tickL);
        ctx.stroke();
        ctx.restore();

        break;
      }
      case 'radiant-pulse': {
        const barCount = 120;
        const barSpacing = width / barCount;
        const barWidth = barSpacing * 0.6;
        const bassAvg = frequencyData.slice(0, 10).reduce((a, b) => a + b, 0) / 10 / 255;
        
        ctx.shadowBlur = 12 + bassAvg * 15;
        ctx.shadowColor = color2;

        // Draw precision analytical background spectrometer lines
        ctx.save();
        ctx.strokeStyle = `rgba(${hexToRgb(color2).r}, ${hexToRgb(color2).g}, ${hexToRgb(color2).b}, 0.1)`;
        ctx.lineWidth = 1;
        for (let l = 1; l < 5; l++) {
            const gridY = centerY - (height * 0.1 * l);
            ctx.beginPath();
            ctx.moveTo(0, gridY);
            ctx.lineTo(width, gridY);
            ctx.stroke();

            const gridY2 = centerY + (height * 0.1 * l);
            ctx.beginPath();
            ctx.moveTo(0, gridY2);
            ctx.lineTo(width, gridY2);
            ctx.stroke();
        }
        ctx.restore();

        const peakCoordinates: {x: number, y: number}[] = [];

        for (let i = 0; i < barCount; i++) {
          const dataIndex = Math.floor(i * (bufferLength * 0.75 / barCount));
          const fValue = frequencyData[dataIndex] / 255;
          const barHeight = Math.pow(fValue, 2.2) * (height * 0.42);
          
          if (barHeight < 2) continue;
          
          const x = i * barSpacing + (barSpacing - barWidth) / 2;
          const y = centerY - barHeight;
          
          const gradient = ctx.createLinearGradient(x, y, x, centerY + barHeight);
          gradient.addColorStop(0, color);
          gradient.addColorStop(0.5, color2);
          gradient.addColorStop(1, color3);

          ctx.fillStyle = gradient;
          
          const radius = barWidth / 2;
          
          if (typeof (ctx as any).roundRect === 'function') {
              ctx.beginPath();
              (ctx as any).roundRect(x, centerY - barHeight, barWidth, barHeight * 2, radius);
              ctx.fill();
          } else {
              ctx.fillRect(x, centerY - barHeight, barWidth, barHeight * 2);
          }
          
          peakCoordinates.push({ x: x + barWidth / 2, y: centerY - barHeight });

          if (fValue > 0.65) {
              ctx.fillStyle = '#ffffff';
              ctx.beginPath();
              ctx.arc(x + barWidth/2, centerY - barHeight - 4, 1.5, 0, Math.PI * 2);
              ctx.arc(x + barWidth/2, centerY + barHeight + 4, 1.5, 0, Math.PI * 2);
              ctx.fill();
          }
        }

        // Connect peaks with a modern flowing neon thread (spectronic envelope)
        if (peakCoordinates.length > 2) {
            ctx.save();
            ctx.shadowBlur = 10;
            ctx.shadowColor = color3;
            ctx.strokeStyle = color3;
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.moveTo(peakCoordinates[0].x, peakCoordinates[0].y);
            for (let k = 0; k < peakCoordinates.length - 1; k++) {
                const xc = (peakCoordinates[k].x + peakCoordinates[k + 1].x) / 2;
                const yc = (peakCoordinates[k].y + peakCoordinates[k + 1].y) / 2;
                ctx.quadraticCurveTo(peakCoordinates[k].x, peakCoordinates[k].y, xc, yc);
            }
            ctx.stroke();
            ctx.restore();
        }

        break;
      }
      case 'cosmic-ripples': {
        const lines = 72;
        const baseRadius = Math.min(width, height) / 25;
        ctx.lineWidth = 2.0;
        
        const bassAvg = (frequencyData.slice(0, 10).reduce((a, b) => a + b, 0) / 10) / 255;

        // Particle space stars reacting and expanding to raw bass hits
        ctx.save();
        ctx.shadowBlur = 10;
        const count = 30;
        const seedTime = time * 0.15;
        for (let p = 0; p < count; p++) {
            const angle = (p / count) * Math.PI * 2 + seedTime;
            const dist = baseRadius * 8 + (p * 5) + bassAvg * 80;
            const sx = centerX + Math.cos(angle) * dist;
            const sy = centerY + Math.sin(angle) * dist;
            const size = 1 + (p % 3) + bassAvg * 3;
            ctx.fillStyle = p % 2 === 0 ? color2 : color3;
            ctx.beginPath();
            ctx.arc(sx, sy, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // High contrast center portal ring
        ctx.save();
        ctx.strokeStyle = `rgba(${hexToRgb(color).r}, ${hexToRgb(color).g}, ${hexToRgb(color).b}, 0.5)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius + bassAvg * 15, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Deep astronomical glow
        const cGlow = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, baseRadius * 12);
        cGlow.addColorStop(0, `rgba(${hexToRgb(color2).r}, ${hexToRgb(color2).g}, ${hexToRgb(color2).b}, 0.18)`);
        cGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = cGlow;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius * 12, 0, Math.PI * 2);
        ctx.fill();

        for (let i = 0; i < lines; i++) {
          const dataIndex = Math.floor(i * (bufferLength * 0.7 / lines));
          const magnitude = Math.pow(frequencyData[dataIndex] / 255, 3.0);
          if (magnitude < 0.01) continue;
          
          const angle = (i / lines) * Math.PI * 2 + time * 0.05;
          const gradient = ctx.createLinearGradient(centerX, centerY, centerX + Math.cos(angle) * lines * 4, centerY + Math.sin(angle) * lines * 4);
          gradient.addColorStop(0, color);
          gradient.addColorStop(0.5, color2);
          gradient.addColorStop(1, color3);
          ctx.strokeStyle = gradient;
          ctx.shadowColor = color2;
          ctx.shadowBlur = 10;

          ctx.beginPath();
          for (let j = 0; j < 50; j++) {
            const r = baseRadius + j * 4.5 + magnitude * 80;
            const wave = Math.sin(j * 0.2 + time * 10) * magnitude * 20;
            const x = centerX + Math.cos(angle + wave) * r;
            const y = centerY + Math.sin(angle + wave) * r;
            if (j === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        break;
      }
      
      case 'trinity-pulse': {
        const bassAvg = frequencyData.slice(0, bufferLength / 8).reduce((a,b)=>a+b,0) / (bufferLength/8) / 255;
        const midAvg = frequencyData.slice(bufferLength / 8, bufferLength / 4).reduce((a,b)=>a+b,0) / (bufferLength/4) / 255;
        const trebleAvg = frequencyData.slice(bufferLength / 4, bufferLength / 2).reduce((a,b)=>a+b,0) / (bufferLength/4) / 255;

        const baseRadius = Math.min(width, height) / 3.4;
        ctx.lineWidth = 3.5;
        ctx.shadowBlur = 25;

        const drawTriangle = (radius: number, rotation: number, strokeStyle: string | CanvasGradient) => {
            ctx.save();
            ctx.strokeStyle = strokeStyle;
            ctx.shadowColor = typeof strokeStyle === 'string' ? strokeStyle : color;
            ctx.translate(centerX, centerY);
            ctx.rotate(rotation);
            ctx.beginPath();
            const polyVertices: {x: number, y: number}[] = [];
            for (let i = 0; i < 3; i++) {
                const angle = (i / 3) * Math.PI * 2 - Math.PI / 2;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                polyVertices.push({ x, y });
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();

            // Draw futuristic digital terminal targets over vertices
            for (const vert of polyVertices) {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(vert.x, vert.y, 5, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(vert.x, vert.y, 10, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();
        };
        
        // Draw underlying subtle celestial orbital rings connecting vertices
        ctx.save();
        ctx.strokeStyle = `rgba(${hexToRgb(color2).r}, ${hexToRgb(color2).g}, ${hexToRgb(color2).b}, 0.15)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius * 1.3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        const outerGrad = ctx.createConicGradient(time, centerX, centerY);
        outerGrad.addColorStop(0, color);
        outerGrad.addColorStop(0.5, color3);
        outerGrad.addColorStop(1, color);
        
        drawTriangle(baseRadius * (1 + bassAvg * 0.5), time * 0.8, outerGrad);
        drawTriangle(baseRadius * 0.7 * (1 + midAvg * 0.5), -time * 1.1 + Math.PI/3, color2);
        drawTriangle(baseRadius * 0.45 * (1 + trebleAvg * 0.5), time * 1.5 + Math.PI*2/3, color3);

        break;
      }

      case 'ripple': {
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = color2;

        // Render gorgeous Retro Cyber Oscilloscope CRT grid backdrop
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(${hexToRgb(color3).r}, ${hexToRgb(color3).g}, ${hexToRgb(color3).b}, 0.08)`;
        ctx.lineWidth = 1;
        
        // Vertical lines
        const vertGridCount = 12;
        for (let xG = 0; xG <= vertGridCount; xG++) {
            const xPos = (xG / vertGridCount) * width;
            ctx.beginPath();
            ctx.moveTo(xPos, 0);
            ctx.lineTo(xPos, height);
            ctx.stroke();
        }
        
        // Horizontal lines
        const horizGridCount = 8;
        for (let yG = 0; yG <= horizGridCount; yG++) {
            const yPos = (yG / horizGridCount) * height;
            ctx.beginPath();
            ctx.moveTo(0, yPos);
            ctx.lineTo(width, yPos);
            ctx.stroke();
        }

        // Center crosshair axis
        ctx.strokeStyle = `rgba(${hexToRgb(color2).r}, ${hexToRgb(color2).g}, ${hexToRgb(color2).b}, 0.25)`;
        ctx.beginPath();
        ctx.moveTo(0, centerY); ctx.lineTo(width, centerY);
        ctx.moveTo(centerX, 0); ctx.lineTo(centerX, height);
        ctx.stroke();
        ctx.restore();

        const drawSingleWave = (waveTimeOffset: number, amplitudeMult: number, lineAlpha: number, lineColor: string) => {
            ctx.save();
            ctx.strokeStyle = lineColor;
            ctx.globalAlpha = lineAlpha;
            ctx.beginPath();
            const sliceWidth = width * 1.0 / fftSize;
            let x = 0;
            for (let i = 0; i < fftSize; i++) {
              const v = timeDomainData[i] / 128.0;
              const sinOffset = Math.sin(i * 0.05 + waveTimeOffset) * 15;
              const y = centerY + (v - 1.0) * (height / 2) * amplitudeMult + sinOffset;
              
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
              x += sliceWidth;
            }
            ctx.stroke();
            ctx.restore();
        };

        drawSingleWave(time * 6, 0.45, 0.25, color3);
        drawSingleWave(time * -4 + Math.PI/2, 0.65, 0.35, color2);
        
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.5, color2);
        gradient.addColorStop(1, color3);
        drawSingleWave(time * 2, 0.85, 1.0, gradient as any);
        break;
      }
      
      case 'galaxy': {
        const radius = Math.min(width, height) / 4.4;
        const barCount = 144;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 12;
        const bassPulse = frequencyData[1] / 255;

        // Background stellar cluster particles spinning with bass energy
        ctx.save();
        ctx.shadowBlur = 8;
        const starCount = 50;
        for (let s = 0; s < starCount; s++) {
            const seedAngle = (s / starCount) * Math.PI * 2 + time * 0.12;
            const orbitDist = radius * 1.3 + (s * 3) + bassPulse * 70;
            const sx = centerX + Math.cos(seedAngle) * orbitDist;
            const sy = centerY + Math.sin(seedAngle) * orbitDist;
            const opacity = 0.1 + (s % 4) * 0.2 + bassPulse * 0.4;
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.beginPath();
            ctx.arc(sx, sy, 1.2 + (s % 3), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Central core galaxy flare
        ctx.fillStyle = `rgba(${hexToRgb(color2).r}, ${hexToRgb(color2).g}, ${hexToRgb(color2).b}, 0.15)`;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.8 + bassPulse * 15, 0, Math.PI * 2);
        ctx.fill();

        for (let i = 0; i < barCount; i++) {
          const dataIndex = Math.floor(i * (bufferLength * 0.75 / barCount));
          const barHeight = Math.pow(frequencyData[dataIndex] / 255, 2.5) * (radius * 1.5);
          if (barHeight < 0.5) continue;
          
          const spiralFactor = i * 0.05 + time * 0.4;
          const angle = (i / barCount) * Math.PI * 2 + spiralFactor;
          
          const x1 = centerX + Math.cos(angle) * (radius + Math.sin(time + i) * 6);
          const y1 = centerY + Math.sin(angle) * (radius + Math.sin(time + i) * 6);
          const x2 = centerX + Math.cos(angle) * (radius + barHeight);
          const y2 = centerY + Math.sin(angle) * (radius + barHeight);
          
          const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
          gradient.addColorStop(0, color);
          gradient.addColorStop(0.5, color2);
          gradient.addColorStop(1, color3);
          ctx.strokeStyle = gradient;
          ctx.shadowColor = color2;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
        break;
      }
      
      case 'nebula': {
          const bassAvg = Math.pow(frequencyData.slice(0, bufferLength / 4).reduce((a,b)=>a+b,0) / (bufferLength/4) / 255, 2);
          const midAvg = Math.pow(frequencyData.slice(bufferLength / 4, bufferLength / 2).reduce((a,b)=>a+b,0) / (bufferLength/4) / 255, 2);
          const trebleAvg = Math.pow(frequencyData.slice(bufferLength / 2).reduce((a,b)=>a+b,0) / (bufferLength/2) / 255, 2);

          const baseRadius = Math.min(width, height) / 7;
          ctx.shadowBlur = 30;
          ctx.lineCap = 'round';

          // Warm celestial background ambient dust flare
          ctx.save();
          const nebGrad = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, baseRadius * 3);
          nebGrad.addColorStop(0, `rgba(${hexToRgb(color).r}, ${hexToRgb(color).g}, ${hexToRgb(color).b}, 0.22)`);
          nebGrad.addColorStop(0.5, `rgba(${hexToRgb(color2).r}, ${hexToRgb(color2).g}, ${hexToRgb(color2).b}, 0.08)`);
          nebGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = nebGrad;
          ctx.beginPath();
          ctx.arc(centerX, centerY, baseRadius * 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          
          const drawFluidCircle = (radius: number, thickness: number, strokeColor: string, waveFreq: number, waveAmp: number) => {
              ctx.save();
              ctx.strokeStyle = strokeColor;
              ctx.shadowColor = strokeColor;
              ctx.lineWidth = thickness;
              ctx.beginPath();
              
              const totalSegments = 120;
              const pts: {x: number, y: number}[] = [];
              for (let i = 0; i <= totalSegments; i++) {
                  const angle = (i / totalSegments) * Math.PI * 2;
                  const offset = Math.sin(angle * waveFreq + time * 4) * waveAmp;
                  const px = centerX + Math.cos(angle) * (radius + offset);
                  const py = centerY + Math.sin(angle) * (radius + offset);
                  pts.push({ x: px, y: py });
              }

              // Perfect quadratic curving for an ultra fluid loop behavior
              ctx.moveTo((pts[0].x + pts[totalSegments - 1].x) / 2, (pts[0].y + pts[totalSegments - 1].y) / 2);
              for (let i = 0; i < totalSegments; i++) {
                  const p0 = pts[i];
                  const p1 = pts[(i + 1) % totalSegments];
                  const xc = (p0.x + p1.x) / 2;
                  const yc = (p0.y + p1.y) / 2;
                  ctx.quadraticCurveTo(p0.x, p0.y, xc, yc);
              }
              ctx.stroke();
              ctx.restore();
          };

          drawFluidCircle(baseRadius * 2.5, 2.5 + trebleAvg * 6, color3, 8, 10 + trebleAvg * 20);
          drawFluidCircle(baseRadius * 1.6, 3.5 + midAvg * 9, color2, 6, 8 + midAvg * 25);
          drawFluidCircle(baseRadius * 0.95, 4.5 + bassAvg * 12, color, 4, 6 + bassAvg * 30);
          break;
      }

      case 'supernova': {
        const spikes = 180;
        const radius = Math.min(width, height) / 8;
        const bassVal = frequencyData[1] / 255;
        ctx.lineWidth = 2.0;
        ctx.shadowBlur = 18;
        
        for (let i = 0; i < spikes; i++) {
          const dataIndex = Math.floor(i * (bufferLength * 0.75 / spikes));
          const barHeight = Math.pow(frequencyData[dataIndex] / 255, 2.5) * (Math.min(height, width) / 2.3 - radius);
           if (barHeight < 1) continue;

          const angle = (i / spikes) * Math.PI * 2 + time * 0.1;
          const x1 = centerX + Math.cos(angle) * radius;
          const y1 = centerY + Math.sin(angle) * radius;
          const x2 = centerX + Math.cos(angle) * (radius + barHeight);
          const y2 = centerY + Math.sin(angle) * (radius + barHeight);

          const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
          gradient.addColorStop(0, color);
          gradient.addColorStop(0.5, color2);
          gradient.addColorStop(1, '#ffffff'); // blinding celestial tips
          ctx.strokeStyle = gradient;
          ctx.shadowColor = color2;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }

        // Outward shooting meteor comets on transients
        if (bassVal > 0.65) {
            ctx.save();
            ctx.shadowBlur = 6;
            ctx.shadowColor = '#ffffff';
            ctx.fillStyle = '#ffffff';
            const cometCount = 6;
            for (let c = 0; c < cometCount; c++) {
                const angle = (c / cometCount) * Math.PI * 2 + time * 1.5;
                const dist = radius * 1.5 + (bassVal * 160) + Math.cos(time * 5 + c) * 15;
                const cx = centerX + Math.cos(angle) * dist;
                const cy = centerY + Math.sin(angle) * dist;
                
                ctx.beginPath();
                ctx.arc(cx, cy, 3, 0, Math.PI * 2);
                ctx.fill();

                // Small comet tails
                ctx.strokeStyle = `rgba(255, 255, 255, 0.4)`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx - Math.cos(angle) * 15, cy - Math.sin(angle) * 15);
                ctx.stroke();
            }
            ctx.restore();
        }
        
        // Outward shockwave rings shooting off on powerful audio hits
        if (bassVal > 0.72) {
             const shellR = radius + bassVal * 120 + Math.sin(time * 5) * 20;
             ctx.strokeStyle = 'rgba(255,255,255,0.4)';
             ctx.lineWidth = 1;
             ctx.beginPath();
             ctx.arc(centerX, centerY, shellR, 0, Math.PI * 2);
             ctx.stroke();
        }
        break;
      }

      case 'equalizer': {
        const barCount = 48;
        const barSpacing = width / barCount;
        const barWidth = barSpacing * 0.75;
        ctx.shadowBlur = 10;
        ctx.shadowColor = color2;

        // Modern engineering grid overlays (DB marks)
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(${hexToRgb(color2).r}, ${hexToRgb(color2).g}, ${hexToRgb(color2).b}, 0.25)`;
        ctx.font = '8px monospace';
        ctx.textAlign = 'left';

        const dbMarkers = [
            { h: 0.85, label: '+0 dB' },
            { h: 0.65, label: '-6 dB' },
            { h: 0.45, label: '-18 dB' },
            { h: 0.25, label: '-36 dB' },
            { h: 0.10, label: '-50 dB' }
        ];

        for (const marker of dbMarkers) {
            const mY = height - (height * marker.h);
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${hexToRgb(color2).r}, ${hexToRgb(color2).g}, ${hexToRgb(color2).b}, 0.08)`;
            ctx.moveTo(40, mY);
            ctx.lineTo(width - 40, mY);
            ctx.stroke();

            ctx.fillText(marker.label, 8, mY + 3);
            ctx.fillText(marker.label, width - 36, mY + 3);
        }
        ctx.restore();

        for (let i = 0; i < barCount; i++) {
          const dataIndex = Math.floor(i * (bufferLength * 0.8 / barCount));
          const val = frequencyData[dataIndex] / 255;
          const barHeight = Math.pow(val, 1.8) * (height * 0.85);

          const x = i * barSpacing + (barSpacing - barWidth) / 2;
          
          // Segmented physical LED block-columns
          const segmentHeight = 8;
          const segmentGap = 3;
          const totalSegments = Math.floor(barHeight / (segmentHeight + segmentGap));
          
          for (let s = 0; s < totalSegments; s++) {
             const sy = height - s * (segmentHeight + segmentGap) - segmentHeight;
             const ratio = s / (height / (segmentHeight + segmentGap));
             
             if (ratio > 0.65) ctx.fillStyle = color;
             else if (ratio > 0.35) ctx.fillStyle = color2;
             else ctx.fillStyle = color3;
             
             if (typeof (ctx as any).roundRect === 'function') {
                 ctx.beginPath();
                 (ctx as any).roundRect(x, sy, barWidth, segmentHeight, 2);
                 ctx.fill();
             } else {
                 ctx.fillRect(x, sy, barWidth, segmentHeight);
             }
          }
          
          const seed = Math.sin(i * 1234.5);
          const hoverHeight = Math.max(0, barHeight) * (0.8 + 0.2 * Math.sin(time + seed * 5));
          if (hoverHeight > 10) {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(x, height - hoverHeight - 5, barWidth, 3);
          }
        }
        break;
      }

      case 'circular-equalizer': {
        const barCount = 96;
        const radius = Math.min(width, height) / 4.5;
        const barWidthOnCircumference = (Math.PI * 2 * radius) / barCount * 0.75;
        const bassPulse = frequencyData[2] / 255;

        ctx.shadowBlur = 12 + bassPulse * 15;
        ctx.shadowColor = color2;

        // Concentric futuristic grid discs inside the radial EQ
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(${hexToRgb(color2).r}, ${hexToRgb(color2).g}, ${hexToRgb(color2).b}, 0.12)`;
        ctx.lineWidth = 1;
        for (let rD = 1; rD <= 4; rD++) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius + rD * 30, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();

        // Soft center glowing ring
        ctx.fillStyle = `rgba(${hexToRgb(color).r}, ${hexToRgb(color).g}, ${hexToRgb(color).b}, 0.15)`;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius - 10, 0, Math.PI * 2);
        ctx.fill();

        for (let i = 0; i < barCount; i++) {
            const dataIndex = Math.floor(i * (bufferLength * 0.72 / barCount));
            const barHeight = Math.pow(frequencyData[dataIndex] / 255, 2.2) * (radius * 1.3);
            
            if (barHeight < 2) continue;

            const angle = (i / barCount) * Math.PI * 2 + Math.sin(time * 0.4) * 0.15;

            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(angle);

            const gradient = ctx.createLinearGradient(radius, 0, radius + barHeight, 0);
            gradient.addColorStop(0, color);
            gradient.addColorStop(0.5, color2);
            gradient.addColorStop(1, color3);
            
            ctx.fillStyle = gradient;
            ctx.shadowColor = color2;
            
            if (typeof (ctx as any).roundRect === 'function') {
                ctx.beginPath();
                (ctx as any).roundRect(radius, -barWidthOnCircumference / 2, barHeight, barWidthOnCircumference, barWidthOnCircumference / 2);
                ctx.fill();
            } else {
                ctx.fillRect(radius, -barWidthOnCircumference / 2, barHeight, barWidthOnCircumference);
            }
            
            ctx.restore();
        }
        break;
      }
      
      case 'firefly': {
        const particleCount = 140;
        const baseRadius = Math.min(width, height) / 3.4;
        const colors = [color, color2, color3, '#FFFFFF'];
        const pCoords: {x: number, y: number, color: string, size: number}[] = [];
        
        for (let i = 0; i < particleCount; i++) {
          const dataIndex = Math.floor(i * (bufferLength * 0.75 / particleCount));
          const magnitude = Math.pow(frequencyData[dataIndex] / 255, 2.5);
          if (magnitude < 0.01) continue;

          const rawAngle = (i / particleCount) * Math.PI * 2;
          const speedFactor = 0.1 + i * 0.005;
          const angle = rawAngle + time * speedFactor;
          
          const radius = baseRadius * 0.45 + magnitude * (baseRadius * 0.65) + Math.cos(time * 2 + i) * 12;
          
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          const particleSize = 1.5 + magnitude * 5.5 + Math.sin(time * 5 + i) * 1;

          const particleColor = colors[i % colors.length];
          pCoords.push({ x, y, color: particleColor, size: particleSize });

          const gradient = ctx.createRadialGradient(x, y, 0, x, y, particleSize * 2);
          gradient.addColorStop(0, particleColor);
          gradient.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = gradient;
          
          ctx.shadowColor = particleColor;
          ctx.shadowBlur = 12;

          ctx.beginPath();
          ctx.arc(x, y, particleSize * 1.8, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw quantum force binding lines between nearby active particles
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.lineWidth = 0.4;
        ctx.globalAlpha = 0.3;
        for (let j = 0; j < pCoords.length; j++) {
            for (let k = j + 1; k < Math.min(pCoords.length, j + 8); k++) {
                const distPoints = Math.hypot(pCoords[j].x - pCoords[k].x, pCoords[j].y - pCoords[k].y);
                if (distPoints < 50) {
                    ctx.beginPath();
                    ctx.moveTo(pCoords[j].x, pCoords[j].y);
                    ctx.lineTo(pCoords[k].x, pCoords[k].y);
                    ctx.strokeStyle = pCoords[j].color;
                    ctx.stroke();
                }
            }
        }
        ctx.restore();

        break;
      }
      
      case 'spikes': {
        ctx.lineWidth = 2.5;
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, color3);
        gradient.addColorStop(0.5, color);
        gradient.addColorStop(1, color2);
        ctx.strokeStyle = gradient;
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;

        // Core central sweep baseline line representing the signal horizon
        ctx.save();
        ctx.shadowBlur = 4;
        ctx.strokeStyle = `rgba(${hexToRgb(color).r}, ${hexToRgb(color).g}, ${hexToRgb(color).b}, 0.35)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();
        ctx.restore();

        ctx.beginPath();
        for (let i = 0; i < width; i += 2) {
          const dataIndex = Math.floor((i / width) * fftSize);
          const v = timeDomainData[dataIndex] / 128.0;
          
          const sparkFactor = Math.sin(i * 0.05 + time * 12) * Math.cos(i * 0.1 - time * 8);
          const amp = (v - 1) * (height / 2.3) * (1 + sparkFactor * 0.25);
          
          if (Math.abs(amp) < 1) continue;

          ctx.moveTo(i, centerY);
          ctx.lineTo(i, centerY + amp);

          // Render branch sparks on massive amplitude bursts
          if (Math.abs(amp) > height * 0.15 && i % 30 === 0) {
              ctx.save();
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(i, centerY + amp);
              ctx.lineTo(i + (amp > 0 ? 10 : -10), centerY + amp * 1.1);
              ctx.stroke();
              ctx.restore();
          }
        }
        ctx.stroke();
        break;
      }
      
      case 'cyber-synth-grid': {
        const horizonY = centerY + height * 0.1;
        const numGridLines = 16;
        
        ctx.save();

        const bassAvg = (frequencyData.slice(0, 10).reduce((a, b) => a + b, 0) / 10) / 255;
        
        // Massive glowing neon retrowave sunset on horizon!
        const sunRadius = Math.min(width, height) / 4.5 + bassAvg * 20;
        const sunGrad = ctx.createLinearGradient(centerX, horizonY - sunRadius, centerX, horizonY);
        sunGrad.addColorStop(0, '#ff007f');
        sunGrad.addColorStop(0.5, '#ff5500');
        sunGrad.addColorStop(1, '#ffaa00');

        ctx.shadowBlur = 40;
        ctx.shadowColor = '#ff007f';
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(centerX, horizonY, sunRadius, Math.PI, 0);
        ctx.fill();

        // Horizontal retrowave synth stripes over the sun
        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(0,0,0,0.95)`;
        const stripeSpan = 8;
        for (let sY = horizonY - sunRadius; sY < horizonY; sY += stripeSpan + 4) {
            const hRatio = (horizonY - sY) / sunRadius;
            const stripeHeight = Math.pow(hRatio, 1.5) * 5;
            ctx.fillRect(centerX - sunRadius - 10, sY, sunRadius * 2 + 20, stripeHeight);
        }
        
        // Render 3D projection grid lines fading into horizon
        for (let i = 0; i <= numGridLines; i++) {
            const xRatio = i / numGridLines;
            const startX = width * (xRatio - 0.5) * 3 + centerX;
            ctx.beginPath();
            ctx.moveTo(centerX, horizonY);
            ctx.lineTo(startX, height);
            ctx.strokeStyle = `rgba(${hexToRgb(color2).r}, ${hexToRgb(color2).g}, ${hexToRgb(color2).b}, 0.25)`;
            ctx.stroke();
        }
        // Horizontal scanline wave moving over time 
        const numHorizLines = 10;
        const speed = 40;
        const phase = (time * speed) % 50;
        for (let j = 0; j < numHorizLines; j++) {
            const yOffset = j * 15 + phase;
            const yTrans = horizonY + Math.pow(yOffset / (numHorizLines * 15), 2) * (height - horizonY);
            if (yTrans > height) continue;
            ctx.beginPath();
            ctx.moveTo(0, yTrans);
            ctx.lineTo(width, yTrans);
            ctx.strokeStyle = `rgba(${hexToRgb(color3).r}, ${hexToRgb(color3).g}, ${hexToRgb(color3).b}, 0.18)`;
            ctx.stroke();
        }
        
        // Rising neon monolith vectors along columns
        const numPillars = 14;
        for (let i = 0; i < numPillars; i++) {
            const isLeft = i < numPillars / 2;
            const pillarIdx = isLeft ? i : i - numPillars / 2;
            const dataIndex = Math.floor((pillarIdx / (numPillars / 2)) * (bufferLength * 0.45));
            const magnitude = frequencyData[dataIndex] / 255;
            
            const spread = width * 0.35 + (pillarIdx * (width * 0.08));
            const px = isLeft ? centerX - spread : centerX + spread;
            const py = height;
            
            const pHeight = Math.pow(magnitude, 1.8) * (height * 0.45);
            if (pHeight < 5) continue;
            
            ctx.save();
            ctx.shadowBlur = 15;
            ctx.shadowColor = color;
            
            const grad = ctx.createLinearGradient(px, py, px, py - pHeight);
            grad.addColorStop(0, color2);
            grad.addColorStop(0.5, color);
            grad.addColorStop(1, '#ffffff');
            ctx.fillStyle = grad;
            
            ctx.fillRect(px - 10, py - pHeight, 20, pHeight);
            
            // Topper electrode flare
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(px - 12, py - pHeight - 4, 24, 4);
            ctx.restore();
        }
        ctx.restore();
        break;
      }
      
      case 'liquid-mercury': {
        const numPoints = 24;
        const baseR = Math.min(width, height) / 4.5;
        const points: {x: number, y: number}[] = [];

        const bassAvg = (frequencyData.slice(0, 10).reduce((a, b) => a + b, 0) / 10) / 255;
        const trebleAvg = (frequencyData.slice(80, 120).reduce((a, b) => a + b, 0) / 40) / 255;

        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const symI = i < numPoints / 2 ? i : numPoints - i;
            const freqIndex = Math.floor((symI / (numPoints / 2)) * (bufferLength * 0.35));
            const val = frequencyData[freqIndex] / 255;

            // Organic rhythmic waves and sine perturbations over duration
            const wave = Math.sin(angle * 4 - time * 5) * (baseR * 0.08) * bassAvg;
            const wave2 = Math.cos(angle * 8 + time * 8) * (baseR * 0.04) * val;
            
            const r = baseR + (Math.pow(val, 1.8) * (baseR * 0.35)) + wave + wave2;
            
            points.push({
                x: centerX + Math.cos(angle) * r,
                y: centerY + Math.sin(angle) * r
            });
        }

        // Beautiful smooth closed natural splining
        ctx.save();
        ctx.beginPath();
        ctx.moveTo((points[0].x + points[numPoints - 1].x) / 2, (points[0].y + points[numPoints - 1].y) / 2);

        for (let i = 0; i < numPoints; i++) {
            const p0 = points[i];
            const p1 = points[(i + 1) % numPoints];
            const xc = (p0.x + p1.x) / 2;
            const yc = (p0.y + p1.y) / 2;
            ctx.quadraticCurveTo(p0.x, p0.y, xc, yc);
        }
        ctx.closePath();

        const gradient = ctx.createRadialGradient(centerX - baseR/3, centerY - baseR/3, 5, centerX, centerY, baseR * 1.5);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.3, color);
        gradient.addColorStop(0.7, color2);
        gradient.addColorStop(1, color3);

        ctx.fillStyle = gradient;
        ctx.shadowColor = color2;
        ctx.shadowBlur = 20 + bassAvg * 30;
        ctx.fill();

        // High gloss metallic chrome specular highlighting ring
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        const specularGrad = ctx.createLinearGradient(centerX - baseR, centerY - baseR, centerX + baseR, centerY + baseR);
        specularGrad.addColorStop(0, 'rgba(255,255,255,0.75)');
        specularGrad.addColorStop(0.2, 'rgba(255,255,255,0.0)');
        specularGrad.addColorStop(0.5, 'rgba(255,255,255,0.0)');
        specularGrad.addColorStop(0.8, 'rgba(0,0,0,0.3)');
        specularGrad.addColorStop(1, 'rgba(0,0,0,0.65)');
        ctx.fillStyle = specularGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseR * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 3 + trebleAvg * 6;
        ctx.stroke();
        ctx.restore();
        break;
      }
      
      case 'dna-helix': {
        const len = width * 0.75;
        const startX = centerX - len / 2;
        const numNodes = 40;
        const amplitude = height * 0.18;
        const frequency = 4.5;

        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = color2;

        for (let i = 0; i < numNodes; i++) {
            const ratio = i / (numNodes - 1);
            const x = startX + ratio * len;
            
            const freqIdx = Math.floor(ratio * (bufferLength * 0.5));
            const val = Math.pow(frequencyData[freqIdx] / 255, 1.8);
            
            const helixAngle = ratio * Math.PI * frequency + time * 2;
            const dynamicAmp = amplitude * (0.3 + val * 0.7);
            
            const y1 = centerY + Math.sin(helixAngle) * dynamicAmp;
            const y2 = centerY - Math.sin(helixAngle) * dynamicAmp;
            
            const zDepth = Math.cos(helixAngle);
            const scale1 = (zDepth + 1.5) * 4;
            const scale2 = (-zDepth + 1.5) * 4;
            
            const rungAlpha = 0.15 + (zDepth + 1) / 2 * 0.45;
            ctx.beginPath();
            ctx.moveTo(x, y1);
            ctx.lineTo(x, y2);
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = `rgba(255,255,255, ${rungAlpha})`;
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(x, y1, scale1, 0, Math.PI * 2);
            const grad1 = ctx.createRadialGradient(x - scale1/3, y1 - scale1/3, 0, x, y1, scale1);
            grad1.addColorStop(0, '#ffffff');
            grad1.addColorStop(1, color);
            ctx.fillStyle = grad1;
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(x, y2, scale2, 0, Math.PI * 2);
            const grad2 = ctx.createRadialGradient(x - scale2/3, y2 - scale2/3, 0, x, y2, scale2);
            grad2.addColorStop(0, '#ffffff');
            grad2.addColorStop(1, color3);
            ctx.fillStyle = grad2;
            ctx.fill();
        }
        ctx.restore();
        break;
      }
      
      case 'vortex-portal': {
        const maxR = Math.min(width, height) * 0.55;
        const bassAvg = (frequencyData.slice(0, 16).reduce((a, b) => a + b, 0) / 16) / 255;
        const midAvg = (frequencyData.slice(16, 64).reduce((a, b) => a + b, 0) / 48) / 255;

        ctx.save();
        ctx.shadowBlur = 10 + bassAvg * 15;
        ctx.shadowColor = color2;

        for (let i = 0; i < 180; i++) {
            const ratio = i / 180;
            const angle = ratio * Math.PI * 2 * 10 - time * (1.5 + midAvg * 3);
            const currentR = ratio * maxR * (1 + bassAvg * 0.15);
            
            const freqIdx = Math.floor(ratio * (bufferLength * 0.4));
            const val = Math.pow(frequencyData[freqIdx] / 255, 2.0);
            
            const x = centerX + Math.cos(angle) * currentR;
            const y = centerY + Math.sin(angle) * currentR;
            
            const pSize = (1.5 + ratio * 8) * (1 + val * 1.5);
            
            let partColor = color;
            if (ratio > 0.6) partColor = color3;
            else if (ratio > 0.3) partColor = color2;
            
            ctx.beginPath();
            ctx.arc(x, y, pSize, 0, Math.PI * 2);
            ctx.fillStyle = partColor;
            ctx.globalAlpha = 0.2 + ratio * 0.8;
            ctx.fill();
            
            if (i % 6 === 0) {
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.quadraticCurveTo(
                    centerX + Math.cos(angle - 0.5) * currentR * 0.5,
                    centerY + Math.sin(angle - 0.5) * currentR * 0.5,
                    x, y
                );
                ctx.strokeStyle = `rgba(${hexToRgb(color2).r}, ${hexToRgb(color2).g}, ${hexToRgb(color2).b}, ${0.05 + val * 0.2})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }
        ctx.restore();
        break;
      }

      case 'quantum-wave': {
        const bassAvg = (frequencyData.slice(0, 10).reduce((a, b) => a + b, 0) / 10) / 255;
        const midAvg = (frequencyData.slice(10, 50).reduce((a, b) => a + b, 0) / 40) / 255;

        ctx.save();
        const horizonY = height * 0.75;
        ctx.strokeStyle = `rgba(${hexToRgb(color2).r}, ${hexToRgb(color2).g}, ${hexToRgb(color2).b}, 0.12)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        ctx.lineTo(width, horizonY);
        ctx.stroke();

        const gridPerspectiveCount = 10;
        for (let g = 0; g <= gridPerspectiveCount; g++) {
          const ratio = g / gridPerspectiveCount;
          const xStart = centerX + (ratio - 0.5) * width * 3;
          ctx.beginPath();
          ctx.moveTo(centerX, horizonY);
          ctx.lineTo(xStart, height);
          ctx.stroke();
        }

        const ribbonCount = 4;
        const pointsPerRibbon = 80;
        const stepX = width / pointsPerRibbon;

        for (let r = 0; r < ribbonCount; r++) {
          const rOffset = r * 0.35 + time * (1.2 + r * 0.3);
          const rAlpha = 0.85 - r * 0.18;
          const waveBaseY = centerY + (r - 1.5) * (height * 0.08);

          ctx.beginPath();
          const pts: { x: number; y: number; val: number }[] = [];

          for (let i = 0; i <= pointsPerRibbon; i++) {
            const freqIdx = Math.floor((i / pointsPerRibbon) * (bufferLength * 0.6));
            const val = Math.pow(frequencyData[freqIdx] / 255, 2.2);
            const x = i * stepX;
            const sineWave = Math.sin(i * 0.08 + rOffset) * (30 + bassAvg * 40);
            const cosWave = Math.cos(i * 0.12 - rOffset * 0.8) * (15 + midAvg * 30);
            const amp = val * (height * 0.28) + sineWave + cosWave;
            const y = waveBaseY - amp;
            pts.push({ x, y, val });

            if (i === 0) ctx.moveTo(x, y);
            else {
              const prev = pts[i - 1];
              const xc = (prev.x + x) / 2;
              const yc = (prev.y + y) / 2;
              ctx.quadraticCurveTo(prev.x, prev.y, xc, yc);
            }
          }

          const grad = ctx.createLinearGradient(0, waveBaseY - 100, width, waveBaseY + 100);
          if (r % 3 === 0) {
            grad.addColorStop(0, color); grad.addColorStop(0.5, color2); grad.addColorStop(1, color3);
          } else if (r % 3 === 1) {
            grad.addColorStop(0, color2); grad.addColorStop(0.5, color3); grad.addColorStop(1, color);
          } else {
            grad.addColorStop(0, color3); grad.addColorStop(0.5, color); grad.addColorStop(1, color2);
          }

          ctx.strokeStyle = grad;
          ctx.lineWidth = 3.5 - r * 0.5;
          ctx.shadowBlur = 15 + bassAvg * 20;
          ctx.shadowColor = r % 2 === 0 ? color : color2;
          ctx.globalAlpha = rAlpha;
          ctx.stroke();

          for (let i = 2; i < pts.length - 2; i += 4) {
            if (pts[i].val > 0.45) {
              ctx.fillStyle = '#ffffff';
              ctx.beginPath();
              ctx.arc(pts[i].x, pts[i].y, 2.5 + pts[i].val * 3, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }

        ctx.restore();
        break;
      }

      case 'cyber-matrix': {
        const barCount = 36;
        const barSpacing = width / barCount;
        const barWidth = barSpacing * 0.65;

        ctx.save();
        ctx.font = '10px monospace';
        ctx.fillStyle = `rgba(${hexToRgb(color2).r}, ${hexToRgb(color2).g}, ${hexToRgb(color2).b}, 0.25)`;
        const glyphs = '0123456789ABCDEF$#@%&*';
        for (let col = 0; col < barCount; col += 2) {
          const colX = col * barSpacing + 4;
          const seed = Math.sin(col * 999 + Math.floor(time * 8));
          for (let row = 0; row < 12; row++) {
            const rowY = (row * 35 + (time * 120 + col * 40) % height);
            const char = glyphs[Math.floor(Math.abs(seed * 100 + row) % glyphs.length)];
            ctx.fillText(char, colX, rowY % height);
          }
        }

        for (let i = 0; i < barCount; i++) {
          const dataIndex = Math.floor(i * (bufferLength * 0.75 / barCount));
          const fVal = Math.pow(frequencyData[dataIndex] / 255, 1.8);
          const barHeight = fVal * (height * 0.75);

          const x = i * barSpacing + (barSpacing - barWidth) / 2;
          const y = height - barHeight;

          const grad = ctx.createLinearGradient(x, height, x, y);
          grad.addColorStop(0, color3);
          grad.addColorStop(0.6, color2);
          grad.addColorStop(1, color);

          ctx.fillStyle = grad;
          ctx.shadowBlur = 12;
          ctx.shadowColor = color2;

          if (typeof (ctx as any).roundRect === 'function') {
            ctx.beginPath();
            (ctx as any).roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
            ctx.fill();
          } else {
            ctx.fillRect(x, y, barWidth, barHeight);
          }

          const peakOffset = Math.max(0, barHeight) * (0.88 + 0.12 * Math.sin(time * 8 + i));
          const peakY = height - peakOffset - 8;

          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 8;
          ctx.fillRect(x - 1, peakY, barWidth + 2, 3);
        }

        ctx.restore();
        break;
      }

      case 'prism-beam': {
        const bassAvg = (frequencyData.slice(0, 8).reduce((a, b) => a + b, 0) / 8) / 255;

        const prismSize = Math.min(width, height) * 0.12;
        const prismX = centerX;
        const prismY = centerY - height * 0.05;

        ctx.save();
        const inBeamGrad = ctx.createLinearGradient(0, prismY, prismX, prismY);
        inBeamGrad.addColorStop(0, 'rgba(255,255,255,0.05)');
        inBeamGrad.addColorStop(1, 'rgba(255,255,255,0.8)');

        ctx.strokeStyle = inBeamGrad;
        ctx.lineWidth = 4 + bassAvg * 8;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(0, prismY - 20);
        ctx.lineTo(prismX, prismY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(prismX, prismY - prismSize);
        ctx.lineTo(prismX - prismSize, prismY + prismSize * 0.8);
        ctx.lineTo(prismX + prismSize, prismY + prismSize * 0.8);
        ctx.closePath();

        const prismGrad = ctx.createLinearGradient(prismX, prismY - prismSize, prismX, prismY + prismSize);
        prismGrad.addColorStop(0, 'rgba(255,255,255,0.4)');
        prismGrad.addColorStop(0.5, 'rgba(200,240,255,0.15)');
        prismGrad.addColorStop(1, 'rgba(255,255,255,0.3)');
        ctx.fillStyle = prismGrad;
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 20;
        ctx.shadowColor = color2;
        ctx.fill();
        ctx.stroke();

        const rayCount = 32;
        const fanAngle = Math.PI * 0.45;
        const startAngle = -fanAngle / 2;

        for (let i = 0; i < rayCount; i++) {
          const freqIdx = Math.floor((i / rayCount) * (bufferLength * 0.65));
          const val = Math.pow(frequencyData[freqIdx] / 255, 2.0);
          const rayAngle = startAngle + (i / rayCount) * fanAngle;
          const length = width * 0.65 * (0.6 + val * 0.8);

          const hue = (i / rayCount) * 320 + time * 20;
          const rayColor = `hsl(${hue}, 100%, 65%)`;

          const rx = prismX + Math.cos(rayAngle) * length;
          const ry = prismY + Math.sin(rayAngle) * length;

          ctx.beginPath();
          ctx.moveTo(prismX, prismY);
          ctx.lineTo(rx, ry);
          ctx.strokeStyle = rayColor;
          ctx.lineWidth = 2 + val * 6;
          ctx.shadowBlur = 12 + val * 15;
          ctx.shadowColor = rayColor;
          ctx.globalAlpha = 0.7 + val * 0.3;
          ctx.stroke();

          if (val > 0.5) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(rx, ry, 3 + val * 4, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.restore();
        break;
      }

      case 'hyper-cube': {
        const bassAvg = (frequencyData.slice(0, 10).reduce((a, b) => a + b, 0) / 10) / 255;
        const midAvg = (frequencyData.slice(10, 40).reduce((a, b) => a + b, 0) / 30) / 255;

        ctx.save();
        const rotX = time * 0.6;
        const rotY = time * 0.8;
        const rotZ = time * 0.4;

        const sizeOuter = Math.min(width, height) * 0.22 * (1 + bassAvg * 0.25);
        const sizeInner = sizeOuter * (0.45 + midAvg * 0.3);

        const createCubeVertices = (s: number) => [
          [-s, -s, -s], [s, -s, -s], [s, s, -s], [-s, s, -s],
          [-s, -s, s], [s, -s, s], [s, s, s], [-s, s, s]
        ];

        const edges = [
          [0,1],[1,2],[2,3],[3,0],
          [4,5],[5,6],[6,7],[7,4],
          [0,4],[1,5],[2,6],[3,7]
        ];

        const project = (v: number[]) => {
          let [x, y, z] = v;
          let x1 = x * Math.cos(rotY) + z * Math.sin(rotY);
          let z1 = -x * Math.sin(rotY) + z * Math.cos(rotY);
          let y2 = y * Math.cos(rotX) - z1 * Math.sin(rotX);
          let z2 = y * Math.sin(rotX) + z1 * Math.cos(rotX);
          let x3 = x1 * Math.cos(rotZ) - y2 * Math.sin(rotZ);
          let y3 = x1 * Math.sin(rotZ) + y2 * Math.cos(rotZ);

          const perspective = 600 / (600 + z2);
          return {
            x: centerX + x3 * perspective,
            y: centerY + y3 * perspective,
            z: z2
          };
        };

        const vOuter = createCubeVertices(sizeOuter).map(project);
        const vInner = createCubeVertices(sizeInner).map(project);

        const drawCube = (verts: any[], strokeCol: string, lineW: number, shadowCol: string) => {
          ctx.strokeStyle = strokeCol;
          ctx.lineWidth = lineW;
          ctx.shadowBlur = 15;
          ctx.shadowColor = shadowCol;

          edges.forEach(([i, j]) => {
            ctx.beginPath();
            ctx.moveTo(verts[i].x, verts[i].y);
            ctx.lineTo(verts[j].x, verts[j].y);
            ctx.stroke();
          });

          verts.forEach((v) => {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(v.x, v.y, lineW * 1.5, 0, Math.PI * 2);
            ctx.fill();
          });
        };

        ctx.strokeStyle = `rgba(${hexToRgb(color2).r}, ${hexToRgb(color2).g}, ${hexToRgb(color2).b}, 0.6)`;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 8; i++) {
          ctx.beginPath();
          ctx.moveTo(vOuter[i].x, vOuter[i].y);
          ctx.lineTo(vInner[i].x, vInner[i].y);
          ctx.stroke();
        }

        drawCube(vOuter, color, 2.5, color);
        drawCube(vInner, color3, 2.0, color3);

        ctx.restore();
        break;
      }

      case 'sonic-pulse-radar': {
        const radius = Math.min(width, height) / 3.2;
        const bassAvg = (frequencyData.slice(0, 10).reduce((a, b) => a + b, 0) / 10) / 255;

        ctx.save();
        ctx.strokeStyle = `rgba(${hexToRgb(color2).r}, ${hexToRgb(color2).g}, ${hexToRgb(color2).b}, 0.25)`;
        ctx.lineWidth = 1;

        for (let r = 1; r <= 4; r++) {
          ctx.beginPath();
          ctx.arc(centerX, centerY, (radius / 4) * r, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.moveTo(centerX - radius - 20, centerY); ctx.lineTo(centerX + radius + 20, centerY);
        ctx.moveTo(centerX, centerY - radius - 20); ctx.lineTo(centerX, centerY + radius + 20);
        ctx.stroke();

        const sweepAngle = (time * 1.8) % (Math.PI * 2);
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + Math.cos(sweepAngle) * radius, centerY + Math.sin(sweepAngle) * radius);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 12;
        ctx.shadowColor = color;
        ctx.stroke();

        ctx.fillStyle = `rgba(${hexToRgb(color).r}, ${hexToRgb(color).g}, ${hexToRgb(color).b}, 0.12)`;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, sweepAngle - 0.5, sweepAngle);
        ctx.closePath();
        ctx.fill();

        const blipCount = 36;
        for (let b = 0; b < blipCount; b++) {
          const freqIdx = Math.floor((b / blipCount) * (bufferLength * 0.7));
          const val = Math.pow(frequencyData[freqIdx] / 255, 2.0);
          if (val < 0.1) continue;

          const bAngle = (b / blipCount) * Math.PI * 2;
          const bRadius = (radius * 0.25) + val * (radius * 0.72);
          const bx = centerX + Math.cos(bAngle) * bRadius;
          const by = centerY + Math.sin(bAngle) * bRadius;

          ctx.fillStyle = color3;
          ctx.shadowBlur = 10;
          ctx.shadowColor = color3;
          ctx.beginPath();
          ctx.arc(bx, by, 3 + val * 4, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = color2;
        ctx.font = '10px monospace';
        ctx.fillText(`SONAR_FREQ: ${(bassAvg * 100).toFixed(1)}%`, centerX - radius, centerY - radius - 10);
        ctx.fillText(`SWEEP_RAD: ${(sweepAngle * 57.3).toFixed(0)}°`, centerX + radius - 70, centerY - radius - 10);

        ctx.restore();
        break;
      }

      case 'hologram-waveform': {
        const rowCount = 12;
        const pointsPerRow = 50;
        const stepX = width / pointsPerRow;

        ctx.save();
        const baseHorizonY = centerY + height * 0.25;

        for (let row = rowCount - 1; row >= 0; row--) {
          const rowProgress = row / rowCount;
          const rowY = baseHorizonY - Math.pow(1 - rowProgress, 1.6) * (height * 0.45);
          const rowScale = 0.3 + rowProgress * 0.7;
          const rowAlpha = 0.2 + rowProgress * 0.8;

          ctx.beginPath();
          const pts: { x: number; y: number }[] = [];

          for (let p = 0; p <= pointsPerRow; p++) {
            const freqIdx = Math.floor((p / pointsPerRow) * (bufferLength * 0.5));
            const val = Math.pow(frequencyData[freqIdx] / 255, 2.0);
            const x = centerX + (p * stepX - width / 2) * rowScale;

            const timeWave = Math.sin(p * 0.2 + row * 0.5 - time * 4) * (10 * rowScale);
            const amp = val * (height * 0.22) * rowScale + timeWave;
            const y = rowY - amp;

            pts.push({ x, y });

            if (p === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }

          ctx.strokeStyle = row === 0 ? '#ffffff' : (row % 2 === 0 ? color : color3);
          ctx.lineWidth = 1.5 + rowProgress * 1.5;
          ctx.globalAlpha = rowAlpha;
          ctx.shadowBlur = 10;
          ctx.shadowColor = color2;
          ctx.stroke();
        }

        ctx.restore();
        break;
      }

      case 'neon-equalizer-bars': {
        const barCount = 40;
        const barSpacing = width / barCount;
        const barWidth = barSpacing * 0.6;
        const bassAvg = (frequencyData.slice(0, 10).reduce((a, b) => a + b, 0) / 10) / 255;

        ctx.save();
        const baselineY = height * 0.75;

        for (let i = 0; i < barCount; i++) {
          const dataIndex = Math.floor(i * (bufferLength * 0.75 / barCount));
          const val = Math.pow(frequencyData[dataIndex] / 255, 2.0);
          const barHeight = val * (height * 0.52);

          const x = i * barSpacing + (barSpacing - barWidth) / 2;
          const y = baselineY - barHeight;
          const cornerR = Math.min(barWidth / 2, 8);

          const grad = ctx.createLinearGradient(x, baselineY, x, y);
          grad.addColorStop(0, color3);
          grad.addColorStop(0.5, color2);
          grad.addColorStop(1, color);

          ctx.fillStyle = grad;
          ctx.shadowBlur = 14 + bassAvg * 10;
          ctx.shadowColor = color2;

          if (typeof (ctx as any).roundRect === 'function') {
            ctx.beginPath();
            (ctx as any).roundRect(x, y, barWidth, barHeight, cornerR);
            ctx.fill();
          } else {
            ctx.fillRect(x, y, barWidth, barHeight);
          }

          const reflHeight = barHeight * 0.35;
          const reflGrad = ctx.createLinearGradient(x, baselineY, x, baselineY + reflHeight);
          reflGrad.addColorStop(0, `rgba(${hexToRgb(color2).r}, ${hexToRgb(color2).g}, ${hexToRgb(color2).b}, 0.35)`);
          reflGrad.addColorStop(1, 'rgba(0,0,0,0)');

          ctx.fillStyle = reflGrad;
          ctx.shadowBlur = 0;
          if (typeof (ctx as any).roundRect === 'function') {
            ctx.beginPath();
            (ctx as any).roundRect(x, baselineY + 2, barWidth, reflHeight, cornerR);
            ctx.fill();
          } else {
            ctx.fillRect(x, baselineY + 2, barWidth, reflHeight);
          }

          const peakOffset = Math.max(0, barHeight) * (0.92 + 0.08 * Math.sin(time * 6 + i));
          const peakY = baselineY - peakOffset - 10;

          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 10;

          if (typeof (ctx as any).roundRect === 'function') {
            ctx.beginPath();
            (ctx as any).roundRect(x, peakY, barWidth, 4, 2);
            ctx.fill();
          } else {
            ctx.fillRect(x, peakY, barWidth, 4);
          }
        }

        ctx.restore();
        break;
      }
      default: {
        const barCount = 100;
        const step = width / barCount;
        const upperPoints: {x: number, y: number}[] = [];
        const lowerPoints: {x: number, y: number}[] = [];
        
        ctx.shadowBlur = 25;
        ctx.shadowColor = color2;

        for (let i = 0; i <= barCount; i++) {
          const dataIndex = Math.floor((i / barCount) * (bufferLength * 0.65));
          const fValue = frequencyData[dataIndex] / 255;
          const barHeight = Math.pow(fValue, 2) * (height * 0.44);
          const x = i * step;
          
          const swayY = Math.sin(i * 0.15 + time * 3.5) * (height * 0.02);
          
          upperPoints.push({ x, y: centerY - barHeight + swayY });
          lowerPoints.push({ x, y: centerY + barHeight + swayY });
        }

        const fillAuroraGradient = (pts: {x: number, y: number}[], isUpper: boolean) => {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(0, centerY);
            
            for (let i = 0; i < pts.length - 1; i++) {
                const xc = (pts[i].x + pts[i + 1].x) / 2;
                const yc = (pts[i].y + pts[i + 1].y) / 2;
                ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
            }
            ctx.lineTo(width, centerY);
            ctx.closePath();
            
            const vertGrad = ctx.createLinearGradient(centerX, centerY, centerX, isUpper ? 0 : height);
            vertGrad.addColorStop(0, 'rgba(0,0,0,0)');
            vertGrad.addColorStop(0.2, color);
            vertGrad.addColorStop(0.6, color2);
            vertGrad.addColorStop(1, 'rgba(0,0,0,0)');
            
            ctx.fillStyle = vertGrad;
            ctx.globalAlpha = 0.55;
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 0; i < pts.length - 1; i++) {
                const xc = (pts[i].x + pts[i + 1].x) / 2;
                const yc = (pts[i].y + pts[i + 1].y) / 2;
                ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
            }
            ctx.strokeStyle = color3;
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.85;
            ctx.stroke();
            
            ctx.restore();
        };

        fillAuroraGradient(upperPoints, true);
        fillAuroraGradient(lowerPoints, false);
        break;
      }
    }
    
    // Draw logo if available
    if (logoImage) {
        let sizeRatio = props.logoSize ?? 0.5;

        if (logoPulses) {
            const bassAvg = (frequencyData.slice(0, 16).reduce((a, b) => a + b, 0) / 16) / 255;
            const strength = props.pulseStrength ?? 0.5;
            const pulseEffect = 1 + Math.pow(bassAvg, 2.5) * (strength * 0.5); // Pulse scaled by strength
            sizeRatio *= pulseEffect;
        }
        
        const maxAllowedSize = Math.min(width, height) * sizeRatio;
        
        const logoAspectRatio = logoImage.width / logoImage.height;
        let logoWidth, logoHeight;

        if (logoAspectRatio >= 1) { // Landscape or square
            logoWidth = maxAllowedSize;
            logoHeight = maxAllowedSize / logoAspectRatio;
        } else { // Portrait
            logoHeight = maxAllowedSize;
            logoWidth = maxAllowedSize * logoAspectRatio;
        }

        const logoX = centerX - logoWidth / 2;
        const logoY = centerY - logoHeight / 2;
        
        ctx.save();
        
        if (logoShape === 'circular' || logoShape === 'sphere') {
            ctx.beginPath();
            ctx.arc(centerX, centerY, Math.min(logoWidth, logoHeight) / 2, 0, Math.PI * 2);
            ctx.clip();
        }

        ctx.drawImage(logoImage, logoX, logoY, logoWidth, logoHeight);

        if (logoShape === 'sphere') {
            const radius = Math.min(logoWidth, logoHeight) / 2;
            const gradient = ctx.createRadialGradient(
                centerX, centerY, 0, 
                centerX, centerY, radius
            );
            gradient.addColorStop(0, 'rgba(255,255,255,0.4)');
            gradient.addColorStop(0.8, 'rgba(0,0,0,0)');
            gradient.addColorStop(1, 'rgba(0,0,0,0.5)');
            ctx.fillStyle = gradient;
            ctx.fillRect(logoX, logoY, logoWidth, logoHeight);
        }

        ctx.restore();
    }
}

interface SmoothedValues {
    bass: number;
    mid: number;
    treble: number;
    lastTime: number;
}

const AudioVisualizer = forwardRef<AudioVisualizerHandle, AudioVisualizerProps>((props, ref) => {
  const { style = 'aurora', width, height, color, color2, color3, logoSrc, logoSize, logoShape, logoPulses, pulseStrength } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoImageRef = useRef<HTMLImageElement | null>(null);
  const smoothedValuesRef = useRef<SmoothedValues>({ bass: 0, mid: 0, treble: 0, lastTime: -1 });
  
  useImperativeHandle(ref, () => ({
      draw(analyserFrame, time) {
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext('2d');
          if (!ctx || !analyserFrame) return;
          
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          let audioMetrics: AudioMetrics | undefined = undefined;

          if (style === 'arc-reactor') {
              const { freqData } = analyserFrame;
              const bassSlice = freqData.slice(0, 3);
              const midSlice = freqData.slice(3, 24);
              const trebleSlice = freqData.slice(24, 140);
              
              const rawBassAvg = (bassSlice.reduce((a, b) => a + b, 0) / (bassSlice.length || 1)) / 255;
              const rawMidAvg = (midSlice.reduce((a, b) => a + b, 0) / (midSlice.length || 1)) / 255;
              const rawTrebleAvg = (trebleSlice.reduce((a, b) => a + b, 0) / (trebleSlice.length || 1)) / 255;

              const state = smoothedValuesRef.current;
              // Reset smoothing if the user seeks backwards in the timeline
              if (time < state.lastTime) {
                  Object.assign(state, { bass: 0, mid: 0, treble: 0 });
              }

              const smoothingFactor = 0.55; // As per user spec for temporal smoothing
              const bass = state.bass * smoothingFactor + rawBassAvg * (1 - smoothingFactor);
              const mid = state.mid * smoothingFactor + rawMidAvg * (1 - smoothingFactor);
              const treble = state.treble * smoothingFactor + rawTrebleAvg * (1 - smoothingFactor);
              
              smoothedValuesRef.current = { bass, mid, treble, lastTime: time };
              audioMetrics = { bass, mid, treble };
          }
          
          drawVisualizerFrame(
              ctx, 
              analyserFrame.freqData, 
              analyserFrame.timeDomainData, 
              time, 
              { style, width, height, color, color2, color3, logoSize, logoShape, logoPulses, pulseStrength }, 
              logoImageRef.current,
              audioMetrics
          );
      }
  }));

  useEffect(() => {
    if (logoSrc) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => { logoImageRef.current = img; };
        img.onerror = () => { logoImageRef.current = null; };
        img.src = logoSrc;
    } else {
        logoImageRef.current = null;
    }
  }, [logoSrc]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = width;
      canvas.height = height;
       const ctx = canvas.getContext('2d');
       if(ctx) {
            // Prevent drawing a static shape on mount or style change.
            // The main draw loop is responsible for all rendering.
            ctx.clearRect(0, 0, width, height);
       }
    }
  }, [width, height, style, color, color2, color3]);

  return <canvas id="audio-visualizer-canvas" ref={canvasRef} className="w-full h-full pointer-events-none" />;
});

export default React.memo(AudioVisualizer);