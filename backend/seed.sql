-- ============================================================================
-- ShopShadow Database Seed Data
-- ============================================================================
--
-- This SQL file populates the database with:
-- - 22 products mapped to COCO dataset classes
-- - 2 demo users (demo@email.com, admin@email.com)
-- - 2 sample devices with 4-digit codes
-- - 5 sample orders with 11 order items
--
-- Usage: psql shopshadow < seed.sql
--        OR: psql -U postgres -d shopshadow -f seed.sql
--
-- ============================================================================

-- Disable foreign key checks during seeding if needed
-- SET CONSTRAINTS ALL DEFERRED;

-- ============================================================================
-- USERS SEEDING
-- ============================================================================

INSERT INTO users (name, email, password_hash, role, status, email_verified)
VALUES
  ('Demo User', 'demo@email.com', '$2b$10$C1zd0YG.YfWha/tlwqODeObWItMNIs/vmEInM/j68EUhS39e96DBK', 'user', 'active', true),
  ('Admin User', 'admin@email.com', '$2b$10$1.5lm9DfsZE.1/YQumVShu9hoebaHOwr8Wea0jSekdyKrK9slHjSO', 'admin', 'active', true)
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- PRODUCTS SEEDING
-- ============================================================================
-- Products are mapped to COCO dataset classes that YOLO11s can detect:
-- 46: banana, 47: apple, 48: sandwich, 49: orange, 50: broccoli
-- 51: carrot, 52: hot dog, 53: pizza, 54: donut, 55: cake, 44: bottle

INSERT INTO products (id, name, category, description, price, stock, barcode)
VALUES
  -- Fruits (COCO 46-49)
  ('P001', 'Organic Apples', 'Fruits', 'Fresh organic red apples, 1 lb', 1.99, 150, 'APPLE001'),
  ('P002', 'Fresh Bananas', 'Fruits', 'Yellow bananas, 1 lb bunch', 0.99, 200, 'BANANA001'),
  ('P003', 'Fresh Oranges', 'Fruits', 'Citrus oranges, premium quality', 1.49, 120, 'ORANGE001'),
  ('P004', 'Red Grapes', 'Fruits', 'Sweet red grapes, 1 lb package', 2.49, 80, 'GRAPES001'),

  -- Vegetables (COCO 50-51)
  ('P005', 'Fresh Carrots', 'Vegetables', 'Orange carrots, 2 lb bag', 1.49, 120, 'CARROT001'),
  ('P006', 'Broccoli Crown', 'Vegetables', 'Fresh broccoli, 1 head', 2.29, 90, 'BROC001'),
  ('P007', 'Fresh Lettuce', 'Vegetables', 'Crisp romaine lettuce', 1.79, 100, 'LETTUCE001'),
  ('P008', 'Tomatoes', 'Vegetables', 'Ripe red tomatoes, 1 lb', 2.49, 110, 'TOMATO001'),

  -- Beverages (COCO 44)
  ('P009', 'Water Bottle', 'Beverages', 'Purified water, 16.9 fl oz', 2.49, 100, 'BOTTLE001'),
  ('P010', 'Orange Juice', 'Beverages', 'Fresh orange juice, 64 fl oz', 3.99, 80, 'OJ001'),
  ('P011', 'Apple Juice', 'Beverages', 'Fresh pressed apple juice, 64 fl oz', 3.99, 75, 'AJ001'),
  ('P012', 'Sparkling Water', 'Beverages', 'Carbonated mineral water, 12 pack', 4.99, 60, 'SPARK001'),

  -- Bakery (COCO 54-55)
  ('P013', 'Chocolate Donut', 'Bakery', 'Glazed chocolate donut', 1.79, 60, 'DONUT001'),
  ('P014', 'Strawberry Donut', 'Bakery', 'Strawberry glazed donut', 1.79, 55, 'DONUT002'),
  ('P015', 'Birthday Cake', 'Bakery', 'Vanilla layer cake with buttercream frosting', 15.99, 25, 'CAKE001'),
  ('P016', 'Chocolate Cake', 'Bakery', 'Rich chocolate layer cake', 12.99, 30, 'CAKE002'),

  -- Prepared Foods (COCO 52-53, 48)
  ('P017', 'Pepperoni Pizza', 'Prepared Foods', 'Classic pepperoni pizza, 14 inch', 8.99, 40, 'PIZZA001'),
  ('P018', 'Cheese Pizza', 'Prepared Foods', 'Classic cheese pizza, 14 inch', 7.99, 45, 'PIZZA002'),
  ('P019', 'Hot Dog Pack', 'Prepared Foods', 'Pack of 8 hot dogs with buns', 4.99, 70, 'HOTDOG001'),
  ('P020', 'Premium Sandwich', 'Deli', 'Turkey, bacon and avocado sandwich', 6.49, 35, 'SAND001'),

  -- Pantry items
  ('P021', 'Pasta', 'Pantry', 'Spaghetti pasta, 1 lb box', 1.29, 200, 'PASTA001'),
  ('P022', 'Olive Oil', 'Pantry', 'Extra virgin olive oil, 500 ml', 8.99, 50, 'OIL001')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DEVICES SEEDING
