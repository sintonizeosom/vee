
import { ProjectState, VideoClip, AnalyserFrame, Track } from '../types';

/**
 * Calculates a gain multiplier (0.0 to 1.0) for a clip at a specific point in time,
 * accounting for fade-in and fade-out.
 * @param clip The clip to calculate the fade for.
 * @param sourceTime The current time position within the original, untrimmed source media (in seconds).
 * @returns A gain multiplier from 0.0 (silent) to 1.0 (full volume).
 */
export const calculateFadeMultiplier = (clip: VideoClip, sourceTime: number): number => {
    const { startTime, endTime, fadeInDuration = 0, fadeOutDuration = 0 } = clip;

    // This is a defensive check. The calling logic should ensure sourceTime is within bounds.
    if (sourceTime < startTime || sourceTime > endTime) {
        return 0.0;
    }

    const hasFadeIn = fadeInDuration > 0;
    const hasFadeOut = fadeOutDuration > 0;
    
    // Check for fade-in period
    if (hasFadeIn && sourceTime < startTime + fadeInDuration) {
        const timeIntoFade = sourceTime - startTime;
        return Math.max(0.0, Math.min(1.0, timeIntoFade / fadeInDuration));
    }

    // Check for fade-out period
    if (hasFadeOut && sourceTime > endTime - fadeOutDuration) {
        const timeBeforeEnd = endTime - sourceTime;
        return Math.max(0.0, Math.min(1.0, timeBeforeEnd / fadeOutDuration));
    }

    // No fade applicable at this time
    return 1.0;
};

export const generateWaveformData = async (audioBuffer: AudioBuffer): Promise<number[]> => {
    // A simplified promise-based wrapper to avoid blocking the main thread for too long.
    // For very large files, a Web Worker would be better.
    return new Promise(resolve => {
        // Set a timeout to do this in the next event loop cycle.
        setTimeout(() => {
            const rawData = audioBuffer.getChannelData(0); // Use the first channel
            const samples = 200; // Number of data points for the waveform
            const blockSize = Math.floor(rawData.length / samples);
            const filteredData = [];
            for (let i = 0; i < samples; i++) {
                const blockStart = blockSize * i;
                let sum = 0;
                for (let j = 0; j < blockSize; j++) {
                    sum += Math.abs(rawData[blockStart + j]);
                }
                filteredData.push(sum / blockSize);
            }
            
            // Normalize the data
            const max = Math.max(...filteredData, 0.0001); // Avoid division by zero
            const normalizedData = filteredData.map(n => n / max);
            resolve(normalizedData);
        }, 0);
    });
};

export const reverseAudioBuffer = (buffer: AudioBuffer, context: BaseAudioContext): AudioBuffer => {
    const reversedBuffer = context.createBuffer(
        buffer.numberOfChannels,
        buffer.length,
        buffer.sampleRate
    );

    for (let i = 0; i < buffer.numberOfChannels; i++) {
        const channelData = buffer.getChannelData(i);
        // Create a copy before reversing to avoid mutating the original buffer
        const reversedChannelData = channelData.slice().reverse();
        reversedBuffer.copyToChannel(reversedChannelData, i);
    }
    return reversedBuffer;
};

export const getPulseAmount = (freqData: Uint8Array, strength: number = 0.5): number => {
    if (!freqData || freqData.length === 0 || !strength || strength <= 0) {
        return 1.0;
    }
    // Bass bins (sub-bass and punchy bass range: bins 0 to 14)
    const bassBins = freqData.slice(0, 14);
    const avgBass = bassBins.reduce((sum, val) => sum + val, 0) / bassBins.length;
    const normalized = avgBass / 255;
    
    // Ignore low background noise
    if (normalized < 0.04) return 1.0;
    
    // Punchy, musical exponential response curve
    const pulseEffect = Math.pow(normalized, 1.6);
    
    // Dynamic scaling directly controlled by the strength parameter (0.0 to 1.0)
    // strength 0.0 -> 1.00 (0% scale, completely still)
    // strength 0.5 -> up to ~1.18 (18% scale, punchy beat)
    // strength 1.0 -> up to ~1.36 (36% scale, heavy pulse)
    return 1.0 + pulseEffect * (strength * 0.40);
};

