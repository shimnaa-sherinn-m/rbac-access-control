const BASE = `${import.meta.env.VITE_API_URL ?? ''}/api`;
const TOKEN_KEY = 'rbac_token';

export class ApiError extends Error {
  constructor(status, code, message, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
  }
}

let authFailureHandler = null;
export const setAuthFailureHandler = (fn) => {
  authFailureHandler = fn;
};

async function request(method, path, { body, query } = {}) {
  const params = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, value);
  });
  const url = `${BASE}${path}${params.toString() ? `?${params}` : ''}`;

  const headers = { Accept: 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check your connection and try again.');
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
  }

  if (!response.ok) {
    const error = new ApiError(
      response.status,
      data?.error?.code ?? 'UNKNOWN_ERROR',
      data?.error?.message ?? `Request failed (${response.status})`,
      data,
    );
    const sessionLost =
      response.status === 401 || (response.status === 403 && (error.code === 'ROLE_INACTIVE' || error.code === 'ROLE_NOT_FOUND'));
    if (sessionLost && path !== '/auth/login' && authFailureHandler) authFailureHandler(error);
    throw error;
  }
  return data;
}

export const api = {
  get: (path, query) => request('GET', path, { query }),
  post: (path, body) => request('POST', path, { body: body ?? {} }),
  put: (path, body) => request('PUT', path, { body }),
  patch: (path, body) => request('PATCH', path, { body }),
};
