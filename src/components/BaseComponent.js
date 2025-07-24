/**
 * BaseComponent - Common functionality for all UI panel components
 * Provides lifecycle management, EventBus integration, and DOM utilities
 * FIXED: EventBus race condition and duplicate script loading issues
 */

class BaseComponent {
    constructor(name, panelSelector, eventBus) {
        this.name = name;
        this.panelSelector = panelSelector;
        this.eventBus = eventBus;
        
        // Component state
        this.isInitialized = false;
        this.isMounted = false;
        this.isDestroyed = false;
        
        // DOM references
        this.panelElement = null;
        this.contentElement = null;
        
        // Behaviour reference
        this.behaviour = null;
        
        // Event subscriptions for cleanup
        this.eventSubscriptions = [];
        
        console.log(`🧩 BaseComponent: ${this.name} created`);
    }

    /**
     * Initialize component - load template, styles, and behaviour
     */
    async initialize() {
        if (this.isInitialized) {
            console.warn(`⚠️ ${this.name}: Already initialized`);
            return;
        }

        try {
            console.log(`🔄 ${this.name}: Initializing...`);
            
            // Find panel in DOM
            this.panelElement = document.querySelector(this.panelSelector);
            if (!this.panelElement) {
                throw new Error(`Panel not found: ${this.panelSelector}`);
            }

            // Find content area within panel
            this.contentElement = this.panelElement.querySelector('.panel-content');
            if (!this.contentElement) {
                throw new Error(`Panel content area not found in ${this.panelSelector}`);
            }

            // Load component files
            await this.loadTemplate();
            await this.loadStyles();
            await this.loadBehaviour();
            
            this.isInitialized = true;
            console.log(`✅ ${this.name}: Initialized successfully`);
            
        } catch (error) {
            console.error(`❌ ${this.name}: Initialization failed:`, error);
            throw error;
        }
    }

    /**
     * Mount component to DOM panel
     */
    async mount() {
        if (!this.isInitialized) {
            throw new Error(`${this.name}: Must initialize before mounting`);
        }
        
        if (this.isMounted) {
            console.warn(`⚠️ ${this.name}: Already mounted`);
            return;
        }

        try {
            console.log(`🔗 ${this.name}: Mounting...`);
            
            // FIXED: Ensure EventBus is available before initializing behaviour
            await this.waitForEventBus();
            
            // Initialize behaviour if loaded
            if (this.behaviour) {
                this.behaviour.init();
            }
            
            // Set up EventBus subscriptions
            this.subscribeToEvents();
            
            // Call component-specific mount logic
            await this.onMounted();
            
            this.isMounted = true;
            console.log(`✅ ${this.name}: Mounted successfully`);
            
        } catch (error) {
            console.error(`❌ ${this.name}: Mount failed:`, error);
            throw error;
        }
    }