-- ============================================================================

INSERT INTO devices (code, name, status, battery_level, firmware_version)
VALUES
  ('0000', 'Smart Basket #0000', 'disconnected', 100, '1.0.0'),
  ('1234', 'Smart Basket #1234', 'disconnected', 100, '1.0.0')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- ORDERS SEEDING
-- ============================================================================
-- Get demo user ID (stored in variable for reuse)
-- Note: If you need the actual user ID, run this separately to get it first:
-- SELECT id FROM users WHERE email='demo@email.com';

INSERT INTO orders (id, user_id, device_id, total, status, payment_method, payment_id, created_at)
SELECT 'ORD-001', id, NULL, 16.94, 'completed', 'card', 'pay_sim_001', NOW() - INTERVAL '7 days'
FROM users WHERE email='demo@email.com'
ON CONFLICT (id) DO NOTHING;

INSERT INTO orders (id, user_id, device_id, total, status, payment_method, payment_id, created_at)
SELECT 'ORD-002', id, NULL, 13.93, 'completed', 'card', 'pay_sim_002', NOW() - INTERVAL '3 days'
FROM users WHERE email='demo@email.com'
ON CONFLICT (id) DO NOTHING;

INSERT INTO orders (id, user_id, device_id, total, status, payment_method, payment_id, created_at)
SELECT 'ORD-003', id, NULL, 8.99, 'completed', 'card', 'pay_sim_003', NOW() - INTERVAL '1 day'
FROM users WHERE email='demo@email.com'
ON CONFLICT (id) DO NOTHING;

INSERT INTO orders (id, user_id, device_id, total, status, payment_method, payment_id, created_at)
SELECT 'ORD-004', id, NULL, 10.47, 'completed', 'card', 'pay_sim_004', NOW() - INTERVAL '2 days'
FROM users WHERE email='demo@email.com'
ON CONFLICT (id) DO NOTHING;

INSERT INTO orders (id, user_id, device_id, total, status, payment_method, payment_id, created_at)
SELECT 'ORD-005', id, NULL, 17.97, 'completed', 'card', 'pay_sim_005', NOW() - INTERVAL '5 days'
FROM users WHERE email='demo@email.com'
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ORDER ITEMS SEEDING
-- ============================================================================

-- Order 1 items: 3 apples, 2 bananas, 1 pizza
INSERT INTO order_items (order_id, product_id, name, category, quantity, price)
VALUES
  ('ORD-001', 'P001', 'Organic Apples', 'Fruits', 3, 1.99),
  ('ORD-001', 'P002', 'Fresh Bananas', 'Fruits', 2, 0.99),
  ('ORD-001', 'P017', 'Pepperoni Pizza', 'Prepared Foods', 1, 8.99)
ON CONFLICT DO NOTHING;

-- Order 2 items: 2 water bottles, 5 donuts
INSERT INTO order_items (order_id, product_id, name, category, quantity, price)
VALUES
  ('ORD-002', 'P009', 'Water Bottle', 'Beverages', 2, 2.49),
  ('ORD-002', 'P013', 'Chocolate Donut', 'Bakery', 5, 1.79)
ON CONFLICT DO NOTHING;

-- Order 3 items: 1 pizza
INSERT INTO order_items (order_id, product_id, name, category, quantity, price)
VALUES
  ('ORD-003', 'P017', 'Pepperoni Pizza', 'Prepared Foods', 1, 8.99)
ON CONFLICT DO NOTHING;

-- Order 4 items: 1 sandwich, 2 apples
INSERT INTO order_items (order_id, product_id, name, category, quantity, price)
VALUES
  ('ORD-004', 'P020', 'Premium Sandwich', 'Deli', 1, 6.49),
  ('ORD-004', 'P001', 'Organic Apples', 'Fruits', 2, 1.99)
ON CONFLICT DO NOTHING;

-- Order 5 items: 1 cheese pizza, 2 hot dog packs
INSERT INTO order_items (order_id, product_id, name, category, quantity, price)
VALUES
  ('ORD-005', 'P018', 'Cheese Pizza', 'Prepared Foods', 1, 7.99),
  ('ORD-005', 'P019', 'Hot Dog Pack', 'Prepared Foods', 2, 4.99)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries to verify the seed data:

-- SELECT 'Products' as table_name, COUNT(*) as count FROM products
-- UNION ALL
-- SELECT 'Users', COUNT(*) FROM users
-- UNION ALL
-- SELECT 'Devices', COUNT(*) FROM devices
-- UNION ALL
-- SELECT 'Orders', COUNT(*) FROM orders
-- UNION ALL
-- SELECT 'Order Items', COUNT(*) FROM order_items;

-- Test demo login:
-- SELECT id, email, role, status FROM users WHERE email='demo@email.com';

-- View all orders for demo user:
-- SELECT o.id, o.total, o.status, o.created_at FROM orders o
-- JOIN users u ON o.user_id = u.id
-- WHERE u.email='demo@email.com'
-- ORDER BY o.created_at DESC;

-- ============================================================================
-- End of seed.sql
-- ============================================================================
