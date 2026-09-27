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
              <EvidencePanel activityId={activity.id} />
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

function EvidencePanel({ activityId }) {
  const [open, setOpen] = useState(false);
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [verifyResults, setVerifyResults] = useState({}); // evidenceId -> { matches, ... }
  const [verifying, setVerifying] = useState(null);

  function load() {
    setLoading(true);
    api
      .getActivityEvidence(activityId)
      .then(setEvidence)
      .catch((err) => setUploadError(err.message))
      .finally(() => setLoading(false));
  }

  function toggle() {
    if (!open) load();
    setOpen(!open);
  }

  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      await api.uploadEvidence(activityId, file);
      load();
    } catch (err) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = ""; // allow re-selecting the same file
    }
  }

  async function handleVerify(evidenceId) {
    setVerifying(evidenceId);
    try {
      const result = await api.verifyEvidence(evidenceId);
      setVerifyResults((prev) => ({ ...prev, [evidenceId]: result }));
    } catch (err) {
      setVerifyResults((prev) => ({
        ...prev,
        [evidenceId]: { error: err.message },
      }));
    } finally {
      setVerifying(null);
    }
  }

  return (
    <div style={{ marginTop: 4 }}>
      <button
        onClick={toggle}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          color: "var(--color-accent)",
          fontSize: "0.82rem",
          cursor: "pointer",
          textDecoration: "underline",
        }}
      >
        {open ? "Hide evidence" : "View / add evidence"}
      </button>

      {open && (
        <div
          style={{
            marginTop: 10,
            padding: 14,
            border: "1px solid var(--color-border)",
            background: "var(--color-surface)",
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: "inline-block",
                fontSize: "0.82rem",
                marginBottom: 6,
                color: "var(--color-ink-soft)",
              }}
            >
              Upload a report, photo, or CSV (max 15MB)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf,text/csv"
              onChange={handleFileChange}
              disabled={uploading}
            />
            {uploading && <p style={{ fontSize: "0.82rem" }}>Uploading…</p>}
            {uploadError && <p style={{ fontSize: "0.82rem", color: "var(--color-oxide)" }}>{uploadError}</p>}
          </div>

          {loading ? (
            <p style={{ fontSize: "0.85rem" }}>Loading evidence…</p>
          ) : evidence.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "var(--color-ink-soft)" }}>
              No evidence uploaded yet.
            </p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {evidence.map((item) => {
                const result = verifyResults[item.id];
                return (
                  <li
                    key={item.id}
                    style={{
                      padding: "8px 0",
                      borderBottom: "1px solid var(--color-border)",
                      fontSize: "0.85rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <span>
                        {item.signed_url ? (
                          <a href={item.signed_url} target="_blank" rel="noreferrer">
                            {item.file_name}
                          </a>
                        ) : (
                          item.file_name
                        )}
                      </span>
                      <button
                        onClick={() => handleVerify(item.id)}
                        disabled={verifying === item.id}
                        style={{
                          background: "none",
                          border: "1px solid var(--color-border)",
                          padding: "3px 8px",
                          fontSize: "0.75rem",
                          cursor: "pointer",
                        }}
                      >
                        {verifying === item.id ? "Checking…" : "Verify integrity"}
                      </button>
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--color-ink-soft)" }}>
                      sha256: {item.sha256_hash.slice(0, 16)}…
                    </div>
                    {result && (
                      <div
                        style={{
                          marginTop: 4,
                          color: result.matches ? "var(--color-accent)" : "var(--color-oxide)",
                          fontSize: "0.78rem",
                        }}
                      >
                        {result.error
                          ? result.error
                          : result.matches
                          ? "✓ File matches the recorded hash — unaltered since upload."
                          : "⚠ File does NOT match the recorded hash — possible tampering."}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
