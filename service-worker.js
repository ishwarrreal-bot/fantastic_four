/**
 * Service Worker for Vision Assistant PWA
 * Handles offline functionality and caching
 */

const CACHE_NAME = 'vision-assistant-v1';
const urlsToCache = [
    '/',
    '/complete_blindness.html',
    '/app.js',
    '/manifest.json',
    'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.15.0/dist/tf.min.js',
    'https://cdn.jsdelivr.net/npm/@tensorflow-models/speech-commands@0.5.4/dist/speech-commands.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/annyang/2.6.1/annyang.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/hammer.js/2.0.8/hammer.min.js'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('Service worker installed');
                return self.skipWaiting();
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service worker activated');
            return self.clients.claim();
        })
    );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                if (response) {
                    return response;
                }
                
                return fetch(event.request).then((response) => {
                    // Don't cache non-successful responses
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    // Clone the response
                    const responseToCache = response.clone();
                    
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                    
                    return response;
                });
            })
            .catch((error) => {
                console.log('Fetch failed, returning offline page', error);
                
                // Return offline page for navigation requests
                if (event.request.mode === 'navigate') {
                    return caches.match('/complete_blindness.html');
                }
                
                throw error;
            })
    );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-notes') {
        event.waitUntil(syncNotes());
    } else if (event.tag === 'sync-reminders') {
        event.waitUntil(syncReminders());
    }
});

// Sync notes when back online
async function syncNotes() {
    try {
        const cache = await caches.open(CACHE_NAME);
        const notes = await getLocalData('vision_notes_sync');
        
        if (notes && notes.length > 0) {
            // Simulate syncing to server
            console.log('Syncing notes:', notes);
            
            // Clear sync queue after successful sync
            await setLocalData('vision_notes_sync', []);
            
            return Promise.resolve();
        }
    } catch (error) {
        console.error('Notes sync failed:', error);
        return Promise.reject(error);
    }
}

// Sync reminders when back online
async function syncReminders() {
    try {
        const reminders = await getLocalData('vision_reminders_sync');
        
        if (reminders && reminders.length > 0) {
            // Simulate syncing to server
            console.log('Syncing reminders:', reminders);
            
            // Clear sync queue after successful sync
            await setLocalData('vision_reminders_sync', []);
            
            return Promise.resolve();
        }
    } catch (error) {
        console.error('Reminders sync failed:', error);
        return Promise.reject(error);
    }
}

// Helper function to get data from localStorage
async function getLocalData(key) {
    return new Promise((resolve) => {
        // This would need to be implemented differently in a real service worker
        // For now, return empty array
        resolve([]);
    });
}

// Helper function to set data in localStorage
async function setLocalData(key, data) {
    return new Promise((resolve) => {
        // This would need to be implemented differently in a real service worker
        resolve();
    });
}

// Handle push notifications
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'New notification from Vision Assistant',
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        vibrate: [200, 100, 200],
        tag: 'vision-notification',
        requireInteraction: true,
        actions: [
            {
                action: 'view',
                title: 'View',
                icon: '/icon-view.png'
            },
            {
                action: 'dismiss',
                title: 'Dismiss',
                icon: '/icon-dismiss.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('Vision Assistant', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'view') {
        // Open the app
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Periodic background sync
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'check-reminders') {
        event.waitUntil(checkReminders());
    }
});

// Check reminders periodically
async function checkReminders() {
    try {
        const reminders = await getLocalData('vision_reminders');
        const now = new Date();
        
        if (reminders && reminders.length > 0) {
            const dueReminders = reminders.filter(reminder => {
                const reminderTime = new Date(reminder.time);
                return reminderTime <= now;
            });
            
            if (dueReminders.length > 0) {
                // Send notifications for due reminders
                for (const reminder of dueReminders) {
                    await sendReminderNotification(reminder);
                }
            }
        }
    } catch (error) {
        console.error('Checking reminders failed:', error);
    }
}

// Send reminder notification
async function sendReminderNotification(reminder) {
    const options = {
        body: reminder.content,
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        vibrate: [300, 100, 300, 100, 300],
        tag: `reminder-${reminder.id}`,
        requireInteraction: true,
        actions: [
            {
                action: 'complete',
                title: 'Complete',
                icon: '/icon-complete.png'
            },
            {
                action: 'snooze',
                title: 'Snooze',
                icon: '/icon-snooze.png'
            }
        ]
    };
    
    return self.registration.showNotification('Reminder', options);
}