import { useState } from "react";

import { api } from "../services/api.js";

const PLACE_TYPES = [
  { key: "hospital", label: "🏥 Hospitals", icon: "🏥" },
  { key: "police", label: "🚓 Police", icon: "🚓" },
  { key: "fuel", label: "⛽ Fuel", icon: "⛽" },
  { key: "hotel", label: "🏨 Hotels", icon: "🏨" },
  { key: "pharmacy", label: "💊 Pharmacy", icon: "💊" },
  { key: "restaurant", label: "🍽️ Food", icon: "🍽️" },
];

export default function NearbySearch({ userPos, onPlaces }) {
  const [activeType, setActiveType] = useState(null);
  const [places, setPlaces] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function search(type) {
    if (!userPos) {
      setError("Your location isn't available yet. Please allow GPS access.");
      return;
    }
    setBusy(true);
    setError(null);
    setActiveType(type);
    try {
      const { places } = await api.gis.nearby({
        lat: userPos.lat,
        lng: userPos.lng,
        type,
        radius: 5000,
      });
      setPlaces(places);
      onPlaces(places);
    } catch (err) {
      setError(err.message);
      setPlaces([]);
      onPlaces([]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel nearby">
      <h3>📍 Nearby places</h3>
      <div className="type-buttons">
        {PLACE_TYPES.map((t) => (
          <button
            key={t.key}
            type="button"
            className={activeType === t.key ? "active" : ""}
            onClick={() => search(t.key)}
            disabled={busy}
          >
            {t.label}
          </button>
        ))}
      </div>
      {error && <p className="alert alert-danger">{error}</p>}
      {places.length > 0 && (
        <ul className="place-list">
          {places.map((p, i) => (
            <li key={i}>
              {PLACE_TYPES.find((t) => t.key === activeType)?.icon} {p.name}
              {p.phone ? <span className="muted"> · {p.phone}</span> : null}
              {p.opening_hours ? <span className="muted"> · {p.opening_hours}</span> : null}
            </li>
          ))}
        </ul>
      )}
      {places.length === 0 && !error && activeType && !busy && (
        <p className="muted">No places found within range.</p>
      )}
    </div>
  );
}
