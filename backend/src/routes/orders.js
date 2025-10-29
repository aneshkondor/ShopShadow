const express = require('express');
const fs = require('fs');
const path = require('path');
const { pool } = require('../server');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../../../shared/logger');

const router = express.Router();

// Storage directory for basket photos
const STORAGE_DIR = path.join(__dirname, '../../../storage/orders');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
  logger.info('Created orders storage directory', { path: STORAGE_DIR });
}

// =============================================================================
// Helper: Clean up basket after order creation
// =============================================================================
async function cleanupBasket(userId, deviceId, client) {
  const result = await client.query(
    'DELETE FROM basket_items WHERE user_id = $1 AND device_id = $2 RETURNING id',
    [userId, deviceId]
  );

  logger.info('Basket cleaned up after order', {
    userId,
    deviceId,
    itemsDeleted: result.rowCount
  });

  return result.rowCount;
}

// =============================================================================
// Helper: Generate order ID (ORD-### format)
// =============================================================================
async function generateOrderId(client) {
  // Get the count of existing orders to generate next ID
  const result = await client.query('SELECT COUNT(*) as count FROM orders');
  const count = parseInt(result.rows[0].count) + 1;
  const orderId = `ORD-${count.toString().padStart(3, '0')}`;
  return orderId;
}

// =============================================================================
// Helper: Save basket photo from base64
// =============================================================================
function saveBasketPhoto(orderId, base64Data) {
  try {
    if (!base64Data) {
      return null;
    }

    // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
    const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');

    // Decode base64
    const buffer = Buffer.from(base64Image, 'base64');

    // Generate filename
    const timestamp = Date.now();
    const filename = `${orderId}-basket-${timestamp}.jpg`;
    const filepath = path.join(STORAGE_DIR, filename);

    // Write file
    fs.writeFileSync(filepath, buffer);

    // Return relative URL for storage
    const photoUrl = `/storage/orders/${filename}`;

    logger.info('Basket photo saved', {
      orderId,
      filename,
      size: buffer.length
    });

    return photoUrl;
  } catch (error) {
    // Photo is nice-to-have, don't fail the order
    logger.error('Failed to save basket photo', {
      orderId,
      error: error.message
    });
    return null;
  }
}