export const audioBufferToWavBlob = (buffer: AudioBuffer): Blob => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArr = new ArrayBuffer(length);
    const view = new DataView(bufferArr);
    const channels = [];
    let i, sample;
    let offset = 0;
    let pos = 0;

    const setUint16 = (data: number) => {
        view.setUint16(pos, data, true);
        pos += 2;
    };

    const setUint32 = (data: number) => {
        view.setUint32(pos, data, true);
        pos += 4;
    };

    // RIFF chunk descriptor
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    // FMT sub-chunk
    setUint32(0x20746d66); // "fmt "
    setUint32(16); // chunk size
    setUint16(1); // audio format 1
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // byte rate
    setUint16(numOfChan * 2); // block align
    setUint16(16); // bits per sample

    // data sub-chunk
    setUint32(0x61746164); // "data"
    setUint32(length - pos - 4); // chunk size

    for (i = 0; i < buffer.numberOfChannels; i++) {
        channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
        for (i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
            view.setInt16(pos, sample, true);
            pos += 2;
        }
        offset++;
    }

    return new Blob([view], { type: 'audio/wav' });
};

export const setupAudioGraphForRendering = (
    context: BaseAudioContext,
    projectState: ProjectState,
    decodedAudioBuffers: Map<string, AudioBuffer>,
    reversedAudioBuffers: Map<string, AudioBuffer>,
    targetAudioClipId?: string | null
): AudioNode | null => {
    const { timelineClips, tracks, mediaPool } = projectState;

    let clipsToProcess = timelineClips.filter(clip => {
        const track = tracks.find(t => t.id === clip.trackId);
        const src = clip.src || mediaPool.find(mp => mp.id === clip.poolId)?.src;
        const buffer = src ? decodedAudioBuffers.get(src) : undefined;
        return track && buffer && (clip.type === 'audio' || clip.type === 'video');
    });
    
    const isSingleClipRender = targetAudioClipId && targetAudioClipId !== 'master';

    if (isSingleClipRender) {
        const targetClip = clipsToProcess.find(c => c.id === targetAudioClipId);
        clipsToProcess = targetClip ? [targetClip] : [];
    }

    if (clipsToProcess.length === 0) return null;

    const masterGain = context.createGain();

    clipsToProcess.forEach(clip => {
        const track = tracks.find(t => t.id === clip.trackId)!;
        const src = clip.src || mediaPool.find(mp => mp.id === clip.poolId)?.src;

        let buffer: AudioBuffer | undefined;
        if (clip.isReversed && src) {
            buffer = reversedAudioBuffers.get(src);
            if (!buffer) {
                const originalBuffer = decodedAudioBuffers.get(src);
                if (originalBuffer) {
                    buffer = reverseAudioBuffer(originalBuffer, context);
                    reversedAudioBuffers.set(src, buffer);
                }
            }
        } else if (src) {
            buffer = decodedAudioBuffers.get(src);
        }

        if (!buffer) {
            return;
        }
       
        const targetVolume = track.isMuted ? 0 : track.volume;
        const clipSpeed = clip.speed || 1;
        
        let startWhen = isSingleClipRender ? 0 : clip.timelineStart;
        let startOffset = clip.startTime;
        let duration = (clip.endTime - clip.startTime) / clipSpeed;

        if (startWhen < 0) {
            const amountToTrim = -startWhen;
            startOffset += amountToTrim * clipSpeed;
            duration -= amountToTrim;
            startWhen = 0;
        }

        if (duration <= 0 || startOffset >= clip.endTime) {
            return;
        }
       
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = clipSpeed;

        const gainNode = context.createGain();
        gainNode.gain.setValueAtTime(targetVolume, 0);
        
        const displayEnd = startWhen + duration;
        
        if (clip.fadeInDuration && clip.fadeInDuration > 0) {
            const fadeInDurationInSeconds = clip.fadeInDuration / clipSpeed;
            if (fadeInDurationInSeconds > 0) {
                gainNode.gain.setValueAtTime(0, startWhen);
                gainNode.gain.linearRampToValueAtTime(targetVolume, startWhen + fadeInDurationInSeconds);
            }
        }
        
        if (clip.fadeOutDuration && clip.fadeOutDuration > 0) {
            const fadeOutDurationInSeconds = clip.fadeOutDuration / clipSpeed;
            const fadeOutStartTime = displayEnd - fadeOutDurationInSeconds;
            
            if (fadeOutStartTime >= startWhen) {
                gainNode.gain.setValueAtTime(targetVolume, fadeOutStartTime);
                gainNode.gain.linearRampToValueAtTime(0, displayEnd);
            }
        }

        source.connect(gainNode);
        // Conecta cada clipe diretamente ao masterGain para preservar a qualidade original
        gainNode.connect(masterGain);

        source.start(startWhen, startOffset, duration);
    });

    return masterGain;
};

