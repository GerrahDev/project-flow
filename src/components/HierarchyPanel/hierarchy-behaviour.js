/**
 * HierarchyPanel Behaviour - Complete hierarchy management with object tree
 * FIXED: Wait for EventBus before trying to use it
 */

class HierarchyPanelBehaviour {
    constructor() {
        console.log('🌳 HierarchyPanel behaviour created');
        
        // Core state
        this.objects = [];
        this.selectedObjects = new Set();
        this.expandedObjects = new Set();
        this.draggedObject = null;
        
        // UI element references
        this.elements = {};
        
        // Context menu state
        this.contextMenu = null;
        this.contextTarget = null;
    }

    /**
     * Initialize the hierarchy panel behaviour
     */
    async init() {
        console.log('🌳 HierarchyPanel behaviour initializing...');
        
        // Wait for EventBus to be available
        await this.waitForEventBus();
        
        // Get UI element references
        this.setupElementReferences();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Set up EventBus subscriptions
        this.setupEventSubscriptions();
        
        // Initialize UI
        this.renderHierarchy();
        
        console.log('✅ HierarchyPanel behaviour initialized');
    }

    /**
     * Wait for EventBus to be available
     */
    async waitForEventBus() {
        const maxWait = 50; // 5 seconds max
        for (let i = 0; i < maxWait; i++) {
            if (window.EventBus && typeof window.EventBus.on === 'function') {
                console.log('✅ HierarchyPanel: EventBus found');
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        throw new Error('HierarchyPanel: EventBus not available after waiting');
    }

    /**
     * Set up EventBus subscriptions - FIXED
     */
    setupEventSubscriptions() {
        if (!window.EventBus) {
            console.error('❌ HierarchyPanel: EventBus not available for subscriptions');
            return;
        }

        // Listen for object events
        window.EventBus.on('objectCreated', (data) => this.handleObjectCreated(data));
        window.EventBus.on('objectDeleted', (data) => this.handleObjectDeleted(data));
        window.EventBus.on('objectUpdated', (data) => this.handleObjectUpdated(data));
        window.EventBus.on('selectionChanged', (data) => this.handleSelectionChanged(data));
        
        // Listen for project events
        window.EventBus.on('projectLoaded', (data) => this.handleProjectLoaded(data));
        window.EventBus.on('projectClosed', () => this.handleProjectClosed());
        
        console.log('🌳 HierarchyPanel: EventBus subscriptions set up');
    }

    /**
     * Update hierarchy with new data (called by BaseComponent)
     */
    update(data) {
        console.log('🌳 HierarchyPanel: Updating with data', data);
        
        if (!data) return;
        
        // Update objects array
        if (data.objects) {
            this.objects = Array.isArray(data.objects) ? data.objects : [];
            this.renderHierarchy();
        }
        
        // Update selection if provided
        if (data.selectedObjects) {
            this.selectedObjects = new Set(data.selectedObjects);
            this.updateSelectionUI();
        }
        
        console.log('✅ HierarchyPanel: Updated successfully');
    }

    /**
     * Get references to UI elements
     */
    setupElementReferences() {
        // Main hierarchy tree container
        this.elements.hierarchyTree = document.getElementById('hierarchy-tree');
        this.elements.objectCount = document.getElementById('object-count');
        this.elements.searchBox = document.getElementById('hierarchy-search');
        this.elements.hierarchyActions = document.getElementById('hierarchy-actions');
        
        // Context menu
        this.elements.contextMenu = document.getElementById('hierarchy-context-menu');
        
        // Log which elements were found/missing
        let foundElements = 0;
        let totalElements = 0;
        Object.entries(this.elements).forEach(([key, element]) => {
            totalElements++;
            if (element) {
                foundElements++;
            } else {
                console.warn(`🌳 HierarchyPanel: Missing element: ${key}`);
            }
        });
        
        console.log(`🌳 HierarchyPanel: Found ${foundElements}/${totalElements} UI elements`);
    }

    /**
     * Set up event listeners for hierarchy interactions
     */
    setupEventListeners() {
        // Hierarchy tree interactions
        if (this.elements.hierarchyTree) {
            // Object selection (single click)
            this.elements.hierarchyTree.addEventListener('click', (e) => {
                this.handleObjectClick(e);
            });
            
            // Context menu (right click)
            this.elements.hierarchyTree.addEventListener('contextmenu', (e) => {
                this.handleContextMenu(e);
            });
            
            // Drag and drop for hierarchy reorganization
            this.elements.hierarchyTree.addEventListener('dragstart', (e) => {
                this.handleDragStart(e);
            });
            
            this.elements.hierarchyTree.addEventListener('dragover', (e) => {
                this.handleDragOver(e);
            });
            
            this.elements.hierarchyTree.addEventListener('drop', (e) => {
                this.handleDrop(e);
            });
        }

        // Search functionality
        if (this.elements.searchBox) {
            this.elements.searchBox.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }

        // Global click to close context menu
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#hierarchy-context-menu')) {
                this.hideContextMenu();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.closest('#hierarchy-panel')) {
                this.handleKeyDown(e);
            }
        });
        
