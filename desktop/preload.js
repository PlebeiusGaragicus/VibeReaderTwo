/**
 * Electron Preload Script
 * Exposes safe IPC methods to the renderer process
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electron', {
  // Check if running in Electron
  isElectron: true,
  
  // Get API base URL
  getApiUrl: () => ipcRenderer.invoke('get-api-url'),
  
  // Open file picker for EPUB files
  selectEpubFile: () => ipcRenderer.invoke('select-epub-file'),
  
  // Platform info
  platform: process.platform,
});
