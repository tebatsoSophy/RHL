import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import StatusTracker from "../components/StatusTracker";
import { activityStatusClass } from "../statusHelpers";

export default function WorkerZoneActivities() {
  const { zoneId } = useParams();
  const navigate = useNavigate();

  const [zoneName, setZoneName] = useState("");
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activityType, setActivityType] = useState("");
  const [description, setDescription] = useState("");
  const [measurement, setMeasurement] = useState("");
  const [unit, setUnit] = useState("");
  const [activityDate, setActivityDate] = useState("");
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("rehabledger_token")) {
      navigate("/login");
      return;
    }
    loadActivities();
    // Zone name isn't returned by this endpoint, so pull it from the worker's zone list
    api
      .getMyZones()
      .then((data) => {
        const match = data.zones.find((z) => String(z.id) === String(zoneId));
        if (match) setZoneName(match.name);
      })
      .catch(() => {});
  }, [zoneId, navigate]);

  function loadActivities() {
    setLoading(true);
    api
      .getZoneActivities(zoneId)
      .then(setActivities)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await api.createActivity({
        zoneId,
        activityType,
        description,
        measurement: measurement ? Number(measurement) : null,
        unit,
        activityDate,
      });
      setActivityType("");
      setDescription("");
      setMeasurement("");
      setUnit("");
      setActivityDate("");
      loadActivities();
    } catch (err) {
      setFormError(err.message || "Could not log activity");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="page">Loading zone activities…</div>;
  if (error) return <div className="page">Couldn't load activities: {error}</div>;

  return (
    <div className="page">
      <Link to="/worker/dashboard" className="zone-header .back" style={{ display: "block", marginBottom: 12, fontSize: "0.85rem", color: "var(--color-ink-soft)" }}>
        ← Your zones
      </Link>
      <h1 style={{ fontSize: "1.6rem", marginBottom: 28 }}>
        {zoneName || "Zone"} — activity log
      </h1>

      <div
        style={{
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          padding: 24,
          marginBottom: 48,
          maxWidth: 480,
        }}
      >
        <h2 style={{ fontSize: "1.1rem", marginBottom: 16 }}>Log a new activity</h2>

        {formError && <div className="login-error">{formError}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="activityType">Activity type</label>
            <input
              id="activityType"
              type="text"
              placeholder="e.g. Revegetation, Erosion control, Water testing"
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="activityDate">Date performed</label>
            <input
              id="activityDate"
              type="date"
              value={activityDate}
              onChange={(e) => setActivityDate(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                fontSize: "0.95rem",
                color: "var(--color-ink)",
                resize: "vertical",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="measurement">Measurement</label>
              <input
                id="measurement"
                type="number"
                step="0.01"
                value={measurement}
                onChange={(e) => setMeasurement(e.target.value)}
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="unit">Unit</label>
              <input
                id="unit"
                type="text"
                placeholder="ha, m³, kg…"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="login-submit" disabled={submitting}>
            {submitting ? "Logging…" : "Log activity"}
          </button>
        </form>
      </div>

      <div className="ledger-heading">
        <h2>Activity history</h2>
        <span className="ledger-count">{activities.length} logged</span>
      </div>

      <div>
        {activities.map((activity) => (
          <div key={activity.id}>
            <div className="activity-row">
              <span className="date">{activity.activity_date?.slice(0, 10)}</span>
              <span>
                <strong>{activity.activity_type}</strong>
                {activity.description && (
                  <div style={{ color: "var(--color-ink-soft)", fontSize: "0.85rem" }}>
                    {activity.description}
                  </div>
                )}
              </span>
              <span>
                {activity.measurement != null
                  ? `${activity.measurement} ${activity.unit || ""}`
                  : "—"}
              </span>
              <span className={`status-pill ${activityStatusClass(activity.status)}`}>
                {activity.status.replace(/_/g, " ").toLowerCase()}
              </span>
            </div>
            <div style={{ padding: "0 4px 18px" }}>
              <StatusTracker status={activity.status} />
            </div>
          </div>
        ))}
        {activities.length === 0 && (
          <div className="empty-state">No activities logged for this zone yet.</div>
        )}
      </div>
    </div>
  );
}
