/**
 * TensorFlow Lite Models Integration for Edge AI
 * Handles local model execution for privacy and speed
 */

class TensorFlowLiteManager {
    constructor() {
        this.models = {};
        this.isInitialized = false;
        this.modelCache = new Map();
        this.inferenceQueue = [];
        this.isProcessing = false;
    }

    async initialize() {
        try {
            // Check for WebGL support
            if (!tf || !tf.getBackend()) {
                throw new Error('TensorFlow.js not available');
            }

            // Enable WebGL backend for better performance
            await tf.setBackend('webgl');
            await tf.ready();

            // Load models
            await this.loadModels();
            
            this.isInitialized = true;
            console.log('TensorFlow Lite models initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize TensorFlow Lite:', error);
            return false;
        }
    }

    async loadModels() {
        try {
            // Load speech recognition model (Wav2Vec2-style)
            this.models.speechRecognition = await tf.loadLayersModel(
                'https://storage.googleapis.com/tfjs-models/tfjs/speech-commands/v0.4/browser_fft/18w/model.json'
            );

            // Load emotion recognition model
            this.models.emotionRecognition = await this.loadEmotionModel();

            // Load noise reduction model
            this.models.noiseReduction = await this.loadNoiseReductionModel();

            // Load wake word detection model
            this.models.wakeWord = await this.loadWakeWordModel();

            console.log('All models loaded successfully');
        } catch (error) {
            console.error('Error loading models:', error);
            throw error;
        }
    }

    async loadEmotionModel() {
        // Create a simple emotion recognition model
        const model = tf.sequential({
            layers: [
                tf.layers.dense({ inputShape: [13], units: 128, activation: 'relu' }),
                tf.layers.dropout({ rate: 0.3 }),
                tf.layers.dense({ units: 64, activation: 'relu' }),
                tf.layers.dropout({ rate: 0.3 }),
                tf.layers.dense({ units: 8, activation: 'softmax' })
            ]
        });

        model.compile({
            optimizer: 'adam',
            loss: 'categoricalCrossentropy',
            metrics: ['accuracy']
        });

        return model;
    }

    async loadNoiseReductionModel() {
        // Create a simple noise reduction model
        const model = tf.sequential({
            layers: [
                tf.layers.conv1d({ inputShape: [None, 1], filters: 16, kernelSize: 3, activation: 'relu', padding: 'same' }),
                tf.layers.conv1d({ filters: 32, kernelSize: 3, activation: 'relu', padding: 'same' }),
                tf.layers.conv1d({ filters: 1, kernelSize: 3, activation: 'linear', padding: 'same' })
            ]
        });

        model.compile({
            optimizer: 'adam',
            loss: 'meanSquaredError'
        });

        return model;
    }

    async loadWakeWordModel() {
        // Create a simple wake word detection model
        const model = tf.sequential({
            layers: [
                tf.layers.conv1d({ inputShape: [None, 1], filters: 32, kernelSize: 3, activation: 'relu', padding: 'same' }),
                tf.layers.maxPooling1d({ poolSize: 2 }),
                tf.layers.conv1d({ filters: 64, kernelSize: 3, activation: 'relu', padding: 'same' }),
                tf.layers.maxPooling1d({ poolSize: 2 }),
                tf.layers.flatten(),
                tf.layers.dense({ units: 128, activation: 'relu' }),
                tf.layers.dropout({ rate: 0.5 }),
                tf.layers.dense({ units: 2, activation: 'softmax' })
            ]
        });

        model.compile({
            optimizer: 'adam',
            loss: 'binaryCrossentropy',
            metrics: ['accuracy']
        });

        return model;
    }

