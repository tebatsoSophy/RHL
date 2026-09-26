import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import ZonesMap from "../components/ZonesMap";
import { zoneStatusClass } from "../statusHelpers";

export default function PublicDashboard() {
  const [zones, setZones] = useState([]);
  const [mines, setMines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([api.getPublicZones(), api.getPublicMines()])
      .then(([zonesData, minesData]) => {
        setZones(zonesData);
        setMines(minesData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="page">Loading rehabilitation records…</div>;
  }

  if (error) {
    return (
      <div className="page">
        <p>Couldn't load rehabilitation data: {error}</p>
      </div>
    );
  }

  // Count zones per mine for the ledger
  const zoneCountByMine = zones.reduce((acc, z) => {
    acc[z.mine_name] = (acc[z.mine_name] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="page">
      <h1 style={{ fontSize: "1.9rem", marginBottom: 8 }}>
        Rehabilitation across South Africa's mines
      </h1>
      <p style={{ color: "var(--color-ink-soft)", maxWidth: 560, marginBottom: 32 }}>
        Every zone shown here is drawn from evidence submitted by mines and confirmed
        by independent reviewers. Select a zone to see its full rehabilitation record.
      </p>

      <div className="hero-map">
        <ZonesMap zones={zones} />
      </div>

      <div className="ledger-heading">
        <h2>Mines on record</h2>
        <span className="ledger-count">{mines.length} registered</span>
      </div>

      <div className="ledger">
        {mines.map((mine) => (
          <div key={mine.id} className="ledger-row">
            <span className="name">{mine.name}</span>
            <span className="meta">{mine.location}</span>
            <span className="meta">
              {zoneCountByMine[mine.name] || 0} zone
              {(zoneCountByMine[mine.name] || 0) === 1 ? "" : "s"}
            </span>
            <span />
          </div>
        ))}
      </div>

      <div className="ledger-heading" style={{ marginTop: 48 }}>
        <h2>Rehabilitation zones</h2>
        <span className="ledger-count">{zones.length} tracked</span>
      </div>

      <div className="ledger">
        {zones.map((zone) => (
          <Link key={zone.id} to={`/zones/${zone.id}`} className="ledger-row">
            <span className="name">{zone.name}</span>
            <span className="meta">{zone.mine_name}</span>
            <span className="meta">{zone.area_hectares} ha</span>
            <span className={`status-pill ${zoneStatusClass(zone.status)}`}>
              {zone.status.toLowerCase()}
            </span>
          </Link>
        ))}
        {zones.length === 0 && (
          <div className="empty-state">No rehabilitation zones on record yet.</div>
        )}
      </div>
    </div>
  );
}
