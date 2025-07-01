# TikTok Teleprompter

A desktop teleprompter application for TikTok luxury resale livestreams with real-time script display, overlay mode, and WebSocket integration.

## Features

- **Real-time Script Display**: Receives scripts from backend via WebSocket
- **Overlay Mode**: Transparent overlay that stays on top (F11)
- **Script Navigation**: Navigate through script blocks and variations
- **Auto-scroll**: 60px/s automatic scrolling for hands-free reading
- **Hotkeys**: Full keyboard control for seamless streaming
- **Missing Product Alerts**: Orange banner when products aren't in database

## Setup

### Prerequisites

- Node.js 18 or higher
- Backend API running on localhost:8000

### Installation

```bash
cd teleprompter
npm install
```

### Development

```bash
npm run electron:dev
```

### Building

```bash
# Build for current platform
npm run electron:pack

# Build distributables
npm run electron:dist

# Build after compile
npm run electron:build
```

## Usage

### Hotkeys

| Key | Action |
|-----|--------|
| `Space` | Next script block (Hook → Look → Story → Value → CTA) |
| `Ctrl + →` | Next script variation |
| `Ctrl + ←` | Previous script variation |
| `Ctrl + Alt + R` | Toggle auto-scroll mode (60px/s) |
| `F11` | Toggle transparent overlay mode |
| `Escape` | Close help dialog |

### Window Modes

**Normal Mode (Default)**:
- 400×600 window
- Regular window frame
- Standard opacity
- Not always on top

**Overlay Mode (F11)**:
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

Navigate with `Space` to go through blocks, or `Ctrl+Arrow` keys to switch between script variations.

### Auto-Scroll

Enable auto-scroll with `Ctrl+Alt+R` for hands-free reading:
- Scrolls at 60 pixels per second
- Works within the current script block
- Visual indicator shows when active
- Toggle again to disable

### Missing Product Alerts

When the Chrome extension detects a product not in the database:
- Orange banner appears: "⚠️ SCRIPT MISSING"
- Auto-hides after 10 seconds
- Indicates need to add product to inventory

## Configuration

Settings are stored using electron-store:
- `wsHost`: WebSocket host (default: localhost:8000)
- `lastBagId`: Last selected bag ID for reconnection

## Architecture

```
┌─────────────────┐    WebSocket     ┌─────────────────┐
│   Teleprompter  │ ←──────────────→ │   Backend API   │
│   (Electron)    │                  │   (FastAPI)     │
└─────────────────┘                  └─────────────────┘
                                              ↑
                                     HTTP Requests
                                              │
                                     ┌─────────────────┐
                                     │ Chrome Extension│
                                     │   (Plasmo)      │
                                     └─────────────────┘
```

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

1. Ensure backend is running on localhost:8000
2. Check WebSocket endpoint: `ws://localhost:8000/ws/render`
3. Verify firewall/antivirus isn't blocking connection

### Overlay Mode Issues

1. Some windows managers may not support transparent overlay
2. Try toggling overlay mode if display appears corrupted
3. Restart app if overlay becomes unresponsive

### Hotkeys Not Working

1. Global shortcuts may conflict with other apps
2. Use in-app controls as backup
3. Check if another app is capturing the same keys

### Performance

- Auto-scroll uses minimal CPU with 33ms intervals
- WebSocket connection pings every 30 seconds
- Settings persist between sessions

## Development

### Project Structure

```
teleprompter/
├── package.json          # Dependencies and build config
├── src/
│   ├── main.js          # Electron main process
│   └── renderer/
│       ├── index.html   # UI layout
│       └── renderer.js  # UI logic and WebSocket handling
└── README.md
```

### Building for Distribution

The app can be built for Windows, macOS, and Linux:

```bash
# Windows
npm run electron:dist -- --win

# macOS  
npm run electron:dist -- --mac

# Linux
npm run electron:dist -- --linux
```

Built distributables will be in the `dist/` directory.

## License

MIT License - See project root for details. 