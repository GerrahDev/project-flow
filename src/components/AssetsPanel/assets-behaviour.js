/**
 * AssetsPanel Behaviour - Asset management and import functionality
 * Handles file import, asset organization, and folder management
 */

class AssetsPanelBehaviour {
    constructor() {
        console.log('📁 AssetsPanel behaviour created');
        
        // Core state
        this.assets = [];
        this.folders = ['animations', 'ui', 'audio']; // Default folders
        this.selectedAssets = new Set();
        this.selectedFolder = ''; // Empty = root folder
        this.viewMode = 'grid'; // 'grid' or 'list'
        this.searchTerm = '';
        
        // UI element references
        this.elements = {};
        
        // Context menu state
        this.contextMenu = null;
        this.contextTarget = null;
        
        // File input for import
        this.fileInput = null;
    }

    /**
     * Initialize the assets panel behaviour
     */
    async init() {
        console.log('📁 AssetsPanel behaviour initializing...');
        
        // Wait for EventBus to be available
        await this.waitForEventBus();
        
        // Get UI element references
        this.setupElementReferences();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Set up EventBus subscriptions
        this.setupEventSubscriptions();
        
        // Initialize UI
        this.renderAssets();
        this.renderFolders();
        
        console.log('✅ AssetsPanel behaviour initialized');
    }