export const renderOfflineAudio = async (context: OfflineAudioContext): Promise<AudioBuffer> => {
    try {
        const renderedBuffer = await context.startRendering();
        return renderedBuffer;
    } catch (e) {
        console.warn("A renderização de áudio offline falhou. Um buffer silencioso será usado em seu lugar.", e);
        return context.createBuffer(context.destination.channelCount, context.length, context.sampleRate);
    }
};

// Pre-calculated lookup tables for fast FFT calculation during video export
const HANN_WINDOW_1024 = new Float32Array(1024);
for (let i = 0; i < 1024; i++) {
    HANN_WINDOW_1024[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / 1023));
}

const BIT_REVERSE_1024 = new Uint16Array(1024);
for (let i = 0; i < 1024; i++) {
    let rev = 0;
    let temp = i;
    for (let bit = 0; bit < 10; bit++) {
        rev = (rev << 1) | (temp & 1);
        temp >>= 1;
    }
    BIT_REVERSE_1024[i] = rev;
}

const COS_TABLE_1024 = new Float32Array(512);
const SIN_TABLE_1024 = new Float32Array(512);
for (let i = 0; i < 512; i++) {
    COS_TABLE_1024[i] = Math.cos((-2 * Math.PI * i) / 1024);
    SIN_TABLE_1024[i] = Math.sin((-2 * Math.PI * i) / 1024);
}

/**
 * Computes a 1024-point FFT frame and time-domain buffer from PCM channel data.
 * Used for offline video rendering so that audio visualizers and beat-pulsing effects
 * work accurately on exported MP4 files.
 */
export function extractAnalyserFrameFromPCM(pcmSamples: Float32Array, startIndex: number): AnalyserFrame {
    const N = 1024;
    const timeDomainData = new Uint8Array(N);
    const real = new Float32Array(N);
    const imag = new Float32Array(N);

    for (let i = 0; i < N; i++) {
        const srcIdx = startIndex + i;
        const sample = (srcIdx >= 0 && srcIdx < pcmSamples.length) ? pcmSamples[srcIdx] : 0;
        const clamped = Math.max(-1, Math.min(1, sample));
        timeDomainData[i] = Math.floor((clamped + 1) * 127.5);

        const rev = BIT_REVERSE_1024[i];
        real[rev] = sample * HANN_WINDOW_1024[i];
        imag[rev] = 0;
    }

    // Cooley-Tukey Radix-2 FFT
    for (let len = 2; len <= N; len <<= 1) {
        const halfLen = len >> 1;
        const step = N / len;
        for (let i = 0; i < N; i += len) {
            for (let j = 0; j < halfLen; j++) {
                const k = j * step;
                const c = COS_TABLE_1024[k];
                const s = SIN_TABLE_1024[k];
                
                const re = real[i + j + halfLen];
                const im = imag[i + j + halfLen];
                
                const tr = re * c - im * s;
                const ti = re * s + im * c;
                
                real[i + j + halfLen] = real[i + j] - tr;
                imag[i + j + halfLen] = imag[i + j] - ti;
                
                real[i + j] += tr;
                imag[i + j] += ti;
            }
        }
    }

    const freqData = new Uint8Array(512);
    const minDb = -100;
    const maxDb = -30;

    for (let k = 0; k < 512; k++) {
        const re = real[k];
        const im = imag[k];
        const mag = Math.sqrt(re * re + im * im) / N;
        const db = mag > 1e-6 ? 20 * Math.log10(mag) : -100;
        let byteVal = Math.round(((db - minDb) / (maxDb - minDb)) * 255);
        if (byteVal < 0) byteVal = 0;
        if (byteVal > 255) byteVal = 255;
        freqData[k] = byteVal;
    }

    return { freqData, timeDomainData };
}

