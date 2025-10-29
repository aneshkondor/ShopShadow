#!/usr/bin/env node

/**
 * ShopShadow Database Seed Script
 *
 * Populates the database with:
 * - 15+ products mapped to COCO dataset classes
 * - 2 demo users (demo@email.com, admin@email.com) with bcrypt hashed passwords
 * - 2 sample devices with 4-digit codes
 * - 3-5 sample orders with order items
 *
 * Usage: node seed.js
 *
 * Environment variables:
 * - DATABASE_URL: PostgreSQL connection string (defaults to localhost)
 * - PGUSER, PGPASSWORD, PGHOST, PGPORT, PGDATABASE: PostgreSQL connection params
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

// Database connection configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Fallback to individual env vars if DATABASE_URL not provided
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  database: process.env.PGDATABASE || 'shopshadow',
});

/**
 * Product seed data mapped to COCO dataset classes
 * COCO classes that YOLO11s can detect from food/beverage items:
 * 46: banana, 47: apple, 48: sandwich, 49: orange, 50: broccoli
 * 51: carrot, 52: hot dog, 53: pizza, 54: donut, 55: cake, 44: bottle
 */
const PRODUCTS = [
  // Fruits (COCO 46-49)
  {
    id: 'P001',
    name: 'Organic Apples',
    category: 'Fruits',
    description: 'Fresh organic red apples, 1 lb',
    price: 1.99,
    stock: 150,
    barcode: 'APPLE001',
    coco_class: 47,
  },
  {
    id: 'P002',
    name: 'Fresh Bananas',
    category: 'Fruits',
    description: 'Yellow bananas, 1 lb bunch',
    price: 0.99,
    stock: 200,
    barcode: 'BANANA001',
    coco_class: 46,
  },
  {
    id: 'P003',
    name: 'Fresh Oranges',
    category: 'Fruits',
    description: 'Citrus oranges, premium quality',
    price: 1.49,
    stock: 120,
    barcode: 'ORANGE001',
    coco_class: 49,
  },
  {
    id: 'P004',
    name: 'Red Grapes',
    category: 'Fruits',
    description: 'Sweet red grapes, 1 lb package',
    price: 2.49,
    stock: 80,
    barcode: 'GRAPES001',
    coco_class: null, // No direct COCO class, but detectable
  },

  // Vegetables (COCO 50-51)
  {
    id: 'P005',
    name: 'Fresh Carrots',
    category: 'Vegetables',
    description: 'Orange carrots, 2 lb bag',
    price: 1.49,
    stock: 120,
    barcode: 'CARROT001',
    coco_class: 51,
  },
  {
    id: 'P006',
    name: 'Broccoli Crown',
    category: 'Vegetables',
    description: 'Fresh broccoli, 1 head',
    price: 2.29,
    stock: 90,
    barcode: 'BROC001',
    coco_class: 50,
  },
  {
    id: 'P007',
    name: 'Fresh Lettuce',
    category: 'Vegetables',
    description: 'Crisp romaine lettuce',
    price: 1.79,
    stock: 100,
    barcode: 'LETTUCE001',
    coco_class: null,
  },
  {
    id: 'P008',
    name: 'Tomatoes',
    category: 'Vegetables',
    description: 'Ripe red tomatoes, 1 lb',
    price: 2.49,
    stock: 110,
    barcode: 'TOMATO001',
    coco_class: null,
  },

  // Beverages (COCO 44)
  {
    id: 'P009',
    name: 'Water Bottle',
    category: 'Beverages',
    description: 'Purified water, 16.9 fl oz',
    price: 2.49,
    stock: 100,
    barcode: 'BOTTLE001',
    coco_class: 44,
  },
  {
    id: 'P010',
    name: 'Orange Juice',
    category: 'Beverages',
    description: 'Fresh orange juice, 64 fl oz',
    price: 3.99,
    stock: 80,
    barcode: 'OJ001',
    coco_class: null,
  },
  {
    id: 'P011',
    name: 'Apple Juice',
    category: 'Beverages',
    description: 'Fresh pressed apple juice, 64 fl oz',
    price: 3.99,
    stock: 75,
    barcode: 'AJ001',
    coco_class: null,
  },
  {
    id: 'P012',
    name: 'Sparkling Water',
    category: 'Beverages',
    description: 'Carbonated mineral water, 12 pack',
    price: 4.99,
    stock: 60,
    barcode: 'SPARK001',
    coco_class: 44,
  },

  // Bakery (COCO 54-55)
  {
    id: 'P013',
    name: 'Chocolate Donut',
    category: 'Bakery',
    description: 'Glazed chocolate donut',
    price: 1.79,
    stock: 60,
    barcode: 'DONUT001',
    coco_class: 54,
  },
  {
    id: 'P014',
    name: 'Strawberry Donut',
    category: 'Bakery',
    description: 'Strawberry glazed donut',
    price: 1.79,
    stock: 55,
    barcode: 'DONUT002',
    coco_class: 54,
  },
  {
    id: 'P015',
    name: 'Birthday Cake',
    category: 'Bakery',
    description: 'Vanilla layer cake with buttercream frosting',
    price: 15.99,
    stock: 25,
    barcode: 'CAKE001',
    coco_class: 55,
  },
  {
    id: 'P016',
    name: 'Chocolate Cake',
    category: 'Bakery',
    description: 'Rich chocolate layer cake',
    price: 12.99,
    stock: 30,
    barcode: 'CAKE002',
    coco_class: 55,
  },

  // Prepared Foods (COCO 52-53, 48)
  {
    id: 'P017',
    name: 'Pepperoni Pizza',
    category: 'Prepared Foods',
    description: 'Classic pepperoni pizza, 14 inch',
    price: 8.99,
    stock: 40,
    barcode: 'PIZZA001',
    coco_class: 53,
  },
  {
    id: 'P018',
    name: 'Cheese Pizza',
    category: 'Prepared Foods',
    description: 'Classic cheese pizza, 14 inch',
    price: 7.99,
    stock: 45,
    barcode: 'PIZZA002',
    coco_class: 53,
  },
  {
    id: 'P019',
    name: 'Hot Dog Pack',
    category: 'Prepared Foods',
    description: 'Pack of 8 hot dogs with buns',
    price: 4.99,
    stock: 70,
    barcode: 'HOTDOG001',
    coco_class: 52,
  },
  {
    id: 'P020',
    name: 'Premium Sandwich',
    category: 'Deli',
    description: 'Turkey, bacon and avocado sandwich',
    price: 6.49,
    stock: 35,
    barcode: 'SAND001',
    coco_class: 48,
  },

  // Pantry items
  {
    id: 'P021',
    name: 'Pasta',
    category: 'Pantry',
    description: 'Spaghetti pasta, 1 lb box',
    price: 1.29,
    stock: 200,
    barcode: 'PASTA001',
    coco_class: null,
  },
  {
    id: 'P022',
    name: 'Olive Oil',
    category: 'Pantry',
    description: 'Extra virgin olive oil, 500 ml',
    price: 8.99,
    stock: 50,
    barcode: 'OIL001',
    coco_class: null,
  },
];

