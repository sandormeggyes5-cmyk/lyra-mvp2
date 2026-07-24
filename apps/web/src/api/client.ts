export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly data: { error?: string },
  ) {
    super(data.error ?? `HTTP ${status}`);
  }
}

async function req<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
    ...init,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, json as { error?: string });
  return json as T;
}

export const api = {
  get<T>(path: string)                  { return req<T>(path); },
  post<T>(path: string, body?: unknown) { return req<T>(path, { method: 'POST', body: JSON.stringify(body) }); },
  put<T>(path: string, body?: unknown)  { return req<T>(path, { method: 'PUT',  body: JSON.stringify(body) }); },
};
