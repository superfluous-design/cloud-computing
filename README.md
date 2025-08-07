# Superfluous - Microservices Bookmark Manager

A full-stack bookmark management application built with a microservices architecture, featuring React frontend, Go authentication services, Node.js APIs, and PostgreSQL with Electric SQL for real-time synchronization.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │    │      Nginx      │    │   PostgreSQL    │
│  (Vite + SPA)   │◄──►│  Load Balancer  │◄──►│   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        │
        ┌─────────────────┬─────────────────┬──────────────────┐
        │                 │                 │                  │
        ▼                 ▼                 ▼                  ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐    ┌─────────────┐
│  Auth APIs  │  │ Bookmark API│  │ Folder API  │    │Electric SQL │
│   (Go)      │  │  (Node.js)  │  │ (Node.js)   │    │Sync Engine  │
│ auth1:8080  │  │express2:3003│  │express3:3004│    │   :30000    │
│ auth2:8080  │  └─────────────┘  └─────────────┘    └─────────────┘
└─────────────┘           │                │                  │
        │                 │                │                  │
        └─────────────────┴────────────────┴──────────────────┘
                                │
                                ▼
                     ┌─────────────────┐
                     │   Export API    │
                     │   (Node.js)     │
                     │  express4:3005  │
                     └─────────────────┘
```

## 🚀 What This Application Provides

✅ **Complete Bookmark Management**: Create, read, update, delete bookmarks with multiple types (URL, text, color)  
✅ **Folder Organization**: Organize bookmarks into custom folders  
✅ **User Authentication**: JWT-based auth with registration, login, and token refresh  
✅ **Data Export/Import**: Full data export and import with bulk operations  
✅ **Real-time Sync**: Electric SQL integration for real-time data synchronization  
✅ **Modern UI**: React-based single-page application with responsive design  
✅ **Microservices Architecture**: Scalable service-oriented design  
✅ **Load Balancing**: Nginx with upstream load balancing for auth services

## 📦 Services Breakdown

### Frontend

- **React Client** (`client:5173`): Modern SPA built with Vite, TypeScript, and shadcn/ui components

### Backend Services

- **Auth Service** (`auth1:8080`, `auth2:8080`): Go-based JWT authentication with load balancing
- **Bookmark API** (`express2:3003`): Node.js service for bookmark CRUD operations
- **Folder API** (`express3:3004`): Node.js service for folder management
- **Export API** (`express4:3005`): Node.js service for data export/import and bulk operations

### Infrastructure

- **PostgreSQL** (`postgres:5432`): Primary database with logical replication enabled
- **Electric SQL** (`:30000`): Real-time sync engine for live data updates
- **Nginx** (`:80`): Reverse proxy, load balancer, and static file server

## 🚀 Quick Start

1. **Start the services**:

   ```bash
   docker-compose up -d
   ```

2. **Verify everything is running**:

   ```bash
   # Check all services are healthy
   docker-compose ps

   # Test auth service
   curl http://localhost/auth/api/v1/health

   # Test Electric connection
   curl http://localhost/electric/v1/health
   ```

3. **Access the application**:

   - **Web UI**: http://localhost (React frontend)
   - **Database**: `postgresql://postgres:password@localhost:5432/electric`

4. **Create an account and start using**:
   - Register a new account through the web interface
   - Create folders to organize your bookmarks
   - Add bookmarks with different types (URL, text, color)
   - Export/import your data as needed

## 📡 API Endpoints

### Authentication Service (Go - Port 8080)

- `POST /auth/api/v1/register` - Register new user
- `POST /auth/api/v1/login` - User login (returns JWT tokens)
- `POST /auth/api/v1/refresh` - Refresh access token
- `GET /auth/api/v1/health` - Health check

### Bookmark Service (Node.js - Port 3003)

- `GET /bookmarks` - Get all user bookmarks (requires auth)
- `POST /bookmarks` - Create new bookmark (requires auth)
- `PUT /bookmarks/:id` - Update bookmark (requires auth)
- `DELETE /bookmarks/:id` - Delete bookmark (requires auth)

