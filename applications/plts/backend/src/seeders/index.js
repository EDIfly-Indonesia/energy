// File: src/seeders/index.js
// Entry point untuk Prisma db seed (lihat package.json: "seed": "node src/seeders/index.js")
const { seedMaster } = require('./master.seeder.js');
const { seedMasterData } = require('./telemetry.seeder.js');
const { seedErrorCodes } = require('./error-codes.seeder.js');

async function runAllSeeds() {
  await seedMaster();
  await seedMasterData();
  await seedErrorCodes();
}

runAllSeeds()
  .then(() => console.log('✅ Seeding completed successfully!'))
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  });