    /**
     * Wait for EventBus to be available
     */
    async waitForEventBus() {
        const maxWait = 50; // 5 seconds max
        for (let i = 0; i < maxWait; i++) {
            if (window.EventBus && typeof window.EventBus.on === 'function') {
                console.log('✅ AssetsPanel: EventBus found');
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        throw new Error('AssetsPanel: EventBus not available after waiting');
    }

    /**
     * Update assets with new data (called by BaseComponent)
     */
    update(data) {
        console.log('📁 AssetsPanel: Updating with data', data);
        
        if (!data) return;
        
        // Update assets array
        if (data.assets) {
            this.assets = Array.isArray(data.assets) ? data.assets : [];
            this.renderAssets();
        }
        
        // Update folders
        if (data.folders) {
            this.folders = Array.isArray(data.folders) ? data.folders : [];
            this.renderFolders();
        }
        
        this.updateAssetCount();
        
        console.log('✅ AssetsPanel: Updated successfully');
    }

    /**
     * Get references to UI elements
     */
    setupElementReferences() {
        // Import controls
        this.elements.importBtn = document.getElementById('assets-import-btn');
        this.elements.importInput = document.getElementById('assets-import-input');
        this.elements.createFolderBtn = document.getElementById('assets-create-folder-btn');
        
        // View controls
        this.elements.viewModeSelect = document.getElementById('assets-view-mode');
        this.elements.searchInput = document.getElementById('assets-search');
        
        // Main areas
        this.elements.foldersTree = document.getElementById('assets-folders');
        this.elements.assetsGrid = document.getElementById('assets-grid');
        
        // Footer
        this.elements.assetsCount = document.getElementById('assets-count');
        
        // Context menu
        this.elements.contextMenu = document.getElementById('assets-context-menu');
        
        // Log which elements were found/missing
        let foundElements = 0;
        let totalElements = 0;
        Object.entries(this.elements).forEach(([key, element]) => {
            totalElements++;
            if (element) {
                foundElements++;
            } else {
                console.warn(`📁 AssetsPanel: Missing element: ${key}`);
            }
        });
        
        console.log(`📁 AssetsPanel: Found ${foundElements}/${totalElements} UI elements`);
    }

    /**
     * Set up event listeners for assets interactions
     */
    setupEventListeners() {
        // Import button
        if (this.elements.importBtn) {
            this.elements.importBtn.addEventListener('click', () => {
                this.triggerFileImport();
            });
        }
        
        // File input (hidden)
        if (this.elements.importInput) {
            this.elements.importInput.addEventListener('change', (e) => {
                this.handleFileImport(e);
            });
        }
        
        // Create folder button
        if (this.elements.createFolderBtn) {
            this.elements.createFolderBtn.addEventListener('click', () => {
                this.createFolder();
            });
        }
        
        // View mode selector
        if (this.elements.viewModeSelect) {
            this.elements.viewModeSelect.addEventListener('change', (e) => {
                this.changeViewMode(e.target.value);
            });
        }
        
        // Search input
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }
        
        // Assets grid interactions
        if (this.elements.assetsGrid) {
            this.elements.assetsGrid.addEventListener('click', (e) => {
                this.handleAssetClick(e);
            });
            
            this.elements.assetsGrid.addEventListener('contextmenu', (e) => {
                this.handleAssetContextMenu(e);
            });
        }
        
        // Folder tree interactions
        if (this.elements.foldersTree) {
            this.elements.foldersTree.addEventListener('click', (e) => {
                this.handleFolderClick(e);
            });
        }
        
        // Global click to close context menu
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#assets-context-menu')) {
                this.hideContextMenu();
            }
        });
        
        // Drag and drop (for future file import)
        if (this.elements.assetsGrid) {
            this.elements.assetsGrid.addEventListener('dragover', (e) => {
                e.preventDefault();
                this.elements.assetsGrid.classList.add('drag-over');
            });
            
            this.elements.assetsGrid.addEventListener('dragleave', (e) => {
                this.elements.assetsGrid.classList.remove('drag-over');
            });
            
            this.elements.assetsGrid.addEventListener('drop', (e) => {
                e.preventDefault();
                this.elements.assetsGrid.classList.remove('drag-over');
                this.handleFileDrop(e);
            });
        }
        
        console.log('📁 AssetsPanel: Event listeners set up');
    }

    /**
     * Set up EventBus subscriptions
     */
    setupEventSubscriptions() {
        if (!window.EventBus) {
            console.error('❌ AssetsPanel: EventBus not available for subscriptions');
            return;
        }

        // Listen for project events
        window.EventBus.on('projectLoaded', (data) => this.handleProjectLoaded(data));
        window.EventBus.on('projectClosed', () => this.handleProjectClosed());
        
        console.log('📁 AssetsPanel: EventBus subscriptions set up');
    }

    // ========================================
    // ASSET RENDERING
    // ========================================

    /**
     * Render assets grid based on current state
     */
    renderAssets() {
        if (!this.elements.assetsGrid) {
            console.warn('📁 AssetsPanel: Cannot render - assets grid element not found');
            return;
        }

        console.log('📁 AssetsPanel: Rendering assets...');
        
        // Filter assets based on selected folder and search
        const filteredAssets = this.getFilteredAssets();
        
        // Clear existing content
        this.elements.assetsGrid.innerHTML = '';
        
        // Apply view mode class
        this.elements.assetsGrid.className = `assets-grid ${this.viewMode}-view`;
        
        if (filteredAssets.length === 0) {
            this.renderEmptyState();
            return;
        }
        
        // Render each asset
        filteredAssets.forEach(asset => {
            const assetElement = this.renderAsset(asset);
            this.elements.assetsGrid.appendChild(assetElement);
        });
        
        console.log(`📁 AssetsPanel: Rendered ${filteredAssets.length} assets`);
    }

    /**
     * Render empty state when no assets
     */
    renderEmptyState() {
        const isEmpty = this.assets.length === 0;
        const hasSearch = this.searchTerm.length > 0;
        const hasFolder = this.selectedFolder.length > 0;
        
        let message, subMessage;
        
        if (isEmpty) {
            message = 'No assets imported';
            subMessage = 'Click Import to add images, videos, or audio files';
        } else if (hasSearch) {
            message = `No assets found for "${this.searchTerm}"`;
            subMessage = 'Try a different search term';
        } else if (hasFolder) {
            message = `No assets in "${this.selectedFolder}"`;
            subMessage = 'Try selecting a different folder';
        } else {
            message = 'No assets to display';
            subMessage = 'Check your filters';
        }
        
        this.elements.assetsGrid.innerHTML = `
            <div class="assets-empty-state">
                <div class="empty-icon">📁</div>
                <p>${message}</p>
                <small>${subMessage}</small>
            </div>
        `;
    }

    /**
     * Render a single asset
     */
    renderAsset(asset) {
        const template = document.getElementById('asset-item-template');
        if (!template) {
            // Create fallback element if template missing
            const element = document.createElement('div');
            element.className = 'asset-item';
            element.style.cssText = `
                padding: 8px; 
                margin: 4px; 
                border: 1px solid var(--borders);
                border-radius: 4px;
                cursor: pointer; 
                background: var(--panel-light);
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            
            const icon = this.getAssetIcon(asset.type);
            const size = this.formatFileSize(asset.size);
            
            element.innerHTML = `
                <span style="font-size: 20px;">${icon}</span>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 11px; font-weight: 500; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${asset.name}</div>
                    <div style="font-size: 9px; color: var(--text-secondary);">${asset.type} • ${size}</div>
                </div>
            `;
            
            element.setAttribute('data-asset-id', asset.id);
            return element;
        }

        // Use template if available
        const assetElement = template.content.cloneNode(true);
        const container = assetElement.querySelector('.asset-item');
        
        // Set asset data
        container.setAttribute('data-asset-id', asset.id);
        
        // Set thumbnail/icon
        const thumbnail = container.querySelector('.asset-thumbnail');
        if (thumbnail) {
            thumbnail.innerHTML = this.getAssetIcon(asset.type);
            
            // For actual images, we could load thumbnails here
            if (asset.type === 'image' && asset.thumbnailUrl) {
                thumbnail.innerHTML = `<img src="${asset.thumbnailUrl}" alt="${asset.name}">`;
            }
        }
        
        // Set asset name
        const nameElement = container.querySelector('.asset-name');
        if (nameElement) {
            nameElement.textContent = asset.name;
        }
        
        // Set asset info
        const infoElement = container.querySelector('.asset-info');
        if (infoElement) {
            const size = this.formatFileSize(asset.size);
            const time = this.formatTime(asset.imported);
            infoElement.textContent = `${asset.type} • ${size} • ${time}`;
        }
        
        // Apply selection styling
        if (this.selectedAssets.has(asset.id)) {
            container.classList.add('selected');
        }
        
        return container;
    }

    /**
     * Render folder tree
     */
    renderFolders() {
        if (!this.elements.foldersTree) return;
        
        const folderTree = this.elements.foldersTree.querySelector('.folder-tree');
        if (!folderTree) return;
        
        // Clear existing folders (except root)
        const rootFolder = folderTree.querySelector('.root-folder');
        folderTree.innerHTML = '';
        
        // Re-add root folder
        if (rootFolder) {
            rootFolder.classList.toggle('selected', this.selectedFolder === '');
            folderTree.appendChild(rootFolder);
        }
        
        // Add dynamic folders
        this.folders.forEach(folderName => {
            const folderElement = this.createFolderElement(folderName);
            folderTree.appendChild(folderElement);
        });
        
        console.log(`📁 AssetsPanel: Rendered ${this.folders.length} folders`);
    }

    /**
     * Create a folder element
     */
    createFolderElement(folderName) {
        const template = document.getElementById('folder-item-template');
        if (!template) {
            // Create fallback element
            const element = document.createElement('div');
            element.className = 'folder-item';
            element.style.cssText = 'padding: 4px 8px; cursor: pointer;';
            
            const isSelected = this.selectedFolder === folderName;
            if (isSelected) {
                element.style.backgroundColor = 'var(--highlight-accent)';
                element.style.color = 'white';
            }
            
            element.innerHTML = `
                <span style="margin-right: 6px;">📁</span>
                <span style="font-size: 11px; font-weight: 500;">${folderName}</span>
            `;
            
            element.setAttribute('data-folder', folderName);
            return element;
        }

        const folderElement = template.content.cloneNode(true);
        const container = folderElement.querySelector('.folder-item');
        
        container.setAttribute('data-folder-id', folderName);
        
        const folderContent = container.querySelector('.folder-content');
        const folderNameElement = container.querySelector('.folder-name');
        
        if (folderNameElement) {
            folderNameElement.textContent = folderName;
        }
        
        // Apply selection styling
        if (this.selectedFolder === folderName) {
            folderContent.classList.add('selected');
        }
        
        return container;
    }

    // ========================================
    // INTERACTION HANDLERS
    // ========================================

    /**
     * Handle asset click for selection
     */
    handleAssetClick(e) {
        const assetElement = e.target.closest('.asset-item');
        if (!assetElement) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const assetId = assetElement.getAttribute('data-asset-id');
        const asset = this.assets.find(a => a.id === assetId);
        
        if (!asset) return;
        
        if (e.ctrlKey || e.metaKey) {
            // Multi-select
            this.toggleAssetSelection(assetId);
        } else {
            // Single select
            this.selectAsset(assetId);
        }
        
        console.log(`📁 AssetsPanel: Clicked asset ${assetId}`);
    }

    /**
     * Handle folder click for navigation
     */
    handleFolderClick(e) {
        const folderElement = e.target.closest('.folder-item, .root-folder');
        if (!folderElement) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const folderName = folderElement.getAttribute('data-folder') || '';
        this.selectFolder(folderName);
        
        console.log(`📁 AssetsPanel: Selected folder "${folderName}"`);
    }

    /**
     * Handle right-click context menu
     */
    handleAssetContextMenu(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const assetElement = e.target.closest('.asset-item');
        const assetId = assetElement ? assetElement.getAttribute('data-asset-id') : null;
        
        this.showContextMenu(e.clientX, e.clientY, assetId);
        
        console.log(`📁 AssetsPanel: Context menu at (${e.clientX}, ${e.clientY}), asset: ${assetId}`);
    }

    // ========================================
    // ASSET OPERATIONS
    // ========================================

    /**
     * Trigger file import dialog
     */
    triggerFileImport() {
        if (this.elements.importInput) {
            this.elements.importInput.click();
        } else {
            console.warn('📁 AssetsPanel: Import input not found');
        }
    }

    /**
     * Handle file import from input
     */
    handleFileImport(e) {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        console.log(`📁 AssetsPanel: Importing ${files.length} files`);
        
        files.forEach(file => {
            this.importFile(file);
        });
        
        // Clear input for next use
        e.target.value = '';
    }

    /**
     * Handle file drop import
     */
    handleFileDrop(e) {
        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;
        
        console.log(`📁 AssetsPanel: Dropped ${files.length} files`);
        
        files.forEach(file => {
            this.importFile(file);
        });
    }

    /**
     * Import a single file
     */
    importFile(file) {
        const asset = {
            id: `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            type: this.detectFileType(file),
            size: file.size,
            folder: this.selectedFolder,
            imported: Date.now(),
            file: file // Store file object for later processing
        };
        
        // Add to assets array
        this.assets.push(asset);
        
        // Emit import event
        if (window.EventBus) {
            window.EventBus.emit('assetImportRequested', {
                asset: asset,
                file: file
            });
        }
        
        // Re-render assets
        this.renderAssets();
        this.updateAssetCount();
        
        console.log(`📁 AssetsPanel: Imported ${file.name} (${this.formatFileSize(file.size)})`);
    }

    /**
     * Select a single asset
     */
    selectAsset(assetId) {
        const asset = this.assets.find(a => a.id === assetId);
        if (!asset) return;
        
        this.selectedAssets.clear();
        this.selectedAssets.add(assetId);
        
        this.updateSelectionUI();
        this.emitAssetSelection();
        
        console.log(`📁 AssetsPanel: Selected asset ${assetId}`);
    }

    /**
     * Toggle asset selection (for multi-select)
     */
    toggleAssetSelection(assetId) {
        if (this.selectedAssets.has(assetId)) {
            this.selectedAssets.delete(assetId);
        } else {
            this.selectedAssets.add(assetId);
        }
        
        this.updateSelectionUI();
        this.emitAssetSelection();
        
        console.log(`📁 AssetsPanel: Toggled selection for asset ${assetId}`);
    }

    /**
     * Select folder for filtering
     */
    selectFolder(folderName) {
        this.selectedFolder = folderName;
        this.renderFolders();
        this.renderAssets();
        
        console.log(`📁 AssetsPanel: Selected folder "${folderName}"`);
    }

    /**
     * Create new folder
     */
    createFolder() {
        const folderName = prompt('Enter folder name:');
        if (!folderName || this.folders.includes(folderName)) {
            return;
        }
        
        this.folders.push(folderName);
        this.renderFolders();
        
        console.log(`📁 AssetsPanel: Created folder "${folderName}"`);
    }

    /**
     * Change view mode between grid and list
     */
    changeViewMode(mode) {
        this.viewMode = mode;
        this.renderAssets();
        
        console.log(`📁 AssetsPanel: View mode changed to ${mode}`);
    }

    /**
     * Handle search input
     */
    handleSearch(searchTerm) {
        this.searchTerm = searchTerm.toLowerCase();
        this.renderAssets();
        
        console.log(`📁 AssetsPanel: Searching for "${searchTerm}"`);
    }

    // ========================================
    // CONTEXT MENU
    // ========================================

    /**
     * Show context menu at position
     */
    showContextMenu(x, y, assetId = null) {
        this.contextTarget = assetId;
        
        if (!this.elements.contextMenu) {
            console.warn('📁 AssetsPanel: Context menu element not found');
            return;
        }
        
        // Position and show menu
        this.elements.contextMenu.style.left = `${x}px`;
        this.elements.contextMenu.style.top = `${y}px`;
        this.elements.contextMenu.style.display = 'block';
        
        // Adjust position if menu goes off-screen
        const rect = this.elements.contextMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            this.elements.contextMenu.style.left = `${x - rect.width}px`;
        }
        if (rect.bottom > window.innerHeight) {
            this.elements.contextMenu.style.top = `${y - rect.height}px`;
        }
        
        // Set up context menu click handler
        this.elements.contextMenu.onclick = (e) => {
            const action = e.target.getAttribute('data-action');
            if (action) {
                this.handleContextMenuAction(action);
            }
        };
    }

    /**
     * Handle context menu actions
     */
    handleContextMenuAction(action) {
        this.hideContextMenu();
        
        switch (action) {
            case 'open':
                if (this.contextTarget) {
                    this.openAsset(this.contextTarget);
                }
                break;
            case 'rename':
                if (this.contextTarget) {
                    this.renameAsset(this.contextTarget);
                }
                break;
            case 'duplicate':
                if (this.contextTarget) {
                    this.duplicateAsset(this.contextTarget);
                }
                break;
            case 'add-to-scene':
                if (this.contextTarget) {
                    this.addAssetToScene(this.contextTarget);
                }
                break;
            case 'delete':
                if (this.contextTarget) {
                    this.deleteAsset(this.contextTarget);
                }
                break;
        }
        
        console.log(`📁 AssetsPanel: Context menu action: ${action}`);
    }

    /**
     * Hide context menu
     */
    hideContextMenu() {
        if (this.elements.contextMenu) {
            this.elements.contextMenu.style.display = 'none';
        }
        this.contextTarget = null;
    }

    // ========================================
    // UTILITY METHODS
    // ========================================

    /**
     * Get filtered assets based on folder and search
     */
    getFilteredAssets() {
        let filtered = this.assets;
        
        // Filter by folder
        if (this.selectedFolder) {
            filtered = filtered.filter(asset => asset.folder === this.selectedFolder);
        }
        
        // Filter by search term
        if (this.searchTerm) {
            filtered = filtered.filter(asset => 
                asset.name.toLowerCase().includes(this.searchTerm) ||
                asset.type.toLowerCase().includes(this.searchTerm)
            );
        }
        
        return filtered;
    }

    /**
     * Detect file type from file object
     */
    detectFileType(file) {
        const ext = file.name.split('.').pop().toLowerCase();
        
        if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) {
            return 'image';
        } else if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) {
            return 'video';
        } else if (['mp3', 'wav', 'aac', 'ogg'].includes(ext)) {
            return 'audio';
        } else {
            return 'other';
        }
    }

    /**
     * Get appropriate icon for asset type
     */
    getAssetIcon(assetType) {
        const icons = {
            'image': '🖼️',
            'video': '🎬',
            'audio': '🎵',
            'other': '📄'
        };
        
        return icons[assetType] || '📄';
    }

    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    /**
     * Format time for display
     */
    formatTime(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return `${Math.floor(diff / 86400000)}d ago`;
    }

    /**
     * Update selection UI
     */
    updateSelectionUI() {
        // Update visual selection state
        const assetElements = document.querySelectorAll('.asset-item');
        assetElements.forEach(element => {
            const assetId = element.getAttribute('data-asset-id');
            
            if (this.selectedAssets.has(assetId)) {
                element.classList.add('selected');
            } else {
                element.classList.remove('selected');
            }
        });
    }

    /**
     * Emit asset selection event via EventBus
     */
    emitAssetSelection() {
        if (!window.EventBus) return;
        
        const selectedAssets = Array.from(this.selectedAssets)
            .map(id => this.assets.find(asset => asset.id === id))
            .filter(asset => asset);
        
        if (selectedAssets.length === 1) {
            window.EventBus.emit('assetSelected', {
                asset: selectedAssets[0]
            });
        } else if (selectedAssets.length > 1) {
            window.EventBus.emit('assetsSelected', {
                assets: selectedAssets
            });
        }
    }

    /**
     * Update asset count display
     */
    updateAssetCount() {
        if (this.elements.assetsCount) {
            const filtered = this.getFilteredAssets();
            const total = this.assets.length;
            
            if (filtered.length === total) {
                this.elements.assetsCount.textContent = `${total} assets`;
            } else {
                this.elements.assetsCount.textContent = `${filtered.length} of ${total} assets`;
            }
        }
    }

    // ========================================
    // EVENT HANDLERS (EventBus events)
    // ========================================

    /**
     * Handle project loaded event
     */
    handleProjectLoaded(data) {
        console.log('📁 AssetsPanel: Project loaded', data);
        
        // Clear current assets and load project assets
        this.assets = data.assets || [];
        this.folders = data.assetFolders || [];
        this.selectedAssets.clear();
        this.selectedFolder = '';
        
        this.renderAssets();
        this.renderFolders();
        this.updateAssetCount();
    }

    /**
     * Handle project closed event
     */
    handleProjectClosed() {
        console.log('📁 AssetsPanel: Project closed');
        
        // Clear all assets
        this.assets = [];
        this.folders = [];
        this.selectedAssets.clear();
        this.selectedFolder = '';
        
        this.renderAssets();
        this.renderFolders();
        this.updateAssetCount();
    }

    // ========================================
    // ASSET ACTIONS (Placeholders for future backend integration)
    // ========================================

    /**
     * Open asset (placeholder)
     */
    openAsset(assetId) {
        const asset = this.assets.find(a => a.id === assetId);
        if (asset) {
            console.log(`📁 AssetsPanel: Opening asset ${asset.name}`);
            // TODO: Implement asset opening
        }
    }

    /**
     * Rename asset (placeholder)
     */
    renameAsset(assetId) {
        const asset = this.assets.find(a => a.id === assetId);
        if (asset) {
            const newName = prompt('Enter new name:', asset.name);
            if (newName && newName !== asset.name) {
                asset.name = newName;
                this.renderAssets();
                console.log(`📁 AssetsPanel: Renamed asset to ${newName}`);
            }
        }
    }

    /**
     * Duplicate asset (placeholder)
     */
    duplicateAsset(assetId) {
        const asset = this.assets.find(a => a.id === assetId);
        if (asset) {
            const duplicate = {
                ...asset,
                id: `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: `${asset.name} copy`,
                imported: Date.now()
            };
            
            this.assets.push(duplicate);
            this.renderAssets();
            this.updateAssetCount();
            
            console.log(`📁 AssetsPanel: Duplicated asset ${asset.name}`);
        }
    }

    /**
     * Add asset to scene (placeholder)
     */
    addAssetToScene(assetId) {
        const asset = this.assets.find(a => a.id === assetId);
        if (asset) {
            console.log(`📁 AssetsPanel: Adding asset ${asset.name} to scene`);
            // TODO: Implement add to scene functionality
        }
    }

    /**
     * Delete asset
     */
    deleteAsset(assetId) {
        const asset = this.assets.find(a => a.id === assetId);
        if (asset) {
            const confirmDelete = confirm(`Delete "${asset.name}"?`);
            if (confirmDelete) {
                this.assets = this.assets.filter(a => a.id !== assetId);
                this.selectedAssets.delete(assetId);
                this.renderAssets();
                this.updateAssetCount();
                
                console.log(`📁 AssetsPanel: Deleted asset ${asset.name}`);
            }
        }
    }

    /**
     * Test assets panel with mock data
     */
    test() {
        console.log('🧪 AssetsPanel: Running test...');
        
        const mockAssets = [
            {
                id: 'test-asset-1',
                name: 'test-image.jpg',
                type: 'image',
                size: 1024000,
                folder: '',
                imported: Date.now() - 3600000
            },
            {
                id: 'test-asset-2',
                name: 'test-video.mp4',
                type: 'video',
                size: 5242880,
                folder: 'videos',
                imported: Date.now() - 7200000
            },
            {
                id: 'test-asset-3',
                name: 'test-audio.mp3',
                type: 'audio',
                size: 2097152,
                folder: 'audio',
                imported: Date.now() - 1800000
            }
        ];
        
        this.update({
            assets: mockAssets,
            folders: ['videos', 'audio', 'images']
        });
        
        console.log('✅ AssetsPanel: Test completed');
    }

    /**
     * Component cleanup
     */
    destroy() {
        // Clear data
        this.assets = [];
        this.folders = [];
        this.selectedAssets.clear();
        
        console.log('📁 AssetsPanel behaviour destroyed');
    }
}

// Export class to global window for BaseComponent integration
window.AssetsPanelBehaviour = AssetsPanelBehaviour;

console.log('📁 AssetsPanel behaviour loaded');
console.log('✅ AssetsPanelBehaviour exposed to window object');