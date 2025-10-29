const express = require('express');
const router = express.Router();
const { pool } = require('../server');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../../../shared/logger');
const coreRouter = require('./basket_core');

// Mount core basket routes
router.use('/', coreRouter);

// (Core GET /:userId mounted above)

// Pending items workflow

// 1) POST /api/basket/pending-items (No auth - Flask calls this)
router.post('/pending-items', async (req, res) => {
  const { productId, name, quantity, confidence, deviceId } = req.body;

  if (!productId || !name || !quantity || confidence === undefined || !deviceId) {
    logger.warn('Pending item submission failed: Missing fields', { body: req.body });
    return res.status(400).json({ success: false, error: 'Missing required fields', code: 'MISSING_FIELDS' });
  }

  if (confidence >= 0.7) {
    return res.status(400).json({ success: false, error: 'Confidence must be < 0.7 for pending', code: 'INVALID_CONFIDENCE' });
  }

  const client = await pool.connect();
  try {
    // Get connected user from device
    const deviceResult = await client.query('SELECT connected_user_id, status FROM devices WHERE id = $1', [deviceId]);
    if (deviceResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Device not found', code: 'DEVICE_NOT_FOUND' });
    }
    const device = deviceResult.rows[0];
    if (!device.connected_user_id || device.status !== 'connected') {
      return res.status(400).json({ success: false, error: 'Device not connected', code: 'DEVICE_NOT_CONNECTED' });
    }

    // Optional: ensure product exists
    const prod = await client.query('SELECT id FROM products WHERE id = $1', [productId]);
    if (prod.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found', code: 'PRODUCT_NOT_FOUND' });
    }

    const insert = await client.query(
      `INSERT INTO pending_items (id, user_id, device_id, product_id, name, quantity, confidence, status, timestamp)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'pending', NOW())
       RETURNING id, user_id, device_id, product_id, name, quantity, confidence, status, timestamp`,
      [device.connected_user_id, deviceId, productId, name, quantity, confidence]
    );

    const pendingItem = insert.rows[0];
    logger.info('Pending item created', { id: pendingItem.id, userId: pendingItem.user_id, deviceId });
    return res.status(201).json({ success: true, pendingItem });
  } catch (error) {
    logger.error('Failed to create pending item', { error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to create pending item', code: 'DATABASE_ERROR' });
  } finally {
    client.release();
  }
});

// 2) GET /api/basket/:userId/pending-items (Auth required)
router.get('/:userId/pending-items', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  if (req.user.id !== userId) {
    return res.status(403).json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' });
  }
  try {
    const result = await pool.query(
      `SELECT id, user_id, device_id, product_id, name, quantity, confidence, status, timestamp
       FROM pending_items
       WHERE user_id = $1 AND status = 'pending'
       ORDER BY timestamp ASC`,
      [userId]
    );
    return res.json({ success: true, pendingItems: result.rows });
  } catch (error) {
    logger.error('Failed to retrieve pending items', { error: error.message, userId });
    return res.status(500).json({ success: false, error: 'Failed to retrieve pending items', code: 'DATABASE_ERROR' });
  }
});

// 3) POST /api/basket/pending-items/:itemId/approve (Auth required)
router.post('/pending-items/:itemId/approve', authenticateToken, async (req, res) => {
  const { itemId } = req.params;
  const { quantity } = req.body;
  if (!quantity || quantity <= 0) {
    return res.status(400).json({ success: false, error: 'Quantity must be > 0', code: 'INVALID_QUANTITY' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const pendingQuery = await client.query(
      `SELECT id, user_id, device_id, product_id, name, quantity, confidence, status
       FROM pending_items WHERE id = $1 FOR UPDATE`,
      [itemId]
    );
    if (pendingQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Pending item not found', code: 'NOT_FOUND' });
    }
    const pending = pendingQuery.rows[0];
    if (pending.user_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' });
    }
    if (pending.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Item not pending', code: 'INVALID_STATE' });
    }

    // Upsert into basket_items
    const existing = await client.query(
      `SELECT id, quantity FROM basket_items WHERE user_id = $1 AND device_id = $2 AND product_id = $3`,
      [pending.user_id, pending.device_id, pending.product_id]
    );
    if (existing.rows.length > 0) {
      const newQty = existing.rows[0].quantity + quantity;
      await client.query(`UPDATE basket_items SET quantity = $1 WHERE id = $2`, [newQty, existing.rows[0].id]);
    } else {
      await client.query(
        `INSERT INTO basket_items (user_id, device_id, product_id, quantity, confidence)
         VALUES ($1, $2, $3, $4, $5)`,
        [pending.user_id, pending.device_id, pending.product_id, quantity, pending.confidence]
      );
    }

    await client.query(`UPDATE pending_items SET status = 'approved', timestamp = NOW() WHERE id = $1`, [itemId]);

    await client.query('COMMIT');

    // Return updated basket snapshot
    const basket = await pool.query(
      `SELECT b.id, b.product_id, b.quantity, b.confidence, b.added_at, b.device_id,
              p.name, p.price, p.category, p.image_url, (b.quantity * p.price) AS subtotal
       FROM basket_items b JOIN products p ON b.product_id = p.id
       WHERE b.user_id = $1 ORDER BY b.added_at DESC`,
      [pending.user_id]
    );
    const items = basket.rows.map(row => ({
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
    const total = items.reduce((sum, it) => sum + it.subtotal, 0);
    return res.json({ success: true, data: { items, total: parseFloat(total.toFixed(2)), itemCount: items.length } });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to approve pending item', { error: error.message, itemId });
    return res.status(500).json({ success: false, error: 'Failed to approve pending item', code: 'DATABASE_ERROR' });
  } finally {
    client.release();
  }
});

// 4) POST /api/basket/pending-items/:itemId/decline (Auth required)
router.post('/pending-items/:itemId/decline', authenticateToken, async (req, res) => {
  const { itemId } = req.params;
  try {
    const result = await pool.query(`UPDATE pending_items SET status = 'declined', timestamp = NOW() WHERE id = $1 AND user_id = $2 RETURNING id`, [itemId, req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Item not found or not owned by user', code: 'NOT_FOUND' });
    }
    return res.json({ success: true, message: 'Item declined' });
  } catch (error) {
    logger.error('Failed to decline pending item', { error: error.message, itemId });
    return res.status(500).json({ success: false, error: 'Failed to decline pending item', code: 'DATABASE_ERROR' });
  }
});

module.exports = router;
