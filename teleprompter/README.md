# TikTok Teleprompter

A secure desktop teleprompter application for TikTok luxury resale livestreams with real-time script display, overlay mode, configurable WebSocket connection, and enhanced security.

## Features

- **Real-time Script Display**: Receives scripts from backend via WebSocket
- **Overlay Mode**: Transparent overlay that stays on top (Ctrl+Shift+F11)
- **Script Navigation**: Navigate through script blocks and variations
- **Auto-scroll**: 60px/s automatic scrolling for hands-free reading
- **Secure Communication**: Context isolation and preload scripts for security
- **Configurable Backend**: Set custom WebSocket host through settings
- **Conflict-Free Hotkeys**: Unique key combinations to avoid system conflicts
- **Missing Product Alerts**: Orange banner when products aren't in database

## Security Improvements

- ✅ **Context Isolation Enabled**: Secure renderer process isolation
- ✅ **Node Integration Disabled**: No direct Node.js access in renderer
- ✅ **Preload Script**: Secure IPC communication bridge
- ✅ **No Remote Module**: Prevents remote code execution
- ✅ **Stable Electron Version**: Uses Electron 25.x for stability

## Setup

### Prerequisites

- Node.js 18 or higher
- Backend API running (default: localhost:8000)

### Installation

```bash
cd teleprompter
npm install
```

### Development

```bash
npm run electron:dev
# or
npm run dev
```

### Building

```bash
# Build for current platform
npm run electron:pack

# Build distributables
npm run electron:dist

# Build for specific platforms
npm run dist:linux    # Linux AppImage
npm run dist:win      # Windows installer
npm run dist:mac      # macOS DMG
```

## Usage

### Updated Hotkeys (Conflict-Free)

| Key Combination | Action |
|----------------|--------|
| `Ctrl + Shift + Space` | Next script block (Hook → Look → Story → Value → CTA) |
| `Ctrl + Shift + →` | Next script variation |
| `Ctrl + Shift + ←` | Previous script variation |
| `Ctrl + Shift + R` | Toggle auto-scroll mode (60px/s) |
| `Ctrl + Shift + F11` | Toggle transparent overlay mode |
| `Escape` | Close help dialog |

### Configuration

**WebSocket Settings**:
- Access via File → Settings in menu
- Default: `localhost:8000`
- Format: `host:port` (e.g., `192.168.1.100:8000`)
- Changes take effect immediately with automatic reconnection

### Window Modes

**Normal Mode (Default)**:
- 400×600 window
- Regular window frame
- Standard opacity
- Not always on top

**Overlay Mode (Ctrl+Shift+F11)**:
- Borderless window
- 90% opacity with dark background
- Always on top
- Skip taskbar
- Transparent background

### Connection Status

- **Green dot**: Connected to backend WebSocket
- **Red dot**: Disconnected from backend

The app automatically attempts to reconnect every 5 seconds if disconnected.

### Script Display

Scripts are displayed in 5 blocks:
1. **Hook** - Attention-grabbing opener
2. **Look** - Product description  
3. **Story** - Background/provenance
4. **Value** - Pricing/value proposition
5. **CTA** - Call to action

Navigate with `Ctrl+Shift+Space` to go through blocks, or `Ctrl+Shift+Arrow` keys to switch between script variations.

### Auto-Scroll

Enable auto-scroll with `Ctrl+Shift+R` for hands-free reading:
- Scrolls at 60 pixels per second
- Works within the current script block
- Visual indicator shows when active
- Toggle again to disable

### Missing Product Alerts

When the Chrome extension detects a product not in the database:
- Orange banner appears: "⚠️ SCRIPT MISSING: [Product Title]"
- Auto-hides after 10 seconds
- Indicates need to add product to inventory

## Configuration

Settings are stored using electron-store and persist between sessions:
- `wsHost`: WebSocket host (default: localhost:8000)
- `lastBagId`: Last selected bag ID for reconnection

### WebSocket Configuration

1. **Via Settings Dialog**:
   - File → Settings
   - Enter new host:port
   - Automatic reconnection

2. **Supported Formats**:
   - `localhost:8000` (default)
   - `192.168.1.100:8000` (LAN)
   - `api.example.com:8000` (domain)

## Architecture

```
┌─────────────────┐    WebSocket     ┌─────────────────┐
│   Teleprompter  │ ←──────────────→ │   Backend API   │
│   (Electron)    │   Configurable   │   (FastAPI)     │
│                 │                  │                 │
│ ┌─────────────┐ │                  └─────────────────┘
│ │ Preload.js  │ │                          ↑
│ │ (Secure IPC)│ │                 HTTP Requests
│ └─────────────┘ │                          │
└─────────────────┘                 ┌─────────────────┐
                                    │ Chrome Extension│
                                    │   (Plasmo)      │
                                    └─────────────────┘
```

### Secure Communication

**Main Process** ↔ **Preload Script** ↔ **Renderer Process**

- Context isolation prevents direct access to Node.js APIs
- Preload script exposes only necessary functions
- IPC handles are validated and secure

### WebSocket Messages

**Incoming**:
- `scripts`: New script data for bag
- `switch`: Switch to different bag
- `missing_product`: Product not found alert
- `pong`: Connection keepalive response

**Outgoing**:
- `subscribe`: Subscribe to bag updates
- `script_used`: Track script usage analytics
- `ping`: Connection keepalive

## Troubleshooting

### Connection Issues

1. Check WebSocket configuration via File → Settings
2. Verify backend is running on configured host:port
3. Check network connectivity and firewalls
4. Try default settings: `localhost:8000`

### Security Warnings

If you see security warnings in console:
- These are expected with new security model
- All IPC communication is properly sandboxed
- Use preload script for secure functionality

### Overlay Mode Issues

1. Some window managers may not support transparent overlay
2. Try toggling overlay mode if display appears corrupted
3. Restart app if overlay becomes unresponsive
4. Check if other apps are interfering with always-on-top

### Hotkeys Not Working

1. New key combinations avoid most conflicts
2. Use in-app menu controls as backup
3. Check if accessibility apps are intercepting keys
4. Verify no other Electron apps are using same shortcuts

### Performance

- Auto-scroll uses minimal CPU with 33ms intervals
- WebSocket connection pings every 30 seconds
- Settings persist between sessions
- Secure preload script adds minimal overhead

## Development

### Project Structure

```
teleprompter/
├── package.json          # Dependencies and build config
├── src/
│   ├── main.js          # Electron main process (secure)
│   ├── preload.js       # Secure IPC bridge
│   └── renderer/
│       ├── index.html   # UI layout
│       └── renderer.js  # UI logic and WebSocket handling
└── README.md
```

### Security Best Practices

- ✅ Context isolation enabled
- ✅ Node integration disabled
- ✅ Preload script for secure IPC
- ✅ No remote module access
- ✅ Validated IPC handlers
- ✅ Stable Electron version

### Building for Distribution

The app can be built for Windows, macOS, and Linux:

```bash
# All platforms
npm run electron:dist

# Specific platforms
npm run dist:win      # Windows NSIS installer
npm run dist:mac      # macOS DMG (universal binary)
npm run dist:linux    # Linux AppImage
```

Built distributables will be in the `dist/` directory.

## Migration from v1.0

If upgrading from previous version:

1. **Shortcuts Changed**: Update muscle memory for new combinations
2. **Settings Reset**: Reconfigure WebSocket host if needed
3. **Security**: Enjoy improved security with no functional loss

## License

MIT License - See project root for details. 