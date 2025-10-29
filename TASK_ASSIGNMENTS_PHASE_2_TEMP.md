# ShopShadow Phase 2 - Task Assignment Prompts

**DELETE THIS FILE AFTER USE**

This file contains all Task Assignment Prompts for Phase 2 (Tasks 2.1-2.8). Copy each prompt into a new Claude Code session for the appropriate Implementation Agent.

**GitHub Repository:** https://github.com/aneshkondor/ShopShadow.git

**IMPORTANT GIT WORKFLOW FOR ALL AGENTS:**
After completing each task, commit your changes and push to GitHub:
```bash
git add .
git commit -m "feat: [brief description of what you built]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
git push origin main
```

---

## Task 2.1 - Set Up Express.js Server with Middleware

**Agent:** Agent_Backend_Core
**Model:** Sonnet 4.5 (foundational server setup, critical for all backend development)
**Memory Log:** `apm/Memory/Phase_02_Backend_API_Core/Task_2_1_Set_up_Express_server.md`
**Depends on:** Task 1.6 Output (shared logger)

### Task Objective

Initialize the Express.js server foundation with essential middleware stack (CORS, body parsing, logging, error handling), PostgreSQL connection pooling, and server startup configuration to enable all backend API development.

### Expected Output

Main Express server file `backend/src/server.js` with:
- Configured middleware stack (CORS, body parsing, logging, error handling)
- PostgreSQL connection pool using pg library
- Integrated Task 1.6 logging from `shared/logger.js`
- Global error handling middleware
- Running server on port 3001

### Implementation Guidance

**Critical Requirements:**
- Server must support CORS for frontend access (Vite dev server on port 5173)
- Log all API requests using Task 1.6 shared/logger.js
- Handle database connection errors gracefully
- Provide detailed error messages for debugging

**Middleware Order is Critical:**
CORS → Body Parsing → Logging → Routes → Error Handling

### Detailed Sub-Tasks

#### 1. Initialize Express App

**Install dependencies:**
```bash
cd backend/
npm install express pg dotenv bcrypt jsonwebtoken cors
```

**Create backend/src/server.js:**
```javascript
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const logger = require('../../shared/logger');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 3001;
```

#### 2. Configure Core Middleware

```javascript
// CORS - Allow frontend Vite dev server
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parsing with size limit for base64 basket photos
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    query: req.query,
    body: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined
  });
  next();
});
```

**CORS Configuration Notes:**
- `credentials: true` allows cookies/auth headers
- `origin` from FRONTEND_URL env var (default: http://localhost:5173)
- Frontend Vite dev server runs on port 5173 by default

#### 3. Set Up PostgreSQL Connection

```javascript
const { Pool } = require('pg');

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximum connections in pool
  idleTimeoutMillis: 30000, // Close idle clients after 30s
  connectionTimeoutMillis: 2000 // Return error after 2s if can't connect
});

// Log pool errors
pool.on('error', (err, client) => {
  logger.error('Unexpected error on idle PostgreSQL client', { error: err.message });
});

// Test database connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    logger.error('Failed to connect to PostgreSQL', { error: err.message });
  } else {
    logger.info('PostgreSQL connected successfully', { timestamp: res.rows[0].now });
  }
});

// Export pool for use in route handlers
module.exports.pool = pool;
```

**Connection Pool Strategy:**
- max: 10 connections (sufficient for development, increase for production)
- Idle timeout: 30s (free up unused connections)
- Test connection on startup to fail fast if database unreachable

#### 4. Integrate Logging System

Import logger from Task 1.6:
```javascript
const logger = require('../../shared/logger');
```

**Logging Strategy:**
- Request logging: Method, path, query params, body (POST/PUT only)
- Error logging: Full error details with stack traces
- Database logging: Query errors, connection issues
- Structured metadata: Include userId, requestId when available

**Example structured logging:**
```javascript
// In route handlers (implemented in later tasks)
logger.info('User logged in', { userId: user.id, email: user.email });
logger.error('Database query failed', {
  error: err.message,
  stack: err.stack,
  query: 'SELECT * FROM users WHERE id = $1'
});
```

#### 5. Configure Error Handling

**Global error handler (must be last middleware):**
```javascript
// 404 handler
app.use((req, res) => {
  logger.warn(`404 Not Found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    error: 'Route not found',
    code: 'NOT_FOUND'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  // Log error with full context
  logger.error('Server error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Response format
  const errorResponse = {
    success: false,
    error: err.message || 'Internal server error',
    code: err.code || 'SERVER_ERROR'
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
});
```

**Error Response Format:**
```json
{
  "success": false,
  "error": "Error message here",
  "code": "ERROR_CODE",
  "stack": "... (development only)"
}
```

#### 6. Start Server

```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'ShopShadow backend is running',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`ShopShadow backend server started on port ${PORT}`, {
    environment: process.env.NODE_ENV || 'development',
    port: PORT
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, closing server gracefully');
  pool.end(() => {
    logger.info('PostgreSQL pool closed');
    process.exit(0);
  });
});
```

**Server Startup:**
- Health check endpoint at GET /health
- Graceful shutdown on SIGTERM (closes pool, then exits)
- Startup logging with environment and port info

#### 7. Update package.json Scripts

Add to `backend/package.json`:
```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "migrate:up": "node-pg-migrate up",
    "migrate:down": "node-pg-migrate down",
    "migrate:create": "node-pg-migrate create"
  }
}
```

Install nodemon for development:
```bash
npm install --save-dev nodemon
```

### Project Context

**ShopShadow Backend:**
Node.js/Express API server providing REST endpoints for:
- Authentication (login, signup, logout)
- Product catalog (public + admin CRUD)
- Device pairing (4-digit codes)
- Basket state (detections from Flask service)
- Low-confidence approval workflow
- Order creation and history
- Admin analytics

**Critical Inter-Service Communication:**
Flask detection service → Backend API (POST /api/basket/items)
Frontend → Backend API (polling every 5 seconds)

### Validation Steps

1. ✅ Express server starts successfully on port 3001
2. ✅ Health check endpoint responds: GET http://localhost:3001/health
3. ✅ PostgreSQL connection pool established (check logs)
4. ✅ CORS configured for frontend (http://localhost:5173)
5. ✅ Request logging working (check logs for incoming requests)
6. ✅ Error handling returns proper JSON format
7. ✅ Graceful shutdown works (Ctrl+C closes pool before exiting)

**Manual Testing:**
```bash
# Start server
cd backend/
npm start

