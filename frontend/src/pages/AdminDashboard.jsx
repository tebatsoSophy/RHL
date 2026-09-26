import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("rehabledger_user") || "null");

  const [zones, setZones] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [email, setEmail] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("rehabledger_token")) {
      navigate("/login");
      return;
    }
    loadData();
  }, [navigate]);

  function loadData() {
    setLoading(true);
    Promise.all([api.getAllZones(), api.getCompanies(), api.getInvitations()])
      .then(([zonesData, companiesData, invitationsData]) => {
        // Scope zones to this admin's own mine, since /api/zones returns all mines' zones
        const myZones = user?.mineId
          ? zonesData.filter((z) => z.mine_id === user.mineId)
          : zonesData;
        setZones(myZones);
        setCompanies(companiesData);
        setInvitations(invitationsData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  async function handleInvite(e) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);
    try {
      await api.createInvitation({ email, companyId, zoneId });
      setFormSuccess(`Invitation sent to ${email}.`);
      setEmail("");
      setCompanyId("");
      setZoneId("");
      loadData(); // refresh the invitations ledger
    } catch (err) {
      setFormError(err.message || "Could not send invitation");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSignOut() {
    localStorage.removeItem("rehabledger_token");
    localStorage.removeItem("rehabledger_user");
    navigate("/login");
  }

  if (loading) return <div className="page">Loading…</div>;
  if (error) return <div className="page">Couldn't load admin dashboard: {error}</div>;

  return (
    <div className="page">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          margin: "8px 0 28px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.7rem" }}>Admin dashboard</h1>
          {user?.name && (
            <p style={{ color: "var(--color-ink-soft)", marginTop: 4 }}>
              Signed in as {user.name}
            </p>
          )}
        </div>
        <button
          onClick={handleSignOut}
          style={{
            background: "none",
            border: "none",
            borderBottom: "1px solid var(--color-ink)",
            paddingBottom: 2,
            cursor: "pointer",
            fontSize: "0.85rem",
          }}
        >
          Sign out
        </button>
      </div>

      {/* --- Invite form --- */}
      <div
        style={{
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          padding: 24,
          marginBottom: 48,
          maxWidth: 480,
        }}
      >
        <h2 style={{ fontSize: "1.2rem", marginBottom: 16 }}>Invite a worker</h2>

        {formError && <div className="login-error">{formError}</div>}
        {formSuccess && (
          <div
            style={{
              background: "var(--color-accent-soft)",
              color: "var(--color-accent)",
              padding: "10px 12px",
              fontSize: "0.85rem",
              marginBottom: 18,
            }}
          >
            {formSuccess}
          </div>
        )}

        <form onSubmit={handleInvite}>
          <div className="field">
            <label htmlFor="email">Worker email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="company">Company</label>
            <select
              id="company"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                fontFamily: "var(--font-body)",
                fontSize: "0.95rem",
              }}
            >
              <option value="">Select a company…</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.company_type?.replace(/_/g, " ").toLowerCase()})
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="zone">Zone</label>
            <select
              id="zone"
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                fontFamily: "var(--font-body)",
                fontSize: "0.95rem",
              }}
            >
              <option value="">Select a zone…</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="login-submit" disabled={submitting}>
            {submitting ? "Sending…" : "Send invitation"}
          </button>
        </form>
      </div>

      {/* --- Invitations ledger --- */}
      <div className="ledger-heading">
        <h2>Invitations sent</h2>
        <span className="ledger-count">{invitations.length} total</span>
      </div>

      <div className="ledger">
        {invitations.map((inv) => (
          <div key={inv.id} className="ledger-row" style={{ gridTemplateColumns: "1.4fr 1fr 1fr auto" }}>
            <span className="name" style={{ fontSize: "0.95rem" }}>
              {inv.email}
            </span>
            <span className="meta">{inv.zone_name}</span>
            <span className="meta">{inv.company_name || "—"}</span>
            <span className={`status-pill ${inviteStatusClass(inv.status)}`}>
              {inv.status.toLowerCase()}
            </span>
          </div>
        ))}
        {invitations.length === 0 && (
          <div className="empty-state">No invitations sent yet.</div>
        )}
      </div>
    </div>
  );
}

function inviteStatusClass(status) {
  switch (status) {
    case "ACCEPTED":
      return "status-active";
    case "PENDING":
      return "status-monitoring";
    default:
      return "status-completed"; // EXPIRED / CANCELLED
  }
}
