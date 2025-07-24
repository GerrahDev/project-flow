/**
 * Timeline Panel Behaviour - Foundation for Full Timeline System
 * Handles timeline playback, tracks, and keyframes
 */

class TimelinePanelBehaviour {
    constructor() {
        console.log('🎬 TimelinePanel behaviour created');
        
        // Core timeline state (Foundation for ProjectTimeline integration)
        this.timeline = {
            currentTime: 0,        // Current time in milliseconds
            duration: 10000,       // Total duration in milliseconds  
            zoom: 1.0,            // Timeline zoom level
            isPlaying: false,     // Playback state
            frameRate: 30,        // Frames per second
            pixelsPerSecond: 50   // Zoom-dependent pixel scaling
        };
        
        // Track management (Foundation for PropertyTrack system)
        this.tracks = [];              // Objects with timeline tracks
        this.expandedTracks = new Set(); // Track expansion state
        this.selectedTracks = new Set(); // Selected track IDs
        
        // Timeline mode (Foundation for VideoGroup/MotionGroup/AnimationGroup)
        this.timelineMode = 'motion';   // 'motion', 'video', 'animation'
        
        // Keyframe system foundation
        this.keyframes = new Map();     // objectId -> property -> keyframes
        this.selectedKeyframes = new Set();
        
        // UI element references
        this.elements = {};
        
        // Playback foundation
        this.playbackState = 'stopped'; // 'playing', 'paused', 'stopped'
        this.playbackTimer = null;
        
        // Interaction state
        this.isDraggingPlayhead = false;
        this.dragOffset = 0;
    }

    /**
     * Initialize the timeline panel
     */
    async init() {
        console.log('🎬 TimelinePanel behaviour initializing...');
        
        // Get UI element references
        this.setupElementReferences();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Set up EventBus subscriptions
        this.setupEventBusSubscriptions();
        
        // Initialize timeline state
        this.initializeTimelineState();
        
        // Render initial timeline
        this.renderTimeline();
        
        console.log('✅ TimelinePanel behaviour initialized');
    }

    /**
     * Update timeline with new data (called by BaseComponent)
     */
    update(data) {
        console.log('🎬 TimelinePanel: Updating with data', data);
        
        if (!data) return;
        
        // Update timeline settings if provided
        if (data.timeline) {
            this.timeline.duration = data.timeline.duration || this.timeline.duration;
            this.timeline.frameRate = data.timeline.frameRate || this.timeline.frameRate;
            this.timeline.currentTime = data.timeline.currentTime || this.timeline.currentTime;
            
            this.updateTimeDisplay();
            this.updateFrameRateDisplay();
        }
        
        // Update tracks from objects
        if (data.objects) {
            this.loadTracksFromObjects(data.objects);
            this.renderTracks();
        }
        
        // Re-render timeline if needed
        this.renderTimelineRuler();
        this.updatePlayheadPosition();
        
        console.log('✅ TimelinePanel: Updated successfully');
    }

