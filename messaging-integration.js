/**
 * Messaging App Integration
 * Handles WhatsApp, SMS, and Email via voice commands
 */

class MessagingIntegration {
    constructor() {
        this.providers = {
            whatsapp: new WhatsAppProvider(),
            sms: new SMSProvider(),
            email: new EmailProvider()
        };
        this.messageQueue = [];
        this.isProcessing = false;
        this.draftMessages = new Map();
    }

    async initialize() {
        try {
            // Initialize all messaging providers
            for (const [name, provider] of Object.entries(this.providers)) {
                await provider.initialize();
                console.log(`${name} provider initialized`);
            }
            
            console.log('Messaging integration initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize messaging integration:', error);
            return false;
        }
    }

    async processVoiceCommand(command, context = {}) {
        try {
            // Parse voice command for messaging actions
            const parsedCommand = this.parseMessagingCommand(command);
            
            if (!parsedCommand) {
                return { success: false, error: 'Not a messaging command' };
            }

            const { action, provider, recipient, message } = parsedCommand;
            
            switch (action) {
                case 'send':
                    return await this.sendMessage(provider, recipient, message, context);
                
                case 'read':
                    return await this.readMessages(provider, recipient, context);
                
                case 'draft':
                    return await this.draftMessage(provider, recipient, message, context);
                
                case 'reply':
                    return await this.replyToMessage(provider, recipient, message, context);
                
                case 'forward':
                    return await this.forwardMessage(provider, recipient, message, context);
                
                default:
                    return { success: false, error: 'Unknown messaging action' };
            }
        } catch (error) {
            console.error('Error processing messaging command:', error);
            return { success: false, error: error.message };
        }
    }

    parseMessagingCommand(command) {
        const commandLower = command.toLowerCase();
        
        // Define patterns for different messaging actions
        const patterns = {
            send: [
                /send (?:a )?message to (.+?) saying (.+)/i,
                /text (.+?) (.+)/i,
                /whatsapp (.+?) (.+)/i,
                /email (.+?) (.+)/i,
                /sms (.+?) (.+)/i
            ],
            read: [
                /read (?:my )?messages(?: from (.+?))?/i,
                /check (?:my )?whatsapp/i,
                /check (?:my )?emails/i,
                /check (?:my )?sms/i,
                /show (?:me )?messages(?: from (.+?))?/i
            ],
            draft: [
                /draft (?:a )?message to (.+?) saying (.+)/i,
                /create (?:a )?draft for (.+?) (.+)/i
            ],
            reply: [
                /reply to (.+?) saying (.+)/i,
                /respond to (.+?) (.+)/i
            ],
            forward: [
                /forward (?:the )?message to (.+?)(?: from (.+?))?/i,
                /send (?:the )?message to (.+?) from (.+)/i
            ]
        };

        // Try to match patterns
        for (const [action, actionPatterns] of Object.entries(patterns)) {
            for (const pattern of actionPatterns) {
                const match = commandLower.match(pattern);
                if (match) {
                    return {
                        action,
                        provider: this.detectProvider(commandLower),
                        recipient: match[1] ? match[1].trim() : null,
                        message: match[2] ? match[2].trim() : null
                    };
                }
            }
        }

        return null;
    }

    detectProvider(command) {
        const commandLower = command.toLowerCase();
        
        if (commandLower.includes('whatsapp')) return 'whatsapp';
        if (commandLower.includes('email')) return 'email';
        if (commandLower.includes('sms') || commandLower.includes('text')) return 'sms';
        
        // Default to WhatsApp if not specified
        return 'whatsapp';
    }

    async sendMessage(provider, recipient, message, context) {
        try {
            if (!this.providers[provider]) {
                throw new Error(`Provider ${provider} not available`);
            }

            // Resolve recipient
            const resolvedRecipient = await this.resolveRecipient(recipient, provider);
            if (!resolvedRecipient) {
                throw new Error(`Could not resolve recipient: ${recipient}`);
            }

            // Send message
            const result = await this.providers[provider].sendMessage(resolvedRecipient, message, context);
            
            if (result.success) {
                // Store in context for future reference
                context.lastMessage = {
                    provider,
                    recipient: resolvedRecipient,
                    message,
                    timestamp: Date.now()
                };
            }

            return result;
        } catch (error) {
            console.error('Error sending message:', error);
            return { success: false, error: error.message };
        }
    }

