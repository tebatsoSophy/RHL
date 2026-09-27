import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import ZonesMap from "../components/ZonesMap";
import { zoneStatusClass } from "../statusHelpers";

export default function ReviewerDashboard() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("rehabledger_user") || "null");

  useEffect(() => {
    if (!localStorage.getItem("rehabledger_token")) {
      navigate("/login");
      return;
    }
    api
      .getMyReviewZones()
      .then((data) => setZones(data.zones))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [navigate]);

  function handleSignOut() {
    localStorage.removeItem("rehabledger_token");
    localStorage.removeItem("rehabledger_user");
    navigate("/login");
  }

  if (loading) return <div className="page">Loading your review zones…</div>;
  if (error) return <div className="page">Couldn't load your zones: {error}</div>;

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
          <h1 style={{ fontSize: "1.7rem" }}>Zones assigned to you for review</h1>
          {user?.name && (
            <p style={{ color: "var(--color-ink-soft)", marginTop: 4 }}>
              Signed in as {user.name} · {user.role?.toLowerCase()}
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

      {zones.length > 0 && (
        <div className="hero-map" style={{ height: 320, marginBottom: 40 }}>
          <ZonesMap zones={zones} />
        </div>
      )}

      <div className="ledger-heading">
        <h2>Zones</h2>
        <span className="ledger-count">{zones.length} assigned</span>
      </div>

      <div className="ledger">
        {zones.map((zone) => (
          <div key={zone.id} className="ledger-row" style={{ cursor: "default" }}>
            <span className="name">{zone.name}</span>
            <span className="meta">{zone.mine_name}</span>
            <span className="meta">{zone.area_hectares} ha</span>
            <span className={`status-pill ${zoneStatusClass(zone.status)}`}>
              {zone.status.toLowerCase()}
            </span>
          </div>
        ))}
        {zones.length === 0 && (
          <div className="empty-state">
            You haven't been assigned to any zones yet.
          </div>
        )}
      </div>

      <p style={{ marginTop: 32, color: "var(--color-ink-soft)", fontSize: "0.9rem" }}>
        Reviewing and approving individual activities is coming next.
      </p>
    </div>
  );
}
