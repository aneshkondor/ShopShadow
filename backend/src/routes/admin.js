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

module.exports = router;