        console.log('🌳 HierarchyPanel: Event listeners set up');
    }

    // =================================================================
    // HIERARCHY RENDERING
    // =================================================================

    /**
     * Render the complete hierarchy tree
     */
    renderHierarchy() {
        if (!this.elements.hierarchyTree) {
            console.warn('🌳 HierarchyPanel: Cannot render - hierarchy tree element not found');
            return;
        }

        console.log('🌳 HierarchyPanel: Rendering hierarchy...');
        
        // Clear existing content
        this.elements.hierarchyTree.innerHTML = '';
        
        if (this.objects.length === 0) {
            this.renderEmptyState();
            return;
        }
        
        // Get root objects (no parent)
        const rootObjects = this.objects.filter(obj => !obj.parentId);
        
        // Render each root object and its children
        rootObjects.forEach(obj => {
            const objectElement = this.renderObject(obj);
            this.elements.hierarchyTree.appendChild(objectElement);
        });
        
        // Update object count
        this.updateObjectCount();
        
        console.log(`🌳 HierarchyPanel: Rendered ${this.objects.length} objects`);
    }

    /**
     * Render empty state when no objects exist
     */
    renderEmptyState() {
        this.elements.hierarchyTree.innerHTML = `
            <div class="hierarchy-empty-state">
                <div class="empty-icon">📦</div>
                <p>No objects in scene</p>
                <small>Right-click to create objects</small>
            </div>
        `;
    }

    /**
     * Render a single object in the hierarchy
     */
    renderObject(obj, level = 0) {
        const template = document.getElementById('hierarchy-object-template');
        if (!template) {
            // Create fallback element if template missing
            const element = document.createElement('div');
            element.className = 'hierarchy-object-fallback';
            element.style.cssText = `
                padding: 2px 4px; 
                margin-left: ${level * 16}px; 
                cursor: pointer; 
                user-select: none;
                display: flex;
                align-items: center;
                gap: 4px;
                font-size: 11px;
                color: #ccc;
            `;
            
            const icon = this.getObjectIcon(obj.type);
            const visibility = obj.isVisible ? '👁️' : '🙈';
            
            element.innerHTML = `
                <span style="width: 12px;">${icon}</span>
                <span style="flex: 1;">${obj.name || 'Unnamed'}</span>
                <span style="opacity: 0.6;">${visibility}</span>
            `;
            
            element.setAttribute('data-object-id', obj.id);
            element.setAttribute('data-object-type', obj.type);
            element.draggable = true;
            
            return element;
        }

        // Use template if available
        const objectElement = template.content.cloneNode(true);
        const container = objectElement.querySelector('.hierarchy-object');
        
        // Set object data
        container.setAttribute('data-object-id', obj.id);
        container.setAttribute('data-object-type', obj.type);
        container.draggable = true;
        
        // Set indentation for nested objects
        container.style.marginLeft = `${level * 16}px`;
        
        // Set object icon
        const iconElement = container.querySelector('.object-icon');
        if (iconElement) {
            iconElement.textContent = this.getObjectIcon(obj.type);
        }
        
        // Set object name
        const nameElement = container.querySelector('.object-name');
        if (nameElement) {
            nameElement.textContent = obj.name || 'Unnamed Object';
        }
        
        // Set visibility toggle
        const visibilityElement = container.querySelector('.visibility-toggle');
        if (visibilityElement) {
            visibilityElement.textContent = obj.isVisible ? '👁️' : '🙈';
            visibilityElement.title = obj.isVisible ? 'Hide object' : 'Show object';
        }
        
        // Add expand/collapse button if object has children
        const hasChildren = this.getChildObjects(obj.id).length > 0;
        const expandElement = container.querySelector('.expand-toggle');
        if (expandElement) {
            if (hasChildren) {
                expandElement.style.display = 'block';
                expandElement.textContent = this.expandedObjects.has(obj.id) ? '▼' : '▶';
            } else {
                expandElement.style.display = 'none';
            }
        }
        
        // Apply selection styling
        if (this.selectedObjects.has(obj.id)) {
            container.classList.add('selected');
        }
        
        // Create wrapper for object and its children
        const wrapper = document.createElement('div');
        wrapper.className = 'object-wrapper';
        wrapper.appendChild(container);
        
        // Render children if expanded
        if (hasChildren && this.expandedObjects.has(obj.id)) {
            const childObjects = this.getChildObjects(obj.id);
            childObjects.forEach(childObj => {
                const childElement = this.renderObject(childObj, level + 1);
                wrapper.appendChild(childElement);
            });
        }
        
        return wrapper;
    }

    /**
     * Get child objects for a parent object
     */
    getChildObjects(parentId) {
        return this.objects.filter(obj => obj.parentId === parentId);
    }

    /**
     * Get appropriate icon for object type
     */
    getObjectIcon(objectType) {
        const icons = {
            'Rectangle': '🔲',
            'Circle': '🔵',
            'Text': '🔤',
            'Group': '📁',
            'Image': '🖼️',
            'Video': '🎬',
            'Audio': '🎵'
        };
        
        return icons[objectType] || '📦';
    }

    /**
     * Update object count display
     */
    updateObjectCount() {
        if (this.elements.objectCount) {
            this.elements.objectCount.textContent = `${this.objects.length} objects`;
        }
    }

    // =================================================================
    // INTERACTION HANDLERS
    // =================================================================

    /**
     * Handle object click for selection
     */
    handleObjectClick(e) {
        const objectElement = e.target.closest('.hierarchy-object, .hierarchy-object-fallback');
        if (!objectElement) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const objectId = objectElement.getAttribute('data-object-id');
        const obj = this.objects.find(o => o.id === objectId);
        
        if (!obj) return;
        
        // Handle expand/collapse
        if (e.target.matches('.expand-toggle')) {
            this.toggleObjectExpansion(objectId);
            return;
        }
        
        // Handle visibility toggle
        if (e.target.matches('.visibility-toggle')) {
            this.toggleObjectVisibility(objectId);
            return;
        }
        
        // Handle selection
        if (e.ctrlKey || e.metaKey) {
            // Multi-select
            this.toggleObjectSelection(objectId);
        } else if (e.shiftKey && this.selectedObjects.size > 0) {
            // Range select
            this.selectObjectRange(objectId);
        } else {
            // Single select
            this.selectObject(objectId);
        }
        
        console.log(`🌳 HierarchyPanel: Clicked object ${objectId}`);
    }

    /**
     * Handle right-click context menu
     */
    handleContextMenu(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const objectElement = e.target.closest('.hierarchy-object, .hierarchy-object-fallback');
        const objectId = objectElement ? objectElement.getAttribute('data-object-id') : null;
        
        // Show context menu
        this.showContextMenu(e.clientX, e.clientY, objectId);
        
        console.log(`🌳 HierarchyPanel: Context menu at (${e.clientX}, ${e.clientY}), object: ${objectId}`);
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyDown(e) {
        switch (e.key) {
            case 'Delete':
            case 'Backspace':
                if (this.selectedObjects.size > 0) {
                    this.deleteSelectedObjects();
                }
                break;
                
            case 'Escape':
                this.clearSelection();
                this.hideContextMenu();
                break;
                
            case 'a':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.selectAllObjects();
                }
                break;
        }
    }

    // =================================================================
    // SELECTION MANAGEMENT
    // =================================================================

    /**
     * Select a single object
     */
    selectObject(objectId) {
        const obj = this.objects.find(o => o.id === objectId);
        if (!obj) return;
        
        this.selectedObjects.clear();
        this.selectedObjects.add(objectId);
        
        this.updateSelectionUI();
        this.emitSelectionChange();
        
        console.log(`🌳 HierarchyPanel: Selected object ${objectId}`);
    }

    /**
     * Toggle object selection (for multi-select)
     */
    toggleObjectSelection(objectId) {
        if (this.selectedObjects.has(objectId)) {
            this.selectedObjects.delete(objectId);
        } else {
            this.selectedObjects.add(objectId);
        }
        
        this.updateSelectionUI();
        this.emitSelectionChange();
        
        console.log(`🌳 HierarchyPanel: Toggled selection for object ${objectId}`);
    }

    /**
     * Clear all selections
     */
    clearSelection() {
        if (this.selectedObjects.size === 0) return;
        
        this.selectedObjects.clear();
        this.updateSelectionUI();
        this.emitSelectionChange();
        
        console.log('🌳 HierarchyPanel: Selection cleared');
    }

    /**
     * Select all objects
     */
    selectAllObjects() {
        this.selectedObjects.clear();
        this.objects.forEach(obj => this.selectedObjects.add(obj.id));
        
        this.updateSelectionUI();
        this.emitSelectionChange();
        
        console.log(`🌳 HierarchyPanel: Selected all ${this.objects.length} objects`);
    }

    /**
     * Update UI to reflect current selection
     */
    updateSelectionUI() {
        // Update visual selection state
        const objectElements = document.querySelectorAll('.hierarchy-object, .hierarchy-object-fallback');
        objectElements.forEach(element => {
            const objectId = element.getAttribute('data-object-id');
            
            if (this.selectedObjects.has(objectId)) {
                element.classList.add('selected');
                element.style.backgroundColor = 'var(--highlight-accent)';
                element.style.color = 'white';
            } else {
                element.classList.remove('selected');
                element.style.backgroundColor = '';
                element.style.color = '';
            }
        });
    }

    /**
     * Emit selection change event via EventBus
     */
    emitSelectionChange() {
        if (!window.EventBus) return;
        
        const selectedObjects = Array.from(this.selectedObjects)
            .map(id => this.objects.find(obj => obj.id === id))
            .filter(obj => obj);
        
        if (selectedObjects.length > 0) {
            window.EventBus.emit('objectSelected', {
                objects: selectedObjects,
                selectedIds: Array.from(this.selectedObjects)
            });
        } else {
            window.EventBus.emit('selectionCleared', {});
        }
    }

    // =================================================================
    // OBJECT OPERATIONS
    // =================================================================

    /**
     * Toggle object expansion state
     */
    toggleObjectExpansion(objectId) {
        if (this.expandedObjects.has(objectId)) {
            this.expandedObjects.delete(objectId);
        } else {
            this.expandedObjects.add(objectId);
        }
        
        this.renderHierarchy();
        
        console.log(`🌳 HierarchyPanel: Toggled expansion for object ${objectId}`);
    }

    /**
     * Toggle object visibility
     */
    toggleObjectVisibility(objectId) {
        const obj = this.objects.find(o => o.id === objectId);
        if (!obj) return;
        
        obj.isVisible = !obj.isVisible;
        
        // Update UI immediately
        this.renderHierarchy();
        
        // Emit update event
        if (window.EventBus) {
            window.EventBus.emit('objectUpdated', {
                objectId: objectId,
                object: obj,
                property: 'isVisible',
                value: obj.isVisible
            });
        }
        
        console.log(`🌳 HierarchyPanel: Toggled visibility for object ${objectId}: ${obj.isVisible}`);
    }

    /**
     * Delete selected objects
     */
    deleteSelectedObjects() {
        if (this.selectedObjects.size === 0) return;
        
        const objectIds = Array.from(this.selectedObjects);
        
        // Remove objects from array
        this.objects = this.objects.filter(obj => !objectIds.includes(obj.id));
        
        // Clear selection
        this.selectedObjects.clear();
        
        // Re-render hierarchy
        this.renderHierarchy();
        
        // Emit delete events
        if (window.EventBus) {
            objectIds.forEach(objectId => {
                window.EventBus.emit('objectDeleted', { objectId });
            });
            
            window.EventBus.emit('selectionCleared', {});
        }
        
        console.log(`🌳 HierarchyPanel: Deleted ${objectIds.length} objects`);
    }

    // =================================================================
    // CONTEXT MENU
    // =================================================================

    /**
     * Show context menu at position
     */
    showContextMenu(x, y, objectId = null) {
        this.contextTarget = objectId;
        
        // Create context menu if it doesn't exist
        if (!this.contextMenu) {
            this.createContextMenu();
        }
        
        // Update menu items based on context
        this.updateContextMenu(objectId);
        
        // Position and show menu
        this.contextMenu.style.left = `${x}px`;
        this.contextMenu.style.top = `${y}px`;
        this.contextMenu.style.display = 'block';
        
        // Adjust position if menu goes off-screen
        const rect = this.contextMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            this.contextMenu.style.left = `${x - rect.width}px`;
        }
        if (rect.bottom > window.innerHeight) {
            this.contextMenu.style.top = `${y - rect.height}px`;
        }
    }

    /**
     * Create context menu element
     */
    createContextMenu() {
        this.contextMenu = document.createElement('div');
        this.contextMenu.id = 'hierarchy-context-menu-dynamic';
        this.contextMenu.className = 'context-menu';
        this.contextMenu.style.cssText = `
            position: fixed;
            background: var(--panel-light);
            border: 1px solid var(--borders);
            border-radius: 4px;
            padding: 4px 0;
            min-width: 150px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            display: none;
        `;
        
        document.body.appendChild(this.contextMenu);
        
        // Set up click handlers
        this.contextMenu.addEventListener('click', (e) => {
            const action = e.target.getAttribute('data-action');
            if (action) {
                this.handleContextMenuAction(action);
            }
        });
    }

    /**
     * Update context menu content based on target
     */
    updateContextMenu(objectId) {
        const hasSelection = this.selectedObjects.size > 0;
        const hasTarget = objectId !== null;
        
        const menuItems = [];
        
        if (hasTarget) {
            menuItems.push(
                '<div class="context-item" data-action="rename">📝 Rename</div>',
                '<div class="context-item" data-action="duplicate">📋 Duplicate</div>',
                '<div class="context-item" data-action="delete">🗑️ Delete</div>',
                '<div class="context-separator"></div>'
            );
        }
        
        menuItems.push(
            '<div class="context-item" data-action="create-rectangle">🔲 Rectangle</div>',
            '<div class="context-item" data-action="create-circle">🔵 Circle</div>',
            '<div class="context-item" data-action="create-text">🔤 Text</div>',
            '<div class="context-item" data-action="create-group">📁 Group</div>'
        );
        
        if (hasSelection) {
            menuItems.push(
                '<div class="context-separator"></div>',
                '<div class="context-item" data-action="group-selection">📁 Group Selection</div>'
            );
        }
        
        this.contextMenu.innerHTML = menuItems.join('');
        
        // Add CSS for menu items
        const style = `
            .context-item {
                padding: 6px 12px;
                cursor: pointer;
                font-size: 11px;
                color: var(--text-primary);
                transition: background-color 0.15s ease;
            }
            .context-item:hover {
                background-color: var(--highlight-accent);
                color: white;
            }
            .context-separator {
                height: 1px;
                background-color: var(--borders);
                margin: 4px 0;
            }
        `;
        
        if (!document.getElementById('context-menu-styles')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'context-menu-styles';
            styleElement.textContent = style;
            document.head.appendChild(styleElement);
        }
    }

    /**
     * Handle context menu actions
     */
    handleContextMenuAction(action) {
        this.hideContextMenu();
        
        switch (action) {
            case 'create-rectangle':
                this.createObject('Rectangle');
                break;
            case 'create-circle':
                this.createObject('Circle');
                break;
            case 'create-text':
                this.createObject('Text');
                break;
            case 'create-group':
                this.createObject('Group');
                break;
            case 'delete':
                if (this.contextTarget) {
                    this.deleteObject(this.contextTarget);
                }
                break;
            case 'group-selection':
                this.groupSelectedObjects();
                break;
            case 'rename':
                if (this.contextTarget) {
                    this.renameObject(this.contextTarget);
                }
                break;
            case 'duplicate':
                if (this.contextTarget) {
                    this.duplicateObject(this.contextTarget);
                }
                break;
        }
        
        console.log(`🌳 HierarchyPanel: Context menu action: ${action}`);
    }

    /**
     * Hide context menu
     */
    hideContextMenu() {
        if (this.contextMenu) {
            this.contextMenu.style.display = 'none';
        }
        this.contextTarget = null;
    }

    /**
     * Create new object
     */
    createObject(objectType) {
        if (!window.EventBus) return;
        
        window.EventBus.emit('createObjectRequested', {
            objectType: objectType,
            parentId: this.contextTarget
        });
        
        console.log(`🌳 HierarchyPanel: Requested creation of ${objectType}`);
    }

    /**
     * Delete single object
     */
    deleteObject(objectId) {
        const obj = this.objects.find(o => o.id === objectId);
        if (!obj) return;
        
        // Remove from objects array
        this.objects = this.objects.filter(o => o.id !== objectId);
        
        // Remove from selection
        this.selectedObjects.delete(objectId);
        
        // Re-render
        this.renderHierarchy();
        
        // Emit event
        if (window.EventBus) {
            window.EventBus.emit('objectDeleted', { objectId });
            if (this.selectedObjects.size === 0) {
                window.EventBus.emit('selectionCleared', {});
            }
        }
        
        console.log(`🌳 HierarchyPanel: Deleted object ${objectId}`);
    }

    // =================================================================
    // EVENT HANDLERS (EventBus events)
    // =================================================================

    /**
     * Handle object created event from external source
     */
    handleObjectCreated(data) {
        console.log('🌳 HierarchyPanel: Object created externally', data);
        
        if (data.object) {
            this.objects.push(data.object);
            this.renderHierarchy();
        }
    }

    /**
     * Handle object deleted event from external source
     */
    handleObjectDeleted(data) {
        console.log('🌳 HierarchyPanel: Object deleted externally', data);
        
        if (data.objectId) {
            this.objects = this.objects.filter(obj => obj.id !== data.objectId);
            this.selectedObjects.delete(data.objectId);
            this.renderHierarchy();
        }
    }

    /**
     * Handle object updated event from external source
     */
    handleObjectUpdated(data) {
        console.log('🌳 HierarchyPanel: Object updated externally', data);
        
        if (data.object) {
            const index = this.objects.findIndex(obj => obj.id === data.object.id);
            if (index !== -1) {
                this.objects[index] = data.object;
                this.renderHierarchy();
            }
        }
    }

    /**
     * Handle selection changed event from external source
     */
    handleSelectionChanged(data) {
        console.log('🌳 HierarchyPanel: Selection changed externally', data);
        
        if (data.selectedIds) {
            this.selectedObjects = new Set(data.selectedIds);
            this.updateSelectionUI();
        }
    }

    /**
     * Handle project loaded event
     */
    handleProjectLoaded(data) {
        console.log('🌳 HierarchyPanel: Project loaded', data);
        
        if (data.objects) {
            this.objects = data.objects;
            this.selectedObjects.clear();
            this.expandedObjects.clear();
            this.renderHierarchy();
        }
    }

    /**
     * Handle project closed event
     */
    handleProjectClosed() {
        console.log('🌳 HierarchyPanel: Project closed');
        
        this.objects = [];
        this.selectedObjects.clear();
        this.expandedObjects.clear();
        this.renderHierarchy();
    }

    // =================================================================
    // SEARCH & FILTER
    // =================================================================

    /**
     * Handle search input
     */
    handleSearch(searchTerm) {
        console.log(`🌳 HierarchyPanel: Searching for "${searchTerm}"`);
        
        if (!searchTerm.trim()) {
            // Clear search - show all objects
            this.renderHierarchy();
            return;
        }
        
        // Filter objects based on search term
        const filteredObjects = this.objects.filter(obj => 
            obj.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            obj.type.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        // Temporarily replace objects for rendering
        const originalObjects = this.objects;
        this.objects = filteredObjects;
        this.renderHierarchy();
        this.objects = originalObjects;
    }

    // =================================================================
    // UTILITY METHODS
    // =================================================================

    /**
     * Get selected objects data
     */
    getSelectedObjects() {
        return Array.from(this.selectedObjects)
            .map(id => this.objects.find(obj => obj.id === id))
            .filter(obj => obj);
    }

    /**
     * Destroy behaviour and clean up
     */
    destroy() {
        // Clean up context menu
        if (this.contextMenu && this.contextMenu.parentNode) {
            this.contextMenu.parentNode.removeChild(this.contextMenu);
        }
        
        // Clear data
        this.objects = [];
        this.selectedObjects.clear();
        this.expandedObjects.clear();
        
        console.log('🌳 HierarchyPanel: Behaviour destroyed');
    }
}

// Export class to global window for BaseComponent integration
window.HierarchyPanelBehaviour = HierarchyPanelBehaviour;

console.log('🌳 HierarchyPanel behaviour loaded');
console.log('✅ HierarchyPanelBehaviour exposed to window object');