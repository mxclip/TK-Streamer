# TikTok Streamer Backend

FastAPI backend for the TikTok Luxury Resale Livestream Helper system.

## Features

- **Authentication & Authorization**: JWT-based auth with role-based access control (Admin/Streamer)
- **Bag Management**: Complete CRUD operations for luxury bag inventory
- **Script Management**: AI-powered script generation and management
- **Phrase Mapping**: Automated chat response system with Chinglish detection
- **Analytics**: Comprehensive performance metrics and insights
- **WebSocket Support**: Real-time script streaming to teleprompter
- **CSV/Excel Import**: Bulk data import functionality
- **Missing Items Tracking**: Inventory management and smart search

## Tech Stack

- **Framework**: FastAPI
- **Database**: SQLite (dev) / PostgreSQL (production)
- **ORM**: SQLModel
- **Authentication**: JWT with python-jose
- **WebSockets**: Built-in FastAPI support
- **Testing**: pytest, pytest-asyncio
- **Documentation**: Auto-generated OpenAPI/Swagger

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   └── routes/          # API endpoints
│   ├── core/                # Core configuration
│   ├── middleware/          # Security & rate limiting
│   ├── models.py            # Database models
│   └── services/            # Business logic
├── tests/                   # Test suite
├── alembic/                 # Database migrations
└── requirements.txt         # Dependencies
```

## Development Setup

### Prerequisites

- Python 3.11+
- Poetry (recommended) or pip

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mxclip/TK-Streamer.git
   cd TK-Streamer/backend
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   # or with Poetry:
   poetry install
   ```

4. **Set up environment variables**:
   ```bash
   # Copy the example env file
   cp .env.example .env
   # Edit .env with your settings
   ```

5. **Run database migrations**:
   ```bash
   alembic upgrade head
   ```

6. **Create initial data**:
   ```bash
   python app/initial_data.py
   python app/create_test_data.py  # Optional: adds test data
   ```

7. **Start the development server**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

The API will be available at http://localhost:8000
API documentation at http://localhost:8000/docs

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/me` - Get current user

### Bags Management
- `GET /api/v1/bags` - List all bags
- `POST /api/v1/bags` - Create new bag
- `GET /api/v1/bag/{id}` - Get bag details
- `PUT /api/v1/bags/{id}` - Update bag
- `DELETE /api/v1/bags/{id}` - Delete bag
- `POST /api/v1/bags/import-csv` - Bulk import bags

### Scripts
- `GET /api/v1/scripts` - List all scripts
- `POST /api/v1/scripts` - Create new script
- `PUT /api/v1/scripts/{id}` - Update script
- `DELETE /api/v1/scripts/{id}` - Delete script

### Analytics
- `GET /api/v1/analytics` - Get analytics dashboard data
- `GET /api/v1/analytics/performance` - Performance metrics

### Phrase Mappings
- `GET /api/v1/phrase-mappings` - List mappings
- `POST /api/v1/phrase-mappings` - Create mapping
- `POST /api/v1/phrase-mappings/test` - Test phrase

### WebSocket
- `WS /ws/render` - Real-time script streaming

## Testing

Run the test suite:

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app tests/

# Run specific test file
pytest tests/test_auth.py
```

## Database Management

### Migrations

Create a new migration:
```bash
alembic revision --autogenerate -m "description"
```

Apply migrations:
```bash
alembic upgrade head
```

Rollback:
```bash
alembic downgrade -1
```

## Production Deployment

### Using Docker Compose

1. **Build and start services**:
   ```bash
   docker-compose up -d
   ```

2. **View logs**:
   ```bash
   docker-compose logs -f backend
   ```

3. **Scale services**:
   ```bash
   docker-compose up -d --scale backend=3
   ```

### Manual Deployment

1. **Set production environment variables**
2. **Use PostgreSQL instead of SQLite**
3. **Run with gunicorn**:
   ```bash
   gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
   ```

### Security Considerations

- ✅ Rate limiting enabled (100 requests/minute)
- ✅ Input validation middleware
- ✅ CORS properly configured
- ✅ Security headers added
- ✅ JWT token authentication
- ✅ SQL injection protection (via SQLModel)

### Environment Variables

Key environment variables for production:

- `DATABASE_TYPE`: Set to "postgresql"
- `SECRET_KEY`: Long random string (generate with `openssl rand -hex 32`)
- `BACKEND_CORS_ORIGINS`: Comma-separated list of allowed origins
- `POSTGRES_*`: PostgreSQL connection settings
- `FIRST_SUPERUSER`: Admin email
- `FIRST_SUPERUSER_PASSWORD`: Admin password

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- OpenAPI Schema: http://localhost:8000/api/v1/openapi.json

## Troubleshooting

### Common Issues

1. **Database connection errors**:
   - Ensure PostgreSQL is running (for production)
   - Check database credentials in .env

2. **CORS errors**:
   - Add frontend URL to BACKEND_CORS_ORIGINS
   - Ensure proper protocol (http/https)

3. **Import errors**:
   - Set PYTHONPATH: `export PYTHONPATH=$PWD`

4. **Migration errors**:
   - Drop and recreate database if in development
   - Check for model changes

## Contributing

1. Create a feature branch
2. Add tests for new functionality
3. Ensure all tests pass
4. Submit pull request

## License

[Your License Here] 