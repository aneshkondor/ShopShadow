const logger = require('../../../shared/logger');

/**
 * Initialize cleanup jobs for the application
 * @param {Pool} pool - PostgreSQL connection pool
 */
function initializeCleanupJobs(pool) {
  // Run cleanup job immediately on startup
  runDeclinedItemsCleanup(pool);

  // Run cleanup every 24 hours (86400000 milliseconds)
  setInterval(() => {
    runDeclinedItemsCleanup(pool);
  }, 24 * 60 * 60 * 1000);
}

/**
 * Delete declined items that are older than 24 hours
 * Logs deletion for ML model feedback
 * @param {Pool} pool - PostgreSQL connection pool
 */
async function runDeclinedItemsCleanup(pool) {
  try {
    // Query declined items older than 24 hours
    const selectQuery = await pool.query(
      `SELECT id, user_id, product_id, confidence, timestamp
       FROM pending_items
       WHERE status = 'declined'
       AND timestamp < NOW() - INTERVAL '24 hours'`
    );

    const declinedItems = selectQuery.rows;

    if (declinedItems.length === 0) {
      logger.debug('No declined items to clean up');
      return;
    }

    // Log declined items for ML model feedback
    logger.info('Processing declined items for cleanup', {
      count: declinedItems.length,
      timestamp: new Date().toISOString()
    });

    // Delete declined items older than 24 hours
    const deleteQuery = await pool.query(
      `DELETE FROM pending_items
       WHERE status = 'declined'
       AND timestamp < NOW() - INTERVAL '24 hours'
       RETURNING id`
    );

    const deletedCount = deleteQuery.rows.length;

    logger.info('Cleanup job completed', {
      deletedCount,
      declinedItems: declinedItems.map(item => ({
        id: item.id,
        userId: item.user_id,
        productId: item.product_id,
        confidence: item.confidence,
        declinedAt: item.timestamp
      }))
    });
  } catch (error) {
    logger.error('Error running declined items cleanup', {
      error: error.message,
      stack: error.stack
    });
  }
}

module.exports = {
  initializeCleanupJobs,
  runDeclinedItemsCleanup
};
