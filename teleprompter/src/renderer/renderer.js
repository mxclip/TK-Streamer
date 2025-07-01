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
        const wsHost = await ipcRenderer.invoke('get-store-value', 'wsHost') || 'localhost:8000';
        const savedBagId = await ipcRenderer.invoke('get-store-value', 'lastBagId');
        
        if (savedBagId) {
            currentBagId = savedBagId;
        }
        
        console.log(`Settings loaded: WS Host: ${wsHost}, Last Bag ID: ${savedBagId}`);
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

function connectWebSocket() {
    const wsUrl = 'ws://localhost:8000/ws/render';
    
    try {
        websocket = new WebSocket(wsUrl);
        
        websocket.onopen = () => {
            console.log('WebSocket connected');
            updateConnectionStatus(true);
            
            // Subscribe to current bag if available
            if (currentBagId) {
                subscribeToBag(currentBagId);
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
        console.error('Error creating WebSocket:', error);
        updateConnectionStatus(false);
    }
}

function handleWebSocketMessage(message) {
    console.log('Received WebSocket message:', message);
    
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
            console.log('Received pong from server');
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
    
    // Save current bag ID
    ipcRenderer.invoke('set-store-value', 'lastBagId', currentBagId);
    
    // Update UI
    updateBagInfo();
    renderCurrentScript();
    hideMissingBanner();
    
    console.log(`Loaded ${scripts.length} script variations for bag ${currentBagId}`);
}

function handleSwitchMessage(data) {
    console.log('Switching to bag:', data.bag_id);
    // The scripts will be sent separately in a 'scripts' message
}

function handleMissingProductMessage(data) {
    console.log('Missing product alert:', data.title);
    showMissingBanner();
}

function updateConnectionStatus(connected) {
    if (connected) {
        connectionStatus.classList.add('connected');
        statusText.textContent = 'Connected';
    } else {
        connectionStatus.classList.remove('connected');
        statusText.textContent = 'Disconnected';
    }
}

function subscribeToBag(bagId) {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        const message = {
            type: 'subscribe',
            data: { bag_id: bagId }
        };
        websocket.send(JSON.stringify(message));
        console.log(`Subscribed to bag ${bagId}`);
    }
}

function updateBagInfo() {
    if (!currentBagId || scripts.length === 0) {
        bagInfo.style.display = 'none';
        return;
    }
    
    bagInfo.style.display = 'block';
    bagTitle.textContent = `Bag #${currentBagId}`;
    bagDetails.textContent = `${scripts.length} script variation(s) available`;
}

function renderCurrentScript() {
    // Clear existing script blocks
    const existingBlocks = scriptContainer.querySelectorAll('.script-block:not(#defaultBlock)');
    existingBlocks.forEach(block => block.remove());
    
    // Hide default block
    document.getElementById('defaultBlock').style.display = 'none';
    
    if (!scripts || scripts.length === 0) {
        document.getElementById('defaultBlock').style.display = 'block';
        updateNavigationInfo();
        return;
    }
    
    const currentScript = scripts[currentScriptIndex];
    if (!currentScript) {
        console.error('No script at index:', currentScriptIndex);
        return;
    }
    
    // Create blocks for each script type
    blockTypes.forEach((blockType, index) => {
        const content = currentScript[blockType];
        if (content) {
            const block = createScriptBlock(blockType, content, index === currentBlockIndex);
            scriptContainer.appendChild(block);
        }
    });
    
    updateNavigationInfo();
}

function createScriptBlock(type, content, isActive) {
    const block = document.createElement('div');
    block.className = `script-block ${isActive ? 'active' : ''}`;
    block.setAttribute('data-type', type);
    
    block.innerHTML = `
        <div class="script-type">${type.toUpperCase()}</div>
        <div class="script-content">${content}</div>
    `;
    
    return block;
}

function updateNavigationInfo() {
    const blockName = blockTypes[currentBlockIndex] || '-';
    const scriptNum = currentScriptIndex + 1;
    const totalScripts = scripts.length;
    
    blockInfo.textContent = `Block: ${blockName.toUpperCase()} | Script: ${scriptNum} of ${totalScripts}`;
}

function nextBlock() {
    if (scripts.length === 0) return;
    
    const availableBlocks = getAvailableBlocks();
    
    if (currentBlockIndex < availableBlocks.length - 1) {
        currentBlockIndex++;
        showCurrentBlock();
        
        // Track script usage
        trackScriptUsage();
    }
}

function nextScript() {
    if (scripts.length === 0) return;
    
    if (currentScriptIndex < scripts.length - 1) {
        currentScriptIndex++;
        currentBlockIndex = 0; // Reset to first block
        renderCurrentScript();
    }
}

function prevScript() {
    if (scripts.length === 0) return;
    
    if (currentScriptIndex > 0) {
        currentScriptIndex--;
        currentBlockIndex = 0; // Reset to first block
        renderCurrentScript();
    }
}

function getAvailableBlocks() {
    if (!scripts || scripts.length === 0) return [];
    
    const currentScript = scripts[currentScriptIndex];
    return blockTypes.filter(type => currentScript[type]);
}

function showCurrentBlock() {
    const blocks = scriptContainer.querySelectorAll('.script-block:not(#defaultBlock)');
    
    blocks.forEach((block, index) => {
        block.classList.toggle('active', index === currentBlockIndex);
    });
    
    updateNavigationInfo();
}

function toggleAutoScroll() {
    isAutoScrolling = !isAutoScrolling;
    
    if (isAutoScrolling) {
        startAutoScroll();
    } else {
        stopAutoScroll();
    }
    
    console.log('Auto-scroll:', isAutoScrolling ? 'enabled' : 'disabled');
}

function startAutoScroll() {
    if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
    }
    
    // Auto-scroll at 60px per second as specified
    autoScrollInterval = setInterval(() => {
        const activeBlock = scriptContainer.querySelector('.script-block.active');
        if (activeBlock) {
            const currentScroll = activeBlock.scrollTop;
            activeBlock.scrollTop = currentScroll + 2; // 60px/s ≈ 2px per 33ms
        }
    }, 33);
    
    // Add CSS class for visual indication
    document.body.classList.add('auto-scroll');
}

