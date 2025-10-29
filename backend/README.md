# ShopShadow Backend

**Purpose:** Node.js/Express backend API server for ShopShadow automated checkout system.

## Key Components

- REST API endpoints for product catalog, basket management, orders, and authentication
- PostgreSQL database connection and query management
- JWT authentication and authorization middleware
- Device pairing system (4-digit codes) for Raspberry Pi baskets
- Low-confidence item approval workflow

## Directory Structure (Planned)

```
backend/
├── src/
│   ├── server.js           # Express app initialization
│   ├── routes/             # API route handlers
│   ├── middleware/         # Auth, logging, error handling
│   ├── utils/              # Helper functions (auth, device codes)
│   └── db/                 # Database connection pool
├── migrations/             # Database migrations (node-pg-migrate)
├── package.json
└── .env.example
```

## Technology Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL (local dev, Supabase production)
- **Authentication:** JWT with bcrypt password hashing
- **Logging:** Shared Winston logger (../shared/logger.js)

## API Endpoints (Planned)

- `/api/auth/*` - Authentication (login, signup, logout, refresh)
- `/api/products` - Product catalog (public + admin CRUD)
- `/api/devices/*` - Device registration and pairing
- `/api/basket/*` - Basket state and pending approvals
- `/api/orders/*` - Order creation and history
- `/api/admin/*` - Admin management and analytics

## Environment Setup

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and configure:
   - **DATABASE_URL**: Your local PostgreSQL connection string
   - **JWT_SECRET**: Generate with `openssl rand -base64 32`
   - **API_PORT**: Default 3001 (or change if port conflict)
   - **LOG_FILE_PATH**: Default `./logs` (will be created automatically)

3. Create PostgreSQL database:
   ```bash
   createdb shopshadow
   ```

4. Run database migrations:
   ```bash
   npm run migrate:up
   ```

5. Seed database with test data:
   ```bash
   psql shopshadow < seed.sql
   # or: node seed.js
   ```

6. Start the server:
   ```bash
   npm start
   ```
