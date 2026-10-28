/**
 * Request validation middleware
 * Validates required fields in request body
 */

/**
 * Generic validator for required fields
 */
const validateRequired = (fields) => {
  return (req, res, next) => {
    const missing = [];
    
    for (const field of fields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missing.push(field);
      }
    }
    
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Field berikut wajib diisi: ${missing.join(', ')}`
      });
    }
    
    next();
  };
};

/**
 * Validate email format
 */
const validateEmail = (req, res, next) => {
  const email = req.body.email;
  
  if (!email) {
    return next();
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Format email tidak valid'
    });
  }
  
  next();
};

/**
 * Validate phone number format (Indonesian)
 */
const validatePhone = (req, res, next) => {
  const phone = req.body.no_hp || req.body.phone;
  
  if (!phone) {
    return next();
  }
  
  const phoneRegex = /^(\+62|62|0)[0-9]{9,12}$/;
  
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({
      success: false,
      message: 'Format nomor telepon tidak valid'
    });
  }
  
  next();
};

/**
 * Validate numeric value
 */
const validateNumeric = (fields) => {
  return (req, res, next) => {
    const invalid = [];
    
    for (const field of fields) {
      const value = req.body[field];
      if (value !== undefined && isNaN(value)) {
        invalid.push(field);
      }
    }
    
    if (invalid.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Field berikut harus berupa angka: ${invalid.join(', ')}`
      });
    }
    
    next();
  };
};

/**
 * Validate positive number
 */
const validatePositive = (fields) => {
  return (req, res, next) => {
    const invalid = [];
    
    for (const field of fields) {
      const value = req.body[field];
      if (value !== undefined && (isNaN(value) || Number(value) <= 0)) {
        invalid.push(field);
      }
    }
    
    if (invalid.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Field berikut harus berupa angka positif: ${invalid.join(', ')}`
      });
    }
    
    next();
  };
};

/**
 * Sanitize input - remove dangerous characters
 */
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        // Remove potential SQL injection characters
        obj[key] = obj[key].replace(/[<>'"]/g, '');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };
  
  if (req.body && typeof req.body === 'object') {
    sanitize(req.body);
  }
  
  next();
};

module.exports = {
  validateRequired,
  validateEmail,
  validatePhone,
  validateNumeric,
  validatePositive,
  sanitizeInput
};