    /**
     * Get references to UI elements
     */
    setupElementReferences() {
        // Playback controls
        this.elements.playBtn = document.getElementById('timeline-play');
        this.elements.pauseBtn = document.getElementById('timeline-pause');
        this.elements.stopBtn = document.getElementById('timeline-stop');
        this.elements.beginningBtn = document.getElementById('timeline-beginning');
        this.elements.endBtn = document.getElementById('timeline-end');
        this.elements.frameBackBtn = document.getElementById('timeline-frame-back');
        this.elements.frameForwardBtn = document.getElementById('timeline-frame-forward');
        
        // Time display
        this.elements.currentTimeDisplay = document.getElementById('timeline-current-time');
        this.elements.totalDurationDisplay = document.getElementById('timeline-total-duration');
        this.elements.frameInfoDisplay = document.getElementById('timeline-frame-info');
        
        // Timeline mode
        this.elements.modeSelector = document.getElementById('timeline-mode');
        
        // Zoom controls
        this.elements.zoomOutBtn = document.getElementById('timeline-zoom-out');
        this.elements.zoomInBtn = document.getElementById('timeline-zoom-in');
        this.elements.fitBtn = document.getElementById('timeline-fit');
        this.elements.zoomLevelDisplay = document.getElementById('timeline-zoom-level');
        
        // Timeline ruler and playhead
        this.elements.ruler = document.getElementById('timeline-ruler');
        this.elements.playhead = document.getElementById('timeline-playhead');
        this.elements.markers = document.getElementById('timeline-markers');
        this.elements.timeLabels = document.getElementById('timeline-time-labels');
        
        // Track areas
        this.elements.trackHeaders = document.getElementById('timeline-track-headers');
        this.elements.trackContent = document.getElementById('timeline-track-content');
        
        // Footer info
        this.elements.fpsDisplay = document.getElementById('timeline-fps');
        this.elements.objectCountDisplay = document.getElementById('timeline-object-count');
        this.elements.snapCheckbox = document.getElementById('timeline-snap');
        this.elements.onionSkinCheckbox = document.getElementById('timeline-onion-skin');
        
        // Context menu
        this.elements.contextMenu = document.getElementById('timeline-context-menu');
        
        // Log which elements were found/missing
        let foundElements = 0;
        let totalElements = 0;
        Object.entries(this.elements).forEach(([key, element]) => {
            totalElements++;
            if (element) {
                foundElements++;
            } else {
                console.warn(`🎬 Timeline: Missing element: ${key}`);
            }
        });
        
        console.log(`🎬 Timeline: Found ${foundElements}/${totalElements} UI elements`);
    }

    /**
     * Set up event listeners for timeline controls
     */
    setupEventListeners() {
        // Playback controls
        if (this.elements.playBtn) {
            this.elements.playBtn.addEventListener('click', () => this.togglePlayback());
        }
        
        if (this.elements.pauseBtn) {
            this.elements.pauseBtn.addEventListener('click', () => this.pause());
        }
        
        if (this.elements.stopBtn) {
            this.elements.stopBtn.addEventListener('click', () => this.stop());
        }
        
        if (this.elements.beginningBtn) {
            this.elements.beginningBtn.addEventListener('click', () => this.seekToBeginning());
        }
        
        if (this.elements.endBtn) {
            this.elements.endBtn.addEventListener('click', () => this.seekToEnd());
        }
        
        if (this.elements.frameBackBtn) {
            this.elements.frameBackBtn.addEventListener('click', () => this.stepFrame(-1));
        }
        
        if (this.elements.frameForwardBtn) {
            this.elements.frameForwardBtn.addEventListener('click', () => this.stepFrame(1));
        }
        
        // Timeline mode selector
        if (this.elements.modeSelector) {
            this.elements.modeSelector.addEventListener('change', (e) => this.changeTimelineMode(e.target.value));
        }
        
        // Zoom controls
        if (this.elements.zoomOutBtn) {
            this.elements.zoomOutBtn.addEventListener('click', () => this.zoomOut());
        }
        
        if (this.elements.zoomInBtn) {
            this.elements.zoomInBtn.addEventListener('click', () => this.zoomIn());
        }
        
        if (this.elements.fitBtn) {
            this.elements.fitBtn.addEventListener('click', () => this.fitToWindow());
        }
        
        // Timeline ruler interaction (seeking)
        if (this.elements.ruler) {
            this.elements.ruler.addEventListener('click', (e) => this.handleRulerClick(e));
        }
        
        // Playhead dragging
        if (this.elements.playhead) {
            this.elements.playhead.addEventListener('mousedown', (e) => this.startPlayheadDrag(e));
        }
        
        // Global mouse events for playhead dragging
        document.addEventListener('mousemove', (e) => this.handlePlayheadDrag(e));
        document.addEventListener('mouseup', () => this.endPlayheadDrag());
        
        // Settings checkboxes
        if (this.elements.snapCheckbox) {
            this.elements.snapCheckbox.addEventListener('change', (e) => this.toggleSnap(e.target.checked));
        }
        
        if (this.elements.onionSkinCheckbox) {
            this.elements.onionSkinCheckbox.addEventListener('change', (e) => this.toggleOnionSkin(e.target.checked));
        }
        
        console.log('🎬 Timeline: Event listeners set up');
    }