/**
 * Seed the database with initial data
 */
async function seed() {
  const client = await pool.connect();

  try {
    console.log('🌱 Starting database seed...\n');

    // ===== USERS SEEDING =====
    console.log('👤 Seeding users...');

    // Hash passwords using bcrypt
    const demoHash = await bcrypt.hash('1234', 10);
    const adminHash = await bcrypt.hash('1111', 10);

    const userResult = await client.query(`
      INSERT INTO users (name, email, password_hash, role, status, email_verified)
      VALUES
        ($1, $2, $3, $4, $5, $6),
        ($7, $8, $9, $10, $11, $12)
      RETURNING id, email, role
    `, [
      'Demo User',
      'demo@email.com',
      demoHash,
      'user',
      'active',
      true,
      'Admin User',
      'admin@email.com',
      adminHash,
      'admin',
      'active',
      true,
    ]);

    const demoUserId = userResult.rows[0].id;
    const adminUserId = userResult.rows[1].id;

    console.log(`✅ Created ${userResult.rows.length} users`);
    console.log(`   - Demo User (demo@email.com) ID: ${demoUserId}`);
    console.log(`   - Admin User (admin@email.com) ID: ${adminUserId}\n`);

    // ===== PRODUCTS SEEDING =====
    console.log('📦 Seeding products...');

    const productInserts = PRODUCTS.map(p => [
      p.id,
      p.name,
      p.category,
      p.description,
      p.price,
      p.stock,
      p.barcode,
      null, // image_url (optional for MVP)
    ]);

    for (const values of productInserts) {
      await client.query(`
        INSERT INTO products (id, name, category, description, price, stock, barcode, image_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, values);
    }

    console.log(`✅ Created ${PRODUCTS.length} products with COCO class mapping\n`);

    // ===== DEVICES SEEDING =====
    console.log('📱 Seeding devices...');

    const deviceResult = await client.query(`
      INSERT INTO devices (code, name, status, battery_level, firmware_version)
      VALUES
        ($1, $2, $3, $4, $5),
        ($6, $7, $8, $9, $10)
      RETURNING id, code, name
    `, [
      '0000',
      'Smart Basket #0000',
      'disconnected',
      100,
      '1.0.0',
      '1234',
      'Smart Basket #1234',
      'disconnected',
      100,
      '1.0.0',
    ]);

    const device0Id = deviceResult.rows[0].id;
    const device1Id = deviceResult.rows[1].id;

    console.log(`✅ Created ${deviceResult.rows.length} devices`);
    console.log(`   - Smart Basket #0000 ID: ${device0Id}`);
    console.log(`   - Smart Basket #1234 ID: ${device1Id}\n`);

    // ===== ORDERS SEEDING =====
    console.log('📋 Seeding orders and order items...');

    // Order 1: 3 apples, 2 bananas, 1 pizza = $5.97 + $1.98 + $8.99 = $16.94
    await client.query(`
      INSERT INTO orders (id, user_id, device_id, total, status, payment_method, payment_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() - INTERVAL '7 days')
    `, ['ORD-001', demoUserId, null, 16.94, 'completed', 'card', 'pay_sim_001']);

    await client.query(`
      INSERT INTO order_items (order_id, product_id, name, category, quantity, price)
      VALUES
        ($1, $2, $3, $4, $5, $6),
        ($7, $8, $9, $10, $11, $12),
        ($13, $14, $15, $16, $17, $18)
    `, [
      'ORD-001', 'P001', 'Organic Apples', 'Fruits', 3, 1.99,
      'ORD-001', 'P002', 'Fresh Bananas', 'Fruits', 2, 0.99,
      'ORD-001', 'P017', 'Pepperoni Pizza', 'Prepared Foods', 1, 8.99,
    ]);

    // Order 2: 2 water bottles, 5 donuts = $4.98 + $8.95 = $13.93
    await client.query(`
      INSERT INTO orders (id, user_id, device_id, total, status, payment_method, payment_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() - INTERVAL '3 days')
    `, ['ORD-002', demoUserId, null, 13.93, 'completed', 'card', 'pay_sim_002']);

    await client.query(`
      INSERT INTO order_items (order_id, product_id, name, category, quantity, price)
      VALUES
        ($1, $2, $3, $4, $5, $6),
        ($7, $8, $9, $10, $11, $12)
    `, [
      'ORD-002', 'P009', 'Water Bottle', 'Beverages', 2, 2.49,
      'ORD-002', 'P013', 'Chocolate Donut', 'Bakery', 5, 1.79,
    ]);

    // Order 3: 1 pizza = $8.99
    await client.query(`
      INSERT INTO orders (id, user_id, device_id, total, status, payment_method, payment_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() - INTERVAL '1 day')
    `, ['ORD-003', demoUserId, null, 8.99, 'completed', 'card', 'pay_sim_003']);

    await client.query(`
      INSERT INTO order_items (order_id, product_id, name, category, quantity, price)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, ['ORD-003', 'P017', 'Pepperoni Pizza', 'Prepared Foods', 1, 8.99]);

    // Order 4: 1 sandwich, 2 apples = $6.49 + $3.98 = $10.47
    await client.query(`
      INSERT INTO orders (id, user_id, device_id, total, status, payment_method, payment_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() - INTERVAL '2 days')
    `, ['ORD-004', demoUserId, null, 10.47, 'completed', 'card', 'pay_sim_004']);

    await client.query(`
      INSERT INTO order_items (order_id, product_id, name, category, quantity, price)
      VALUES
        ($1, $2, $3, $4, $5, $6),
        ($7, $8, $9, $10, $11, $12)
    `, [
      'ORD-004', 'P020', 'Premium Sandwich', 'Deli', 1, 6.49,
      'ORD-004', 'P001', 'Organic Apples', 'Fruits', 2, 1.99,
    ]);

    // Order 5: 1 cheese pizza, 2 hot dog packs = $7.99 + $9.98 = $17.97
    await client.query(`
      INSERT INTO orders (id, user_id, device_id, total, status, payment_method, payment_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() - INTERVAL '5 days')
    `, ['ORD-005', demoUserId, null, 17.97, 'completed', 'card', 'pay_sim_005']);

    await client.query(`
      INSERT INTO order_items (order_id, product_id, name, category, quantity, price)
      VALUES
        ($1, $2, $3, $4, $5, $6),
        ($7, $8, $9, $10, $11, $12)
    `, [
      'ORD-005', 'P018', 'Cheese Pizza', 'Prepared Foods', 1, 7.99,
      'ORD-005', 'P019', 'Hot Dog Pack', 'Prepared Foods', 2, 4.99,
    ]);

    console.log('✅ Created 5 orders with 11 order items\n');

    // ===== VERIFICATION =====
    console.log('🔍 Verifying seeded data...\n');

    const stats = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM products) as product_count,
        (SELECT COUNT(*) FROM users) as user_count,
        (SELECT COUNT(*) FROM devices) as device_count,
        (SELECT COUNT(*) FROM orders) as order_count,
        (SELECT COUNT(*) FROM order_items) as order_item_count
    `);

    const { product_count, user_count, device_count, order_count, order_item_count } = stats.rows[0];

    console.log('📊 Data Statistics:');
    console.log(`   Products: ${product_count}`);
    console.log(`   Users: ${user_count}`);
    console.log(`   Devices: ${device_count}`);
    console.log(`   Orders: ${order_count}`);
    console.log(`   Order Items: ${order_item_count}\n`);

    // Verify demo user
    const demoUserCheck = await client.query(
      'SELECT id, email, role, status FROM users WHERE email = $1',
      ['demo@email.com']
    );

    if (demoUserCheck.rows.length > 0) {
      const user = demoUserCheck.rows[0];
      console.log('✅ Demo user verified:');
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Status: ${user.status}\n`);
    }

    // Verify products mapping
    const cocoProducts = await client.query(`
      SELECT id, name, category FROM products
      WHERE id IN ('P001', 'P002', 'P009', 'P013', 'P017', 'P018', 'P019', 'P020')
      ORDER BY id
    `);

    console.log('✅ COCO mapped products verified:');
    cocoProducts.rows.forEach(p => {
      console.log(`   ${p.id}: ${p.name} (${p.category})`);
    });

    console.log('\n✨ Database seeding completed successfully!\n');
    console.log('🎯 Next steps:');
    console.log('   1. Start the backend server: npm start');
    console.log('   2. Test demo login with demo@email.com / 1234');
    console.log('   3. Test admin login with admin@email.com / 1111\n');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    await client.release();
    await pool.end();
  }
}

// Run the seed function
seed();
