const API_BASE = "/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("rehabledger_token");

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }

  return res.json();
}

export const api = {
  // Public, unauthenticated endpoints
  getPublicMines: () => request("/public/mines"),
  getPublicZones: () => request("/public/zones"),
  getPublicZoneActivities: (zoneId) => request(`/public/zones/${zoneId}/activities`),

  // Auth — adjust the path/shape to match your actual login route
  login: (email, password) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
};