    /**
     * Wait for global EventBus to be available
     */
    async waitForEventBus() {
        const maxWait = 50; // 5 seconds max
        for (let i = 0; i < maxWait; i++) {
            if (window.EventBus && typeof window.EventBus.on === 'function') {
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.warn(`⚠️ ${this.name}: EventBus not available after waiting - behaviour may fail`);
    }

    /**
     * Unmount component from DOM
     */
    unmount() {
        if (!this.isMounted) {
            console.warn(`⚠️ ${this.name}: Not mounted`);
            return;
        }

        console.log(`🔌 ${this.name}: Unmounting...`);
        
        // Call component-specific unmount logic
        this.onUnmounted();
        
        // Destroy behaviour
        if (this.behaviour && typeof this.behaviour.destroy === 'function') {
            this.behaviour.destroy();
            this.behaviour = null;
        }
        
        // Clean up EventBus subscriptions
        this.unsubscribeFromEvents();
        
        this.isMounted = false;
        console.log(`✅ ${this.name}: Unmounted successfully`);
    }

    /**
     * Destroy component and clean up all resources
     */
    destroy() {
        if (this.isDestroyed) {
            console.warn(`⚠️ ${this.name}: Already destroyed`);
            return;
        }

        console.log(`💀 ${this.name}: Destroying...`);
        
        // Unmount if still mounted
        if (this.isMounted) {
            this.unmount();
        }
        
        // Clear content
        if (this.contentElement) {
            this.contentElement.innerHTML = '';
        }
        
        // Clear references
        this.panelElement = null;
        this.contentElement = null;
        this.behaviour = null;
        
        this.isDestroyed = true;
        console.log(`✅ ${this.name}: Destroyed successfully`);
    }

    /**
     * Load component HTML template with multiple path strategies
     */
    async loadTemplate() {
        // Convert "HierarchyPanel" to "hierarchy-template.html"
        const componentName = this.name.toLowerCase().replace('panel', '');
        
        // Multiple path strategies to try
        const pathStrategies = [
            `src/components/${this.name}/${componentName}-template.html`,
            `components/${this.name}/${componentName}-template.html`,
            `./${componentName}-template.html`,
            `./src/components/${this.name}/${componentName}-template.html`
        ];
        
        console.log(`🔍 ${this.name}: Loading template...`);
        
        for (let i = 0; i < pathStrategies.length; i++) {
            const templatePath = pathStrategies[i];
            
            try {
                console.log(`🔍 ${this.name}: Trying path ${i + 1}/${pathStrategies.length}: ${templatePath}`);
                
                const response = await fetch(templatePath);
                
                if (response.ok) {
                    const templateHtml = await response.text();
                    this.contentElement.innerHTML = templateHtml;
                    console.log(`📄 ${this.name}: Template loaded successfully from: ${templatePath}`);
                    return;
                }
                
            } catch (error) {
                console.log(`🔍 ${this.name}: Path ${i + 1} failed:`, error.message);
            }
        }
        
        // All paths failed - create fallback content
        console.error(`❌ ${this.name}: All template paths failed`);
        this.contentElement.innerHTML = `
            <div class="component-error" style="padding: 20px; text-align: center; color: #888;">
                <p style="color: #ccc; margin-bottom: 10px;">${this.name} template not found</p>
                <small style="display: block; margin: 5px 0;">Tried paths:</small>
                ${pathStrategies.map(path => `<small style="display: block; font-family: monospace;">${path}</small>`).join('')}
            </div>
        `;
    }

    /**
     * Load component CSS styles with multiple path strategies
     */
    async loadStyles() {
        const styleId = `${this.name.toLowerCase()}-styles`;
        
        // Check if styles already loaded
        if (document.getElementById(styleId)) {
            console.log(`🎨 ${this.name}: Styles already loaded`);
            return;
        }
        
        // Convert "HierarchyPanel" to "hierarchy-style.css"
        const componentName = this.name.toLowerCase().replace('panel', '');
        
        // Multiple path strategies to try
        const pathStrategies = [
            `src/components/${this.name}/${componentName}-style.css`,
            `components/${this.name}/${componentName}-style.css`,
            `./${componentName}-style.css`,
            `./src/components/${this.name}/${componentName}-style.css`
        ];
        
        console.log(`🔍 ${this.name}: Loading styles...`);
        
        for (let i = 0; i < pathStrategies.length; i++) {
            const stylesPath = pathStrategies[i];
            
            try {
                console.log(`🔍 ${this.name}: Trying style path ${i + 1}/${pathStrategies.length}: ${stylesPath}`);
                
                const response = await fetch(stylesPath);
                
                if (response.ok) {
                    const stylesCss = await response.text();
                    
                    // Create and append style element
                    const styleElement = document.createElement('style');
                    styleElement.id = styleId;
                    styleElement.textContent = stylesCss;
                    document.head.appendChild(styleElement);
                    
                    console.log(`🎨 ${this.name}: Styles loaded successfully from: ${stylesPath}`);
                    return;
                }
                
            } catch (error) {
                console.log(`🔍 ${this.name}: Style path ${i + 1} failed:`, error.message);
            }
        }
        
        // All paths failed - non-critical error
        console.warn(`⚠️ ${this.name}: All style paths failed - component will work without custom styles`);
    }

    /**
     * Load component behaviour with smart duplicate detection
     */
    async loadBehaviour() {
        const componentName = this.name.toLowerCase().replace('panel', '');
        const behaviourClassName = `${this.name}Behaviour`;
        
        // Check if behaviour class already exists
        if (window[behaviourClassName]) {
            console.log(`🔧 ${this.name}: Behaviour class already exists, creating instance`);
            this.behaviour = new window[behaviourClassName]();
            return;
        }
        
        // Check if script is already loaded/loading to avoid duplicates
        const existingScript = document.querySelector(`script[src*="${componentName}-behaviour.js"]`);
        if (existingScript) {
            console.log(`🔧 ${this.name}: Behaviour script already loaded, waiting for class...`);
            
            // Wait for class to become available
            const maxWait = 50; // 5 seconds max
            for (let i = 0; i < maxWait; i++) {
                await new Promise(resolve => setTimeout(resolve, 100));
                if (window[behaviourClassName]) {
                    this.behaviour = new window[behaviourClassName]();
                    console.log(`✅ ${this.name}: Behaviour instance created from existing script`);
                    return;
                }
            }
            
            console.warn(`⚠️ ${this.name}: Behaviour class not available after waiting`);
            return;
        }
        
        // Multiple path strategies to try
        const pathStrategies = [
            `src/components/${this.name}/${componentName}-behaviour.js`,
            `components/${this.name}/${componentName}-behaviour.js`,
            `./${componentName}-behaviour.js`,
            `./src/components/${this.name}/${componentName}-behaviour.js`
        ];
        
        console.log(`🔍 ${this.name}: Loading behaviour...`);
        
        for (let i = 0; i < pathStrategies.length; i++) {
            const behaviourPath = pathStrategies[i];
            
            try {
                console.log(`🔍 ${this.name}: Trying behaviour path ${i + 1}/${pathStrategies.length}: ${behaviourPath}`);
                
                // Create script element to load behaviour
                const script = document.createElement('script');
                script.src = behaviourPath;
                
                // Wait for script to load
                await new Promise((resolve, reject) => {
                    script.onload = () => {
                        console.log(`🔧 ${this.name}: Behaviour script loaded from: ${behaviourPath}`);
                        resolve();
                    };
                    script.onerror = () => {
                        reject(new Error(`Failed to load script: ${behaviourPath}`));
                    };
                    
                    // Add to DOM
                    document.head.appendChild(script);
                });
                
                // Check if behaviour class is now available
                if (window[behaviourClassName]) {
                    this.behaviour = new window[behaviourClassName]();
                    console.log(`✅ ${this.name}: Behaviour instance created`);
                    return;
                }
                
            } catch (error) {
                console.log(`🔍 ${this.name}: Behaviour path ${i + 1} failed:`, error.message);
                // Remove failed script element
                const failedScript = document.querySelector(`script[src="${behaviourPath}"]`);
                if (failedScript) {
                    document.head.removeChild(failedScript);
                }
            }
        }
        
        // All paths failed - non-critical error (some components might not have behaviour)
        console.warn(`⚠️ ${this.name}: All behaviour paths failed - component will work without behaviour`);
    }

    /**
     * Subscribe to EventBus events
     */
    subscribeToEvents() {
        const subscriptions = this.getEventSubscriptions();
        
        subscriptions.forEach(({ event, handler }) => {
            if (window.EventBus && typeof window.EventBus.on === 'function') {
                const listenerId = window.EventBus.on(event, handler, this);
                this.eventSubscriptions.push({ event, handler, listenerId });
            } else {
                console.warn(`⚠️ ${this.name}: EventBus not available for subscription to '${event}'`);
            }
        });
        
        console.log(`📡 ${this.name}: Subscribed to ${subscriptions.length} events`);
    }

    /**
     * Unsubscribe from all EventBus events
     */
    unsubscribeFromEvents() {
        this.eventSubscriptions.forEach(({ event, listenerId }) => {
            if (window.EventBus && typeof window.EventBus.off === 'function') {
                window.EventBus.off(event, listenerId);
            }
        });
        
        this.eventSubscriptions = [];
        console.log(`📡 ${this.name}: Unsubscribed from all events`);
    }

    /**
     * Update component with new data
     * @param {object} data - Data to update component with
     */
    update(data) {
        if (!this.isMounted) {
            console.warn(`⚠️ ${this.name}: Cannot update unmounted component`);
            return;
        }
        
        // Delegate to behaviour if it has an update method
        if (this.behaviour && typeof this.behaviour.update === 'function') {
            this.behaviour.update(data);
            return;
        }
        
        // Call component-specific update logic
        this.onUpdate(data);
    }

    /**
     * Show component panel
     */
    show() {
        if (this.panelElement) {
            this.panelElement.style.display = '';
            console.log(`👁️ ${this.name}: Shown`);
        }
    }

    /**
     * Hide component panel
     */
    hide() {
        if (this.panelElement) {
            this.panelElement.style.display = 'none';
            console.log(`🙈 ${this.name}: Hidden`);
        }
    }

    // ========================================
    // OVERRIDE METHODS - Child classes implement these
    // ========================================

    /**
     * Component-specific mount logic
     * Override in child classes
     */
    async onMounted() {
        // Default implementation - override in child components
        console.log(`🔧 ${this.name}: Default onMounted called`);
    }

    /**
     * Component-specific unmount logic
     * Override in child classes
     */
    onUnmounted() {
        // Default implementation - override in child components
        console.log(`🔧 ${this.name}: Default onUnmounted called`);
    }

    /**
     * Component-specific update logic
     * Override in child classes
     * @param {object} data - New data for component
     */
    onUpdate(data) {
        // Default implementation - override in child components
        console.log(`🔧 ${this.name}: Default onUpdate called with:`, data);
    }

    /**
     * Define EventBus subscriptions for this component
     * Override in child classes
     * @returns {Array} Array of {event, handler} objects
     */
    getEventSubscriptions() {
        // Default implementation - override in child components
        return [];
    }

    // ========================================
    // UTILITY METHODS
    // ========================================

    /**
     * Find element within component content
     * @param {string} selector - CSS selector
     * @returns {Element|null} Found element or null
     */
    findElement(selector) {
        if (!this.contentElement) return null;
        return this.contentElement.querySelector(selector);
    }

    /**
     * Find all elements within component content
     * @param {string} selector - CSS selector  
     * @returns {NodeList} Found elements
     */
    findElements(selector) {
        if (!this.contentElement) return [];
        return this.contentElement.querySelectorAll(selector);
    }

    /**
     * Add event listener to element within component
     * @param {string} selector - CSS selector
     * @param {string} event - Event name
     * @param {function} handler - Event handler
     */
    addEventListener(selector, event, handler) {
        const element = this.findElement(selector);
        if (element) {
            element.addEventListener(event, handler);
        } else {
            console.warn(`⚠️ ${this.name}: Element not found for listener: ${selector}`);
        }
    }

    /**
     * Get component state summary
     * @returns {object} Component state
     */
    getState() {
        return {
            name: this.name,
            panelSelector: this.panelSelector,
            isInitialized: this.isInitialized,
            isMounted: this.isMounted,
            isDestroyed: this.isDestroyed,
            hasBehaviour: this.behaviour !== null,
            eventSubscriptions: this.eventSubscriptions.length
        };
    }

    /**
     * Test component with mock data
     */
    test() {
        console.log(`🧪 ${this.name}: Running component test...`);
        
        // Test update with mock data
        this.update({
            test: true,
            timestamp: Date.now(),
            componentName: this.name
        });
        
        console.log(`✅ ${this.name}: Test completed`);
    }
}

// Export for use in other modules
window.BaseComponent = BaseComponent;

console.log('🧩 BaseComponent class loaded and available globally');