 /**
 * WebSocket Client for Flow Application
 * Handles all communication between frontend and C# backend
 */

class WebSocketClient {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.connectionAttempts = 0;
        this.maxRetries = 5;
        this.retryDelay = 2000; // 2 seconds
        this.messageQueue = [];
        this.messageHandlers = new Map();
        
        // Status callback for UI updates
        this.onStatusChange = null;
    }

    /**
     * Connect to the WebSocket server
     */
    async connect(url = 'ws://localhost:8080/flow') {
        return new Promise((resolve, reject) => {
            try {
                console.log('Attempting to connect to backend...');
                this.updateStatus('Connecting...');
                
                this.ws = new WebSocket(url);
                
                this.ws.onopen = () => {
                    console.log('Connected to backend successfully');
                    this.isConnected = true;
                    this.connectionAttempts = 0;
                    this.updateStatus('Connected');
                    
                    // Send any queued messages
                    this.flushMessageQueue();
                    
                    resolve();
                };
                
                this.ws.onmessage = (event) => {
                    this.handleMessage(event.data);
                };
                
                this.ws.onclose = (event) => {
                    console.log('Connection closed:', event.code, event.reason);
                    this.isConnected = false;
                    this.updateStatus('Disconnected');
                    
                    // Attempt to reconnect if it wasn't a manual close
                    if (event.code !== 1000 && this.connectionAttempts < this.maxRetries) {
                        this.attemptReconnect();
                    }
                };
                
                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    this.updateStatus('Connection Error');
                    reject(error);
                };
                
            } catch (error) {
                console.error('Failed to create WebSocket connection:', error);
                this.updateStatus('Connection Failed');
                reject(error);
            }
        });
    }

    /**
     * Attempt to reconnect with exponential backoff
     */
    attemptReconnect() {
        this.connectionAttempts++;
        const delay = this.retryDelay * Math.pow(2, this.connectionAttempts - 1);
        
        console.log(`Attempting to reconnect (${this.connectionAttempts}/${this.maxRetries}) in ${delay}ms...`);
        this.updateStatus(`Reconnecting (${this.connectionAttempts}/${this.maxRetries})`);
        
        setTimeout(() => {
            this.connect().catch(() => {
                if (this.connectionAttempts >= this.maxRetries) {
                    console.error('Max reconnection attempts reached');
                    this.updateStatus('Connection Failed');
                }
            });
        }, delay);
    }

    /**
     * Send a message to the backend
     */
    send(type, data = {}) {
        const message = {
            type: type,
            data: data,
            timestamp: Date.now()
        };
        
        const messageStr = JSON.stringify(message);
        
        if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
            console.log('Sending message:', type, data);
            this.ws.send(messageStr);
        } else {
            console.warn('Not connected, queuing message:', type);
            this.messageQueue.push(messageStr);
        }
    }

    /**
     * Register a handler for specific message types
     */
    on(messageType, handler) {
        if (!this.messageHandlers.has(messageType)) {
            this.messageHandlers.set(messageType, []);
        }
        this.messageHandlers.get(messageType).push(handler);
    }

    /**
     * Remove a message handler
     */
    off(messageType, handler) {
        if (this.messageHandlers.has(messageType)) {
            const handlers = this.messageHandlers.get(messageType);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    /**
     * Handle incoming messages from backend
     */
    handleMessage(messageStr) {
        try {
            console.log('Received raw message:', messageStr);
            
            // Handle simple echo responses (our current backend sends these)
            if (messageStr.startsWith('Echo: ')) {
                console.log('Received echo:', messageStr);
                this.notifyHandlers('echo', { message: messageStr });
                return;
            }
            
            // Try to parse as JSON
            const message = JSON.parse(messageStr);
            console.log('Received message:', message.type, message.data);
            
            // Notify registered handlers
            this.notifyHandlers(message.type, message.data);
            
        } catch (error) {
            console.error('Failed to parse message:', error, messageStr);
        }
    }

    /**
     * Notify all handlers for a specific message type
     */
    notifyHandlers(messageType, data) {
        if (this.messageHandlers.has(messageType)) {
            this.messageHandlers.get(messageType).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error('Error in message handler:', error);
                }
            });
        }
    }

    /**
     * Send queued messages when connection is restored
     */
    flushMessageQueue() {
        while (this.messageQueue.length > 0 && this.isConnected) {
            const message = this.messageQueue.shift();
            this.ws.send(message);
        }
    }

    /**
     * Update connection status and notify UI
     */
    updateStatus(status) {
        if (this.onStatusChange) {
            this.onStatusChange(status);
        }
    }

    /**
     * Close the connection
     */
    disconnect() {
        if (this.ws) {
            console.log('Disconnecting from backend...');
            this.ws.close(1000, 'Manual disconnect');
            this.ws = null;
            this.isConnected = false;
            this.updateStatus('Disconnected');
        }
    }

    /**
     * Send a ping to test connection
     */
    ping() {
        this.send('ping', { timestamp: Date.now() });
    }

    /**
     * Get current connection status
     */
    getStatus() {
        if (!this.ws) return 'Not Connected';
        
        switch (this.ws.readyState) {
            case WebSocket.CONNECTING: return 'Connecting';
            case WebSocket.OPEN: return 'Connected';
            case WebSocket.CLOSING: return 'Disconnecting';
            case WebSocket.CLOSED: return 'Disconnected';
            default: return 'Unknown';
        }
    }
}

// Export for use in other modules
window.WebSocketClient = WebSocketClient;