    async readMessages(provider, recipient = null, context = {}) {
        try {
            if (!this.providers[provider]) {
                throw new Error(`Provider ${provider} not available`);
            }

            let resolvedRecipient = null;
            if (recipient) {
                resolvedRecipient = await this.resolveRecipient(recipient, provider);
            }

            const messages = await this.providers[provider].readMessages(resolvedRecipient, context);
            
            // Format messages for speech output
            const formattedMessages = this.formatMessagesForSpeech(messages, provider);
            
            return {
                success: true,
                messages: formattedMessages,
                rawMessages: messages,
                provider,
                recipient: resolvedRecipient
            };
        } catch (error) {
            console.error('Error reading messages:', error);
            return { success: false, error: error.message };
        }
    }

    async draftMessage(provider, recipient, message, context) {
        try {
            const draftKey = `${provider}:${recipient}`;
            this.draftMessages.set(draftKey, {
                provider,
                recipient,
                message,
                created: Date.now(),
                context
            });

            return {
                success: true,
                message: `Message drafted for ${recipient}`,
                draftKey
            };
        } catch (error) {
            console.error('Error drafting message:', error);
            return { success: false, error: error.message };
        }
    }

    async replyToMessage(provider, recipient, message, context) {
        try {
            // Get the last message from this recipient
            const lastMessages = await this.readMessages(provider, recipient, { limit: 1 });
            
            if (lastMessages.success && lastMessages.messages.length > 0) {
                return await this.sendMessage(provider, recipient, message, context);
            } else {
                return { success: false, error: `No recent messages from ${recipient} to reply to` };
            }
        } catch (error) {
            console.error('Error replying to message:', error);
            return { success: false, error: error.message };
        }
    }

    async forwardMessage(provider, recipient, message, context) {
        try {
            // Get the last message
            const lastMessages = await this.readMessages(provider, null, { limit: 1 });
            
            if (lastMessages.success && lastMessages.messages.length > 0) {
                const messageToForward = lastMessages.messages[0];
                const forwardText = `Forwarded: ${messageToForward.content}`;
                
                return await this.sendMessage(provider, recipient, forwardText, context);
            } else {
                return { success: false, error: 'No recent messages to forward' };
            }
        } catch (error) {
            console.error('Error forwarding message:', error);
            return { success: false, error: error.message };
        }
    }

