const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Verify JWT token and attach user data to request
 */
const verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.body.token || req.query.token;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak ditemukan'
      });
    }

    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    
    // Verify token integrity with HMAC-SHA256
    const expectedKey = crypto.createHmac('sha256', process.env.PENGACAK).update(decoded.data.email).digest('hex');
    
    if (decoded.key !== expectedKey) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak valid'
      });
    }
    
    // Attach user data to request
    req.user = decoded.data;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token sudah kadaluarsa'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Token tidak valid'
    });
  }
};

/**
 * Verify API key header
 */
const verifyApiKey = (req, res, next) => {
  const keyHeader = req.headers['key-header'];
  
  if (keyHeader !== process.env.KEY_HEADER) {
    return res.status(401).json({
      success: false,
      message: 'Key header tidak valid'
    });
  }
  
  next();
};

/**
 * Combined middleware: verify API key and token
 */
const verifyKeyAndToken = (req, res, next) => {
  verifyApiKey(req, res, (err) => {
    if (err) return next(err);
    verifyToken(req, res, next);
  });
};

module.exports = {
  verifyToken,
  verifyApiKey,
  verifyKeyAndToken
};