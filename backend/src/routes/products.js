const express = require('express');
const { pool } = require('../server');
const logger = require('../../../shared/logger');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// =============================================================================
// PUBLIC ENDPOINTS - Product Listing and Details
// =============================================================================

/**
 * GET /api/products
 * Public endpoint - List products with filtering, search, and pagination
 *
 * Query Parameters:
 * - category: Filter by category (exact match)
 * - search: Search by product name (case-insensitive partial match)
 * - inStock: Filter to only in-stock products (true/false)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50)
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      category,
      search,
      inStock,
      page = 1,
      limit = 50
    } = req.query;

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE clause dynamically
    const conditions = [];
    const params = [];

    if (category) {
      conditions.push('category = $' + (params.length + 1));
      params.push(category);
    }

    if (search) {
      conditions.push('name ILIKE $' + (params.length + 1));
      params.push(`%${search}%`);
    }

    if (inStock === 'true' || inStock === true) {
      conditions.push('in_stock = true');
    }

    const whereClause = conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : '';

    // Query products with pagination
    const productsQuery = `
      SELECT id, name, category, price, stock, in_stock as "inStock",
             image_url as "imageUrl", description, barcode
      FROM products
      ${whereClause}
      ORDER BY name ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limitNum, offset);

    const productsResult = await pool.query(productsQuery, params);

    // Count total for pagination
    const countQuery = `SELECT COUNT(*) FROM products ${whereClause}`;
    const countParams = params.slice(0, -2); // Exclude limit/offset
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limitNum);

    // Get unique categories
    const categoriesQuery = 'SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category';
    const categoriesResult = await pool.query(categoriesQuery);
    const categories = categoriesResult.rows.map(row => row.category);

    logger.info('Product list retrieved', {
      category: category || 'all',
      search: search || 'none',
      inStock: inStock || 'all',
      resultCount: productsResult.rows.length,
      page: pageNum,
      total
    });

    res.json({
      success: true,
      products: productsResult.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      },
      categories
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/products/:productId
 * Public endpoint - Get single product details
 */
