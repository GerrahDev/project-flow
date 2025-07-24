/**
 * PropertiesPanel Component Behaviour
 * Handles object property editing UI and delegates updates to ObjectManager
 * FIXED: Wait for EventBus before trying to use it
 */

class PropertiesPanelBehaviour {
    constructor() {
        console.log('🔧 PropertiesPanel behaviour created');
        
        this.selectedObject = null;
        this.isUpdating = false; // Prevent feedback loops
        
        // UI elements
        this.noSelectionEl = null;
        this.propertiesEditorEl = null;
        this.inputs = {};
        this.sliderValues = {};
        
        // Managers (will be set after EventBus is available)
        this.objectManager = null;
        this.eventBus = null;
    }

    /**
     * Initialize the component behaviour
     */
    async init() {
        console.log('🔧 PropertiesPanel behaviour initializing...');
        
        // Wait for EventBus to be available
        await this.waitForEventBus();
        
        // Set up managers
        this.eventBus = window.EventBus;
        this.objectManager = window.objectManager; // May be undefined, that's OK
        
        // Get UI elements
        this.setupElementReferences();
        
        // Cache input elements
        this.cacheInputElements();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Set initial state
        this.showNoSelection();
        
        console.log('✅ PropertiesPanel behaviour initialized');
    }

    /**
     * Wait for EventBus to be available
     */
    async waitForEventBus() {
        const maxWait = 50; // 5 seconds max
        for (let i = 0; i < maxWait; i++) {
            if (window.EventBus && typeof window.EventBus.on === 'function') {
                console.log('✅ PropertiesPanel: EventBus found');
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        throw new Error('PropertiesPanel: EventBus not available after waiting');
    }

    /**
     * Get references to UI elements
     */
    setupElementReferences() {
        // Main content areas
        this.noSelectionEl = document.querySelector('.no-selection');
        this.propertiesEditorEl = document.querySelector('.properties-editor');
        
        // Log what we found
        const elementsFound = [
            this.noSelectionEl ? 'no-selection' : null,
            this.propertiesEditorEl ? 'properties-editor' : null
        ].filter(Boolean);
        
        console.log(`🔧 PropertiesPanel: Found UI elements: ${elementsFound.join(', ')}`);
    }

    /**
     * Cache all input elements for efficient access
     */
    cacheInputElements() {
        this.inputs = {
            name: document.getElementById('prop-name'),
            visible: document.getElementById('prop-visible'),
            zorder: document.getElementById('prop-zorder'),
            posX: document.getElementById('prop-pos-x'),
            posY: document.getElementById('prop-pos-y'),
            scaleX: document.getElementById('prop-scale-x'),
            scaleY: document.getElementById('prop-scale-y'),
            rotation: document.getElementById('prop-rotation'),
            opacity: document.getElementById('prop-opacity')
        };

        // Cache slider value displays
        this.sliderValues = {
            scaleX: this.inputs.scaleX?.parentElement.querySelector('.slider-value'),
            scaleY: this.inputs.scaleY?.parentElement.querySelector('.slider-value'),
            rotation: this.inputs.rotation?.parentElement.querySelector('.slider-value'),
            opacity: this.inputs.opacity?.parentElement.querySelector('.slider-value')
        };

        // Log which inputs were found
        const inputsFound = Object.entries(this.inputs)
            .filter(([key, element]) => element)
            .map(([key]) => key);
        
        console.log(`🔧 PropertiesPanel: Found ${inputsFound.length}/${Object.keys(this.inputs).length} input elements: ${inputsFound.join(', ')}`);
    }

    /**
     * Set up all event listeners - FIXED
     */
    setupEventListeners() {
        if (!this.eventBus) {
            console.error('❌ PropertiesPanel: EventBus not available for event listeners');
            return;
        }

        // EventBus listeners
        this.eventBus.on('objectSelected', (data) => this.handleObjectSelected(data));
        this.eventBus.on('selectionCleared', () => this.handleObjectDeselected());
        this.eventBus.on('objectUpdated', (data) => this.handleObjectUpdated(data));
        this.eventBus.on('objectDeleted', (data) => this.handleObjectDeleted(data));

        // Input event listeners
        this.setupInputListeners();
        this.setupSliderListeners();
        
        console.log('🔧 PropertiesPanel: Event listeners set up');
    }

    /**
     * Update properties with new data (called by BaseComponent)
     */
    update(data) {
        console.log('🔧 PropertiesPanel: Updating with data', data);
        
        if (!data) return;
        
        // Handle object selection updates
        if (data.objects && data.objects.length === 1) {
            this.selectedObject = data.objects[0];
            this.showObjectProperties(this.selectedObject);
        } else if (data.objects && data.objects.length > 1) {
            this.showMultipleSelection(data.objects);
        } else {
            this.showNoSelection();
        }
        
        console.log('✅ PropertiesPanel: Updated successfully');
    }

    /**
     * Set up input field event listeners
     */
    setupInputListeners() {
        // Name input
        this.inputs.name?.addEventListener('input', (e) => {
            this.updateObjectProperty('name', e.target.value);
        });

        // Visibility checkbox
        this.inputs.visible?.addEventListener('change', (e) => {
            this.updateObjectProperty('isVisible', e.target.checked);
        });

        // Z-Order input
        this.inputs.zorder?.addEventListener('input', (e) => {
            const value = parseInt(e.target.value) || 0;
            this.updateObjectProperty('zOrder', value);
        });

        // Position inputs
        this.inputs.posX?.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value) || 0;
            this.updateTransformProperty('position', 'x', value);
        });

