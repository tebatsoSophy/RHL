import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import ZonesMap from "../components/ZonesMap";
import { zoneStatusClass } from "../statusHelpers";

export default function ZoneDetail() {
  const { id } = useParams();
  const [zone, setZone] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getPublicZones(), api.getPublicZoneActivities(id)])
      .then(([zonesData, activityData]) => {
        const match = zonesData.find((z) => String(z.id) === String(id));
        setZone(match || null);
        setActivities(activityData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page">Loading zone record…</div>;
  if (error) return <div className="page">Couldn't load this zone: {error}</div>;
  if (!zone) return <div className="page">Zone not found.</div>;

  return (
    <div className="page">
      <div className="zone-header" style={{ display: "block" }}>
        <Link to="/" className="back">
          ← All zones
        </Link>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <h1 style={{ fontSize: "1.7rem" }}>{zone.name}</h1>
          <span className={`status-pill ${zoneStatusClass(zone.status)}`}>
            {zone.status.toLowerCase()}
          </span>
        </div>
        <p style={{ color: "var(--color-ink-soft)", marginTop: 4 }}>{zone.mine_name}</p>
      </div>

      <dl className="zone-stats">
        <div>
          <dt>Area</dt>
          <dd>{zone.area_hectares} ha</dd>
        </div>
        <div>
          <dt>Coordinates</dt>
          <dd>
            {zone.latitude}, {zone.longitude}
          </dd>
        </div>
        <div>
          <dt>Mine</dt>
          <dd style={{ fontFamily: "var(--font-body)" }}>{zone.mine_name}</dd>
        </div>
      </dl>

      <div className="hero-map" style={{ height: 280, marginBottom: 40 }}>
        <ZonesMap zones={[zone]} center={[zone.latitude, zone.longitude]} zoom={12} />
      </div>

      <div className="ledger-heading">
        <h2>Confirmed rehabilitation activities</h2>
        <span className="ledger-count">{activities.length} approved</span>
      </div>

      <div>
        {activities.map((activity) => (
          <div key={activity.id} className="activity-row">
            <span className="date">{activity.activity_date}</span>
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
            <span style={{ color: "var(--color-ink-soft)" }}>
              {activity.performed_by_name || "—"}
              {activity.performed_by_company && (
                <div style={{ fontSize: "0.78rem" }}>{activity.performed_by_company}</div>
              )}
            </span>
          </div>
        ))}
        {activities.length === 0 && (
          <div className="empty-state">
            No independently confirmed activities yet for this zone.
          </div>
        )}
      </div>
    </div>
  );
}
