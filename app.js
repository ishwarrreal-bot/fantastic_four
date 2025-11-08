class VisionAssistant {
    constructor() {
        // User preferences
        this.userPreferences = {
            voice: 'default',
            rate: 1.0,
            pitch: 1.0,
            volume: 1.0,
            language: 'en-US',
            hapticFeedback: true,
            autoRead: true,
            darkMode: false
        };

        // Speech recognition
        this.recognition = null;
        this.isListening = false;
        this.isProcessing = false;
        this.finalTranscript = '';
        this.interimTranscript = '';
        
        // Speech synthesis
        this.synthesis = null;
        this.currentVoice = null;
        this.isSpeaking = false;
        
        // Context memory
        this.context = [];
        this.contextMemory = [];
        this.contextLimit = 10;
        
        // AI/ML models
        this.speechRecognitionModel = null;
        this.naturalLanguageModel = null;
        this.textToSpeechModel = null;
        this.noiseReductionModel = null;
        this.emotionRecognitionModel = null;
        
        // TensorFlow Lite manager
        this.tfLiteManager = null;
        
        // Messaging integration
        this.messagingIntegration = null;
        
        // Audio context for noise cancellation
        this.audioContext = null;
        
        // Voice control buttons
        this.startButton = null; // Not used in this UI
        this.stopButton = null; // Not used in this UI
        this.holdButton = document.getElementById('holdToSpeak');
        
        // Hold-to-speak functionality
        this.isHolding = false;
        this.holdTimeout = null;
        this.holdDelay = 200; // milliseconds
        
        // Load user preferences
        this.loadPreferences();
        
        // Setup event listeners after a brief delay to ensure DOM is ready
        // Using setTimeout to ensure all DOM elements are available
        setTimeout(() => {
            this.setupEventListeners();
        }, 0);
        
        // Initialize speech recognition (async, but don't await in constructor)
        this.initializeSpeechRecognition().catch(error => {
            console.error('Speech recognition initialization error:', error);
        });
        
        // Initialize speech synthesis
        this.initializeSpeechSynthesis();
        
        // Initialize audio context for noise cancellation
        this.initializeAudioContext();
        
        // Initialize async components
        this.initializeAsyncComponents();
    }

    async initializeAsyncComponents() {
        try {
            // Initialize TensorFlow Lite models
            await this.initializeTensorFlowLite();
            
            // Initialize messaging integration
            await this.initializeMessaging();
            
            console.log('Async components initialized successfully');
        } catch (error) {
            console.error('Error initializing async components:', error);
            this.announce('Some features may be temporarily unavailable');
        }
    }

    checkWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return !!gl;
        } catch (e) {
            return false;
        }
    }

    async initializeTensorFlowLite() {
        try {
            if (typeof TensorFlowLiteManager !== 'undefined') {
                this.tfLiteManager = new TensorFlowLiteManager();
                const initialized = await this.tfLiteManager.initialize();
                
                if (initialized) {
                    this.announce('AI models loaded successfully');
                } else {
                    this.announce('AI models failed to load');
                }
            } else {
                console.warn('TensorFlow Lite Manager not available');
                this.announce('Advanced AI features not available');
            }
        } catch (error) {
            console.error('TensorFlow Lite initialization error:', error);
            this.announce('AI features temporarily unavailable');
        }
    }

    async processCommand(command) {
        if (!command.trim()) return;

        this.isProcessing = true;
        this.updateUI();

        try {
            // Add noise reduction if available
            let processedCommand = command;
            if (this.tfLiteManager && this.tfLiteManager.isInitialized) {
                processedCommand = await this.tfLiteManager.processSpeech(command);
            }

            // Detect emotion in voice
            let emotion = 'neutral';
            if (this.tfLiteManager && this.tfLiteManager.isInitialized) {
                emotion = await this.tfLiteManager.detectEmotion(command);
            }

            // Process with natural language understanding
            const response = await this.generateResponse(processedCommand, emotion);
            
            // Add context memory
            this.addToContext('user', command);
            this.addToContext('assistant', response);

            // Speak response with emotion adaptation
            await this.speakResponse(response, emotion);

        } catch (error) {
            console.error('Command processing error:', error);
            this.announce('Sorry, I encountered an error processing your command');
        } finally {
            this.isProcessing = false;
            this.updateUI();
        }
    }

    // Hold-to-speak functionality
    handleHoldStart(event) {
        if (this.isProcessing) return;
        
        this.isHolding = true;
        this.holdButton.classList.add('listening');
        this.holdButton.setAttribute('aria-pressed', 'true');
        
        // Add haptic feedback if enabled
        if (this.userPreferences.hapticFeedback && 'vibrate' in navigator) {
            navigator.vibrate(50);
        }
        
        // Start listening after a short delay to prevent accidental activation
        this.holdTimeout = setTimeout(async () => {
            if (this.isHolding) {
                await this.startListening();
                if (this.isListening) {
                    this.updateVoiceStatus('Listening... Hold to speak', 'listening');
                }
            }
        }, this.holdDelay);
        
        // Create ripple effect
        this.createRipple(event);
    }

    handleHoldEnd() {
        if (!this.isHolding) return;
        
        this.isHolding = false;
        this.holdButton.classList.remove('listening');
        this.holdButton.setAttribute('aria-pressed', 'false');
        
        // Clear the hold timeout
        if (this.holdTimeout) {
            clearTimeout(this.holdTimeout);
            this.holdTimeout = null;
        }
        
        // Stop listening
        if (this.isListening) {
            this.stopListening();
        }
        
        // Add haptic feedback if enabled
        if (this.userPreferences.hapticFeedback && 'vibrate' in navigator) {
            navigator.vibrate(30);
        }
    }

    createRipple(event) {
        const button = event.currentTarget;
        const ripple = document.createElement('span');
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = (event.clientX || event.touches[0].clientX) - rect.left - size / 2;
        const y = (event.clientY || event.touches[0].clientY) - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple');
        
        button.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    setupEventListeners() {
        // Voice control buttons (fallback for old buttons)
        if (this.startButton) {
            this.startButton.addEventListener('click', () => this.startListening());
        }
        if (this.stopButton) {
            this.stopButton.addEventListener('click', () => this.stopListening());
        }
        
        // Hold-to-speak functionality
        if (this.holdButton) {
            this.holdButton.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.handleHoldStart(e);
            });
            this.holdButton.addEventListener('mouseup', (e) => {
                e.preventDefault();
                this.handleHoldEnd();
            });
            this.holdButton.addEventListener('mouseleave', (e) => {
                e.preventDefault();
                this.handleHoldEnd();
            });
            
            // Touch events for mobile
            this.holdButton.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleHoldStart(e);
            });
            this.holdButton.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.handleHoldEnd();
            });
            this.holdButton.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                this.handleHoldEnd();
            });
            
            // Click event as fallback (only if not holding)
            this.holdButton.addEventListener('click', (e) => {
                // Only handle click if it wasn't part of a hold gesture
                // Use a small delay to check if it was a quick click
                if (!this.isHolding && !this.isListening) {
                    e.preventDefault();
                    // Quick click to start listening
                    this.startListening();
                } else if (!this.isHolding && this.isListening) {
                    e.preventDefault();
                    // Quick click while listening to stop
                    this.stopListening();
                }
            });
        }

        // Quick action buttons (action cards)
        document.querySelectorAll('.action-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const action = card.getAttribute('data-action');
                if (action) {
                    this.handleQuickAction(action);
                    // Add haptic feedback
                    if (this.userPreferences.hapticFeedback && 'vibrate' in navigator) {
                        navigator.vibrate(50);
                    }
                }
            });
            // Also handle keyboard events for accessibility
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const action = card.getAttribute('data-action');
                    if (action) {
                        this.handleQuickAction(action);
                    }
                }
            });
        });

        // Settings
        const voiceSpeed = document.getElementById('voiceSpeed');
        const voiceSpeedValue = document.getElementById('voiceSpeedValue');
        const hapticFeedback = document.getElementById('hapticFeedback');
        const wakeWord = document.getElementById('wakeWordDetection');

        if (voiceSpeed) {
            voiceSpeed.addEventListener('input', (e) => {
                const speed = parseFloat(e.target.value);
                this.userPreferences.voiceSpeed = speed;
                this.userPreferences.rate = speed; // Also update rate for speech synthesis
                if (voiceSpeedValue) {
                    voiceSpeedValue.textContent = speed.toFixed(1) + 'x';
                }
                this.savePreferences();
            });
        }

        if (hapticFeedback) {
            // Toggle switch - need click event, not change
            hapticFeedback.addEventListener('click', (e) => {
                e.preventDefault();
                const isActive = hapticFeedback.classList.contains('active');
                if (isActive) {
                    hapticFeedback.classList.remove('active');
                    hapticFeedback.setAttribute('aria-checked', 'false');
                    this.userPreferences.hapticFeedback = false;
                } else {
                    hapticFeedback.classList.add('active');
                    hapticFeedback.setAttribute('aria-checked', 'true');
                    this.userPreferences.hapticFeedback = true;
                }
                this.savePreferences();
            });
            // Also handle keyboard
            hapticFeedback.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    hapticFeedback.click();
                }
            });
        }

        // Noise cancellation toggle
        const noiseCancellation = document.getElementById('noiseCancellation');
        if (noiseCancellation) {
            noiseCancellation.addEventListener('click', (e) => {
                e.preventDefault();
                const isActive = noiseCancellation.classList.contains('active');
                if (isActive) {
                    noiseCancellation.classList.remove('active');
                    noiseCancellation.setAttribute('aria-checked', 'false');
                } else {
                    noiseCancellation.classList.add('active');
                    noiseCancellation.setAttribute('aria-checked', 'true');
                }
            });
            noiseCancellation.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    noiseCancellation.click();
                }
            });
        }

        // Wake word detection toggle
        if (wakeWord) {
            wakeWord.addEventListener('click', (e) => {
                e.preventDefault();
                const isActive = wakeWord.classList.contains('active');
                if (isActive) {
                    wakeWord.classList.remove('active');
                    wakeWord.setAttribute('aria-checked', 'false');
                } else {
                    wakeWord.classList.add('active');
                    wakeWord.setAttribute('aria-checked', 'true');
                }
            });
            wakeWord.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    wakeWord.click();
                }
            });
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            // Only handle Space if focus is on the hold button or body
            if (e.code === 'Space' && !e.target.matches('input, textarea, button')) {
                e.preventDefault();
                if (!this.isListening && !this.isHolding) {
                    this.startListening();
                }
            } else if (e.code === 'Escape') {
                if (this.isListening) {
                    this.stopListening();
                }
                if (this.isHolding) {
                    this.handleHoldEnd();
                }
            }
        });

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isListening) {
                this.stopListening();
            }
        });

        // Cleanup before unload
        window.addEventListener('beforeunload', () => {
            if (this.isListening) {
                this.stopListening();
            }
        });
    }

    async startListening() {
        if (this.isListening || this.isProcessing) return;

        // Request microphone permission if not already granted
        try {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                console.log('Microphone permission granted');
                // Stop the stream immediately, we just needed permission
                stream.getTracks().forEach(track => track.stop());
            }
        } catch (error) {
            console.error('Microphone permission error:', error);
            let errorMessage = 'Microphone access is required for voice commands. ';
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                errorMessage += 'Please enable microphone permissions in your browser settings.';
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                errorMessage += 'No microphone found. Please connect a microphone.';
            } else {
                errorMessage += 'Please check your microphone settings.';
            }
            this.announce(errorMessage);
            return;
        }

        this.isListening = true;
        this.updateUI();
        
        if (this.recognition) {
            try {
                this.recognition.start();
                this.announce('Voice recognition started');
                this.updateVoiceStatus('Listening...', 'listening');
            } catch (error) {
                console.error('Error starting recognition:', error);
                this.isListening = false;
                this.updateUI();
                if (error.message && error.message.includes('already started')) {
                    // Recognition already running, just update UI
                    this.updateVoiceStatus('Listening...', 'listening');
                } else {
                    this.announce('Failed to start voice recognition. Please try again.');
                }
            }
        } else {
            this.announce('Speech recognition not available');
            this.isListening = false;
            this.updateUI();
        }
    }

    stopListening() {
        if (!this.isListening) return;

        this.isListening = false;
        this.updateUI();
        
        if (this.recognition) {
            this.recognition.stop();
        }
        
        this.announce('Voice recognition stopped');
        this.updateVoiceStatus('Ready', '');
    }

    updateVoiceStatus(text, statusClass) {
        const statusElement = document.getElementById('voiceStatus');
        const indicator = document.getElementById('voiceIndicator');
        
        if (statusElement) {
            statusElement.textContent = text;
        }
        
        if (indicator) {
            // Remove all status classes
            indicator.classList.remove('listening', 'processing');
            if (statusClass) {
                indicator.classList.add(statusClass);
            }
        }
    }

    updateUI() {
        if (this.holdButton) {
            this.holdButton.disabled = this.isProcessing;
        }
        
        if (this.startButton) {
            this.startButton.disabled = this.isListening || this.isProcessing;
        }
        
        if (this.stopButton) {
            this.stopButton.disabled = !this.isListening || this.isProcessing;
        }
    }

    announce(message) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(message);
            utterance.rate = this.userPreferences.voiceSpeed || 1;
            speechSynthesis.speak(utterance);
        }
        
        // Also update the response area
        const responseArea = document.getElementById('responseText');
        if (responseArea) {
            responseArea.textContent = message;
        }
    }

    handleQuickAction(action) {
        switch (action) {
            case 'read-messages':
                this.readMessages();
                break;
            case 'take-note':
                this.takeNote();
                break;
            case 'make-call':
                this.makeCall();
                break;
            case 'set-reminder':
                this.setReminder();
                break;
            default:
                this.announce('Unknown action');
        }
    }

    readMessages() {
        this.announce('Reading your messages...');
        // Implementation for reading messages
        if (this.messagingIntegration) {
            this.messagingIntegration.readMessages('all');
        } else {
            this.announce('No messages to read');
        }
    }

    takeNote() {
        this.announce('Taking a note...');
        // Implementation for taking notes
        this.announce('Please speak your note');
    }

    makeCall() {
        this.announce('Making a call...');
        // Implementation for making calls
        this.announce('Who would you like to call?');
    }

    setReminder() {
        this.announce('Setting a reminder...');
        // Implementation for setting reminders
        this.announce('What would you like to be reminded about?');
    }

    async initializeSpeechRecognition() {
        // Note: We'll request microphone permission when user actually tries to use it
        // This provides better UX than requesting on page load

        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';
            
            this.recognition.onresult = (event) => {
                let finalTranscript = '';
                let interimTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }
                
                if (finalTranscript) {
                    this.finalTranscript = finalTranscript;
                    this.currentTranscript = finalTranscript;
                    this.updateTranscriptDisplay(finalTranscript);
                    this.processCommand(finalTranscript);
                } else if (interimTranscript) {
                    this.interimTranscript = interimTranscript;
                    this.updateTranscriptDisplay(interimTranscript);
                }
            };
            
            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                let errorMessage = 'Speech recognition error';
                
                if (event.error === 'no-speech') {
                    errorMessage = 'No speech detected. Please try again.';
                } else if (event.error === 'audio-capture') {
                    errorMessage = 'Microphone not found. Please check your microphone.';
                } else if (event.error === 'not-allowed') {
                    errorMessage = 'Microphone permission denied. Please enable microphone access.';
                } else {
                    errorMessage = 'Speech recognition error: ' + event.error;
                }
                
                this.announce(errorMessage);
                this.stopListening();
            };
            
            this.recognition.onstart = () => {
                console.log('Speech recognition started');
                this.updateVoiceStatus('Listening...', 'listening');
            };
            
            this.recognition.onend = () => {
                console.log('Speech recognition ended');
                if (this.isListening && this.isHolding) {
                    // Restart if still holding
                    try {
                        this.recognition.start();
                    } catch (error) {
                        console.error('Error restarting recognition:', error);
                        this.isListening = false;
                        this.updateUI();
                        this.updateVoiceStatus('Ready', '');
                    }
                } else {
                    this.isListening = false;
                    this.updateUI();
                    this.updateVoiceStatus('Ready', '');
                }
            };
        } else {
            console.warn('Speech recognition not supported');
            this.announce('Speech recognition not supported in your browser. Please use Chrome or Edge.');
        }
    }

    initializeSpeechSynthesis() {
        if ('speechSynthesis' in window) {
            this.speechSynthesis = window.speechSynthesis;
            
            // Get available voices
            this.speechSynthesis.onvoiceschanged = () => {
                this.voices = this.speechSynthesis.getVoices();
            };
            
            // Initial voice load
            this.voices = this.speechSynthesis.getVoices();
        } else {
            console.warn('Speech synthesis not supported');
        }
    }

    updateTranscriptDisplay(text) {
        const display = document.getElementById('responseText');
        if (display) {
            display.textContent = text;
        }
    }

    async speakResponse(text, emotion = 'neutral') {
        if (!this.speechSynthesis) return;
        
        // Cancel any ongoing speech
        this.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set voice properties based on emotion
        utterance.rate = this.userPreferences.voiceSpeed || 1;
        utterance.pitch = emotion === 'excited' ? 1.2 : emotion === 'sad' ? 0.8 : 1;
        utterance.volume = 1;
        
        // Select a voice if available
        if (this.voices && this.voices.length > 0) {
            const preferredVoice = this.voices.find(voice => 
                voice.lang.startsWith('en') && voice.name.includes('Google')
            ) || this.voices[0];
            utterance.voice = preferredVoice;
        }
        
        this.speechSynthesis.speak(utterance);
    }

    async generateResponse(command, emotion = 'neutral') {
        // Simple natural language processing
        const lowerCommand = command.toLowerCase().trim();
        
        // Check for messaging commands
        if (this.messagingIntegration && this.isMessagingCommand(lowerCommand)) {
            try {
                return await this.messagingIntegration.processCommand(lowerCommand);
            } catch (error) {
                console.error('Messaging command error:', error);
                return "I'm having trouble with that messaging command. Please try again.";
            }
        }
        
        // Basic command responses
        if (lowerCommand.includes('hello') || lowerCommand.includes('hi')) {
            return "Hello! I'm Vision Assistant, your AI companion. How can I help you today?";
        }
        
        if (lowerCommand.includes('time')) {
            const now = new Date();
            return `The current time is ${now.toLocaleTimeString()}`;
        }
        
        if (lowerCommand.includes('date')) {
            const today = new Date();
            return `Today is ${today.toLocaleDateString()}`;
        }
        
        if (lowerCommand.includes('weather')) {
            return "I don't have access to weather data right now. Please check your weather app.";
        }
        
        if (lowerCommand.includes('joke')) {
            const jokes = [
                "Why don't scientists trust atoms? Because they make up everything!",
                "I told my wife she was drawing her eyebrows too high. She looked surprised.",
                "I'm reading a book about anti-gravity. It's impossible to put down!"
            ];
            return jokes[Math.floor(Math.random() * jokes.length)];
        }
        
        if (lowerCommand.includes('help')) {
            return "I can help you with messages, calls, notes, reminders, and more. Try saying 'read messages', 'take note', or 'set reminder'.";
        }
        
        // Default response based on emotion
        const defaultResponses = {
            happy: "I'm glad you're feeling good! How can I assist you today?",
            sad: "I'm here to help. What's on your mind?",
            excited: "I can feel your excitement! What would you like to do?",
            neutral: "I understand. What would you like me to help you with?"
        };
        
        return defaultResponses[emotion] || defaultResponses.neutral;
    }

    isMessagingCommand(command) {
        const messagingKeywords = ['message', 'text', 'sms', 'email', 'send', 'whatsapp', 'call'];
        return messagingKeywords.some(keyword => command.includes(keyword));
    }

    async initializeMessaging() {
        try {
            if (typeof MessagingIntegration !== 'undefined') {
                this.messagingIntegration = new MessagingIntegration();
                await this.messagingIntegration.initialize();
                this.announce('Messaging integration ready');
            } else {
                console.warn('Messaging integration not available');
            }
        } catch (error) {
            console.error('Messaging initialization error:', error);
            this.announce('Messaging features temporarily unavailable');
        }
    }

    initializeAudioContext() {
        try {
            if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                this.audioContext = new AudioContextClass();
                this.announce('Audio system ready');
            } else {
                console.warn('Web Audio API not supported');
            }
        } catch (error) {
            console.error('Audio context initialization error:', error);
        }
    }

    addToContext(role, content) {
        this.contextMemory.push({
            role: role,
            content: content,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 50 messages to prevent memory issues
        if (this.contextMemory.length > 50) {
            this.contextMemory = this.contextMemory.slice(-50);
        }
        
        // Save to local storage
        try {
            localStorage.setItem('vision_assistant_context', JSON.stringify(this.contextMemory));
        } catch (error) {
            console.warn('Could not save context to local storage');
        }
    }

    loadPreferences() {
        try {
            const saved = localStorage.getItem('vision_assistant_preferences');
            if (saved) {
                const prefs = JSON.parse(saved);
                this.userPreferences = { ...this.userPreferences, ...prefs };
                
                // Apply preferences to UI
                const voiceSpeed = document.getElementById('voiceSpeed');
                const voiceSpeedValue = document.getElementById('voiceSpeedValue');
                const hapticFeedback = document.getElementById('hapticFeedback');
                const wakeWord = document.getElementById('wakeWordDetection');
                
                if (voiceSpeed && this.userPreferences.voiceSpeed) {
                    voiceSpeed.value = this.userPreferences.voiceSpeed;
                }
                if (voiceSpeedValue && this.userPreferences.voiceSpeed) {
                    voiceSpeedValue.textContent = this.userPreferences.voiceSpeed.toFixed(1) + 'x';
                }
                if (hapticFeedback) {
                    if (this.userPreferences.hapticFeedback) {
                        hapticFeedback.classList.add('active');
                        hapticFeedback.setAttribute('aria-checked', 'true');
                    } else {
                        hapticFeedback.classList.remove('active');
                        hapticFeedback.setAttribute('aria-checked', 'false');
                    }
                }
                // Note: wakeWord is a toggle switch, not an input, so we don't set a value
            }
        } catch (error) {
            console.warn('Could not load preferences:', error);
        }
    }

    savePreferences() {
        try {
            localStorage.setItem('vision_assistant_preferences', JSON.stringify(this.userPreferences));
        } catch (error) {
            console.warn('Could not save preferences');
        }
    }

    provideHapticFeedback(type = 'light') {
        if (!this.userPreferences.hapticFeedback || !('vibrate' in navigator)) return;
        
        const patterns = {
            light: 50,
            medium: [50, 100, 50],
            strong: [100, 50, 100, 50, 100]
        };
        
        navigator.vibrate(patterns[type] || patterns.light);
    }

    cleanup() {
        // Stop all audio and recognition
        if (this.recognition) {
            this.recognition.stop();
        }
        
        if (this.speechSynthesis) {
            this.speechSynthesis.cancel();
        }
        
        if (this.audioContext) {
            this.audioContext.close();
        }
        
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        
        // Save preferences
        this.savePreferences();
    }

    // Keyboard navigation
    handleKeyDown = (event) => {
        if (event.code === 'Space') {
            event.preventDefault();
            if (!this.isListening) {
                this.startListening();
            }
        } else if (event.code === 'Escape') {
            event.preventDefault();
            this.stopListening();
        }
    }

    handleKeyUp = (event) => {
        if (event.code === 'Space') {
            event.preventDefault();
            if (this.isListening) {
                this.stopListening();
            }
        }
    }

    // Page visibility
    handleVisibilityChange = () => {
        if (document.hidden) {
            this.stopListening();
        }
    }

    // Initialize on page load
    static async initialize() {
        try {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', async () => {
                    await VisionAssistant.initialize();
                });
            } else {
                const assistant = new VisionAssistant();
                
                // Wait for async components to initialize
                await assistant.initializeAsyncComponents();
                
                // Make assistant globally available for debugging
                window.visionAssistant = assistant;

                console.log('Vision Assistant initialized and ready!');
            }
        } catch (error) {
            console.error('Failed to initialize Vision Assistant:', error);
            
            // Show error to user
            const statusDiv = document.getElementById('status');
            if (statusDiv) {
                statusDiv.textContent = 'Failed to initialize assistant';
                statusDiv.className = 'status error';
            }
            
            // Also update response area
            const responseArea = document.getElementById('responseText');
            if (responseArea) {
                responseArea.textContent = 'Failed to initialize assistant. Please refresh the page.';
            }
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    await VisionAssistant.initialize();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.visionAssistant) {
        window.visionAssistant.cleanup();
    }
});