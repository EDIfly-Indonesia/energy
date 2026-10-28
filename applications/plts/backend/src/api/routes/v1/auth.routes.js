const authController = require('../../controllers/auth.controller');
const { verifyToken, hasPermission } = require('../../middlewares/auth.middleware');
const { envelope, crudErrors } = require('../../schemas/common');

const loginBody = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: { type: 'string', format: 'email' },
    password: { type: 'string' },
  },
};

const loginResponse = {
  type: 'object',
  description: 'Successful response',
  additionalProperties: true,
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    data: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        expiresIn: { type: 'integer' },
        user: { type: 'object', additionalProperties: true },
      },
    },
    meta: { type: ['object', 'null'] },
    errors: { type: ['object', 'null'] },
  },
};

async function authRoutes(fastify, options) {
  // Public routes (tanpa authentication)
  fastify.post('/login', {
    schema: {
      tags: ['Auth'],
      summary: 'Login',
      body: loginBody,
      response: { 200: loginResponse, 400: crudErrors[400], 401: crudErrors[401], 500: crudErrors[500] },
    },
  }, authController.login);

  fastify.post('/forgot-password', {
    schema: {
      tags: ['Auth'],
      summary: 'Lupa password (buat reset token)',
      body: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } },
      response: { 200: envelope({ type: 'null' }), 400: crudErrors[400], 500: crudErrors[500] },
    },
  }, authController.forgotPassword);

  fastify.post('/refresh-token', {
    schema: {
      tags: ['Auth'],
      summary: 'Refresh access token',
      body: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } },
      response: { 200: envelope({ type: 'object' }), 400: crudErrors[400], 401: crudErrors[401], 500: crudErrors[500] },
    },
  }, authController.refreshToken);

  // Protected routes (memerlukan authentication)
  fastify.post('/logout', {
    preHandler: [verifyToken],
    schema: { tags: ['Auth'], summary: 'Logout', security: [{ bearerAuth: [] }], response: { 200: envelope({ type: 'null' }), 401: crudErrors[401], 500: crudErrors[500] } },
  }, authController.logout);

  fastify.get('/verify', {
    preHandler: [verifyToken],
    schema: { tags: ['Auth'], summary: 'Verifikasi token', security: [{ bearerAuth: [] }], response: { 200: envelope({ type: 'object' }), 401: crudErrors[401], 500: crudErrors[500] } },
  }, authController.verify);

  fastify.post('/change-password', {
    preHandler: [verifyToken],
    schema: {
      tags: ['Auth'],
      summary: 'Ganti password',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['currentPassword', 'newPassword', 'confirmPassword'],
        properties: {
          currentPassword: { type: 'string' },
          newPassword: { type: 'string', minLength: 8 },
          confirmPassword: { type: 'string' },
        },
      },
      response: { 200: envelope({ type: 'null' }), 400: crudErrors[400], 401: crudErrors[401], 403: crudErrors[403], 404: crudErrors[404], 409: crudErrors[409], 500: crudErrors[500] },
    },
  }, authController.changePassword);
}

module.exports = authRoutes;
