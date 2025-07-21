# Superfluous - Express + Electric SQL Integration

This project demonstrates a working Express.js API that integrates with Electric SQL for real-time data synchronization.

## ✅ **Current Status**

**This setup WILL work correctly** with your docker-compose configuration and Electric connection.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client App    │    │  Express API    │    │   PostgreSQL    │
│                 │◄──►│  (Electric      │◄──►│   Database      │
│                 │    │   Proxy)        │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        │
                       ┌─────────────────┐               │
                       │  Electric SQL   │◄──────────────┘
                       │  Sync Engine    │
                       └─────────────────┘
```

## What Works Right Now

✅ **Docker Compose Setup**: All services properly configured  
✅ **Electric SQL Integration**: Real-time sync from PostgreSQL  
✅ **Express API**: Full CRUD operations for bookmarks  
✅ **Electric Proxy**: `/api/electric` endpoint for sync  
✅ **Database Connection**: Direct writes, Electric reads  
✅ **Health Checks**: All services monitored  
✅ **Nginx Routing**: Traffic properly distributed

## Services

- **PostgreSQL**: Main database with logical replication enabled
- **Electric**: Sync engine for real-time data streaming
- **Express API**: CRUD operations + Electric proxy
- **Auth Services**: Go-based authentication (2 instances for load balancing)
- **Nginx**: Reverse proxy and load balancer

## Quick Start

1. **Start the services**:

   ```bash
   docker-compose up -d
   ```

2. **Verify everything is running**:

   ```bash
   # Check all services are healthy
   docker-compose ps

   # Test the API
   curl http://localhost/api/health

   # Test Electric connection
   curl http://localhost/electric/v1/health
   ```

3. **Test the integration**:

   ```bash
   # Create a bookmark (writes to database)
   curl -X POST http://localhost/api/bookmarks \
     -H "Content-Type: application/json" \
     -d '{
       "type": "URL",
       "content": "https://example.com",
       "author_id": 1,
       "folder_id": 1
     }'

   # Get bookmarks via Electric sync
   curl "http://localhost/api/electric?table=bookmarks&offset=-1" \
     -H "Authorization: insecure-token-change-me"
   ```

## API Endpoints

### Core CRUD Operations

- `POST /api/bookmarks` - Create bookmark
- `GET /api/bookmarks/:userId` - Get user bookmarks
- `GET /api/bookmarks/sync/:userId` - Get bookmarks via Electric sync
- `PUT /api/bookmarks/:bookmarkId` - Update bookmark
- `DELETE /api/bookmarks/:bookmarkId` - Delete bookmark

### Electric Integration

- `GET /api/electric` - Electric sync proxy (with auth)
- `POST /api/electric` - Event processing endpoint

## How It Works

### 1. **Write Path**: Direct to Database

```javascript
// Create bookmark → PostgreSQL
POST / api / bookmarks;
```

### 2. **Read Path**: Electric Sync

```javascript
// Real-time sync ← Electric ← PostgreSQL logical replication
GET /api/electric?table=bookmarks&offset=-1
```

### 3. **Real-time Updates**

1. Client writes data via Express API → PostgreSQL
2. PostgreSQL logical replication → Electric
3. Electric streams updates → All connected clients
4. Clients automatically receive real-time updates

## LiveStore Compatibility

### Current State

The Express server provides **basic Electric proxy endpoints** compatible with LiveStore 0.3.1's event-sourcing approach, but doesn't include the full LiveStore sync implementation yet.

### If You Want Full LiveStore Integration

See `express/livestore-example.js` for a complete LiveStore 0.3.1 implementation example with:

- Event-sourced data model
- Custom sync adapter for your Express backend
- Proper schema definitions
- Materializers for event → state mapping

### Client Setup (Optional LiveStore)

```bash
# If you want to use LiveStore
npm install @livestore/livestore@0.3.1
```

```javascript
// Basic client without LiveStore
const response = await fetch('/api/electric?table=bookmarks&offset=-1', {
  headers: { 'Authorization': 'insecure-token-change-me' }
})

// With LiveStore (see livestore-example.js)
import store from './livestore-example.js'
const bookmarks = await store.query(...)
```

## Environment Variables

```env
# Express Service
PORT=3001
DB_HOST=database
DB_USER=administrator
DB_PASSWORD=qixqug-boqjim-3zeqvE
DB_NAME=default
ELECTRIC_URL=http://electric:3000
AUTH_TOKEN=insecure-token-change-me
```

## Database Schema

### Application Tables (auto-created)

- `users` - User accounts
- `bookmarks` - User bookmarks with type enum
- `folders` - Bookmark folders
- `logs` - System logs

### LiveStore Tables (created when needed)

- `livestore_events` - Event sourcing log

## Monitoring & Debugging

### Health Checks

```bash
curl http://localhost/api/health          # Express
curl http://localhost/electric/v1/health  # Electric
curl http://localhost/nginx-health        # Nginx
```

### View Logs

```bash
docker-compose logs -f express-api
docker-compose logs -f electric
```

### Check Electric Shapes

```bash
curl "http://localhost/electric/v1/shape?table=bookmarks&offset=-1"
```

### Monitor Database Replication

```sql
SELECT * FROM pg_replication_slots;
SELECT * FROM pg_publication;
```

## Production Checklist

- [ ] Change `AUTH_TOKEN` and database passwords
- [ ] Implement proper authentication (JWT, OAuth, etc.)
- [ ] Enable SSL/TLS
- [ ] Use managed PostgreSQL service
- [ ] Deploy Electric behind CDN
- [ ] Set up proper logging and monitoring
- [ ] Scale Express API horizontally

## Troubleshooting

### Electric Connection Issues

1. Ensure PostgreSQL has `wal_level=logical` ✅
2. Check Electric can connect to database ✅
3. Verify replication slot exists ✅

### API Issues

1. Check service health endpoints
2. Verify Docker network connectivity
3. Check environment variables match between services

### Performance

1. Electric includes caching headers ✅
2. Nginx configured for caching ✅
3. Use indexes on frequently queried fields
4. Monitor Electric replication lag

## Why This Architecture Works

1. **Simple**: Express handles writes, Electric handles reads
2. **Reliable**: Proven technologies with health monitoring
3. **Scalable**: Each component can scale independently
4. **Real-time**: Electric provides instant updates to all clients
5. **Flexible**: Can add LiveStore or other client libraries later

This setup gives you **local-first capabilities** with **real-time sync** without the complexity of a full event-sourcing implementation initially.

## License

MIT
