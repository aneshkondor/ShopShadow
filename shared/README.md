# ShopShadow Shared Utilities

**Purpose:** Shared utilities and configurations used by both backend (Node.js) and Flask detection service (Python).

## Contents (Planned)

- **logger.js:** Winston-based logger for Node.js backend with per-run log files
- **logger.py:** Python logging module for Flask service with matching format
- **config files:** Shared configuration and constants

## Logging Infrastructure

The shared logger provides unified logging across all ShopShadow services:

### Features
- **Per-run log files:** Timestamp-based filenames (e.g., `shopshadow-2025-01-15-14-30-00.log`)
- **Console + file output:** Logs written to both console (development) and files (debugging)
- **Log rotation:** Automatic rotation with size/age limits (20MB, 14 days)
- **Colored console:** Color-coded log levels (info=green, warn=yellow, error=red)
- **Structured logging:** Consistent format across Node.js and Python services

### Usage

**Node.js (backend):**
```javascript
const logger = require('../shared/logger');
logger.info('User logged in', { userId: '123' });
logger.error('Database connection failed', { error: err.message });
```

**Python (Flask detection):**
```python
from shared.logger import logger
logger.info('Detection started', extra={'camera_index': 0})
logger.error('YOLO inference failed', extra={'error': str(e)})
```

## Directory Structure

```
shared/
├── logger.js               # Node.js Winston logger
├── logger.py               # Python logging module
└── README.md
```

## Design Principles

- **Cross-language consistency:** Same log format for Node.js and Python
- **Easy integration:** Simple import/require, minimal configuration
- **Debugging-focused:** Detailed messages for troubleshooting complex workflows
- **Production-ready:** Log rotation, error handling, performance optimized
