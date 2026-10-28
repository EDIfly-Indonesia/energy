/**
 * Logging utilities
 * Centralized logging for better debugging and monitoring
 */

const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Format log message with timestamp
 */
const formatMessage = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message} ${metaStr}\n`;
};

/**
 * Write log to file
 */
const writeToFile = (filename, message) => {
  const logFile = path.join(logsDir, filename);
  fs.appendFileSync(logFile, message);
};

/**
 * Log info message
 */
const info = (message, meta = {}) => {
  const formattedMessage = formatMessage('info', message, meta);
  console.log(formattedMessage);
  writeToFile('app.log', formattedMessage);
};

/**
 * Log error message
 */
const error = (message, meta = {}) => {
  const formattedMessage = formatMessage('error', message, meta);
  console.error(formattedMessage);
  writeToFile('error.log', formattedMessage);
};

/**
 * Log warning message
 */
const warn = (message, meta = {}) => {
  const formattedMessage = formatMessage('warn', message, meta);
  console.warn(formattedMessage);
  writeToFile('app.log', formattedMessage);
};

/**
 * Log debug message (only in development)
 */
const debug = (message, meta = {}) => {
  if (process.env.NODE_ENV === 'development') {
    const formattedMessage = formatMessage('debug', message, meta);
    console.log(formattedMessage);
    writeToFile('debug.log', formattedMessage);
  }
};

/**
 * Log database query (for debugging)
 */
const query = (sql, params = []) => {
  if (process.env.LOG_QUERIES === 'true') {
    debug('SQL Query', { sql, params });
  }
};

/**
 * Log HTTP request
 */
const request = (req) => {
  const message = `${req.method} ${req.originalUrl}`;
  const meta = {
    ip: req.ip,
    userAgent: req.get('user-agent')
  };
  info(message, meta);
};

module.exports = {
  info,
  error,
  warn,
  debug,
  query,
  request
};