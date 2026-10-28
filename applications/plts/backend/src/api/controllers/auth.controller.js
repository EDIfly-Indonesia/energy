'use strict';

/**
 * Auth Controller
 *
 * Menangani seluruh proses autentikasi: login, logout, refresh token,
 * verifikasi token, ganti password, dan lupa password.
 *
 * Menggunakan Prisma singleton dari config/database.js agar tidak
 * membuka connection pool baru di setiap request.
 */

const bcrypt    = require('bcrypt');
const jwt       = require('jsonwebtoken');
const { randomBytes } = require('crypto');
const prisma    = require('../../config/database');

// ─── JWT Config ────────────────────────────────────────────────────────────────
// Throw langsung jika env tidak di-set, supaya masalah terdeteksi saat startup,
// bukan saat request pertama kali masuk.
const {
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_ISSUER   = 'plts-platform',
  JWT_AUDIENCE = 'plts-api',
} = process.env;

if (!JWT_SECRET)         throw new Error('ENV JWT_SECRET wajib diisi.');
if (!JWT_REFRESH_SECRET) throw new Error('ENV JWT_REFRESH_SECRET wajib diisi.');

const JWT_ACCESS_EXPIRES_IN  = parseInt(process.env.JWT_ACCESS_EXPIRES_IN,  10) || 3_600;     // 1 jam
const JWT_REFRESH_EXPIRES_IN = parseInt(process.env.JWT_REFRESH_EXPIRES_IN, 10) || 2_592_000; // 30 hari

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Buat JWT access token.
 * Payload minimal — jangan taruh data sensitif di sini.
 */
function generateAccessToken(user) {
  return jwt.sign(
    {
      userId:   user.id,
      email:    user.email,
      name:     user.name,
      roleId:   user.roleId,
      role:     user.role?.name ?? null,
      tenantId: user.tenantId,
    },
    JWT_SECRET,
    { expiresIn: JWT_ACCESS_EXPIRES_IN, issuer: JWT_ISSUER, audience: JWT_AUDIENCE },
  );
}

/**
 * Buat JWT refresh token.
 * Hanya berisi userId — validasi tambahan dilakukan via DB.
 */
function generateRefreshToken(user) {
  return jwt.sign(
    { userId: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN, issuer: JWT_ISSUER, audience: JWT_AUDIENCE },
  );
}

/**
 * Format data user untuk response — pastikan tidak ada field sensitif.
 */
function formatUserResponse(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role ?? null,
    roleId: user.roleId,
    role_name: user.role?.name ?? null,
    role_id: user.roleId,
    tenantId: user.tenantId,
    tenantName: user.tenant?.name ?? null,
    lastLogin: user.lastLogin,
    permissions: user.permissions,
  };
}

// ─── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /auth/login
 */
exports.login = async (request, reply) => {
  const { email, password } = request.body ?? {};

  // Validasi input
  if (!email || !password) {
    return reply.code(400).send({
      success: false,
      message: 'Email dan password wajib diisi.',
      data:    null,
      meta:    null,
      errors: {
        ...((!email)    && { email:    'Email wajib diisi.' }),
        ...((!password) && { password: 'Password wajib diisi.' }),
      },
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where:   { email },
      include: { role: true, tenant: true },
    });

    // Gunakan pesan generik agar tidak bocor informasi tentang keberadaan akun
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return reply.code(401).send({
        success: false,
        message: 'Email atau password salah.',
        data:    null,
        meta:    null,
        errors:  { auth: 'Kredensial yang Anda masukkan tidak valid.' },
      });
    }

    if (!user.isActive) {
      return reply.code(401).send({
        success: false,
        message: 'Akun Anda tidak aktif.',
        data:    null,
        meta:    null,
        errors:  { auth: 'Akun Anda telah dinonaktifkan. Hubungi administrator.' },
      });
    }

    const accessToken  = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    const tokenExpiry  = new Date(Date.now() + JWT_ACCESS_EXPIRES_IN * 1_000);

    // Simpan refresh token dan update last_login dalam satu query
    const updatedUser = await prisma.user.update({
      where:   { id: user.id },
      data:    { lastLogin: new Date(), refreshToken, tokenExpiry },
      include: { role: true, tenant: true, permissions: { include: { permission: true } } },
    });

    request.log.info({ userId: user.id, email: user.email }, 'User login berhasil');

    return reply.code(200).send({
      success: true,
      message: 'Login berhasil.',
      data: {
        accessToken,
        refreshToken,
        expiresIn: JWT_ACCESS_EXPIRES_IN,
        user:      formatUserResponse(updatedUser),
      },
      meta:   null,
      errors: null,
    });
  } catch (error) {
    request.log.error({ err: error }, 'Login error');
    return reply.code(500).send({
      success: false,
      message: 'Terjadi kesalahan pada server.',
      data:    null,
      meta:    null,
      errors:  { server: 'Silakan coba lagi nanti.' },
    });
  }
};

