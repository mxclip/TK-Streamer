# TikTok Streamer Chrome Extension

A Chrome MV3 extension built with Plasmo that automatically detects product changes in TikTok Studio/Seller Center and communicates with the backend API for real-time script switching.

## Features

- **Automatic Product Detection**: Watches DOM for `.product--active` changes
- **Configurable Selectors**: Adaptable to different TikTok Studio layouts
- **Real-time Backend Communication**: HTTP API calls to match products
- **Visual Notifications**: In-page notifications for match status
- **Debug Mode**: Comprehensive logging for troubleshooting
- **Chrome Storage**: Persists settings and match history

## Setup

### Prerequisites

- Node.js 18 or higher
- pnpm (recommended) or npm
- Chrome browser
- Backend API running on localhost:8000

### Installation

```bash
cd extension
pnpm install
```

### Development

```bash
# Start development server
pnpm plasmo dev

# Extension will auto-reload on changes
# Load unpacked extension from build/chrome-mv3-dev
```

### Building for Production

```bash
# Build extension
pnpm plasmo build

# Package for Chrome Web Store
pnpm plasmo package
```

## Usage

### Installation in Chrome

1. **Development Mode**:
   - Run `pnpm plasmo dev`
   - Open Chrome → Extensions → Enable Developer Mode
   - Click "Load unpacked" → Select `build/chrome-mv3-dev`

2. **Production Mode**:
   - Run `pnpm plasmo build`  
   - Load unpacked from `build/chrome-mv3-prod`
   - Or install from Chrome Web Store (after publishing)

### Configuration

The extension automatically detects TikTok domains:
- `tiktok.com`
- `seller.tiktok.com`
- `studio.tiktok.com`
- `live.tiktok.com`

### DOM Selectors

Configure selectors in `src/config.ts`:

```typescript
export const SELECTORS = {
  productList: '#product-list',
  activeProduct: '.product--active',
  productTitle: '.product-title, [data-testid="product-name"]'
}
```

### Workflow

1. **Navigate to TikTok Studio/Seller Center**
2. **Select a product** (becomes `.product--active`)
3. **Extension extracts title** using multiple selector strategies
4. **API call to `/match?title=...`**
5. **Response handling**:
   - **200**: Product found → Green notification + Teleprompter switch
   - **404**: Product missing → Orange notification + Missing alert

## API Integration

### Endpoints Used

- `GET /api/v1/match?title={product_title}`
- `GET /api/v1/status`

### Response Format

**Success (200)**:
```json
{
  "bag_id": 101,
  "bag": {
    "id": 101,
    "brand": "Chanel",
    "model": "Classic Flap",
    "color": "Black",
    "condition": "Excellent"
  },
  "title": "Chanel Classic Flap Black",
  "matched": true,
  "message": "Product matched successfully"
}
```

**Not Found (404)**:
```json
{
  "detail": {
    "message": "No matching bag found",
    "title": "Unknown Product Title",
    "matched": false,
    "suggestion": "Consider adding this product to your inventory"
  }
}
```

## Architecture

```
┌─────────────────┐    DOM Events    ┌─────────────────┐
│  Content Script │ ────────────────→ │ Mutation Observer│
│  (tiktok-watcher)│                  │ (mutation-summary)│
└─────────────────┘                  └─────────────────┘
         │
    sendMessage()
         │
         ▼
┌─────────────────┐    HTTP Request   ┌─────────────────┐
│ Background Script│ ────────────────→ │   Backend API   │
│  (service worker)│                  │   (FastAPI)     │
└─────────────────┘                  └─────────────────┘
         │                                     │
    notifications                     WebSocket trigger
         │                                     │
         ▼                                     ▼
┌─────────────────┐                  ┌─────────────────┐
│   Visual UI     │                  │  Teleprompter   │
│ (popup + overlay)│                  │   (Electron)    │
└─────────────────┘                  └─────────────────┘
```

## Extension Structure

