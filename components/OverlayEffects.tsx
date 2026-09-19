import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { OverlayEffect, AnalyserFrame } from '../types';

interface OverlayEffectsProps {
    effect: OverlayEffect;
    width: number;
    height: number;
}

export interface OverlayEffectsHandle {
  renderer: OverlayRenderer;
  update: (analyserFrame: AnalyserFrame, deltaTime: number) => void;
  setTimeForScrub: (time: number) => void;
  updateEffect: (effect: OverlayEffect) => void;
}

type Particle = {
    x: number; y: number;
    vx: number; vy: number;
    radius: number; opacity: number;
    life?: number; decay?: number;
    color?: string;
    // For starfield
    z?: number;
    // For comet trails
    trail?: {x: number, y: number}[];
};

type RainColumn = {
    x: number; y: number;
    speed: number; chars: string[];
    switchInterval: number; lastSwitch: number;
};

export class OverlayRenderer {
    private particles: Particle[] = [];
    private rainColumns: RainColumn[] = [];
    private effect: OverlayEffect;
    private width: number;
    private height: number;
    private time: number = 0;
    
    private lightningBolts: { path: {x:number, y:number}[], life: number }[] = [];
    private lastLightning: number = 0;
    private grainCanvas: OffscreenCanvas | null = null;
    private glitchState: { intensity: number; remaining: number } = { intensity: 0, remaining: 0 };
    private vhsState: { noiseCanvas: OffscreenCanvas | null, scanlineCanvas: OffscreenCanvas | null, trackingBar: { y: number, height: number, life: number} | null } = { noiseCanvas: null, scanlineCanvas: null, trackingBar: null };
    private crtCanvas: OffscreenCanvas | null = null;
    
    private effectState: { [key: string]: any } = {};
    
    private beatDetector = {
        bassHistory: new Array(45).fill(0),
        midHistory: new Array(45).fill(0),
        trebleHistory: new Array(45).fill(0),
        historyIndex: 0,
        bassBeatCooldown: 0,
        midBeatCooldown: 0,
        trebleBeatCooldown: 0,
        isBassBeat: false,
        isMidBeat: false,
        isTrebleBeat: false,
        // New properties for continuous levels
        bassLevel: 0,
        midLevel: 0,
        trebleLevel: 0,
    };
    private colorPopPalette = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

    constructor(effect: OverlayEffect, width: number, height: number) {
        this.effect = effect;
        this.width = width;
        this.height = height;
        this.init();
    }

    public updateDimensions(width: number, height: number) {
        if (this.width !== width || this.height !== height) {
            this.width = width;
            this.height = height;
            this.init();
        }
    }

    public updateEffect(effect: OverlayEffect) {
        if(this.effect === effect) return;
        this.effect = effect;
        this.init();
    }
    
    public setTimeForScrub(newTime: number) {
        if (Math.abs(this.time - newTime) > 0.5) {
            this.time = newTime;
            this.init();
        } else {
            this.time = newTime;
        }
    }

