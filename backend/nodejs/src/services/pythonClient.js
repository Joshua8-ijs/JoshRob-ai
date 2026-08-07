import { config } from "../config.js";

/**
 * Thin HTTP client for the Python (Flask) microservice.
 * The Node gateway owns the public API surface and delegates
 * database + AI + GIS work to the Python service.
 */
async function callPython(path, { method = "GET", body, query = {} } = {}) {
  const url = new URL(path, config.pythonServiceUrl);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, value);
  }

  const headers = { Accept: "application/json" };
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
    data = { error: text || "Empty response from service." };
  }

  if (!response.ok) {
    const err = new Error(data?.error || `Python service error (${response.status})`);
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const python = {
  auth: {
    register: (payload) => callPython("/api/auth/register", { method: "POST", body: payload }),
    login: (payload) => callPython("/api/auth/login", { method: "POST", body: payload }),
    me: (userId) => callPython("/api/auth/me", { query: { user_id: userId } }),
    updateMe: (userId, payload) => callPython("/api/auth/me", { method: "PATCH", query: { user_id: userId }, body: payload }),
  },
  ai: {
    assist: (payload) => callPython("/api/ai/assist", { method: "POST", body: payload }),
    history: (userId) => callPython("/api/ai/history", { query: { user_id: userId } }),
  },
  gis: {
    geocode: (q) => callPython("/api/gis/geocode", { query: { q } }),
    reverse: (lat, lng) => callPython("/api/gis/reverse", { query: { lat, lng } }),
    route: (params) => callPython("/api/gis/route", { query: params }),
    nearby: (params) => callPython("/api/gis/nearby", { query: params }),
    types: () => callPython("/api/gis/types"),
  },
  emergency: {
    sos: (payload) => callPython("/api/emergency/sos", { method: "POST", body: payload }),
    alerts: (userId) => callPython("/api/emergency/alerts", { query: { user_id: userId } }),
    respond: (payload) => callPython("/api/emergency/alerts/respond", { method: "POST", body: payload }),
  },
  telemetry: {
    robot: (payload) => callPython("/api/telemetry/robot", { method: "POST", body: payload }),
    latest: () => callPython("/api/telemetry/robot/latest"),
    saveTrip: (payload) => callPython("/api/telemetry/trips", { method: "POST", body: payload }),
    trips: (userId) => callPython("/api/telemetry/trips", { query: { user_id: userId } }),
    stats: () => callPython("/api/telemetry/stats"),
  },
};
