/**
 * End-to-end test for low-confidence item approval workflow
 * Test flow:
 * 1. Flask sends confidence 0.65 → pending_items
 * 2. Frontend retrieves pending item
 * 3. User approves with quantity 2 → basket_items
 * 4. Verify basket updated correctly
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const API_URL = process.env.API_URL || 'http://localhost:3001';

// Test data
const testData = {
  userId: null,
  deviceId: null,
  productId: 'TEST001',
  name: 'Test Product',
  quantity: 1,
  confidence: 0.65,
  pendingItemId: null,
  token: null
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function setupTestData() {
  log('\n=== Setting Up Test Data ===', 'blue');

  try {
    // Create test user
    const userQuery = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, status)
       VALUES ('Test User', 'test@example.com', 'hashed_password_123', 'user', 'active')
       ON CONFLICT (email) DO UPDATE SET name = 'Test User' RETURNING id`
    );
    testData.userId = userQuery.rows[0].id;
    log(`✓ User created/retrieved: ${testData.userId}`, 'green');

    // Create test device
    const deviceQuery = await pool.query(
      `INSERT INTO devices (code, name, status, connected_user_id)
       VALUES ('TST1', 'Test Device', 'connected', $1)
       ON CONFLICT (code) DO UPDATE SET connected_user_id = $1 RETURNING id`,
      [testData.userId]
    );
    testData.deviceId = deviceQuery.rows[0].id;
    log(`✓ Device created/retrieved: ${testData.deviceId}`, 'green');

    // Create test product
    const productQuery = await pool.query(
      `INSERT INTO products (id, name, category, price, stock)
       VALUES ($1, $2, 'Test', 10.00, 100)
       ON CONFLICT (id) DO UPDATE SET name = $2 RETURNING id`,
      [testData.productId, testData.name]
    );
    log(`✓ Product created/retrieved: ${testData.productId}`, 'green');

    // Generate test JWT token (for testing purposes)
    const jwt = require('jsonwebtoken');
    testData.token = jwt.sign(
      { userId: testData.userId, email: 'test@example.com', role: 'user' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '24h' }
    );
    log(`✓ Test token generated`, 'green');
  } catch (error) {
    log(`✗ Setup failed: ${error.message}`, 'red');
    throw error;
  }
}

async function testPostPendingItems() {
  log('\n=== Test 1: POST /api/basket/pending-items ===', 'blue');
  log('Testing low-confidence detection submission...', 'yellow');

  try {
    const response = await fetch(`${API_URL}/api/basket/pending-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: testData.productId,
        name: testData.name,
        quantity: testData.quantity,
        confidence: testData.confidence,
        deviceId: testData.deviceId
      })
    });

    const data = await response.json();

    if (response.status === 201 && data.success) {
      testData.pendingItemId = data.data.id;
      log(`✓ Pending item created: ${testData.pendingItemId}`, 'green');
      log(`  - Confidence: ${data.data.confidence}`, 'green');
      log(`  - Status: ${data.data.status}`, 'green');
    } else {
      log(`✗ Failed: ${data.error}`, 'red');
      throw new Error(data.error);
    }
  } catch (error) {
    log(`✗ Test failed: ${error.message}`, 'red');
    throw error;
  }
}

async function testRejectHighConfidence() {
  log('\n=== Test 1b: Reject High-Confidence Items ===', 'blue');
  log('Testing that high-confidence items are rejected...', 'yellow');

  try {
    const response = await fetch(`${API_URL}/api/basket/pending-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: 'TEST002',
        name: 'High Confidence Product',
        quantity: 1,
        confidence: 0.95,  // High confidence
        deviceId: testData.deviceId
      })
    });

    const data = await response.json();

    if (response.status === 400 && data.code === 'HIGH_CONFIDENCE') {
      log(`✓ High-confidence item correctly rejected`, 'green');
    } else {
      log(`✗ High-confidence item was not rejected`, 'red');
      throw new Error('Expected HIGH_CONFIDENCE error');
    }
  } catch (error) {
    log(`✗ Test failed: ${error.message}`, 'red');
    throw error;
  }
}

async function testGetPendingItems() {
  log('\n=== Test 2: GET /api/basket/:userId/pending-items ===', 'blue');
  log('Testing pending items retrieval...', 'yellow');

  try {
    const response = await fetch(
      `${API_URL}/api/basket/${testData.userId}/pending-items`,
      {
        headers: {
          'Authorization': `Bearer ${testData.token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    if (response.status === 200 && data.success && data.count > 0) {
      const pendingItem = data.data.find(item => item.id === testData.pendingItemId);
      if (pendingItem) {
        log(`✓ Pending item retrieved`, 'green');
        log(`  - Product: ${pendingItem.name}`, 'green');
        log(`  - Quantity: ${pendingItem.quantity}`, 'green');
        log(`  - Confidence: ${pendingItem.confidence}`, 'green');
      } else {
        log(`✗ Pending item not found in response`, 'red');
        throw new Error('Pending item not found');
      }
    } else {
      log(`✗ Failed: ${data.error}`, 'red');
      throw new Error(data.error);
    }
  } catch (error) {
    log(`✗ Test failed: ${error.message}`, 'red');
    throw error;
  }
}

async function testApprovePendingItem() {
  log('\n=== Test 3: POST /api/basket/pending-items/:itemId/approve ===', 'blue');
  log('Testing pending item approval with quantity adjustment...', 'yellow');

  try {
    const response = await fetch(
      `${API_URL}/api/basket/pending-items/${testData.pendingItemId}/approve`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testData.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quantity: 2  // User adjusts quantity to 2
        })
      }
    );

    const data = await response.json();

    if (response.status === 200 && data.success) {
      log(`✓ Pending item approved`, 'green');
      log(`  - Approved with quantity: ${data.data.basketItem.quantity}`, 'green');
      log(`  - Current basket items: ${data.data.updatedBasket.length}`, 'green');
    } else {
      log(`✗ Failed: ${data.error}`, 'red');
      throw new Error(data.error);
    }
  } catch (error) {
    log(`✗ Test failed: ${error.message}`, 'red');
    throw error;
  }
}

async function testDeclinePendingItem() {
  log('\n=== Test 4: POST /api/basket/pending-items/:itemId/decline ===', 'blue');
  log('Testing pending item decline...', 'yellow');

  try {
    // First create another pending item to decline
    const createResponse = await fetch(`${API_URL}/api/basket/pending-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: 'TEST003',
        name: 'Test Product 3',
        quantity: 1,
        confidence: 0.55,
        deviceId: testData.deviceId
      })
    });

    const createData = await createResponse.json();
    const declineItemId = createData.data.id;

    // Now decline it
    const response = await fetch(
      `${API_URL}/api/basket/pending-items/${declineItemId}/decline`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testData.token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    if (response.status === 200 && data.success && data.data.status === 'declined') {
      log(`✓ Pending item declined`, 'green');
      log(`  - Item ID: ${data.data.declinedItemId}`, 'green');
      log(`  - Status: ${data.data.status}`, 'green');
    } else {
      log(`✗ Failed: ${data.error}`, 'red');
      throw new Error(data.error);
    }
  } catch (error) {
    log(`✗ Test failed: ${error.message}`, 'red');
    throw error;
  }
}

async function verifyBasketUpdated() {
  log('\n=== Test 5: Verify Basket Updated ===', 'blue');
  log('Verifying basket was correctly updated...', 'yellow');

  try {
    const query = await pool.query(
      `SELECT bi.id, bi.product_id, p.name, bi.quantity, bi.confidence
       FROM basket_items bi
       JOIN products p ON bi.product_id = p.id
       WHERE bi.user_id = $1`,
      [testData.userId]
    );

    if (query.rows.length > 0) {
      const basketItem = query.rows.find(item => item.product_id === testData.productId);
      if (basketItem) {
        log(`✓ Basket item verified in database`, 'green');
        log(`  - Product: ${basketItem.name}`, 'green');
        log(`  - Quantity: ${basketItem.quantity}`, 'green');
        log(`  - Confidence: ${basketItem.confidence}`, 'green');
      } else {
        log(`✗ Expected basket item not found`, 'red');
        throw new Error('Basket item not found');
      }
    } else {
      log(`✗ No items in basket`, 'red');
      throw new Error('Basket is empty');
    }
  } catch (error) {
    log(`✗ Test failed: ${error.message}`, 'red');
    throw error;
  }
}

async function cleanup() {
  log('\n=== Cleaning Up ===', 'blue');

  try {
    // Delete test data
    await pool.query('DELETE FROM basket_items WHERE user_id = $1', [testData.userId]);
    await pool.query('DELETE FROM pending_items WHERE user_id = $1', [testData.userId]);
    await pool.query('DELETE FROM devices WHERE id = $1', [testData.deviceId]);
    await pool.query('DELETE FROM users WHERE id = $1', [testData.userId]);

    log('✓ Test data cleaned up', 'green');

    await pool.end();
  } catch (error) {
    log(`✗ Cleanup error: ${error.message}`, 'red');
  }
}

async function runAllTests() {
  try {
    await setupTestData();
    await testPostPendingItems();
    await testRejectHighConfidence();
    await testGetPendingItems();
    await testApprovePendingItem();
    await testDeclinePendingItem();
    await verifyBasketUpdated();

    log('\n=== ALL TESTS PASSED ===', 'green');
    await cleanup();
    process.exit(0);
  } catch (error) {
    log(`\n=== TEST SUITE FAILED ===`, 'red');
    await cleanup();
    process.exit(1);
  }
}

// Run tests
runAllTests();
