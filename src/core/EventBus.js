/**
 * EventBus - Decoupled Communication System
 * Handles all inter-component communication for Flow Application
 */

class EventBus {
    constructor() {
        this.events = new Map();
        this.debugMode = true; // Enable for development
        this.listenerId = 0;
        
        if (this.debugMode) {
            console.log('🚌 EventBus initialized');
        }
    }

    /**
     * Subscribe to an event
     * @param {string} eventName - The event to listen for
     * @param {function} callback - Function to call when event is emitted
     * @param {object} context - Optional context for the callback
     * @returns {number} listenerId - ID to use for removing the listener
     */
    on(eventName, callback, context = null) {
        if (typeof eventName !== 'string' || typeof callback !== 'function') {
            console.error('EventBus.on: Invalid parameters', { eventName, callback });
            return null;
        }

        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }

        const listenerId = ++this.listenerId;
        const listener = {
            id: listenerId,
            callback,
            context
        };

        this.events.get(eventName).push(listener);

        if (this.debugMode) {
            console.log(`🎧 EventBus: Registered listener for '${eventName}' (ID: ${listenerId})`);
        }

        return listenerId;
    }

    /**
     * Remove a specific event listener
     * @param {string} eventName - The event name
     * @param {number} listenerId - The listener ID returned by on()
     */
    off(eventName, listenerId) {
        if (!this.events.has(eventName)) {
            console.warn(`EventBus.off: No listeners for event '${eventName}'`);
            return;
        }

        const listeners = this.events.get(eventName);
        const index = listeners.findIndex(listener => listener.id === listenerId);
        
        if (index > -1) {
            listeners.splice(index, 1);
            
            if (this.debugMode) {
                console.log(`🗑️ EventBus: Removed listener for '${eventName}' (ID: ${listenerId})`);
            }

            // Clean up empty event arrays
            if (listeners.length === 0) {
                this.events.delete(eventName);
            }
        } else {
            console.warn(`EventBus.off: Listener ID ${listenerId} not found for event '${eventName}'`);
        }
    }

    /**
     * Remove all listeners for an event
     * @param {string} eventName - The event name
     */
    removeAllListeners(eventName) {
        if (this.events.has(eventName)) {
            const count = this.events.get(eventName).length;
            this.events.delete(eventName);
            
            if (this.debugMode) {
                console.log(`🧹 EventBus: Removed all ${count} listeners for '${eventName}'`);
            }
        }
    }

    /**
     * Emit an event to all listeners
     * @param {string} eventName - The event to emit
     * @param {any} data - Data to pass to listeners
     */
    emit(eventName, data = null) {
        if (typeof eventName !== 'string') {
            console.error('EventBus.emit: Invalid event name', eventName);
            return;
        }

        if (this.debugMode) {
            console.log(`📡 EventBus: Emitting '${eventName}'`, data);
        }

        if (!this.events.has(eventName)) {
            if (this.debugMode) {
                console.log(`📭 EventBus: No listeners for '${eventName}'`);
            }
            return;
        }

        const listeners = this.events.get(eventName);
        const errors = [];

        // Call all listeners
        listeners.forEach(listener => {
            try {
                if (listener.context) {
                    listener.callback.call(listener.context, data);
                } else {
                    listener.callback(data);
                }
            } catch (error) {
                console.error(`EventBus: Error in listener for '${eventName}':`, error);
                errors.push({ listenerId: listener.id, error });
            }
        });

        // Report any errors
        if (errors.length > 0) {
            console.error(`EventBus: ${errors.length} listener(s) failed for '${eventName}'`, errors);
        }
    }

    /**
     * Subscribe to an event only once
     * @param {string} eventName - The event to listen for
     * @param {function} callback - Function to call when event is emitted
     * @param {object} context - Optional context for the callback
     */
    once(eventName, callback, context = null) {
        const onceWrapper = (data) => {
            callback.call(context, data);
            this.off(eventName, listenerId);
        };

        const listenerId = this.on(eventName, onceWrapper, context);
        return listenerId;
    }

    /**
     * Check if an event has any listeners
     * @param {string} eventName - The event name to check
     * @returns {boolean} - True if event has listeners
     */
    hasListeners(eventName) {
        return this.events.has(eventName) && this.events.get(eventName).length > 0;
    }

    /**
     * Get the number of listeners for an event
     * @param {string} eventName - The event name
     * @returns {number} - Number of listeners
     */
    getListenerCount(eventName) {
        return this.events.has(eventName) ? this.events.get(eventName).length : 0;
    }

    /**
     * Get all registered event names
     * @returns {Array<string>} - Array of event names
     */
    getEventNames() {
        return Array.from(this.events.keys());
    }

    /**
     * Clear all events and listeners
     */
    clearAll() {
        const eventCount = this.events.size;
        this.events.clear();
        
        if (this.debugMode) {
            console.log(`🧹 EventBus: Cleared all ${eventCount} events`);
        }
    }

    /**
     * Enable or disable debug mode
     * @param {boolean} enabled - Whether to enable debug logging
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        console.log(`🐛 EventBus: Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Get debug information about the EventBus state
     * @returns {object} - Debug information
     */
    getDebugInfo() {
        const info = {
            totalEvents: this.events.size,
            totalListeners: 0,
            events: {}
        };

        this.events.forEach((listeners, eventName) => {
            info.totalListeners += listeners.length;
            info.events[eventName] = listeners.length;
        });

        return info;
    }
}

// Create global EventBus instance
const eventBus = new EventBus();

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventBus;
}

// CRITICAL FIX: Expose the INSTANCE, not the class
// Components need to call window.EventBus.on(), which requires an instance
if (typeof window !== 'undefined') {
    window.EventBus = eventBus;  // ← This is the instance with .on() method
    window.EventBusClass = EventBus;  // ← This is the class constructor (if needed)
}

// Log initialization
if (eventBus.debugMode) {
    console.log('✅ EventBus ready for Flow Application');
    console.log('✅ EventBus instance exposed to window object');
}