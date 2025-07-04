const { ipcRenderer } = require('electron');
const WebSocket = require('ws');

// Application state
let websocket = null;
let currentBagId = null;
let scripts = [];
let currentScriptIndex = 0;
let currentBlockIndex = 0;
let isAutoScrolling = false;
let autoScrollInterval = null;
let isOverlayMode = false;
let wsHost = 'localhost:8000'; // Default WebSocket host

// Script block types in order
const blockTypes = ['hook', 'look', 'story', 'value', 'cta'];

// DOM elements
const connectionStatus = document.getElementById('connectionStatus');
const statusText = document.getElementById('statusText');
const missingBanner = document.getElementById('missingBanner');
const bagInfo = document.getElementById('bagInfo');
const bagTitle = document.getElementById('bagTitle');
const bagDetails = document.getElementById('bagDetails');
const scriptContainer = document.getElementById('scriptContainer');
const blockInfo = document.getElementById('blockInfo');
const hotkeysHelp = document.getElementById('hotkeysHelp');

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Teleprompter initializing...');
    
    // Load settings
    await loadSettings();
    
    // Connect to WebSocket
    connectWebSocket();
    
    // Set up IPC listeners
    setupIPC();
    
    console.log('Teleprompter ready');
});

async function loadSettings() {
    try {
        // Use secure preload script to access settings
        const wsConfig = await window.electronAPI.getWSConfig();
        wsHost = wsConfig.host || 'localhost:8000';
        
        const savedBagId = await window.electronAPI.getStoreValue('lastBagId');
        
        if (savedBagId) {
            currentBagId = savedBagId;
        }
        
        console.log(`Settings loaded: WS Host: ${wsHost}, Last Bag ID: ${savedBagId}`);
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

function connectWebSocket() {
    // Close existing connection
    if (websocket) {
        websocket.close();
    }
    
    // Use configurable WebSocket host
    const wsUrl = `ws://${wsHost}/ws/render`;
    console.log(`Connecting to WebSocket: ${wsUrl}`);
    
    try {
        // Use built-in WebSocket API instead of requiring ws module
        websocket = new WebSocket(wsUrl);
        
        websocket.onopen = () => {
            console.log('WebSocket connected');
            updateConnectionStatus(true);
            
            // Subscribe to current bag if we have one
            if (currentBagId) {
                subscribe(currentBagId);
            }
        };
        
        websocket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                handleWebSocketMessage(message);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };
        
        websocket.onclose = () => {
            console.log('WebSocket disconnected');
            updateConnectionStatus(false);
            
            // Attempt to reconnect after 5 seconds
            setTimeout(connectWebSocket, 5000);
        };
        
        websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
            updateConnectionStatus(false);
        };
        
    } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        updateConnectionStatus(false);
        // Retry connection after 5 seconds
        setTimeout(connectWebSocket, 5000);
    }
}

function handleWebSocketMessage(message) {
    console.log('WebSocket message received:', message);
    
    switch (message.type) {
        case 'scripts':
            handleScriptsMessage(message.data);
            break;
        case 'switch':
            handleSwitchMessage(message.data);
            break;
        case 'missing_product':
            handleMissingProductMessage(message.data);
            break;
        case 'pong':
            // Connection keepalive response
            break;
        default:
            console.log('Unknown message type:', message.type);
    }
}

function handleScriptsMessage(data) {
    currentBagId = data.bag_id;
    scripts = data.scripts || [];
    currentScriptIndex = 0;
    currentBlockIndex = 0;
    
    // Save current bag ID using secure API
    window.electronAPI.setStoreValue('lastBagId', currentBagId);
    
    // Update UI
    updateBagInfo();
    renderCurrentScript();
    hideMissingBanner();
    
    console.log(`Loaded ${scripts.length} script variations for bag ${currentBagId}`);
}

function handleSwitchMessage(data) {
    console.log('Switching to bag:', data.bag_id);
    currentBagId = data.bag_id;
    
    // Save new bag ID
    window.electronAPI.setStoreValue('lastBagId', currentBagId);
    
    // Subscribe to new bag
    subscribe(currentBagId);
}

function handleMissingProductMessage(data) {
    console.log('Missing product detected:', data);
    showMissingBanner(data.title);
}

function subscribe(bagId) {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        const message = {
            type: 'subscribe',
            data: { bag_id: bagId }
        };
        websocket.send(JSON.stringify(message));
        console.log(`Subscribed to bag ${bagId}`);
    }
}

function sendScriptUsed(scriptType, blockType) {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        const message = {
            type: 'script_used',
            data: {
                bag_id: currentBagId,
                script_type: scriptType,
                block_type: blockType,
                timestamp: Date.now()
            }
        };
        websocket.send(JSON.stringify(message));
    }
}

function updateConnectionStatus(connected) {
    if (connected) {
        connectionStatus.className = 'status-indicator connected';
        statusText.textContent = 'Connected';
    } else {
        connectionStatus.className = 'status-indicator disconnected';
        statusText.textContent = 'Disconnected';
    }
}

function updateBagInfo() {
    if (scripts.length > 0 && scripts[currentScriptIndex]) {
        const script = scripts[currentScriptIndex];
        bagTitle.textContent = script.bag_name || 'Unknown Bag';
        bagDetails.textContent = `${script.bag_brand || ''} - ${script.bag_color || ''}`;
        bagInfo.style.display = 'block';
    } else {
        bagInfo.style.display = 'none';
    }
}