# Test health endpoint
curl http://localhost:3001/health

# Test CORS (should return CORS headers)
curl -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: POST" -X OPTIONS http://localhost:3001/health

# Test 404 handler
curl http://localhost:3001/nonexistent

# Check logs
tail -f ../shared/logs/shopshadow-*.log
```

### Git Workflow

```bash
git add backend/src/server.js backend/package.json backend/package-lock.json
git commit -m "feat: set up Express.js server with middleware and PostgreSQL pool

- Configured CORS for frontend Vite dev server (port 5173)
- Added body parsing with 10MB limit for basket photos
- Integrated shared logger from Task 1.6 for request/error logging
- Set up PostgreSQL connection pool with error handling
- Implemented global error handling middleware with detailed logging
- Added health check endpoint and graceful shutdown
- Configured npm scripts for start and dev modes

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
git push origin main
```

### Memory Log Instructions

Populate `apm/Memory/Phase_02_Backend_API_Core/Task_2_1_Set_up_Express_server.md` with:
- YAML frontmatter (agent: Agent_Backend_Core, task_ref: Task 2.1, status: Completed)
- Summary: Server setup outcome, middleware configured
- Details: Express initialization, PostgreSQL pool, logging integration
- Output: server.js path, health endpoint URL, validation results
- Issues: Any connection issues or CORS problems
- Next Steps: Task 2.2 will add authentication routes to this server

---

## Task 2.2 - Implement Simplified JWT Authentication System

**Agent:** Agent_Backend_Core
**Model:** Sonnet 4.5 (security-critical authentication implementation)
**Memory Log:** `apm/Memory/Phase_02_Backend_API_Core/Task_2_2_Implement_JWT_authentication.md`
**Depends on:** Task 2.1 Output (Express server must be running)

### Task Objective

Create a simplified authentication system for MVP with password hashing using bcrypt, JWT token generation/verification, authentication middleware for protected routes, and login/signup/logout endpoints supporting user and admin roles.

### Expected Output

Auth modules:
- `backend/src/utils/auth.js` - bcrypt and JWT utility functions
- `backend/src/middleware/auth.js` - authenticateToken and requireAdmin middleware
- `backend/src/routes/auth.js` - Login, signup, logout, refresh endpoints
- Validated authentication flow (tested with demo credentials)

### Implementation Guidance

**Dependencies:**
- Task 2.1 Output: Express server and PostgreSQL pool
- Database: users table from Task 1.2 schema with password_hash column

**Demo Credentials (from Task 1.4 seed data):**
- demo@email.com / 1234 (role: user)
- admin@email.com / 1111 (role: admin)

**Security Requirements:**
- Passwords hashed with bcrypt (salt rounds: 10)
- JWT tokens signed with JWT_SECRET from .env
- Token expiration: 24h (access), 30d (refresh)
- Admin routes protected with both auth and role checks

### Detailed Sub-Tasks

#### 1. Create Password Utilities

Create `backend/src/utils/auth.js`:

```javascript
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SALT_ROUNDS = 10;

/**
 * Hash a plaintext password
 * @param {string} password - Plaintext password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    return hash;
  } catch (error) {
    throw new Error(`Password hashing failed: ${error.message}`);
  }
}

/**
 * Compare plaintext password with hash
 * @param {string} password - Plaintext password
 * @param {string} hash - Hashed password from database
 * @returns {Promise<boolean>} True if password matches
 */
async function comparePassword(password, hash) {
  try {
    const match = await bcrypt.compare(password, hash);
    return match;
  } catch (error) {
    throw new Error(`Password comparison failed: ${error.message}`);
  }
}

module.exports = {
  hashPassword,
  comparePassword
};
```

**bcrypt Notes:**
- Salt rounds: 10 (balance between security and performance)
- Async operations: Always use await with bcrypt functions
- Error handling: Wrap in try-catch to prevent crashes

#### 2. Implement JWT Functions

Add to `backend/src/utils/auth.js`:

```javascript
/**
 * Generate JWT access token
 * @param {Object} user - User object { id, email, role }
 * @returns {string} Signed JWT token
 */
function generateToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };

  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

  return token;
}

/**
 * Generate JWT refresh token (longer-lived)
 * @param {Object} user - User object { id, email, role }
 * @returns {string} Signed refresh token
 */
function generateRefreshToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };

  const refreshToken = jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d' }
  );

  return refreshToken;
}

/**
 * Verify and decode JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded payload { userId, email, role }
 * @throws {Error} If token invalid or expired
 */
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  generateRefreshToken,
  verifyToken
};
```

**JWT Token Structure:**
```json
{
  "userId": "uuid-here",
  "email": "demo@email.com",
  "role": "user",
  "iat": 1234567890,
  "exp": 1234653890
}
```

#### 3. Create Auth Middleware

Create `backend/src/middleware/auth.js`:

```javascript
const { verifyToken } = require('../utils/auth');
const logger = require('../../../shared/logger');

/**
 * Authenticate JWT token from Authorization header
 * Attaches decoded user to req.user
 */
function authenticateToken(req, res, next) {
  // Extract token from Authorization header (Bearer <token>)
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

  if (!token) {
    logger.warn('Authentication failed: No token provided', {
      path: req.path,
      method: req.method
    });
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'NO_TOKEN'
    });
  }

  try {
    // Verify and decode token
    const decoded = verifyToken(token);

    // Attach user info to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    logger.debug('Authentication successful', { userId: req.user.id });
    next();
  } catch (error) {
    logger.warn('Authentication failed: Invalid token', {
      error: error.message,
      path: req.path
    });
    return res.status(401).json({
      success: false,
      error: error.message,
      code: 'INVALID_TOKEN'
    });
  }
}

