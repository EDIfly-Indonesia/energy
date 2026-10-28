/**
 * Application Constants
 * Centralized magic numbers and hardcoded values
 */

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
};

// Response Status Messages
const RESPONSE_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
  FAIL: 'fail'
};

// OCPP Protocol
const OCPP = {
  VERSION_16: 'ocpp1.6',
  CALL: 2,
  CALL_RESULT: 3,
  CALL_ERROR: 4,
  
  // Message Types
  MESSAGE_TYPE: {
    BOOT_NOTIFICATION: 'BootNotification',
    AUTHORIZE: 'Authorize',
    HEARTBEAT: 'Heartbeat',
    STATUS_NOTIFICATION: 'StatusNotification',
    METER_VALUES: 'MeterValues',
    START_TRANSACTION: 'StartTransaction',
    STOP_TRANSACTION: 'StopTransaction'
  },
  
  // Registration Status
  REGISTRATION_STATUS: {
    ACCEPTED: 'Accepted',
    PENDING: 'Pending',
    REJECTED: 'Rejected'
  },
  
  // Authorization Status
  AUTHORIZATION_STATUS: {
    ACCEPTED: 'Accepted',
    BLOCKED: 'Blocked',
    EXPIRED: 'Expired',
    INVALID: 'Invalid',
    CONCURRENT_TX: 'ConcurrentTx'
  },
  
  // Charge Point Status
  CHARGE_POINT_STATUS: {
    AVAILABLE: 'Available',
    PREPARING: 'Preparing',
    CHARGING: 'Charging',
    SUSPENDED_EVSE: 'SuspendedEVSE',
    SUSPENDED_EV: 'SuspendedEV',
    FINISHING: 'Finishing',
    RESERVED: 'Reserved',
    UNAVAILABLE: 'Unavailable',
    FAULTED: 'Faulted'
  },
  
  // Reason Codes
  REASON: {
    EMERGENCY_STOP: 'EmergencyStop',
    EV_DISCONNECTED: 'EVDisconnected',
    HARD_RESET: 'HardReset',
    LOCAL: 'Local',
    OTHER: 'Other',
    POWER_LOSS: 'PowerLoss',
    REBOOT: 'Reboot',
    REMOTE: 'Remote',
    SOFT_RESET: 'SoftReset',
    UNLOCK_COMMAND: 'UnlockCommand',
    DE_AUTHORIZED: 'DeAuthorized'
  }
};

// Charging Transaction Status
const TRANSACTION_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  FAILED: 'failed',
  PENDING: 'pending',
  REFUNDED: 'refunded'
};

// Payment Status
const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  EXPIRED: 'expired'
};

// Wallet Transaction Types
const WALLET_TRANSACTION_TYPE = {
  TOPUP: 'topup',
  PAYMENT: 'payment',
  REFUND: 'refund',
  ADJUSTMENT: 'adjustment'
};

// Time Constants (in milliseconds)
const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  
  // Heartbeat intervals
  HEARTBEAT_INTERVAL: 300, // 5 minutes in seconds
  
  // Job intervals
  REFUND_JOB_INTERVAL: 5 * 60 * 1000, // 5 minutes
  CHARGING_MONITOR_INTERVAL: 60 * 1000, // 1 minute
  
  // Timeouts
  CONNECTION_TIMEOUT: 30 * 1000, // 30 seconds
  CHARGING_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  
  // Session expiry
  TOKEN_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
  PAYMENT_EXPIRY: 15 * 60 * 1000 // 15 minutes
};

// Energy Units
const ENERGY_UNITS = {
  WH: 'Wh',
  KWH: 'kWh',
  WH_TO_KWH: 1000
};

// Notification Types
const NOTIFICATION_TYPE = {
  FCM: 'fcm',
  EMAIL: 'email',
  WHATSAPP: 'whatsapp',
  SMS: 'sms'
};

// User Roles
const USER_ROLE = {
  ADMIN: 'admin',
  USER: 'user',
  OPERATOR: 'operator',
  GUEST: 'guest'
};

// Charge Box Types
const CHARGEBOX_TYPE = {
  AC: 'AC',
  DC: 'DC',
  HYBRID: 'Hybrid'
};

// Connector Status
const CONNECTOR_STATUS = {
  AVAILABLE: 'Available',
  OCCUPIED: 'Occupied',
  RESERVED: 'Reserved',
  UNAVAILABLE: 'Unavailable',
  FAULTED: 'Faulted'
};

// Price Configuration
const PRICING = {
  DEFAULT_RATE: 2500, // Rp per kWh
  ADMIN_FEE: 500, // Rp
  VAT_RATE: 0.11, // 11%
  MINIMUM_CHARGE: 1000 // Rp
};

// Pagination
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100
};

// File Upload
const UPLOAD = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/jpg'],
  UPLOAD_PATH: './images/'
};

// Database
const DATABASE = {
  MAX_CONNECTIONS: 10,
  CONNECTION_TIMEOUT: 60000, // 60 seconds
  QUERY_TIMEOUT: 30000 // 30 seconds
};

// TCP Server
const TCP_SERVER = {
  PORT: 9000,
  HOST: '0.0.0.0',
  ENCODING: 'utf8'
};

// HTTP Server
const HTTP_SERVER = {
  PORT: 8080,
  CORS_ORIGIN: '*'
};

// OCPP WebSocket Server
const OCPP_SERVER = {
  PORT: 8180,
  PROTOCOLS: ['ocpp1.6']
};

// API Endpoints
const API_ENDPOINTS = {
  DOKU_DEV: 'https://api-sandbox.doku.com',
  DOKU_PROD: 'https://api.doku.com',
  BMS_DEV: 'https://staging.doku.com/DokuEnterprise/v2/',
  BMS_PROD: 'https://solution.doku.com/DokuEnterprise/v2/'
};

// Regex Patterns
const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^(\+62|62|0)[0-9]{9,12}$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/
};

// Error Messages
const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized access',
  INVALID_TOKEN: 'Invalid or expired token',
  INVALID_CREDENTIALS: 'Invalid credentials',
  USER_NOT_FOUND: 'User not found',
  CHARGEBOX_NOT_FOUND: 'Charge box not found',
  INSUFFICIENT_BALANCE: 'Insufficient wallet balance',
  TRANSACTION_FAILED: 'Transaction failed',
  INVALID_REQUEST: 'Invalid request parameters',
  SERVER_ERROR: 'Internal server error',
  DATABASE_ERROR: 'Database error occurred'
};

// Success Messages
const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  REGISTRATION_SUCCESS: 'Registration successful',
  UPDATE_SUCCESS: 'Update successful',
  DELETE_SUCCESS: 'Delete successful',
  TRANSACTION_SUCCESS: 'Transaction completed successfully',
  PAYMENT_SUCCESS: 'Payment successful',
  REFUND_SUCCESS: 'Refund processed successfully'
};

module.exports = {
  HTTP_STATUS,
  RESPONSE_STATUS,
  OCPP,
  TRANSACTION_STATUS,
  PAYMENT_STATUS,
  WALLET_TRANSACTION_TYPE,
  TIME,
  ENERGY_UNITS,
  NOTIFICATION_TYPE,
  USER_ROLE,
  CHARGEBOX_TYPE,
  CONNECTOR_STATUS,
  PRICING,
  PAGINATION,
  UPLOAD,
  DATABASE,
  TCP_SERVER,
  HTTP_SERVER,
  OCPP_SERVER,
  API_ENDPOINTS,
  REGEX,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
};