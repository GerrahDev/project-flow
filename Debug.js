/**
 * Debug Script - Add this to your console to identify tab shrinking
 * Run this and then switch tabs to see what changes
 */

// Enhanced debugging for tab shrinking
function debugTabShrinking() {
    console.log('🔍 Starting enhanced tab shrinking debug...');
    
    // Track all the key elements
    const elements = {
        bottomPanel: document.querySelector('.bottom-panel'),
        timelineContent: document.querySelector('[data-tab-content="timeline"]'),
        assetsContent: document.querySelector('[data-tab-content="assets"]'),
        timelineContainer: document.querySelector('.timeline-container'),
        assetsContainer: document.querySelector('.assets-container'),
        panelContent: document.querySelector('.bottom-panel .panel-content'),
        flowApp: document.querySelector('.flow-app')
    };
    
    // Function to capture all sizing info
    function captureState(label) {
        console.log(`\n📊 ${label} - Element Sizes:`);
        
        Object.entries(elements).forEach(([name, element]) => {
            if (element) {
                const rect = element.getBoundingClientRect();
                const styles = getComputedStyle(element);
                
                console.log(`${name}:`, {
                    width: `${rect.width}px`,
                    height: `${rect.height}px`,
                    display: styles.display,
                    flexGrow: styles.flexGrow,
                    flexShrink: styles.flexShrink,
                    minHeight: styles.minHeight,
                    maxHeight: styles.maxHeight,
                    overflow: styles.overflow
                });
            } else {
                console.log(`${name}: NOT FOUND`);
            }
        });
        
        // Check CSS Grid
        const flowApp = elements.flowApp;
        if (flowApp) {
            const gridStyles = getComputedStyle(flowApp);
            console.log('CSS Grid Info:', {
                gridTemplateRows: gridStyles.gridTemplateRows,
                gridTemplateColumns: gridStyles.gridTemplateColumns,
                height: gridStyles.height
            });
        }
    }
    
    // Capture initial state
    captureState('INITIAL STATE');
    
    // Monitor for changes
    const observer = new ResizeObserver((entries) => {
        entries.forEach(entry => {
            const elementName = Object.keys(elements).find(key => 
                elements[key] === entry.target
            );
            if (elementName) {
                console.log(`🔄 ${elementName} resized:`, {
                    width: entry.contentRect.width,
                    height: entry.contentRect.height
                });
            }
        });
    });
    
    // Observe all elements
    Object.values(elements).forEach(element => {
        if (element) observer.observe(element);
    });
    
    // Override tab switching to add debugging
    const originalSwitchTab = window.flowApp?.uiManager?.switchTab;
    if (originalSwitchTab) {
        window.flowApp.uiManager.switchTab = function(tabName) {
            console.log(`\n🔄 SWITCHING TO: ${tabName}`);
            captureState(`BEFORE SWITCH TO ${tabName}`);
            
            // Call original function
            originalSwitchTab.call(this, tabName);
            
            // Capture state after a small delay
            setTimeout(() => {
                captureState(`AFTER SWITCH TO ${tabName}`);
            }, 100);
        };
        
        console.log('✅ Tab switching now monitored');
    }
    
    // Add manual capture function
    window.captureState = captureState;
    
    console.log('✅ Debug monitoring active');
    console.log('📋 Commands:');
    console.log('  captureState("MANUAL") - Capture current state');
    console.log('  Switch tabs and watch the console output');
    
    return {
        elements,
        observer,
        captureState
    };
}

// Auto-run debug if flowApp is available
if (window.flowApp?.uiManager) {
    window.debugInfo = debugTabShrinking();
} else {
    console.log('⚠️ FlowApp not ready yet. Run debugTabShrinking() manually when ready.');
    window.debugTabShrinking = debugTabShrinking;
}

/**
 * Quick test to identify the issue
 */
function quickTabTest() {
    console.log('🧪 Quick tab test...');
    
    const timelineTab = document.querySelector('[data-tab="timeline"]');
    const assetsTab = document.querySelector('[data-tab="assets"]');
    
    if (timelineTab && assetsTab) {
        console.log('Clicking Timeline...');
        timelineTab.click();
        
        setTimeout(() => {
            console.log('Clicking Assets...');
            assetsTab.click();
            
            setTimeout(() => {
                console.log('Back to Timeline...');
                timelineTab.click();
            }, 1000);
        }, 1000);
    } else {
        console.log('❌ Tab buttons not found');
    }
}

// Add to global scope
window.quickTabTest = quickTabTest;

console.log('🔍 Debug tools loaded:');
console.log('  debugTabShrinking() - Start detailed monitoring');
console.log('  quickTabTest() - Automated tab switching test');