export const renderAudioAndGetAnalyserFrames = async (
    projectState: ProjectState,
    decodedAudioBuffers: Map<string, AudioBuffer>,
    reversedAudioBuffers: Map<string, AudioBuffer>,
    duration: number,
    frameRate: number,
    spectrumAudioSourceId?: string | null
): Promise<{ mixedAudio: AudioBuffer | null; analyserFrames: AnalyserFrame[] }> => {
    const totalFrames = Math.ceil(duration * frameRate);
    const audioClips = projectState.timelineClips.filter(c => {
        const src = c.src || projectState.mediaPool.find(mp => mp.id === c.poolId)?.src;
        return src && decodedAudioBuffers.has(src) && (c.type === 'audio' || c.type === 'video');
    });
    const silentFrame = { freqData: new Uint8Array(512), timeDomainData: new Uint8Array(1024).fill(128) };

    if (audioClips.length === 0) {
        return { mixedAudio: null, analyserFrames: Array(totalFrames).fill(silentFrame) };
    }

    const sampleRate = 44100;
    const contextLength = Math.ceil(duration * sampleRate);
    const visualizerIsMaster = !spectrumAudioSourceId || spectrumAudioSourceId === 'master';

    // 1. Render analysis audio source (or master)
    const analysisContext = new OfflineAudioContext({ numberOfChannels: 2, length: contextLength, sampleRate });
    const analysisGraph = setupAudioGraphForRendering(analysisContext, projectState, decodedAudioBuffers, reversedAudioBuffers, visualizerIsMaster ? 'master' : spectrumAudioSourceId!);

    let analysisBuffer: AudioBuffer | null = null;
    if (analysisGraph) {
        analysisGraph.connect(analysisContext.destination);
        analysisBuffer = await renderOfflineAudio(analysisContext);
    }

    // 2. Compute analyserFrames directly from PCM samples for exact frame-by-frame spectrum & pulse analysis
    const analyserFrames: AnalyserFrame[] = new Array(totalFrames);
    if (analysisBuffer) {
        const pcmData = analysisBuffer.getChannelData(0);
        for (let i = 0; i < totalFrames; i++) {
            const frameTime = i / frameRate;
            const sampleIndex = Math.floor(frameTime * sampleRate);
            analyserFrames[i] = extractAnalyserFrameFromPCM(pcmData, sampleIndex);
        }
    } else {
        analyserFrames.fill(silentFrame);
    }

    // 3. Render final master mix if different from the analysis source
    let finalMixBuffer: AudioBuffer | null;
    if (visualizerIsMaster) {
        finalMixBuffer = analysisBuffer;
    } else {
        const mainMixContext = new OfflineAudioContext({ numberOfChannels: 2, length: contextLength, sampleRate });
        const mainMixGraph = setupAudioGraphForRendering(mainMixContext, projectState, decodedAudioBuffers, reversedAudioBuffers, 'master');
        if (mainMixGraph) {
            mainMixGraph.connect(mainMixContext.destination);
            finalMixBuffer = await renderOfflineAudio(mainMixContext);
        } else {
            finalMixBuffer = null;
        }
    }

    return { mixedAudio: finalMixBuffer, analyserFrames };
};

export const getAudioBufferFromFile = async (file: File, context: AudioContext): Promise<AudioBuffer> => {
    const arrayBuffer = await file.arrayBuffer();
    return await context.decodeAudioData(arrayBuffer);
};

export interface WordChunk {
    text: string;
    timestamp: [number, number];
}

/**
 * Refines word-level timestamps using RMS energy envelope analysis (VAD).
 * - Identifies true speech onset (lead-in alignment).
 * - Trims trailing silence on words before long pauses (prevents subtitle hanging).
 * - Preserves natural cadence and speech boundaries.
 */
