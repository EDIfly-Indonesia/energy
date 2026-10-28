const authRoutes = require('./auth.routes');
const tenantRoutes = require('./tenant.routes');
const siteRoutes = require('./site.routes');
const deviceRoutes = require('./device.routes');
const telemetryRoutes = require('./telemetry.routes');
const alarmRoutes = require('./alarm.routes');
const reportRoutes = require('./report.routes');
const invoiceRoutes = require('./invoice.routes');
const userRoutes = require('./user.routes');
const mappingRoutes = require('./mapping.routes');
const companyRoutes = require('./company.routes');
const roleRoutes = require('./role.routes');
const permissionRoutes = require('./permission.routes');
const rateRoutes = require('./rate.routes');

async function v1Routes(fastify, options) {
  fastify.register(authRoutes, { prefix: '/auth' });
  fastify.register(tenantRoutes, { prefix: '/tenants' });
  fastify.register(siteRoutes, { prefix: '/sites' });
  fastify.register(deviceRoutes, { prefix: '/devices' });
  fastify.register(telemetryRoutes, { prefix: '/telemetry' });
  fastify.register(alarmRoutes, { prefix: '/alarms' });
  fastify.register(reportRoutes, { prefix: '/reports' });
  fastify.register(invoiceRoutes, { prefix: '/invoices' });
  fastify.register(userRoutes, { prefix: '/users' });
  fastify.register(mappingRoutes, { prefix: '/mappings' });
  fastify.register(companyRoutes, { prefix: '/companies' });
  fastify.register(roleRoutes, { prefix: '/roles' });
  fastify.register(permissionRoutes, { prefix: '/permissions' });
  fastify.register(rateRoutes, { prefix: '/rates' });
}

module.exports = v1Routes;
