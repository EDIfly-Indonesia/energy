function errorHandler(error, request, reply) {
  const status = error.statusCode || error.status || 500;
  const message = error.message || 'Internal Server Error';
  const isDevelopment = process.env.NODE_ENV === 'development';

  request.log.error({
    error: message,
    stack: isDevelopment ? error.stack : undefined,
    path: request.url,
    method: request.method
  });

  reply.status(status).send({
    status: 'error',
    message: message,
    ...(isDevelopment && { 
      stack: error.stack,
      details: error.details
    })
  });
}

class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  errorHandler,
  AppError
};
