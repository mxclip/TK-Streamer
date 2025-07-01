// TikTok Streamer Helper - Popup Script
// Manages the extension popup interface

// DOM elements
const elements = {
  apiStatus: document.getElementById('api-status'),
  extensionStatus: document.getElementById('extension-status'),
  lastActivity: document.getElementById('last-activity'),
  currentProduct: document.getElementById('current-product'),
  matchResult: document.getElementById('match-result'),
  refreshBtn: document.getElementById('refresh-btn'),
  forceCheckBtn: document.getElementById('force-check-btn'),
  toggleDebugBtn: document.getElementById('toggle-debug-btn'),
  openBackendBtn: document.getElementById('open-backend-btn')
};

// State
let debugMode = false;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup loaded');
  await loadInitialData();
  setupEventListeners();
});

// Load initial data from storage and background script
async function loadInitialData() {
  try {
    // Get data from storage
    const data = await chrome.storage.local.get([
      'apiStatus',
      'lastProductTitle',
      'lastMatchResult',
      'lastActivity',
      'debugMode'
    ]);
    
    // Get status from background script
    const bgStatus = await sendMessageToBackground({ type: 'GET_STATUS' });
    
    // Update UI
    updateApiStatus(data.apiStatus || bgStatus.apiStatus || 'unknown');
    updateCurrentProduct(data.lastProductTitle || bgStatus.currentProductTitle || '');
    updateMatchResult(data.lastMatchResult || bgStatus.lastMatchResult);
    updateLastActivity(data.lastActivity);
    
    debugMode = data.debugMode || false;
    updateDebugButton();
    
    console.log('Initial data loaded');
    
  } catch (error) {
    console.error('Error loading initial data:', error);
  }
}

// Setup event listeners
function setupEventListeners() {
  elements.refreshBtn.addEventListener('click', refreshStatus);
  elements.forceCheckBtn.addEventListener('click', forceCheck);
  elements.toggleDebugBtn.addEventListener('click', toggleDebug);
  elements.openBackendBtn.addEventListener('click', openBackend);
}

// Refresh status
async function refreshStatus() {
  setLoading(elements.refreshBtn, true);
  
  try {
    // Check API status
    const response = await sendMessageToBackground({ type: 'CHECK_API' });
    updateApiStatus(response.apiStatus);
    
    // Get current status
    const status = await sendMessageToBackground({ type: 'GET_STATUS' });
    updateCurrentProduct(status.currentProductTitle);
    updateMatchResult(status.lastMatchResult);
    
    // Get storage data
    const data = await chrome.storage.local.get(['lastActivity']);
    updateLastActivity(data.lastActivity);
    
    console.log('Status refreshed');
    
  } catch (error) {
    console.error('Error refreshing status:', error);
  } finally {
    setLoading(elements.refreshBtn, false);
  }
}

// Force check current product
async function forceCheck() {
  setLoading(elements.forceCheckBtn, true);
  
  try {
    // Send force check message to active tab
    const tabs = await chrome.tabs.query({ 
      active: true, 
      url: ['https://*.tiktok.com/*', 'https://seller.tiktok.com/*', 'https://studio.tiktok.com/*'] 
    });
    
    if (tabs.length > 0) {
      await chrome.tabs.sendMessage(tabs[0].id, { type: 'FORCE_CHECK' });
      console.log('Force check sent to active tab');
      
      // Refresh status after a delay
      setTimeout(refreshStatus, 1000);
    } else {
      console.log('No active TikTok tabs found');
    }
    
  } catch (error) {
    console.error('Error forcing check:', error);
  } finally {
    setLoading(elements.forceCheckBtn, false);
  }
}

// Toggle debug mode
async function toggleDebug() {
  debugMode = !debugMode;
  
  try {
    // Save to storage
    await chrome.storage.local.set({ debugMode });
    
    // Send to all TikTok tabs
    const tabs = await chrome.tabs.query({ 
      url: ['https://*.tiktok.com/*', 'https://seller.tiktok.com/*', 'https://studio.tiktok.com/*'] 
    });
    
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, { 
          type: 'TOGGLE_DEBUG', 
          enabled: debugMode 
        });
      } catch (error) {
        // Tab might not have content script
      }
    }
    
    updateDebugButton();
    console.log('Debug mode toggled:', debugMode);
    
  } catch (error) {
    console.error('Error toggling debug:', error);
  }
}

// Open backend dashboard
function openBackend() {
  chrome.tabs.create({ url: 'http://localhost:8000/docs' });
}

// Update API status
function updateApiStatus(status) {
  elements.apiStatus.textContent = status;
  elements.apiStatus.className = 'status-value';
  
  switch (status) {
    case 'connected':
      elements.apiStatus.classList.add('status-connected');
      break;
    case 'error':
      elements.apiStatus.classList.add('status-error');
      break;
    case 'offline':
      elements.apiStatus.classList.add('status-offline');
      break;
    default:
      elements.apiStatus.textContent = 'Unknown';
  }
}

// Update current product
function updateCurrentProduct(product) {
  if (product && product.trim()) {
    elements.currentProduct.textContent = product;
  } else {
    elements.currentProduct.textContent = 'No product detected';
  }
}

// Update match result
function updateMatchResult(result) {
  if (result && result.matched_bag) {
    elements.matchResult.textContent = `✅ ${result.matched_bag.bag_name}`;
  } else if (result && result.confidence !== undefined) {
    elements.matchResult.textContent = `❌ No match (${Math.round(result.confidence * 100)}% confidence)`;
  } else {
    elements.matchResult.textContent = 'No matches yet';
  }
}

// Update last activity
function updateLastActivity(timestamp) {
  if (timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) { // Less than 1 minute
      elements.lastActivity.textContent = 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
      const minutes = Math.floor(diff / 60000);
      elements.lastActivity.textContent = `${minutes}m ago`;
    } else if (diff < 86400000) { // Less than 1 day
      const hours = Math.floor(diff / 3600000);
      elements.lastActivity.textContent = `${hours}h ago`;
    } else {
      elements.lastActivity.textContent = date.toLocaleDateString();
    }
  } else {
    elements.lastActivity.textContent = 'Never';
  }
}

// Update debug button
function updateDebugButton() {
  elements.toggleDebugBtn.textContent = debugMode ? '🐛 Debug: ON' : '🐛 Debug: OFF';
}

// Set loading state for button
function setLoading(button, loading) {
  if (loading) {
    button.disabled = true;
    button.classList.add('loading');
  } else {
    button.disabled = false;
    button.classList.remove('loading');
  }
}

// Send message to background script
function sendMessageToBackground(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    if (changes.lastProductTitle) {
      updateCurrentProduct(changes.lastProductTitle.newValue);
    }
    if (changes.lastMatchResult) {
      updateMatchResult(changes.lastMatchResult.newValue);
    }
    if (changes.apiStatus) {
      updateApiStatus(changes.apiStatus.newValue);
    }
    if (changes.lastActivity) {
      updateLastActivity(changes.lastActivity.newValue);
    }
  }
});

console.log('Popup script loaded'); 