function renderCurrentScript() {
    if (scripts.length === 0) {
        scriptContainer.innerHTML = '<div class="no-script">No scripts available</div>';
        blockInfo.textContent = '';
        return;
    }
    
    const script = scripts[currentScriptIndex];
    const blockType = blockTypes[currentBlockIndex];
    const content = script[blockType] || 'Content not available';
    
    scriptContainer.innerHTML = `<div class="script-content">${content}</div>`;
    blockInfo.textContent = `${blockType.toUpperCase()} (${currentScriptIndex + 1}/${scripts.length}) - Block ${currentBlockIndex + 1}/${blockTypes.length}`;
    
    // Send analytics
    sendScriptUsed('current', blockType);
}

function nextBlock() {
    if (scripts.length === 0) return;
    
    currentBlockIndex = (currentBlockIndex + 1) % blockTypes.length;
    renderCurrentScript();
}

function nextScript() {
    if (scripts.length === 0) return;
    
    currentScriptIndex = (currentScriptIndex + 1) % scripts.length;
    renderCurrentScript();
}

function prevScript() {
    if (scripts.length === 0) return;
    
    currentScriptIndex = currentScriptIndex === 0 ? scripts.length - 1 : currentScriptIndex - 1;
    renderCurrentScript();
}

function toggleAutoScroll() {
    isAutoScrolling = !isAutoScrolling;
    
    if (isAutoScrolling) {
        startAutoScroll();
    } else {
        stopAutoScroll();
    }
    
    updateAutoScrollUI();
}

function startAutoScroll() {
    stopAutoScroll(); // Clear any existing interval
    
    autoScrollInterval = setInterval(() => {
        if (scriptContainer.scrollTop < scriptContainer.scrollHeight - scriptContainer.clientHeight) {
            scriptContainer.scrollTop += 2; // 60px/s at 30fps = 2px per frame
        }
    }, 33); // ~30fps
}

function stopAutoScroll() {
    if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
    }
}

function updateAutoScrollUI() {
    const scrollIndicator = document.getElementById('scrollIndicator');
    if (scrollIndicator) {
        scrollIndicator.style.display = isAutoScrolling ? 'block' : 'none';
    }
}

function showMissingBanner(productTitle) {
    const bannerText = document.getElementById('bannerText');
    if (bannerText) {
        bannerText.textContent = `⚠️ SCRIPT MISSING: ${productTitle}`;
    }
    
    missingBanner.style.display = 'block';
    
    // Auto-hide after 10 seconds
    setTimeout(hideMissingBanner, 10000);
}

function hideMissingBanner() {
    missingBanner.style.display = 'none';
}

function showHelp() {
    hotkeysHelp.classList.add('show');
}

function hideHelp() {
    hotkeysHelp.classList.remove('show');
}

async function toggleOverlay() {
    isOverlayMode = await window.electronAPI.toggleOverlay();
    updateOverlayUI();
}

function updateOverlayUI() {
    document.body.className = isOverlayMode ? 'overlay-mode' : '';
}

// Settings functions
async function openSettings() {
    const currentConfig = await window.electronAPI.getWSConfig();
    const newHost = prompt('Enter WebSocket host (host:port):', currentConfig.host);
    
    if (newHost && newHost !== currentConfig.host) {
        await window.electronAPI.setWSConfig({ host: newHost });
        wsHost = newHost;
        
        // Reconnect to new host
        connectWebSocket();
    }
}

// Global functions for HTML buttons
window.toggleAutoScroll = toggleAutoScroll;
window.showHelp = showHelp;
window.hideHelp = hideHelp;
window.toggleOverlay = toggleOverlay;
window.openSettings = openSettings;

// IPC Setup using secure preload script
function setupIPC() {
    // Handle hotkeys from main process
    window.electronAPI.onHotkey((event, action) => {
        console.log('Hotkey received:', action);
        
        switch (action) {
            case 'next-block':
                nextBlock();
                break;
            case 'next-script':
                nextScript();
                break;
            case 'prev-script':
                prevScript();
                break;
            case 'toggle-scroll':
                toggleAutoScroll();
                break;
        }
    });
    
    // Handle overlay mode changes
    window.electronAPI.onOverlayModeChanged((event, enabled) => {
        isOverlayMode = enabled;
        updateOverlayUI();
    });
    
    // Handle menu actions
    window.electronAPI.onShowHelp(() => {
        showHelp();
    });
    
    window.electronAPI.onShowAbout(() => {
        alert('TikTok Teleprompter v1.0.0\n\nA real-time script display tool for luxury resale livestreams.');
    });
    
    window.electronAPI.onOpenSettings(() => {
        openSettings();
    });
}

// Keyboard event handlers (backup for when global shortcuts don't work)
document.addEventListener('keydown', (event) => {
    // Only handle if not in an input field
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
    }
    
    // Updated key combinations to match new shortcuts
    if (event.ctrlKey && event.shiftKey) {
        switch (event.code) {
            case 'Space':
                event.preventDefault();
                nextBlock();
                break;
            case 'ArrowRight':
                event.preventDefault();
                nextScript();
                break;
            case 'ArrowLeft':
                event.preventDefault();
                prevScript();
                break;
            case 'KeyR':
                event.preventDefault();
                toggleAutoScroll();
                break;
            case 'F11':
                event.preventDefault();
                toggleOverlay();
                break;
        }
    }
    
    if (event.code === 'Escape') {
        if (hotkeysHelp.classList.contains('show')) {
            hideHelp();
        }
    }
});

// Periodic ping to keep connection alive
setInterval(() => {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        const message = {
            type: 'ping',
            data: { timestamp: Date.now() }
        };
        websocket.send(JSON.stringify(message));
    }
}, 30000); 