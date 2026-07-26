export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly data: { error?: string },
  ) {
    super(data.error ?? `HTTP ${status}`);
  }
}

// Wird von AuthContext gesetzt, um auf eine ungültig gewordene Sitzung zu
// reagieren (z. B. abgelaufen, während der Tab schon länger offen war) —
// unabhängig davon, welche Komponente den Request ausgelöst hat.
type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

async function req<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
    ...init,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Nur für unsere session-geschützten Routen (/api/v1/*) als "Sitzung
    // ungültig" behandeln. /api/auth/* (better-auth: Login/Registrierung)
    // hat eigene 401-Bedeutung (falsches Passwort) und eigene Fehlerbehandlung.
    if (res.status === 401 && url.startsWith('/api/v1/')) {
      onUnauthorized?.();
    }
    throw new ApiError(res.status, json as { error?: string });
  }
  return json as T;
}

export const api = {
  get<T>(path: string)                  { return req<T>(path); },
  post<T>(path: string, body?: unknown) { return req<T>(path, { method: 'POST', body: JSON.stringify(body) }); },
  put<T>(path: string, body?: unknown)  { return req<T>(path, { method: 'PUT',  body: JSON.stringify(body) }); },
};