// =============================================================================
// POST /api/orders
// Create order from basket (requires auth)
// =============================================================================
router.post('/', authenticateToken, async (req, res) => {
  const { userId, deviceId, items, total, paymentId, paymentMethod, basketPhotoBase64 } = req.body;

  // Validate user matches authenticated user
  if (req.user.id !== userId) {
    logger.warn('Unauthorized order creation attempt', {
      authenticatedUserId: req.user.id,
      requestedUserId: userId
    });
    return res.status(403).json({
      success: false,
      error: 'Not authorized to create order for this user',
      code: 'FORBIDDEN'
    });
  }

  // Validate required fields
  if (!userId || !deviceId || !items || !Array.isArray(items) || items.length === 0 || total === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: userId, deviceId, items (non-empty array), total',
      code: 'INVALID_REQUEST'
    });
  }

  // Validate total matches sum of items
  const calculatedTotal = items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);

  if (Math.abs(calculatedTotal - total) > 0.01) {
    logger.warn('Order total mismatch', {
      providedTotal: total,
      calculatedTotal,
      userId,
      deviceId
    });
    return res.status(400).json({
      success: false,
      error: 'Order total does not match sum of items',
      code: 'TOTAL_MISMATCH',
      details: {
        providedTotal: total,
        calculatedTotal: calculatedTotal.toFixed(2)
      }
    });
  }

  const client = await pool.connect();

  try {
    // Begin transaction
    await client.query('BEGIN');

    try {
      // 1. Generate order ID
      const orderId = await generateOrderId(client);

      // 2. Save basket photo (if provided)
      const basketPhotoUrl = saveBasketPhoto(orderId, basketPhotoBase64);

      // 3. Insert order
      const orderQuery = await client.query(
        `INSERT INTO orders (id, user_id, device_id, total, status, payment_method, payment_id, basket_photo_url, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
         RETURNING id, user_id, device_id, total, status, payment_method, payment_id, basket_photo_url, created_at, updated_at`,
        [orderId, userId, deviceId, total, 'completed', paymentMethod || null, paymentId || null, basketPhotoUrl]
      );

      const order = orderQuery.rows[0];

      // 4. Insert order items (snapshot product details)
      const orderItems = [];
      for (const item of items) {
        const itemQuery = await client.query(
          `INSERT INTO order_items (order_id, product_id, name, category, quantity, price, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           RETURNING id, order_id, product_id, name, category, quantity, price, subtotal, created_at`,
          [orderId, item.productId, item.name, item.category || null, item.quantity, item.price]
        );

        orderItems.push(itemQuery.rows[0]);
      }

      // 5. Clean up basket
      await cleanupBasket(userId, deviceId, client);

      // Commit transaction
      await client.query('COMMIT');

      logger.info('Order created successfully', {
        orderId,
        userId,
        deviceId,
        total,
        itemCount: orderItems.length,
        hasPhoto: !!basketPhotoUrl
      });

      // Return order with items
      res.status(201).json({
        success: true,
        data: {
          order: {
            id: order.id,
            userId: order.user_id,
            deviceId: order.device_id,
            total: parseFloat(order.total),
            status: order.status,
            paymentMethod: order.payment_method,
            paymentId: order.payment_id,
            basketPhotoUrl: order.basket_photo_url,
            createdAt: order.created_at,
            updatedAt: order.updated_at
          },
          items: orderItems.map(item => ({
            id: item.id,
            orderId: item.order_id,
            productId: item.product_id,
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            price: parseFloat(item.price),
            subtotal: parseFloat(item.subtotal),
            createdAt: item.created_at
          }))
        }
      });
    } catch (transactionError) {
      await client.query('ROLLBACK');
      throw transactionError;
    }
  } catch (error) {
    logger.error('Error creating order', {
      error: error.message,
      stack: error.stack,
      userId,
      deviceId
    });
    res.status(500).json({
      success: false,
      error: 'Failed to create order',
      code: 'ORDER_CREATION_ERROR'
    });
  } finally {
    client.release();
  }
});