    /**
     * Set up EventBus subscriptions for component integration
     */
    setupEventBusSubscriptions() {
        // Listen for hierarchy changes to update tracks
        window.EventBus.on('objectCreated', (data) => this.handleObjectCreated(data));
        window.EventBus.on('objectDeleted', (data) => this.handleObjectDeleted(data));
        window.EventBus.on('objectUpdated', (data) => this.handleObjectUpdated(data));
        window.EventBus.on('objectSelected', (data) => this.handleObjectSelected(data));
        window.EventBus.on('selectionCleared', () => this.handleSelectionCleared());
        
        // Listen for project changes
        window.EventBus.on('projectLoaded', (data) => this.handleProjectLoaded(data));
        window.EventBus.on('projectClosed', () => this.handleProjectClosed());
        window.EventBus.on('projectUpdated', (data) => this.handleProjectUpdated(data));
        
        console.log('🎬 Timeline: EventBus subscriptions set up');
    }

    /**
     * Initialize timeline state and UI
     */
    initializeTimelineState() {
        this.updateTimeDisplay();
        this.updateZoomDisplay();
        this.updateFrameRateDisplay();
        this.updatePlaybackButtons();
        
        // Set initial timeline mode
        if (this.elements.modeSelector) {
            this.elements.modeSelector.value = this.timelineMode;
        }
    }

    /**
     * Render the entire timeline (tracks, ruler, etc.)
     */
    renderTimeline() {
        console.log('🎬 TimelinePanel: Rendering timeline...');
        
        this.renderTimelineRuler();
        this.renderTracks();
        this.updatePlayheadPosition();
        
        console.log('🎬 TimelinePanel: Timeline rendered');
    }

    /**
     * Render timeline ruler with time markers
     */
    renderTimelineRuler() {
        if (!this.elements.markers || !this.elements.timeLabels) return;
        
        // Clear existing markers and labels
        this.elements.markers.innerHTML = '';
        this.elements.timeLabels.innerHTML = '';
        
        const rulerWidth = this.elements.ruler ? this.elements.ruler.clientWidth : 500;
        const timelineWidth = this.timeline.duration * this.timeline.pixelsPerSecond / 1000;
        
        // Generate time markers every second
        const markerInterval = 1000; // 1 second in milliseconds
        const markerSpacing = (markerInterval * this.timeline.pixelsPerSecond) / 1000;
        
        for (let time = 0; time <= this.timeline.duration; time += markerInterval) {
            const position = (time * this.timeline.pixelsPerSecond) / 1000;
            
            // Create time label
            const label = document.createElement('div');
            label.style.position = 'absolute';
            label.style.left = `${position}px`;
            label.style.top = '2px';
            label.style.fontSize = '9px';
            label.style.color = 'var(--text-secondary)';
            label.textContent = this.formatTime(time);
            this.elements.timeLabels.appendChild(label);
        }
    }

    /**
     * Render tracks based on current objects
     */
    renderTracks() {
        if (!this.elements.trackHeaders || !this.elements.trackContent) return;
        
        // Clear existing tracks
        this.elements.trackHeaders.innerHTML = '';
        this.elements.trackContent.innerHTML = '';
        
        // Render each track
        this.tracks.forEach(track => {
            this.renderTrackHeader(track);
            this.renderTrackContent(track);
        });
        
        // Update object count
        this.updateObjectCount();
    }

