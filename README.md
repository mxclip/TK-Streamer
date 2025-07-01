# TikTok Luxury Resale Livestream Helper

A complete system for managing luxury resale livestreams with script automation, real-time product matching, and teleprompter integration.

## System Overview

This MVP consists of three integrated components:

1. **Backend + Admin Web** – FastAPI backend with PostgreSQL, JWT RBAC, CSV import, WebSocket push, and analytics
2. **Teleprompter Desktop App** – Electron app with transparent overlay, script navigation, and WebSocket integration
3. **Chrome Extension** – MV3 extension that watches TikTok Studio/Seller Center for product changes

## Quick Start

### 1. Start Backend & Admin (Docker)

```bash
# Clone and start the main services
docker-compose up --build

# Backend API: http://localhost:8000
# Admin Interface: http://localhost:3000
# PostgreSQL: localhost:5432
```

### 2. Build & Run Teleprompter

```bash
cd teleprompter
npm install
npm run electron:dev
```

### 3. Build & Install Chrome Extension

```bash
cd extension
pnpm install
pnpm plasmo dev    # Development mode
pnpm plasmo build  # Production build for Chrome store
```

## Environment Variables

Create `.env` file in project root:

```env
# Database
POSTGRES_SERVER=localhost
POSTGRES_USER=postgres
POSTGRES_PASSWORD=changethis
POSTGRES_DB=tiktok_streamer

# Backend
SECRET_KEY=your-secret-key-here-change-this
FIRST_SUPERUSER=admin@example.com
FIRST_SUPERUSER_PASSWORD=changethis

# CORS
BACKEND_CORS_ORIGINS=["http://localhost:3000","http://localhost:8080"]

# WebSocket
WS_HOST=localhost:8000
```

## CSV Import Templates

### Template A (Scripts Only)
```csv
bag_id,script_text
101,"NYC girls, LOOK 💥 This vintage Chanel..."
101,"Ladies, can you handle this HEAT? 🔥..."
102,"Stop everything! This Hermès piece..."
```

### Template B (Bags + Scripts)
```csv
bag_id,brand,model,color,condition,hook_text,look_text,story_text,value_text,cta_text
101,Chanel,Classic Flap,Black,Excellent,"NYC girls, LOOK 💥","Pebbled canvas with signature quilting","Found in a Paris estate sale","Retail $8000, yours for $4500","DM me NOW - first come first served!"
102,Hermès,Birkin,Orange,New,"Stop everything!","Authentic Hermès craftsmanship","Direct from authorized dealer","Investment piece - only appreciates","Link in bio - payment plans available!"
```

## Teleprompter Hotkeys

| Key | Action |
|-----|--------|
| `Space` | Next script block (Hook → Look → Story → Value → CTA) |
| `Ctrl + →` | Next script variation |
| `Ctrl + ←` | Previous script variation |
| `Ctrl + Alt + R` | Toggle auto-scroll mode (60px/s) |
| `F11` | Toggle transparent overlay mode |

## API Endpoints

### Admin Endpoints
- `POST /upload/csv?template=a|b` - Import bags/scripts via CSV
- `GET /bags` - List all bags with scripts
- `GET/POST /phrase-map` - Manage phrase replacement rules
- `POST /phrase-map/rescan` - Re-apply phrase mapping to all scripts
- `GET /stats/repetition` - Analytics on script usage

### Streamer Endpoints
- `GET /bag/{id}/scripts` - Get scripts for specific bag
- `POST /feedback` - Submit 👍/👎 feedback for scripts
- `WS /ws/render?bag_id=...` - Real-time script streaming

### Extension Endpoints
- `GET /match?title=...` - Match product title to bag (returns bag_id or 404)

## Database Schema

```sql
-- User accounts with role-based access
account(id PK, name, role ENUM<admin,streamer>)

-- Luxury bags inventory
bag(id PK, brand, model, color, condition, account_id FK)

-- Scripts for each bag (5 types: hook, look, story, value, cta)
script(id PK, bag_id FK, content TEXT, used_count INT DEFAULT 0, like_count INT DEFAULT 0)

-- Phrase replacement rules (Chinglish → proper English)
phrase_map(id PK, account_id FK, find_phrase TEXT, replace_phrase TEXT, active BOOL DEFAULT TRUE)

-- Track unmatched product titles from TikTok Studio
missing_bag(id PK, raw_title TEXT, first_seen TIMESTAMP DEFAULT now())

-- Live feedback for script effectiveness
feedback(id PK, script_id FK, live_event_ts TIMESTAMP, rating INT) -- 1 👍, -1 👎
```

## Chrome Extension Configuration

The extension watches TikTok Studio/Seller Center for DOM changes. Configure selectors in `extension/src/config.ts`:

```typescript
export const SELECTORS = {
  productList: '#product-list',
  activeProduct: '.product--active',
  productTitle: '.product-title, [data-testid="product-name"]'
}
```

## Development Workflow

1. **Backend Development**: Use FastAPI auto-reload at `http://localhost:8000/docs`
2. **Admin Interface**: React dev server with HMR at `http://localhost:3000`
3. **Teleprompter Testing**: Run `npm run electron:dev` for hot reload
4. **Extension Testing**: Use `pnpm plasmo dev` and load unpacked extension

## Production Deployment

1. Update environment variables for production
2. Run `docker-compose up -d` for backend services
3. Build Electron app: `npm run electron:build`
4. Build extension: `pnpm plasmo build` and upload to Chrome Web Store

## Troubleshooting

- **WebSocket Connection Issues**: Check CORS origins and firewall settings
- **Extension Not Detecting Products**: Verify DOM selectors in TikTok Studio
- **Phrase Mapping Not Working**: Check regex patterns and active status
- **CSV Import Errors**: Validate CSV format and check server logs

## Support

This system uses production-ready libraries:
- FastAPI with PostgreSQL for scalable backend
- Electron for cross-platform desktop app
- Plasmo for modern Chrome extension development
- Docker Compose for easy deployment 