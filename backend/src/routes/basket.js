const express = require('express');
const router = express.Router();
const { pool } = require('../server');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../../../shared/logger');

// =============================================================================
// POST /api/basket/items
// PURPOSE: Flask detection service adds high-confidence items to basket
// AUTH: None (internal service call)
// =============================================================================

router.post('/items', async (req, res) => {
  const { productId, quantity, confidence, deviceId } = req.body;

  // Validate required fields
  if (!productId || !quantity || confidence === undefined || !deviceId) {
    logger.warn('Basket item addition failed: Missing required fields', { body: req.body });
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: productId, quantity, confidence, deviceId',
      code: 'MISSING_FIELDS'
    });
  }

  // Validate confidence threshold (>= 0.7 for basket, lower goes to pending_items)
  if (confidence < 0.7) {
    logger.info('Item confidence too low for basket, should go to pending_items', {
      productId,
      confidence
    });
    return res.status(400).json({
      success: false,
      error: 'Confidence too low for automatic basket addition (< 0.7). Use pending items endpoint.',
      code: 'LOW_CONFIDENCE'
    });
  }

  // Validate quantity is positive
  if (quantity <= 0) {
    logger.warn('Invalid quantity', { quantity });
    return res.status(400).json({
      success: false,
      error: 'Quantity must be greater than 0',
      code: 'INVALID_QUANTITY'
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Step 1: Get connected user from device
    const deviceResult = await client.query(
      'SELECT connected_user_id, status FROM devices WHERE id = $1',
      [deviceId]
    );

    if (deviceResult.rows.length === 0) {
      await client.query('ROLLBACK');
      logger.warn('Device not found', { deviceId });
      return res.status(404).json({
        success: false,
        error: 'Device not found',
        code: 'DEVICE_NOT_FOUND'
      });
    }

    const device = deviceResult.rows[0];

    if (!device.connected_user_id) {
      await client.query('ROLLBACK');
      logger.warn('Device not connected to user', { deviceId });
      return res.status(400).json({
        success: false,
        error: 'Device not connected to any user',
        code: 'DEVICE_NOT_CONNECTED'
      });
    }

    if (device.status !== 'connected') {
      await client.query('ROLLBACK');
      logger.warn('Device not in connected state', { deviceId, status: device.status });
      return res.status(400).json({
        success: false,
        error: `Device is ${device.status}, not connected`,
        code: 'DEVICE_NOT_CONNECTED'
      });
    }

    const userId = device.connected_user_id;

    // Step 2: Verify product exists
    const productResult = await client.query(
      'SELECT id, name, price FROM products WHERE id = $1',
      [productId]
    );

    if (productResult.rows.length === 0) {
      await client.query('ROLLBACK');
      logger.warn('Product not found', { productId });
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        code: 'PRODUCT_NOT_FOUND'
      });
    }

    // Step 3: Check if item already exists in basket (for this user + device + product combination)
    const existingItemResult = await client.query(
      'SELECT id, quantity FROM basket_items WHERE user_id = $1 AND device_id = $2 AND product_id = $3',
      [userId, deviceId, productId]
    );

    if (existingItemResult.rows.length > 0) {
      // Item exists - UPDATE quantity (aggregate multiple detections)
      const existingItem = existingItemResult.rows[0];
      const newQuantity = existingItem.quantity + quantity;

      await client.query(
        'UPDATE basket_items SET quantity = $1 WHERE id = $2',
        [newQuantity, existingItem.id]
      );

      await client.query('COMMIT');

      logger.info('Basket item quantity updated', {
        userId,
        deviceId,
        productId,
        oldQuantity: existingItem.quantity,
        addedQuantity: quantity,
        newQuantity
      });

      return res.json({
        success: true,
        message: 'Item quantity updated',
        data: {
          itemId: existingItem.id,
          productId,
          quantity: newQuantity,
          action: 'updated'
        }
      });
    } else {
      // Item doesn't exist - INSERT new row
      const insertResult = await client.query(
        `INSERT INTO basket_items (user_id, device_id, product_id, quantity, confidence)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [userId, deviceId, productId, quantity, confidence]
      );

      await client.query('COMMIT');

      const newItemId = insertResult.rows[0].id;

      logger.info('New basket item added', {
        userId,
        deviceId,
        productId,
        quantity,
        confidence,
        itemId: newItemId
      });

      return res.status(201).json({
        success: true,
        message: 'Item added to basket',
        data: {
          itemId: newItemId,
          productId,
          quantity,
          action: 'created'
        }
      });
    }
  } catch (error) {
    await client.query('ROLLBACK');

    logger.error('Failed to add item to basket', {
      error: error.message,
      stack: error.stack,
      productId,
      deviceId
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to add item to basket',
      code: 'DATABASE_ERROR'
    });
  } finally {
    client.release();
  }
});

// =============================================================================
// GET /api/basket/:userId
// PURPOSE: Frontend polling to get current basket state with product details
// AUTH: Required (user can only access their own basket)
// =============================================================================

router.get('/:userId', authenticateToken, async (req, res) => {
  const { userId } = req.params;

  // Authorization check: user can only access their own basket
  if (req.user.id !== userId) {
    logger.warn('Unauthorized basket access attempt', {
      requestingUserId: req.user.id,
      targetUserId: userId
    });
    return res.status(403).json({
      success: false,
      error: 'You can only access your own basket',
      code: 'FORBIDDEN'
    });
  }

  try {
    // Query basket with JOIN to products for full details
    // Uses idx_basket_items_user_device composite index for fast retrieval
    const result = await pool.query(
      `SELECT
         basket_items.id,
         basket_items.product_id,
         basket_items.quantity,
         basket_items.confidence,
         basket_items.added_at,
         basket_items.device_id,
         products.name,
         products.price,
         products.category,
         products.image_url,
         (basket_items.quantity * products.price) AS subtotal
       FROM basket_items
       JOIN products ON basket_items.product_id = products.id
       WHERE basket_items.user_id = $1
       ORDER BY basket_items.added_at DESC`,
      [userId]
    );

    // Calculate total
    const items = result.rows.map(row => ({
      id: row.id,
      productId: row.product_id,
      name: row.name,
      price: parseFloat(row.price),
      category: row.category,
      imageUrl: row.image_url,
      quantity: row.quantity,
      confidence: row.confidence ? parseFloat(row.confidence) : null,
      subtotal: parseFloat(row.subtotal),
      addedAt: row.added_at,
      deviceId: row.device_id
    }));

    const total = items.reduce((sum, item) => sum + item.subtotal, 0);

    logger.debug('Basket retrieved', {
      userId,
      itemCount: items.length,
      total
    });

    return res.json({
      success: true,
      data: {
        items,
        total: parseFloat(total.toFixed(2)),
        itemCount: items.length
      }
    });
  } catch (error) {
    logger.error('Failed to retrieve basket', {
      error: error.message,
      stack: error.stack,
      userId
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve basket',
      code: 'DATABASE_ERROR'
    });
  }
});

// =============================================================================
// UTILITY FUNCTION: cleanupBasket
// PURPOSE: Delete all basket items for a user/device session
// USAGE: Called from disconnect handler (Task 2.4) and order creation (Task 2.7)
// =============================================================================

async function cleanupBasket(userId, deviceId, transaction = null) {
  const client = transaction || pool;

  try {
    // Delete all items for this user/device combination
    const result = await client.query(
      'DELETE FROM basket_items WHERE user_id = $1 AND device_id = $2',
      [userId, deviceId]
    );

    const deletedCount = result.rowCount;

    logger.info('Basket cleaned up', {
      userId,
      deviceId,
      itemsDeleted: deletedCount
    });

    return {
      success: true,
      itemsDeleted: deletedCount
    };
  } catch (error) {
    logger.error('Failed to cleanup basket', {
      error: error.message,
      stack: error.stack,
      userId,
      deviceId
    });

    throw error; // Propagate error to caller
  }
}

// Export router and utility function
module.exports = router;
module.exports.cleanupBasket = cleanupBasket;