/**
 * Require admin role
 * Must be used after authenticateToken
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'NO_AUTH'
    });
  }

  if (req.user.role !== 'admin') {
    logger.warn('Admin access denied', {
      userId: req.user.id,
      role: req.user.role,
      path: req.path
    });
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
      code: 'FORBIDDEN'
    });
  }

  next();
}

module.exports = {
  authenticateToken,
  requireAdmin
};
```

**Middleware Usage:**
```javascript
// Protected route (any authenticated user)
app.get('/api/profile', authenticateToken, (req, res) => {
  // req.user available here
});

// Admin-only route
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
  // Only admins can access
});
```

#### 4. Implement Login Endpoint

Create `backend/src/routes/auth.js`:

```javascript
const express = require('express');
const { pool } = require('../server');
const { comparePassword, generateToken, generateRefreshToken } = require('../utils/auth');
const logger = require('../../../shared/logger');

const router = express.Router();

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password required',
        code: 'MISSING_FIELDS'
      });
    }

    // Query user by email
    const userQuery = 'SELECT * FROM users WHERE email = $1';
    const userResult = await pool.query(userQuery, [email]);

    if (userResult.rows.length === 0) {
      logger.warn('Login failed: User not found', { email });
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const user = userResult.rows[0];

    // Compare password
    const passwordMatch = await comparePassword(password, user.password_hash);

    if (!passwordMatch) {
      logger.warn('Login failed: Incorrect password', { email });
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generate tokens
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    const refreshToken = generateRefreshToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    // Log successful login
    logger.info('User logged in successfully', {
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // Return tokens and user info
    res.json({
      success: true,
      token,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

**Login Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "name": "Demo User",
    "email": "demo@email.com",
    "role": "user",
    "createdAt": "2025-10-28T19:00:00Z"
  }
}
```

#### 5. Implement Signup Endpoint

Add to `backend/src/routes/auth.js`:

```javascript
const { hashPassword, comparePassword, generateToken, generateRefreshToken } = require('../utils/auth');

/**
 * POST /api/auth/signup
 * Register new user
 */
router.post('/signup', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and password required',
        code: 'MISSING_FIELDS'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
        code: 'INVALID_EMAIL'
      });
    }

    // Validate password strength (min 8 chars, 1 uppercase, 1 lowercase, 1 number)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number',
        code: 'WEAK_PASSWORD'
      });
    }

    // Check if email already exists
    const emailCheck = 'SELECT id FROM users WHERE email = $1';
    const emailResult = await pool.query(emailCheck, [email]);

    if (emailResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Email already registered',
        code: 'EMAIL_EXISTS'
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Insert new user
    const insertQuery = `
      INSERT INTO users (name, email, password_hash, role, status, email_verified)
      VALUES ($1, $2, $3, 'user', 'active', true)
      RETURNING id, name, email, role, created_at
    `;
    const insertResult = await pool.query(insertQuery, [name, email, passwordHash]);
    const newUser = insertResult.rows[0];

    // Generate tokens for immediate login
    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role
    });

    const refreshToken = generateRefreshToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role
    });

    logger.info('New user registered', {
      userId: newUser.id,
      email: newUser.email
    });

    res.status(201).json({
      success: true,
      token,
      refreshToken,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.created_at
      }
    });
  } catch (error) {
    next(error);
  }
});
```

#### 6. Implement Logout and Refresh

Add to `backend/src/routes/auth.js`:

```javascript
const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/auth/logout
 * Logout user (simplified for MVP)
 */
router.post('/logout', authenticateToken, async (req, res, next) => {
  try {
    // Log logout event
    logger.info('User logged out', { userId: req.user.id });

    // For MVP, client discards token
    // Full token blacklist can be added later
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token required',
        code: 'MISSING_TOKEN'
      });
    }

    // Verify refresh token
    const decoded = verifyToken(refreshToken);

    // Generate new tokens
    const newToken = generateToken({
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role
    });

    const newRefreshToken = generateRefreshToken({
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role
    });

    logger.info('Token refreshed', { userId: decoded.userId });

    res.json({
      success: true,
      token: newToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    logger.warn('Token refresh failed', { error: error.message });
    res.status(401).json({
      success: false,
      error: error.message,
      code: 'INVALID_REFRESH_TOKEN'
    });
  }
});

module.exports = router;
```

#### 7. Register Routes in Server

Update `backend/src/server.js`:

```javascript
const authRoutes = require('./routes/auth');

// ... after middleware setup ...

// Routes
app.use('/api/auth', authRoutes);

// ... error handling ...
```

#### 8. Test Authentication Flow

Create test script `backend/test-auth.sh`:

```bash
#!/bin/bash
API="http://localhost:3001"

echo "=== Testing Authentication Flow ==="
echo

# Test signup
echo "1. Testing signup with new user..."
SIGNUP_RESPONSE=$(curl -s -X POST $API/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"Test1234"}')
echo "Signup response: $SIGNUP_RESPONSE"
echo

# Extract token from signup
TOKEN=$(echo $SIGNUP_RESPONSE | jq -r '.token')
echo "Extracted token: ${TOKEN:0:50}..."
echo