// =============================================================================
// GET /api/orders/user/:userId
// Get order history for a user (requires auth)
// =============================================================================
router.get('/user/:userId', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  const { status, startDate, endDate, limit = 10, offset = 0 } = req.query;

  // Validate user is requesting their own orders (or is admin)
  if (req.user.id !== userId && req.user.role !== 'admin') {
    logger.warn('Unauthorized order history access', {
      requestingUserId: req.user.id,
      targetUserId: userId
    });
    return res.status(403).json({
      success: false,
      error: 'Not authorized to view this user\'s orders',
      code: 'FORBIDDEN'
    });
  }

  try {
    // Build query with filters
    let queryText = `
      SELECT
        orders.id,
        orders.user_id,
        orders.device_id,
        orders.total,
        orders.status,
        orders.payment_method,
        orders.payment_id,
        orders.basket_photo_url,
        orders.created_at,
        orders.updated_at,
        COUNT(order_items.id) as item_count
      FROM orders
      LEFT JOIN order_items ON orders.id = order_items.order_id
      WHERE orders.user_id = $1
    `;

    const queryParams = [userId];
    let paramIndex = 2;

    // Add status filter
    if (status) {
      queryText += ` AND orders.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    // Add date range filter
    if (startDate) {
      queryText += ` AND orders.created_at >= $${paramIndex}`;
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      queryText += ` AND orders.created_at <= $${paramIndex}`;
      queryParams.push(endDate);
      paramIndex++;
    }

    queryText += ` GROUP BY orders.id ORDER BY orders.created_at DESC`;

    // Add pagination
    queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit), parseInt(offset));

    const ordersResult = await pool.query(queryText, queryParams);

    const orders = ordersResult.rows.map(order => ({
      id: order.id,
      userId: order.user_id,
      deviceId: order.device_id,
      total: parseFloat(order.total),
      status: order.status,
      paymentMethod: order.payment_method,
      paymentId: order.payment_id,
      basketPhotoUrl: order.basket_photo_url,
      itemCount: parseInt(order.item_count),
      createdAt: order.created_at,
      updatedAt: order.updated_at
    }));

    // Calculate summary stats
    const summaryQuery = await pool.query(
      `SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_spent,
        COALESCE(AVG(total), 0) as avg_order
       FROM orders
       WHERE user_id = $1`,
      [userId]
    );

    const summary = {
      totalOrders: parseInt(summaryQuery.rows[0].total_orders),
      totalSpent: parseFloat(summaryQuery.rows[0].total_spent),
      avgOrder: parseFloat(summaryQuery.rows[0].avg_order)
    };

    logger.info('Retrieved order history', {
      userId,
      count: orders.length,
      filters: { status, startDate, endDate },
      pagination: { limit, offset }
    });

    res.json({
      success: true,
      data: {
        orders,
        summary,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          count: orders.length
        }
      }
    });
  } catch (error) {
    logger.error('Error retrieving order history', {
      error: error.message,
      userId
    });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve order history',
      code: 'RETRIEVAL_ERROR'
    });
  }
});

// =============================================================================
// GET /api/orders/:orderId
// Get order details with all items (requires auth)
// =============================================================================
router.get('/:orderId', authenticateToken, async (req, res) => {
  const { orderId } = req.params;

  try {
    // Get order
    const orderQuery = await pool.query(
      `SELECT id, user_id, device_id, total, status, payment_method, payment_id, basket_photo_url, receipt_url, created_at, updated_at
       FROM orders
       WHERE id = $1`,
      [orderId]
    );

    if (orderQuery.rows.length === 0) {
      logger.warn('Order not found', { orderId });
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        code: 'ORDER_NOT_FOUND'
      });
    }

    const order = orderQuery.rows[0];

    // Verify user owns order (or is admin)
    if (order.user_id !== req.user.id && req.user.role !== 'admin') {
      logger.warn('Unauthorized order access', {
        requestingUserId: req.user.id,
        orderUserId: order.user_id,
        orderId
      });
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this order',
        code: 'FORBIDDEN'
      });
    }

    // Get order items
    const itemsQuery = await pool.query(
      `SELECT id, order_id, product_id, name, category, quantity, price, subtotal, created_at
       FROM order_items
       WHERE order_id = $1
       ORDER BY created_at ASC`,
      [orderId]
    );

    const items = itemsQuery.rows.map(item => ({
      id: item.id,
      orderId: item.order_id,
      productId: item.product_id,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      price: parseFloat(item.price),
      subtotal: parseFloat(item.subtotal),
      createdAt: item.created_at
    }));

    logger.info('Retrieved order details', {
      orderId,
      userId: order.user_id,
      itemCount: items.length
    });

    res.json({
      success: true,
      data: {
        order: {
          id: order.id,
          userId: order.user_id,
          deviceId: order.device_id,
          total: parseFloat(order.total),
          status: order.status,
          paymentMethod: order.payment_method,
          paymentId: order.payment_id,
          basketPhotoUrl: order.basket_photo_url,
          receiptUrl: order.receipt_url,
          createdAt: order.created_at,
          updatedAt: order.updated_at
        },
        items
      }
    });
  } catch (error) {
    logger.error('Error retrieving order details', {
      error: error.message,
      orderId
    });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve order details',
      code: 'RETRIEVAL_ERROR'
    });
  }
});

module.exports = router;