    /**
     * Render a single track header
     */
    renderTrackHeader(track) {
        const template = document.getElementById('timeline-track-header-template');
        if (!template) {
            // Create simple fallback if template missing
            const header = document.createElement('div');
            header.className = 'track-header-fallback';
            header.style.cssText = 'padding: 4px 8px; border-bottom: 1px solid #333; color: #ccc; font-size: 11px;';
            header.textContent = `${this.getTrackIcon(track.objectType)} ${track.objectName}`;
            header.setAttribute('data-object-id', track.objectId);
            
            header.addEventListener('click', () => this.selectTrack(track.objectId));
            
            this.elements.trackHeaders.appendChild(header);
            return;
        }
        
        const headerElement = template.content.cloneNode(true);
        const header = headerElement.querySelector('.track-header');
        
        // Set track data
        header.setAttribute('data-object-id', track.objectId);
        
        // Set track icon based on type
        const icon = header.querySelector('.track-icon');
        if (icon) icon.textContent = this.getTrackIcon(track.objectType);
        
        // Set track name
        const name = header.querySelector('.track-name');
        if (name) name.textContent = track.objectName;
        
        // Set up expand button
        const expandBtn = header.querySelector('.track-expand-btn');
        if (expandBtn) {
            if (this.expandedTracks.has(track.objectId)) {
                expandBtn.classList.add('expanded');
            }
            
            expandBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleTrackExpansion(track.objectId);
            });
        }
        
        header.addEventListener('click', () => {
            this.selectTrack(track.objectId);
        });
        
        this.elements.trackHeaders.appendChild(headerElement);
    }

    /**
     * Render a single track content
     */
    renderTrackContent(track) {
        const template = document.getElementById('timeline-track-content-template');
        if (!template) {
            // Create simple fallback if template missing
            const content = document.createElement('div');
            content.className = 'track-content-fallback';
            content.style.cssText = 'height: 20px; border-bottom: 1px solid #333; position: relative; background: #2a2a2a;';
            content.setAttribute('data-object-id', track.objectId);
            
            // Add simple timeline bar
            const bar = document.createElement('div');
            bar.style.cssText = 'position: absolute; top: 2px; height: 16px; background: #DE3076; border-radius: 2px;';
            const startPosition = (track.startTime * this.timeline.pixelsPerSecond) / 1000;
            const duration = (track.duration * this.timeline.pixelsPerSecond) / 1000;
            bar.style.left = `${startPosition}px`;
            bar.style.width = `${duration}px`;
            
            content.appendChild(bar);
            this.elements.trackContent.appendChild(content);
            return;
        }
        
        const contentElement = template.content.cloneNode(true);
        const content = contentElement.querySelector('.track-content');
        
        // Set track data
        content.setAttribute('data-object-id', track.objectId);
        
        // Set up timeline bar
        const timelineBar = content.querySelector('.track-timeline-bar');
        if (timelineBar) {
            const startPosition = (track.startTime * this.timeline.pixelsPerSecond) / 1000;
            const duration = (track.duration * this.timeline.pixelsPerSecond) / 1000;
            
            timelineBar.style.left = `${startPosition}px`;
            timelineBar.style.width = `${duration}px`;
        }
        
        // Add property tracks if expanded
        if (this.expandedTracks.has(track.objectId)) {
            this.renderPropertyTracks(content, track);
        }
        
        this.elements.trackContent.appendChild(contentElement);
    }

    /**
     * Render property tracks for an expanded object
     */
    renderPropertyTracks(parentElement, track) {
        const propertyTracksContainer = parentElement.querySelector('.property-tracks');
        if (!propertyTracksContainer) return;
        
        propertyTracksContainer.style.display = 'block';
        propertyTracksContainer.innerHTML = '';
        
        // Add standard property tracks
        const properties = ['Position X', 'Position Y', 'Scale X', 'Scale Y', 'Rotation', 'Opacity'];
        
        properties.forEach(property => {
            const template = document.getElementById('timeline-property-track-template');
            if (!template) return;
            
            const propertyElement = template.content.cloneNode(true);
            const propertyTrack = propertyElement.querySelector('.property-track');
            
            propertyTrack.setAttribute('data-property', property.toLowerCase().replace(' ', '.'));
            
            const propertyName = propertyTrack.querySelector('.property-name');
            if (propertyName) propertyName.textContent = property;
            
            propertyTracksContainer.appendChild(propertyElement);
        });
    }

    // =================================================================
    // PLAYBACK CONTROLS
    // =================================================================

    /**
     * Toggle play/pause
     */
    togglePlayback() {
        console.log('🎬 Timeline: Toggle playback clicked');
        if (this.timeline.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    /**
     * Start playback
     */
    play() {
        this.timeline.isPlaying = true;
        this.playbackState = 'playing';
        
        // Start playback timer
        this.playbackTimer = setInterval(() => {
            this.timeline.currentTime += 1000 / this.timeline.frameRate;
            
            if (this.timeline.currentTime >= this.timeline.duration) {
                this.stop();
                return;
            }
            
            this.updateTimeDisplay();
            this.updatePlayheadPosition();
            
            // Emit timeline seek event
            window.EventBus.emit('timelineSeek', {
                currentTime: this.timeline.currentTime,
                frame: this.getCurrentFrame()
            });
            
        }, 1000 / this.timeline.frameRate);
        
        this.updatePlaybackButtons();
        
        // Emit playback state change
        window.EventBus.emit('timelinePlaying', {
            isPlaying: true,
            currentTime: this.timeline.currentTime
        });
        
        console.log('🎬 Timeline: Playback started');
    }

    /**
     * Pause playback
     */
    pause() {
        this.timeline.isPlaying = false;
        this.playbackState = 'paused';
        
        if (this.playbackTimer) {
            clearInterval(this.playbackTimer);
            this.playbackTimer = null;
        }
        
        this.updatePlaybackButtons();
        
        // Emit playback state change
        window.EventBus.emit('timelinePlaying', {
            isPlaying: false,
            currentTime: this.timeline.currentTime
        });
        
        console.log('🎬 Timeline: Playback paused');
    }

    /**
     * Stop playback and reset to beginning
     */
    stop() {
        this.timeline.isPlaying = false;
        this.playbackState = 'stopped';
        
        if (this.playbackTimer) {
            clearInterval(this.playbackTimer);
            this.playbackTimer = null;
        }
        
        this.timeline.currentTime = 0;
        this.updateTimeDisplay();
        this.updatePlayheadPosition();
        this.updatePlaybackButtons();
        
        // Emit playback state change
        window.EventBus.emit('timelinePlaying', {
            isPlaying: false,
            currentTime: this.timeline.currentTime
        });
        
        console.log('🎬 Timeline: Playback stopped');
    }

    /**
     * Seek to beginning
     */
    seekToBeginning() {
        this.seekToTime(0);
    }

    /**
     * Seek to end
     */
    seekToEnd() {
        this.seekToTime(this.timeline.duration);
    }

    /**
     * Step frame by frame
     */
    stepFrame(direction) {
        const frameTime = 1000 / this.timeline.frameRate;
        const newTime = Math.max(0, Math.min(this.timeline.duration, 
            this.timeline.currentTime + (direction * frameTime)));
        this.seekToTime(newTime);
    }

    /**
     * Seek to specific time
     */
    seekToTime(time) {
        this.timeline.currentTime = Math.max(0, Math.min(this.timeline.duration, time));
        this.updateTimeDisplay();
        this.updatePlayheadPosition();
        
        // Emit timeline seek event
        window.EventBus.emit('timelineSeek', {
            currentTime: this.timeline.currentTime,
            frame: this.getCurrentFrame()
        });
        
        console.log(`🎬 Timeline: Seeked to ${this.formatTime(this.timeline.currentTime)}`);
    }

    // =================================================================
    // TIMELINE INTERACTION
    // =================================================================

    /**
     * Handle ruler click for seeking
     */
    handleRulerClick(e) {
        if (this.isDraggingPlayhead) return;
        
        const rect = this.elements.ruler.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const time = (clickX / this.timeline.pixelsPerSecond) * 1000;
        
        this.seekToTime(time);
    }

    /**
     * Start playhead dragging
     */
    startPlayheadDrag(e) {
        e.preventDefault();
        this.isDraggingPlayhead = true;
        
        const rect = this.elements.ruler.getBoundingClientRect();
        this.dragOffset = e.clientX - rect.left;
        
        // Pause playback during drag
        if (this.timeline.isPlaying) {
            this.pause();
        }
    }

    /**
     * Handle playhead dragging
     */
    handlePlayheadDrag(e) {
        if (!this.isDraggingPlayhead) return;
        
        const rect = this.elements.ruler.getBoundingClientRect();
        const dragX = e.clientX - rect.left;
        const time = (dragX / this.timeline.pixelsPerSecond) * 1000;
        
        this.seekToTime(time);
    }

    /**
     * End playhead dragging
     */
    endPlayheadDrag() {
        this.isDraggingPlayhead = false;
    }

    // =================================================================
    // TRACK MANAGEMENT
    // =================================================================

    /**
     * Toggle track expansion (show/hide property tracks)
     */
    toggleTrackExpansion(objectId) {
        if (this.expandedTracks.has(objectId)) {
            this.expandedTracks.delete(objectId);
        } else {
            this.expandedTracks.add(objectId);
        }
        
        this.renderTracks();
        console.log(`🎬 Timeline: Toggled expansion for track ${objectId}`);
    }

    /**
     * Select a track
     */
    selectTrack(objectId) {
        // Clear previous selection
        this.selectedTracks.clear();
        this.selectedTracks.add(objectId);
        
        // Update UI
        document.querySelectorAll('.track-header, .track-header-fallback').forEach(header => {
            header.classList.remove('selected');
        });
        
        const selectedHeader = document.querySelector(`[data-object-id="${objectId}"]`);
        if (selectedHeader) {
            selectedHeader.classList.add('selected');
            selectedHeader.style.backgroundColor = 'var(--highlight-accent)';
        }
        
        // Emit track selection event
        window.EventBus.emit('trackSelected', {
            objectId: objectId,
            trackIds: Array.from(this.selectedTracks)
        });
        
        console.log(`🎬 Timeline: Selected track ${objectId}`);
    }

    // =================================================================
    // ZOOM CONTROLS
    // =================================================================

    /**
     * Zoom in timeline
     */
    zoomIn() {
        this.timeline.zoom = Math.min(5.0, this.timeline.zoom * 1.5);
        this.timeline.pixelsPerSecond = 50 * this.timeline.zoom;
        this.updateZoomDisplay();
        this.renderTimelineRuler();
        this.renderTracks();
        console.log(`🎬 Timeline: Zoomed in to ${Math.round(this.timeline.zoom * 100)}%`);
    }

    /**
     * Zoom out timeline
     */
    zoomOut() {
        this.timeline.zoom = Math.max(0.1, this.timeline.zoom / 1.5);
        this.timeline.pixelsPerSecond = 50 * this.timeline.zoom;
        this.updateZoomDisplay();
        this.renderTimelineRuler();
        this.renderTracks();
        console.log(`🎬 Timeline: Zoomed out to ${Math.round(this.timeline.zoom * 100)}%`);
    }

    /**
     * Fit timeline to window
     */
    fitToWindow() {
        const containerWidth = this.elements.trackContent ? this.elements.trackContent.clientWidth : 500;
        const timelineWidth = this.timeline.duration / 1000;
        this.timeline.zoom = containerWidth / (timelineWidth * 50);
        this.timeline.pixelsPerSecond = 50 * this.timeline.zoom;
        this.updateZoomDisplay();
        this.renderTimelineRuler();
        this.renderTracks();
        console.log(`🎬 Timeline: Fit to window at ${Math.round(this.timeline.zoom * 100)}%`);
    }

    // =================================================================
    // EVENT HANDLERS (EventBus Integration)
    // =================================================================

    /**
     * Handle object created in hierarchy
     */
    handleObjectCreated(data) {
        console.log('🎬 Timeline: Object created', data);
        
        if (data.object) {
            const track = this.createTrackFromObject(data.object);
            this.tracks.push(track);
            this.renderTracks();
        }
    }

    /**
     * Handle object deleted in hierarchy
     */
    handleObjectDeleted(data) {
        console.log('🎬 Timeline: Object deleted', data);
        
        if (data.objectId) {
            this.tracks = this.tracks.filter(track => track.objectId !== data.objectId);
            this.expandedTracks.delete(data.objectId);
            this.selectedTracks.delete(data.objectId);
            this.renderTracks();
        }
    }

    /**
     * Handle object updated in hierarchy
     */
    handleObjectUpdated(data) {
        console.log('🎬 Timeline: Object updated', data);
        
        // Update track if it exists
        const track = this.tracks.find(t => t.objectId === data.objectId);
        if (track && data.object) {
            track.objectName = data.object.name || track.objectName;
            this.renderTracks();
        }
    }

    /**
     * Handle object selected in hierarchy
     */
    handleObjectSelected(data) {
        console.log('🎬 Timeline: Object selected', data);
        
        if (data.selectedIds && data.selectedIds.length > 0) {
            const objectId = data.selectedIds[0]; // Select first object
            this.selectTrack(objectId);
        }
    }

    /**
     * Handle selection cleared in hierarchy
     */
    handleSelectionCleared() {
        console.log('🎬 Timeline: Selection cleared');
        
        this.selectedTracks.clear();
        
        // Update UI
        document.querySelectorAll('.track-header, .track-header-fallback').forEach(header => {
            header.classList.remove('selected');
            header.style.backgroundColor = '';
        });
    }

    /**
     * Handle project loaded
     */
    handleProjectLoaded(data) {
        console.log('🎬 Timeline: Project loaded', data);
        
        // Update timeline from project data
        if (data.timeline) {
            this.timeline.duration = data.timeline.duration || 10000;
            this.timeline.frameRate = data.timeline.frameRate || 30;
        }
        
        // Load tracks from objects
        this.loadTracksFromProject(data);
        this.renderTimeline();
    }

    /**
     * Handle project closed
     */
    handleProjectClosed() {
        console.log('🎬 Timeline: Project closed');
        
        // Reset timeline state
        this.tracks = [];
        this.expandedTracks.clear();
        this.selectedTracks.clear();
        this.timeline.currentTime = 0;
        this.timeline.duration = 10000;
        
        this.stop();
        this.renderTimeline();
    }

    /**
     * Handle project updated
     */
    handleProjectUpdated(data) {
        console.log('🎬 Timeline: Project updated', data);
        
        // Update timeline settings if changed
        if (data.timeline) {
            this.timeline.duration = data.timeline.duration || this.timeline.duration;
            this.timeline.frameRate = data.timeline.frameRate || this.timeline.frameRate;
            this.renderTimelineRuler();
        }
    }

    // =================================================================
    // UTILITY METHODS
    // =================================================================

    /**
     * Create track object from hierarchy object
     */
    createTrackFromObject(object) {
        return {
            objectId: object.id,
            objectName: object.name || 'Unnamed Object',
            objectType: object.type || 'unknown',
            startTime: 0,
            duration: this.timeline.duration,
            properties: ['position.x', 'position.y', 'scale.x', 'scale.y', 'rotation', 'opacity']
        };
    }

    /**
     * Load tracks from objects array
     */
    loadTracksFromObjects(objects) {
        this.tracks = [];
        
        if (objects && Array.isArray(objects)) {
            objects.forEach(object => {
                const track = this.createTrackFromObject(object);
                this.tracks.push(track);
            });
        }
        
        console.log(`🎬 Timeline: Loaded ${this.tracks.length} tracks from objects`);
    }

    /**
     * Load tracks from project data
     */
    loadTracksFromProject(projectData) {
        this.tracks = [];
        
        // Create tracks from hierarchy objects
        if (projectData.objects) {
            projectData.objects.forEach(object => {
                const track = this.createTrackFromObject(object);
                this.tracks.push(track);
            });
        }
    }

    /**
     * Get icon for track type
     */
    getTrackIcon(objectType) {
        const icons = {
            'rectangle': '🔲',
            'circle': '🔵',
            'text': '🔤',
            'group': '📁',
            'audio': '🎵',
            'video': '🎬',
            'image': '🖼',
            'shape': '⬟'
        };
        
        return icons[objectType.toLowerCase()] || '📦';
    }

    /**
     * Format time for display (MM:SS.ff)
     */
    formatTime(milliseconds) {
        const totalSeconds = milliseconds / 1000;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        const frames = Math.floor((totalSeconds % 1) * this.timeline.frameRate);
        
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${frames.toString().padStart(2, '0')}`;
    }

    /**
     * Get current frame number
     */
    getCurrentFrame() {
        return Math.floor((this.timeline.currentTime / 1000) * this.timeline.frameRate);
    }

    /**
     * Get total frame count
     */
    getTotalFrames() {
        return Math.floor((this.timeline.duration / 1000) * this.timeline.frameRate);
    }

    // =================================================================
    // UI UPDATE METHODS
    // =================================================================

    /**
     * Update time display
     */
    updateTimeDisplay() {
        if (this.elements.currentTimeDisplay) {
            this.elements.currentTimeDisplay.textContent = this.formatTime(this.timeline.currentTime);
        }
        
        if (this.elements.totalDurationDisplay) {
            this.elements.totalDurationDisplay.textContent = this.formatTime(this.timeline.duration);
        }
        
        if (this.elements.frameInfoDisplay) {
            this.elements.frameInfoDisplay.textContent = `(Frame ${this.getCurrentFrame()}/${this.getTotalFrames()})`;
        }
    }

    /**
     * Update zoom display
     */
    updateZoomDisplay() {
        if (this.elements.zoomLevelDisplay) {
            this.elements.zoomLevelDisplay.textContent = `${Math.round(this.timeline.zoom * 100)}%`;
        }
    }

    /**
     * Update frame rate display
     */
    updateFrameRateDisplay() {
        if (this.elements.fpsDisplay) {
            this.elements.fpsDisplay.textContent = `${this.timeline.frameRate} FPS`;
        }
    }

    /**
     * Update object count display
     */
    updateObjectCount() {
        if (this.elements.objectCountDisplay) {
            this.elements.objectCountDisplay.textContent = `${this.tracks.length} Objects`;
        }
    }

    /**
     * Update playback button states
     */
    updatePlaybackButtons() {
        // Update play button
        if (this.elements.playBtn) {
            if (this.timeline.isPlaying) {
                this.elements.playBtn.classList.add('active');
            } else {
                this.elements.playBtn.classList.remove('active');
            }
        }
        
        // Update pause button  
        if (this.elements.pauseBtn) {
            if (this.playbackState === 'paused') {
                this.elements.pauseBtn.classList.add('active');
            } else {
                this.elements.pauseBtn.classList.remove('active');
            }
        }
    }

    /**
     * Update playhead position based on current time
     */
    updatePlayheadPosition() {
        if (!this.elements.playhead) return;
        
        const position = (this.timeline.currentTime * this.timeline.pixelsPerSecond) / 1000;
        this.elements.playhead.style.left = `${position}px`;
    }

    // =================================================================
    // TIMELINE MODE AND SETTINGS
    // =================================================================

    /**
     * Change timeline mode (motion/video/animation)
     */
    changeTimelineMode(newMode) {
        this.timelineMode = newMode;
        
        // Emit timeline mode change event
        window.EventBus.emit('timelineModeChanged', {
            mode: newMode,
            previousMode: this.timelineMode
        });
        
        console.log(`🎬 Timeline: Mode changed to ${newMode}`);
    }

    /**
     * Toggle snap setting
     */
    toggleSnap(enabled) {
        console.log(`🎬 Timeline: Snap ${enabled ? 'enabled' : 'disabled'}`);
        
        // Emit snap setting change
        window.EventBus.emit('timelineSnapChanged', { enabled });
    }

    /**
     * Toggle onion skin setting
     */
    toggleOnionSkin(enabled) {
        console.log(`🎬 Timeline: Onion skin ${enabled ? 'enabled' : 'disabled'}`);
        
        // Emit onion skin setting change
        window.EventBus.emit('timelineOnionSkinChanged', { enabled });
    }

    // =================================================================
    // PUBLIC API (For external component integration)
    // =================================================================

    /**
     * Add track from external object
     */
    addTrack(object) {
        const track = this.createTrackFromObject(object);
        this.tracks.push(track);
        this.renderTracks();
        return track;
    }

    /**
     * Remove track by object ID
     */
    removeTrack(objectId) {
        this.tracks = this.tracks.filter(track => track.objectId !== objectId);
        this.expandedTracks.delete(objectId);
        this.selectedTracks.delete(objectId);
        this.renderTracks();
    }

    /**
     * Get current timeline state
     */
    getTimelineState() {
        return {
            currentTime: this.timeline.currentTime,
            duration: this.timeline.duration,
            isPlaying: this.timeline.isPlaying,
            zoom: this.timeline.zoom,
            mode: this.timelineMode,
            frameRate: this.timeline.frameRate,
            tracks: this.tracks.length,
            selectedTracks: Array.from(this.selectedTracks)
        };
    }

    /**
     * Destroy behaviour and clean up
     */
    destroy() {
        // Stop playback and clear timer
        if (this.playbackTimer) {
            clearInterval(this.playbackTimer);
            this.playbackTimer = null;
        }
        
        // Clear data structures
        this.tracks = [];
        this.expandedTracks.clear();
        this.selectedTracks.clear();
        this.keyframes.clear();
        this.selectedKeyframes.clear();
        
        console.log('🎬 Timeline: Behaviour destroyed');
    }
}

// Export class to global window for BaseComponent integration
window.TimelinePanelBehaviour = TimelinePanelBehaviour;

console.log('🎬 TimelinePanel behaviour loaded');
console.log('✅ TimelinePanelBehaviour exposed to window object');