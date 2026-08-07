import { useState } from "react";

import { api } from "../services/api.js";

export default function RoutePlanner({ userPos, onRoute }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [routing, setRouting] = useState(false);
  const [active, setActive] = useState(null);

  async function search(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setActive(null);
    try {
      const { results } = await api.gis.geocode(query);
      setResults(results);
    } catch (err) {
      setResults([]);
      alert(`Search failed: ${err.message}`);
    } finally {
      setSearching(false);
    }
  }

  async function pick(place) {
    if (!userPos) {
      alert("Your location isn't available yet. Please allow GPS access.");
      return;
    }
    setRouting(true);
    setActive(place);
    try {
      const route = await api.gis.route({
        start_lat: userPos.lat,
        start_lng: userPos.lng,
        end_lat: place.lat,
        end_lng: place.lng,
      });
      onRoute({ route, destination: place });
    } catch (err) {
      alert(`Routing failed: ${err.message}`);
      setActive(null);
    } finally {
      setRouting(false);
    }
  }

  function formatKm(m) {
    return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(2)} km`;
  }

  function formatMin(s) {
    return s < 60 ? `${Math.round(s)} sec` : `${Math.round(s / 60)} min`;
  }

  return (
    <div className="panel route-planner">
      <h3>🗺️ Route planner</h3>
      <form className="inline-form" onSubmit={search}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search destination…"
        />
        <button type="submit" className="btn btn-primary" disabled={searching || !query.trim()}>
          {searching ? "…" : "Search"}
        </button>
      </form>

      {results.length > 0 && (
        <ul className="place-list">
          {results.map((r, i) => (
            <li key={i}>
              <button type="button" onClick={() => pick(r)} disabled={routing || !userPos}>
                <span>{r.display_name}</span>
                <em>{active === r ? (routing ? "Routing…" : "Selected") : "Route →"}</em>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function RouteSummary({ activeRoute }) {
  if (!activeRoute) return null;
  const { route, destination } = activeRoute;
  return (
    <div className="panel route-summary">
      <h3>📍 Route to {destination?.name || "destination"}</h3>
      <p>
        {formatKm(route.distance_m)} · {formatMin(route.duration_s)} driving time
      </p>
      {route.steps?.length > 0 && (
        <ol className="step-list">
          {route.steps.slice(0, 5).map((s, i) => (
            <li key={i}>
              {s.instruction?.replace("_", " ").toUpperCase()} onto {s.name || "road"} ·{" "}
              {formatKm(s.distance_m)}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
