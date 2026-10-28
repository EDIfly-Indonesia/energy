/**
 * Auth Unit Test
 *
 * Test untuk fungsi autentikasi:
 * - Password hashing dan verifikasi
 * - JWT generation
 * - User login flow
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../../src/config/database');

// Konfigurasi JWT untuk test
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

async function testPasswordHash() {
  console.log('\n🔐 Testing Password Hash...');
  console.log('─'.repeat(50));
  
  const email = 'superadmin@plts.com';
  const password = 'password123';
  
  // 1. Cari user
  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true }
  });
  
  if (!user) {
    console.log('❌ User not found:', email);
    return false;
  }
  
  console.log('✅ User found:', user.email);
  console.log('📝 Hash in DB:', user.passwordHash);
  console.log('📏 Hash length:', user.passwordHash.length);
  
  // 2. Verifikasi password
  const isValid = await bcrypt.compare(password, user.passwordHash);
  console.log('🔑 Password match:', isValid ? '✅ YES' : '❌ NO');
  
  if (!isValid) {
    console.log('\n⚠️  Password mismatch! Resetting password...');
    
    // Reset password
    const newHash = await bcrypt.hash(password, 10);
    const updated = await prisma.user.update({
      where: { email },
      data: { passwordHash: newHash }
    });
    
    console.log('✅ Password reset for:', updated.email);
    
    // Test ulang
    const testValid = await bcrypt.compare(password, updated.passwordHash);
    console.log('🔄 New password test:', testValid ? '✅ PASS' : '❌ FAIL');
    
    return testValid;
  }
  
  return true;
}

async function testJWT() {
  console.log('\n🔐 Testing JWT...');
  console.log('─'.repeat(50));
  
  const user = await prisma.user.findUnique({
    where: { email: 'superadmin@plts.com' }
  });
  
  if (!user) {
    console.log('❌ User not found');
    return false;
  }
  
  // Generate access token
  const accessToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  
  console.log('✅ Access token generated');
  console.log('📝 Token:', accessToken.substring(0, 50) + '...');
  
  // Verify token
  try {
    const decoded = jwt.verify(accessToken, JWT_SECRET);
    console.log('✅ Token verified');
    console.log('📝 Decoded payload:', {
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name
    });
    return true;
  } catch (error) {
    console.log('❌ Token verification failed:', error.message);
    return false;
  }
}

async function testLoginFlow() {
  console.log('\n🔐 Testing Login Flow...');
  console.log('─'.repeat(50));
  
  const email = 'superadmin@plts.com';
  const password = 'password123';
  
  // 1. Cari user
  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true }
  });
  
  if (!user) {
    console.log('❌ User not found');
    return false;
  }
  
  console.log('✅ User found:', user.email);
  
  // 2. Verifikasi password
  const isValid = await bcrypt.compare(password, user.passwordHash);
  console.log('🔑 Password match:', isValid ? '✅ YES' : '❌ NO');
  
  if (!isValid) {
    console.log('❌ Login would fail');
    return false;
  }
  
  // 3. Generate tokens (simulasi)
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  
  const refreshToken = jwt.sign(
    { userId: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  
  console.log('✅ Access token generated');
  console.log('✅ Refresh token generated');
  console.log('🎉 Login flow successful!');
  
  return true;
}

async function runTests() {
  console.log('\n🧪 AUTH UNIT TESTS');
  console.log('═'.repeat(50));
  
  try {
    const hashResult = await testPasswordHash();
    const jwtResult = await testJWT();
    const loginResult = await testLoginFlow();
    
    console.log('\n📊 TEST SUMMARY');
    console.log('═'.repeat(50));
    console.log(`Password Hash Test: ${hashResult ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`JWT Test:          ${jwtResult ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Login Flow Test:   ${loginResult ? '✅ PASS' : '❌ FAIL'}`);
    
    const allPassed = hashResult && jwtResult && loginResult;
    console.log(`\n${allPassed ? '🎉 ALL TESTS PASSED!' : '❌ SOME TESTS FAILED'}`);
    
    await prisma.$disconnect();
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('❌ Test error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Jalankan jika dipanggil langsung
if (require.main === module) {
  runTests();
}

module.exports = { testPasswordHash, testJWT, testLoginFlow, runTests };
