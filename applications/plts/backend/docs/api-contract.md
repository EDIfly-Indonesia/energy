# API Contract - PLTS SCADA Monitoring Platform API
# Version: 1.0.0
# Prefix: /plts/api/v1

## Endpoints Overview
### Authentication (`/auth`)
| Method | Endpoint           | Description                     |
|--------|--------------------|---------------------------------|
| POST   | `/auth/login`      | User login (email/password)     |
| POST   | `/auth/register`   | Register new user (admin only)  |
| POST   | `/auth/refresh-token` | Refresh access token         |
| POST   | `/auth/logout`     | Invalidate current session      |
| POST   | `/auth/forgot-password` | Send reset link via email   |
| POST   | `/auth/change-password` | Change user password        |
| GET    | `/auth/verify`     | Verify JWT token validity       |

### Devices (`/devices`)
| Method | Endpoint           | Description                     |
|--------|--------------------|---------------------------------|
| GET    | `/devices`         | List all devices (paginated)    |
| GET    | `/devices/:id`     | Get a single device by ID       |
| POST   | `/devices`         | Create new device               |
| PUT    | `/devices/:id`     | Update existing device          |
| DELETE | `/devices/:id`     | Delete a device                 |

### Telemetry (`/telemetry`)
| Method | Endpoint                       | Description                              |
|--------|--------------------------------|------------------------------------------|
| GET    | `/telemetry`                   | Get telemetry mappings for device(s)     |
| GET    | `/telemetry/device/:id`        | Get telemetry mappings for specific device |
| GET    | `/telemetry/summary`           | Get dashboard summary stats              |
| GET    | `/telemetry/daily-summary`     | Get daily energy summary (by site/date)  |
| GET    | `/telemetry/aggregates`        | Get telemetry aggregates (hourly/daily)  |
| GET    | `/telemetry/data`              | Get raw telemetry data points            |
| GET    | `/telemetry/realtime/:deviceId` | Get latest real-time values (InfluxDB)  |
| GET    | `/telemetry/realtime/summary`  | Real-time dashboard summary (InfluxDB)   |
| GET    | `/telemetry/realtime/timeseries/:deviceId` | Time-series data for charts (InfluxDB) |

### Sites (`/sites`)
| Method | Endpoint         | Description             |
|--------|------------------|-------------------------|
| GET    | `/sites`         | List all sites          |
| GET    | `/sites/:id`     | Get site details        |
| POST   | `/sites`         | Create a new site       |
| PUT    | `/sites/:id`     | Update a site           |
| DELETE | `/sites/:id`     | Delete a site           |

### Companies (`/companies`)
| Method | Endpoint           | Description      |
|--------|--------------------|------------------|
| GET    | `/companies`       | List companies   |
| POST   | `/companies`       | Create company   |
| PUT    | `/companies/:id`   | Update company   |
| DELETE | `/companies/:id`   | Delete company   |

### Tenants (`//tenants`)
| Method | Endpoint           | Description      |
|--------|--------------------|------------------|
| GET    | `/tenants`         | List tenants     |
| POST   | `/tenants`         | Create tenant    |
| PUT    | `/tenants/:id`     | Update tenant    |
| DELETE | `/tenants/:id`     | Delete tenant    |

### Users (`/users`)
| Method | Endpoint           | Description      |
|--------|--------------------|------------------|
| GET    | `/users`           | List users       |
| POST   | `/users`           | Create user      |
| PUT    | `/users/:id`       | Update user      |
| DELETE | `/users/:id`       | Delete user      |

### Roles (`/roles`)
| Method | Endpoint           | Description      |
|--------|--------------------|------------------|
| GET    | `/roles`           | List roles       |
| POST   | `/roles`           | Create role      |
| PUT    | `/roles/:id`       | Update role      |
| DELETE | `/roles/:id`       | Delete role      |

### Permissions (`/permissions`)
| Method | Endpoint           | Description              |
|--------|--------------------|--------------------------|
| GET    | `/permissions`     | List permissions         |
| GET    | `/permissions/modules` | List module permissions |

### Invoices (`/invoices`)
| Method | Endpoint           | Description      |
|--------|--------------------|------------------|
| GET    | `/invoices`        | List invoices    |
| POST   | `/invoices`        | Create invoice   |
| PUT    | `/invoices/:id`    | Update invoice   |
| DELETE | `/invoices/:id`    | Delete invoice   |

### Alarms (`/alarms`)
| Method | Endpoint           | Description          |
|--------|--------------------|----------------------|
| GET    | `/alarms`          | List active alarms   |
| GET    | `/alarms/:id`      | Get alarm details    |
| PUT    | `/alarms/:id/resolve` | Mark alarm as resolved |

### Mappings (`/mappings`)
| Method | Endpoint           | Description                       |
|--------|--------------------|-----------------------------------|
| GET    | `/mappings`        | List all mappings                 |
| GET    | `/mappings/:id`    | Get mapping details               |
| GET    | `/mappings/device/:deviceId` | Get mappings for a device |
| POST   | `/mappings`        | Create new mapping                |
| PUT    | `/mappings/:id`    | Update mapping                    |
| DELETE | `/mappings/:id`    | Delete mapping                    |

### Reports (`/reports`)
| Method | Endpoint           | Description              |
|--------|--------------------|--------------------------|
| GET    | `/reports`         | List/generate reports    |
| GET    | `/reports/energy`  | Get energy production report |

### Vendor Mappings (`/vendor-mappings`)
| Method | Endpoint           | Description              |
|--------|--------------------|--------------------------|
| GET    | `/vendor-mappings` | List vendor mappings     |
| POST   | `/vendor-mappings` | Create vendor mapping    |
| PUT    | `/vendor-mappings/:id` | Update vendor mapping    |
| DELETE | `/vendor-mappings/:id` | Delete vendor mapping    |

### Telemetry Mappings (`/telemetry-mappings`)
| Method | Endpoint           | Description                |
|--------|--------------------|-----------------------------|
| GET    | `/telemetry-mappings` | List telemetry mappings  |
| POST   | `/telemetry-mappings` | Create mapping           |
| PUT    | `/telemetry-mappings/:id` | Update mapping       |
| DELETE | `/telemetry-mappings/:id` | Delete mapping        |

---
*Note: All endpoints (except auth/login, auth/register, auth/forgot-password, auth/verify) require `Authorization: Bearer <Token>` header.
