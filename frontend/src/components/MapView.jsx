import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DEFAULT_CENTER = [9.0643305, 7.4892974];

function makeRobotIcon() {
  return L.divIcon({
    className: "",
    html: '<div class="map-robot-pin">🤖</div>',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function makeUserIcon() {
  return L.divIcon({
    className: "",
    html: '<div class="map-user-pin"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export default function MapView({
  userPos,
  robotPos,
  route,
  nearby,
  destination,
  onMapClick,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef({ user: null, robot: null, route: null, places: L.layerGroup(), destination: null });

  useEffect(() => {
    const map = L.map(containerRef.current, { center: DEFAULT_CENTER, zoom: 14 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    layersRef.current.places.addTo(map);
    if (onMapClick) map.on("click", (e) => onMapClick(e.latlng));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [onMapClick]);

  // User position
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userPos) return;
    const layer = layersRef.current.user;
    if (layer) layer.setLatLng([userPos.lat, userPos.lng]);
    else {
      const marker = L.marker([userPos.lat, userPos.lng], { icon: makeUserIcon(), zIndexOffset: 500 })
        .addTo(map)
        .bindPopup("<strong>You</strong>");
      layersRef.current.user = marker;
    }
    map.panTo([userPos.lat, userPos.lng], { animate: true });
  }, [userPos]);

  // Robot position
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !robotPos || robotPos.lat == null || robotPos.lng == null) return;
    const layer = layersRef.current.robot;
    const latLng = [robotPos.lat, robotPos.lng];
    if (layer) layer.setLatLng(latLng);
    else {
      const marker = L.marker(latLng, { icon: makeRobotIcon(), zIndexOffset: 900 })
        .addTo(map)
        .bindPopup(
          `<strong>JoshRob unit</strong><br/>Battery ${Math.round(robotPos.battery ?? 0)}% · ` +
            `Heading ${Math.round(robotPos.heading ?? 0)}°`
        );
      layersRef.current.robot = marker;
    }
  }, [robotPos]);

  // Destination marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (layersRef.current.destination) {
      layersRef.current.destination.remove();
      layersRef.current.destination = null;
    }
    if (destination) {
      layersRef.current.destination = L.marker([destination.lat, destination.lng])
        .addTo(map)
        .bindPopup(`<strong>${destination.name || "Destination"}</strong>`);
    }
  }, [destination]);

  // Route polyline
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (layersRef.current.route) {
      layersRef.current.route.remove();
      layersRef.current.route = null;
    }
    if (route?.coordinates?.length) {
      const latLngs = route.coordinates.map(([lng, lat]) => [lat, lng]);
      layersRef.current.route = L.polyline(latLngs, {
        color: "#2563eb",
        weight: 5,
        opacity: 0.85,
      }).addTo(map);
      const bounds = L.latLngBounds([latLngs, [userPos?.lat, userPos?.lng]].filter(Boolean));
      map.fitBounds(bounds, { padding: [48, 48] });
    }
  }, [route, userPos]);

  // Nearby places
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    layersRef.current.places.clearLayers();
    (nearby || []).forEach((place) => {
      if (place.lat == null || place.lng == null) return;
      L.marker([place.lat, place.lng])
        .addTo(layersRef.current.places)
        .bindPopup(
          `<strong>${place.name || "Place"}</strong><br/>${place.phone ? `📞 ${place.phone}<br/>` : ""}` +
            `${place.opening_hours ? `🕑 ${place.opening_hours}` : ""}`
        );
    });
  }, [nearby]);

  return <div ref={containerRef} className="map-view" aria-label="Map" />;
}
