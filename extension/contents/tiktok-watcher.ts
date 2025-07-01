import type { PlasmoCSConfig } from "plasmo"
import { 
  SELECTORS, 
  EXTENSION_CONFIG, 
  MUTATION_CONFIG,
  getActiveSelectors,
  isSupportedDomain,
  debugLog 
} from "../src/config"

export const config: PlasmoCSConfig = {
  matches: [
    "https://*.tiktok.com/*",
    "https://seller.tiktok.com/*",
    "https://studio.tiktok.com/*"
  ],
  run_at: "document_end"
}

// State management
let lastProductTitle = '';
let isWatching = false;
let mutationObserver: MutationObserver | null = null;
let debounceTimer: number | null = null;

/**
 * Initialize the content script when DOM is ready
 */
function initialize() {
  debugLog('Initializing TikTok Watcher content script');
  
  if (!isSupportedDomain()) {
    debugLog('Not a supported TikTok domain, exiting');
    return;
  }
  
  // Wait for page to load completely
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startWatching);
  } else {
    startWatching();
  }
}

/**
 * Start watching for product changes
 */
function startWatching() {
  if (isWatching) {
    debugLog('Already watching, skipping initialization');
    return;
  }
  
  debugLog('Starting to watch for product changes');
  isWatching = true;
  
  // Set up mutation observer for DOM changes
  setupMutationObserver();
  
  // Initial check for active products
  checkForActiveProduct();
  
  // Periodic check as backup (in case mutations are missed)
  setInterval(checkForActiveProduct, EXTENSION_CONFIG.watchInterval);
  
  debugLog('TikTok Watcher initialized successfully');
}

/**
 * Set up mutation observer to watch for DOM changes
 */
function setupMutationObserver() {
  const selectors = getActiveSelectors();
  
  try {
    mutationObserver = new MutationObserver((mutations) => {
      let shouldCheck = false;
      
      mutations.forEach((mutation) => {
        // Check if the mutation affects product elements
        if (mutation.type === 'childList') {
          // Check if nodes were added/removed that might be products
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (element.matches && (
                element.matches(selectors.activeProduct) ||
                element.querySelector(selectors.activeProduct) ||
                element.closest(selectors.productList)
              )) {
                shouldCheck = true;
              }
            }
          });
        } else if (mutation.type === 'attributes') {
          // Check if class or state attributes changed
          const target = mutation.target as Element;
          if (target.matches && (
            target.matches(selectors.activeProduct) ||
            target.closest(selectors.productList)
          )) {
            shouldCheck = true;
          }
        }
      });
      
      if (shouldCheck) {
        debouncedProductCheck();
      }
    });
    
    // Start observing the document
    mutationObserver.observe(document.body, MUTATION_CONFIG);
    debugLog('Mutation observer started');
    
  } catch (error) {
    debugLog('Error setting up mutation observer:', error);
    // Fallback to periodic checking only
  }
}

/**
 * Debounced product check to avoid too many API calls
 */
function debouncedProductCheck() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  
  debounceTimer = window.setTimeout(() => {
    checkForActiveProduct();
    debounceTimer = null;
  }, EXTENSION_CONFIG.debounceDelay);
}

/**
 * Check for active product and extract title
 */
function checkForActiveProduct() {
  const selectors = getActiveSelectors();
  
  try {
    // Find the active product element
    const activeProduct = document.querySelector(selectors.activeProduct);
    
    if (!activeProduct) {
      debugLog('No active product found');
      return;
    }
    
    // Extract product title using multiple selector strategies
    const productTitle = extractProductTitle(activeProduct, selectors);
    
    if (!productTitle) {
      debugLog('No product title found in active product');
      return;
    }
    
    // Clean and validate title
    const cleanTitle = cleanProductTitle(productTitle);
    
    if (cleanTitle === lastProductTitle) {
      // Same product, no action needed
      return;
    }
    
    debugLog('Product changed:', { old: lastProductTitle, new: cleanTitle });
    
    // Update last title
    lastProductTitle = cleanTitle;
    
    // Store in extension storage
    chrome.storage.local.set({ 
      [EXTENSION_CONFIG.storageKeys.lastProductTitle]: cleanTitle 
    });
    
    // Send to background script
    sendProductChangeMessage(cleanTitle);
    
  } catch (error) {
    debugLog('Error checking for active product:', error);
  }
}

/**
 * Extract product title from active product element
 */
function extractProductTitle(activeProduct: Element, selectors: typeof SELECTORS): string | null {
  // Try multiple strategies to find the product title
  const strategies = [
    // Strategy 1: Direct query within active product
    () => activeProduct.querySelector(selectors.productTitle)?.textContent,
    
    // Strategy 2: Try alternative selectors
    () => {
      for (const selector of selectors.alternativeSelectors.productTitle) {
        const element = activeProduct.querySelector(selector);
        if (element?.textContent?.trim()) {
          return element.textContent;
        }
      }
      return null;
    },
    
    // Strategy 3: Look for title in parent product container
    () => {
      const productContainer = activeProduct.closest('[data-product], .product-item, .inventory-item');
      if (productContainer) {
        const titleElement = productContainer.querySelector(selectors.productTitle);
        return titleElement?.textContent;
      }
      return null;
    },
    
    // Strategy 4: Look for any text content that looks like a title
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
    
    // Strategy 5: Use title attribute or aria-label
    () => {
      return activeProduct.getAttribute('title') || 
             activeProduct.getAttribute('aria-label') ||
             activeProduct.querySelector('[title]')?.getAttribute('title');
    }
  ];
  
  // Try each strategy until we find a title
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

/**
 * Clean and validate product title
 */
function cleanProductTitle(title: string): string {
  if (!title) return '';
  
  // Remove extra whitespace and normalize
  let cleaned = title.trim().replace(/\s+/g, ' ');
  
  // Remove common UI text that might be included
  const unwantedPhrases = [
    'Edit',
    'Delete', 
    'More options',
    'Product details',
    'View product',
    'Select product'
  ];
  
  unwantedPhrases.forEach(phrase => {
    cleaned = cleaned.replace(new RegExp(phrase, 'gi'), '').trim();
  });
  
  // Truncate if too long
  if (cleaned.length > EXTENSION_CONFIG.maxTitleLength) {
    cleaned = cleaned.substring(0, EXTENSION_CONFIG.maxTitleLength).trim();
  }
  
  return cleaned;
}

/**
 * Send product change message to background script
 */
function sendProductChangeMessage(productTitle: string) {
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

/**
 * Handle messages from background script
 */
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
      
    default:
      sendResponse({ error: 'Unknown message type' });
  }
});

/**
 * Show notification overlay on page
 */
function showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
  // Create notification element
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
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

/**
 * Listen for messages from background script to show notifications
 */
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SHOW_NOTIFICATION') {
    showNotification(message.message, message.notificationType);
  }
});

/**
 * Clean up when page unloads
 */
window.addEventListener('beforeunload', () => {
  if (mutationObserver) {
    mutationObserver.disconnect();
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
});

// Initialize when script loads
initialize(); 