    async resolveRecipient(recipient, provider) {
        try {
            // Check if it's a phone number
            const phoneRegex = /^(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}$/;
            if (phoneRegex.test(recipient)) {
                return recipient.replace(/[-.\s()]/g, '');
            }

            // Check if it's an email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (emailRegex.test(recipient)) {
                return recipient;
            }

            // Look up in contacts (would be implemented with actual contact API)
            const contacts = await this.getContacts();
            const contact = contacts.find(c => 
                c.name.toLowerCase().includes(recipient.toLowerCase()) ||
                c.displayName.toLowerCase().includes(recipient.toLowerCase())
            );

            if (contact) {
                // Return appropriate identifier based on provider
                switch (provider) {
                    case 'whatsapp':
                        return contact.phone || contact.whatsapp;
                    case 'sms':
                        return contact.phone;
                    case 'email':
                        return contact.email;
                    default:
                        return contact.phone || contact.email;
                }
            }

            // If no match found, return as-is (might be a group name or username)
            return recipient;
        } catch (error) {
            console.error('Error resolving recipient:', error);
            return recipient;
        }
    }

    async getContacts() {
        // Mock contacts - in real implementation, this would use Contact Picker API
        return [
            { name: 'john', displayName: 'John Doe', phone: '+1234567890', email: 'john@example.com', whatsapp: '+1234567890' },
            { name: 'jane', displayName: 'Jane Smith', phone: '+0987654321', email: 'jane@example.com', whatsapp: '+0987654321' },
            { name: 'mom', displayName: 'Mom', phone: '+1112223333', email: 'mom@example.com', whatsapp: '+1112223333' },
            { name: 'dad', displayName: 'Dad', phone: '+4445556666', email: 'dad@example.com', whatsapp: '+4445556666' }
        ];
    }

    formatMessagesForSpeech(messages, provider) {
        if (!messages || messages.length === 0) {
            return [`No messages found in ${provider}`];
        }

        return messages.map((message, index) => {
            const sender = message.sender || 'Unknown';
            const time = message.timestamp ? 
                new Date(message.timestamp).toLocaleTimeString() : 
                'Unknown time';
            
            return `Message ${index + 1} from ${sender} at ${time}: ${message.content}`;
        });
    }

    // Queue management for batch processing
    async addToQueue(command) {
        this.messageQueue.push(command);
        if (!this.isProcessing) {
            this.processQueue();
        }
    }

    async processQueue() {
        if (this.isProcessing || this.messageQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        while (this.messageQueue.length > 0) {
            const command = this.messageQueue.shift();
            try {
                await this.processVoiceCommand(command);
            } catch (error) {
                console.error('Error processing queued command:', error);
            }
        }

        this.isProcessing = false;
    }
}

// Individual Provider Classes
class WhatsAppProvider {
    constructor() {
        this.isAvailable = false;
        this.apiEndpoint = null;
    }

    async initialize() {
        try {
            // Check if WhatsApp Web API is available
            // In a real implementation, this would connect to WhatsApp Web or Business API
            this.isAvailable = true;
            console.log('WhatsApp provider initialized');
            return true;
        } catch (error) {
            console.error('WhatsApp initialization error:', error);
            this.isAvailable = false;
            return false;
        }
    }

    async sendMessage(recipient, message, context) {
        if (!this.isAvailable) {
            return { success: false, error: 'WhatsApp not available' };
        }

        try {
            // Mock WhatsApp message sending
            // In real implementation, this would use WhatsApp Web API or Business API
            console.log(`Sending WhatsApp message to ${recipient}: ${message}`);
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            return {
                success: true,
                messageId: `whatsapp_${Date.now()}`,
                timestamp: Date.now(),
                provider: 'whatsapp'
            };
        } catch (error) {
            console.error('WhatsApp send error:', error);
            return { success: false, error: error.message };
        }
    }

    async readMessages(recipient = null, context) {
        if (!this.isAvailable) {
            return { success: false, error: 'WhatsApp not available' };
        }

        try {
            // Mock WhatsApp message reading
            // In real implementation, this would fetch from WhatsApp API
            const mockMessages = [
                {
                    id: 'msg_1',
                    sender: 'John Doe',
                    content: 'Hey, how are you doing?',
                    timestamp: Date.now() - 3600000,
                    isRead: false
                },
                {
                    id: 'msg_2',
                    sender: 'Jane Smith',
                    content: 'Meeting tomorrow at 3 PM',
                    timestamp: Date.now() - 7200000,
                    isRead: true
                }
            ];

            // Filter by recipient if specified
            const messages = recipient ? 
                mockMessages.filter(msg => msg.sender.toLowerCase().includes(recipient.toLowerCase())) :
                mockMessages;

            return messages;
        } catch (error) {
            console.error('WhatsApp read error:', error);
            return [];
        }
    }
}

class SMSProvider {
    constructor() {
        this.isAvailable = false;
    }

    async initialize() {
        try {
            // Check if SMS API is available (Web SMS API or native bridge)
            if ('sms' in navigator) {
                this.isAvailable = true;
                console.log('SMS provider initialized with Web SMS API');
            } else {
                // Mock availability for demonstration
                this.isAvailable = true;
                console.log('SMS provider initialized (mock mode)');
            }
            return true;
        } catch (error) {
            console.error('SMS initialization error:', error);
            this.isAvailable = false;
            return false;
        }
    }