        this.inputs.posY?.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value) || 0;
            this.updateTransformProperty('position', 'y', value);
        });
    }

    /**
     * Set up slider event listeners with real-time value updates
     */
    setupSliderListeners() {
        // Scale X slider
        this.inputs.scaleX?.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.updateSliderDisplay('scaleX', value.toFixed(2));
            this.updateTransformProperty('scale', 'x', value);
        });

        // Scale Y slider
        this.inputs.scaleY?.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.updateSliderDisplay('scaleY', value.toFixed(2));
            this.updateTransformProperty('scale', 'y', value);
        });

        // Rotation slider
        this.inputs.rotation?.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.updateSliderDisplay('rotation', `${value}°`);
            this.updateTransformProperty('rotation', null, value);
        });

        // Opacity slider
        this.inputs.opacity?.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            const percentage = Math.round(value * 100);
            this.updateSliderDisplay('opacity', `${percentage}%`);
            this.updateTransformProperty('opacity', null, value);
        });
    }

    /**
     * Update slider value display
     */
    updateSliderDisplay(sliderName, displayValue) {
        if (this.sliderValues[sliderName]) {
            this.sliderValues[sliderName].textContent = displayValue;
        }
    }

    /**
     * Handle object selection from EventBus
     */
    handleObjectSelected(data) {
        console.log('🔧 PropertiesPanel: Object selected', data);
        
        if (data.objects && data.objects.length === 1) {
            // Single object selection
            this.selectedObject = data.objects[0];
            this.showObjectProperties(this.selectedObject);
        } else if (data.objects && data.objects.length > 1) {
            // Multiple object selection
            this.showMultipleSelection(data.objects);
        } else {
            this.showNoSelection();
        }
    }

    /**
     * Handle object deselection
     */
    handleObjectDeselected() {
        console.log('🔧 PropertiesPanel: Object deselected');
        this.selectedObject = null;
        this.showNoSelection();
    }

    /**
     * Handle object updates from other sources
     */
    handleObjectUpdated(data) {
        if (this.isUpdating || !this.selectedObject) return;
        
        // If the updated object is our selected object, refresh the display
        if (data.objectId === this.selectedObject.id) {
            console.log('🔧 PropertiesPanel: Refreshing selected object properties');
            this.refreshObjectProperties(data.object);
        }
    }

    /**
     * Handle object deletion
     */
    handleObjectDeleted(data) {
        if (this.selectedObject && data.objectId === this.selectedObject.id) {
            console.log('🔧 PropertiesPanel: Selected object was deleted');
            this.showNoSelection();
        }
    }

    /**
     * Show no selection state
     */
    showNoSelection() {
        if (this.noSelectionEl) this.noSelectionEl.style.display = 'flex';
        if (this.propertiesEditorEl) this.propertiesEditorEl.style.display = 'none';
        
        console.log('🔧 PropertiesPanel: Showing no selection state');
    }

    /**
     * Show properties for a single selected object
     */
    showObjectProperties(object) {
        if (this.noSelectionEl) this.noSelectionEl.style.display = 'none';
        if (this.propertiesEditorEl) this.propertiesEditorEl.style.display = 'block';
        
        this.populateObjectProperties(object);
        
        console.log('🔧 PropertiesPanel: Showing properties for object:', object.id);
    }

    /**
     * Show multiple selection state (future feature)
     */
    showMultipleSelection(objects) {
        // For now, just show no selection
        // Future: Show multi-edit controls
        this.showNoSelection();
        
        console.log(`🔧 PropertiesPanel: Multiple selection (${objects.length} objects) - showing no selection for now`);
    }

    /**
     * Populate input fields with object properties
     */
    populateObjectProperties(object) {
        this.isUpdating = true;
        
        try {
            // Object properties
            if (this.inputs.name) this.inputs.name.value = object.name || '';
            if (this.inputs.visible) this.inputs.visible.checked = object.isVisible !== false;
            if (this.inputs.zorder) this.inputs.zorder.value = object.zOrder || 1;

            // Transform properties
            const transform = object.transform || {};
            const position = transform.position || { x: 0, y: 0 };
            const scale = transform.scale || { x: 1, y: 1 };
            const rotation = transform.rotation || 0;
            const opacity = transform.opacity !== undefined ? transform.opacity : 1;

            // Position
            if (this.inputs.posX) this.inputs.posX.value = position.x;
            if (this.inputs.posY) this.inputs.posY.value = position.y;

            // Scale
            if (this.inputs.scaleX) {
                this.inputs.scaleX.value = scale.x;
                this.updateSliderDisplay('scaleX', scale.x.toFixed(2));
            }
            if (this.inputs.scaleY) {
                this.inputs.scaleY.value = scale.y;
                this.updateSliderDisplay('scaleY', scale.y.toFixed(2));
            }

            // Rotation
            if (this.inputs.rotation) {
                this.inputs.rotation.value = rotation;
                this.updateSliderDisplay('rotation', `${rotation}°`);
            }

            // Opacity
            if (this.inputs.opacity) {
                this.inputs.opacity.value = opacity;
                this.updateSliderDisplay('opacity', `${Math.round(opacity * 100)}%`);
            }

            console.log('🔧 PropertiesPanel: Properties populated for object:', object.name);

        } catch (error) {
            console.error('❌ PropertiesPanel: Error populating properties:', error);
        } finally {
            this.isUpdating = false;
        }
    }

    /**
     * Refresh object properties (from external update)
     */
    refreshObjectProperties(object) {
        this.selectedObject = object;
        this.populateObjectProperties(object);
    }

    /**
     * Update object property via ObjectManager or EventBus
     */
    updateObjectProperty(property, value) {
        if (!this.selectedObject || this.isUpdating) return;

        console.log(`🔧 PropertiesPanel: Updating ${property} = ${value}`);
        
        // Try ObjectManager first, fallback to EventBus
        if (this.objectManager && typeof this.objectManager.updateObject === 'function') {
            this.objectManager.updateObject(this.selectedObject.id, {
                [property]: value
            });
        } else if (this.eventBus) {
            // Emit update request via EventBus
            this.eventBus.emit('updateObjectRequested', {
                objectId: this.selectedObject.id,
                updates: { [property]: value }
            });
        } else {
            console.warn('⚠️ PropertiesPanel: No ObjectManager or EventBus available for updates');
        }
    }

    /**
     * Update transform property via ObjectManager or EventBus
     */
    updateTransformProperty(category, subProperty, value) {
        if (!this.selectedObject || this.isUpdating) return;

        const transform = { ...this.selectedObject.transform } || {};
        
        if (subProperty) {
            // Position/Scale with x/y
            transform[category] = { ...transform[category] };
            transform[category][subProperty] = value;
        } else {
            // Rotation/Opacity direct values
            transform[category] = value;
        }

        console.log(`🔧 PropertiesPanel: Updating transform.${category}${subProperty ? `.${subProperty}` : ''} = ${value}`);

        // Try ObjectManager first, fallback to EventBus
        if (this.objectManager && typeof this.objectManager.updateObject === 'function') {
            this.objectManager.updateObject(this.selectedObject.id, {
                transform: transform
            });
        } else if (this.eventBus) {
            // Emit update request via EventBus
            this.eventBus.emit('updateObjectRequested', {
                objectId: this.selectedObject.id,
                updates: { transform: transform }
            });
        } else {
            console.warn('⚠️ PropertiesPanel: No ObjectManager or EventBus available for updates');
        }
    }

    /**
     * Test properties panel with mock data
     */
    test() {
        console.log('🧪 PropertiesPanel: Running test...');
        
        const mockObject = {
            id: 'test-properties-object',
            name: 'Test Object',
            type: 'Rectangle',
            isVisible: true,
            zOrder: 5,
            transform: {
                position: { x: 100, y: 150 },
                scale: { x: 1.2, y: 0.8 },
                rotation: 45,
                opacity: 0.75
            }
        };
        
        this.selectedObject = mockObject;
        this.showObjectProperties(mockObject);
        
        console.log('✅ PropertiesPanel: Test completed');
    }

    /**
     * Component cleanup
     */
    destroy() {
        if (this.eventBus) {
            // Remove EventBus listeners (simplified - EventBus should handle this automatically)
            console.log('🔧 PropertiesPanel: Cleaning up EventBus listeners');
        }
        
        // Clear references
        this.selectedObject = null;
        this.eventBus = null;
        this.objectManager = null;
        
        console.log('🔧 PropertiesPanel behaviour destroyed');
    }
}

// Export class to global window for BaseComponent integration
window.PropertiesPanelBehaviour = PropertiesPanelBehaviour;

console.log('🔧 PropertiesPanel behaviour loaded');
console.log('✅ PropertiesPanelBehaviour exposed to window object');