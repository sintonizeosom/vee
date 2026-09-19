
import { VideoClip, ShapeType, AnimatedBorder, AnalyserFrame, TextInAnimation } from '../types';

const easeOutQuint = (x: number): number => 1 - Math.pow(1 - x, 5);
const easeInQuint = (x: number): number => x * x * x * x * x;
const easeOutBounce = (x: number): number => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (x < 1 / d1) {
        return n1 * x * x;
    } else if (x < 2 / d1) {
        return n1 * (x -= 1.5 / d1) * x + 0.75;
    } else if (x < 2.5 / d1) {
        return n1 * (x -= 2.25 / d1) * x + 0.9375;
    } else {
        return n1 * (x -= 2.625 / d1) * x + 0.984375;
    }
};

export const drawWrappedText = (
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    element: VideoClip,
    scale: number,
    timeInClip: number,
    totalClipDuration: number
) => {
    const {
        content = '', width, height, fontFamily, fontSize = 24, fontWeight = 400, fontStyle = 'normal', color = '#fff',
        textAlign = 'center', letterSpacing = 0, textTransform = 'none', textDecoration = 'none', fillGradient,
        textShadow, textShadowColor, textShadowBlur, textShadowOffsetX, textShadowOffsetY,
        textStroke, textStrokeColor, textStrokeWidth,
        animationIn, animationInDuration = 0.5,
        animationOut, animationOutDuration = 0.5,
        animationLoop,
    } = element;
    
    ctx.font = `${fontStyle} ${fontWeight} ${fontSize * scale}px ${fontFamily}`;
    
    const originalContent = content;

    // --- ANIMATION LOGIC ---
    let alpha = 1.0;
    let transX = 0, transY = 0, scaleXY = 1.0;
    let skewX = 0;
    let rotationRad = 0;
    let extraLetterSpacing = 0;
    let loopColorOverride = '';
    let clipRect: { x: number, y: number, w: number, h: number } | null = null;
    let textToRender = originalContent;
    let filter = 'none';

    const w = width * scale;
    const h = height * scale;
    const lineHeight = (fontSize * 1.2) * scale;

    // --- Pre-compute lines & total height early for exact vertical scrolling metrics ---
    const rawLinesUnwrapped = (content || '').split('\n').map(line => {
         switch (textTransform) {
            case 'uppercase': return line.toUpperCase();
            case 'lowercase': return line.toLowerCase();
            case 'capitalize': return line.replace(/\b\w/g, char => char.toUpperCase());
            default: return line;
        }
    });

    const lines: string[] = [];
    rawLinesUnwrapped.forEach(line => {
        let currentLine = '';
        const words = line.split(' ');
        for (let i = 0; i < words.length; i++) {
            const testLine = currentLine + words[i] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > w && i > 0) {
                lines.push(currentLine.trim());
                currentLine = words[i] + ' ';
            } else {
                currentLine = testLine;
            }
        }
        lines.push(currentLine.trim());
    });

    const totalHeight = Math.max(lineHeight, lines.length * lineHeight);

    // Animation IN
    if (animationIn && animationIn !== 'none' && timeInClip >= 0 && timeInClip < animationInDuration) {
        const progress = timeInClip / animationInDuration;
        switch(animationIn) {
            case 'fade': alpha = easeOutQuint(progress); break;
            case 'slide-in-left': transX = -w * (1 - easeOutQuint(progress)); alpha = progress; break;
            case 'slide-in-right': transX = w * (1 - easeOutQuint(progress)); alpha = progress; break;
            case 'slide-in-up': transY = h * (1 - easeOutQuint(progress)); alpha = progress; break;
            case 'slide-in-down': transY = -h * (1 - easeOutQuint(progress)); alpha = progress; break;
            case 'zoom-in': scaleXY = 0.5 + 0.5 * easeOutQuint(progress); alpha = progress; break;
            case 'reveal-up': clipRect = { x: 0, y: 0, w, h: h * easeOutQuint(progress) }; break;
            case 'typewriter': {
                const charCount = Math.floor(progress * originalContent.length);
                textToRender = originalContent.substring(0, charCount);
                if (charCount < originalContent.length && (timeInClip * 2) % 1 > 0.5) { // Blinking cursor
                   textToRender += '|';
                }
                break;
            }
            case 'blur-in': {
                const blurAmount = Math.max(0, (1 - easeOutQuint(progress)) * 20);
                filter = `blur(${blurAmount}px)`;
                alpha = progress;
                break;
            }
            case 'skew-in': {
                const p = easeOutQuint(progress);
                transX = -w * 0.3 * (1 - p);
                alpha = p;
                skewX = 0.5 * (1 - p);
                break;
            }
            case 'elastic-in': {
                const p = progress;
                const elastic = Math.sin(p * Math.PI * 1.5) * Math.pow(1 - p, 2) * 0.3;
                scaleXY = p + elastic;
                alpha = Math.min(1.0, p * 1.5);
                break;
            }
            case 'tracking-expand': {
                extraLetterSpacing = (1 - easeOutQuint(progress)) * (fontSize * 0.4);
                alpha = progress;
                break;
            }
            case 'rotate-in': {
                const p = easeOutQuint(progress);
                rotationRad = (1 - p) * Math.PI * -0.25;
                scaleXY = 0.5 + 0.5 * p;
                alpha = p;
                break;
            }
            case 'flicker-in': {
                const flick = Math.random() > 0.45 ? 1.0 : 0.15;
                alpha = progress < 0.3 ? progress * 0.3 : (progress < 0.7 ? 0.3 + flick * 0.4 : 0.7 + (1 - progress) * 0.1 + flick * 0.2);
                alpha = Math.min(1.0, Math.max(0.0, alpha));
                break;
            }
            case 'swing-in': {
                const p = easeOutQuint(progress);
                rotationRad = Math.sin((1 - p) * Math.PI) * -0.5;
                scaleXY = 0.6 + 0.4 * p;
                transY = -h * 0.35 * (1 - p);
                alpha = p;
                break;
            }
            case 'spin-bounce-in': {
                rotationRad = (1 - easeOutQuint(progress)) * Math.PI * 2;
                scaleXY = easeOutBounce(progress);
                alpha = Math.min(1.0, progress * 1.5);
                break;
            }
            case 'perspective-flip-in': {
                const p = easeOutQuint(progress);
                scaleXY = 0.5 + 0.5 * p;
                skewX = Math.sin((1 - p) * Math.PI * 0.5) * 0.8;
                alpha = p;
                break;
            }
            case 'drop-impact-in': {
                const p = easeOutBounce(progress);
                transY = -h * 1.5 * (1 - p);
                scaleXY = 1.0 + Math.sin(progress * Math.PI) * 0.2;
                alpha = Math.min(1.0, progress * 2.0);
                break;
            }
            case 'glitch-reveal-in': {
                const isGlitching = Math.random() < (1 - progress) * 0.8;
                if (isGlitching) {
                    transX = (Math.random() - 0.5) * (1 - progress) * 30 * scale;
                    transY = (Math.random() - 0.5) * (1 - progress) * 15 * scale;
                    alpha = progress < 0.2 ? Math.random() : progress;
                } else {
                    alpha = progress;
                }
                break;
            }
            case 'curtain-expand-in': {
                const p = easeOutQuint(progress);
                clipRect = { x: (w / 2) * (1 - p), y: 0, w: w * p, h };
                alpha = Math.min(1.0, p * 1.2);
                break;
            }
            case 'neon-flicker-in': {
                const stage = Math.floor(progress * 10);
                const flickerPattern = [0, 1, 0, 0, 1, 0, 1, 1, 0.8, 1];
                alpha = flickerPattern[Math.min(9, stage)];
                break;
            }
            case 'smoke-dissolve-in': {
                const p = easeOutQuint(progress);
                const blurAmount = Math.max(0, (1 - p) * 30);
                filter = `blur(${blurAmount}px)`;
                scaleXY = 1.3 - 0.3 * p;
                alpha = p;
                break;
            }
            case 'cyber-decode-in': {
                const charCount = Math.floor(progress * originalContent.length);
                const randomChars = "$#@!%&*?><}{][~01";
                textToRender = originalContent.substring(0, charCount) + Array.from({ length: Math.max(0, originalContent.length - charCount) }, () => randomChars[Math.floor(Math.random() * randomChars.length)]).join("");
                alpha = Math.min(1.0, progress * 1.3);
                break;
            }
            case 'slide-in-up-by-char':
            case 'zoom-rotate-by-char':
            case 'wave-enter-by-char':
            case 'fade-in-by-word':
            case 'slide-in-up-by-word':
            case 'word-slide-down-by-word':
            case 'word-3d-flip-by-word':
            case 'pop-in-by-word':
            case 'bounce-in-by-word':
            case 'rotate-in-by-word':
            case 'color-glow-by-word':
            case 'flicker-by-word':
                // These complex animations are handled later
                break;
        }
    }
    // Animation OUT
    else if (animationOut && animationOut !== 'none' && timeInClip > totalClipDuration - animationOutDuration) {
        const progress = (timeInClip - (totalClipDuration - animationOutDuration)) / animationOutDuration;
        if (progress >= 0 && progress <= 1) {
            switch(animationOut) {
                case 'fade': alpha = 1 - easeInQuint(progress); break;
                case 'slide-out-left': transX = -w * easeInQuint(progress); alpha = 1 - progress; break;
                case 'slide-out-right': transX = w * easeInQuint(progress); alpha = 1 - progress; break;
                case 'slide-out-up': transY = -h * easeInQuint(progress); alpha = 1 - progress; break;
                case 'slide-out-down': transY = h * easeInQuint(progress); alpha = 1 - progress; break;
                case 'zoom-out': scaleXY = 1.0 - 0.5 * easeInQuint(progress); alpha = 1 - progress; break;
                case 'fade-zoom-out': scaleXY = 1.0 + 0.4 * easeInQuint(progress); alpha = 1 - progress; break;
                case 'blur-drop-out': {
                    const blurAmount = easeInQuint(progress) * 25;
                    filter = `blur(${blurAmount}px)`;
                    transY = h * 0.4 * easeInQuint(progress);
                    alpha = 1 - progress;
                    break;
                }
                case 'perspective-flip-out': {
                    const p = easeInQuint(progress);
                    skewX = p * 0.9;
                    scaleXY = 1.0 - 0.4 * p;
                    alpha = 1 - p;
                    break;
                }
                case 'implode-out': {
                    const p = easeInQuint(progress);
                    scaleXY = Math.max(0, 1.0 - p);
                    rotationRad = p * Math.PI;
                    alpha = 1 - p;
                    break;
                }
                case 'slide-out-diagonal': {
                    const p = easeInQuint(progress);
                    transX = w * 0.8 * p;
                    transY = -h * 0.8 * p;
                    alpha = 1 - p;
                    break;
                }
                case 'glitch-out': {
                    const isGlitching = Math.random() < progress;
                    if (isGlitching) {
                        transX = (Math.random() - 0.5) * progress * 40 * scale;
                        transY = (Math.random() - 0.5) * progress * 20 * scale;
                        alpha = Math.random() * (1 - progress);
                    } else {
                        alpha = 1 - progress;
                    }
                    break;
                }
                case 'blur-out': {
                    const blurAmount = easeInQuint(progress) * 20;
                    filter = `blur(${blurAmount}px)`;
                    alpha = 1 - progress;
                    break;
                }
                case 'spin-out': {
                    rotationRad = progress * Math.PI * 0.5;
                    scaleXY = 1.0 - easeInQuint(progress);
                    alpha = 1 - progress;
                    break;
                }
                case 'bounce-out': {
                    const p = progress;
                    if (p < 0.3) {
                        transY = -h * 0.1 * (p / 0.3);
                        scaleXY = 1.0 + 0.05 * (p / 0.3);
                    } else {
                        transY = h * 1.5 * ((p - 0.3) / 0.7);
                        alpha = 1 - ((p - 0.3) / 0.7);
                    }
                    break;
                }
                case 'shrink-out': {
                    scaleXY = Math.max(0, 1 - easeInQuint(progress));
                    alpha = 1 - progress;
                    break;
                }
                case 'flicker-out': {
                    const flick = Math.random() > 0.5 ? 1.0 : 0.05;
                    alpha = (1 - progress) * flick;
                    break;
                }
            }
        }
    }
    // Animation LOOP
    else if (animationLoop && animationLoop !== 'none') {
        const loopTime = timeInClip;
        switch(animationLoop) {
            case 'pulse':
                scaleXY = 1.0 + Math.sin(loopTime * Math.PI * 2) * 0.05;
                break;
            case 'bounce':
                transY = Math.abs(Math.sin(loopTime * Math.PI)) * (h * -0.1);
                break;
            case 'pulse-glow':
                scaleXY = 1.0 + Math.sin(loopTime * Math.PI * 2) * 0.04;
                alpha = 0.85 + Math.sin(loopTime * Math.PI * 2) * 0.15;
                break;
            case 'float-rotate-3d':
                transY = Math.sin(loopTime * Math.PI * 1.5) * (fontSize * scale * 0.18);
                rotationRad = Math.sin(loopTime * Math.PI) * 0.06;
                skewX = Math.cos(loopTime * Math.PI) * 0.05;
                break;
            case 'heartbeat': {
                const cycle = (loopTime * 1.5) % 1.0;
                if (cycle < 0.15) {
                    scaleXY = 1.0 + (cycle / 0.15) * 0.12;
                } else if (cycle < 0.3) {
                    scaleXY = 1.12 - ((cycle - 0.15) / 0.15) * 0.12;
                } else if (cycle < 0.45) {
                    scaleXY = 1.0 + ((cycle - 0.3) / 0.15) * 0.08;
                } else if (cycle < 0.6) {
                    scaleXY = 1.08 - ((cycle - 0.45) / 0.15) * 0.08;
                } else {
                    scaleXY = 1.0;
                }
                break;
            }
            case 'wobble':
                rotationRad = Math.sin(loopTime * Math.PI * 4) * 0.08;
                transX = Math.cos(loopTime * Math.PI * 3) * (fontSize * scale * 0.08);
                break;
            case 'breath':
                scaleXY = 1.0 + Math.sin(loopTime * Math.PI * 0.8) * 0.07;
                break;
            case 'shimmer-wave': {
                const hue = (loopTime * 90) % 360;
                loopColorOverride = `hsl(${hue}, 100%, 75%)`;
                scaleXY = 1.0 + Math.sin(loopTime * Math.PI * 3) * 0.02;
                break;
            }
            case 'typewriter-cursor-loop': {
                if (Math.floor(loopTime * 2) % 2 === 0) {
                    textToRender = originalContent + ' |';
                }
                break;
            }
            case 'credits-roll':
            case 'scroll-up': {
                const dur = Math.max(0.2, totalClipDuration);
                const progress = (loopTime % dur) / dur;
                const startOffset = (h + totalHeight) / 2 + lineHeight * 0.5;
                const totalTravel = h + totalHeight + lineHeight;
                transY = startOffset - progress * totalTravel;
                clipRect = { x: -w * 0.1, y: 0, w: w * 1.2, h };
                break;
            }
            case 'credits-slow': {
                const dur = Math.max(0.2, totalClipDuration * 1.6);
                const progress = (loopTime % dur) / dur;
                const startOffset = (h + totalHeight) / 2 + lineHeight * 0.5;
                const totalTravel = h + totalHeight + lineHeight;
                transY = startOffset - progress * totalTravel;
                clipRect = { x: -w * 0.1, y: 0, w: w * 1.2, h };
                break;
            }
            case 'teleprompter-roll': {
                const dur = Math.max(0.2, totalClipDuration);
                const progress = (loopTime % dur) / dur;
                const startOffset = (h + totalHeight) / 2 + lineHeight * 0.5;
                const totalTravel = h + totalHeight + lineHeight;
                transY = startOffset - progress * totalTravel;
                clipRect = { x: -w * 0.1, y: 0, w: w * 1.2, h };
                break;
            }
            case 'credits-star-wars': {
                const dur = Math.max(0.2, totalClipDuration);
                const progress = (loopTime % dur) / dur;
                const startOffset = (h + totalHeight) / 2 + lineHeight * 1.5;
                const totalTravel = h * 1.2 + totalHeight + lineHeight * 2;
                transY = startOffset - progress * totalTravel;
                clipRect = { x: -w * 0.25, y: 0, w: w * 1.5, h };
                break;
            }
            case 'scroll-down': {
                const dur = Math.max(0.2, totalClipDuration);
                const progress = (loopTime % dur) / dur;
                const startOffset = -((h + totalHeight) / 2 + lineHeight * 0.5);
                const totalTravel = h + totalHeight + lineHeight;
                transY = startOffset + progress * totalTravel;
                clipRect = { x: -w * 0.1, y: 0, w: w * 1.2, h };
                break;
            }
            case 'glow':
                alpha = 0.9 + Math.sin(loopTime * Math.PI * 1.5) * 0.1;
                break;
            case 'jitter':
                transX = (Math.random() - 0.5) * (fontSize * scale * 0.15);
                transY = (Math.random() - 0.5) * (fontSize * scale * 0.15);
                break;
            case 'float':
                transY = Math.sin(loopTime * Math.PI * 1.5) * (fontSize * scale * 0.15);
                break;
            case 'wave':
                transY = Math.sin(loopTime * Math.PI * 1.5) * (fontSize * scale * 0.1);
                rotationRad = Math.cos(loopTime * Math.PI * 1.5) * 0.04;
                break;
            case 'rainbow':
                const hue = (loopTime * 120) % 360;
                loopColorOverride = `hsl(${hue}, 95%, 65%)`;
                break;
            case 'glitch-loop': {
                const hasGlitch = Math.random() < 0.08;
                if (hasGlitch) {
                    transX = (Math.random() - 0.5) * (fontSize * scale * 0.25);
                    transY = (Math.random() - 0.5) * (fontSize * scale * 0.15);
                    scaleXY = 1.0 + (Math.random() - 0.5) * 0.18;
                    alpha = 0.7 + Math.random() * 0.3;
                }
                break;
            }
        }
    }
    
    const transformedLinesUnwrapped = textToRender.split('\n').map(line => {
         switch (textTransform) {
            case 'uppercase': return line.toUpperCase();
            case 'lowercase': return line.toLowerCase();
            case 'capitalize': return line.replace(/\b\w/g, char => char.toUpperCase());
            default: return line;
        }
    });

    // --- APPLY TRANSFORMATIONS & RENDER ---
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.filter = filter;

    // Apply dynamic spacing
    if (typeof (ctx as any).letterSpacing !== 'undefined') {
        (ctx as any).letterSpacing = `${(letterSpacing + extraLetterSpacing) * scale}px`;
    }

    // Center transformations
    ctx.translate(w / 2, h / 2);
    ctx.translate(transX, transY);
    ctx.scale(scaleXY, scaleXY);
    if (rotationRad !== 0) {
        ctx.rotate(rotationRad);
    }
    if (skewX !== 0) {
        ctx.transform(1, 0, skewX, 1, 0, 0);
    }
    ctx.translate(-w / 2, -h / 2);

    if (clipRect) {
        ctx.beginPath();
        ctx.rect(clipRect.x, clipRect.y, clipRect.w, clipRect.h);
        ctx.clip();
    }
    
    // If textToRender was modified dynamically (e.g. typewriter), re-evaluate lines
    if (textToRender !== originalContent) {
        lines.length = 0;
        transformedLinesUnwrapped.forEach(line => {
            let currentLine = '';
            const words = line.split(' ');
            for (let i = 0; i < words.length; i++) {
                const testLine = currentLine + words[i] + ' ';
                const metrics = ctx.measureText(testLine);
                if (metrics.width > w && i > 0) {
                    lines.push(currentLine.trim());
                    currentLine = words[i] + ' ';
                } else {
                    currentLine = testLine;
                }
            }
            lines.push(currentLine.trim());
        });
    }
    
    let startY = (h / 2) - totalHeight / 2 + lineHeight * 0.5; // Start pos for first line

    // Setup text alignment
    ctx.textAlign = textAlign as CanvasTextAlign;
    ctx.textBaseline = 'middle';
    
    let xPos = w / 2; // Default center
    if (textAlign === 'left') xPos = 0;
    if (textAlign === 'right') xPos = w;

    if (textShadow) {
        ctx.shadowColor = textShadowColor || 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = (textShadowBlur || 0) * scale;
        ctx.shadowOffsetX = (textShadowOffsetX || 0) * scale;
        ctx.shadowOffsetY = (textShadowOffsetY || 0) * scale;
    }

    const isWordByWord = ['fade-in-by-word', 'slide-in-up-by-word', 'word-slide-down-by-word', 'word-3d-flip-by-word', 'pop-in-by-word', 'bounce-in-by-word', 'rotate-in-by-word', 'color-glow-by-word', 'flicker-by-word'].includes(animationIn as string) && timeInClip >= 0 && timeInClip < animationInDuration;

    if (isWordByWord) {
        let globalWordIndex = 0;
        const allWordsInLines = lines.map(line => line.split(' ').filter(w => w.length > 0));
        const totalWords = allWordsInLines.flat().length;

        if (totalWords === 0) {
            ctx.restore();
            return;
        }

        const staggerDuration = animationInDuration * 0.8;
        const wordAnimationDuration = animationInDuration - staggerDuration;
        const delayBetweenWords = totalWords > 1 ? staggerDuration / (totalWords - 1) : 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const wordsInLine = allWordsInLines[i];
            const lineMetrics = ctx.measureText(line);
            
            // Calculate starting X for words in line based on alignment
            let currentX = (w / 2) - (lineMetrics.width / 2); // Default center logic for individual words calculation
            if (textAlign === 'left') currentX = 0;
            if (textAlign === 'right') currentX = w - lineMetrics.width;

            const currentY = startY + (i * lineHeight);
            
            for (const word of wordsInLine) {
                const wordStartTime = globalWordIndex * delayBetweenWords;
                const wordMetrics = ctx.measureText(word);
                const spaceWidth = ctx.measureText(' ').width;

                if (timeInClip >= wordStartTime) {
                    const timeIntoWordAnim = timeInClip - wordStartTime;
                    const wordProgress = Math.min(1, timeIntoWordAnim / wordAnimationDuration);
                    
                    ctx.save();

                    let wordAlpha = 1, wordTransY = 0, wordScale = 1;
                    let wordRotation = 0;
                    let wordGlowActive = false;

                    if (animationIn === 'fade-in-by-word') {
                        wordAlpha = easeOutQuint(wordProgress);
                    } else if (animationIn === 'slide-in-up-by-word') {
                        wordAlpha = wordProgress;
                        wordTransY = (1 - easeOutQuint(wordProgress)) * (fontSize * scale * 0.5);
                    } else if (animationIn === 'word-slide-down-by-word') {
                        wordAlpha = wordProgress;
                        wordTransY = -(1 - easeOutQuint(wordProgress)) * (fontSize * scale * 0.6);
                    } else if (animationIn === 'word-3d-flip-by-word') {
                        wordAlpha = wordProgress;
                        wordScale = easeOutQuint(wordProgress);
                        wordRotation = (1 - easeOutQuint(wordProgress)) * Math.PI * 0.5;
                    } else if (animationIn === 'pop-in-by-word') {
                        wordAlpha = wordProgress;
                        const p = easeOutQuint(wordProgress);
                        if (p < 0.7) {
                            wordScale = (p / 0.7) * 1.15;
                        } else {
                            wordScale = 1.15 - ((p - 0.7) / 0.3) * 0.15;
                        }
                    } else if (animationIn === 'bounce-in-by-word') {
                        wordAlpha = wordProgress;
                        const t = wordProgress;
                        wordScale = Math.sin(t * Math.PI * 0.7) * 1.35 * (1 - t) + t;
                        wordTransY = (1 - easeOutQuint(wordProgress)) * (fontSize * scale * -0.2);
                    } else if (animationIn === 'rotate-in-by-word') {
                        wordAlpha = wordProgress;
                        wordScale = 0.5 + 0.5 * easeOutQuint(wordProgress);
                        wordRotation = (1 - easeOutQuint(wordProgress)) * -0.35;
                    } else if (animationIn === 'flicker-by-word') {
                        const flick = Math.random() > 0.45 ? 1.0 : 0.15;
                        wordAlpha = wordProgress < 0.5 ? wordProgress * flick : wordProgress;
                    } else if (animationIn === 'color-glow-by-word') {
                        wordAlpha = 1.0;
                        if (wordProgress < 1.0) {
                            wordGlowActive = true;
                            wordScale = 1.12;
                        }
                    }
                    
                    ctx.globalAlpha = alpha * wordAlpha;
                    if (wordGlowActive) {
                        ctx.shadowColor = '#ffd700';
                        ctx.shadowBlur = 12 * scale;
                        ctx.fillStyle = '#ffea00';
                    } else if (fillGradient) {
                        const gradientAngleRad = (fillGradient.angle || 0) * (Math.PI / 180);
                        const x1 = w / 2 - (w/2) * Math.cos(gradientAngleRad);
                        const y1 = h / 2 - (h/2) * Math.sin(gradientAngleRad);
                        const x2 = w / 2 + (w/2) * Math.cos(gradientAngleRad);
                        const y2 = h / 2 + (h/2) * Math.sin(gradientAngleRad);
                        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
                        fillGradient.stops.forEach(stop => gradient.addColorStop(stop.pos, stop.color));
                        ctx.fillStyle = gradient;
                    } else {
                        ctx.fillStyle = color;
                    }

                    const wordDrawX = currentX + wordMetrics.width / 2;
                    
                    ctx.translate(wordDrawX, currentY + wordTransY);
                    ctx.scale(wordScale, wordScale);
                    if (wordRotation !== 0) {
                        ctx.rotate(wordRotation);
                    }
                    // Words are drawn individually, so we use center alignment for scaling consistency
                    ctx.textAlign = 'center';
                    
                    ctx.fillText(word, 0, 0);
                    if (textStroke && textStrokeWidth && textStrokeWidth > 0) {
                        ctx.strokeStyle = textStrokeColor || '#000';
                        ctx.lineWidth = textStrokeWidth * scale;
                        ctx.strokeText(word, 0, 0);
                    }
                    ctx.restore();
                }

                currentX += wordMetrics.width + spaceWidth;
                globalWordIndex++;
            }
        }
        ctx.restore();
        return;
    }

    // Special handling for char-by-char animations
    if (['slide-in-up-by-char', 'zoom-rotate-by-char', 'wave-enter-by-char'].includes(animationIn as string) && timeInClip >= 0 && timeInClip < animationInDuration) {
        const totalChars = lines.join('').length;
        let charIndex = 0;
        let currentY = startY;
        for (const line of lines) {
            const metrics = ctx.measureText(line);
            
            let currentX = w / 2 - metrics.width / 2;
            if (textAlign === 'left') currentX = 0;
            if (textAlign === 'right') currentX = w - metrics.width;

            for (const char of line) {
                const charProgress = Math.max(0, Math.min(1, (timeInClip / animationInDuration - (charIndex / Math.max(1, totalChars)) * 0.5) / 0.5));
                
                ctx.save();
                ctx.globalAlpha = alpha * charProgress;
                
                let charTransY = 0;
                let charScale = 1;
                let charRot = 0;

                if (animationIn === 'slide-in-up-by-char') {
                    charTransY = (1 - easeOutQuint(charProgress)) * lineHeight;
                } else if (animationIn === 'zoom-rotate-by-char') {
                    charScale = easeOutQuint(charProgress);
                    charRot = (1 - easeOutQuint(charProgress)) * Math.PI;
                } else if (animationIn === 'wave-enter-by-char') {
                    charTransY = Math.sin((1 - charProgress) * Math.PI) * -lineHeight * 0.8;
                }
                
                const charWidth = ctx.measureText(char).width;
                const charCenterX = currentX + charWidth / 2;
                const charCenterY = currentY + charTransY;
                
                ctx.translate(charCenterX, charCenterY);
                ctx.scale(charScale, charScale);
                if (charRot !== 0) ctx.rotate(charRot);

                ctx.fillStyle = color;
                ctx.textAlign = 'center'; // Draw char relative to its own center
                ctx.fillText(char, 0, 0);
                
                if (textStroke && textStrokeWidth && textStrokeWidth > 0) {
                    ctx.strokeStyle = textStrokeColor || '#000';
                    ctx.lineWidth = textStrokeWidth * scale;
                    ctx.strokeText(char, 0, 0);
                }
                
                ctx.restore();
                
                currentX += charWidth;
                charIndex++;
            }
            currentY += lineHeight;
        }
    } else {
        let currentY = startY;
        for (const line of lines) {
            // Apply rainbow cycling loop override if active
            if (loopColorOverride) {
                ctx.fillStyle = loopColorOverride;
            } else if (fillGradient) {
                const gradientAngleRad = (fillGradient.angle || 0) * (Math.PI / 180);
                const x1 = w / 2 - (w/2) * Math.cos(gradientAngleRad);
                const y1 = h / 2 - (h/2) * Math.sin(gradientAngleRad);
                const x2 = w / 2 + (w/2) * Math.cos(gradientAngleRad);
                const y2 = h / 2 + (h/2) * Math.sin(gradientAngleRad);
                const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
                fillGradient.stops.forEach(stop => gradient.addColorStop(stop.pos, stop.color));
                ctx.fillStyle = gradient;
            } else {
                ctx.fillStyle = color;
            }

            const visualY = currentY + transY;

            // Visual effects for vertical scrolling / credits
            if (animationLoop === 'credits-roll' || animationLoop === 'scroll-up' || animationLoop === 'credits-slow') {
                const fadeZone = Math.max(lineHeight * 1.2, Math.min(h * 0.22, 100 * scale));
                let edgeFade = 1.0;
                if (visualY < fadeZone) {
                    edgeFade = Math.max(0, visualY / Math.max(1, fadeZone));
                } else if (visualY > h - fadeZone) {
                    edgeFade = Math.max(0, (h - visualY) / Math.max(1, fadeZone));
                }
                ctx.globalAlpha = alpha * edgeFade;
            } else if (animationLoop === 'teleprompter-roll') {
                const distFromCenter = Math.abs(visualY - h * 0.5);
                const focus = Math.max(0, 1 - distFromCenter / Math.max(1, lineHeight * 2.8));
                ctx.globalAlpha = alpha * (0.35 + focus * 0.65);
            } else if (animationLoop === 'credits-star-wars') {
                const normY = Math.max(0, Math.min(1.15, visualY / Math.max(1, h)));
                const pScale = 0.42 + 0.78 * Math.pow(normY, 1.25);
                const pAlpha = Math.max(0, Math.min(1, (visualY - h * 0.05) / (h * 0.35)));

                ctx.save();
                ctx.translate(xPos, currentY);
                ctx.scale(pScale, pScale);
                ctx.globalAlpha = alpha * pAlpha;
                ctx.textAlign = 'center';
                if (!fillGradient && (!color || color.toLowerCase() === '#fff' || color.toLowerCase() === '#ffffff')) {
                    ctx.fillStyle = '#FFE81F'; // Star wars yellow
                }
                ctx.fillText(line, 0, 0);
                if (textStroke && textStrokeWidth && textStrokeWidth > 0) {
                    ctx.strokeStyle = textStrokeColor || '#000';
                    ctx.lineWidth = textStrokeWidth * scale;
                    ctx.strokeText(line, 0, 0);
                }
                ctx.restore();
                currentY += lineHeight;
                continue;
            }

            // Apply quick glitch render override
            const isGlitchActive = animationLoop === 'glitch-loop' && Math.random() < 0.08;
            if (isGlitchActive) {
                // draw offset shadow in secondary color first
                ctx.save();
                ctx.fillStyle = '#00f6ff'; // cyan shadow glitch
                ctx.fillText(line, xPos - 3 * scale, currentY - 1 * scale);
                ctx.restore();
                
                ctx.save();
                ctx.fillStyle = '#ff003c'; // red/pink shadow glitch
                ctx.fillText(line, xPos + 2 * scale, currentY + 2 * scale);
                ctx.restore();
            }

            ctx.fillText(line, xPos, currentY);

            if (textStroke && textStrokeWidth && textStrokeWidth > 0) {
                ctx.strokeStyle = textStrokeColor || '#000';
                ctx.lineWidth = textStrokeWidth * scale;
                ctx.strokeText(line, xPos, currentY);
            }
            currentY += lineHeight;
        }
    }
    
    // Draw decorations after all text is drawn to avoid shadow issues
    ctx.shadowColor = 'transparent'; // disable shadow for decorations
    if (textDecoration !== 'none' && !(animationIn === 'slide-in-up-by-char' && timeInClip < animationInDuration)) {
        let currentY = startY;
        for (const line of lines) {
            const metrics = ctx.measureText(line);
            const decorationY = textDecoration === 'underline' 
                ? currentY + (metrics.actualBoundingBoxAscent * 0.7)
                : currentY; // line-through
            
            let lineXStart = w / 2 - metrics.width / 2;
            if (textAlign === 'left') lineXStart = 0;
            if (textAlign === 'right') lineXStart = w - metrics.width;

            ctx.beginPath();
            ctx.moveTo(lineXStart, decorationY);
            ctx.lineTo(lineXStart + metrics.width, decorationY);
            ctx.strokeStyle = color; // use text color for decoration
            ctx.lineWidth = Math.max(1, (fontSize * scale) / 15);
            ctx.stroke();
            currentY += lineHeight;
        }
    }

    ctx.restore();
};

