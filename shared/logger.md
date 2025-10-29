# ShopShadow Logging Infrastructure

Unified logging for backend (Node.js) and Flask detection service (Python).

## Features

- **Per-run log files**: Each service start creates `shopshadow-YYYY-MM-DD-HH-mm-ss.log`
- **Console + file output**: Logs written to both console (development) and files (debugging)
- **Colored console**: Color-coded log levels for easy reading
- **Automatic rotation**: Daily rotation with 14-day retention, 20MB max file size
- **Consistent format**: Identical log format across Node.js and Python

## Usage

### Node.js (Backend)

```javascript
const logger = require('../shared/logger');

// Log levels
logger.debug('Debug message', { detail: 'value' });
logger.info('User logged in', { userId: '123' });
logger.warn('Slow query detected', { duration: '5s' });
logger.error('Database error', { error: err.message, stack: err.stack });

// Example: Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    query: req.query,
    body: req.body
  });
  next();
});
```

### Python (Flask Detection)

```python
import sys
sys.path.append('../')  # Access shared module
from shared.logger import debug, info, warn, error

# Log levels
debug('Debug message', detail='value')
info('Detection started', camera_index=0)
warn('Low confidence detection', confidence=0.65, product='apple')
error('YOLO inference failed', error=str(e))

# Example: Detection event logging
info(f'Detected {len(detections)} items',
     high_conf=high_count,
     low_conf=low_count)
```

## Log Levels

- **DEBUG**: Detailed diagnostic information (YOLO inference times, query details)
- **INFO**: General informational messages (user actions, detection events, API calls)
- **WARN**: Warning messages (slow queries, low confidence detections, retries)
- **ERROR**: Error messages (exceptions, failed API calls, database errors)

## Log File Location

Logs are stored in `LOG_FILE_PATH` directory (configured in .env):
- Default: `./logs/`
- Per-run files: `shopshadow-2025-01-15-14-30-00.log`
- Rotated files: `shopshadow-2025-01-15.log` (daily)

## Log Rotation

- **Max file size**: 20MB (daily rotation), 10MB (per-run)
- **Retention**: 14 days
- **Automatic cleanup**: Old logs deleted automatically

## Environment Variables

- `LOG_FILE_PATH`: Directory for log files (default: `./logs`)
- `LOG_LEVEL`: Minimum log level (default: `debug`)

## Integration Examples

### Backend Server (Task 2.1)
```javascript
const logger = require('../shared/logger');

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

app.use((err, req, res, next) => {
  logger.error('Server error', {
    error: err.message,
    stack: err.stack,
    path: req.path
  });
  res.status(500).json({ error: 'Internal server error' });
});
```

### Flask Detection Loop (Task 3.6)
```python
from shared.logger import info, error

info('Detection service started', camera_index=CAMERA_INDEX)

while True:
    try:
        frame = capture_frame()
        detections = process_frame(frame)
        info(f'Detected {len(detections)} items', items=[d['class_name'] for d in detections])
    except Exception as e:
        error('Detection loop error', error=str(e))
```

## Troubleshooting

**Log directory not created:**
- Logger automatically creates LOG_FILE_PATH directory
- Check file permissions if error occurs

**Logs not rotating:**
- Check disk space
- Verify winston-daily-rotate-file installed (Node.js)
- Verify RotatingFileHandler maxBytes setting (Python)

**No console output:**
- Verify LOG_LEVEL environment variable
- Check console handler is added to logger
