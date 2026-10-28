// src/types/index.ts

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role | string;
  role_name?: string;
  role_id?: string;
  tenant_id?: string;
  permissions?: Permission[];
}

export interface Role {
  id: string;
  name: string;
  role_name?: string;
  slug?: string;
  permissions?: Permission[];
}

export interface Permission {
  capability: string;
  feature: string;
  module?: string;
  action?: string;
}

export interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  permissions: Permission[];
  isAuthenticated: boolean;
}

export interface Site {
  id: string;
  name: string;
  address?: string;
  latitude?: number | string;
  longitude?: number | string;
  capacityKwp?: number | string;
  company?: Company;
  tenant?: Tenant;
}

export interface Company {
  id: string;
  name: string;
  tenancy?: Tenant;
}

export interface Tenant {
  id: string;
  name: string;
  address?: string;
}

export interface Device {
  id: string;
  serialNumber: string;
  modelName?: string;
  brand?: string;
  type?: string;
  site?: Site;
  status?: string;
  lastSeen?: string;
}

export interface TelemetryData {
  id: string;
  deviceId: string;
  standardKey: string;
  vendorKey: string;
  value: number;
  timestamp: string;
  device?: Device;
}

export interface TelemetryAggregate {
  id: string;
  deviceId: string;
  standardKey: string;
  period: string;
  periodStart: string;
  avgValue: number;
  minValue: number;
  maxValue: number;
  sumValue: number;
  device?: Device;
}

export interface Alarm {
  id: string;
  deviceId: string;
  errorCode?: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  status: 'active' | 'inactive' | 'resolved';
  resolvedAt?: string;
  createdAt: string;
  device?: Device;
  time?: string;
  deviceName?: string;
  code?: string;
}

export interface InvoiceItem {
  id?: string;
  qty: string;
  unit?: string | null;
  rate: string;
}

export interface Invoice {
  id: string;
  number?: string | null;
  date?: string;
  dueDate?: string;
  status?: string | null;
  currency?: string | null;
  subtotal?: string;
  totalTax?: string;
  total?: string;
  discountTotal?: string;
  adjustment?: string;
  tenantId?: string | null;
  tenantName?: string | null;
  companyId?: string | null;
  billingPeriod?: string | null;
  peakStartHour?: number | null;
  peakEndHour?: number | null;
  createdAt?: string;
  items?: InvoiceItem[];
  tenant?: Tenant;
  company?: Company;
}

export interface InvoiceUsageRow {
  date?: string;
  siteId?: string;
  siteName?: string;
  totalKwh: number;
  peakKwh?: number;
  offPeakKwh?: number;
}

export interface Rate {
  id: string;
  code?: string | null;
  name: string;
  rateType: string;
  fixedAmount?: string | number | null;
  peakRate?: string | number | null;
  offPeakRate?: string | number | null;
  peakStartHour?: number | null;
  peakEndHour?: number | null;
  tenantId?: string | null;
  siteId?: string | null;
  isActive: boolean;
  description?: string | null;
  currency: string;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginationMeta {
  pagination?: {
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  };
}

export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface RealtimeSummary {
  totalProduction?: number;
  totalConsumption?: number;
  batterySoc?: number;
  gridExport?: number;
  gridImport?: number;
}

export const parameterLabels: Record<string, string> = {
  b_: 'Battery',
  c_: 'Current',
  e_: 'Energy',
  f_: 'Frequency',
  i_: 'Irradiance',
  p_: 'Power',
  s_: 'Status',
  t_: 'Temperature',
  v_: 'Voltage',
};