// ───────────────────────────────────────────────────────────────────────────────

/**
 * POST /auth/logout
 * Protected — membutuhkan verifyToken middleware.
 */
exports.logout = async (request, reply) => {
  const userId = request.user?.id;

  try {
    // Invalidate refresh token di database
    await prisma.user.update({
      where: { id: userId },
      data:  { refreshToken: null, tokenExpiry: null },
    });

    request.log.info({ userId }, 'User logout berhasil');

    return reply.code(200).send({
      success: true,
      message: 'Logout berhasil.',
      data:    null,
      meta:    null,
      errors:  null,
    });
  } catch (error) {
    request.log.error({ err: error }, 'Logout error');
    return reply.code(500).send({
      success: false,
      message: 'Terjadi kesalahan pada server.',
      data:    null,
      meta:    null,
      errors:  { server: 'Silakan coba lagi nanti.' },
    });
  }
};

// ───────────────────────────────────────────────────────────────────────────────

/**
 * POST /auth/refresh-token
 */
exports.refreshToken = async (request, reply) => {
  const { refreshToken } = request.body ?? {};

  if (!refreshToken) {
    return reply.code(400).send({
      success: false,
      message: 'Refresh token harus disertakan.',
      data:    null,
      meta:    null,
      errors:  { refresh_token: 'Field refresh_token wajib diisi.' },
    });
  }

  try {
    // 1. Verifikasi signature & expiry token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET, {
        issuer:   JWT_ISSUER,
        audience: JWT_AUDIENCE,
      });
    } catch {
      return reply.code(401).send({
        success: false,
        message: 'Refresh token tidak valid atau telah kadaluarsa.',
        data:    null,
        meta:    null,
        errors:  { auth: 'Silakan login kembali.' },
      });
    }

    // 2. Ambil user dan validasi token yang tersimpan di DB
    const user = await prisma.user.findUnique({
      where:   { id: decoded.userId },
      include: { role: true, tenant: true },
    });

    if (!user || !user.isActive) {
      return reply.code(401).send({
        success: false,
        message: 'User tidak ditemukan atau tidak aktif.',
        data:    null,
        meta:    null,
        errors:  { auth: 'Sesi Anda tidak valid. Silakan login kembali.' },
      });
    }

    // 3. Cek kecocokan dengan token yang tersimpan (mencegah token reuse)
    if (user.refreshToken !== refreshToken) {
      return reply.code(401).send({
        success: false,
        message: 'Refresh token tidak valid.',
        data:    null,
        meta:    null,
        errors:  { auth: 'Refresh token tidak cocok. Silakan login kembali.' },
      });
    }

    // 4. Issue access token baru
    const newAccessToken = generateAccessToken(user);
    const newTokenExpiry = new Date(Date.now() + JWT_ACCESS_EXPIRES_IN * 1_000);

    await prisma.user.update({
      where: { id: user.id },
      data:  { tokenExpiry: newTokenExpiry },
    });

    request.log.info({ userId: user.id }, 'Access token diperbarui');

    return reply.code(200).send({
      success: true,
      message: 'Token berhasil diperbarui.',
      data:    { accessToken: newAccessToken, expiresIn: JWT_ACCESS_EXPIRES_IN },
      meta:    null,
      errors:  null,
    });
  } catch (error) {
    request.log.error({ err: error }, 'Refresh token error');
    return reply.code(500).send({
      success: false,
      message: 'Terjadi kesalahan pada server.',
      data:    null,
      meta:    null,
      errors:  { server: 'Silakan coba lagi nanti.' },
    });
  }
};

// ───────────────────────────────────────────────────────────────────────────────

/**
 * GET /auth/verify
 * Protected — membutuhkan verifyToken middleware.
 */
exports.verify = async (request, reply) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      include: { role: true, tenant: true, permissions: { include: { permission: true } } },
    });
    return reply.code(200).send({
      success: true,
      message: 'Token valid.',
      data: {
        valid: true,
        user: formatUserResponse(user),
        exp: JWT_ACCESS_EXPIRES_IN,
      },
      meta:   null,
      errors: null,
    });
  } catch (error) {
    request.log.error({ err: error }, 'Verify error');
    return reply.code(500).send({
      success: false,
      message: 'Terjadi kesalahan pada server.',
      data:    null,
      meta:    null,
      errors:  { server: 'Silakan coba lagi nanti.' },
    });
  }
};

