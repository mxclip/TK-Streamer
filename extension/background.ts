import { API_CONFIG, debugLog } from "./src/config"

// Background script for Chrome Extension MV3
// Handles API communication with the backend

interface ProductMatchResponse {
  bag_id?: number;
  bag?: {
    id: number;
    brand: string;
    model: string;
    color: string;
    condition: string;
  };
  title: string;
  matched: boolean;
  message: string;
}

interface APIError {
  detail: string | { message: string; title: string; matched: boolean; suggestion: string };
}

/**
 * Handle messages from content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  debugLog('Background received message:', message);
  
  switch (message.type) {
    case 'PRODUCT_CHANGED':
      handleProductChanged(message.data)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ error: error.message }));
      return true; // Keep message channel open for async response
      
    case 'GET_API_STATUS':
      checkAPIStatus()
        .then(status => sendResponse(status))
        .catch(error => sendResponse({ error: error.message }));
      return true;
      
    case 'TEST_CONNECTION':
      testConnection()
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ error: error.message }));
      return true;
      
    default:
      sendResponse({ error: 'Unknown message type' });
  }
});

/**
 * Handle product change from content script
 */
async function handleProductChanged(data: { title: string; url: string; timestamp: number }) {
  debugLog('Handling product change:', data);
  
  try {
    const result = await matchProductTitle(data.title);
    
    if (result.matched) {
      // Product found - notify success
      await notifyContentScript(data.url, {
        type: 'SHOW_NOTIFICATION',
        message: `Matched: ${result.bag?.brand} ${result.bag?.model}`,
        notificationType: 'success'
      });
      
      // Store successful match
      await chrome.storage.local.set({
        lastMatchedProduct: {
          title: data.title,
          bagId: result.bag_id,
          timestamp: data.timestamp
        }
      });
      
      debugLog('Product matched successfully:', result);
      
    } else {
      // Product not found - notify error
      await notifyContentScript(data.url, {
        type: 'SHOW_NOTIFICATION', 
        message: 'Product not found in database',
        notificationType: 'warning'
      });
      
      debugLog('Product not matched:', data.title);
    }
    
    return { success: true, result };
    
  } catch (error) {
    debugLog('Error handling product change:', error);
    
    await notifyContentScript(data.url, {
      type: 'SHOW_NOTIFICATION',
      message: 'Error connecting to backend',
      notificationType: 'error'
    });
    
    return { success: false, error: error.message };
  }
}

/**
 * Match product title with backend API
 */
async function matchProductTitle(title: string): Promise<ProductMatchResponse> {
  const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.match}?title=${encodeURIComponent(title)}`;
  
  debugLog('Matching product title:', { title, url });
  
  try {
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }, API_CONFIG.timeout);
    
    if (response.ok) {
      const data: ProductMatchResponse = await response.json();
      debugLog('Match API response:', data);
      return data;
    } else {
      // Handle 404 (not found) specially
      if (response.status === 404) {
        const errorData: APIError = await response.json();
        debugLog('Product not found (404):', errorData);
        
        return {
          title,
          matched: false,
          message: typeof errorData.detail === 'string' ? errorData.detail : errorData.detail.message
        };
      } else {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
    }
    
  } catch (error) {
    debugLog('Error matching product title:', error);
    throw error;
  }
}

/**
 * Check API status
 */
async function checkAPIStatus() {
  const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.status}`;
  
  try {
    const response = await fetchWithTimeout(url, {
      method: 'GET',
    }, API_CONFIG.timeout);
    
    if (response.ok) {
      const data = await response.json();
      return { 
        online: true, 
        status: data,
        timestamp: Date.now()
      };
    } else {
      return { 
        online: false, 
        error: `${response.status} ${response.statusText}`,
        timestamp: Date.now()
      };
    }
    
  } catch (error) {
    return { 
      online: false, 
      error: error.message,
      timestamp: Date.now()
    };
  }
}

/**
 * Test connection to backend
 */
async function testConnection() {
  debugLog('Testing connection to backend...');
  
  try {
    const status = await checkAPIStatus();
    
    if (status.online) {
      // Test the match endpoint with a dummy query
      const testResult = await matchProductTitle('test connection');
      return {
        success: true,
        message: 'Backend connection successful',
        apiStatus: status,
        testMatch: testResult
      };
    } else {
      return {
        success: false,
        message: 'Backend is offline',
        apiStatus: status
      };
    }
    
  } catch (error) {
    return {
      success: false,
      message: `Connection test failed: ${error.message}`,
      error: error.message
    };
  }
}

/**
 * Send notification to content script
 */
async function notifyContentScript(url: string, message: any) {
  try {
    // Find tab with the URL
    const tabs = await chrome.tabs.query({ url: url });
    
    if (tabs.length > 0) {
      await chrome.tabs.sendMessage(tabs[0].id!, message);
    } else {
      // Fallback: send to all TikTok tabs
      const allTabs = await chrome.tabs.query({ 
        url: ['*://*.tiktok.com/*', '*://seller.tiktok.com/*', '*://studio.tiktok.com/*']
      });
      
      for (const tab of allTabs) {
        try {
          await chrome.tabs.sendMessage(tab.id!, message);
        } catch (error) {
          // Tab might not have content script, ignore
        }
      }
    }
  } catch (error) {
    debugLog('Error sending notification to content script:', error);
  }
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

/**
 * Handle extension installation
 */
chrome.runtime.onInstalled.addListener((details) => {
  debugLog('Extension installed/updated:', details);
  
  if (details.reason === 'install') {
    // Set default settings
    chrome.storage.local.set({
      isEnabled: true,
      debugMode: true,
      apiEndpoint: API_CONFIG.baseUrl
    });
    
    // Open welcome page or show notification
    chrome.notifications?.create('welcome', {
      type: 'basic',
      iconUrl: 'assets/icon48.png',
      title: 'TikTok Streamer Helper',
      message: 'Extension installed successfully! Make sure your backend is running on localhost:8000.'
    });
  }
});

/**
 * Handle extension startup
 */
chrome.runtime.onStartup.addListener(() => {
  debugLog('Extension started');
});

/**
 * Handle browser action (popup) click
 */
chrome.action?.onClicked.addListener(async (tab) => {
  // If popup is not available, open options page or perform default action
  debugLog('Browser action clicked for tab:', tab.url);
  
  if (tab.url?.includes('tiktok.com')) {
    // Force check for product on current tab
    try {
      await chrome.tabs.sendMessage(tab.id!, { type: 'FORCE_CHECK' });
    } catch (error) {
      debugLog('Error sending force check message:', error);
    }
  }
});

/**
 * Periodic health check
 */
setInterval(async () => {
  try {
    const status = await checkAPIStatus();
    
    // Store status for popup to read
    await chrome.storage.local.set({
      lastHealthCheck: {
        ...status,
        timestamp: Date.now()
      }
    });
    
    if (!status.online) {
      debugLog('Backend health check failed:', status);
    }
    
  } catch (error) {
    debugLog('Health check error:', error);
  }
}, 60000); // Check every minute

/**
 * Clean up old data periodically
 */
setInterval(async () => {
  try {
    const storage = await chrome.storage.local.get();
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    // Remove old matches and health checks
    const keysToRemove = Object.keys(storage).filter(key => {
      const data = storage[key];
      return data?.timestamp && data.timestamp < cutoff;
    });
    
    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
      debugLog('Cleaned up old storage data:', keysToRemove);
    }
    
  } catch (error) {
    debugLog('Storage cleanup error:', error);
  }
}, 6 * 60 * 60 * 1000); // Clean up every 6 hours

debugLog('TikTok Streamer Background Script initialized'); 