export const drawShape = (
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    element: VideoClip,
    scale: number
) => {
    const {
        shapeType = 'rectangle', width, height, fillColor = '#fff',
        strokeColor = '#000', strokeWidth = 0, opacity = 1,
        shapeShadow, shapeShadowColor, shapeShadowBlur, shapeShadowOffsetX, shapeShadowOffsetY
    } = element;

    const w = width * scale;
    const h = height * scale;

    ctx.save();
    ctx.globalAlpha = opacity;

    if (shapeShadow) {
        ctx.shadowColor = shapeShadowColor || 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = (shapeShadowBlur || 0) * scale;
        ctx.shadowOffsetX = (shapeShadowOffsetX || 0) * scale;
        ctx.shadowOffsetY = (shapeShadowOffsetY || 0) * scale;
    }

    ctx.beginPath();

    switch (shapeType) {
        case 'rectangle':
            ctx.rect(0, 0, w, h);
            break;
        case 'circle':
            ctx.arc(w / 2, h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
            break;
        case 'ellipse':
            ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
            break;
        case 'triangle':
            ctx.moveTo(w / 2, 0);
            ctx.lineTo(w, h);
            ctx.lineTo(0, h);
            ctx.closePath();
            break;
        case 'star': {
            const spikes = 5;
            const outerRadius = Math.min(w, h) / 2;
            const innerRadius = outerRadius / 2;
            let rot = Math.PI / 2 * 3;
            let x = w / 2;
            let y = h / 2;
            const step = Math.PI / spikes;

            ctx.moveTo(x, y - outerRadius);
            for (let i = 0; i < spikes; i++) {
                x = w / 2 + Math.cos(rot) * outerRadius;
                y = h / 2 + Math.sin(rot) * outerRadius;
                ctx.lineTo(x, y);
                rot += step;

                x = w / 2 + Math.cos(rot) * innerRadius;
                y = h / 2 + Math.sin(rot) * innerRadius;
                ctx.lineTo(x, y);
                rot += step;
            }
            ctx.lineTo(w / 2, h / 2 - outerRadius);
            ctx.closePath();
            break;
        }
    }

    if (fillColor && fillColor !== 'transparent') {
        ctx.fillStyle = fillColor;
        ctx.fill();
    }
    
    if (strokeWidth > 0 && strokeColor) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth * scale;
        ctx.stroke();
    }
    
    ctx.restore();
};