    private init() {
        this.particles = [];
        this.rainColumns = [];
        this.lightningBolts = [];
        this.lastLightning = this.time;
        this.grainCanvas = null;
        this.vhsState = { noiseCanvas: null, scanlineCanvas: null, trackingBar: null };
        this.crtCanvas = null;
        this.glitchState = { intensity: 0, remaining: 0 };
        this.effectState = {};
        
        const createParticles = (count: number, options: any) => {
            for (let i = 0; i < count; i++) {
                this.particles.push({
                    x: Math.random() * this.width,
                    y: options.y !== undefined ? options.y(i) : Math.random() * this.height,
                    vx: options.vx(i),
                    vy: options.vy(i),
                    radius: options.radius(i),
                    opacity: options.opacity(i),
                    life: options.life ? options.life(i) : undefined,
                    decay: options.decay ? options.decay(i) : undefined,
                    color: options.color ? options.color(i) : undefined,
                });
            }
        };

        switch(this.effect) {
            case 'snow':
                createParticles(150, { vx: () => Math.random() - 0.5, vy: () => Math.random() * 30 + 15, radius: () => Math.random() * 2 + 1, opacity: () => Math.random() * 0.5 + 0.5 });
                break;
            case 'falling_leaves':
                 createParticles(40, { vx: () => Math.random() * 2 - 1, vy: () => Math.random() * 40 + 20, radius: () => Math.random() * 4 + 2, opacity: () => 1, life: () => Math.random() * 100, color: (i: number) => ['#D9534F', '#F0AD4E', '#5CB85C'][i % 3] });
                break;
            case 'bokeh':
            case 'light-leaks':
            case 'neon-lights':
            case 'particles_light':
            case 'dust-particles':
                let pCount = { bokeh: 30, 'light-leaks': 20, 'neon-lights': 25, particles_light: 100, 'dust-particles': 200 }[this.effect] || 30;
                createParticles(pCount, {
                    vx: () => (Math.random() - 0.5) * (this.effect === 'dust-particles' ? 20 : 30),
                    vy: () => (Math.random() - 0.5) * (this.effect === 'dust-particles' ? 20 : 30),
                    radius: () => this.effect === 'dust-particles' ? Math.random() * 2 + 0.5 : Math.random() * (this.effect === 'particles_light' ? 4 : (this.effect === 'light-leaks' ? 80 : 40)) + 5,
                    opacity: () => 0,
                    life: () => Math.random() + 0.5, 
                    decay: () => Math.random() * 0.5 + 0.2,
                    color: (i: number) => ({ bokeh: '#8A2BE2', 'light-leaks': ['#ff5733', '#ffc300', '#c70039'][i % 3], 'neon-lights': ['#00ffff', '#ff00ff', '#ffff00'][i % 3], particles_light: '#FFFFFF', 'dust-particles': '#FFFFFF' })[this.effect]
                });
                break;
            case 'fire-particles':
                createParticles(80, {
                    y: () => Math.random() * this.height,
                    vx: () => (Math.random() - 0.5) * 35,
                    vy: () => -(Math.random() * 80 + 40),
                    radius: () => Math.random() < 0.75 ? (Math.random() * 1.2 + 0.8) : (Math.random() * 1.5 + 1.8),
                    opacity: () => Math.random() * 0.35 + 0.3,
                    life: () => Math.random() * 0.9 + 0.1,
                    decay: () => Math.random() * 0.18 + 0.1,
                    color: () => undefined
                });
                break;
            case 'flames':
                createParticles(90, {
                    y: () => Math.random() * this.height,
                    vx: () => (Math.random() - 0.5) * 40,
                    vy: () => -(Math.random() * 95 + 45),
                    radius: () => Math.random() < 0.7 ? (Math.random() * 1.4 + 0.9) : (Math.random() * 2.0 + 2.0),
                    opacity: () => Math.random() * 0.35 + 0.3,
                    life: () => Math.random() * 0.9 + 0.1,
                    decay: () => Math.random() * 0.2 + 0.1,
                    color: () => undefined
                });
                break;
            case 'smoke':
                createParticles(75, {
                    y: () => Math.random() * (this.height + 80) - 40,
                    vx: () => (Math.random() - 0.5) * 40,
                    vy: () => -(Math.random() * 80 + 30),
                    radius: () => Math.random() * 35 + 20,
                    opacity: () => Math.random() * 0.25 + 0.15,
                    life: () => Math.random() * 0.9 + 0.1,
                    decay: () => Math.random() * 0.1 + 0.04,
                    color: () => '#888888'
                });
                break;
            case 'digital-rain':
                const fontSize = 16; const columns = Math.floor(this.width / fontSize); const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                for (let i = 0; i < columns; i++) this.rainColumns.push({ x: i * fontSize, y: Math.random() * -this.height, speed: Math.random() * 180 + 60, chars: Array.from({ length: Math.floor(this.height / fontSize) }, () => chars.charAt(Math.floor(Math.random() * chars.length))), switchInterval: Math.random() * 0.1 + 0.05, lastSwitch: 0, });
                break;
            case 'rain-on-glass':
                createParticles(100, { vx: () => 0, vy: () => Math.random() * 150 + 50, radius: () => Math.random() * 1.5 + 1, opacity: () => Math.random() * 0.6, life: () => 0 });
                break;
            case 'film-grain':
                this.grainCanvas = new OffscreenCanvas(128, 128); const gCtx = this.grainCanvas.getContext('2d')!; const iData = gCtx.createImageData(128, 128); for (let i = 0; i < iData.data.length; i += 4) { const val = Math.random() * 255; iData.data[i] = iData.data[i+1] = iData.data[i+2] = val; iData.data[i+3] = 60; } gCtx.putImageData(iData, 0, 0);
                break;
            case 'vhs':
                this.vhsState.noiseCanvas = new OffscreenCanvas(128, 128); const noiseCtx = this.vhsState.noiseCanvas.getContext('2d')!; const noiseData = noiseCtx.createImageData(128, 128); for (let i = 0; i < noiseData.data.length; i+=4) { const val = Math.random() * 255; noiseData.data[i] = noiseData.data[i+1] = noiseData.data[i+2] = val; noiseData.data[i+3] = 40; } noiseCtx.putImageData(noiseData, 0, 0);
                this.vhsState.scanlineCanvas = new OffscreenCanvas(1, 4); const scanlineCtx = this.vhsState.scanlineCanvas.getContext('2d')!; scanlineCtx.fillStyle = 'rgba(0,0,0,0.3)'; scanlineCtx.fillRect(0, 2, 1, 2);
                break;
            case 'crt':
                this.crtCanvas = new OffscreenCanvas(this.width, this.height); const crtCtx = this.crtCanvas.getContext('2d')!; for(let y = 0; y < this.height; y += 4) { crtCtx.fillStyle = 'rgba(0,0,0,0.3)'; crtCtx.fillRect(0, y, this.width, 1); } const grad = crtCtx.createRadialGradient(this.width/2, this.height/2, this.height/2, this.width/2, this.height/2, this.width/2); grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.4)'); crtCtx.fillStyle = grad; crtCtx.fillRect(0, 0, this.width, this.height);
                break;
            // New space effects
            case 'starfield-motion':
                this.effectState.stars = [];
                for (let i = 0; i < 500; i++) {
                    this.effectState.stars.push({
                        x: (Math.random() - 0.5) * this.width * 2,
                        y: (Math.random() - 0.5) * this.height * 2,
                        z: Math.random() * this.width,
                        radius: Math.random() * 1.5 + 0.5,
                    });
                }
                break;
            case 'nebula-glow':
                this.effectState.blobs = [];
                for (let i = 0; i < 5; i++) {
                    this.effectState.blobs.push({
                        x: Math.random() * this.width,
                        y: Math.random() * this.height,
                        radius: Math.random() * (this.width / 4) + (this.width / 5),
                        color: `hsla(${180 + Math.random() * 120}, 70%, 60%, 0.1)`,
                        x_speed: (Math.random() - 0.5) * 10,
                        y_speed: (Math.random() - 0.5) * 10,
                        x_amp: Math.random() * this.width * 0.1,
                        y_amp: Math.random() * this.height * 0.1,
                    });
                }
                break;
            case 'cosmic-dust':
                createParticles(300, {
                    vx: () => (Math.random() - 0.5) * 15,
                    vy: () => (Math.random() - 0.5) * 15,
                    radius: () => Math.random() * 1.2 + 0.2,
                    opacity: () => Math.random() * 0.4 + 0.1,
                });
                break;
            case 'galaxy-swirl':
                this.particles = [];
                const numParticles = 2000;
                const arms = 4;
                for (let i = 0; i < numParticles; i++) {
                    const armIndex = i % arms;
                    const angleOffset = (armIndex / arms) * Math.PI * 2;
                    const distance = Math.random() * this.width * 0.45;
                    const angle = Math.log(distance / (this.width * 0.05)) / 0.3 + angleOffset;
                    this.particles.push({
                        x: angle, // Store angle
                        y: distance, // Store distance
                        vx: 0, vy: 0,
                        radius: Math.random() * 1.2 + 0.3,
                        opacity: Math.random() * 0.5 + 0.3,
                    });
                }
                break;
            case 'aurora-wave':
                this.effectState.waves = [];
                for (let i = 0; i < 4; i++) {
                    this.effectState.waves.push({
                        y: (i / 4) * this.height + Math.random() * 100 - 50,
                        amp: Math.random() * 50 + 20,
                        freq: 0.005 + Math.random() * 0.005,
                        phase: Math.random() * Math.PI,
                        color: `hsla(${140 + Math.random() * 80}, 60%, 50%, 0.1)`,
                    });
                }
                break;
            case 'deep-space-blur':
                createParticles(25, {
                    vx: () => (Math.random() - 0.5) * 20,
                    vy: () => (Math.random() - 0.5) * 20,
                    radius: () => Math.random() * 80 + 40,
                    opacity: () => 0,
                    life: () => Math.random() + 0.5,
                    decay: () => Math.random() * 0.5 + 0.2,
                    color: (i:number) => ['#8E7AB5', '#B2A4FF', '#9370DB'][i%3]
                });
                break;
            case 'comet-trails':
                this.effectState.cometCooldown = 0;
                break;
        }
    }

    private detectBeats(freqData: Uint8Array, deltaTime: number) {
        if (!freqData || freqData.length === 0) {
            this.beatDetector.isBassBeat = false;
            this.beatDetector.isMidBeat = false;
            this.beatDetector.isTrebleBeat = false;
            this.beatDetector.bassLevel = 0;
            this.beatDetector.midLevel = 0;
            this.beatDetector.trebleLevel = 0;
            return;
        }
    
        const bass = (freqData.slice(1, 5).reduce((a, b) => a + b, 0) / 4) || 0;
        const mid = (freqData.slice(10, 45).reduce((a, b) => a + b, 0) / 35) || 0;
        const treble = (freqData.slice(90, 180).reduce((a, b) => a + b, 0) / 90) || 0;
    
        const smoothing = 0.8; 
        this.beatDetector.bassLevel = this.beatDetector.bassLevel * smoothing + (bass / 255) * (1 - smoothing);
        this.beatDetector.midLevel = this.beatDetector.midLevel * smoothing + (mid / 255) * (1 - smoothing);
        this.beatDetector.trebleLevel = this.beatDetector.trebleLevel * smoothing + (treble / 255) * (1 - smoothing);

        const history = this.beatDetector.bassHistory;
        const avg = history.reduce((a, b) => a + b, 0) / history.length;
        const stdDev = Math.sqrt(history.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b, 0) / history.length);
        const threshold = avg + stdDev * 1.5;

        this.beatDetector.bassBeatCooldown = Math.max(0, this.beatDetector.bassBeatCooldown - deltaTime);

        if (bass > threshold && this.beatDetector.bassBeatCooldown === 0) {
            this.beatDetector.isBassBeat = true;
            this.beatDetector.bassBeatCooldown = 0.3;
        } else {
            this.beatDetector.isBassBeat = false;
        }

        history[this.beatDetector.historyIndex] = bass;
        this.beatDetector.historyIndex = (this.beatDetector.historyIndex + 1) % history.length;
    }

    public update(analyserFrame: AnalyserFrame, deltaTime: number) {
        this.time += deltaTime;
        this.detectBeats(analyserFrame.freqData, deltaTime);

        this.particles.forEach((p) => {
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
    
            if (p.life !== undefined && p.decay !== undefined) {
                p.life -= p.decay * deltaTime;
    
                if (['fire-particles', 'flames', 'smoke'].includes(this.effect)) {
                    // Gentle natural turbulence & horizontal wind sway
                    p.x += Math.sin(this.time * 2.2 + p.y * 0.01) * 20 * deltaTime;

                    p.opacity = Math.max(0, Math.min(1, p.life));

                    // Particle died or traveled far past the top of the canvas
                    if (p.life <= 0 || p.y < -30) {
                        p.life = 1.0;
                        if (Math.random() < 0.3) {
                            p.y = Math.random() * this.height;
                            p.life = Math.random() * 0.5 + 0.5;
                        } else {
                            p.y = this.height + Math.random() * 20;
                        }
                        p.x = Math.random() * this.width;

                        if (this.effect === 'fire-particles') {
                            p.vx = (Math.random() - 0.5) * 35;
                            p.vy = -(Math.random() * 70 + 35);
                            p.decay = Math.random() * 0.18 + 0.1;
                        } else if (this.effect === 'flames') {
                            p.vx = (Math.random() - 0.5) * 40;
                            p.vy = -(Math.random() * 85 + 40);
                            p.decay = Math.random() * 0.2 + 0.1;
                        } else {
                            p.vx = (Math.random() - 0.5) * 30;
                            p.vy = -(Math.random() * 60 + 25);
                            p.decay = Math.random() * 0.1 + 0.04;
                        }
                    }
                } else if (['bokeh', 'light-leaks', 'neon-lights', 'particles_light', 'deep-space-blur', 'beat-particle-burst'].includes(this.effect)) {
                    if (p.life <= 0) {
                         p.x = Math.random() * this.width;
                         p.y = Math.random() * this.height;
                         p.life = Math.random() + 0.5;
                         p.opacity = 0;
                    } else {
                        p.opacity = Math.sin((1 - p.life) * Math.PI);
                    }
                } else if (this.effect === 'falling_leaves') {
                    p.life += deltaTime;
                } else if (this.effect === 'comet-trails') {
                    if (p.trail) {
                        p.trail.push({x: p.x, y: p.y});
                        if (p.trail.length > 20) p.trail.shift();
                    }
                    p.opacity = p.life;
                }
            }
            
            if (['snow', 'dust-particles', 'cosmic-dust', 'rain-on-glass', 'falling_leaves'].includes(this.effect)) {
                 if (p.y > this.height + p.radius * 2) { p.y = -p.radius * 2; p.x = Math.random() * this.width; }
                 if (p.y < -p.radius * 2 && p.vy < 0) { p.y = this.height + p.radius * 2; p.x = Math.random() * this.width; }
                 if (p.x > this.width + p.radius) p.x = -p.radius;
                 if (p.x < -p.radius) p.x = this.width + p.radius;
            }
        });

        if (['comet-trails', 'beat-particle-burst'].includes(this.effect)) {
            this.particles = this.particles.filter(p => p.life! > 0);
        }

        if (this.effect === 'glitch') {
            if (this.glitchState.remaining > 0) {
                this.glitchState.remaining -= deltaTime;
            } else if (Math.random() < 0.1) {
                this.glitchState.remaining = Math.random() * 0.2 + 0.1;
                this.glitchState.intensity = Math.random();
            }
        }
        if (this.effect === 'lightning') {
            if (this.time - this.lastLightning > Math.random() * 5 + 2) {
                this.lastLightning = this.time;
                const createBolt = (x: number, y: number, segments: number, life: number) => {
                    const path = [{x, y}];
                    for (let i = 0; i < segments; i++) {
                        const last = path[path.length - 1];
                        path.push({
                            x: last.x + (Math.random() - 0.5) * 40,
                            y: last.y + Math.random() * 20 + 10
                        });
                    }
                    this.lightningBolts.push({path, life});
                };
                createBolt(Math.random() * this.width, 0, 20, 0.3);
            }
            this.lightningBolts.forEach(bolt => bolt.life -= deltaTime);
            this.lightningBolts = this.lightningBolts.filter(bolt => bolt.life > 0);
        }
        if (this.effect === 'comet-trails') {
            this.effectState.cometCooldown = Math.max(0, this.effectState.cometCooldown - deltaTime);
            if (this.beatDetector.trebleLevel > 0.3 && this.effectState.cometCooldown === 0) {
                this.particles.push({
                    x: Math.random() * this.width, y: Math.random() > 0.5 ? -20 : this.height + 20,
                    vx: (Math.random() - 0.5) * 100, vy: (Math.random() > 0.5 ? 1 : -1) * (150 + Math.random() * 100),
                    radius: 1.5, opacity: 1, life: 2, decay: 0.5,
                    trail: [],
                });
                this.effectState.cometCooldown = 0.5 + Math.random();
            }
        }
        if (this.effect === 'beat-particle-burst' && this.beatDetector.isBassBeat) {
            const burstAmount = 50 + Math.pow(this.beatDetector.bassLevel, 2) * 200;
            for (let i = 0; i < burstAmount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 200 + Math.random() * 800 * this.beatDetector.bassLevel;
                this.particles.push({
                    x: this.width / 2, y: this.height / 2,
                    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                    radius: Math.random() * 2.5 + 1.5, opacity: 1, life: 1, decay: 1.5,
                });
            }
        }
    }

    public applyPreDrawTransforms(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, deltaTime: number) {
        const { bassLevel, midLevel } = this.beatDetector;

        if (this.effect === 'beat-zoom') {
            const scale = 1 + bassLevel * 0.1;
            ctx.translate(this.width / 2, this.height / 2);
            ctx.scale(scale, scale);
            ctx.translate(-this.width / 2, -this.height / 2);
        }
        
        if (this.effect === 'beat-shake') {
            const intensity = Math.pow(bassLevel, 3) * 20;
            const dx = (Math.random() - 0.5) * intensity;
            const dy = (Math.random() - 0.5) * intensity;
            ctx.translate(dx, dy);
        }
        if (this.effect === 'beat-stretch') {
            const stretchX = 1 + midLevel * 0.1;
            const stretchY = 1 - midLevel * 0.1;
            ctx.translate(this.width / 2, this.height / 2);
            ctx.scale(stretchX, stretchY);
            ctx.translate(-this.width / 2, -this.height / 2);
        }
    }

    public drawOverlays(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, analyserFrame: AnalyserFrame, deltaTime: number) {
        ctx.save();
        const { bassLevel, midLevel, trebleLevel } = this.beatDetector;

        const renderGenericParticles = () => {
             this.particles.forEach(p => {
                ctx.beginPath();
                ctx.globalAlpha = p.opacity;
                ctx.fillStyle = p.color || 'white';
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
            });
        };

        switch (this.effect) {
            case 'snow':
            case 'bokeh':
            case 'particles_light':
            case 'light-leaks':
            case 'neon-lights':
            case 'dust-particles':
            case 'cosmic-dust':
            case 'deep-space-blur':
                renderGenericParticles();
                break;
            case 'fire-particles': {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';

                this.particles.forEach(p => {
                    const life = Math.max(0, Math.min(1, p.life ?? 1));
                    const heightRatio = Math.max(0, Math.min(1, p.y / this.height));
                    const heat = life * 0.65 + heightRatio * 0.35;

                    let coreColor: string;
                    let glowColor: string;
                    if (heat > 0.7) {
                        coreColor = '#FFF5D6';
                        glowColor = '#FFB800';
                    } else if (heat > 0.4) {
                        coreColor = '#FFA01C';
                        glowColor = '#E64A00';
                    } else {
                        coreColor = '#E63900';
                        glowColor = '#8A0F00';
                    }

                    const currentRadius = Math.max(0.7, p.radius * (0.75 + life * 0.35));

                    // Soft glowing aura
                    ctx.fillStyle = glowColor;
                    ctx.globalAlpha = p.opacity * 0.35;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, currentRadius * 2.2, 0, Math.PI * 2);
                    ctx.fill();

                    // Hot bright ember core
                    ctx.fillStyle = coreColor;
                    ctx.globalAlpha = p.opacity * 0.85;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
                    ctx.fill();
                });
                ctx.restore();
                break;
            }
            case 'flames': {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';

                // Subtle, gentle floating fire sparks & warm micro-embers
                this.particles.forEach(p => {
                    const life = Math.max(0, Math.min(1, p.life ?? 1));
                    const heightRatio = Math.max(0, Math.min(1, p.y / this.height));
                    const heat = life * 0.6 + heightRatio * 0.4;

                    const coreColor = heat > 0.68 ? '#FFF8E1' : heat > 0.4 ? '#FFB74D' : '#FF5722';
                    const glowColor = heat > 0.5 ? '#FFA000' : '#D84315';

                    const currentRadius = Math.max(0.8, p.radius * (0.75 + life * 0.4));

                    // Soft glowing aura
                    ctx.fillStyle = glowColor;
                    ctx.globalAlpha = p.opacity * 0.3;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, currentRadius * 2.5, 0, Math.PI * 2);
                    ctx.fill();

                    // Hot bright ember core
                    ctx.fillStyle = coreColor;
                    ctx.globalAlpha = p.opacity * 0.8;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
                    ctx.fill();
                });

                ctx.restore();
                break;
            }
            case 'smoke':
                ctx.filter = 'blur(10px)';
                renderGenericParticles();
                break;
            case 'falling_leaves':
                this.particles.forEach(p => {
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate(Math.sin(p.life! * 2 + p.radius) * 2);
                    ctx.fillStyle = p.color!;
                    ctx.globalAlpha = p.opacity;
                    ctx.beginPath();
                    ctx.ellipse(0, 0, p.radius * 2, p.radius, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                });
                break;
            case 'rain-on-glass':
                this.particles.forEach(p => {
                    ctx.strokeStyle = `rgba(200, 200, 220, ${p.opacity * 0.5})`;
                    ctx.lineWidth = p.radius * 0.5;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p.x, p.y - p.radius * 10);
                    ctx.stroke();
                });
                break;
            case 'digital-rain':
                ctx.fillStyle = 'rgba(10, 25, 10, 0.1)';
                ctx.fillRect(0, 0, this.width, this.height);
                ctx.fillStyle = '#0F0';
                ctx.font = '16px monospace';
                this.rainColumns.forEach(col => {
                    for (let i = 0; i < col.chars.length; i++) {
                        const char = col.chars[i];
                        const y = col.y + i * 16;
                        if (y > 0 && y < this.height) ctx.fillText(char, col.x, y);
                    }
                    col.y += col.speed * deltaTime;
                    if (col.y > this.height + col.chars.length * 16) col.y = Math.random() * -this.height;
                    col.lastSwitch += deltaTime;
                    if (col.lastSwitch > col.switchInterval) {
                        col.chars[Math.floor(Math.random() * col.chars.length)] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.charAt(Math.floor(Math.random() * 36));
                        col.lastSwitch = 0;
                    }
                });
                break;
            case 'film-grain':
                if (this.grainCanvas) {
                    ctx.globalAlpha = 0.15;
                    ctx.fillStyle = ctx.createPattern(this.grainCanvas, 'repeat')!;
                    ctx.fillRect(0, 0, this.width, this.height);
                }
                break;
            case 'vhs':
                if (this.vhsState.noiseCanvas) {
                    ctx.globalAlpha = 0.1;
                    ctx.fillStyle = ctx.createPattern(this.vhsState.noiseCanvas, 'repeat')!;
                    ctx.fillRect(0, 0, this.width, this.height);
                }
                if (this.vhsState.scanlineCanvas) {
                    ctx.globalAlpha = 1.0;
                    ctx.fillStyle = ctx.createPattern(this.vhsState.scanlineCanvas, 'repeat')!;
                    ctx.fillRect(0, 0, this.width, this.height);
                }
                if (!this.vhsState.trackingBar || this.vhsState.trackingBar.life <= 0) {
                    if (Math.random() < 0.05) this.vhsState.trackingBar = { y: Math.random() * this.height, height: Math.random() * 30 + 10, life: Math.random() * 0.5 + 0.2 };
                }
                if (this.vhsState.trackingBar) {
                    const bar = this.vhsState.trackingBar;
                    const x_offset = (Math.random() - 0.5) * 20;
                    ctx.drawImage(ctx.canvas, x_offset, 0, this.width, bar.y, 0, 0, this.width, bar.y);
                    ctx.drawImage(ctx.canvas, x_offset, bar.y, this.width, bar.height, 0, bar.y, this.width, bar.height);
                    ctx.drawImage(ctx.canvas, x_offset, bar.y + bar.height, this.width, this.height - bar.y - bar.height, 0, bar.y + bar.height, this.width, this.height - bar.y - bar.height);
                    bar.life -= deltaTime;
                }
                break;
            case 'crt':
                if (this.crtCanvas) {
                    ctx.globalCompositeOperation = 'overlay';
                    ctx.globalAlpha = 0.8;
                    ctx.drawImage(this.crtCanvas, 0, 0, this.width, this.height);
                }
                break;
            case 'glitch':
                if (this.glitchState.remaining > 0) {
                    const intensity = this.glitchState.intensity;
                    const sliceHeight = Math.floor(Math.random() * 20 + 5);
                    for (let i = 0; i < 10; i++) {
                        const y = Math.random() * this.height;
                        const x_offset = (Math.random() - 0.5) * 80 * intensity;
                        ctx.drawImage(ctx.canvas, 0, y, this.width, sliceHeight, x_offset, y, this.width, sliceHeight);
                    }
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.globalAlpha = 0.1 * intensity;
                    ctx.fillStyle = '#ff0000';
                    ctx.fillRect((Math.random() - 0.5) * 5, 0, this.width, this.height);
                    ctx.fillStyle = '#00ff00';
                    ctx.fillRect((Math.random() - 0.5) * 5, 0, this.width, this.height);
                    ctx.fillStyle = '#0000ff';
                    ctx.fillRect((Math.random() - 0.5) * 5, 0, this.width, this.height);
                }
                break;
            case 'lightning':
                if (this.lightningBolts.length > 0) {
                    ctx.fillStyle = `rgba(200, 200, 255, ${Math.random() * 0.2 + 0.1})`;
                    ctx.fillRect(0, 0, this.width, this.height);
                }
                this.lightningBolts.forEach(bolt => {
                    ctx.strokeStyle = `rgba(255, 255, 255, ${bolt.life * 3})`;
                    ctx.lineWidth = 3;
                    ctx.shadowColor = 'white';
                    ctx.shadowBlur = 20;
                    ctx.beginPath();
                    ctx.moveTo(bolt.path[0].x, bolt.path[0].y);
                    for (let i = 1; i < bolt.path.length; i++) ctx.lineTo(bolt.path[i].x, bolt.path[i].y);
                    ctx.stroke();
                });
                break;
            case 'water_waves':
                ctx.globalCompositeOperation = 'overlay';
                ctx.globalAlpha = 0.2;
                for (let i = 0; i < 5; i++) {
                    ctx.beginPath();
                    const phase = this.time * 2 + i * 0.5;
                    const y = this.height * (i / 5) + Math.sin(phase) * 20;
                    const waveHeight = 50 + Math.sin(phase * 0.5) * 20;
                    ctx.moveTo(0, y);
                    for (let x = 0; x < this.width; x += 10) {
                        ctx.lineTo(x, y + Math.sin(x * 0.02 + phase) * waveHeight);
                    }
                    ctx.strokeStyle = `hsla(${180 + i * 20}, 70%, 70%, 0.5)`;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
                break;
            case 'lens_flare':
                const flareX = this.width * (0.5 + Math.sin(this.time * 0.1) * 0.4);
                const flareY = this.height * (0.5 + Math.cos(this.time * 0.15) * 0.4);
                const dx = this.width / 2 - flareX;
                const dy = this.height / 2 - flareY;
                const drawFlareElement = (x: number, y: number, size: number, opacity: number, color: string) => {
                    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
                    gradient.addColorStop(0, `rgba(${color}, ${opacity})`);
                    gradient.addColorStop(1, `rgba(${color}, 0)`);
                    ctx.fillStyle = gradient;
                    ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
                };
                ctx.globalCompositeOperation = 'screen';
                drawFlareElement(flareX, flareY, 100, 0.2, '255, 220, 180');
                for (let i = 0; i < 5; i++) {
                    ctx.fillStyle = `hsla(${i * 40 + 180}, 100%, 70%, ${0.1 - i * 0.02})`;
                    ctx.beginPath();
                    ctx.arc(flareX + dx * i * 0.2, flareY + dy * i * 0.2, (5 - i) * 10 + Math.random() * 20, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
             case 'beat-flash':
                ctx.fillStyle = 'white';
                ctx.globalAlpha = Math.pow(bassLevel, 3);
                ctx.fillRect(0, 0, this.width, this.height);
                break;
            case 'beat-flash-dual':
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = '#ff00ff';
                ctx.globalAlpha = Math.pow(bassLevel, 3);
                ctx.fillRect(0, 0, this.width / 2, this.height);
                ctx.fillStyle = '#00ffff';
                ctx.globalAlpha = Math.pow(trebleLevel, 3);
                ctx.fillRect(this.width / 2, 0, this.width / 2, this.height);
                break;
            case 'beat-brightness':
                ctx.fillStyle = 'white';
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = bassLevel * 0.5;
                ctx.fillRect(0, 0, this.width, this.height);
                break;
            case 'beat-color-pop':
                if (bassLevel > 0.5) {
                    const color = this.colorPopPalette[Math.floor(this.time * 10) % this.colorPopPalette.length];
                    ctx.fillStyle = color;
                    ctx.globalAlpha = (bassLevel - 0.5) * 2;
                    ctx.globalCompositeOperation = 'color';
                    ctx.fillRect(0, 0, this.width, this.height);
                }
                break;
            case 'beat-particle-burst':
                ctx.fillStyle = 'white';
                renderGenericParticles();
                break;
            case 'motion-scale-pulse': {
                const intensity = Math.pow(bassLevel, 2);
                if (intensity > 0.1) {
                    const gradient = ctx.createRadialGradient(this.width/2, this.height/2, this.height/2, this.width/2, this.height/2, this.width/2 + intensity * 200);
                    gradient.addColorStop(0, 'rgba(255,255,255,0)');
                    gradient.addColorStop(1, `rgba(255, 255, 255, ${intensity * 0.3})`);
                    ctx.fillStyle = gradient;
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.fillRect(0, 0, this.width, this.height);
                }
                break;
            }
            case 'beat-border-glow': {
                const intensity = midLevel;
                if (intensity > 0.05) {
                    const gradient = ctx.createConicGradient(this.time, this.width / 2, this.height / 2);
                    gradient.addColorStop(0, "hsl(0, 100%, 50%)");
                    gradient.addColorStop(0.16, "hsl(60, 100%, 50%)");
                    gradient.addColorStop(0.33, "hsl(120, 100%, 50%)");
                    gradient.addColorStop(0.5, "hsl(180, 100%, 50%)");
                    gradient.addColorStop(0.66, "hsl(240, 100%, 50%)");
                    gradient.addColorStop(0.83, "hsl(300, 100%, 50%)");
                    gradient.addColorStop(1, "hsl(360, 100%, 50%)");
                    
                    ctx.strokeStyle = gradient;
                    ctx.lineWidth = 5 + intensity * 25;
                    ctx.globalAlpha = intensity;
                    ctx.shadowColor = "white";
                    ctx.shadowBlur = 10 + intensity * 20;
                    ctx.strokeRect(0, 0, this.width, this.height);
                }
                break;
            }
             case 'starfield-motion': {
                const { stars } = this.effectState;
                if (!stars) break;
                ctx.fillStyle = 'white';
                const speed = 1 + bassLevel * 10;
                stars.forEach((star: any) => {
                    star.z -= deltaTime * 20 * speed;
                    if (star.z <= 0) {
                        star.z = this.width;
                        star.x = (Math.random() - 0.5) * this.width * 2;
                        star.y = (Math.random() - 0.5) * this.height * 2;
                    }

                    const k = 128 / star.z;
                    const px = star.x * k + this.width / 2;
                    const py = star.y * k + this.height / 2;
                    const size = star.radius * k;

                    if (px > 0 && px < this.width && py > 0 && py < this.height) {
                        ctx.globalAlpha = (1 - star.z / this.width) * 0.8;
                        ctx.beginPath();
                        ctx.arc(px, py, size, 0, Math.PI * 2);
                        ctx.fill();
                    }
                });
                break;
            }
            case 'nebula-glow': {
                const { blobs } = this.effectState;
                if (!blobs) break;
                ctx.filter = `blur(${20 + bassLevel * 40}px)`;
                blobs.forEach((blob: any) => {
                    blob.x += blob.x_speed * deltaTime;
                    blob.y += blob.y_speed * deltaTime;

                    if (blob.x > this.width + blob.radius) blob.x = -blob.radius;
                    if (blob.x < -blob.radius) blob.x = this.width + blob.radius;
                    if (blob.y > this.height + blob.radius) blob.y = -blob.radius;
                    if (blob.y < -blob.radius) blob.y = this.height + blob.radius;

                    ctx.fillStyle = blob.color;
                    ctx.beginPath();
                    const finalX = blob.x + Math.sin(this.time * 0.5 + blob.y) * blob.x_amp * midLevel;
                    const finalY = blob.y + Math.cos(this.time * 0.5 + blob.x) * blob.y_amp * trebleLevel;
                    const finalRadius = blob.radius * (1 + bassLevel * 0.5);
                    ctx.arc(finalX, finalY, finalRadius, 0, Math.PI * 2);
                    ctx.fill();
                });
                break;
            }
            case 'galaxy-swirl': {
                ctx.fillStyle = 'white';
                const rotationSpeed = 0.05 + bassLevel * 0.2;
                this.particles.forEach(p => {
                    const angle = p.x + this.time * rotationSpeed;
                    const distance = p.y * (1 + midLevel * 0.1);
                    const x = this.width / 2 + Math.cos(angle) * distance;
                    const y = this.height / 2 + Math.sin(angle) * distance;
                    ctx.globalAlpha = p.opacity;
                    ctx.beginPath();
                    ctx.arc(x, y, p.radius, 0, Math.PI * 2);
                    ctx.fill();
                });
                break;
            }
            case 'aurora-wave': {
                const { waves } = this.effectState;
                if (!waves) break;
                waves.forEach((wave: any) => {
                    ctx.beginPath();
                    const gradient = ctx.createLinearGradient(0, wave.y - wave.amp, 0, wave.y + wave.amp);
                    gradient.addColorStop(0, 'transparent');
                    gradient.addColorStop(0.5, wave.color);
                    gradient.addColorStop(1, 'transparent');
                    ctx.fillStyle = gradient;
                    
                    for (let x = 0; x < this.width; x++) {
                        const y = wave.y + Math.sin(x * wave.freq + this.time + wave.phase) * wave.amp * (1 + midLevel);
                        if (x === 0) ctx.moveTo(x, y - 50);
                        else ctx.lineTo(x, y);
                    }
                    ctx.lineTo(this.width, this.height + 50);
                    ctx.lineTo(0, this.height + 50);
                    ctx.closePath();
                    ctx.fill();
                });
                break;
            }
            case 'comet-trails': {
                this.particles.forEach(p => {
                    if (p.trail && p.trail.length > 1) {
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                        ctx.lineWidth = p.radius * 1.5;
                        ctx.lineCap = 'round';
                        ctx.beginPath();
                        ctx.moveTo(p.trail[0].x, p.trail[0].y);
                        for (let i = 1; i < p.trail.length; i++) {
                            ctx.globalAlpha = p.opacity * (i / p.trail.length);
                            ctx.lineTo(p.trail[i].x, p.trail[i].y);
                        }
                        ctx.stroke();
                    }
                });
                break;
            }
        }
        ctx.restore();
    }
}


const OverlayEffects = forwardRef<OverlayEffectsHandle, OverlayEffectsProps>((props, ref) => {
    const { effect, width, height } = props;
    const rendererRef = useRef<OverlayRenderer | null>(null);

    useEffect(() => {
        if (!rendererRef.current) {
            rendererRef.current = new OverlayRenderer(effect, width, height);
        } else {
            rendererRef.current.updateDimensions(width, height);
            rendererRef.current.updateEffect(effect);
        }
    }, [effect, width, height]);

    useImperativeHandle(ref, () => ({
        get renderer() {
            if (!rendererRef.current) {
                rendererRef.current = new OverlayRenderer(effect, width, height);
            }
            return rendererRef.current;
        },
        update(analyserFrame, deltaTime) {
            rendererRef.current?.update(analyserFrame, deltaTime);
        },
        setTimeForScrub(time) {
            rendererRef.current?.setTimeForScrub(time);
        },
        updateEffect(newEffect) {
            rendererRef.current?.updateEffect(newEffect);
        },
    }));

    return null;
});

export default OverlayEffects;