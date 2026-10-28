const prisma = require('/opt/energy/applications/plts/backend/src/config/database');

async function main() {
  const device = await prisma.device.findFirst();
  if (!device) {
    console.log('No device found to seed data');
    return;
  }

  const now = new Date();
  const start = new Date(now.setMinutes(0, 0, 0));

  // Hapus data lama untuk key ini di jam yang sama agar tidak conflict
  await prisma.telemetryAggregate.deleteMany({
    where: {
      deviceId: device.id,
      period: 'hourly',
      periodStart: start,
      standardKey: { in: ['e_pr', 'e_capacity_factor'] }
    }
  });

  const keys = [
    { key: 'e_pr', value: 84.2 },
    { key: 'e_capacity_factor', value: 19.8 }
  ];

  for (const item of keys) {
    await prisma.telemetryAggregate.create({
      data: {
        deviceId: device.id,
        standardKey: item.key,
        period: 'hourly',
        periodStart: start,
        periodEnd: new Date(start.getTime() + 3600000),
        avgValue: String(item.value),
        count: 1
      }
    });
  }
  console.log('Fixed seed dashboard data success');
}

main().catch(console.error).finally(() => prisma.$disconnect());
