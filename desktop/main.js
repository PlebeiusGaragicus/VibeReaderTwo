/**
 * Electron Main Process
 * Manages window lifecycle and spawns FastAPI backend
 */

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Configuration
const isDev = process.argv.includes('--dev');
const API_PORT = 8000;

let mainWindow = null;
let backendProcess = null;

/**
 * Create the main application window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'hiddenInset',
    show: false, // Show after ready-to-show
  });

  // Load the frontend
  if (isDev) {
    // Development: Load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Production: Load from built files
    mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Start the FastAPI backend server
 */
async function startBackend() {
  return new Promise((resolve, reject) => {
    console.log('Starting FastAPI backend...');

    // Determine Python executable
    let pythonCmd = 'python3';
    let backendPath;

    if (isDev) {
      // Development: Use local backend
      backendPath = path.join(__dirname, '../backend');
      pythonCmd = path.join(backendPath, 'venv/bin/python');
    } else {
      // Production: Use bundled backend
      backendPath = path.join(process.resourcesPath, 'backend');
      // TODO: Use bundled Python runtime
    }

    // Set environment variables
    const env = {
      ...process.env,
      VIBEREADER_DESKTOP: 'true',
      PYTHONUNBUFFERED: '1',
    };

    // Spawn backend process
    backendProcess = spawn(
      pythonCmd,
      ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', API_PORT.toString()],
      {
        cwd: backendPath,
        env: env,
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    // Handle backend output
    backendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('[Backend]', output);
      
      // Check if server is ready
      if (output.includes('Uvicorn running') || output.includes('Application startup complete')) {
        console.log('✓ Backend ready');
        resolve();
      }
    });

    backendProcess.stderr.on('data', (data) => {
      console.error('[Backend Error]', data.toString());
    });

    backendProcess.on('error', (error) => {
      console.error('Failed to start backend:', error);
      reject(error);
    });

    backendProcess.on('close', (code) => {
      console.log(`Backend process exited with code ${code}`);
      backendProcess = null;
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (backendProcess && !backendProcess.killed) {
        console.log('Backend started (timeout reached, assuming ready)');
        resolve();
      }
    }, 10000);
  });
}

/**
 * Stop the backend server
 */
function stopBackend() {
  if (backendProcess) {
    console.log('Stopping backend...');
    backendProcess.kill();
    backendProcess = null;
  }
}

/**
 * Check if backend is healthy
 */
async function checkBackendHealth() {
  try {
    const response = await fetch(`http://127.0.0.1:${API_PORT}/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

// App lifecycle events
app.whenReady().then(async () => {
  try {
    // Start backend first
    await startBackend();
    
    // Wait a bit for backend to be fully ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check backend health
    const isHealthy = await checkBackendHealth();
    if (!isHealthy) {
      console.warn('Backend health check failed, but continuing...');
    }
    
    // Create window
    createWindow();
  } catch (error) {
    console.error('Failed to start application:', error);
    dialog.showErrorBox(
      'Startup Error',
      'Failed to start the backend server. Please check the logs.'
    );
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopBackend();
});

// IPC Handlers
ipcMain.handle('select-epub-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'EPUB Files', extensions: ['epub'] }
    ]
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('get-api-url', () => {
  return `http://127.0.0.1:${API_PORT}`;
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});