### Folder Service (Node.js - Port 3004)

- `GET /folders` - Get all user folders with bookmark counts (requires auth)
- `POST /folders` - Create new folder (requires auth)
- `PUT /folders/:id` - Update folder name (requires auth)
- `DELETE /folders/:id` - Delete folder (moves bookmarks to default)
- `POST /folders/init-default` - Initialize default folder for user

### Export Service (Node.js - Port 3005)

- `GET /export` - Export all user data (folders + bookmarks)
- `POST /import` - Import data with optional replace existing
- `POST /bulk-delete` - Bulk delete bookmarks and/or folders

### Electric SQL Integration

- `GET /electric/v1/health` - Electric health check
- Electric sync endpoints available for real-time data streaming

## 🔧 How It Works

### Request Flow

1. **User registers/logs in** → Auth service generates JWT tokens
2. **Client makes API calls** → Nginx routes to appropriate microservice
3. **Services authenticate** → JWT validation on each protected endpoint
4. **Data operations** → Services interact directly with PostgreSQL
5. **Real-time sync** → Electric SQL streams changes to connected clients

### Authentication Flow

```
Client → Nginx → Auth Service → PostgreSQL
         ↓
    JWT Tokens ← Auth Service
         ↓
Client API calls with Bearer token → Nginx → Other Services
```

### Microservices Communication

- Each service runs independently in Docker containers
- Services communicate with PostgreSQL directly (no inter-service calls)
- Nginx handles load balancing for auth services (auth1, auth2)
- All services validate JWT tokens independently

### Data Persistence

- **PostgreSQL** serves as the single source of truth
- **Electric SQL** provides real-time sync capabilities via logical replication
- Default folders are auto-created for new users
- Referential integrity maintained with foreign key constraints

## ⚙️ Environment Variables

### PostgreSQL

```env
POSTGRES_DB=electric
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
```

### Auth Services (Go)

```env
DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=electric
DB_SSLMODE=disable
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

### Node.js Services (Express2, Express3, Express4)

```env
DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=electric
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

### Electric SQL

```env
DATABASE_URL=postgresql://postgres:password@postgres:5432/electric?sslmode=disable
ELECTRIC_INSECURE=true  # Development only
```

## 🗄️ Database Schema

### Core Tables

#### `users`

- `user_id` (SERIAL PRIMARY KEY)
- `email` (VARCHAR, unique)
- `password` (VARCHAR, bcrypt hashed)
- `created_at` (TIMESTAMP)

#### `folders`

- `folder_id` (VARCHAR PRIMARY KEY)
- `name` (VARCHAR)
- `author_id` (INT, FK to users)
- `created_at` (TIMESTAMP)

#### `bookmarks`

- `bookmark_id` (VARCHAR PRIMARY KEY)
- `content` (TEXT)
- `type` (VARCHAR: 'url', 'text', 'color')
- `title` (VARCHAR, optional)
- `url` (TEXT, optional)
- `folder_id` (VARCHAR, FK to folders)
- `author_id` (INT, FK to users)
- `created_at` (TIMESTAMP)

### Default Data

- Test user: `test@example.com` / `password`
- Default folders created automatically for each user

## 🔍 Monitoring & Debugging

### Health Checks

```bash
# Check all service health endpoints
curl http://localhost/auth/api/v1/health      # Auth services (load balanced)
curl http://localhost/electric/v1/health      # Electric SQL
curl http://localhost/nginx-health            # Nginx
```

### View Service Logs

```bash
# View logs for specific services
docker-compose logs -f auth1 auth2            # Authentication services
docker-compose logs -f express2               # Bookmark service
docker-compose logs -f express3               # Folder service
docker-compose logs -f express4               # Export service
docker-compose logs -f electric               # Electric SQL
docker-compose logs -f client                 # React frontend
```

### Service Status

```bash
# Check which services are running
docker-compose ps

# Check resource usage
docker stats
```