router.get('/:productId', async (req, res, next) => {
  try {
    const { productId } = req.params;

    // Validate productId format
    if (!productId || productId.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product ID',
        code: 'INVALID_PRODUCT_ID'
      });
    }

    const query = `
      SELECT id, name, category, price, stock, in_stock as "inStock",
             image_url as "imageUrl", description, barcode, weight,
             nutrition_facts as "nutritionFacts", allergens
      FROM products
      WHERE id = $1
    `;

    const result = await pool.query(query, [productId]);

    if (result.rows.length === 0) {
      logger.warn('Product not found', { productId });
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        code: 'PRODUCT_NOT_FOUND'
      });
    }

    logger.debug('Product details retrieved', { productId });

    res.json({
      success: true,
      product: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// ADMIN ENDPOINTS - Product CRUD Operations
// =============================================================================

/**
 * POST /api/admin/products
 * Admin only - Create new product
 *
 * Required fields:
 * - name: Product name
 * - category: Product category
 * - price: Product price (non-negative)
 * - stock: Product stock quantity (non-negative)
 *
 * Optional fields:
 * - description: Product description
 * - barcode: Product barcode (unique)
 * - imageUrl: Product image URL
 */
router.post('/admin/products', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const {
      name,
      category,
      price,
      stock,
      description,
      barcode,
      imageUrl
    } = req.body;

    // Validate required fields
    if (!name || !category || price === undefined || stock === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        code: 'MISSING_FIELDS',
        fields: {
          name: !name ? 'Name is required' : undefined,
          category: !category ? 'Category is required' : undefined,
          price: price === undefined ? 'Price is required' : undefined,
          stock: stock === undefined ? 'Stock is required' : undefined
        }
      });
    }

    // Validate field types and values
    if (typeof price !== 'number' || price < 0) {
      return res.status(422).json({
        success: false,
        error: 'Price must be a non-negative number',
        code: 'INVALID_PRICE'
      });
    }

    if (!Number.isInteger(stock) || stock < 0) {
      return res.status(422).json({
        success: false,
        error: 'Stock must be a non-negative integer',
        code: 'INVALID_STOCK'
      });
    }

    if (typeof name !== 'string' || name.trim().length === 0 || name.length > 255) {
      return res.status(422).json({
        success: false,
        error: 'Product name must be a non-empty string (max 255 characters)',
        code: 'INVALID_NAME'
      });
    }

    if (typeof category !== 'string' || category.trim().length === 0 || category.length > 100) {
      return res.status(422).json({
        success: false,
        error: 'Category must be a non-empty string (max 100 characters)',
        code: 'INVALID_CATEGORY'
      });
    }

    // Check barcode uniqueness if provided
    if (barcode) {
      const barcodeCheck = await pool.query(
        'SELECT id FROM products WHERE barcode = $1',
        [barcode]
      );
      if (barcodeCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Barcode already exists',
          code: 'DUPLICATE_BARCODE'
        });
      }
    }

    // Generate product ID (P### format)
    const maxIdResult = await pool.query(
      `SELECT id FROM products WHERE id LIKE 'P%' ORDER BY
       CAST(SUBSTRING(id, 2) AS INTEGER) DESC LIMIT 1`
    );

    let nextId = 'P001';
    if (maxIdResult.rows.length > 0) {
      const lastId = maxIdResult.rows[0].id;
      const lastNum = parseInt(lastId.substring(1));
      nextId = 'P' + String(lastNum + 1).padStart(3, '0');
    }

    // Insert product
    const insertQuery = `
      INSERT INTO products
        (id, name, category, price, stock, description, barcode, image_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, name, category, price, stock, in_stock as "inStock",
                created_at as "createdAt"
    `;

    const insertResult = await pool.query(insertQuery, [
      nextId,
      name.trim(),
      category.trim(),
      price,
      stock,
      description || null,
      barcode || null,
      imageUrl || null
    ]);

    logger.info('Product created', {
      productId: nextId,
      adminId: req.user.id,
      name: name.trim()
    });

    res.status(201).json({
      success: true,
      product: insertResult.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/products/:productId
 * Admin only - Update product details
 *
 * All fields are optional - only provided fields will be updated
 */
router.put('/admin/products/:productId', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { name, category, price, stock, description, barcode, imageUrl } = req.body;

    // Validate productId
    if (!productId || productId.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product ID',
        code: 'INVALID_PRODUCT_ID'
      });
    }

    // Check product exists
    const checkQuery = 'SELECT id FROM products WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [productId]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        code: 'PRODUCT_NOT_FOUND'
      });
    }

    // Validate provided values
    if (price !== undefined) {
      if (typeof price !== 'number' || price < 0) {
        return res.status(422).json({
          success: false,
          error: 'Price must be a non-negative number',
          code: 'INVALID_PRICE'
        });
      }
    }

    if (stock !== undefined) {
      if (!Number.isInteger(stock) || stock < 0) {
        return res.status(422).json({
          success: false,
          error: 'Stock must be a non-negative integer',
          code: 'INVALID_STOCK'
        });
      }
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0 || name.length > 255) {
        return res.status(422).json({
          success: false,
          error: 'Product name must be a non-empty string (max 255 characters)',
          code: 'INVALID_NAME'
        });
      }
    }

    if (category !== undefined) {
      if (typeof category !== 'string' || category.trim().length === 0 || category.length > 100) {
        return res.status(422).json({
          success: false,
          error: 'Category must be a non-empty string (max 100 characters)',
          code: 'INVALID_CATEGORY'
        });
      }
    }

    // Check barcode uniqueness if changed
    if (barcode !== undefined) {
      const barcodeCheck = await pool.query(
        'SELECT id FROM products WHERE barcode = $1 AND id != $2',
        [barcode, productId]
      );
      if (barcodeCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Barcode already exists',
          code: 'DUPLICATE_BARCODE'
        });
      }
    }

    // Build update query dynamically
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      params.push(name.trim());
      paramIndex++;
    }
    if (category !== undefined) {
      updates.push(`category = $${paramIndex}`);
      params.push(category.trim());
      paramIndex++;
    }
    if (price !== undefined) {
      updates.push(`price = $${paramIndex}`);
      params.push(price);
      paramIndex++;
    }
    if (stock !== undefined) {
      updates.push(`stock = $${paramIndex}`);
      params.push(stock);
      paramIndex++;
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(description || null);
      paramIndex++;
    }
    if (barcode !== undefined) {
      updates.push(`barcode = $${paramIndex}`);
      params.push(barcode || null);
      paramIndex++;
    }
    if (imageUrl !== undefined) {
      updates.push(`image_url = $${paramIndex}`);
      params.push(imageUrl || null);
      paramIndex++;
    }

    // If no updates provided, return bad request
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update',
        code: 'NO_UPDATES'
      });
    }

    updates.push(`updated_at = NOW()`);
    params.push(productId);

    const updateQuery = `
      UPDATE products
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, category, price, stock, in_stock as "inStock",
                updated_at as "updatedAt"
    `;

    const updateResult = await pool.query(updateQuery, params);

    logger.info('Product updated', {
      productId,
      adminId: req.user.id,
      fieldsUpdated: Object.keys(req.body).filter(k => req.body[k] !== undefined).length
    });

    res.json({
      success: true,
      product: updateResult.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/products/:productId
 * Admin only - Delete product (with safety check for recent orders)
 */
router.delete('/admin/products/:productId', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { productId } = req.params;

    // Validate productId
    if (!productId || productId.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product ID',
        code: 'INVALID_PRODUCT_ID'
      });
    }

    // Check if product exists
    const checkQuery = 'SELECT id, name FROM products WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [productId]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        code: 'PRODUCT_NOT_FOUND'
      });
    }

    // Check if product has orders in last 90 days
    const orderCheckQuery = `
      SELECT COUNT(*) as count
      FROM order_items
      WHERE product_id = $1 AND created_at > NOW() - INTERVAL '90 days'
    `;
    const orderCheckResult = await pool.query(orderCheckQuery, [productId]);
    const orderCount = parseInt(orderCheckResult.rows[0].count);

    if (orderCount > 0) {
      logger.warn('Delete product blocked: product has recent orders', {
        productId,
        orderCount,
        adminId: req.user.id
      });
      return res.status(409).json({
        success: false,
        error: 'Cannot delete product with recent orders',
        code: 'PRODUCT_IN_USE',
        message: `This product has ${orderCount} order(s) in the last 90 days and cannot be deleted`,
        affectedOrders: orderCount
      });
    }

    // Delete product
    const deleteQuery = 'DELETE FROM products WHERE id = $1';
    await pool.query(deleteQuery, [productId]);

    logger.info('Product deleted', {
      productId,
      productName: checkResult.rows[0].name,
      adminId: req.user.id
    });

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