# Test login with demo user
echo "2. Testing login with demo user..."
LOGIN_RESPONSE=$(curl -s -X POST $API/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@email.com","password":"1234"}')
echo "Login response: $LOGIN_RESPONSE"
echo

# Test invalid credentials
echo "3. Testing login with wrong password..."
INVALID_RESPONSE=$(curl -s -X POST $API/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@email.com","password":"wrong"}')
echo "Invalid login response: $INVALID_RESPONSE"
echo

# Test protected route (will be implemented in next tasks)
echo "4. Testing protected route with valid token..."
# (This will return 404 until routes are added in later tasks)

echo "=== Authentication tests complete ==="
```

Make executable and run:
```bash
chmod +x backend/test-auth.sh
./backend/test-auth.sh
```

### Project Context

**Authentication Requirements:**
- Simplified JWT for MVP (no OAuth, no sessions table initially)
- User and admin roles enforced via middleware
- Demo credentials must work immediately for testing
- Frontend will store JWT in localStorage and send in Authorization header

**Security Considerations:**
- JWT_SECRET must be strong (use `openssl rand -base64 32`)
- HTTPS required in production (terminate at reverse proxy)
- Token blacklist not implemented (logout is client-side only for MVP)
- Refresh tokens allow long-lived sessions without frequent re-login

### Validation Steps

1. ✅ Signup creates new user with hashed password
2. ✅ Login with demo@email.com/1234 returns valid JWT
3. ✅ Login with wrong password returns 401
4. ✅ Token includes userId, email, role in payload
5. ✅ authenticateToken middleware extracts req.user from valid token
6. ✅ authenticateToken rejects invalid/expired tokens with 401
7. ✅ requireAdmin allows admin user, blocks regular user with 403
8. ✅ Refresh endpoint generates new token from refresh token

### Git Workflow

```bash
git add backend/src/utils/auth.js backend/src/middleware/auth.js backend/src/routes/auth.js backend/src/server.js backend/test-auth.sh
git commit -m "feat: implement JWT authentication system

- Created password hashing utilities with bcrypt (salt rounds: 10)
- Implemented JWT token generation and verification
- Added authenticateToken and requireAdmin middleware
- Built login, signup, logout, and refresh endpoints
- Validated auth flow with demo credentials (demo@email.com/1234)
- All routes return standardized JSON format with success/error codes

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
git push origin main
```

### Memory Log Instructions

Populate `apm/Memory/Phase_02_Backend_API_Core/Task_2_2_Implement_JWT_authentication.md` with:
- Summary: Authentication system implementation outcome
- Details: bcrypt setup, JWT functions, middleware, endpoints
- Output: Paths to auth.js, middleware/auth.js, routes/auth.js
- Issues: Any JWT verification issues or password hashing problems
- Next Steps: Tasks 2.3-2.8 will use these middleware for route protection

---

## Task 2.3 - Create Product Catalog API Endpoints

**Agent:** Agent_Backend_Catalog
**Model:** Haiku ✅ (straightforward CRUD operations)
**Memory Log:** `apm/Memory/Phase_02_Backend_API_Core/Task_2_3_Create_product_catalog_API.md`
**Depends on:** Task 2.2 Output (authentication middleware)

### Task Objective

Implement REST API endpoints for product catalog operations including public product listing with filtering/search/pagination, single product details, and admin CRUD operations (create, update, delete) with proper validation and authentication.

### Expected Output

Product route handlers `backend/src/routes/products.js` with:
- GET /api/products - Public filtered product list with pagination
- GET /api/products/:productId - Public single product details
- POST /api/admin/products - Admin create product
- PUT /api/admin/products/:productId - Admin update product
- DELETE /api/admin/products/:productId - Admin delete product

All endpoints validated against frontend API spec.

### Implementation Guidance

**Dependencies:**
- Task 2.2 Output: authenticateToken and requireAdmin middleware
- Database: products table from Task 1.2 schema with seed data from Task 1.4

**Frontend API Spec:**
Match exactly: `frontend/frontend/src/03-api-endpoints-and-data.md`

**Auth Requirements:**
- Public endpoints (GET products): No authentication
- Admin endpoints (POST/PUT/DELETE): authenticateToken + requireAdmin

### Detailed Sub-Tasks

#### 1. Implement Product Listing

Create `backend/src/routes/products.js`:

```javascript
const express = require('express');
const { pool } = require('../server');
const logger = require('../../../shared/logger');

const router = express.Router();

/**
 * GET /api/products
 * Public endpoint - List products with filtering and pagination
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      category,
      search,
      inStock,
      page = 1,
      limit = 50
    } = req.query;

    const offset = (page - 1) * limit;

    // Build WHERE clause dynamically
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (category) {
      conditions.push(`category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    if (search) {
      conditions.push(`name ILIKE $${paramIndex}`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (inStock === 'true') {
      conditions.push('in_stock = true');
    }

    const whereClause = conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : '';

    // Query products
    const productsQuery = `
      SELECT id, name, category, price, stock, in_stock as "inStock",
             image_url as "imageUrl", description, barcode
      FROM products
      ${whereClause}
      ORDER BY name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const productsResult = await pool.query(productsQuery, params);

    // Count total for pagination
    const countQuery = `SELECT COUNT(*) FROM products ${whereClause}`;
    const countResult = await pool.query(
      countQuery,
      params.slice(0, params.length - 2) // Exclude limit/offset
    );
    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    // Get unique categories
    const categoriesQuery = 'SELECT DISTINCT category FROM products ORDER BY category';
    const categoriesResult = await pool.query(categoriesQuery);
    const categories = categoriesResult.rows.map(row => row.category);

    logger.info('Product list retrieved', {
      category,
      search,
      inStock,
      resultCount: productsResult.rows.length,
      page,
      total
    });

    res.json({
      success: true,
      products: productsResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
      },
      categories
    });
  } catch (error) {
    next(error);
  }
});
```

**Query Parameters:**
- `category`: Filter by category (exact match)
- `search`: Search by product name (case-insensitive partial match)
- `inStock`: Filter to only in-stock products (true/false)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)

#### 2. Implement Single Product

```javascript
/**
 * GET /api/products/:productId
 * Public endpoint - Get single product details
 */
router.get('/:productId', async (req, res, next) => {
  try {
    const { productId } = req.params;

    const query = `
      SELECT id, name, category, price, stock, in_stock as "inStock",
             image_url as "imageUrl", description, barcode, weight,
             nutrition_facts as "nutritionFacts", allergens
      FROM products
      WHERE id = $1
    `;

    const result = await pool.query(query, [productId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        code: 'PRODUCT_NOT_FOUND'
      });
    }

    logger.debug('Product details retrieved', { productId });

    res.json({
      success: true,
      product: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});
```

#### 3. Implement Admin Create/Update

```javascript
const { authenticateToken, requireAdmin } = require('../middleware/auth');

/**
 * POST /api/admin/products
 * Admin only - Create new product
 */
router.post('/admin/products', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const {
      name, category, price, stock,
      description, barcode, imageUrl
    } = req.body;

    // Validate required fields
    if (!name || !category || price === undefined || stock === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Name, category, price, and stock are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Validate price and stock
    if (price < 0 || stock < 0) {
      return res.status(422).json({
        success: false,
        error: 'Price and stock must be non-negative',
        code: 'INVALID_VALUES'
      });
    }

    // Check barcode uniqueness
    if (barcode) {
      const barcodeCheck = await pool.query(
        'SELECT id FROM products WHERE barcode = $1',
        [barcode]
      );
      if (barcodeCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Barcode already exists',
          code: 'DUPLICATE_BARCODE'
        });
      }
    }

    // Generate product ID (P### format)
    const maxIdQuery = 'SELECT id FROM products ORDER BY id DESC LIMIT 1';
    const maxIdResult = await pool.query(maxIdQuery);
    let nextId = 'P001';
    if (maxIdResult.rows.length > 0) {
      const lastId = maxIdResult.rows[0].id;
      const lastNum = parseInt(lastId.substring(1));
      nextId = 'P' + (lastNum + 1).toString().padStart(3, '0');
    }

    // Insert product
    const insertQuery = `
      INSERT INTO products (id, name, category, price, stock, description, barcode, image_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, name, category, price, stock, in_stock as "inStock", created_at as "createdAt"
    `;
    const insertResult = await pool.query(insertQuery, [
      nextId, name, category, price, stock, description, barcode, imageUrl
    ]);

    logger.info('Product created', {
      productId: nextId,
      adminId: req.user.id,
      name
    });

    res.status(201).json({
      success: true,
      product: insertResult.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/products/:productId
 * Admin only - Update product
 */
router.put('/admin/products/:productId', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { name, category, price, stock, description, barcode, imageUrl } = req.body;

    // Check product exists
    const checkQuery = 'SELECT id FROM products WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [productId]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        code: 'PRODUCT_NOT_FOUND'
      });
    }

    // Validate values if provided
    if (price !== undefined && price < 0) {
      return res.status(422).json({
        success: false,
        error: 'Price must be non-negative',
        code: 'INVALID_PRICE'
      });
    }
    if (stock !== undefined && stock < 0) {
      return res.status(422).json({
        success: false,
        error: 'Stock must be non-negative',
        code: 'INVALID_STOCK'
      });
    }

    // Check barcode uniqueness if changed
    if (barcode) {
      const barcodeCheck = await pool.query(
        'SELECT id FROM products WHERE barcode = $1 AND id != $2',
        [barcode, productId]
      );
      if (barcodeCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Barcode already exists',
          code: 'DUPLICATE_BARCODE'
        });
      }
    }

    // Build update query dynamically
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      params.push(name);
      paramIndex++;
    }
    if (category !== undefined) {
      updates.push(`category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }
    if (price !== undefined) {
      updates.push(`price = $${paramIndex}`);
      params.push(price);
      paramIndex++;
    }
    if (stock !== undefined) {
      updates.push(`stock = $${paramIndex}`);
      params.push(stock);
      paramIndex++;
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(description);
      paramIndex++;
    }
    if (barcode !== undefined) {
      updates.push(`barcode = $${paramIndex}`);
      params.push(barcode);
      paramIndex++;
    }
    if (imageUrl !== undefined) {
      updates.push(`image_url = $${paramIndex}`);
      params.push(imageUrl);
      paramIndex++;
    }

    updates.push(`updated_at = NOW()`);
    params.push(productId);

    const updateQuery = `
      UPDATE products
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, category, price, stock, in_stock as "inStock", updated_at as "updatedAt"
    `;

    const updateResult = await pool.query(updateQuery, params);

    logger.info('Product updated', {
      productId,
      adminId: req.user.id
    });

    res.json({
      success: true,
      product: updateResult.rows[0]
    });
  } catch (error) {
    next(error);
  }
});
```

#### 4. Implement Admin Delete

```javascript
/**
 * DELETE /api/admin/products/:productId
 * Admin only - Delete product (with safety check)
 */
router.delete('/admin/products/:productId', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { productId } = req.params;

    // Check if product exists
    const checkQuery = 'SELECT id FROM products WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [productId]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        code: 'PRODUCT_NOT_FOUND'
      });
    }

    // Check if product has orders in last 90 days
    const orderCheckQuery = `
      SELECT COUNT(*)
      FROM order_items
      WHERE product_id = $1 AND created_at > NOW() - INTERVAL '90 days'
    `;
    const orderCheckResult = await pool.query(orderCheckQuery, [productId]);
    const orderCount = parseInt(orderCheckResult.rows[0].count);

    if (orderCount > 0) {
      return res.status(409).json({
        success: false,
        error: 'Cannot delete product with recent orders',
        code: 'PRODUCT_IN_USE',
        affectedOrders: orderCount
      });
    }

    // Delete product (or implement soft delete)
    const deleteQuery = 'DELETE FROM products WHERE id = $1';
    await pool.query(deleteQuery, [productId]);

    logger.info('Product deleted', {
      productId,
      adminId: req.user.id
    });

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

#### 5. Register Routes in Server

Update `backend/src/server.js`:

```javascript
const productsRoutes = require('./routes/products');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/admin/products', productsRoutes); // Admin routes also handled by products.js
```

### Project Context

**Product Catalog:**
- 15-20 products from Task 1.4 seed data
- COCO class mapping for YOLO detection (handled in Phase 3)
- Frontend displays product cards with images, prices, stock

**Frontend Integration:**
- Product listing page with filters and search
- Product detail modal/page
- Admin panel for product management
- Real-time stock updates when items detected

### Validation Steps

1. ✅ GET /api/products returns all products with pagination
2. ✅ GET /api/products?category=Fruits filters correctly
3. ✅ GET /api/products?search=apple finds matching products
4. ✅ GET /api/products?inStock=true shows only in-stock items
5. ✅ GET /api/products/:productId returns single product
6. ✅ POST /api/admin/products creates product (admin only)
7. ✅ PUT /api/admin/products/:productId updates product (admin only)
8. ✅ DELETE /api/admin/products/:productId deletes if no recent orders

**Manual Testing:**
```bash
# List all products
curl http://localhost:3001/api/products

# Search for apples
curl "http://localhost:3001/api/products?search=apple"

# Get single product
curl http://localhost:3001/api/products/P001

# Create product (requires admin token)
curl -X POST http://localhost:3001/api/admin/products \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"New Product","category":"Test","price":9.99,"stock":100}'
```

### Git Workflow

```bash
git add backend/src/routes/products.js backend/src/server.js
git commit -m "feat: create product catalog API endpoints

- Implemented GET /api/products with filtering, search, pagination
- Added GET /api/products/:productId for single product details
- Built admin CRUD: POST/PUT/DELETE /api/admin/products
- Added validation for price/stock non-negative, barcode uniqueness
- Implemented safety check: prevent deletion of products with recent orders
- All endpoints match frontend API specification

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
git push origin main
```

### Memory Log Instructions

Populate `apm/Memory/Phase_02_Backend_API_Core/Task_2_3_Create_product_catalog_API.md` with:
- Summary: Product catalog endpoints implementation
- Details: Public listing/details, admin CRUD, validation
- Output: routes/products.js path, endpoint list, validation results
- Issues: Any query performance issues or validation edge cases
- Next Steps: Tasks 2.4-2.6 will integrate with device pairing and basket

---

## Task 2.4 - Implement Device Connection and Pairing System

**Agent:** Agent_Backend_Catalog
**Model:** Sonnet 4.5 (complex state management with 4-digit codes and expiration)
**Memory Log:** `apm/Memory/Phase_02_Backend_API_Core/Task_2_4_Implement_device_connection_pairing.md`
**Depends on:** None (coordinates with Task 3.5 for device registration from Flask)

### Task Objective

Create the 4-digit code device connection system where Raspberry Pis register with the backend on boot to receive unique codes, users pair with devices by entering codes, and connection state is managed throughout shopping sessions.

### Expected Output

Device route handlers `backend/src/routes/devices.js` with:
- POST /api/devices/register - Pi registration (no auth)
- POST /api/devices/connect - User pairing (auth required)
- GET /api/devices/:deviceId/status - Health check (auth required)
- POST /api/devices/disconnect - Session end (auth required)
- Code generation utilities in `backend/src/utils/deviceCodes.js`

### Key Implementation Points

1. **Pi Registration (POST /api/devices/register):**
   - Generate unique 4-digit code (0000-9999)
   - Check uniqueness in devices table (max 10 retries)
   - INSERT or UPDATE device with code, status='disconnected', battery=100
   - Set expiration: created_at + 4 hours
   - Return {deviceId, code}

2. **User Pairing (POST /api/devices/connect):**
   - Authenticate user with authenticateToken middleware
   - Query device by code WHERE status IN ('disconnected', 'offline')
   - Check code expiration ((NOW() - created_at) > 4 hours)
   - Check if already connected to another user (409 error)
   - UPDATE device: connected_user_id = userId, status='connected', last_heartbeat=NOW()
   - Return {device details}

3. **Status Check (GET /api/devices/:deviceId/status):**
   - Authenticate and verify user owns device (userId === connected_user_id)
   - Query device + COUNT basket_items for itemCount
   - Update heartbeat: last_heartbeat = NOW()
   - Auto-disconnect if last_heartbeat > 5 minutes
   - Return {status, batteryLevel, itemCount, lastHeartbeat}

4. **Disconnection (POST /api/devices/disconnect):**
   - Authenticate user
   - UPDATE device: connected_user_id=NULL, status='disconnected'
   - Call cleanupBasket(userId, deviceId) from Task 2.5
   - Return success message

5. **Code Generation Utility (backend/src/utils/deviceCodes.js):**
   ```javascript
   function generateUniqueCode(pool) {
     // Generate random 4-digit: crypto.randomInt(0, 10000).toString().padStart(4, '0')
     // Check uniqueness in DB
     // Retry up to 10 times
     // Return code or throw error
   }

   function isCodeExpired(device) {
     // Check if (NOW() - device.created_at) > 4 hours
     // Return boolean
   }
   ```

### Validation

- ✅ Pi registration generates unique 4-digit code
- ✅ User pairing works with valid code
- ✅ Expired codes rejected with 400 error
- ✅ Already-connected devices return 409 error
- ✅ Status check updates heartbeat timestamp
- ✅ Disconnection clears basket items

### Git Commit

```
feat: implement device connection and pairing system

- Added Pi registration with 4-digit code generation
- Implemented user pairing with code validation and expiration
- Built status check endpoint with heartbeat updates
- Created disconnection handler with basket cleanup integration
- Code expires after 4 hours, auto-disconnect after 5min no heartbeat

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Task 2.5 - Create Basket State Management System

**Agent:** Agent_Backend_Basket
**Model:** Sonnet 4.5 (core business logic with concurrent detection handling)
**Memory Log:** `apm/Memory/Phase_02_Backend_API_Core/Task_2_5_Create_basket_state_management.md`
**Depends on:** Task 2.4 Output (device pairing), coordinates with Task 3.5 (Flask detection)

### Task Objective

Implement the core basket state system using database basket_items table to store detected items per user session, handle add/remove operations from Flask detection service, support frontend polling for real-time updates, and manage basket cleanup on session end.

### Expected Output

Basket route handlers `backend/src/routes/basket.js` with:
- POST /api/basket/items - Flask adds high-confidence detections (no auth)
- GET /api/basket/:userId - Frontend polling (auth required)
- cleanupBasket() utility function

### Key Implementation Points

1. **Flask Item Addition (POST /api/basket/items):**
   ```javascript
   // No auth - Flask service calls this
   // Extract: {productId, quantity, confidence, deviceId}
   // Query device to get connected_user_id
   // Check if product exists in basket: SELECT WHERE user_id=$1 AND device_id=$2 AND product_id=$3
   // If exists: UPDATE quantity = quantity + $4
   // If not: INSERT INTO basket_items
   // Validate confidence >= 0.7 (lower goes to pending_items in Task 2.6)
   // Use transaction for atomicity
   ```

2. **Quantity Aggregation:**
   - Multiple detections of same product → UPDATE quantity instead of new rows
   - Example: 3 apples detected → quantity = quantity + 3
   - Use database transaction: BEGIN; UPDATE; COMMIT;
   - Handle race conditions from concurrent Flask detections

3. **Basket Retrieval (GET /api/basket/:userId):**
   ```sql
   SELECT basket_items.*, products.name, products.price, products.category, products.imageUrl
   FROM basket_items
   JOIN products ON basket_items.product_id = products.id
   WHERE basket_items.user_id = $1
   ORDER BY basket_items.added_at DESC
   ```
   - Calculate subtotal: quantity * price
   - Calculate total: SUM(quantity * price)
   - Optimize for 5-second polling (use prepared statement, indexes)

4. **Basket Cleanup Utility:**
   ```javascript
   async function cleanupBasket(userId, deviceId, transaction) {
     // DELETE FROM basket_items WHERE user_id=$1 AND device_id=$2
     // Execute within provided transaction (or create new)
     // Log item count removed
     // Return success
   }
   ```

5. **Integration Points:**
   - Task 2.4: Call cleanupBasket() in disconnect handler
   - Task 2.7: Call cleanupBasket() in order creation (within order transaction)

### Database Performance

**Indexes Required (from Task 1.2):**
```sql
CREATE INDEX idx_basket_items_user_device ON basket_items(user_id, device_id);
CREATE INDEX idx_basket_items_product ON basket_items(product_id);
```

These indexes enable fast:
- Basket retrieval (user_id + device_id)
- Duplicate detection (product_id)
- Cleanup operations

### Validation

- ✅ Flask POST adds item to basket
- ✅ Multiple detections aggregate quantities
- ✅ GET /api/basket/:userId returns full basket with totals
- ✅ cleanupBasket() deletes all items for user/device
- ✅ Polling performs well (<100ms query time)

### Git Commit

```
feat: create basket state management system

- Implemented POST /api/basket/items for Flask detection integration
- Added quantity aggregation for multiple detections of same product
- Built GET /api/basket/:userId with JOIN for full product details
- Created cleanupBasket() utility for disconnect/checkout cleanup
- Used transactions for atomic quantity updates
- Optimized for 5-second polling with indexed queries

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Task 2.6 - Implement Low-Confidence Item Approval Endpoints

**Agent:** Agent_Backend_Basket
**Model:** Haiku ✅ (extends Task 2.5 with approval workflow)
**Memory Log:** `apm/Memory/Phase_02_Backend_API_Core/Task_2_6_Implement_low_confidence_approval.md`
**Depends on:** Task 2.5 Output

### Task Objective

Create the approval workflow system for low-confidence detections (<70%) where items are stored as pending, users can retrieve pending items via polling, approve items with quantity adjustment to add to basket, or decline items.

### Expected Output

Extend `backend/src/routes/basket.js` with:
- POST /api/basket/pending-items - Flask submits low confidence (no auth)
- GET /api/basket/:userId/pending-items - Frontend polling (auth)
- POST /api/basket/pending-items/:itemId/approve - User approval (auth)
- POST /api/basket/pending-items/:itemId/decline - User rejection (auth)

### Key Implementation Points

1. **Flask Pending Submission:**
   - Extract: {productId, name, quantity, confidence, deviceId}
   - Validate confidence < 0.7 (return 400 if >= 0.7)
   - Get connected_user_id from device
   - INSERT INTO pending_items with status='pending'
   - Include product name (duplicate from products table for display)

2. **Pending Retrieval:**
   ```sql
   SELECT * FROM pending_items
   WHERE user_id = $1 AND status = 'pending'
   ORDER BY timestamp ASC
   ```

3. **Approval Endpoint:**
   - Extract: {quantity} (user can adjust before approving)
   - Query pending item WHERE id=$1 AND status='pending'
   - BEGIN TRANSACTION
   - INSERT INTO basket_items (using adjusted quantity)
   - UPDATE pending_items SET status='approved'
   - COMMIT TRANSACTION
   - Return updated basket

4. **Decline Endpoint:**
   - UPDATE pending_items SET status='declined', timestamp=NOW()
   - Implement cleanup cron: DELETE WHERE status='declined' AND timestamp < NOW() - INTERVAL '24 hours'
   - Log for ML model feedback

5. **End-to-End Test:**
   - Flask sends confidence 0.65 → pending_items
   - Frontend retrieves pending item
   - User approves with quantity 2 → basket_items
   - Verify basket updated correctly

### NEW FEATURE Note

This is a **NEW FEATURE** not in original frontend design. Frontend (Phase 4) will need:
- UI to display pending items
- Approve/Decline buttons
- Quantity adjustment input

### Validation

- ✅ Low-confidence detections go to pending_items
- ✅ High-confidence (>=0.7) rejected by pending endpoint
- ✅ Approval moves item to basket with adjusted quantity
- ✅ Decline marks item as declined
- ✅ 24h cleanup removes old declined items

### Git Commit

```
feat: implement low-confidence item approval workflow

- Added POST /api/basket/pending-items for detections <70% confidence
- Built pending items retrieval endpoint with polling support
- Implemented approval endpoint with quantity adjustment
- Created decline endpoint with 24h cleanup for declined items
- Used transactions for atomic approve (INSERT basket + UPDATE pending)
- NEW FEATURE: Frontend will need approval UI in Phase 4

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Task 2.7 - Create Order and Checkout API Endpoints

**Agent:** Agent_Backend_Orders
**Model:** Sonnet 4.5 (transactional integrity for order creation critical)
**Memory Log:** `apm/Memory/Phase_02_Backend_API_Core/Task_2_7_Create_order_checkout_API.md`
**Depends on:** Task 2.5 Output (basket state and cleanupBasket function)

### Task Objective

Implement order creation on checkout completion with basket snapshot to order_items table, basket photo storage, order history retrieval with pagination, and single order details.

### Expected Output

Order route handlers `backend/src/routes/orders.js` with:
- POST /api/orders - Create order from basket (auth)
- GET /api/orders/user/:userId - Order history (auth)
- GET /api/orders/:orderId - Order details (auth)

### Key Implementation Points

1. **Order Creation (POST /api/orders) - CRITICAL TRANSACTION:**
   ```javascript
   // Extract: {userId, deviceId, items, total, paymentId, paymentMethod, basketPhotoBase64}
   // Validate: userId matches req.user.id, items not empty, total matches sum

   // BEGIN TRANSACTION
   // 1. Generate orderId: ORD-### format
   // 2. Handle basket photo (decode base64, save to ./storage/orders/, get URL)
   // 3. INSERT INTO orders
   // 4. Loop items: INSERT INTO order_items (snapshot product details)
   // 5. Call cleanupBasket(userId, deviceId, transaction)
   // COMMIT TRANSACTION

   // Return {order details with items}
   ```

2. **Basket Photo Storage:**
   - Decode base64: `Buffer.from(base64Data, 'base64')`
   - Generate filename: `${orderId}-basket-${timestamp}.jpg`
   - Create directory: `mkdir -p ./storage/orders/`
   - Write file: `fs.writeFileSync(path, buffer)`
   - Handle errors gracefully (photo is nice-to-have, don't fail order)
   - For production: Upload to S3 instead of local storage

3. **Order History:**
   ```sql
   SELECT orders.*, COUNT(order_items.id) as itemCount
   FROM orders
   LEFT JOIN order_items ON orders.id = order_items.order_id
   WHERE orders.user_id = $1
   [AND status = $2]
   [AND created_at BETWEEN $3 AND $4]
   GROUP BY orders.id
   ORDER BY created_at DESC
   LIMIT $5 OFFSET $6
   ```
   - Add pagination and filters (status, date range)
   - Calculate summary stats (totalOrders, totalSpent, avgOrder)

4. **Order Details:**
   ```sql
   SELECT orders.*, order_items.*
   FROM orders
   JOIN order_items ON orders.id = order_items.order_id
   WHERE orders.id = $1
   ```
   - Verify user owns order (userId matches OR user is admin)
   - Return full order with all items

### Atomicity is Critical

Order creation MUST be atomic:
- If photo save fails → continue (log error)
- If order INSERT fails → rollback all
- If order_items INSERT fails → rollback all
- If cleanupBasket fails → rollback all

**No partial orders allowed!**

### Validation

- ✅ Order created with snapshot of basket items
- ✅ Basket cleaned up after order creation
- ✅ Basket photo saved to storage/orders/
- ✅ Transaction rolls back on any failure
- ✅ Order history returns user's orders
- ✅ Order details shows full item list

### Git Commit

```
feat: create order and checkout API endpoints

- Implemented POST /api/orders with atomic transaction (order + items + basket cleanup)
- Added basket photo storage with base64 decoding to ./storage/orders/
- Built order history with pagination, filters, and summary stats
- Created order details endpoint with full item list
- Transaction ensures no partial orders (rollback on any failure)
- Users can only see own orders, admins can see all

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Task 2.8 - Implement User and Admin Management Endpoints

**Agent:** Agent_Backend_Orders
**Model:** Haiku ✅ (reporting and analytics, straightforward queries)
**Memory Log:** `apm/Memory/Phase_02_Backend_API_Core/Task_2_8_Implement_admin_management_endpoints.md`
**Depends on:** Task 2.2 Output (requireAdmin middleware)

### Task Objective

Create admin-only endpoints for user management, order management, and analytics dashboard providing comprehensive administrative oversight with search, filtering, pagination, and aggregated statistics.

### Expected Output

Admin route handlers `backend/src/routes/admin.js` with:
- GET /api/admin/users - User list with stats
- GET /api/admin/orders - All orders with filtering
- GET /api/admin/analytics/dashboard - Dashboard aggregations
- GET /api/admin/products/stats - Product analytics

All endpoints protected by authenticateToken + requireAdmin.

### Key Implementation Points

1. **User Management (GET /api/admin/users):**
   ```sql
   SELECT users.*,
          COUNT(DISTINCT orders.id) as totalOrders,
          COALESCE(SUM(orders.total), 0) as totalSpent
   FROM users
   LEFT JOIN orders ON users.id = orders.user_id
   WHERE [users.name ILIKE %$1% OR users.email ILIKE %$1%]
   [AND users.status = $2]
   GROUP BY users.id
   ORDER BY $3 $4
   LIMIT $5 OFFSET $6
   ```
   - Search by name/email
   - Filter by status (active, inactive, suspended)
   - Sort by any column (totalOrders, totalSpent, joinDate)
   - Pagination

2. **Order Management (GET /api/admin/orders):**
   ```sql
   SELECT orders.*, users.name as userName, users.email as userEmail,
          COUNT(order_items.id) as itemCount
   FROM orders
   JOIN users ON orders.user_id = users.id
   LEFT JOIN order_items ON orders.id = order_items.order_id
   WHERE [orders.id ILIKE %$1% OR users.name ILIKE %$1% OR users.email ILIKE %$1%]
   [AND orders.status = $2]
   [AND orders.created_at BETWEEN $3 AND $4]
   GROUP BY orders.id, users.name, users.email
   ORDER BY $5 $6
   LIMIT $7 OFFSET $8
   ```
   - Search by orderId, customer name, email
   - Filter by status, date range
   - Calculate aggregate stats (totalRevenue, avgOrderValue)

3. **Analytics Dashboard (GET /api/admin/analytics/dashboard):**
   - Key metrics: totalRevenue, totalOrders, productsSold, avgOrderValue
   - Change percentages vs previous period (revenueChange, ordersChange)
   - Revenue by day chart:
     ```sql
     SELECT DATE(created_at) as date, SUM(total) as revenue, COUNT(*) as orders
     FROM orders
     WHERE created_at >= $1
     GROUP BY DATE(created_at)
     ORDER BY date
     ```
   - Sales by category chart:
     ```sql
     SELECT products.category, SUM(order_items.quantity * order_items.price) as value
     FROM order_items
     JOIN products ON order_items.product_id = products.id
     GROUP BY category
     ```
   - Recent activity feed (last 10 orders)
   - Cache dashboard for 5 minutes

4. **Product Stats (GET /api/admin/products/stats):**
   ```sql
   SELECT products.id, products.name, products.category, products.price, products.stock,
          COALESCE(SUM(order_items.quantity), 0) as sold,
          COALESCE(SUM(order_items.quantity * order_items.price), 0) as revenue
   FROM products
   LEFT JOIN order_items ON products.id = order_items.product_id
   GROUP BY products.id
   ORDER BY revenue DESC
   ```
   - Identify low-stock products (stock < 20)
   - Identify best-sellers (sold > threshold)

### Validation

- ✅ Admin can list all users with stats
- ✅ Admin can search/filter orders
- ✅ Dashboard returns aggregated metrics and charts
- ✅ Product stats show sales and revenue per product
- ✅ Non-admin users get 403 Forbidden
- ✅ All queries perform well (<200ms)

### Git Commit

```
feat: implement admin management and analytics endpoints

- Added GET /api/admin/users with search, filtering, and per-user stats
- Built GET /api/admin/orders with search, filters, pagination, and aggregates
- Implemented dashboard analytics with revenue/orders metrics and charts
- Created product stats endpoint with sales and revenue per product
- All endpoints protected by authenticateToken + requireAdmin middleware
- Dashboard cached for 5 minutes to optimize performance

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

**END OF PHASE 2 TASK ASSIGNMENTS**

All 8 Task Assignment Prompts are ready for Implementation Agents. Delete this file after copying the prompts you need.

## Phase 2 Model Recommendations Summary

**Sonnet 4.5 Required:**
- ✅ Task 2.1 - Express server (foundational)
- ✅ Task 2.2 - JWT authentication (security-critical)
- ✅ Task 2.4 - Device pairing (complex state management)
- ✅ Task 2.5 - Basket management (core business logic)
- ✅ Task 2.7 - Orders (transactional integrity)

**Haiku Suitable:**
- ✅ Task 2.3 - Product catalog (straightforward CRUD)
- ✅ Task 2.6 - Approval workflow (extends Task 2.5)
- ✅ Task 2.8 - Admin endpoints (reporting/analytics)

## Next Steps

After all Phase 2 tasks complete, Manager Agent will:
1. Review all Memory Logs
2. Create Phase 2 Summary in Memory_Root.md
3. Prepare Phase 3 Task Assignment Prompts (Flask Detection Service)
4. Continue orchestration
