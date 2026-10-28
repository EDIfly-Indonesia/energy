'use strict';
const prisma = require('../../config/database');
const { Prisma } = require('@prisma/client');

const RATE_TYPES = ['FIXED', 'PEAK_OFF_PEAK'];

// Nilai default jendela WBP (Waktu Beban Puncak): 17:00 - 22:00.
const DEFAULT_PEAK_START = 17;
const DEFAULT_PEAK_END = 22;

/**
 * Validasi body create/update berdasarkan rateType.
 * FIXED           -> fixedAmount wajib; peak/off-peak dinolkan.
 * PEAK_OFF_PEAK   -> peakRate & offPeakRate wajib; fixedAmount dinolkan.
 * Mengembalikan { error } bila invalid, atau { data } berisi field yang
 * siap ditulis (semua nilai non-undefined, dengan angka diparsa).
 */
function buildRateFields(body) {
  const rateType = (body.rateType ?? 'FIXED').toUpperCase();

  if (!RATE_TYPES.includes(rateType)) {
    return { error: `rateType harus salah satu dari: ${RATE_TYPES.join(', ')}` };
  }

  if (!body.name && body.name !== undefined) {
    return { error: 'Name is required' };
  }

  const num = (v) => {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const toDecimal = (v) => {
    if (v === undefined || v === null || v === '') return null;
    return new Prisma.Decimal(v);
  };

  if (rateType === 'FIXED') {
    if (num(body.fixedAmount) === null) {
      return { error: 'fixedAmount wajib diisi untuk rateType FIXED' };
    }
    return {
      data: {
        rateType: 'FIXED',
        fixedAmount: toDecimal(body.fixedAmount),
        peakRate: null,
        offPeakRate: null,
        peakStartHour: null,
        peakEndHour: null,
      },
    };
  }

  // PEAK_OFF_PEAK
  const peak = num(body.peakRate);
  const offPeak = num(body.offPeakRate);
  if (peak === null || offPeak === null) {
    return { error: 'peakRate dan offPeakRate wajib diisi untuk rateType PEAK_OFF_PEAK' };
  }
  if (peak < 0 || offPeak < 0) {
    return { error: 'peakRate dan offPeakRate tidak boleh negatif' };
  }

  const start = body.peakStartHour !== undefined ? num(body.peakStartHour) : DEFAULT_PEAK_START;
  const end = body.peakEndHour !== undefined ? num(body.peakEndHour) : DEFAULT_PEAK_END;
  if (start === null || end === null || start < 0 || start > 23 || end < 0 || end > 23) {
    return { error: 'peakStartHour dan peakEndHour harus 0-23' };
  }

  return {
    data: {
      rateType: 'PEAK_OFF_PEAK',
      fixedAmount: null,
      peakRate: toDecimal(peak),
      offPeakRate: toDecimal(offPeak),
      peakStartHour: start,
      peakEndHour: end,
    },
  };
}

exports.getRates = async (request, reply) => {
  try {
    const { code, rateType, tenantId, siteId, isActive, page = 1, limit = 50 } = request.query;
    
    const where = {};
    if (code) where.code = { contains: code };
    if (rateType) where.rateType = rateType;
    if (tenantId) where.tenantId = tenantId;
    if (siteId) where.siteId = siteId;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    
    const [rates, total] = await Promise.all([
      prisma.rate.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.rate.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: rates,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    request.log.error({ err: error }, 'getRates error');
    return reply.code(500).send({ success: false, message: error.message });
  }
};

exports.getRateById = async (request, reply) => {
  try {
    const { id } = request.params;
    const rate = await prisma.rate.findUnique({ where: { id } });
    
    if (!rate) {
      return reply.code(404).send({ success: false, message: 'Rate not found' });
    }
    
    return reply.send({ success: true, data: rate });
  } catch (error) {
    request.log.error({ err: error }, 'getRateById error');
    return reply.code(500).send({ success: false, message: error.message });
  }
};

exports.createRate = async (request, reply) => {
  try {
    const { code, name, tenantId, siteId, isActive, description, currency, effectiveFrom, effectiveTo } = request.body;

    if (!name) {
      return reply.code(400).send({ success: false, message: 'Name is required' });
    }

    const { error, data: typeFields } = buildRateFields(request.body);
    if (error) {
      return reply.code(400).send({ success: false, message: error });
    }
    
    const rate = await prisma.rate.create({
      data: {
        code,
        name,
        ...typeFields,
        tenantId,
        siteId,
        isActive: isActive !== undefined ? isActive : true,
        description,
        currency: currency || 'IDR',
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
      },
    });
    
    return reply.code(201).send({ success: true, data: rate });
  } catch (error) {
    request.log.error({ err: error }, 'createRate error');
    if (error.code === 'P2002') {
      return reply.code(409).send({ success: false, message: 'Rate code already exists' });
    }
    return reply.code(500).send({ success: false, message: error.message });
  }
};

exports.updateRate = async (request, reply) => {
  try {
    const { id } = request.params;
    const { code, name, tenantId, siteId, isActive, description, currency, effectiveFrom, effectiveTo } = request.body;

    const { error, data: typeFields } = buildRateFields(request.body);
    if (error) {
      return reply.code(400).send({ success: false, message: error });
    }

    const rate = await prisma.rate.update({
      where: { id },
      data: {
        code,
        name,
        ...typeFields,
        tenantId,
        siteId,
        isActive,
        description,
        currency,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : undefined,
        effectiveTo: effectiveTo !== undefined ? (effectiveTo ? new Date(effectiveTo) : null) : undefined,
      },
    });
    
    return reply.send({ success: true, data: rate });
  } catch (error) {
    request.log.error({ err: error }, 'updateRate error');
    if (error.code === 'P2025') {
      return reply.code(404).send({ success: false, message: 'Rate not found' });
    }
    return reply.code(500).send({ success: false, message: error.message });
  }
};

exports.deleteRate = async (request, reply) => {
  try {
    const { id } = request.params;
    await prisma.rate.delete({ where: { id } });
    return reply.send({ success: true, message: 'Rate deleted' });
  } catch (error) {
    request.log.error({ err: error }, 'deleteRate error');
    if (error.code === 'P2025') {
      return reply.code(404).send({ success: false, message: 'Rate not found' });
    }
    return reply.code(500).send({ success: false, message: error.message });
  }
};
