const express = require('express');
const router = express.Router();
const { pool } = require('../server');
const { authenticateToken } = require('../middleware/auth');
const { generateUniqueCode, isCodeExpired, isHeartbeatStale } = require('../utils/deviceCodes');
const logger = require('../../../shared/logger');

// =============================================================================
// POST /api/devices/register
// Pi registration endpoint (no authentication required)
// =============================================================================

/**
 * Register a new Raspberry Pi device or refresh code for existing device
 *
 * Request body:
 * - deviceId (optional): UUID of existing device to refresh code
 * - name (optional): Device name
 * - firmwareVersion (optional): Current firmware version
 *
 * Response:
 * - deviceId: UUID of the device
 * - code: 4-digit pairing code
 * - expiresAt: ISO timestamp when code expires (4 hours)
 */
router.post('/register', async (req, res) => {
  const { deviceId, name, firmwareVersion } = req.body;

  try {
    // Generate unique 4-digit code
    const code = await generateUniqueCode(pool);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours from now

    let result;

    if (deviceId) {
      // Update existing device with new code
      result = await pool.query(
        `UPDATE devices
         SET code = $1,
             name = COALESCE($2, name),
             firmware_version = COALESCE($3, firmware_version),
             status = 'disconnected',
             battery_level = 100,
             created_at = NOW(),
             updated_at = NOW()
         WHERE id = $4
         RETURNING id, code, name, status, battery_level, firmware_version, created_at`,
        [code, name, firmwareVersion, deviceId]
      );

      if (result.rows.length === 0) {
        logger.warn('Device not found for code refresh', { deviceId });
        return res.status(404).json({
          success: false,
          error: 'Device not found',
          code: 'DEVICE_NOT_FOUND'
        });
      }

      logger.info('Device code refreshed', {
        deviceId: result.rows[0].id,
        code: result.rows[0].code
      });
    } else {
      // Create new device
      result = await pool.query(
        `INSERT INTO devices (code, name, firmware_version, status, battery_level)
         VALUES ($1, $2, $3, 'disconnected', 100)
         RETURNING id, code, name, status, battery_level, firmware_version, created_at`,
        [code, name, firmwareVersion]
      );

      logger.info('New device registered', {
        deviceId: result.rows[0].id,
        code: result.rows[0].code
      });
    }

    const device = result.rows[0];

    res.status(200).json({
      success: true,
      data: {
        deviceId: device.id,
        code: device.code,
        name: device.name,
        status: device.status,
        batteryLevel: device.battery_level,
        firmwareVersion: device.firmware_version,
        expiresAt: expiresAt.toISOString()
      }
    });
  } catch (error) {
    logger.error('Device registration failed', {
      error: error.message,
      deviceId
    });

    res.status(500).json({
      success: false,
      error: 'Device registration failed',
      code: 'REGISTRATION_ERROR'
    });
  }
});

// =============================================================================
// POST /api/devices/connect
// User pairing with device using 4-digit code (authentication required)
// =============================================================================

/**
 * Connect user to device using 4-digit pairing code
 *
 * Request body:
 * - code: 4-digit pairing code from device
 *
 * Response:
 * - device: Device details including deviceId, status, batteryLevel
 */