// ───────────────────────────────────────────────────────────────────────────────

/**
 * POST /auth/change-password
 * Protected — membutuhkan verifyToken middleware.
 */
exports.changePassword = async (request, reply) => {
  const { currentPassword, newPassword, confirmPassword } = request.body ?? {};
  const userId = request.user?.id;

  // Validasi input
  const errors = {};
  if (!currentPassword) errors.currentPassword = 'Password saat ini wajib diisi.';
  if (!newPassword)     errors.newPassword     = 'Password baru wajib diisi.';
  if (!confirmPassword) errors.confirmPassword = 'Konfirmasi password wajib diisi.';

  if (Object.keys(errors).length > 0) {
    return reply.code(400).send({
      success: false, message: 'Validasi gagal.', data: null, meta: null, errors,
    });
  }

  if (newPassword.length < 8) {
    return reply.code(400).send({
      success: false,
      message: 'Validasi gagal.',
      data:    null,
      meta:    null,
      errors:  { newPassword: 'Password baru minimal 8 karakter.' },
    });
  }

  if (newPassword !== confirmPassword) {
    return reply.code(400).send({
      success: false,
      message: 'Validasi gagal.',
      data:    null,
      meta:    null,
      errors:  { confirmPassword: 'Konfirmasi password tidak sesuai.' },
    });
  }

  if (newPassword === currentPassword) {
    return reply.code(409).send({
      success: false,
      message: 'Password baru tidak boleh sama dengan password lama.',
      data:    null,
      meta:    null,
      errors:  { newPassword: 'Password baru harus berbeda dari password lama.' },
    });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return reply.code(404).send({
        success: false,
        message: 'User tidak ditemukan.',
        data:    null,
        meta:    null,
        errors:  { auth: 'User tidak ditemukan.' },
      });
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return reply.code(403).send({
        success: false,
        message: 'Password saat ini tidak sesuai.',
        data:    null,
        meta:    null,
        errors:  { currentPassword: 'Password yang Anda masukkan salah.' },
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data:  { passwordHash: hashedPassword },
    });

    request.log.info({ userId }, 'Password berhasil diubah');

    return reply.code(200).send({
      success: true,
      message: 'Password berhasil diubah.',
      data:    null,
      meta:    null,
      errors:  null,
    });
  } catch (error) {
    request.log.error({ err: error }, 'Change password error');
    return reply.code(500).send({
      success: false,
      message: 'Terjadi kesalahan pada server.',
      data:    null,
      meta:    null,
      errors:  { server: 'Silakan coba lagi nanti.' },
    });
  }
};

// ───────────────────────────────────────────────────────────────────────────────

/**
 * POST /auth/forgot-password
 *
 * Menghasilkan reset token dan menyimpannya ke DB.
 * TODO: Integrasikan dengan email service (Nodemailer/Resend).
 */
exports.forgotPassword = async (request, reply) => {
  const { email } = request.body ?? {};

  if (!email) {
    return reply.code(400).send({
      success: false,
      message: 'Email wajib diisi.',
      data:    null,
      meta:    null,
      errors:  { email: 'Email wajib diisi.' },
    });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    // Selalu kembalikan response sukses meski email tidak ditemukan
    // — mencegah user enumeration attack
    if (!user) {
      return reply.code(200).send({
        success: true,
        message: 'Jika email terdaftar, link reset password akan dikirim.',
        data:    null,
        meta:    { reset_token_expires_in: 3600 },
        errors:  null,
      });
    }

    const resetToken       = randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3_600_000); // 1 jam

    await prisma.user.update({
      where: { id: user.id },
      data:  { resetToken, resetTokenExpiry },
    });

    // TODO: Kirim email
    // const resetLink = `${process.env.APP_URL}/reset-password?token=${resetToken}`;
    // await emailService.sendPasswordReset(user.email, resetLink);

    request.log.info({ userId: user.id }, 'Reset password token dibuat');

    return reply.code(200).send({
      success: true,
      message: 'Jika email terdaftar, link reset password akan dikirim.',
      data:    null,
      meta:    { reset_token_expires_in: 3600 },
      errors:  null,
    });
  } catch (error) {
    request.log.error({ err: error }, 'Forgot password error');
    return reply.code(500).send({
      success: false,
      message: 'Terjadi kesalahan pada server.',
      data:    null,
      meta:    null,
      errors:  { server: 'Silakan coba lagi nanti.' },
    });
  }
};
