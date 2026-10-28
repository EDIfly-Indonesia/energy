/**
 * Standardized API response helpers
 */

/**
 * Send success response
 */
const success = (res, message = 'Berhasil', data = null, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

/**
 * Send error response
 */
const error = (res, message = 'Terjadi kesalahan', statusCode = 500, error = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error : undefined
  });
};

/**
 * Send created response (201)
 */
const created = (res, message = 'Data berhasil dibuat', data = null) => {
  return success(res, message, data, 201);
};

/**
 * Send not found response (404)
 */
const notFound = (res, message = 'Data tidak ditemukan') => {
  return res.status(404).json({
    success: false,
    message
  });
};

/**
 * Send unauthorized response (401)
 */
const unauthorized = (res, message = 'Tidak memiliki akses') => {
  return res.status(401).json({
    success: false,
    message
  });
};

/**
 * Send forbidden response (403)
 */
const forbidden = (res, message = 'Akses ditolak') => {
  return res.status(403).json({
    success: false,
    message
  });
};

/**
 * Send bad request response (400)
 */
const badRequest = (res, message = 'Request tidak valid') => {
  return res.status(400).json({
    success: false,
    message
  });
};

/**
 * Send paginated response
 */
const paginated = (res, data, page, limit, total, message = 'Berhasil') => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
};

module.exports = {
  success,
  error,
  created,
  notFound,
  unauthorized,
  forbidden,
  badRequest,
  paginated
};