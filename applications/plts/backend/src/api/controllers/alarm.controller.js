'use strict';
const prisma = require('../../config/database');

exports.getAlarms = async (request, reply) => {
  try {
    const { severity, status, siteId } = request.query ?? {};

    // Determine which data sources to include based on filters
    const includeRealAlarms = status !== 'inactive';
    const includeOfflineDevices = status === 'inactive' || !status;

    // Fetch actual alarm records
    const alarmWhere = {};
    if (severity) alarmWhere.severity = severity;
    if (status === 'resolved') alarmWhere.resolvedAt = { not: null };
    else if (status === 'active') alarmWhere.resolvedAt = null;

    let alarms = [];
    if (includeRealAlarms) {
      alarms = await prisma.alarm.findMany({
        where: alarmWhere,
        include: {
          device: {
            select: { id: true, serialNumber: true, modelName: true, status: true, site: { select: { id: true, name: true } } }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    // Fetch offline devices
    let offlineDevices = [];
    if (includeOfflineDevices) {
      const deviceWhere = { status: 'OFFLINE' };
      if (siteId) deviceWhere.siteId = siteId;

      offlineDevices = await prisma.device.findMany({
        where: deviceWhere,
        include: { site: { select: { id: true, name: true } } },
        orderBy: { lastSeenAt: 'desc' }
      });
    }

    // Merge and transform offline devices into alarm-like objects
    const offlineAsAlarms = offlineDevices.map(device => ({
      id: `offline-${device.id}`,
      deviceId: device.id,
      errorCode: 'DEVICE_OFFLINE',
      severity: 'CRITICAL',
      message: `Device ${device.serialNumber} is offline since ${device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : 'unknown'}`,
      createdAt: device.lastSeenAt || new Date(),
      resolvedAt: null,
      device: {
        id: device.id,
        serialNumber: device.serialNumber,
        modelName: device.modelName,
        status: device.status,
        site: device.site
      },
      isSynthetic: true // flag to distinguish from real alarms
    }));

    // Combine: real alarms first, then synthetic offline alarms
    const combined = [...alarms, ...offlineAsAlarms];

    return reply.code(200).send({ success: true, data: combined });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message });
  }
};

exports.getAlarmById = async (request, reply) => {
  try {
    const alarm = await prisma.alarm.findUnique({ where: { id: request.params.id } });
    if (!alarm) return reply.code(404).send({ success: false, message: 'Alarm not found' });
    return reply.code(200).send({ success: true, data: alarm });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message });
  }
};

exports.createAlarm = async (request, reply) => {
  try {
    const alarm = await prisma.alarm.create({ data: request.body });
    return reply.code(201).send({ success: true, data: alarm });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message });
  }
};

exports.updateAlarm = async (request, reply) => {
  try {
    const alarm = await prisma.alarm.update({
      where: { id: request.params.id },
      data: request.body
    });
    return reply.code(200).send({ success: true, data: alarm });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message });
  }
};

exports.deleteAlarm = async (request, reply) => {
  try {
    await prisma.alarm.delete({ where: { id: request.params.id } });
    return reply.code(200).send({ success: true, message: 'Alarm deleted' });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message });
  }
};

exports.getResolvedAlarms = async (request, reply) => {
  try {
    const alarms = await prisma.alarm.findMany({ where: { resolvedAt: { not: null } } });
    return reply.code(200).send({ success: true, data: alarms });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message });
  }
};

exports.resolveAlarm = async (request, reply) => {
  try {
    const alarm = await prisma.alarm.update({
      where: { id: request.params.id },
      data: { resolvedAt: new Date() }
    });
    return reply.code(200).send({ success: true, data: alarm });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message });
  }
};