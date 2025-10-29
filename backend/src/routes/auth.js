const express = require('express');
const { hashPassword, comparePassword, generateToken, generateRefreshToken, verifyToken } = require('../utils/auth');
const { authenticateToken } = require('../middleware/auth');
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
    const userResult = await req.app.locals.pool.query(userQuery, [email]);

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
    const emailResult = await req.app.locals.pool.query(emailCheck, [email]);

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
    const insertResult = await req.app.locals.pool.query(insertQuery, [name, email, passwordHash]);
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
