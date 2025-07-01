/**
 * Configuration for TikTok Streamer Extension
 * DOM selectors must be configurable for different TikTok layouts
 */

export const SELECTORS = {
  // Main product list container
  productList: '#product-list',
  
  // Active product selector (when product is selected/focused)
  activeProduct: '.product--active',
  
  // Product title/name selectors (multiple options for different layouts)
  productTitle: '.product-title, [data-testid="product-name"], .product-name, .item-title',
  
  // Alternative selectors for different TikTok Studio versions
  alternativeSelectors: {
    productList: [
      '#product-list',
      '.product-grid',
      '.inventory-list',
      '[data-testid="product-list"]'
    ],
    activeProduct: [
      '.product--active',
      '.product.active',
      '.selected-product',
      '[data-state="selected"]'
    ],
    productTitle: [
      '.product-title',
      '[data-testid="product-name"]',
      '.product-name',
      '.item-title',
      '.title',
      'h2',
      'h3'
    ]
  }
};

export const API_CONFIG = {
  // Backend API endpoints
  baseUrl: 'http://localhost:8000',
  endpoints: {
    match: '/api/v1/match',
    status: '/api/v1/status'
  },
  
  // Request timeout in milliseconds
  timeout: 5000,
  
  // Retry configuration
  maxRetries: 3,
  retryDelay: 1000
};

export const EXTENSION_CONFIG = {
  // How often to check for DOM changes (milliseconds)
  watchInterval: 1000,
  
  // Debounce delay for product changes (milliseconds) 
  debounceDelay: 500,
  
  // Maximum length of product title to send
  maxTitleLength: 500,
  
  // Debug mode
  debug: true,
  
  // Storage keys
  storageKeys: {
    lastProductTitle: 'lastProductTitle',
    apiEndpoint: 'apiEndpoint',
    isEnabled: 'isEnabled',
    debugMode: 'debugMode'
  }
};

export const TIKTOK_DOMAINS = [
  'tiktok.com',
  'seller.tiktok.com',
  'studio.tiktok.com',
  'live.tiktok.com'
];

// Notification settings
export const NOTIFICATIONS = {
  duration: 3000, // Show notifications for 3 seconds
  types: {
    success: { color: '#4CAF50', icon: '✓' },
    error: { color: '#F44336', icon: '✗' },
    warning: { color: '#FF9800', icon: '⚠' },
    info: { color: '#2196F3', icon: 'ℹ' }
  }
};

// Mutation observer configuration
export const MUTATION_CONFIG = {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['class', 'data-state', 'aria-selected']
};

/**
 * Get the appropriate selector for the current page
 */
export function getActiveSelectors(): typeof SELECTORS {
  const url = window.location.href;
  
  // You can add specific selector overrides for different TikTok Studio versions
  if (url.includes('seller.tiktok.com')) {
    return {
      ...SELECTORS,
      // Seller Center specific overrides
      productList: '.inventory-container, #product-list',
      activeProduct: '.inventory-item.selected, .product--active'
    };
  }
  
  if (url.includes('studio.tiktok.com')) {
    return {
      ...SELECTORS,
      // Studio specific overrides  
      productList: '.product-grid, #product-list',
      activeProduct: '.product-card.active, .product--active'
    };
  }
  
  return SELECTORS;
}

/**
 * Validate if current page is a supported TikTok domain
 */
export function isSupportedDomain(): boolean {
  const hostname = window.location.hostname;
  return TIKTOK_DOMAINS.some(domain => hostname.includes(domain));
}

/**
 * Get debug mode status
 */
export function isDebugMode(): boolean {
  return EXTENSION_CONFIG.debug || window.localStorage.getItem('tiktok-streamer-debug') === 'true';
}

/**
 * Log debug messages
 */
export function debugLog(...args: any[]): void {
  if (isDebugMode()) {
    console.log('[TikTok Streamer]', ...args);
  }
} 