export const drawAnimatedBorder = (
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    border: AnimatedBorder | undefined,
    analyserFrame: AnalyserFrame,
    width: number,
    height: number,
    time: number
) => {
    if (!border || border.type === 'none' || border.width <= 0) return;

    const { type, color1, color2, color3, gradientAngle } = border;
    const borderWidthPixels = (border.width / 100) * Math.min(width, height);

    ctx.save();
    ctx.lineWidth = borderWidthPixels;
    
    const freqData = analyserFrame?.freqData || new Uint8Array(512);
    const bassAvg = (freqData.slice(0, 16).reduce((a, b) => a + b, 0) / 16) / 255;
    const midAvg = (freqData.slice(16, 64).reduce((a, b) => a + b, 0) / 48) / 255;
    const intensity = Math.pow(bassAvg, 2);

    const inset = borderWidthPixels / 2;

    switch (type) {
        case 'solid':
            ctx.strokeStyle = color1;
            // Add a subtle glow animation
            const glowIntensity = 0.5 + Math.sin(time * 2) * 0.5; // Varies between 0 and 1
            ctx.shadowColor = color1;
            ctx.shadowBlur = glowIntensity * 15;
            ctx.strokeRect(inset, inset, width - borderWidthPixels, height - borderWidthPixels);
            break;

        case 'gradient':
            const animatedAngle = (gradientAngle + time * 20) % 360; // Animate angle over time
            const rad = animatedAngle * (Math.PI / 180);
            const x1 = width / 2 - (width / 2) * Math.cos(rad);
            const y1 = height / 2 - (height / 2) * Math.sin(rad);
            const x2 = width / 2 + (width / 2) * Math.cos(rad);
            const y2 = height / 2 + (height / 2) * Math.sin(rad);
            
            const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
            gradient.addColorStop(0, color1);
            gradient.addColorStop(0.5, color2);
            gradient.addColorStop(1, color3 || color1);
            
            ctx.strokeStyle = gradient;
            ctx.strokeRect(inset, inset, width - borderWidthPixels, height - borderWidthPixels);
            break;

        case 'audio-glow':
            ctx.strokeStyle = color1;
            ctx.shadowColor = color2;
            const timeGlow = 5 * (0.5 + Math.sin(time * 1.5) * 0.5); // Slow pulse from 0 to 5
            ctx.shadowBlur = 10 + timeGlow + intensity * 40;
            ctx.lineWidth = borderWidthPixels * (1 + intensity * 0.5);
            const glowInset = ctx.lineWidth / 2;
            ctx.strokeRect(glowInset, glowInset, width - ctx.lineWidth, height - ctx.lineWidth);
            break;
            
        case 'flames': {
            const points = 100;
            ctx.lineWidth = borderWidthPixels * 0.6; // Thinner lines for a more detailed look
            const baseFlameHeight = borderWidthPixels * 1.5;

            const drawFlamePath = (path: Path2D, color: string, alpha: number, blur: number, composite: GlobalCompositeOperation) => {
                ctx.save();
                ctx.strokeStyle = color;
                ctx.globalAlpha = alpha;
                ctx.shadowColor = color;
                ctx.shadowBlur = blur;
                ctx.globalCompositeOperation = composite;
                ctx.stroke(path);
                ctx.restore();
            };

            const createFlameShape = (offset: number, amplitude: number, speed: number) => {
                const path = new Path2D();
                // Top
                for (let i = 0; i <= points; i++) {
                    const x = (i / points) * width;
                    const y = inset - offset + Math.sin(i * 0.1 + time * speed) * amplitude * midAvg + Math.random() * baseFlameHeight * 0.2 * bassAvg;
                    if (i === 0) path.moveTo(x, y); else path.lineTo(x, y);
                }
                // Right
                for (let i = 0; i <= points; i++) {
                    const y = (i / points) * height;
                    const x = (width - inset) + offset + Math.sin(i * 0.1 + time * speed * 1.2) * amplitude * midAvg + Math.random() * baseFlameHeight * 0.2 * bassAvg;
                    path.lineTo(x, y);
                }
                // Bottom
                for (let i = points; i >= 0; i--) {
                    const x = (i / points) * width;
                    const y = (height - inset) + offset + Math.sin(i * 0.1 + time * speed * 0.9) * amplitude * midAvg + Math.random() * baseFlameHeight * 0.2 * bassAvg;
                    path.lineTo(x, y);
                }
                // Left
                for (let i = points; i >= 0; i--) {
                    const y = (i / points) * height;
                    const x = inset - offset + Math.sin(i * 0.1 + time * speed * 1.1) * amplitude * midAvg + Math.random() * baseFlameHeight * 0.2 * bassAvg;
                    path.lineTo(x, y);
                }
                path.closePath();
                return path;
            };

            const flameHeight = baseFlameHeight * (1 + intensity * 2);

            const path1 = createFlameShape(0, flameHeight * 0.5, 5);
            const path2 = createFlameShape(borderWidthPixels * 0.3, flameHeight * 0.35, 6.5);
            const path3 = createFlameShape(borderWidthPixels * 0.6, flameHeight * 0.2, 8);

            drawFlamePath(path1, color3, 0.7 + intensity * 0.3, 30, 'source-over');
            drawFlamePath(path2, color2, 0.8 + intensity * 0.2, 20, 'lighter');
            drawFlamePath(path3, color1, 1.0, 10, 'lighter');
            break;
        }
    }
    
    ctx.restore();
};
