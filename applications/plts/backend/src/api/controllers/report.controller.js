'use strict';
const prisma = require('../../config/database');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

exports.getReports = async (request, reply) => {
  try {
    const sites = await prisma.site.findMany({
      orderBy: { name: 'asc' }
    });
    return reply.send({
      success: true,
      data: sites,
      message: 'Reports retrieved successfully'
    });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message });
  }
};

exports.getEnergyReport = async (request, reply) => {
  try {
    const sites = await prisma.site.findMany({
      include: { devices: { select: { status: true } } },
      orderBy: { name: 'asc' }
    });
    const total = sites.length;
    const capacity = sites.reduce((sum, s) => sum + Number(s.capacityKwp || 0), 0);
    const activeDevices = sites.reduce((sum, s) => sum + s.devices.filter(d => d.status === 'ONLINE').length, 0);
    const data = sites.map(s => ({
      id: s.id,
      name: s.name,
      capacityKwp: Number(s.capacityKwp),
      latitude: s.latitude,
      longitude: s.longitude,
      activeDevices: s.devices.filter(d => d.status === 'ONLINE').length,
      totalDevices: s.devices.length
    }));
    return reply.send({
      success: true,
      data: data,
      stats: { total, capacity: capacity.toFixed(2), activeDevices, totalDevices: sites.reduce((s, si) => s + si.devices.length, 0) },
      message: 'Energy report retrieved successfully'
    });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message });
  }
};

// --- NEW: Export Energy Report ---
exports.exportEnergyReport = async (request, reply) => {
  const { format = 'csv', from, to } = request.query;
  try {
    // Fetch energy report data (same as getEnergyReport)
    const sites = await prisma.site.findMany({
      select: { id: true, name: true, capacityKwp: true, latitude: true, longitude: true },
    });

    // Flatten data for export
    const data = sites.map(s => ({
      Site: s.name,
      Capacity: Number(s.capacityKwp).toFixed(2),
      Latitude: s.latitude ? Number(s.latitude).toFixed(8) : '',
      Longitude: s.longitude ? Number(s.longitude).toFixed(8) : '',
    }));

    const now = new Date().toISOString().slice(0, 19).replace(/T/, '');
    const filename = `energy-report-${now}`;

    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Energy Report');
      sheet.columns = [
        { header: 'Site', key: 'Site' },
        { header: 'Capacity (kWp)', key: 'Capacity' },
        { header: 'Latitude', key: 'Latitude' },
        { header: 'Longitude', key: 'Longitude' },
      ];
      sheet.addRows(data);
      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', `attachment; filename=${filename}.xlsx`);
      await workbook.xlsx.write(reply.raw);
      reply.raw.end();
      return;
    }

    if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 50 });
      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', `attachment; filename=${filename}.pdf`);
      doc.pipe(reply.raw);
      doc.fontSize(20).text('Energy Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10);
      const headers = ['Site', 'Capacity (kWp)', 'Latitude', 'Longitude'];
      const startX = 50;
      let y = 100;
      // Draw headers
      headers.forEach((h, i) => { doc.text(h, startX + i * 150, y, { width: 140 }); });
      y += 20;
      doc.moveTo(startX, y).lineTo(560, y).stroke();
      y += 10;
      // Draw rows
      data.forEach((row, i) => {
        const rowData = [row.Site, row.Capacity, row.Latitude, row.Longitude];
        rowData.forEach((val, j) => { doc.text(val, startX + j * 150, y, { width: 140 }); });
        y += 20;
      });
      doc.end();
      reply.raw.end();
      return;
    }

    // Default: CSV
    const csv = [
      ['Site', 'Capacity (kWp)', 'Latitude', 'Longitude'],
      ...data.map(d => [d.Site, d.Capacity, d.Latitude, d.Longitude]),
    ].map(r => r.join(',')).join('\n');
    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', `attachment; filename=${filename}.csv`);
    return reply.send(csv);

  } catch (error) {
    console.error('exportEnergyReport error:', error);
    return reply.code(500).send({ success: false, message: error.message });
  }
};