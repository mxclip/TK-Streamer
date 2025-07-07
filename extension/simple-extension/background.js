// TikTok Streamer Helper - Background Script
// Handles communication between content script and backend API

// Configuration
const CONFIG = {
  apiBaseUrl: 'http://localhost:8000/api/v1',
  websocketUrl: 'ws://localhost:8000/ws/render',
  retryAttempts: 3,
  retryDelay: 1000
};

// State
let currentProductTitle = '';
let apiStatus = 'unknown';
let lastMatchResult = null;

// Extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('TikTok Streamer Helper installed');
  initializeExtension();
});

// Initialize extension
async function initializeExtension() {
  try {
    // Check API status
    await checkApiStatus();
    
    // Set default storage values
    await chrome.storage.local.set({
      isEnabled: true,
      debugMode: false,
      lastProductTitle: '',
      apiStatus: apiStatus,
      lastActivity: Date.now()
    });
    
    console.log('Extension initialized successfully');
  } catch (error) {
    console.error('Error initializing extension:', error);
  }
}

// Check API status
async function checkApiStatus() {
  try {
    const response = await fetch(`${CONFIG.apiBaseUrl}/status`);
    if (response.ok) {
      const data = await response.json();
      apiStatus = 'connected';
      console.log('API connected:', data);
    } else {
      apiStatus = 'error';
      console.log('API error:', response.status);
    }
  } catch (error) {
    apiStatus = 'offline';
    console.log('API offline:', error.message);
  }
  
  // Update storage
  await chrome.storage.local.set({ apiStatus });
}

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  switch (message.type) {
    case 'PRODUCT_CHANGED':
      handleProductChange(message.data);
      sendResponse({ success: true });
      break;
      
    case 'GET_STATUS':
      sendResponse({
        apiStatus,
        currentProductTitle,
        lastMatchResult
      });
      break;
      
    case 'CHECK_API':
      checkApiStatus().then(() => {
        sendResponse({ apiStatus });
      });
      return true; // Will respond asynchronously
      
    default:
      sendResponse({ error: 'Unknown message type' });
  }
});

// Handle product change from content script
async function handleProductChange(data) {
  currentProductTitle = data.title;
  
  try {
    // Update storage
    await chrome.storage.local.set({
      lastProductTitle: data.title,
      lastActivity: Date.now()
    });
    
    // Try to match product with backend
    await matchProduct(data.title);
    
    console.log('Product change handled:', data);
    
  } catch (error) {
    console.error('Error handling product change:', error);
  }
}

// Match product with backend
async function matchProduct(productTitle) {
  if (apiStatus !== 'connected') {
    console.log('API not connected, skipping match');
    return;
  }
  
  try {
    const response = await fetch(`${CONFIG.apiBaseUrl}/match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        product_title: productTitle,
        source_url: 'extension'
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      lastMatchResult = result;
      
      // Update storage
      await chrome.storage.local.set({ lastMatchResult: result });
      
      // Notify content script
      if (result.matched_bag) {
        await notifyMatch(result);
      } else {
        await notifyNoMatch(productTitle);
      }
      
      console.log('Match result:', result);
      
    } else {
      console.error('Match API error:', response.status);
    }
    
  } catch (error) {
    console.error('Error matching product:', error);
  }
}

// Notify content script of match
async function notifyMatch(result) {
  try {
    const tabs = await chrome.tabs.query({ 
      url: ['https://*.tiktok.com/*', 'https://seller.tiktok.com/*', 'https://studio.tiktok.com/*'] 
    });
    
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'SHOW_NOTIFICATION',
        message: `Matched: ${result.matched_bag.bag_name}`,
        notificationType: 'success'
      }).catch(() => {
        // Tab might not have content script injected
      });
    }
  } catch (error) {
    console.error('Error notifying match:', error);
  }
}

// Notify content script of no match
async function notifyNoMatch(productTitle) {
  try {
    const tabs = await chrome.tabs.query({ 
      url: ['https://*.tiktok.com/*', 'https://seller.tiktok.com/*', 'https://studio.tiktok.com/*'] 
    });
    
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'SHOW_NOTIFICATION',
        message: 'No script found for this product',
        notificationType: 'warning'
      }).catch(() => {
        // Tab might not have content script injected
      });
    }
  } catch (error) {
    console.error('Error notifying no match:', error);
  }
}

// Periodic API health check
setInterval(checkApiStatus, 30000); // Every 30 seconds

// Handle tab updates to re-inject content script if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const url = new URL(tab.url);
    if (url.hostname.includes('tiktok.com')) {
      // Content script should auto-inject via manifest
      console.log('TikTok tab updated:', tab.url);
    }
  }
});

console.log('TikTok Streamer Helper background script loaded'); 