    async sendMessage(recipient, message, context) {
        if (!this.isAvailable) {
            return { success: false, error: 'SMS not available' };
        }

        try {
            if ('sms' in navigator) {
                // Use Web SMS API
                const sms = await navigator.sms.send(recipient, message);
                return {
                    success: true,
                    messageId: sms.id,
                    timestamp: Date.now(),
                    provider: 'sms'
                };
            } else {
                // Mock SMS sending
                console.log(`Sending SMS to ${recipient}: ${message}`);
                await new Promise(resolve => setTimeout(resolve, 800));
                
                return {
                    success: true,
                    messageId: `sms_${Date.now()}`,
                    timestamp: Date.now(),
                    provider: 'sms'
                };
            }
        } catch (error) {
            console.error('SMS send error:', error);
            return { success: false, error: error.message };
        }
    }

    async readMessages(recipient = null, context) {
        if (!this.isAvailable) {
            return { success: false, error: 'SMS not available' };
        }

        try {
            // Mock SMS messages
            const mockMessages = [
                {
                    id: 'sms_1',
                    sender: '+1234567890',
                    content: 'Your appointment is confirmed for tomorrow',
                    timestamp: Date.now() - 1800000,
                    isRead: false
                },
                {
                    id: 'sms_2',
                    sender: '+0987654321',
                    content: 'Reminder: Payment due today',
                    timestamp: Date.now() - 5400000,
                    isRead: true
                }
            ];

            // Filter by recipient if specified
            const messages = recipient ? 
                mockMessages.filter(msg => msg.sender.includes(recipient)) :
                mockMessages;

            return messages;
        } catch (error) {
            console.error('SMS read error:', error);
            return [];
        }
    }
}

class EmailProvider {
    constructor() {
        this.isAvailable = false;
    }

    async initialize() {
        try {
            // Check if email API is available (would need email service integration)
            this.isAvailable = true;
            console.log('Email provider initialized');
            return true;
        } catch (error) {
            console.error('Email initialization error:', error);
            this.isAvailable = false;
            return false;
        }
    }

    async sendMessage(recipient, message, context) {
        if (!this.isAvailable) {
            return { success: false, error: 'Email not available' };
        }

        try {
            // Mock email sending
            // In real implementation, this would use email API (SendGrid, Mailgun, etc.)
            console.log(`Sending email to ${recipient}: ${message}`);
            
            // Simulate email composition
            const subject = context.subject || 'Message from Vision Assistant';
            const body = message;
            
            await new Promise(resolve => setTimeout(resolve, 1200));
            
            return {
                success: true,
                messageId: `email_${Date.now()}`,
                timestamp: Date.now(),
                provider: 'email',
                subject: subject
            };
        } catch (error) {
            console.error('Email send error:', error);
            return { success: false, error: error.message };
        }
    }

    async readMessages(recipient = null, context) {
        if (!this.isAvailable) {
            return { success: false, error: 'Email not available' };
        }

        try {
            // Mock email messages
            const mockMessages = [
                {
                    id: 'email_1',
                    sender: 'newsletter@example.com',
                    subject: 'Weekly Newsletter',
                    content: 'Here is your weekly newsletter with updates',
                    timestamp: Date.now() - 3600000,
                    isRead: false
                },
                {
                    id: 'email_2',
                    sender: 'support@company.com',
                    subject: 'Support Ticket Update',
                    content: 'Your support ticket has been updated',
                    timestamp: Date.now() - 7200000,
                    isRead: true
                }
            ];

            // Filter by recipient/sender if specified
            const messages = recipient ? 
                mockMessages.filter(msg => msg.sender.toLowerCase().includes(recipient.toLowerCase())) :
                mockMessages;

            return messages;
        } catch (error) {
            console.error('Email read error:', error);
            return [];
        }
    }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MessagingIntegration;
} else if (typeof window !== 'undefined') {
    window.MessagingIntegration = MessagingIntegration;
}