// TikTok Streamer Helper - Content Script
// Watches for product changes on TikTok pages and communicates with backend

// Configuration
const SELECTORS = {
  activeProduct: '.inventory-table-row[data-status="active"], .active-product, .selected-product',
  productTitle: '.product-title, .inventory-name, [data-testid="product-name"]',
  productList: '.inventory-table, .product-list',
  alternativeSelectors: {
    productTitle: [
      '.product-info h3',
      '.item-name',
      '.title-text',
      '[aria-label*="product"]',
      'h1, h2, h3'
    ]
  }
};

const CONFIG = {
  watchInterval: 2000,
  debounceDelay: 500,
  maxTitleLength: 200
};

// State
let lastProductTitle = '';
let isWatching = false;
let mutationObserver = null;
let debounceTimer = null;

// Debug logging
function debugLog(...args) {
  if (localStorage.getItem('tiktok-streamer-debug') === 'true') {
    console.log('[TikTok Streamer]', ...args);
  }
}

// Check if current domain is supported
function isSupportedDomain() {
  const hostname = window.location.hostname;
  return hostname.includes('tiktok.com') || 
         hostname.includes('seller.tiktok.com') || 
         hostname.includes('studio.tiktok.com');
}

// Initialize content script
function initialize() {
  debugLog('Initializing TikTok Watcher content script');
  
  if (!isSupportedDomain()) {
    debugLog('Not a supported TikTok domain, exiting');
    return;
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startWatching);
  } else {
    startWatching();
  }
}

// Start watching for product changes
function startWatching() {
  if (isWatching) {
    debugLog('Already watching, skipping initialization');
    return;
  }
  
  debugLog('Starting to watch for product changes');
  isWatching = true;
  
  setupMutationObserver();
  checkForActiveProduct();
  
  // Periodic check as backup
  setInterval(checkForActiveProduct, CONFIG.watchInterval);
  
  debugLog('TikTok Watcher initialized successfully');
}

// Set up mutation observer
function setupMutationObserver() {
  try {
    mutationObserver = new MutationObserver((mutations) => {
      let shouldCheck = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node;
              if (element.matches && (
                element.matches(SELECTORS.activeProduct) ||
                element.querySelector(SELECTORS.activeProduct) ||
                element.closest(SELECTORS.productList)
              )) {
                shouldCheck = true;
              }
            }
          });
        } else if (mutation.type === 'attributes') {
          const target = mutation.target;
          if (target.matches && (
            target.matches(SELECTORS.activeProduct) ||
            target.closest(SELECTORS.productList)
          )) {
            shouldCheck = true;
          }
        }
      });
      
      if (shouldCheck) {
        debouncedProductCheck();
      }
    });
    
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-status', 'aria-selected']
    });
    
    debugLog('Mutation observer started');
    
  } catch (error) {
    debugLog('Error setting up mutation observer:', error);
  }
}

// Debounced product check
function debouncedProductCheck() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  
  debounceTimer = setTimeout(() => {
    checkForActiveProduct();
    debounceTimer = null;
  }, CONFIG.debounceDelay);
}

// Check for active product
function checkForActiveProduct() {
  try {
    const activeProduct = document.querySelector(SELECTORS.activeProduct);
    
    if (!activeProduct) {
      debugLog('No active product found');
      return;
    }
    
    const productTitle = extractProductTitle(activeProduct);
    
    if (!productTitle) {
      debugLog('No product title found in active product');
      return;
    }
    
    const cleanTitle = cleanProductTitle(productTitle);
    
    if (cleanTitle === lastProductTitle) {
      return;
    }
    
    debugLog('Product changed:', { old: lastProductTitle, new: cleanTitle });
    
    lastProductTitle = cleanTitle;
    
    // Store in extension storage
    chrome.storage.local.set({ lastProductTitle: cleanTitle });
    
    // Send to background script
    sendProductChangeMessage(cleanTitle);
    
  } catch (error) {
    debugLog('Error checking for active product:', error);
  }
}