function stopAutoScroll() {
    if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
    }
    
    document.body.classList.remove('auto-scroll');
}

function trackScriptUsage() {
    if (!scripts || !scripts[currentScriptIndex]) return;
    
    // Send usage tracking to backend
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        const message = {
            type: 'script_used',
            data: {
                script_id: scripts[currentScriptIndex].id,
                block_type: blockTypes[currentBlockIndex]
            }
        };
        websocket.send(JSON.stringify(message));
    }
}

function showMissingBanner() {
    missingBanner.classList.add('show');
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
        hideMissingBanner();
    }, 10000);
}

function hideMissingBanner() {
    missingBanner.classList.remove('show');
}

async function toggleOverlay() {
    isOverlayMode = await ipcRenderer.invoke('toggle-overlay');
    updateOverlayUI();
}

function updateOverlayUI() {
    document.body.classList.toggle('overlay-mode', isOverlayMode);
    console.log('Overlay mode:', isOverlayMode ? 'enabled' : 'disabled');
}

function showHelp() {
    hotkeysHelp.classList.add('show');
}

function hideHelp() {
    hotkeysHelp.classList.remove('show');
}

// Global functions for HTML buttons
window.toggleAutoScroll = toggleAutoScroll;
window.showHelp = showHelp;
window.hideHelp = hideHelp;
window.toggleOverlay = toggleOverlay;

// IPC Setup
function setupIPC() {
    // Handle hotkeys from main process
    ipcRenderer.on('hotkey', (event, action) => {
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
    ipcRenderer.on('overlay-mode-changed', (event, enabled) => {
        isOverlayMode = enabled;
        updateOverlayUI();
    });
    
    // Handle menu actions
    ipcRenderer.on('show-help', () => {
        showHelp();
    });
    
    ipcRenderer.on('show-about', () => {
        alert('TikTok Teleprompter v1.0.0\n\nA real-time script display tool for luxury resale livestreams.');
    });
    
    ipcRenderer.on('open-settings', () => {
        // TODO: Implement settings dialog
        console.log('Settings dialog requested');
    });
}

// Keyboard event handlers (backup for when global shortcuts don't work)
document.addEventListener('keydown', (event) => {
    // Only handle if not in an input field
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
    }
    
    switch (event.code) {
        case 'Space':
            event.preventDefault();
            nextBlock();
            break;
        case 'ArrowRight':
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                nextScript();
            }
            break;
        case 'ArrowLeft':
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                prevScript();
            }
            break;
        case 'KeyR':
            if ((event.ctrlKey || event.metaKey) && event.altKey) {
                event.preventDefault();
                toggleAutoScroll();
            }
            break;
        case 'F11':
            event.preventDefault();
            toggleOverlay();
            break;
        case 'Escape':
            if (hotkeysHelp.classList.contains('show')) {
                hideHelp();
            }
            break;
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
}, 30000); // Ping every 30 seconds 