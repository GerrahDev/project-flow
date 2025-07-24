/**
 * Flow Frontend Application - Clean Version
 * Uses global EventBus and delegates UI management to UIManager
 */

class FlowApp {
    constructor() {
        this.isInitialized = false;
        
        // Core systems
        this.eventBus = null;
        this.uiManager = null;
        
        console.log('🚀 FlowApp: Created');
    }

    /**
     * Initialize the application
     */
    async init() {
        console.log('🚀 FlowApp: Initializing...');
        
        try {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }
            
            // Use global EventBus instead of creating new instance
            await this.waitForEventBus();
            this.eventBus = window.EventBus;
            console.log('✅ FlowApp: Using global EventBus');
            
            // Initialize UIManager (BaseComponent will auto-load all behaviours)
            await this.initializeUIManager();
            
            // Test component integration
            this.testComponentIntegration();
            
            this.isInitialized = true;
            console.log('✅ FlowApp: Application initialized successfully');
            
        } catch (error) {
            console.error('❌ FlowApp: Initialization failed:', error);
        }
    }

    /**
     * Wait for global EventBus to be available
     */
    async waitForEventBus() {
        console.log('⏳ FlowApp: Waiting for EventBus...');
        
        const maxWait = 50; // 5 seconds max
        for (let i = 0; i < maxWait; i++) {
            if (window.EventBus && typeof window.EventBus.on === 'function') {
                console.log('✅ FlowApp: EventBus found');
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        throw new Error('EventBus not available after waiting');
    }

    /**
     * Initialize UIManager and all components
     */
    async initializeUIManager() {
        console.log('🚀 FlowApp: Initializing UIManager...');
        
        try {
            // Initialize UIManager (includes HierarchyPanel + PropertiesPanel + TimelinePanel + AssetsPanel)
            this.uiManager = new UIManager(this.eventBus);
            await this.uiManager.initialize();
            
            console.log('✅ FlowApp: UIManager initialized');
            
        } catch (error) {
            console.error('❌ FlowApp: UIManager initialization failed:', error);
            throw error;
        }
    }

    /**
     * Test component integration
     */
    testComponentIntegration() {
        console.log('🧪 FlowApp: Testing component integration...');
        
        try {
            // Test components with mock data
            if (this.uiManager) {
                console.log('🧪 Testing components...');
                this.uiManager.testComponents(); // Load mock data for all components
                
                // Test component status
                const componentStatus = this.uiManager.getComponentStatus();
                console.log('🧪 Component Status:', componentStatus);
                
                console.log('✅ Component integration test completed');
            } else {
                console.warn('⚠️ UIManager not available for testing');
            }
            
        } catch (error) {
            console.error('❌ Component integration test failed:', error);
        }
    }

    /**
     * Get application status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            eventBusAvailable: !!window.EventBus,
            uiManager: this.uiManager ? this.uiManager.getStatus() : null
        };
    }

    // ========================================
    // MANUAL TEST METHODS FOR DEVELOPMENT
    // ========================================

    /**
     * Test HierarchyPanel right-click menu
     */
    testHierarchyRightClick() {
        console.log('🧪 Testing HierarchyPanel right-click menu...');
        
        const hierarchyTree = document.querySelector('#hierarchy-tree');
        if (hierarchyTree) {
            // Simulate right-click event
            const event = new MouseEvent('contextmenu', {
                bubbles: true,
                cancelable: true,
                clientX: 200,
                clientY: 300
            });
            hierarchyTree.dispatchEvent(event);
            console.log('✅ Right-click event dispatched');
        } else {
            console.warn('⚠️ Hierarchy tree not found');
        }
    }

    /**
     * Test object selection in hierarchy
     */
    testHierarchySelection() {
        console.log('🧪 Testing HierarchyPanel selection...');
        
        const firstObject = document.querySelector('.hierarchy-object');
        if (firstObject) {
            // Simulate click event
            const event = new MouseEvent('click', {
                bubbles: true,
                cancelable: true
            });
            firstObject.dispatchEvent(event);
            console.log('✅ Object click event dispatched');
        } else {
            console.warn('⚠️ No hierarchy objects found');
        }
    }

    /**
     * Test EventBus communication
     */
    testEventBus() {
        console.log('🧪 Testing EventBus communication...');
        
        if (this.eventBus) {
            // Test object creation request
            this.eventBus.emit('createObjectRequested', {
                objectType: 'Rectangle',
                parentId: null
            });
            
            // Test object selection
            this.eventBus.emit('objectSelected', {
                objects: [{
                    id: 'test-rect-1',
                    name: 'Test Rectangle',
                    type: 'Rectangle',
                    transform: {
                        position: { x: 150, y: 100 },
                        scale: { x: 1.2, y: 0.8 },
                        rotation: 30,
                        opacity: 0.7
                    },
                    zOrder: 5,
                    isVisible: true
                }]
            });
            
            console.log('✅ EventBus test events emitted');
        } else {
            console.warn('⚠️ EventBus not available');
        }
    }

    /**
     * Test PropertiesPanel with specific object
     */
    testPropertiesPanel() {
        console.log('🧪 Testing PropertiesPanel with test object...');
        
        if (this.eventBus) {
            // Create a test object with interesting properties
            const testObject = {
                id: 'test-properties-object',
                name: 'Properties Test Object',
                type: 'Circle',
                transform: {
                    position: { x: 250, y: 150 },
                    scale: { x: 1.5, y: 1.5 },
                    rotation: 45,
                    opacity: 0.85
                },
                zOrder: 3,
                isVisible: true
            };
            
            // Emit selection event
            this.eventBus.emit('objectSelected', {
                objects: [testObject]
            });
            
            console.log('✅ PropertiesPanel test object selected');
        } else {
            console.warn('⚠️ EventBus not available');
        }
    }

    /**
     * Test TimelinePanel with test data
     */
    testTimelinePanel() {
        console.log('🧪 Testing TimelinePanel with test data...');
        
        if (this.eventBus) {
            // Test timeline events
            this.eventBus.emit('timelineSeek', {
                currentTime: 2500,
                frame: 75
            });
            
            this.eventBus.emit('timelinePlaying', {
                isPlaying: true,
                currentTime: 2500
            });
            
            console.log('✅ TimelinePanel test events emitted');
        } else {
            console.warn('⚠️ EventBus not available');
        }
    }

    /**
     * Test AssetsPanel specifically
     */
    testAssetsPanel() {
        console.log('🧪 Testing AssetsPanel...');
        
        if (this.uiManager) {
            this.uiManager.testAssetsPanel();
        } else {
            console.warn('⚠️ UIManager not available');
        }
    }

    /**
     * Test tab switching specifically
     */
    testTabSwitching() {
        console.log('🧪 Testing tab switching...');
        
        if (this.uiManager) {
            // Test switching to assets
            this.uiManager.switchTab('assets');
            
            setTimeout(() => {
                // Switch back to timeline
                this.uiManager.switchTab('timeline');
                console.log('✅ Tab switching test completed');
            }, 1000);
        } else {
            console.warn('⚠️ UIManager not available');
        }
    }

    /**
     * Clear selection to test deselection
     */
    testClearSelection() {
        console.log('🧪 Testing selection clearing...');
        
        if (this.eventBus) {
            this.eventBus.emit('selectionCleared', {});
            console.log('✅ Selection cleared');
        } else {
            console.warn('⚠️ EventBus not available');
        }
    }

    /**
     * Test all components at once
     */
    testAllComponents() {
        console.log('🧪 Testing all components...');
        
        // Load test data
        if (this.uiManager) {
            this.uiManager.testComponents();
        }
        
        // Test individual functions
        this.testEventBus();
        this.testPropertiesPanel();
        this.testTimelinePanel();
        this.testTabSwitching();
        
        console.log('✅ All component tests completed');
    }

    /**
     * Reset application to clean state
     */
    resetApp() {
        console.log('🔄 Resetting application...');
        
        if (this.eventBus) {
            this.eventBus.emit('selectionCleared', {});
            this.eventBus.emit('projectClosed', {});
        }
        
        // Reset to timeline tab
        if (this.uiManager) {
            this.uiManager.switchTab('timeline');
        }
        
        console.log('✅ Application reset');
    }

    /**
     * Show debug information
     */
    showDebugInfo() {
        console.log('🐛 Debug Information:');
        console.log('App Status:', this.getStatus());
        
        if (window.EventBus) {
            console.log('EventBus Info:', window.EventBus.getDebugInfo());
        }
        
        if (this.uiManager) {
            console.log('Component Status:', this.uiManager.getComponentStatus());
            console.log('UI State:', this.uiManager.getStatus());
        }
    }

    /**
     * Force UI refresh (useful for debugging tab issues)
     */
    refreshUI() {
        console.log('🔄 Forcing UI refresh...');
        
        if (this.uiManager) {
            // Use the stabilizeLayout method to refresh
            this.uiManager.stabilizeLayout(this.uiManager.activeTab);
            console.log('✅ UI refreshed');
        } else {
            console.warn('⚠️ UIManager not available');
        }
    }
}

// Initialize the application when the script loads
const flowApp = new FlowApp();

// Start initialization
flowApp.init().catch(error => {
    console.error('❌ Failed to start Flow Application:', error);
});

// Make available globally for debugging
window.flowApp = flowApp;

// Add console helpers for testing
window.testHierarchy = () => flowApp.testHierarchyRightClick();
window.testSelection = () => flowApp.testHierarchySelection();
window.testEventBus = () => flowApp.testEventBus();
window.testProperties = () => flowApp.testPropertiesPanel();
window.testTimeline = () => flowApp.testTimelinePanel();
window.testAssets = () => flowApp.testAssetsPanel();
window.testTabs = () => flowApp.testTabSwitching();
window.clearSelection = () => flowApp.testClearSelection();
window.testAll = () => flowApp.testAllComponents();
window.resetApp = () => flowApp.resetApp();
window.debugInfo = () => flowApp.showDebugInfo();
window.refreshUI = () => flowApp.refreshUI();
window.getAppStatus = () => flowApp.getStatus();

console.log('📋 Test commands available:');
console.log('  testHierarchy() - Test right-click menu');
console.log('  testSelection() - Test object selection');
console.log('  testEventBus() - Test EventBus communication');
console.log('  testProperties() - Test PropertiesPanel with test object');
console.log('  testTimeline() - Test TimelinePanel controls');
console.log('  testAssets() - Test AssetsPanel functionality');
console.log('  testTabs() - Test tab switching behavior');
console.log('  clearSelection() - Test selection clearing');
console.log('  testAll() - Test all components at once');
console.log('  resetApp() - Reset to clean state');
console.log('  debugInfo() - Show debug information');
console.log('  refreshUI() - Force UI refresh (useful for tab issues)');
console.log('  getAppStatus() - Get application status');