router.post('/connect', authenticateToken, async (req, res) => {
  const { code } = req.body;
  const userId = req.user.id;

  // Validate code format
  if (!code || !/^\d{4}$/.test(code)) {
    logger.warn('Invalid code format', { code, userId });
    return res.status(400).json({
      success: false,
      error: 'Invalid code format. Must be 4 digits.',
      code: 'INVALID_CODE_FORMAT'
    });
  }

  try {
    // Find device by code
    const deviceResult = await pool.query(
      `SELECT id, code, name, status, battery_level, firmware_version,
              connected_user_id, created_at, last_heartbeat
       FROM devices
       WHERE code = $1`,
      [code]
    );

    if (deviceResult.rows.length === 0) {
      logger.warn('Device not found with code', { code, userId });
      return res.status(404).json({
        success: false,
        error: 'Device not found. Please check the code.',
        code: 'DEVICE_NOT_FOUND'
      });
    }

    const device = deviceResult.rows[0];

    // Check if code has expired (4 hours)
    if (isCodeExpired(device)) {
      logger.warn('Device code expired', {
        deviceId: device.id,
        code: device.code,
        userId
      });
      return res.status(400).json({
        success: false,
        error: 'Device code has expired. Please restart the device.',
        code: 'CODE_EXPIRED'
      });
    }

    // Check if device is already connected to another user
    if (device.connected_user_id && device.connected_user_id !== userId) {
      logger.warn('Device already connected to another user', {
        deviceId: device.id,
        connectedUserId: device.connected_user_id,
        requestingUserId: userId
      });
      return res.status(409).json({
        success: false,
        error: 'Device is already connected to another user',
        code: 'DEVICE_IN_USE'
      });
    }

    // Check if device is in valid state for connection
    if (!['disconnected', 'offline'].includes(device.status)) {
      logger.warn('Device not in connectable state', {
        deviceId: device.id,
        status: device.status,
        userId
      });
      return res.status(400).json({
        success: false,
        error: `Device is ${device.status}. Cannot connect.`,
        code: 'INVALID_DEVICE_STATE'
      });
    }

    // Connect user to device
    const updateResult = await pool.query(
      `UPDATE devices
       SET connected_user_id = $1,
           status = 'connected',
           last_heartbeat = NOW(),
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, code, name, status, battery_level, firmware_version, last_heartbeat`,
      [userId, device.id]
    );

    const connectedDevice = updateResult.rows[0];

    logger.info('User connected to device', {
      userId,
      deviceId: connectedDevice.id,
      code: connectedDevice.code
    });

    res.status(200).json({
      success: true,
      data: {
        device: {
          id: connectedDevice.id,
          name: connectedDevice.name,
          status: connectedDevice.status,
          batteryLevel: connectedDevice.battery_level,
          firmwareVersion: connectedDevice.firmware_version,
          lastHeartbeat: connectedDevice.last_heartbeat
        }
      }
    });
  } catch (error) {
    logger.error('Device connection failed', {
      error: error.message,
      code,
      userId
    });

    res.status(500).json({
      success: false,
      error: 'Failed to connect to device',
      code: 'CONNECTION_ERROR'
    });
  }
});

// =============================================================================
// GET /api/devices/:deviceId/status
// Get device status and health check (authentication required)
// =============================================================================

/**
 * Get device status, battery level, and basket item count
 * Updates heartbeat timestamp to keep connection alive
 * Auto-disconnects if last heartbeat > 5 minutes
 *
 * Response:
 * - status: Device status (connected, disconnected, offline)
 * - batteryLevel: Battery percentage (0-100)
 * - itemCount: Number of items in current basket
 * - lastHeartbeat: ISO timestamp of last heartbeat
 */
