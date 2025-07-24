/**
 * ProjectManager - Handles all project lifecycle operations
 * Coordinates between WebSocket communication and EventBus
 */

class ProjectManager {
    constructor(wsClient, eventBus) {
        this.wsClient = wsClient;
        this.eventBus = eventBus;
        this.currentProject = null;
        
        console.log('📁 ProjectManager initialized');
        
        // Set up WebSocket message handlers for project events
        this.setupMessageHandlers();
    }

    /**
     * Set up WebSocket message handlers for project-related events
     */
    setupMessageHandlers() {
        // Project management responses
        this.wsClient.on('projectCreated', (data) => {
            console.log('✅ Project created:', data);
            this.handleProjectUpdate(data);
            this.eventBus.emit('showNotification', {
                message: 'Project created successfully!',
                type: 'success'
            });
        });

        this.wsClient.on('projectLoaded', (data) => {
            console.log('✅ Project loaded:', data);
            this.handleProjectUpdate(data);
            this.eventBus.emit('showNotification', {
                message: 'Project loaded successfully!',
                type: 'success'
            });
        });

        this.wsClient.on('projectSaved', (data) => {
            console.log('✅ Project saved:', data);
            this.handleProjectUpdate(data.projectInfo);
            this.eventBus.emit('showNotification', {
                message: 'Project saved successfully!',
                type: 'success'
            });
        });

        this.wsClient.on('projectClosed', (data) => {
            console.log('✅ Project closed:', data);
            this.handleProjectUpdate(data);
            this.eventBus.emit('showNotification', {
                message: 'Project closed',
                type: 'info'
            });
        });

        this.wsClient.on('projectUpdated', (data) => {
            console.log('✅ Project updated:', data);
            this.handleProjectUpdate(data);
            this.eventBus.emit('showNotification', {
                message: 'Project settings updated',
                type: 'success'
            });
        });

        this.wsClient.on('projectInfo', (data) => {
            console.log('📊 Project info received:', data);
            this.handleProjectUpdate(data);
        });

        this.wsClient.on('assetsPath', (data) => {
            console.log('📁 Assets path info:', data);
            this.eventBus.emit('showNotification', {
                message: `Assets folder: ${data.assetsPath} (${data.exists ? 'exists' : 'missing'})`,
                type: data.exists ? 'success' : 'warning'
            });
        });
    }

    /**
     * Create a new project
     */
    async createNewProject() {
        try {
            const projectName = await this.showInputDialog('Create New Project', 'Project Name:', 'Untitled Project');
            if (!projectName) return;

            // Auto-save with generated filename
            const filePath = `C:\\Users\\PC\\project-flow\\test-projects\\${projectName.replace(/[^a-zA-Z0-9]/g, '-')}.flow`;

            await this.wsClient.send('createProject', {
                name: projectName,
                filePath: filePath
            });

            this.eventBus.emit('closeHomeDropdown');
            
        } catch (error) {
            console.error('❌ Failed to create project:', error);
            this.eventBus.emit('showNotification', {
                message: 'Failed to create project',
                type: 'error'
            });
        }
    }

    /**
     * Save current project
     */
    async saveProject() {
        try {
            if (!this.currentProject?.hasProject) {
                this.eventBus.emit('showNotification', {
                    message: 'No project to save',
                    type: 'warning'
                });
                return;
            }

            await this.wsClient.send('saveProject', {});
            this.eventBus.emit('closeHomeDropdown');
            
        } catch (error) {
            console.error('❌ Failed to save project:', error);
            this.eventBus.emit('showNotification', {
                message: 'Failed to save project',
                type: 'error'
            });
        }
    }

    /**
     * Save project with new location
     */
    async saveAsProject() {
        try {
            if (!this.currentProject?.hasProject) {
                this.eventBus.emit('showNotification', {
                    message: 'No project to save',
                    type: 'warning'
                });
                return;
            }

            const filePath = await this.selectSaveLocation(this.currentProject.name);
            if (!filePath) return;

            await this.wsClient.send('saveProject', {
                filePath: filePath
            });

            this.eventBus.emit('closeHomeDropdown');
            
        } catch (error) {
            console.error('❌ Failed to save project:', error);
            this.eventBus.emit('showNotification', {
                message: 'Failed to save project',
                type: 'error'
            });
        }
    }

    /**
     * Load existing project
     */
    async loadProject() {
        try {
            const filePath = await this.selectLoadLocation();
            if (!filePath) return;

            await this.wsClient.send('loadProject', {
                filePath: filePath
            });

            this.eventBus.emit('closeHomeDropdown');
            
        } catch (error) {
            console.error('❌ Failed to load project:', error);
            this.eventBus.emit('showNotification', {
                message: 'Failed to load project',
                type: 'error'
            });
        }
    }

