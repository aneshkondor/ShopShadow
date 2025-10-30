const express = require('express');
const router = express.Router();
const { pool } = require('../server');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../../../shared/logger');

// All routes require admin authentication
router.use(authenticateToken, requireAdmin);

/**
 * GET /api/admin/users
 * List all users with order statistics
 */
router.get('/users', async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    // Build WHERE clause dynamically
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(users.name ILIKE $${paramIndex} OR users.email ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      conditions.push(`users.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Validate sortBy to prevent SQL injection
    const validSortColumns = ['created_at', 'name', 'email', 'totalOrders', 'totalSpent'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const sortDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Query users with stats
    const usersQuery = `
      SELECT users.id, users.name, users.email, users.role, users.status,
             users.email_verified as "emailVerified",
             users.created_at as "createdAt", users.updated_at as "updatedAt",
             COUNT(DISTINCT orders.id) as "totalOrders",
             COALESCE(SUM(orders.total), 0) as "totalSpent"
      FROM users
      LEFT JOIN orders ON users.id = orders.user_id
      ${whereClause}
      GROUP BY users.id
      ORDER BY ${sortColumn === 'totalOrders' || sortColumn === 'totalSpent' ? '"' + sortColumn + '"' : sortColumn} ${sortDir}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const usersResult = await pool.query(usersQuery, params);

    // Count total users
    const countQuery = `SELECT COUNT(DISTINCT users.id) FROM users ${whereClause}`;
    const countResult = await pool.query(countQuery, params.slice(0, params.length - 2));
    const total = parseInt(countResult.rows[0].count);

    // Calculate summary stats
    const statsQuery = `
      SELECT
        COUNT(*) as "totalUsers",
        COUNT(CASE WHEN status = 'active' THEN 1 END) as "activeUsers",
        COALESCE(SUM(orders.total), 0) as "totalRevenue"
      FROM users
      LEFT JOIN orders ON users.id = orders.user_id
    `;
    const statsResult = await pool.query(statsQuery);

    logger.info('Admin: Users list retrieved', {
      adminId: req.user.id,
      resultCount: usersResult.rows.length,
      page,
      search
    });

    res.json({
      success: true,
      users: usersResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats: statsResult.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/orders
 * List all orders with filtering
 */
router.get('/orders', async (req, res, next) => {
  try {
    const {
      search,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;

    // Build WHERE clause
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(orders.id ILIKE $${paramIndex} OR users.name ILIKE $${paramIndex} OR users.email ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      conditions.push(`orders.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (startDate && endDate) {
      conditions.push(`orders.created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      params.push(startDate, endDate);
      paramIndex += 2;
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Validate sortBy
    const validSortColumns = ['created_at', 'total', 'status'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const sortDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Query orders
    const ordersQuery = `
      SELECT orders.id, orders.user_id as "userId", orders.total, orders.status,
             orders.payment_method as "paymentMethod",
             orders.basket_photo_url as "basketPhotoUrl",
             orders.created_at as "createdAt",
             users.name as "userName", users.email as "userEmail",
             COUNT(order_items.id) as "itemCount"
      FROM orders
      JOIN users ON orders.user_id = users.id
      LEFT JOIN order_items ON orders.id = order_items.order_id
      ${whereClause}
      GROUP BY orders.id, users.name, users.email
      ORDER BY orders.${sortColumn} ${sortDir}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const ordersResult = await pool.query(ordersQuery, params);

    // Count total
    const countQuery = `
      SELECT COUNT(DISTINCT orders.id) FROM orders
      JOIN users ON orders.user_id = users.id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params.slice(0, params.length - 2));
    const total = parseInt(countResult.rows[0].count);

    // Calculate aggregate stats
    const statsQuery = `
      SELECT
        COUNT(*) as "totalOrders",
        COALESCE(SUM(total), 0) as "totalRevenue",
        COALESCE(AVG(total), 0) as "avgOrderValue"
      FROM orders
      ${whereClause.replace(/orders\./g, '')}
    `;
    const statsResult = await pool.query(statsQuery, params.slice(0, params.length - 2));

    logger.info('Admin: Orders list retrieved', {
      adminId: req.user.id,
      resultCount: ordersResult.rows.length,
      page,
      search
    });

    res.json({
      success: true,
      orders: ordersResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats: {
        totalOrders: parseInt(statsResult.rows[0].totalOrders),
        totalRevenue: parseFloat(statsResult.rows[0].totalRevenue),
        avgOrderValue: parseFloat(statsResult.rows[0].avgOrderValue)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/analytics/dashboard
 * Dashboard analytics with charts and metrics
 */
router.get('/analytics/dashboard', async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;

    // Determine date range
    let startDate;
    switch (period) {
      case 'week':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'year':
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'month':
      default:
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
    }

    // Key metrics
    const metricsQuery = `
      SELECT
        COALESCE(SUM(orders.total), 0) as "totalRevenue",
        COUNT(orders.id) as "totalOrders",
        COALESCE(SUM(order_items.quantity), 0) as "productsSold",
        COALESCE(AVG(orders.total), 0) as "avgOrderValue"
      FROM orders
      LEFT JOIN order_items ON orders.id = order_items.order_id
      WHERE orders.created_at >= $1
    `;
    const metricsResult = await pool.query(metricsQuery, [startDate]);

    // Revenue by day
    const revenueByDayQuery = `
      SELECT DATE(created_at) as date,
             SUM(total) as revenue,
             COUNT(*) as orders
      FROM orders
      WHERE created_at >= $1
      GROUP BY DATE(created_at)
      ORDER BY date
    `;
    const revenueByDayResult = await pool.query(revenueByDayQuery, [startDate]);

    // Sales by category
    const salesByCategoryQuery = `
      SELECT products.category,
             SUM(order_items.quantity * order_items.price) as value
      FROM order_items
      JOIN products ON order_items.product_id = products.id
      JOIN orders ON order_items.order_id = orders.id
      WHERE orders.created_at >= $1
      GROUP BY products.category
      ORDER BY value DESC
    `;
    const salesByCategoryResult = await pool.query(salesByCategoryQuery, [startDate]);

    // Recent activity (last 10 orders)
    const recentActivityQuery = `
      SELECT orders.id, orders.total, orders.created_at as "createdAt",
             users.name as "userName"
      FROM orders
      JOIN users ON orders.user_id = users.id
      ORDER BY orders.created_at DESC
      LIMIT 10
    `;
    const recentActivityResult = await pool.query(recentActivityQuery);

    logger.info('Admin: Dashboard analytics retrieved', {
      adminId: req.user.id,
      period
    });

    res.json({
      success: true,
      stats: {
        totalRevenue: parseFloat(metricsResult.rows[0].totalRevenue),
        totalOrders: parseInt(metricsResult.rows[0].totalOrders),
        productsSold: parseInt(metricsResult.rows[0].productsSold),
        avgOrderValue: parseFloat(metricsResult.rows[0].avgOrderValue)
      },
      charts: {
        revenueByDay: revenueByDayResult.rows.map(row => ({
          date: row.date,
          revenue: parseFloat(row.revenue),
          orders: parseInt(row.orders)
        })),
        salesByCategory: salesByCategoryResult.rows.map(row => ({
          category: row.category,
          value: parseFloat(row.value)
        }))
      },
      recentActivity: recentActivityResult.rows
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/products/stats
 * Product-level analytics
 */
router.get('/products/stats', async (req, res, next) => {
  try {
    const productsQuery = `
      SELECT products.id, products.name, products.category, products.price, products.stock,
             COALESCE(SUM(order_items.quantity), 0) as sold,
             COALESCE(SUM(order_items.quantity * order_items.price), 0) as revenue,
             MAX(order_items.created_at) as "lastSold"
      FROM products
      LEFT JOIN order_items ON products.id = order_items.product_id
      GROUP BY products.id
      ORDER BY revenue DESC
    `;
    const productsResult = await pool.query(productsQuery);

    const products = productsResult.rows.map(row => ({
      ...row,
      sold: parseInt(row.sold),
      revenue: parseFloat(row.revenue),
      isLowStock: row.stock < 20,
      isBestSeller: parseInt(row.sold) > 50
    }));

    logger.info('Admin: Product stats retrieved', {
      adminId: req.user.id,
      productCount: products.length
    });

    res.json({
      success: true,
      products
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/detection-stats
 * Detection analytics including confidence breakdown, hourly trend, and device activity
 */
router.get('/detection-stats', async (req, res, next) => {
  try {
    const [
      basketTodayResult,
      highConfidenceResult,
      lowConfidenceResult,
      pendingApprovalsResult,
      approvalStatsResult,
      avgConfidenceResult,
      detectionsByHourResult,
      deviceActivityResult
    ] = await Promise.all([
      pool.query(
        `
          SELECT COUNT(*) AS count
          FROM basket_items
          WHERE added_at >= CURRENT_DATE
        `
      ),
      pool.query(
        `
          SELECT COUNT(*) AS count
          FROM basket_items
          WHERE added_at >= CURRENT_DATE
            AND confidence >= 0.7
        `
      ),
      pool.query(
        `
          SELECT COUNT(*) AS count
          FROM pending_items
          WHERE status = 'pending'
            AND timestamp >= CURRENT_DATE
        `
      ),
      pool.query(
        `
          SELECT COUNT(*) AS count
          FROM pending_items
          WHERE status = 'pending'
        `
      ),
      pool.query(
        `
          SELECT
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
            SUM(CASE WHEN status = 'declined' THEN 1 ELSE 0 END) AS declined
          FROM pending_items
          WHERE timestamp >= CURRENT_DATE
        `
      ),
      pool.query(
        `
          SELECT AVG(confidence) AS avg_confidence
          FROM (
            SELECT confidence, added_at AS recorded_at
            FROM basket_items
            WHERE added_at >= CURRENT_DATE
            UNION ALL
            SELECT confidence, timestamp AS recorded_at
            FROM pending_items
            WHERE timestamp >= CURRENT_DATE
          ) AS combined_confidence
        `
      ),
      pool.query(
        `
          SELECT hour, SUM(count) AS count
          FROM (
            SELECT
              EXTRACT(HOUR FROM added_at) AS hour,
              COUNT(*) AS count
            FROM basket_items
            WHERE added_at >= NOW() - INTERVAL '24 hours'
            GROUP BY hour
            UNION ALL
            SELECT
              EXTRACT(HOUR FROM timestamp) AS hour,
              COUNT(*) AS count
            FROM pending_items
            WHERE timestamp >= NOW() - INTERVAL '24 hours'
            GROUP BY hour
          ) AS hourly_counts
          GROUP BY hour
          ORDER BY hour
        `
      ),
      pool.query(
        `
          SELECT
            d.id,
            d.name,
            d.code,
            d.status,
            d.last_heartbeat,
            COALESCE((
              SELECT COUNT(*)
              FROM basket_items bi
              WHERE bi.device_id = d.id
                AND bi.added_at >= CURRENT_DATE
            ), 0)
            +
            COALESCE((
              SELECT COUNT(*)
              FROM pending_items pi
              WHERE pi.device_id = d.id
                AND pi.timestamp >= CURRENT_DATE
            ), 0) AS detection_count
          FROM devices d
          ORDER BY d.last_heartbeat DESC NULLS LAST, d.created_at DESC
        `
      )
    ]);

    const highConfidence = parseInt(highConfidenceResult.rows[0]?.count ?? 0, 10);
    const lowConfidence = parseInt(lowConfidenceResult.rows[0]?.count ?? 0, 10);
    const detectionsFromBasket = parseInt(basketTodayResult.rows[0]?.count ?? 0, 10);
    const detectionsToday = highConfidence + lowConfidence;

    const approved = parseInt(approvalStatsResult.rows[0]?.approved ?? 0, 10);
    const declined = parseInt(approvalStatsResult.rows[0]?.declined ?? 0, 10);
    const approvalRate =
      approved + declined > 0 ? parseFloat(((approved / (approved + declined)) * 100).toFixed(1)) : 0;

    const avgConfidence = avgConfidenceResult.rows[0]?.avg_confidence
      ? parseFloat(parseFloat(avgConfidenceResult.rows[0].avg_confidence).toFixed(2))
      : 0;

    const detectionsByHour = detectionsByHourResult.rows.map((row) => ({
      hour: row.hour !== null ? row.hour.toString().padStart(2, '0') : '00',
      count: parseInt(row.count, 10)
    }));

    const deviceActivity = deviceActivityResult.rows.map((row) => {
      const lastHeartbeat = row.last_heartbeat ? new Date(row.last_heartbeat) : null;
      let derivedStatus = 'pending';
      if (lastHeartbeat) {
        const diffMinutes = (Date.now() - lastHeartbeat.getTime()) / (1000 * 60);
        derivedStatus = diffMinutes <= 5 ? 'active' : 'inactive';
      } else if (row.status === 'disconnected') {
        derivedStatus = 'inactive';
      }

      return {
        device_id: row.id,
        device_name: row.name,
        device_code: row.code,
        last_heartbeat: row.last_heartbeat,
        detection_count: parseInt(row.detection_count, 10),
        status: derivedStatus
      };
    });

    logger.info('Admin: Detection stats retrieved', {
      adminId: req.user.id,
      detectionsToday,
      deviceCount: deviceActivity.length
    });

    res.json({
      success: true,
      stats: {
        totalDetections: detectionsToday,
        highConfidence,
        lowConfidence,
        pendingApprovals: parseInt(pendingApprovalsResult.rows[0]?.count ?? 0, 10),
        approvalRate,
        avgConfidence,
        detectionsToday: detectionsToday,
        detectionsFromBasket,
        detectionsByHour,
        deviceActivity
      }
    });
  } catch (error) {
    logger.error('Admin: Failed to fetch detection stats', {
      adminId: req.user?.id,
      error: error.message
    });
    next(error);
  }
});

/**
 * GET /api/admin/pending-items
 * Pending items queue across all users with filtering and sorting
 */
router.get('/pending-items', async (req, res, next) => {
  try {
    const {
      status = 'pending',
      minConfidence,
      maxConfidence,
      search,
      page = 1,
      limit = 50,
      sortBy = 'timestamp',
      sortOrder = 'ASC'
    } = req.query;

    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const offset = (parsedPage - 1) * parsedLimit;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`pending_items.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    const minConfidenceValue = minConfidence !== undefined ? parseFloat(minConfidence) : undefined;
    if (minConfidenceValue !== undefined && !Number.isNaN(minConfidenceValue)) {
      conditions.push(`pending_items.confidence >= $${paramIndex}`);
      params.push(minConfidenceValue);
      paramIndex++;
    }

    const maxConfidenceValue = maxConfidence !== undefined ? parseFloat(maxConfidence) : undefined;
    if (maxConfidenceValue !== undefined && !Number.isNaN(maxConfidenceValue)) {
      conditions.push(`pending_items.confidence <= $${paramIndex}`);
      params.push(maxConfidenceValue);
      paramIndex++;
    }

    if (search) {
      conditions.push(`
        (
          users.email ILIKE $${paramIndex} OR
          users.name ILIKE $${paramIndex} OR
          COALESCE(products.name, pending_items.name) ILIKE $${paramIndex}
        )
      `);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const validSortColumns = {
      timestamp: 'pending_items.timestamp',
      confidence: 'pending_items.confidence',
      quantity: 'pending_items.quantity'
    };
    const sortColumn = validSortColumns[sortBy] ?? validSortColumns.timestamp;
    const sortDirection = sortOrder && sortOrder.toString().toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const pendingQuery = `
      SELECT
        pending_items.id,
        pending_items.user_id,
        pending_items.device_id,
        pending_items.product_id,
        pending_items.name,
        pending_items.quantity,
        pending_items.confidence,
        pending_items.status,
        pending_items.timestamp,
        users.email AS user_email,
        users.name AS user_name,
        devices.name AS device_name,
        devices.code AS device_code,
        devices.last_heartbeat AS device_last_heartbeat,
        COALESCE(products.name, pending_items.name) AS product_name
      FROM pending_items
      LEFT JOIN users ON pending_items.user_id = users.id
      LEFT JOIN devices ON pending_items.device_id = devices.id
      LEFT JOIN products ON pending_items.product_id = products.id
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(parsedLimit, offset);

    const [pendingItemsResult, countResult] = await Promise.all([
      pool.query(pendingQuery, params),
      pool.query(
        `
          SELECT COUNT(*) AS count
          FROM pending_items
          LEFT JOIN users ON pending_items.user_id = users.id
          LEFT JOIN products ON pending_items.product_id = products.id
          ${whereClause}
        `,
        params.slice(0, params.length - 2)
      )
    ]);

    const pendingItems = pendingItemsResult.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      userEmail: row.user_email,
      userName: row.user_name,
      deviceId: row.device_id,
      deviceName: row.device_name,
      deviceCode: row.device_code,
      productId: row.product_id,
      productName: row.product_name,
      quantity: parseInt(row.quantity, 10),
      confidence: parseFloat(row.confidence),
      status: row.status,
      timestamp: row.timestamp,
      deviceLastHeartbeat: row.device_last_heartbeat
    }));

    const total = parseInt(countResult.rows[0]?.count ?? 0, 10);

    logger.info('Admin: Pending items fetched', {
      adminId: req.user.id,
      pendingCount: pendingItems.length,
      page: parsedPage
    });

    res.json({
      success: true,
      pendingItems,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    logger.error('Admin: Failed to fetch pending items', {
      adminId: req.user?.id,
      error: error.message
    });
    next(error);
  }
});

module.exports = router;
