const TOKEN_KEY = "joshrob_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = "GET", body, query } = {}) {
  const url = new URL(path, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    }
  }

  const headers = { Accept: "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const response = await fetch(url, { method, headers, body: payload });

  let data = null;
  const text = await response.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text || "Empty response." };
  }

  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("/api/auth/login")) {
      clearToken();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.assign("/login");
      }
    }
    const err = new Error(data?.error || `Request failed (${response.status})`);
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  auth: {
    register: (body) => request("/api/auth/register", { method: "POST", body }),
    login: (body) => request("/api/auth/login", { method: "POST", body }),
    me: () => request("/api/auth/me"),
  },
  gis: {
    geocode: (q) => request("/api/gis/geocode", { query: { q } }),
    reverse: (lat, lng) => request("/api/gis/reverse", { query: { lat, lng } }),
    route: (params) => request("/api/gis/route", { query: params }),
    nearby: (params) => request("/api/gis/nearby", { query: params }),
    types: () => request("/api/gis/types"),
  },
  ai: {
    assist: (body) => request("/api/ai/assist", { method: "POST", body }),
    history: () => request("/api/ai/history"),
  },
  emergency: {
    sos: (body) => request("/api/emergency/sos", { method: "POST", body }),
    alerts: () => request("/api/emergency/alerts"),
  },
  robot: {
    status: () => request("/api/robot/status"),
    commands: () => request("/api/robot/commands"),
    command: (body) => request("/api/robot/command", { method: "POST", body }),
    latestTelemetry: () => request("/api/robot/telemetry/latest"),
  },
  stats: () => request("/api/stats"),
  trips: {
    save: (body) => request("/api/trips", { method: "POST", body }),
    list: () => request("/api/trips"),
  },
};

export default api;
