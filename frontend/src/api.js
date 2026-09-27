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

  // Authenticated — general zones list (used by Admin to pick a zone for an invite)
  getAllZones: () => request("/zones"),

  // Auth — adjust the path/shape to match your actual login route
  login: (email, password) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  // Invitations
  verifyInvitation: (token) =>
    request(`/invitations/verify?token=${encodeURIComponent(token)}`),

  acceptInvitation: ({ token, otp, name, password }) =>
    request("/invitations/accept", {
      method: "POST",
      body: JSON.stringify({ token, otp, name, password }),
    }),

  // Worker
  getMyZones: () => request("/workers/zones"),
  getZoneActivities: (zoneId) => request(`/activities/zone/${zoneId}`),
  createActivity: ({ zoneId, activityType, description, measurement, unit, activityDate }) =>
    request("/activities", {
      method: "POST",
      body: JSON.stringify({ zoneId, activityType, description, measurement, unit, activityDate }),
    }),

  // Evidence — file uploads need their own request path (no JSON headers, browser sets the boundary)
  uploadEvidence: async (activityId, file) => {
    const token = localStorage.getItem("rehabledger_token");
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/evidence/${activityId}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `Upload failed (${res.status})`);
    }
    return res.json();
  },
  getActivityEvidence: (activityId) => request(`/evidence/${activityId}`),
  verifyEvidence: (evidenceId) => request(`/evidence/verify/${evidenceId}`),

  // Admin
  getCompanies: () => request("/companies"),
  getInvitations: () => request("/invitations"),
  createInvitation: ({ email, companyId, zoneId, role }) =>
    request("/invitations", {
      method: "POST",
      body: JSON.stringify({ email, companyId, zoneId, role }),
    }),

  // Reviewer (Specialist / Regulator)
  getMyReviewZones: () => request("/reviewers/zones"),
};
