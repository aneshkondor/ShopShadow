const crypto = require('crypto');
const logger = require('../../../shared/logger');

/**
 * Generate a random 4-digit code (0000-9999)
 * @returns {string} 4-digit code padded with leading zeros
 */
function generateCode() {
  const code = crypto.randomInt(0, 10000);
  return code.toString().padStart(4, '0');
}

/**
 * Generate unique 4-digit device code
 * Checks database for uniqueness and retries if collision occurs
 *
 * @param {import('pg').Pool} pool - PostgreSQL connection pool
 * @param {number} maxRetries - Maximum number of retry attempts (default: 10)
 * @returns {Promise<string>} Unique 4-digit code
 * @throws {Error} If unable to generate unique code after max retries
 */
async function generateUniqueCode(pool, maxRetries = 10) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const code = generateCode();

    try {
      // Check if code already exists in devices table
      const result = await pool.query(
        'SELECT id FROM devices WHERE code = $1',
        [code]
      );

      if (result.rows.length === 0) {
        // Code is unique
        logger.debug(`Generated unique device code: ${code}`, { attempt });
        return code;
      }

      logger.debug(`Code collision detected: ${code}, retrying...`, { attempt });
    } catch (error) {
      logger.error('Database error during code uniqueness check', {
        error: error.message,
        attempt
      });
      throw new Error('Failed to verify code uniqueness');
    }
  }

  // Failed to generate unique code after max retries
  logger.error('Failed to generate unique device code', { maxRetries });
  throw new Error(`Unable to generate unique code after ${maxRetries} attempts`);
}

/**
 * Check if device code has expired (4-hour window)
 * @param {Object} device - Device object from database with created_at timestamp
 * @returns {boolean} True if code is expired
 */
function isCodeExpired(device) {
  if (!device || !device.created_at) {
    return true;
  }

  const createdAt = new Date(device.created_at);
  const now = new Date();
  const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60); // milliseconds to hours

  const isExpired = hoursSinceCreation > 4;

  if (isExpired) {
    logger.debug('Device code expired', {
      deviceId: device.id,
      code: device.code,
      hoursSinceCreation: hoursSinceCreation.toFixed(2)
    });
  }

  return isExpired;
}

/**
 * Check if device heartbeat is stale (last heartbeat > 5 minutes ago)
 * @param {Object} device - Device object from database with last_heartbeat timestamp
 * @returns {boolean} True if heartbeat is stale (should auto-disconnect)
 */
function isHeartbeatStale(device) {
  if (!device || !device.last_heartbeat) {
    return true; // No heartbeat ever recorded
  }

  const lastHeartbeat = new Date(device.last_heartbeat);
  const now = new Date();
  const minutesSinceHeartbeat = (now - lastHeartbeat) / (1000 * 60); // milliseconds to minutes

  const isStale = minutesSinceHeartbeat > 5;

  if (isStale) {
    logger.debug('Device heartbeat stale', {
      deviceId: device.id,
      minutesSinceHeartbeat: minutesSinceHeartbeat.toFixed(2)
    });
  }

  return isStale;
}

module.exports = {
  generateUniqueCode,
  isCodeExpired,
  isHeartbeatStale
};
