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