export const refineWordTimestampsWithAudioEnergy = (
    chunks: WordChunk[],
    audioData: Float32Array,
    sampleRate = 16000
): WordChunk[] => {
    if (!chunks || chunks.length === 0 || !audioData || audioData.length === 0) {
        return chunks;
    }

    const hopSize = Math.round(sampleRate * 0.010); // 10ms = 160 samples
    const windowSize = Math.round(sampleRate * 0.025); // 25ms = 400 samples
    const numFrames = Math.max(1, Math.floor((audioData.length - windowSize) / hopSize));
    const envelope = new Float32Array(numFrames);

    // Compute short-time energy (RMS)
    for (let i = 0; i < numFrames; i++) {
        const startSample = i * hopSize;
        let sumSq = 0;
        for (let j = 0; j < windowSize; j++) {
            const s = audioData[startSample + j];
            sumSq += s * s;
        }
        envelope[i] = Math.sqrt(sumSq / windowSize);
    }

    // Estimate noise floor and voice activity threshold
    const sampleStep = Math.max(1, Math.floor(numFrames / 800));
    const sampledValues: number[] = [];
    for (let i = 0; i < numFrames; i += sampleStep) {
        sampledValues.push(envelope[i]);
    }
    sampledValues.sort((a, b) => a - b);

    const noiseFloor = sampledValues[Math.floor(sampledValues.length * 0.20)] || 0.004;
    const p70 = sampledValues[Math.floor(sampledValues.length * 0.70)] || 0.04;
    const speechThreshold = Math.max(0.012, Math.min(p70 * 0.32, noiseFloor * 2.8));
    const silenceThreshold = Math.max(0.007, speechThreshold * 0.65);

    const totalDuration = audioData.length / sampleRate;
    const timeToFrame = (t: number) => Math.max(0, Math.min(numFrames - 1, Math.floor(t / 0.010)));
    const frameToTime = (f: number) => f * 0.010;

    const refined: WordChunk[] = [];

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        let start = (chunk.timestamp && chunk.timestamp[0] !== null && !isNaN(chunk.timestamp[0])) ? chunk.timestamp[0] : 0;
        let end = (chunk.timestamp && chunk.timestamp[1] !== null && !isNaN(chunk.timestamp[1])) ? chunk.timestamp[1] : start + 0.3;
        const cleanWord = (chunk.text || '').trim();

        const prevRefined = i > 0 ? refined[i - 1] : null;
        const nextRaw = i < chunks.length - 1 ? chunks[i + 1] : null;

        // A. Refine Speech Onset (Start of word)
        // Scan around Whisper's estimated start [-150ms to +200ms]
        const searchStartFrame = timeToFrame(Math.max(prevRefined ? prevRefined.timestamp[1] : 0, start - 0.15));
        const searchEndFrame = timeToFrame(Math.min(end, start + 0.20));

        let detectedOnsetFrame = -1;
        for (let f = searchStartFrame; f <= searchEndFrame; f++) {
            if (envelope[f] >= speechThreshold) {
                detectedOnsetFrame = f;
                break;
            }
        }

        let refinedStart = start;
        if (detectedOnsetFrame !== -1) {
            // Apply 35ms perceptual lead-in so eye reads word as ear hears onset
            refinedStart = Math.max(0, frameToTime(detectedOnsetFrame) - 0.035);
            if (prevRefined && refinedStart < prevRefined.timestamp[1] + 0.02) {
                refinedStart = prevRefined.timestamp[1] + 0.02;
            }
        }

        // B. Refine Speech Offset (End of word)
        // Check if voice drops into silence before Whisper's timestamp (trim hanging pauses)
        const maxExpectedWordDuration = Math.max(0.20, Math.min(1.4, 0.12 + cleanWord.length * 0.08));
        const minEndFrame = timeToFrame(refinedStart + Math.max(0.12, cleanWord.length * 0.04));
        const maxEndFrame = timeToFrame(Math.min(totalDuration, end));

        let detectedOffsetFrame = -1;
        let silentFramesCount = 0;

        for (let f = minEndFrame; f <= maxEndFrame; f++) {
            if (envelope[f] < silenceThreshold) {
                silentFramesCount++;
                if (silentFramesCount >= 7) { // 70ms of silence
                    detectedOffsetFrame = f - 7;
                    break;
                }
            } else {
                silentFramesCount = 0;
            }
        }

        let refinedEnd = end;
        if (detectedOffsetFrame !== -1) {
            refinedEnd = Math.max(refinedStart + 0.15, frameToTime(detectedOffsetFrame) + 0.04);
        } else if (end - refinedStart > maxExpectedWordDuration && nextRaw) {
            refinedEnd = refinedStart + maxExpectedWordDuration;
        }

        // Clamp against next word
        if (nextRaw && nextRaw.timestamp && nextRaw.timestamp[0]) {
            const nextStart = nextRaw.timestamp[0];
            if (refinedEnd >= nextStart) {
                refinedEnd = Math.max(refinedStart + 0.12, nextStart - 0.02);
            }
        }

        refined.push({
            text: chunk.text,
            timestamp: [
                Math.round(refinedStart * 1000) / 1000,
                Math.round(Math.max(refinedStart + 0.15, refinedEnd) * 1000) / 1000
            ]
        });
    }

    return refined;
};
