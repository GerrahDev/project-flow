/**
 * UIManager - UI coordination and component management
 * FIXED: Proper tab switching without style conflicts
 */

class UIManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.isInitialized = false;
        
        // UI References
        this.connectionStatusEl = null;
        this.homeDropdown = null;
        this.canvasInfoEl = null;
        this.canvasOverlay = null;
        
        // Components (using BaseComponent)
        this.hierarchyPanel = null;
        this.propertiesPanel = null;
        this.timelinePanel = null;
        this.assetsPanel = null;
        
        // UI State
        this.activeTab = 'timeline';
        this.currentProject = null;
        
        console.log('🎨 UIManager: Created');
    }

    /**
     * Initialize UIManager and all components
     */
    async initialize() {
        if (this.isInitialized) {
            console.warn('⚠️ UIManager: Already initialized');
            return;
        }

        console.log('🎨 UIManager: Initializing...');

        try {
            // Initialize UI references
            this.initializeUIReferences();
            
            // Set up UI event handlers
            this.setupUIEventHandlers();
            
            // Initialize components
            await this.initializeComponents();
            
            // Set up EventBus subscriptions
            this.setupEventSubscriptions();
            
            this.isInitialized = true;
            console.log('✅ UIManager: Initialized successfully');
            
        } catch (error) {
            console.error('❌ UIManager: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Initialize UI element references
     */
    initializeUIReferences() {
        console.log('🎨 UIManager: Setting up UI references...');
        
        // Connection status
        this.connectionStatusEl = document.getElementById('connection-status');
        
        // Home dropdown
        this.homeDropdown = document.querySelector('.home-dropdown');
        
        // Canvas elements
        this.canvasInfoEl = document.getElementById('canvas-info');
        this.canvasOverlay = document.querySelector('.canvas-overlay');
        
        console.log('✅ UIManager: UI references set up');
    }

    /**
     * Initialize all UI components using BaseComponent
     */
    async initializeComponents() {
        console.log('🎨 UIManager: Initializing components...');
        
        try {
            // Initialize HierarchyPanel using BaseComponent
            console.log('🎨 UIManager: Creating HierarchyPanel...');
            this.hierarchyPanel = new BaseComponent('HierarchyPanel', '#hierarchy-panel', this.eventBus);
            
            // Initialize the component (loads template/styles/behaviour automatically)
            await this.hierarchyPanel.initialize();
            
            // Mount the component (attach to DOM, set up events)
            await this.hierarchyPanel.mount();
            
            console.log('✅ UIManager: HierarchyPanel initialized and mounted');
            
            // Initialize PropertiesPanel using BaseComponent
            console.log('🎨 UIManager: Creating PropertiesPanel...');
            this.propertiesPanel = new BaseComponent('PropertiesPanel', '#properties-panel', this.eventBus);
            
            // Initialize the component (loads template/styles/behaviour automatically)
            await this.propertiesPanel.initialize();
            
            // Mount the component (attach to DOM, set up events)
            await this.propertiesPanel.mount();
            
            console.log('✅ UIManager: PropertiesPanel initialized and mounted');
            
            // Initialize TimelinePanel using BaseComponent
            console.log('🎨 UIManager: Creating TimelinePanel...');
            this.timelinePanel = new BaseComponent('TimelinePanel', '#timeline-panel', this.eventBus);
            
            // Initialize the component (loads template/styles/behaviour automatically)
            await this.timelinePanel.initialize();
            
            // Mount the component (attach to DOM, set up events)
            await this.timelinePanel.mount();
            
            console.log('✅ UIManager: TimelinePanel initialized and mounted');
            
            // Initialize AssetsPanel using BaseComponent
            console.log('🎨 UIManager: Creating AssetsPanel...');
            this.assetsPanel = new BaseComponent('AssetsPanel', '#assets-panel', this.eventBus);
            
            // Initialize the component (loads template/styles/behaviour automatically)
            await this.assetsPanel.initialize();
            
            // Mount the component (attach to DOM, set up events)
            await this.assetsPanel.mount();
            
            console.log('✅ UIManager: AssetsPanel initialized and mounted');
            
            // TODO: Initialize CanvasPanel when ready
            
        } catch (error) {
            console.error('❌ UIManager: Component initialization failed:', error);
            throw error;
        }
    }

    /**
     * Set up UI event handlers
     */
    setupUIEventHandlers() {
        console.log('🎨 UIManager: Setting up UI event handlers...');
        
        // Tab switching
        document.addEventListener('click', (e) => {
            if (e.target.matches('.tab-button') || e.target.closest('.tab-button')) {
                const tabButton = e.target.matches('.tab-button') ? e.target : e.target.closest('.tab-button');
                const tabName = tabButton.getAttribute('data-tab');
                if (tabName) {
                    this.switchTab(tabName);
                }
            }
        });

        // Home dropdown toggle
        if (this.homeDropdown) {
            const dropdownToggle = this.homeDropdown.querySelector('.dropdown-toggle');
            if (dropdownToggle) {
                dropdownToggle.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.toggleHomeDropdown();
                });
            }
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.home-dropdown')) {
                this.closeHomeDropdown();
            }
        });
        
        console.log('✅ UIManager: UI event handlers set up');
    }

    /**
     * Set up EventBus subscriptions
     */
    setupEventSubscriptions() {
        console.log('🎨 UIManager: Setting up EventBus subscriptions...');
        
        // Project events
        this.eventBus.on('projectLoaded', this.handleProjectLoaded, this);
        this.eventBus.on('projectClosed', this.handleProjectClosed, this);
        this.eventBus.on('projectUpdated', this.handleProjectUpdated, this);
        
        // Object events
        this.eventBus.on('createObjectRequested', this.handleCreateObjectRequested, this);
        this.eventBus.on('objectSelected', this.handleObjectSelected, this);
        this.eventBus.on('selectionCleared', this.handleSelectionCleared, this);
        this.eventBus.on('objectUpdated', this.handleObjectUpdated, this);
        
        // Asset events
        this.eventBus.on('assetImportRequested', this.handleAssetImportRequested, this);
        this.eventBus.on('assetSelected', this.handleAssetSelected, this);
        this.eventBus.on('assetsSelected', this.handleAssetsSelected, this);
        
        console.log('✅ UIManager: EventBus subscriptions set up');
    }

    // ========================================
    // EVENT HANDLERS
    // ========================================

    /**
     * Handle project loaded event
     */
    handleProjectLoaded(projectData) {
        console.log('🎨 UIManager: Project loaded');
        this.currentProject = projectData;
        this.updateCanvasInfo();
        this.updateWindowTitle();
        this.updateCanvasOverlay();
        
        // Update HierarchyPanel with project objects
        if (this.hierarchyPanel) {
            this.hierarchyPanel.update({
                objects: projectData.objects || []
            });
        }
        
        // Update TimelinePanel with project data
        if (this.timelinePanel) {
            this.timelinePanel.update({
                objects: projectData.objects || [],
                timeline: projectData.timeline || {}
            });
        }
        
        // Update AssetsPanel with project assets
        if (this.assetsPanel) {
            this.assetsPanel.update({
                assets: projectData.assets || [],
                folders: projectData.assetFolders || []
            });
        }
    }

    /**
     * Handle project closed event
     */
    handleProjectClosed() {
        console.log('🎨 UIManager: Project closed');
        this.currentProject = null;
        this.updateCanvasInfo();
        this.updateWindowTitle();
        this.updateCanvasOverlay();
        
        // Clear HierarchyPanel
        if (this.hierarchyPanel) {
            this.hierarchyPanel.update({
                objects: []
            });
        }
        
        // Clear TimelinePanel
        if (this.timelinePanel) {
            this.timelinePanel.update({
                objects: [],
                timeline: {}
            });
        }
        
        // Clear AssetsPanel
        if (this.assetsPanel) {
            this.assetsPanel.update({
                assets: [],
                folders: []
            });
        }
    }

    /**
     * Handle project updated event
     */
    handleProjectUpdated(projectData) {
        console.log('🎨 UIManager: Project updated');
        this.currentProject = projectData;
        this.updateCanvasInfo();
        this.updateWindowTitle();
        
        // Update HierarchyPanel
        if (this.hierarchyPanel) {
            this.hierarchyPanel.update({
                objects: projectData.objects || []
            });
        }
        
        // Update TimelinePanel
        if (this.timelinePanel) {
            this.timelinePanel.update({
                objects: projectData.objects || [],
                timeline: projectData.timeline || {}
            });
        }
        
        // Update AssetsPanel
        if (this.assetsPanel) {
            this.assetsPanel.update({
                assets: projectData.assets || [],
                folders: projectData.assetFolders || []
            });
        }
    }

    /**
     * Handle create object request from HierarchyPanel
     */
    handleCreateObjectRequested(data) {
        console.log('🎨 UIManager: Object creation requested:', data);
        
        // Emit to ProjectManager to handle the actual creation
        this.eventBus.emit('requestCreateObject', {
            objectType: data.objectType,
            parentId: data.parentId
        });
    }

    /**
     * Handle object selected in hierarchy
     */
    handleObjectSelected(data) {
        console.log('🎨 UIManager: Object selected:', data);
        
        // PropertiesPanel and TimelinePanel behaviours handle this automatically via EventBus
        // No need to manually update them here
        
        const count = data.objects?.length || 1;
        this.showNotification(`Selected ${count} object(s)`, 'info');
    }

    /**
     * Handle selection cleared
     */
    handleSelectionCleared() {
        console.log('🎨 UIManager: Selection cleared');
        
        // Component behaviours handle this automatically via EventBus
        // No need to manually update them here
        
        this.showNotification('Selection cleared', 'info');
    }

    /**
     * Handle object updated event
     */
    handleObjectUpdated(data) {
        console.log('🎨 UIManager: Object updated:', data);
        
        // Component behaviours handle this via their own EventBus subscriptions
        // No need to manually update them here
    }

    /**
     * Handle asset import request from AssetsPanel
     */
    handleAssetImportRequested(data) {
        console.log('🎨 UIManager: Asset import requested:', data);
        
        // For now, just log - will connect to backend asset processing later
        this.showNotification(`Importing asset: ${data.asset.name}`, 'info');
        
        // TODO: Connect to backend asset import system
        // this.eventBus.emit('requestAssetImport', data);
    }

    /**
     * Handle asset selected in AssetsPanel
     */
    handleAssetSelected(data) {
        console.log('🎨 UIManager: Asset selected:', data);
        
        this.showNotification(`Selected asset: ${data.asset.name}`, 'info');
    }

    /**
     * Handle multiple assets selected in AssetsPanel
     */
    handleAssetsSelected(data) {
        console.log('🎨 UIManager: Assets selected:', data);
        
        const count = data.assets?.length || 0;
        this.showNotification(`Selected ${count} asset(s)`, 'info');
    }

    // ========================================
    // UI OPERATIONS - FIXED TAB SWITCHING
    // ========================================

    /**
     * FIXED: Switch between timeline and assets tabs
     * No more style conflicts - uses CSS classes only
     */
    switchTab(tabName) {
        if (tabName === this.activeTab) return;
        
        console.log(`🔄 UIManager: Switching to ${tabName} tab`);
        this.activeTab = tabName;
        
        // Update tab buttons - SAFE: Only use CSS classes
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // Update tab content - SAFE: Only use CSS classes
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const activeContent = document.querySelector(`[data-tab-content="${tabName}"]`);
        if (activeContent) {
            activeContent.classList.add('active');
        }
        
        // FIXED: Update panel controls using CSS classes instead of style.display
        document.querySelectorAll('[data-tab-content]').forEach(control => {
            if (control.hasAttribute('data-tab-content')) {
                const controlTab = control.getAttribute('data-tab-content');
                
                // Remove any existing visibility classes
                control.classList.remove('tab-control-visible', 'tab-control-hidden');
                
                // Add appropriate visibility class
                if (controlTab === tabName) {
                    control.classList.add('tab-control-visible');
                } else {
                    control.classList.add('tab-control-hidden');
                }
            }
        });
        
        // FIXED: Force layout recalculation to prevent shrinking
        this.stabilizeLayout(tabName);
        
        console.log(`✅ UIManager: Successfully switched to ${tabName} tab`);
    }

    /**
     * FIXED: Stabilize layout after tab switch to prevent shrinking
     */
    stabilizeLayout(tabName) {
        requestAnimationFrame(() => {
            // Force layout recalculation
            const bottomPanel = document.querySelector('.bottom-panel');
            if (bottomPanel) {
                // Force reflow by reading layout property
                bottomPanel.offsetHeight;
            }
            
            // Ensure containers are properly sized
            const timelineContainer = document.querySelector('.timeline-container');
            const assetsContainer = document.querySelector('.assets-container');
            
            if (timelineContainer && tabName === 'timeline') {
                // Reset any inline styles that might cause issues
                timelineContainer.style.height = '';
                timelineContainer.style.minHeight = '';
                
                // Force reflow
                timelineContainer.offsetHeight;
            }
            
            if (assetsContainer && tabName === 'assets') {
                // Reset any inline styles that might cause issues
                assetsContainer.style.height = '';
                assetsContainer.style.minHeight = '';
                
                // Force reflow
                assetsContainer.offsetHeight;
            }
            
            // Additional stabilization for flex containers
            requestAnimationFrame(() => {
                const tabContent = document.querySelector('.tab-content.active');
                if (tabContent) {
                    tabContent.offsetHeight; // Final reflow
                }
            });
        });
    }

    /**
     * Toggle home dropdown menu
     */
    toggleHomeDropdown() {
        if (this.homeDropdown) {
            this.homeDropdown.classList.toggle('active');
        }
    }

    /**
     * Close home dropdown menu
     */
    closeHomeDropdown() {
        if (this.homeDropdown) {
            this.homeDropdown.classList.remove('active');
        }
    }

    /**
     * Update connection status display
     */
    updateConnectionStatus(status) {
        if (this.connectionStatusEl) {
            this.connectionStatusEl.textContent = status;
            
            // Update status styling
            this.connectionStatusEl.classList.remove('connected', 'disconnected');
            
            if (status === 'Connected') {
                this.connectionStatusEl.classList.add('connected');
            } else if (status.includes('Disconnect') || status.includes('Failed')) {
                this.connectionStatusEl.classList.add('disconnected');
            }
        }
        
        console.log('🎨 UIManager: Connection status updated:', status);
    }

    /**
     * Update canvas info display
     */
    updateCanvasInfo() {
        if (!this.canvasInfoEl) return;

        if (!this.currentProject?.hasProject) {
            this.canvasInfoEl.textContent = 'No project';
            return;
        }

        const project = this.currentProject;
        this.canvasInfoEl.textContent = `${project.canvas.width} × ${project.canvas.height} | ${project.timeline.duration}`;
    }

    /**
     * Update window title
     */
    updateWindowTitle() {
        if (!this.currentProject?.hasProject) {
            document.title = 'Flow - Modern 2D Animation & Video Editing';
            return;
        }

        const project = this.currentProject;
        document.title = `${project.name} (${project.canvas.width}×${project.canvas.height}) - Flow`;
    }

    /**
     * Update canvas overlay visibility
     */
    updateCanvasOverlay() {
        if (!this.canvasOverlay) return;

        if (this.currentProject?.hasProject) {
            this.canvasOverlay.style.display = 'none';
        } else {
            this.canvasOverlay.style.display = 'flex';
        }
    }

    /**
     * Show notification to user
     */
    showNotification(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        if (type === 'error') {
            console.error(`🔴 ${message}`);
        } else if (type === 'success') {
            console.log(`🟢 ${message}`);
        } else if (type === 'warning') {
            console.warn(`🟡 ${message}`);
        } else {
            console.log(`🔵 ${message}`);
        }
    }

    // ========================================
    // COMPONENT ACCESS & TESTING
    // ========================================

    /**
     * Get component status for debugging
     */
    getComponentStatus() {
        return {
            hierarchyPanel: this.hierarchyPanel ? this.hierarchyPanel.getState() : null,
            propertiesPanel: this.propertiesPanel ? this.propertiesPanel.getState() : null,
            timelinePanel: this.timelinePanel ? this.timelinePanel.getState() : null,
            assetsPanel: this.assetsPanel ? this.assetsPanel.getState() : null,
        };
    }

    /**
     * Test HierarchyPanel with mock data (backward compatibility)
     */
    testHierarchyPanel() {
        this.testComponents();
    }

    /**
     * Test components with comprehensive mock data
     */
    testComponents() {
        console.log('🧪 UIManager: Testing components with mock data...');
        
        if (!this.hierarchyPanel) {
            console.error('❌ HierarchyPanel not initialized');
            return;
        }
        
        const mockObjects = [
            {
                id: 'rect1',
                name: 'Background Rectangle',
                type: 'Rectangle',
                parentId: null,
                transform: {
                    position: { x: 100, y: 200 },
                    scale: { x: 1.5, y: 1.0 },
                    rotation: 45,
                    opacity: 0.8
                },
                zOrder: 1,
                isVisible: true
            },
            {
                id: 'group1',
                name: 'UI Group',
                type: 'Group',
                parentId: null,
                transform: {
                    position: { x: 0, y: 0 },
                    scale: { x: 1, y: 1 },
                    rotation: 0,
                    opacity: 1
                },
                zOrder: 2,
                isVisible: true
            },
            {
                id: 'text1',
                name: 'Title Text',
                type: 'Text',
                parentId: 'group1',
                transform: {
                    position: { x: 50, y: 50 },
                    scale: { x: 1.2, y: 1.2 },
                    rotation: 0,
                    opacity: 0.9
                },
                zOrder: 3,
                isVisible: true
            },
            {
                id: 'circle1',
                name: 'Button Circle',
                type: 'Circle',
                parentId: 'group1',
                transform: {
                    position: { x: 150, y: 75 },
                    scale: { x: 0.8, y: 0.8 },
                    rotation: 90,
                    opacity: 0.6
                },
                zOrder: 4,
                isVisible: false
            }
        ];
        
        // Mock assets for AssetsPanel testing
        const mockAssets = [
            {
                id: 'asset1',
                name: 'background-image.jpg',
                type: 'image',
                size: 2048576,
                folder: '',
                imported: Date.now() - 3600000
            },
            {
                id: 'asset2',
                name: 'intro-music.mp3',
                type: 'audio',
                size: 5242880,
                folder: '',
                imported: Date.now() - 7200000
            },
            {
                id: 'asset3',
                name: 'logo-animation.mp4',
                type: 'video',
                size: 15728640,
                folder: 'animations',
                imported: Date.now() - 1800000
            },
            {
                id: 'asset4',
                name: 'button-texture.png',
                type: 'image',
                size: 512000,
                folder: 'ui',
                imported: Date.now() - 900000
            }
        ];
        
        // Update HierarchyPanel with mock data
        this.hierarchyPanel.update({ objects: mockObjects });
        
        // Update TimelinePanel with mock data
        if (this.timelinePanel) {
            this.timelinePanel.update({ 
                objects: mockObjects,
                timeline: {
                    duration: 10000,
                    frameRate: 30,
                    currentTime: 0
                }
            });
        }
        
        // Update AssetsPanel with mock data
        if (this.assetsPanel) {
            this.assetsPanel.update({
                assets: mockAssets,
                folders: ['animations', 'ui', 'audio']
            });
        }
        
        console.log('✅ UIManager: Component test data loaded');
        console.log('🧪 Try: Click objects in hierarchy to test PropertiesPanel');
        console.log('🎬 Try: Use timeline controls to test TimelinePanel');
        console.log('📁 Try: Click assets tab to test AssetsPanel');
        console.log('📁 Try: Click Import button to test asset import');
    }

    /**
     * Test AssetsPanel specifically
     */
    testAssetsPanel() {
        console.log('🧪 UIManager: Testing AssetsPanel specifically...');
        
        if (!this.assetsPanel) {
            console.error('❌ AssetsPanel not initialized');
            return;
        }
        
        // Switch to assets tab
        this.switchTab('assets');
        
        // Run AssetsPanel test
        if (this.assetsPanel.behaviour && typeof this.assetsPanel.behaviour.test === 'function') {
            this.assetsPanel.behaviour.test();
        } else {
            console.warn('⚠️ AssetsPanel test method not available');
        }
        
        console.log('✅ AssetsPanel test completed');
    }

    /**
     * Get application status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            hasProject: this.currentProject?.hasProject || false,
            projectName: this.currentProject?.name || null,
            activeTab: this.activeTab,
            components: this.getComponentStatus()
        };
    }
}

// Export for use in other modules
window.UIManager = UIManager;