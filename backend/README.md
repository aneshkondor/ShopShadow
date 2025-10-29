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

## Database Migrations

This project uses **node-pg-migrate** to manage database schema changes. Migrations are version-controlled, reversible, and ensure consistent database setup across development and production environments.

### Migration Configuration

- **Configuration file:** `.pgmigraterc` - Specifies migrations directory and table name
- **Migrations directory:** `migrations/` - Contains all migration files
- **Tracking table:** `pgmigrations` - Automatically created to track applied migrations

### Available Commands

```bash
# Apply all pending migrations
npm run migrate:up

# Rollback the last migration
npm run migrate:down

# Create a new migration file
npm run migrate:create <migration_name>

# Check applied migrations
psql shopshadow -c "SELECT * FROM pgmigrations;"
```

### Initial Migration (Task 1.2)

The initial migration (`1761711502961_initial-schema.js`) includes:
- **pgcrypto extension** - UUID generation support
- **8 tables** - users, products, devices, orders, order_items, sessions, basket_items, pending_items
- **32 indexes** - Performance optimization for common queries
- **Foreign keys** - Relationship constraints with CASCADE/SET NULL delete rules
- **Generated columns** - Computed fields like `in_stock` and `order_items.subtotal`
- **CHECK constraints** - Business rule validation at database level

### Migration Workflow

#### 1. First Time Setup

```bash
# Create the local database (one time)
createdb shopshadow

# Copy environment template
cp .env.example .env

# Edit .env and set DATABASE_URL to your local PostgreSQL
# Example: postgresql://postgres:password@localhost:5432/shopshadow

# Apply initial migration
npm run migrate:up

# Verify tables created
psql shopshadow -c "\dt"  # List all tables
```

#### 2. Creating New Migrations

```bash
# Create a new migration file (auto-generated timestamp)
npm run migrate:create add_new_column

# Edit the generated file in migrations/
# - Implement the 'up' function for applying changes
# - Implement the 'down' function for rollback
# - Use pgm API: pgm.createTable, pgm.addColumn, pgm.dropTable, etc.

# Test the migration
npm run migrate:up      # Apply it
npm run migrate:down    # Rollback
npm run migrate:up      # Re-apply to confirm idempotence
```

#### 3. Development Workflow

```bash
# After pulling migration changes from git
npm run migrate:up      # Apply new migrations

# Reset database to clean state
npm run migrate:down    # Rollback all
npm run migrate:up      # Re-apply all
npm run seed:data       # (Optional) Seed test data when available
```

#### 4. Supabase Migration (Future)

When deploying to Supabase:

```bash
# Update DATABASE_URL in .env to Supabase connection string
# All migrations remain unchanged - they're compatible with Supabase

# Apply migrations to Supabase
npm run migrate:up

# Supabase will need:
# 1. Row-level security (RLS) policies configured per table
# 2. Storage buckets set up for basket_photo_url and receipt_url
# 3. Auth sync if using Supabase authentication
```

### Best Practices

1. **Idempotent migrations** - All migrations are reversible and replayable
2. **Foreign key order** - Tables with dependencies created after their references
3. **Cascading deletes** - Carefully designed for data integrity
4. **Indexes** - Created to support common query patterns
5. **No manual SQL** - Use pgm API instead of raw SQL for compatibility

### Troubleshooting

**Error: "connect ECONNREFUSED 127.0.0.1:5432"**
- PostgreSQL service is not running
- Solution: Start PostgreSQL and ensure it's listening on port 5432

**Error: "database 'shopshadow' does not exist"**
- Database wasn't created before running migration
- Solution: Run `createdb shopshadow` first

**Error: "relation 'pgmigrations' already exists"**
- Migration system already initialized
- This is normal on subsequent runs

**Stuck after partial migration?**
- Check pgmigrations table: `SELECT * FROM pgmigrations;`
- Manually resolve database state or contact DBA

### Resources

- **node-pg-migrate docs:** https://salsita.github.io/node-pg-migrate/
- **PostgreSQL docs:** https://www.postgresql.org/docs/
- **Supabase migration guide:** https://supabase.com/docs/guides/migrations
