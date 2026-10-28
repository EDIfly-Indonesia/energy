const bcrypt = require('bcrypt');
const prisma = require('./src/config/database');

async function reset() {
  const email = 'superadmin@plts.com';
  const password = 'password123';
  const hash = await bcrypt.hash(password, 10);
  
  const user = await prisma.user.update({
    where: { email },
    data: { passwordHash: hash }
  });
  
  console.log('✅ Password reset for:', user.email);
  console.log('Hash:', user.passwordHash);
  await prisma.$disconnect();
}

reset().catch(console.error);