// Extract product title from element
function extractProductTitle(activeProduct) {
  // Try multiple strategies
  const strategies = [
    // Direct query
    () => activeProduct.querySelector(SELECTORS.productTitle)?.textContent,
    
    // Alternative selectors
    () => {
      for (const selector of SELECTORS.alternativeSelectors.productTitle) {
        const element = activeProduct.querySelector(selector);
        if (element?.textContent?.trim()) {
          return element.textContent;
        }
      }
      return null;
    },
    
    // Parent container
    () => {
      const container = activeProduct.closest('[data-product], .product-item, .inventory-item');
      if (container) {
        const titleElement = container.querySelector(SELECTORS.productTitle);
        return titleElement?.textContent;
      }
      return null;
    },
    
    // Text content search
    () => {
      const textElements = activeProduct.querySelectorAll('h1, h2, h3, h4, .title, [title]');
      for (const element of textElements) {
        const text = element.textContent?.trim();
        if (text && text.length > 10 && text.length < 200) {
          return text;
        }
      }
      return null;
    },
    
    // Attributes
    () => {
      return activeProduct.getAttribute('title') || 
             activeProduct.getAttribute('aria-label') ||
             activeProduct.querySelector('[title]')?.getAttribute('title');
    }
  ];
  
  for (const strategy of strategies) {
    try {
      const title = strategy();
      if (title?.trim()) {
        debugLog('Found title using strategy:', title);
        return title.trim();
      }
    } catch (error) {
      debugLog('Strategy failed:', error);
    }
  }
  
  debugLog('No title found with any strategy');
  return null;
}

// Clean product title
function cleanProductTitle(title) {
  if (!title) return '';
  
  let cleaned = title.trim().replace(/\s+/g, ' ');
  
  const unwantedPhrases = [
    'Edit', 'Delete', 'More options', 'Product details', 'View product', 'Select product'
  ];
  
  unwantedPhrases.forEach(phrase => {
    cleaned = cleaned.replace(new RegExp(phrase, 'gi'), '').trim();
  });
  
  if (cleaned.length > CONFIG.maxTitleLength) {
    cleaned = cleaned.substring(0, CONFIG.maxTitleLength).trim();
  }
  
  return cleaned;
}

// Send message to background script
function sendProductChangeMessage(productTitle) {
  try {
    chrome.runtime.sendMessage({
      type: 'PRODUCT_CHANGED',
      data: {
        title: productTitle,
        url: window.location.href,
        timestamp: Date.now()
      }
    }, (response) => {
      if (chrome.runtime.lastError) {
        debugLog('Error sending message:', chrome.runtime.lastError);
      } else {
        debugLog('Product change message sent successfully:', response);
      }
    });
  } catch (error) {
    debugLog('Error sending product change message:', error);
  }
}

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  debugLog('Received message:', message);
  
  switch (message.type) {
    case 'GET_CURRENT_PRODUCT':
      sendResponse({ title: lastProductTitle });
      break;
      
    case 'FORCE_CHECK':
      checkForActiveProduct();
      sendResponse({ success: true });
      break;
      
    case 'TOGGLE_DEBUG':
      localStorage.setItem('tiktok-streamer-debug', message.enabled ? 'true' : 'false');
      sendResponse({ success: true });
      break;
      
    case 'SHOW_NOTIFICATION':
      showNotification(message.message, message.notificationType);
      sendResponse({ success: true });
      break;
      
    default:
      sendResponse({ error: 'Unknown message type' });
  }
});

// Show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : type === 'warning' ? '#FF9800' : '#2196F3'};
    color: white;
    padding: 12px 16px;
    border-radius: 4px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    max-width: 300px;
    word-wrap: break-word;
  `;
  notification.textContent = `🎯 ${message}`;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

// Cleanup
window.addEventListener('beforeunload', () => {
  if (mutationObserver) {
    mutationObserver.disconnect();
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
});

// Initialize
initialize(); 