    /**
     * Close current project
     */
    async closeProject() {
        try {
            if (!this.currentProject?.hasProject) {
                this.eventBus.emit('showNotification', {
                    message: 'No project to close',
                    type: 'warning'
                });
                return;
            }

            const confirmClose = confirm('Close current project? Any unsaved changes will be lost.');
            if (!confirmClose) return;

            await this.wsClient.send('closeProject', {});
            this.eventBus.emit('closeHomeDropdown');
            
        } catch (error) {
            console.error('❌ Failed to close project:', error);
            this.eventBus.emit('showNotification', {
                message: 'Failed to close project',
                type: 'error'
            });
        }
    }

    /**
     * Edit project settings
     */
    async editProjectSettings() {
        try {
            if (!this.currentProject?.hasProject) {
                this.eventBus.emit('showNotification', {
                    message: 'No project to edit',
                    type: 'warning'
                });
                return;
            }

            const newName = await this.showInputDialog('Edit Project Name', 'Project Name:', this.currentProject.name);
            if (newName === null) return;

            const newWidth = await this.showInputDialog('Edit Canvas Width', 'Canvas Width:', this.currentProject.canvas.width.toString());
            if (newWidth === null) return;

            const newHeight = await this.showInputDialog('Edit Canvas Height', 'Canvas Height:', this.currentProject.canvas.height.toString());
            if (newHeight === null) return;

            await this.wsClient.send('updateProjectSettings', {
                name: newName || this.currentProject.name,
                canvas: {
                    width: parseInt(newWidth) || this.currentProject.canvas.width,
                    height: parseInt(newHeight) || this.currentProject.canvas.height,
                    backgroundColor: this.currentProject.canvas.backgroundColor,
                    frameRate: this.currentProject.canvas.frameRate
                }
            });

            this.eventBus.emit('closeHomeDropdown');
            
        } catch (error) {
            console.error('❌ Failed to update project settings:', error);
            this.eventBus.emit('showNotification', {
                message: 'Failed to update project settings',
                type: 'error'
            });
        }
    }

    /**
     * Request current project info from backend
     */
    async requestProjectInfo() {
        try {
            await this.wsClient.send('getProjectInfo', {});
        } catch (error) {
            console.error('❌ Failed to get project info:', error);
        }
    }

    /**
     * Handle project update data and emit EventBus events
     */
    handleProjectUpdate(data) {
        this.currentProject = data;
        
        // Emit specific events for UI components to handle
        this.eventBus.emit('updateCanvasInfo', data);
        this.eventBus.emit('updateWindowTitle', data);
        this.eventBus.emit('updateCanvasOverlay', data);
        
        // Emit general project data update
        this.eventBus.emit('projectDataUpdated', data);
    }

    /**
     * Show input dialog (Modal dialog implementation)
     */
    async showInputDialog(title, label, defaultValue = '') {
        return new Promise((resolve) => {
            // Create modal dialog
            const dialog = document.createElement('div');
            dialog.className = 'modal-dialog';
            dialog.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        <button class="modal-close">×</button>
                    </div>
                    <div class="modal-body">
                        <label>${label}</label>
                        <input type="text" class="modal-input" value="${defaultValue}" />
                    </div>
                    <div class="modal-footer">
                        <button class="btn-cancel">Cancel</button>
                        <button class="btn-ok">OK</button>
                    </div>
                </div>
            `;

            document.body.appendChild(dialog);

            const input = dialog.querySelector('.modal-input');
            const okBtn = dialog.querySelector('.btn-ok');
            const cancelBtn = dialog.querySelector('.btn-cancel');
            const closeBtn = dialog.querySelector('.modal-close');

            // Focus input and select text
            input.focus();
            input.select();

            const cleanup = () => {
                document.body.removeChild(dialog);
            };

            const handleOk = () => {
                const value = input.value.trim();
                cleanup();
                resolve(value || null);
            };

            const handleCancel = () => {
                cleanup();
                resolve(null);
            };

            // Event listeners
            okBtn.addEventListener('click', handleOk);
            cancelBtn.addEventListener('click', handleCancel);
            closeBtn.addEventListener('click', handleCancel);
            
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleOk();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    handleCancel();
                }
            });
        });
    }

    /**
     * Select save location for project
     */
    async selectSaveLocation(defaultName) {
        // For development, auto-generate filename
        const fileName = defaultName.replace(/[^a-zA-Z0-9]/g, '-');
        return `C:\\Users\\PC\\project-flow\\test-projects\\${fileName}.flow`;
    }

    /**
     * Select load location for project
     */
    async selectLoadLocation() {
        // For development, ask for filename only
        const fileName = await this.showInputDialog('Load Project', 'Project filename (without .flow):', 'project-name');
        if (!fileName) return null;
        
        return `C:\\Users\\PC\\project-flow\\test-projects\\${fileName}.flow`;
    }

    /**
     * Get current project data
     */
    getCurrentProject() {
        return this.currentProject;
    }

    /**
     * Check if project is loaded
     */
    hasProject() {
        return this.currentProject?.hasProject || false;
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProjectManager;
}

// Make available globally for browser
if (typeof window !== 'undefined') {
    window.ProjectManager = ProjectManager;
}