    // Speech Recognition
    async processSpeech(audioData) {
        if (!this.isInitialized) {
            throw new Error('TensorFlow Lite not initialized');
        }

        try {
            // Convert audio data to tensor
            const audioTensor = tf.tensor(audioData);
            
            // Normalize audio
            const normalizedAudio = tf.div(audioTensor, tf.max(tf.abs(audioTensor)));
            
            // Apply noise reduction
            const cleanAudio = await this.reduceNoise(normalizedAudio);
            
            // Extract features (MFCC-like)
            const features = await this.extractAudioFeatures(cleanAudio);
            
            // Run speech recognition
            const predictions = await this.models.speechRecognition.predict(features);
            
            // Get the most likely command
            const commandIndex = predictions.argMax(-1).dataSync()[0];
            const confidence = predictions.max().dataSync()[0];
            
            // Clean up tensors
            audioTensor.dispose();
            normalizedAudio.dispose();
            cleanAudio.dispose();
            features.dispose();
            predictions.dispose();
            
            return {
                command: this.getCommandFromIndex(commandIndex),
                confidence: confidence,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('Speech recognition error:', error);
            throw error;
        }
    }

    // Emotion Recognition
    async detectEmotion(audioData) {
        if (!this.isInitialized) {
            throw new Error('TensorFlow Lite not initialized');
        }

        try {
            // Extract emotion features
            const features = await this.extractEmotionFeatures(audioData);
            
            // Run emotion recognition
            const predictions = await this.models.emotionRecognition.predict(features);
            
            // Get emotion probabilities
            const emotions = ['neutral', 'happy', 'sad', 'angry', 'surprised', 'fearful', 'disgusted', 'contemptuous'];
            const emotionScores = {};
            const probabilities = predictions.dataSync();
            
            emotions.forEach((emotion, index) => {
                emotionScores[emotion] = probabilities[index];
            });
            
            // Get dominant emotion
            const dominantEmotion = emotions[predictions.argMax(-1).dataSync()[0]];
            const confidence = predictions.max().dataSync()[0];
            
            // Clean up
            features.dispose();
            predictions.dispose();
            
            return {
                dominant: dominantEmotion,
                confidence: confidence,
                allEmotions: emotionScores,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('Emotion detection error:', error);
            throw error;
        }
    }

    // Wake Word Detection
    async detectWakeWord(audioData) {
        if (!this.isInitialized) {
            throw new Error('TensorFlow Lite not initialized');
        }

        try {
            // Preprocess audio for wake word detection
            const processedAudio = await this.preprocessWakeWordAudio(audioData);
            
            // Run wake word detection
            const predictions = await this.models.wakeWord.predict(processedAudio);
            
            // Get probability of wake word
            const wakeWordProbability = predictions.dataSync()[1]; // Index 1 is wake word class
            
            // Clean up
            processedAudio.dispose();
            predictions.dispose();
            
            return {
                detected: wakeWordProbability > 0.8,
                confidence: wakeWordProbability,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('Wake word detection error:', error);
            throw error;
        }
    }

    // Noise Reduction
    async reduceNoise(audioTensor) {
        try {
            // Add batch dimension if needed
            let inputTensor = audioTensor;
            if (inputTensor.shape.length === 1) {
                inputTensor = inputTensor.expandDims(0).expandDims(-1);
            } else if (inputTensor.shape.length === 2) {
                inputTensor = inputTensor.expandDims(-1);
            }
            
            // Run noise reduction model
            const cleanAudio = await this.models.noiseReduction.predict(inputTensor);
            
            // Remove batch dimension
            const result = cleanAudio.squeeze();
            
            return result;
        } catch (error) {
            console.error('Noise reduction error:', error);
            return audioTensor; // Return original if error
        }
    }

    // Feature Extraction Methods
    async extractAudioFeatures(audioTensor) {
        // Simple MFCC-like feature extraction
        const sampleRate = 16000;
        const frameSize = 512;
        const hopSize = 256;
        
        // Convert to frequency domain
        const stft = tf.signal.stft(audioTensor, frameSize, hopSize, frameSize);
        const magnitude = tf.abs(stft);
        
        // Apply mel filterbank
        const melFilterbank = tf.signal.linearToMelScale(
            magnitude,
            sampleRate,
            40, // num_mel_bins
            20, // lower_edge_hertz
            8000 // upper_edge_hertz
        );
        
        // Take log
        const logMel = tf.log(tf.add(melFilterbank, 1e-10));
        
        // Apply DCT to get MFCCs
        const mfccs = tf.signal.mfccsFromSpectrograms(logMel, 13);
        
        return mfccs;
    }

    async extractEmotionFeatures(audioData) {
        // Extract prosodic features for emotion recognition
        const features = [
            this.calculatePitch(audioData),
            this.calculateEnergy(audioData),
            this.calculateSpeakingRate(audioData),
            this.calculateSpectralCentroid(audioData),
            this.calculateSpectralRolloff(audioData),
            this.calculateZeroCrossingRate(audioData),
            this.calculateHarmonics(audioData),
            this.calculateJitter(audioData),
            this.calculateShimmer(audioData),
            this.calculateFundamentalFrequency(audioData),
            this.calculateFormants(audioData),
            this.calculateVoiceQuality(audioData),
            this.calculateIntensity(audioData)
        ];
        
        return tf.tensor([features]);
    }

    async preprocessWakeWordAudio(audioData) {
        // Normalize and reshape for wake word model
        const normalized = audioData / Math.max(...Math.abs(audioData));
        const reshaped = normalized.slice(0, 16000); // 1 second at 16kHz
        
        return tf.tensor(reshaped).expandDims(0).expandDims(-1);
    }

    // Utility Methods
    getCommandFromIndex(index) {
        const commands = [
            'unknown', 'yes', 'no', 'up', 'down', 'left', 'right', 'on', 'off',
            'stop', 'go', 'forward', 'backward', 'help', 'read', 'note', 'call'
        ];
        return commands[index] || 'unknown';
    }

    calculatePitch(audioData) {
        // Simplified pitch calculation
        const correlation = this.autoCorrelation(audioData);
        const pitch = this.findPeak(correlation, 50, 500); // 50-500 Hz range
        return pitch;
    }

    calculateEnergy(audioData) {
        return audioData.reduce((sum, sample) => sum + sample * sample, 0) / audioData.length;
    }

    calculateSpeakingRate(audioData) {
        // Simplified speaking rate based on energy peaks
        const energy = audioData.map(sample => sample * sample);
        const peaks = this.findPeaks(energy, 0.1);
        return peaks.length / (audioData.length / 16000); // peaks per second
    }

    calculateSpectralCentroid(audioData) {
        // Simplified spectral centroid
        const fft = this.simpleFFT(audioData);
        const magnitudes = fft.map(complex => Math.sqrt(complex.real * complex.real + complex.imag * complex.imag));
        const frequencies = Array.from({length: magnitudes.length}, (_, i) => i * 16000 / magnitudes.length);
        
        const weightedSum = magnitudes.reduce((sum, mag, i) => sum + mag * frequencies[i], 0);
        const magnitudeSum = magnitudes.reduce((sum, mag) => sum + mag, 0);
        
        return weightedSum / magnitudeSum;
    }

    calculateSpectralRolloff(audioData) {
        // Simplified spectral rolloff (85% of energy)
        const fft = this.simpleFFT(audioData);
        const magnitudes = fft.map(complex => Math.sqrt(complex.real * complex.real + complex.imag * complex.imag));
        const totalEnergy = magnitudes.reduce((sum, mag) => sum + mag * mag, 0);
        
        let cumulativeEnergy = 0;
        for (let i = 0; i < magnitudes.length; i++) {
            cumulativeEnergy += magnitudes[i] * magnitudes[i];
            if (cumulativeEnergy >= 0.85 * totalEnergy) {
                return i * 16000 / magnitudes.length;
            }
        }
        return 0;
    }

    calculateZeroCrossingRate(audioData) {
        let crossings = 0;
        for (let i = 1; i < audioData.length; i++) {
            if ((audioData[i] >= 0) !== (audioData[i-1] >= 0)) {
                crossings++;
            }
        }
        return crossings / (audioData.length - 1);
    }

    calculateHarmonics(audioData) {
        // Simplified harmonic analysis
        const pitch = this.calculatePitch(audioData);
        return pitch > 0 ? 1.0 : 0.0;
    }

    calculateJitter(audioData) {
        // Simplified jitter (pitch variation)
        return Math.random() * 0.1; // Placeholder
    }

    calculateShimmer(audioData) {
        // Simplified shimmer (amplitude variation)
        const energy = audioData.map(sample => Math.abs(sample));
        const meanEnergy = energy.reduce((sum, e) => sum + e, 0) / energy.length;
        const variation = energy.reduce((sum, e) => sum + Math.abs(e - meanEnergy), 0) / energy.length;
        return variation / meanEnergy;
    }

    calculateFundamentalFrequency(audioData) {
        return this.calculatePitch(audioData);
    }

    calculateFormants(audioData) {
        // Simplified formant estimation
        return [500, 1500, 2500]; // Placeholder values
    }

    calculateVoiceQuality(audioData) {
        // Simplified voice quality measure
        const shimmer = this.calculateShimmer(audioData);
        const jitter = this.calculateJitter(audioData);
        return 1.0 - (shimmer + jitter) / 2.0;
    }

    calculateIntensity(audioData) {
        return 20 * Math.log10(this.calculateEnergy(audioData));
    }

    // Helper methods for audio processing
    autoCorrelation(signal) {
        const result = new Array(signal.length);
        for (let lag = 0; lag < signal.length; lag++) {
            let sum = 0;
            for (let i = 0; i < signal.length - lag; i++) {
                sum += signal[i] * signal[i + lag];
            }
            result[lag] = sum / (signal.length - lag);
        }
        return result;
    }

    findPeak(correlation, minLag, maxLag) {
        let maxValue = -Infinity;
        let peakLag = 0;
        
        for (let lag = minLag; lag < Math.min(maxLag, correlation.length); lag++) {
            if (correlation[lag] > maxValue) {
                maxValue = correlation[lag];
                peakLag = lag;
            }
        }
        
        return peakLag > 0 ? 16000 / peakLag : 0; // Convert to frequency
    }

    findPeaks(signal, threshold) {
        const peaks = [];
        for (let i = 1; i < signal.length - 1; i++) {
            if (signal[i] > threshold && signal[i] > signal[i-1] && signal[i] > signal[i+1]) {
                peaks.push(i);
            }
        }
        return peaks;
    }

    simpleFFT(signal) {
        // Simplified FFT implementation
        const n = signal.length;
        const result = new Array(n);
        
        for (let k = 0; k < n; k++) {
            let real = 0;
            let imag = 0;
            
            for (let t = 0; t < n; t++) {
                const angle = -2 * Math.PI * k * t / n;
                real += signal[t] * Math.cos(angle);
                imag += signal[t] * Math.sin(angle);
            }
            
            result[k] = { real: real, imag: imag };
        }
        
        return result;
    }

    // Model optimization
    async optimizeModels() {
        try {
            // Quantize models for better performance
            for (const [name, model] of Object.entries(this.models)) {
                if (model && typeof model.quantize === 'function') {
                    this.models[name] = await model.quantize({
                        inputRange: [-1, 1],
                        outputRange: [-1, 1]
                    });
                }
            }
            
            console.log('Models optimized successfully');
        } catch (error) {
            console.error('Model optimization error:', error);
        }
    }

    // Memory management
    dispose() {
        try {
            // Dispose all models
            for (const model of Object.values(this.models)) {
                if (model && typeof model.dispose === 'function') {
                    model.dispose();
                }
            }
            
            // Clear cache
            this.modelCache.clear();
            
            // Clean up tensors
            tf.disposeVariables();
            
            console.log('TensorFlow Lite resources disposed');
        } catch (error) {
            console.error('Error disposing resources:', error);
        }
    }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TensorFlowLiteManager;
} else if (typeof window !== 'undefined') {
    window.TensorFlowLiteManager = TensorFlowLiteManager;
}