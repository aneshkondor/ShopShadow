/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  // Enable UUID generation
  pgm.createExtension('pgcrypto', { ifNotExists: true });

  // ============================================================================
  // TABLE: users
  // ============================================================================
  pgm.createTable('users', {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    name: { type: 'VARCHAR(255)', notNull: true },
    email: { type: 'VARCHAR(255)', unique: true, notNull: true },
    password_hash: { type: 'VARCHAR(255)', notNull: true },
    role: {
      type: 'VARCHAR(20)',
      notNull: true,
      default: 'user',
      check: "role IN ('user', 'admin')",
    },
    status: {
      type: 'VARCHAR(20)',
      notNull: true,
      default: 'active',
      check: "status IN ('active', 'inactive', 'suspended')",
    },
    email_verified: { type: 'BOOLEAN', default: false },
    last_login: { type: 'TIMESTAMP' },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.createIndex('users', 'email');
  pgm.createIndex('users', 'role');
  pgm.createIndex('users', 'status');

  // ============================================================================
  // TABLE: products
  // ============================================================================
  pgm.createTable('products', {
    id: { type: 'VARCHAR(20)', primaryKey: true },
    name: { type: 'VARCHAR(255)', notNull: true },
    category: { type: 'VARCHAR(100)', notNull: true },
    description: { type: 'TEXT' },
    price: { type: 'DECIMAL(10,2)', notNull: true, check: 'price >= 0' },
    stock: { type: 'INTEGER', notNull: true, default: 0, check: 'stock >= 0' },
    in_stock: {
      type: 'BOOLEAN',
      generated: 'ALWAYS',
      generatedAs: 'stock > 0',
      generatedType: 'STORED',
    },
    barcode: { type: 'VARCHAR(50)', unique: true },
    image_url: { type: 'TEXT' },
    weight: { type: 'DECIMAL(10,2)' },
    nutrition_facts: { type: 'JSONB' },
    allergens: { type: 'TEXT[]' },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.createIndex('products', 'category');
  pgm.createIndex('products', 'name');
  pgm.createIndex('products', 'barcode');
  pgm.createIndex('products', 'in_stock');

  // ============================================================================
  // TABLE: devices
  // ============================================================================
  pgm.createTable('devices', {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    code: { type: 'VARCHAR(4)', unique: true, notNull: true },
    name: { type: 'VARCHAR(255)' },
    status: {
      type: 'VARCHAR(20)',
      notNull: true,
      default: 'disconnected',
      check: "status IN ('disconnected', 'connected', 'offline')",
    },
    battery_level: {
      type: 'INTEGER',
      check: 'battery_level >= 0 AND battery_level <= 100',
    },
    firmware_version: { type: 'VARCHAR(20)' },
    connected_user_id: {
      type: 'UUID',
      references: 'users(id)',
      onDelete: 'SET NULL',
    },
    last_heartbeat: { type: 'TIMESTAMP' },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.createIndex('devices', 'code');
  pgm.createIndex('devices', 'connected_user_id');
  pgm.createIndex('devices', 'status');
  pgm.createIndex('devices', 'last_heartbeat');

  // ============================================================================
  // TABLE: orders
  // ============================================================================
  pgm.createTable('orders', {
    id: { type: 'VARCHAR(50)', primaryKey: true },
    user_id: {
      type: 'UUID',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    device_id: {
      type: 'UUID',
      references: 'devices(id)',
      onDelete: 'SET NULL',
    },
    total: { type: 'DECIMAL(10,2)', notNull: true, check: 'total >= 0' },
    status: {
      type: 'VARCHAR(20)',
      notNull: true,
      default: 'completed',
      check: "status IN ('pending', 'completed', 'cancelled', 'refunded')",
    },
    payment_method: { type: 'VARCHAR(50)' },
    payment_id: { type: 'VARCHAR(255)' },
    basket_photo_url: { type: 'TEXT' },
    receipt_url: { type: 'TEXT' },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.createIndex('orders', 'user_id');
  pgm.createIndex('orders', 'device_id');
  pgm.createIndex('orders', 'created_at', { direction: 'DESC' });
  pgm.createIndex('orders', 'status');
  pgm.createIndex('orders', ['user_id', 'created_at'], { direction: 'DESC' });

  // ============================================================================
  // TABLE: order_items
  // ============================================================================
  pgm.createTable('order_items', {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    order_id: {
      type: 'VARCHAR(50)',
      notNull: true,
      references: 'orders(id)',
      onDelete: 'CASCADE',
    },
    product_id: {
      type: 'VARCHAR(20)',
      references: 'products(id)',
      onDelete: 'SET NULL',
    },
    name: { type: 'VARCHAR(255)', notNull: true },
    category: { type: 'VARCHAR(100)' },
    quantity: { type: 'INTEGER', notNull: true, check: 'quantity > 0' },
    price: { type: 'DECIMAL(10,2)', notNull: true, check: 'price >= 0' },
    subtotal: {
      type: 'DECIMAL(10,2)',
      generated: 'ALWAYS',
      generatedAs: 'quantity * price',
      generatedType: 'STORED',
    },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.createIndex('order_items', 'order_id');
  pgm.createIndex('order_items', 'product_id');

  // ============================================================================
  // TABLE: sessions
  // ============================================================================
  pgm.createTable('sessions', {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'UUID',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    token: { type: 'TEXT', notNull: true },
    refresh_token: { type: 'TEXT' },
    expires_at: { type: 'TIMESTAMP', notNull: true },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.createIndex('sessions', 'user_id');
  pgm.createIndex('sessions', 'token');
  pgm.createIndex('sessions', 'expires_at');
  pgm.createIndex('sessions', 'refresh_token');

  // ============================================================================
  // TABLE: basket_items
  // ============================================================================
  pgm.createTable('basket_items', {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'UUID',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    device_id: {
      type: 'UUID',
      notNull: true,
      references: 'devices(id)',
      onDelete: 'CASCADE',
    },
    product_id: {
      type: 'VARCHAR(20)',
      notNull: true,
      references: 'products(id)',
      onDelete: 'CASCADE',
    },
    quantity: { type: 'INTEGER', notNull: true, check: 'quantity > 0' },
    confidence: { type: 'DECIMAL(4,2)', check: 'confidence >= 0 AND confidence <= 1' },
    added_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.createIndex('basket_items', ['user_id', 'device_id']);
  pgm.createIndex('basket_items', 'user_id');
  pgm.createIndex('basket_items', 'device_id');
  pgm.createIndex('basket_items', 'product_id');
  pgm.createIndex('basket_items', 'added_at');
  pgm.createConstraint('basket_items', 'basket_items_unique_session_product', {
    unique: ['user_id', 'device_id', 'product_id'],
  });

  // ============================================================================
  // TABLE: pending_items
  // ============================================================================
  pgm.createTable('pending_items', {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'UUID',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    device_id: {
      type: 'UUID',
      notNull: true,
      references: 'devices(id)',
      onDelete: 'CASCADE',
    },
    product_id: {
      type: 'VARCHAR(20)',
      references: 'products(id)',
      onDelete: 'SET NULL',
    },
    name: { type: 'VARCHAR(255)', notNull: true },
    quantity: { type: 'INTEGER', notNull: true, check: 'quantity > 0' },
    confidence: {
      type: 'DECIMAL(4,2)',
      notNull: true,
      check: 'confidence >= 0 AND confidence <= 1',
    },
    status: {
      type: 'VARCHAR(20)',
      notNull: true,
      default: 'pending',
      check: "status IN ('pending', 'approved', 'declined')",
    },
    timestamp: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.createIndex('pending_items', ['user_id', 'status']);
  pgm.createIndex('pending_items', ['user_id', 'device_id']);
  pgm.createIndex('pending_items', 'timestamp');
  pgm.createIndex('pending_items', 'status');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  // Drop tables in reverse order to handle foreign key dependencies
  pgm.dropTable('pending_items', { cascade: true });
  pgm.dropTable('basket_items', { cascade: true });
  pgm.dropTable('sessions', { cascade: true });
  pgm.dropTable('order_items', { cascade: true });
  pgm.dropTable('orders', { cascade: true });
  pgm.dropTable('devices', { cascade: true });
  pgm.dropTable('products', { cascade: true });
  pgm.dropTable('users', { cascade: true });
  pgm.dropExtension('pgcrypto', { ifExists: true });
};
