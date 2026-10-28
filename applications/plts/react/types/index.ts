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

export interface Invoice {
  id: string;
  companyId: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  company?: Company;
}

export interface Rate {
  id: string;
  name: string;
  value: number;
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