```
extension/
├── package.json           # Plasmo configuration
├── src/
│   └── config.ts         # Configurable selectors & settings
├── contents/
│   └── tiktok-watcher.ts # Content script (DOM watching)
├── background.ts         # Service worker (API communication)
├── popup.tsx            # Extension popup UI
└── README.md
```

## Development

### Content Script (`tiktok-watcher.ts`)

- Uses `MutationObserver` to watch DOM changes
- Extracts product titles with multiple fallback strategies
- Debounced to prevent excessive API calls
- Sends messages to background script

### Background Script (`background.ts`)

- Handles API communication with backend
- Manages Chrome storage for settings/history
- Sends notifications back to content scripts
- Periodic health checks and cleanup

### Popup Interface (`popup.tsx`)

- Shows connection status and current product
- Displays last successful match
- Settings toggle (enabled/debug mode)
- Quick links to API docs and admin panel

## Configuration Options

### Storage Keys

- `lastProductTitle`: Last detected product
- `apiEndpoint`: Backend API URL
- `isEnabled`: Extension enabled/disabled
- `debugMode`: Debug logging enabled

### Selectors Configuration

```typescript
// Basic selectors
productList: '#product-list'
activeProduct: '.product--active'  
productTitle: '.product-title'

// Alternative selectors for different layouts
alternativeSelectors: {
  productList: ['#product-list', '.product-grid', '.inventory-list'],
  activeProduct: ['.product--active', '.product.active', '.selected-product'],
  productTitle: ['.product-title', '[data-testid="product-name"]', 'h2', 'h3']
}
```

## Debugging

### Enable Debug Mode

1. **Via Popup**: Toggle "Debug Mode" checkbox
2. **Via Console**: `localStorage.setItem('tiktok-streamer-debug', 'true')`
3. **Via Config**: Set `EXTENSION_CONFIG.debug = true`

### Debug Logs

All logs prefixed with `[TikTok Streamer]`:
- Product detection events
- API request/response details
- DOM mutation observations
- Error conditions

### Common Issues

1. **Product Not Detected**:
   - Check DOM selectors in config
   - Verify TikTok page layout hasn't changed
   - Enable debug mode to see selector attempts

2. **API Connection Failed**:
   - Ensure backend is running on localhost:8000
   - Check CORS configuration
   - Verify network connectivity

3. **No Notifications Appearing**:
   - Check content script injection
   - Verify extension permissions
   - Look for JavaScript errors in console

## Testing

### Manual Testing

1. Navigate to TikTok Studio
2. Select different products
3. Verify notifications appear
4. Check popup shows correct status

### Automated Testing

```bash
# Run tests
pnpm test

# Test specific component
pnpm test content-script
```

## Deployment

### Chrome Web Store

1. **Build production version**: `pnpm plasmo package`
2. **Upload to Chrome Web Store Developer Dashboard**
3. **Submit for review** (usually 1-3 days)
4. **Publish after approval**

### Private Distribution

1. **Build**: `pnpm plasmo build`
2. **Package**: Zip the `build/chrome-mv3-prod` directory
3. **Distribute**: Share zip file for manual installation

## Security & Privacy

- **Minimal Permissions**: Only `activeTab` and `storage`
- **Host Permissions**: Limited to TikTok domains and localhost
- **No Data Collection**: Extension only stores functional data locally
- **API Communication**: Only sends product titles (no personal data)

## Troubleshooting

### Extension Not Loading

1. Check Chrome version (requires Chrome 88+)
2. Verify Manifest V3 support
3. Check for JavaScript errors in background page

### DOM Selectors Not Working

1. Inspect TikTok page structure
2. Update selectors in `config.ts`
3. Test with different TikTok Studio versions

### API Integration Issues

1. Verify backend CORS headers include extension origin
2. Check API endpoint availability
3. Ensure proper error handling in responses

## Contributing

1. Fork the repository
2. Create feature branch
3. Update selectors/config as needed
4. Test with different TikTok layouts
5. Submit pull request

## License

MIT License - See project root for details 