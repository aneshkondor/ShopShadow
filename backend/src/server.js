const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const os = require('os');
const logger = require('../../shared/logger');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 3001;
const HOST = process.env.HOST || 'localhost';

// =============================================================================
// PostgreSQL Connection Pool
// =============================================================================

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

// Make pool available to routes via app.locals
app.locals.pool = pool;

// =============================================================================
// Middleware Configuration
// =============================================================================

// CORS - Allow frontend Vite dev server and server-to-server requests
// Support comma-separated origins for LAN testing
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(url => url.trim());

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like server-to-server, mobile apps, or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

// Body parsing with size limit for base64 basket photos
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const logData = {
    query: req.query,
  };

  // Only log body for POST/PUT/PATCH requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    logData.body = req.body;
  }

  logger.info(`${req.method} ${req.path}`, logData);
  next();
});

// =============================================================================
// Routes
// =============================================================================

// Import route handlers
const authRoutes = require('./routes/auth');
const productsRoutes = require('./routes/products');
const basketRoutes = require('./routes/basket');
const deviceRoutes = require('./routes/devices');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');

// Import utility functions
const { initializeCleanupJobs } = require('./utils/cleanup');

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'ShopShadow backend is running',
    timestamp: new Date().toISOString()
  });
});

// Authentication routes (login, signup, logout, refresh)
app.use('/api/auth', authRoutes);

// Product routes (both public and admin endpoints)
// Routes with /api/admin/products prefix are handled within products.js
app.use('/api/products', productsRoutes);

// Basket routes (pending items approval workflow)
app.use('/api/basket', basketRoutes);

// Device routes (registration, pairing, status, disconnect)
app.use('/api/devices', deviceRoutes);

// Order routes (create order, order history, order details)
app.use('/api/orders', orderRoutes);

// Admin routes (user management, order management, analytics)
app.use('/api/admin', adminRoutes);

// =============================================================================
// Error Handling
// =============================================================================

// 404 handler
app.use((req, res) => {
  logger.warn(`404 Not Found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    error: 'Route not found',
    code: 'NOT_FOUND'
  });
});

// Global error handler (must be last middleware)
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

// =============================================================================
// Server Startup
// =============================================================================

// Helper to get LAN IP
function getLanIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

app.listen(PORT, HOST, () => {
  const lanIP = getLanIP();
  logger.info(`ShopShadow backend server started on port ${PORT}`, {
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    host: HOST,
    localUrl: `http://localhost:${PORT}`,
    lanUrl: HOST === '0.0.0.0' ? `http://${lanIP}:${PORT}` : undefined,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
  });

  if (HOST === '0.0.0.0') {
    logger.info(`Access from other devices on your network: http://${lanIP}:${PORT}`);
  }

  // Initialize background cleanup jobs
  initializeCleanupJobs(pool);
});

// =============================================================================
// Graceful Shutdown
// =============================================================================

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, closing server gracefully');
  pool.end(() => {
    logger.info('PostgreSQL pool closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, closing server gracefully');
  pool.end(() => {
    logger.info('PostgreSQL pool closed');
    process.exit(0);
  });
});
