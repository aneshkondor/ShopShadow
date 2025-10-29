const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

const LOG_DIR = process.env.LOG_FILE_PATH || './logs';

// Create logs directory if it doesn't exist
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Per-run log file with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '-' +
                 new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
const logFileName = `shopshadow-${timestamp}.log`;

// Custom log format
const logFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level.toUpperCase()}] ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

// Create Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    // Console transport with colors
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      )
    }),
    // File transport (current run)
    new winston.transports.File({
      filename: path.join(LOG_DIR, logFileName),
      maxsize: 10485760, // 10MB
    }),
    // Rotating file transport (daily rotation)
    new DailyRotateFile({
      dirname: LOG_DIR,
      filename: 'shopshadow-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d', // Keep 14 days of logs
    })
  ]
});

// Export logger methods
module.exports = {
  debug: (message, meta) => logger.debug(message, meta),
  info: (message, meta) => logger.info(message, meta),
  warn: (message, meta) => logger.warn(message, meta),
  error: (message, meta) => logger.error(message, meta),
  logger // Export raw logger for advanced usage
};
