const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let mainWindow;
let backendProcess;

// Backend process management
function startBackend() {
    console.log('Starting Flow Backend...');
    
    // Path to the backend executable
    const backendPath = path.join(__dirname, '..', 'flow-backend');
    
    // Start the C# backend process
    backendProcess = spawn('dotnet', ['run'], {
        cwd: backendPath,
        stdio: 'inherit' // Show backend logs in our console
    });
    
    backendProcess.on('spawn', () => {
        console.log('Backend process started successfully');
    });
    
    backendProcess.on('error', (error) => {
        console.error('Failed to start backend:', error.message);
    });
    
    backendProcess.on('exit', (code) => {
        console.log(`Backend process exited with code ${code}`);
        backendProcess = null;
    });
}

function stopBackend() {
    if (backendProcess) {
        console.log('Stopping backend process...');
        backendProcess.kill();
        backendProcess = null;
    }
}

// Electron window management
function createWindow() {
    console.log('Creating Electron window...');
    
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        titleBarStyle: 'default',
        show: false // Don't show until ready
    });
    
    // Load the HTML file
    mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
    
    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        console.log('Electron window ready');
        mainWindow.show();
        
        // Always open DevTools to see errors
        mainWindow.webContents.openDevTools();
        
        // Log any renderer process errors
        mainWindow.webContents.on('crashed', (event) => {
            console.error('Renderer process crashed:', event);
        });
        
        mainWindow.webContents.on('unresponsive', () => {
            console.error('Renderer process became unresponsive');
        });
    });
    
    // Handle window closed
    mainWindow.on('closed', () => {
        console.log('Main window closed');
        mainWindow = null;
    });
    
    // Prevent accidental closing during development
    mainWindow.on('close', (event) => {
        console.log('Window close event triggered');
        // Uncomment this during debugging to prevent accidental closes
        // event.preventDefault();
        // console.log('Window close prevented for debugging');
    });
}

// Electron app lifecycle
app.whenReady().then(() => {
    console.log('Flow Application Starting...');
    
    // Start backend first
    startBackend();
    
    // Small delay to let backend start, then create window
    setTimeout(() => {
        createWindow();
    }, 2000);
    
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    console.log('All windows closed');
    stopBackend();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    console.log('Application quitting...');
    stopBackend();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    stopBackend();
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});