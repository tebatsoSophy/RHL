import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { Link } from "react-router-dom";
import { zoneStatusColor } from "../statusHelpers";

// zones: [{ id, name, mine_name, status, latitude, longitude }]
export default function ZonesMap({ zones, center = [-28.5, 25.5], zoom = 5 }) {
  return (
    <MapContainer center={center} zoom={zoom} scrollWheelZoom={false}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      {zones.map((zone) => (
        <CircleMarker
          key={zone.id}
          center={[zone.latitude, zone.longitude]}
          radius={7}
          pathOptions={{
            color: zoneStatusColor(zone.status),
            fillColor: zoneStatusColor(zone.status),
            fillOpacity: 0.85,
          }}
        >
          <Popup>
            <strong>{zone.name}</strong>
            <br />
            {zone.mine_name}
            <br />
            <Link to={`/zones/${zone.id}`}>View rehabilitation record</Link>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
