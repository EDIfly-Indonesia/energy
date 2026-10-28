const BASE_URL = import.meta.env.VITE_API_URL ?? '';

/**
 * Klien API portal mitra.
 *
 * SENGAJA TERPISAH dari `../api.ts`:
 *   1. Token disimpan di key BERBEDA (`portal_token`). Bila memakai key admin
 *      (`spklu_token`), token portal akan terkirim ke endpoint admin dan
 *      handler 401 di sana akan menghapus sesi lalu melempar ke login admin —
 *      front office hotel jadi ter-logout sendiri.
 *   2. Handler 401 mengarah ke /spklu/portal/login, bukan login admin.
 *
 * Token portal punya scope 'portal' di backend, jadi endpoint admin tetap
 * menolaknya (401) walau token ini bocor ke sana.
 */

export const PORTAL_TOKEN_KEY = 'portal_token';
export const PORTAL_NAME_KEY = 'portal_nama_mitra';
export const PORTAL_JENIS_KEY = 'portal_jenis_mitra';

export interface PortalResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  const token = localStorage.getItem(PORTAL_TOKEN_KEY);
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<PortalResponse<T>> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: authHeaders(body !== undefined ? { 'Content-Type': 'application/json' } : undefined),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 401 dari endpoint LOGIN berarti "email/password salah", bukan sesi habis.
  // Tanpa pengecualian ini, salah password memicu redirect ke halaman login
  // (yang sedang dibuka) dan pesannya berubah jadi "Gagal terhubung ke server"
  // — menyesatkan, karena masalahnya bukan koneksi.
  const isLoginCall = path === '/portal/login';

  if (res.status === 401 && !isLoginCall) {
    localStorage.removeItem(PORTAL_TOKEN_KEY);
    localStorage.removeItem(PORTAL_NAME_KEY);
    localStorage.removeItem(PORTAL_JENIS_KEY);
    if (!window.location.pathname.endsWith('/portal/login')) {
      window.location.href = '/spklu/portal/login';
    }
    throw new Error('Unauthorized');
  }

  return res.json() as Promise<PortalResponse<T>>;
}

export function portalGet<T = unknown>(path: string): Promise<PortalResponse<T>> {
  return request<T>('GET', path);
}

export function portalPost<T = unknown>(path: string, body: unknown): Promise<PortalResponse<T>> {
  return request<T>('POST', path, body);
}

export function portalDelete<T = unknown>(path: string): Promise<PortalResponse<T>> {
  // Tanpa body: jangan pasang Content-Type (Fastify menolak body kosong).
  return request<T>('DELETE', path);
}

export function portalLogout(): void {
  localStorage.removeItem(PORTAL_TOKEN_KEY);
  localStorage.removeItem(PORTAL_NAME_KEY);
  localStorage.removeItem(PORTAL_JENIS_KEY);
}
