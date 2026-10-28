const BASE_URL = import.meta.env.VITE_API_URL ?? '';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  token?: string;
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  const token = localStorage.getItem('spklu_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: authHeaders(body !== undefined ? { 'Content-Type': 'application/json' } : undefined),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    localStorage.removeItem('spklu_token');
    localStorage.removeItem('spklu_type');
    localStorage.removeItem('spklu_name');
    localStorage.removeItem('spklu_mitra');
    if (window.location.pathname !== '/spklu/login') window.location.href = '/spklu/login';
    throw new Error('Unauthorized');
  }
  return res.json() as Promise<ApiResponse<T>>;
}

export function get<T = unknown>(path: string): Promise<ApiResponse<T>> {
  return request<T>('GET', path);
}

export function post<T = unknown>(path: string, body: unknown): Promise<ApiResponse<T>> {
  return request<T>('POST', path, body);
}

export function put<T = unknown>(path: string, body: unknown): Promise<ApiResponse<T>> {
  return request<T>('PUT', path, body);
}

export function del<T = unknown>(path: string, body?: unknown): Promise<ApiResponse<T>> {
  return request<T>('DELETE', path, body);
}

export function assetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${BASE_URL}${path}`;
}

export function uploadPreviewUrl(folder: string, filename: string | null | undefined): string | null {
  if (!filename) return null;
  if (/^https?:\/\//.test(filename)) return filename;
  if (filename.startsWith('/')) return filename;
  return `/spklu/dashboard/uploads/${folder}/${filename}`;
}

export async function uploadFile(file: File, folder = 'chargebox'): Promise<ApiResponse<{ url: string; filename: string }>> {
  const fd = new FormData();
  fd.append('file', file);
  const headers: Record<string, string> = {};
  const token = localStorage.getItem('spklu_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}/admin/upload?folder=${encodeURIComponent(folder)}`, { method: 'POST', headers, body: fd });
  return res.json() as Promise<ApiResponse<{ url: string; filename: string }>>;
}

export interface MediaItem {
  folder: string;
  filename: string;
  url: string;
  size: number;
  mtime: number;
}

export function listMedia(folder?: string): Promise<ApiResponse<MediaItem[]>> {
  const q = folder ? `?folder=${encodeURIComponent(folder)}` : '';
  return get<MediaItem[]>(`/admin/media${q}`);
}

export function deleteMedia(folder: string, filename: string): Promise<ApiResponse<null>> {
  return del<null>('/admin/media', { folder, filename });
}