router.get('/:deviceId/status', authenticateToken, async (req, res) => {
  const { deviceId } = req.params;
  const userId = req.user.id;

  try {
    // Get device details and count basket items
    const result = await pool.query(
      `SELECT
         d.id,
         d.name,
         d.status,
         d.battery_level,
         d.firmware_version,
         d.connected_user_id,
         d.last_heartbeat,
         COUNT(b.id) as item_count
       FROM devices d
       LEFT JOIN basket_items b ON b.device_id = d.id AND b.user_id = d.connected_user_id
       WHERE d.id = $1
       GROUP BY d.id`,
      [deviceId]
    );

    if (result.rows.length === 0) {
      logger.warn('Device not found for status check', { deviceId, userId });
      return res.status(404).json({
        success: false,
        error: 'Device not found',
        code: 'DEVICE_NOT_FOUND'
      });
    }

    const device = result.rows[0];

    // Verify user owns this device
    if (device.connected_user_id !== userId) {
      logger.warn('User does not own device', {
        deviceId,
        userId,
        connectedUserId: device.connected_user_id
      });
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this device',
        code: 'UNAUTHORIZED_DEVICE'
      });
    }

    // Check if heartbeat is stale (> 5 minutes) - auto-disconnect
    if (device.status === 'connected' && isHeartbeatStale(device)) {
      logger.warn('Device heartbeat stale, auto-disconnecting', {
        deviceId,
        userId,
        lastHeartbeat: device.last_heartbeat
      });

      await pool.query(
        `UPDATE devices
         SET status = 'offline',
             updated_at = NOW()
         WHERE id = $1`,
        [deviceId]
      );

      device.status = 'offline';
    }

    // Update heartbeat if device is connected
    if (device.status === 'connected') {
      await pool.query(
        `UPDATE devices
         SET last_heartbeat = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [deviceId]
      );

      logger.debug('Device heartbeat updated', { deviceId, userId });
    }

    res.status(200).json({
      success: true,
      data: {
        device: {
          id: device.id,
          name: device.name,
          status: device.status,
          batteryLevel: device.battery_level,
          firmwareVersion: device.firmware_version,
          itemCount: parseInt(device.item_count, 10),
          lastHeartbeat: device.last_heartbeat
        }
      }
    });
  } catch (error) {
    logger.error('Device status check failed', {
      error: error.message,
      deviceId,
      userId
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get device status',
      code: 'STATUS_CHECK_ERROR'
    });
  }
});

// =============================================================================
// POST /api/devices/disconnect
// Disconnect user from device and cleanup basket (authentication required)
// =============================================================================

/**
 * Disconnect user from device
 * Clears connected_user_id and sets status to 'disconnected'
 * Note: Basket cleanup should be handled by Task 2.5 basket management
 *
 * Request body:
 * - deviceId: UUID of device to disconnect from
 *
 * Response:
 * - message: Confirmation message
 */
router.post('/disconnect', authenticateToken, async (req, res) => {
  const { deviceId } = req.body;
  const userId = req.user.id;

  if (!deviceId) {
    return res.status(400).json({
      success: false,
      error: 'deviceId is required',
      code: 'MISSING_DEVICE_ID'
    });
  }

  try {
    // Verify device exists and user owns it
    const deviceResult = await pool.query(
      'SELECT id, connected_user_id, status FROM devices WHERE id = $1',
      [deviceId]
    );

    if (deviceResult.rows.length === 0) {
      logger.warn('Device not found for disconnect', { deviceId, userId });
      return res.status(404).json({
        success: false,
        error: 'Device not found',
        code: 'DEVICE_NOT_FOUND'
      });
    }

    const device = deviceResult.rows[0];

    if (device.connected_user_id !== userId) {
      logger.warn('User does not own device for disconnect', {
        deviceId,
        userId,
        connectedUserId: device.connected_user_id
      });
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this device',
        code: 'UNAUTHORIZED_DEVICE'
      });
    }

    // Begin transaction for disconnect and basket cleanup
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Disconnect device
      await client.query(
        `UPDATE devices
         SET connected_user_id = NULL,
             status = 'disconnected',
             last_heartbeat = NULL,
             updated_at = NOW()
         WHERE id = $1`,
        [deviceId]
      );

      // Cleanup basket items (from Task 2.5 integration)
      // Delete all basket items for this user-device session
      const deleteResult = await client.query(
        'DELETE FROM basket_items WHERE user_id = $1 AND device_id = $2',
        [userId, deviceId]
      );

      await client.query('COMMIT');

      logger.info('Device disconnected and basket cleaned', {
        userId,
        deviceId,
        itemsDeleted: deleteResult.rowCount
      });

      res.status(200).json({
        success: true,
        data: {
          message: 'Device disconnected successfully',
          itemsCleared: deleteResult.rowCount
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Device disconnection failed', {
      error: error.message,
      deviceId,
      userId
    });

    res.status(500).json({
      success: false,
      error: 'Failed to disconnect device',
      code: 'DISCONNECTION_ERROR'
    });
  }
});

module.exports = router;
