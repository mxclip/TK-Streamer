const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Store operations
  getStoreValue: (key) => ipcRenderer.invoke('get-store-value', key),
  setStoreValue: (key, value) => ipcRenderer.invoke('set-store-value', key, value),
  
  // Overlay operations
  toggleOverlay: () => ipcRenderer.invoke('toggle-overlay'),
  getOverlayStatus: () => ipcRenderer.invoke('get-overlay-status'),
  
  // WebSocket configuration
  getWSConfig: () => ipcRenderer.invoke('get-ws-config'),
  setWSConfig: (config) => ipcRenderer.invoke('set-ws-config', config),
  
  // Event listeners for main process events
  onHotkey: (callback) => {
    ipcRenderer.on('hotkey', callback);
  },
  onOverlayModeChanged: (callback) => {
    ipcRenderer.on('overlay-mode-changed', callback);
  },
  onShowHelp: (callback) => {
    ipcRenderer.on('show-help', callback);
  },
  onShowAbout: (callback) => {
    ipcRenderer.on('show-about', callback);
  },
  onOpenSettings: (callback) => {
    ipcRenderer.on('open-settings', callback);
  },
  
  // Clean up event listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
}); 