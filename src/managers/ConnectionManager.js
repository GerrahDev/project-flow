/**
 * ConnectionManager - Handles all WebSocket communication and connection management
 * Manages connection lifecycle and basic non-project message handling
 */

class ConnectionManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.wsClient = null;
        this.isConnected = false;
        this.connectionAttempts = 0;
        this.maxRetries = 5;
        
        console.log('🌐 ConnectionManager initialized');
    }

    /**
     * Initialize and connect to WebSocket server
     */
    async connect(url = 'ws://localhost:8080/flow') {
        console.log('🌐 ConnectionManager: Initializing WebSocket connection...');
        
        try {
            // Create WebSocket client
            this.wsClient = new WebSocketClient();
            
            // Set up status change callback
            this.wsClient.onStatusChange = (status) => {
                this.handleConnectionStatusChange(status);
            };
            
            // Set up basic message handlers (non-project events)
            this.setupBasicMessageHandlers();
            
            // Connect to backend
            await this.wsClient.connect(url);
            
            this.isConnected = true;
            console.log('🌐 ConnectionManager: WebSocket connected successfully');
            
            return this.wsClient;
            
        } catch (error) {
            console.error('❌ ConnectionManager: Failed to connect:', error);
            this.isConnected = false;
            
            this.eventBus.emit('connectionStatusChanged', { 
                status: 'Connection Failed' 
            });
            
            throw error;
        }
    }

    /**
     * Set up basic WebSocket message handlers (non-project events)
     */
    setupBasicMessageHandlers() {
        if (!this.wsClient) {
            console.error('❌ ConnectionManager: Cannot setup handlers - WebSocket not initialized');
            return;
        }

        console.log('🌐 ConnectionManager: Setting up basic message handlers...');

        // Handle pong responses (connection testing)
        this.wsClient.on('pong', (data) => {
            console.log('🏓 ConnectionManager: Connection test successful:', data);
            
            this.eventBus.emit('connectionTest', {
                success: true,
                data: data,
                timestamp: Date.now()
            });
            
            this.eventBus.emit('showNotification', {
                message: 'Connection test successful!',
                type: 'success'
            });
        });

        // Handle backend errors
        this.wsClient.on('error', (data) => {
            console.error('❌ ConnectionManager: Backend error:', data);
            
            this.eventBus.emit('backendError', {
                error: data,
                timestamp: Date.now()
            });
            
            this.eventBus.emit('showNotification', {
                message: `Backend Error: ${data.message || 'Unknown error'}`,
                type: 'error'
            });
        });

        console.log('🌐 ConnectionManager: Basic message handlers set up');
    }

    /**
     * Handle connection status changes
     */
    handleConnectionStatusChange(status) {
        console.log(`🌐 ConnectionManager: Status changed to '${status}'`);
        
        // Update internal connection state
        this.isConnected = (status === 'Connected');
        
        // Reset connection attempts on successful connection
        if (this.isConnected) {
            this.connectionAttempts = 0;
        }
        
        // Emit status change via EventBus
        this.eventBus.emit('connectionStatusChanged', { 
            status: status,
            isConnected: this.isConnected,
            timestamp: Date.now()
        });
        
        // Handle connection lost scenarios
        if (status.includes('Disconnect') || status.includes('Failed')) {
            this.handleConnectionLost(status);
        }
    }

    /**
     * Handle connection lost scenarios
     */
    handleConnectionLost(status) {
        console.warn(`🌐 ConnectionManager: Connection lost - ${status}`);
        
        this.isConnected = false;
        this.connectionAttempts++;
        
        // Emit connection lost event
        this.eventBus.emit('connectionLost', {
            reason: status,
            attempts: this.connectionAttempts,
            maxRetries: this.maxRetries,
            timestamp: Date.now()
        });
        
        // Attempt reconnection if under retry limit
        if (this.connectionAttempts < this.maxRetries) {
            console.log(`🌐 ConnectionManager: Will attempt reconnection (${this.connectionAttempts}/${this.maxRetries})`);
            
            this.eventBus.emit('showNotification', {
                message: `Connection lost. Attempting to reconnect (${this.connectionAttempts}/${this.maxRetries})...`,
                type: 'warning'
            });
        } else {
            console.error('🌐 ConnectionManager: Max reconnection attempts reached');
            
            this.eventBus.emit('showNotification', {
                message: 'Connection lost. Maximum reconnection attempts reached.',
                type: 'error'
            });
        }
    }

    /**
     * Test WebSocket connection
     */
    testConnection() {
        console.log('🌐 ConnectionManager: Testing connection...');
        
        if (!this.wsClient) {
            console.warn('🌐 ConnectionManager: Cannot test - WebSocket not initialized');
            
            this.eventBus.emit('showNotification', {
                message: 'Cannot test connection - WebSocket not initialized',
                type: 'warning'
            });
            return false;
        }
        
        if (!this.isConnected) {
            console.warn('🌐 ConnectionManager: Cannot test - WebSocket not connected');
            
            this.eventBus.emit('showNotification', {
                message: 'Cannot test connection - WebSocket not connected',
                type: 'warning'
            });
            return false;
        }
        
        try {
            // Send ping message
            this.wsClient.ping();
            console.log('🌐 ConnectionManager: Ping sent, waiting for pong...');
            
            this.eventBus.emit('connectionTestStarted', {
                timestamp: Date.now()
            });
            
            return true;
            
        } catch (error) {
            console.error('🌐 ConnectionManager: Connection test failed:', error);
            
            this.eventBus.emit('showNotification', {
                message: 'Connection test failed',
                type: 'error'
            });
            
            return false;
        }
    }

    /**
     * Disconnect from WebSocket server
     */
    disconnect() {
        console.log('🌐 ConnectionManager: Disconnecting...');
        
        if (this.wsClient) {
            this.wsClient.disconnect();
            this.wsClient = null;
        }
        
        this.isConnected = false;
        this.connectionAttempts = 0;
        
        this.eventBus.emit('connectionStatusChanged', { 
            status: 'Disconnected',
            isConnected: false,
            timestamp: Date.now()
        });
        
        console.log('🌐 ConnectionManager: Disconnected');
    }

    /**
     * Attempt manual reconnection
     */
    async reconnect() {
        console.log('🌐 ConnectionManager: Manual reconnection requested...');
        
        if (this.isConnected) {
            console.log('🌐 ConnectionManager: Already connected, skipping reconnection');
            return this.wsClient;
        }
        
        // Disconnect existing connection if any
        this.disconnect();
        
        // Reset retry counter for manual reconnection
        this.connectionAttempts = 0;
        
        try {
            return await this.connect();
        } catch (error) {
            console.error('🌐 ConnectionManager: Manual reconnection failed:', error);
            throw error;
        }
    }

    /**
     * Get WebSocket client instance for other managers
     */
    getWebSocketClient() {
        return this.wsClient;
    }

    /**
     * Get connection status information
     */
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            connectionAttempts: this.connectionAttempts,
            maxRetries: this.maxRetries,
            wsClient: this.wsClient ? 'initialized' : 'not initialized',
            status: this.wsClient ? this.wsClient.getStatus() : 'Not Connected'
        };
    }

    /**
     * Check if connection is healthy
     */
    isConnectionHealthy() {
        return this.isConnected && 
               this.wsClient && 
               this.wsClient.isConnected;
    }

    /**
     * Set connection retry configuration
     */
    setRetryConfig(maxRetries, retryDelay = 2000) {
        this.maxRetries = maxRetries;
        
        if (this.wsClient) {
            this.wsClient.maxRetries = maxRetries;
            this.wsClient.retryDelay = retryDelay;
        }
        
        console.log(`🌐 ConnectionManager: Retry config updated - maxRetries: ${maxRetries}, retryDelay: ${retryDelay}ms`);
    }

    /**
     * Get detailed connection information for debugging
     */
    getDebugInfo() {
        return {
            connectionManager: {
                isConnected: this.isConnected,
                connectionAttempts: this.connectionAttempts,
                maxRetries: this.maxRetries
            },
            webSocketClient: this.wsClient ? {
                status: this.wsClient.getStatus(),
                isConnected: this.wsClient.isConnected,
                connectionAttempts: this.wsClient.connectionAttempts,
                messageQueueLength: this.wsClient.messageQueue ? this.wsClient.messageQueue.length : 0
            } : null
        };
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConnectionManager;
}

// Make available globally for browser
if (typeof window !== 'undefined') {
    window.ConnectionManager = ConnectionManager;
}