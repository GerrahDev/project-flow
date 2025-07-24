 /**
 * Electron Preload Script
 * Provides secure bridge between main process and renderer
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Add any secure IPC methods here in the future
    platform: process.platform,
    
    // For now, this is minimal - we're using WebSockets for backend communication
    // Future: Could add file system access, window controls, etc.
});

console.log('Preload script loaded');
