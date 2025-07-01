const { app, BrowserWindow, globalShortcut, ipcMain, Menu } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store();

let mainWindow;
let isOverlayMode = false;

function createWindow() {
  // Create the browser window with specified dimensions
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    frame: true,
    resizable: true,
    alwaysOnTop: false,
    transparent: false,
    title: 'TikTok Teleprompter'
  });

  // Load the app
  mainWindow.loadFile('src/renderer/index.html');

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Set up global shortcuts (hotkeys)
  registerGlobalShortcuts();

  // Set up menu
  createMenu();
}

function registerGlobalShortcuts() {
  // Space - Next block
  globalShortcut.register('Space', () => {
    if (mainWindow) {
      mainWindow.webContents.send('hotkey', 'next-block');
    }
  });

  // Ctrl+Right Arrow - Next script variation
  globalShortcut.register('CommandOrControl+Right', () => {
    if (mainWindow) {
      mainWindow.webContents.send('hotkey', 'next-script');
    }
  });

  // Ctrl+Left Arrow - Previous script variation
  globalShortcut.register('CommandOrControl+Left', () => {
    if (mainWindow) {
      mainWindow.webContents.send('hotkey', 'prev-script');
    }
  });

  // Ctrl+Alt+R - Toggle scroll mode
  globalShortcut.register('CommandOrControl+Alt+R', () => {
    if (mainWindow) {
      mainWindow.webContents.send('hotkey', 'toggle-scroll');
    }
  });

  // F11 - Toggle overlay mode
  globalShortcut.register('F11', () => {
    toggleOverlay();
  });
}

function toggleOverlay() {
  isOverlayMode = !isOverlayMode;
  
  if (isOverlayMode) {
    // Enter overlay mode
    mainWindow.setAlwaysOnTop(true);
    mainWindow.setSkipTaskbar(true);
    mainWindow.setFrame(false);
    mainWindow.setOpacity(0.9);
    mainWindow.setIgnoreMouseEvents(false); // Still allow interaction
    
    // Make window transparent
    mainWindow.setBackgroundColor('#00000000');
    
    console.log('Overlay mode enabled');
  } else {
    // Exit overlay mode
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setSkipTaskbar(false);
    mainWindow.setFrame(true);
    mainWindow.setOpacity(1.0);
    mainWindow.setIgnoreMouseEvents(false);
    
    // Restore normal background
    mainWindow.setBackgroundColor('#ffffff');
    
    console.log('Overlay mode disabled');
  }
  
  // Notify renderer process
  mainWindow.webContents.send('overlay-mode-changed', isOverlayMode);
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Settings',
          click: () => {
            mainWindow.webContents.send('open-settings');
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          role: 'quit'
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Overlay (F11)',
          click: toggleOverlay,
          accelerator: 'F11'
        },
        { type: 'separator' },
        {
          label: 'Reload',
          role: 'reload'
        },
        {
          label: 'Force Reload',
          role: 'forceReload'
        },
        {
          label: 'Toggle Developer Tools',
          role: 'toggleDevTools'
        }
      ]
    },
    {
      label: 'Controls',
      submenu: [
        {
          label: 'Next Block',
          click: () => mainWindow.webContents.send('hotkey', 'next-block'),
          accelerator: 'Space'
        },
        {
          label: 'Next Script',
          click: () => mainWindow.webContents.send('hotkey', 'next-script'),
          accelerator: 'CommandOrControl+Right'
        },
        {
          label: 'Previous Script',
          click: () => mainWindow.webContents.send('hotkey', 'prev-script'),
          accelerator: 'CommandOrControl+Left'
        },
        {
          label: 'Toggle Auto-Scroll',
          click: () => mainWindow.webContents.send('hotkey', 'toggle-scroll'),
          accelerator: 'CommandOrControl+Alt+R'
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Hotkeys',
          click: () => {
            mainWindow.webContents.send('show-help');
          }
        },
        {
          label: 'About',
          click: () => {
            mainWindow.webContents.send('show-about');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC handlers
ipcMain.handle('get-store-value', (event, key) => {
  return store.get(key);
});

ipcMain.handle('set-store-value', (event, key, value) => {
  store.set(key, value);
});

ipcMain.handle('toggle-overlay', () => {
  toggleOverlay();
  return isOverlayMode;
});

ipcMain.handle('get-overlay-status', () => {
  return isOverlayMode;
});

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
});

// Handle second instance
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
} 