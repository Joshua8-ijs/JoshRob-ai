import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import AssistantChat from "../components/AssistantChat.jsx";
import MapView from "../components/MapView.jsx";
import Navbar from "../components/Navbar.jsx";
import NearbySearch from "../components/NearbySearch.jsx";
import RoutePlanner, { RouteSummary } from "../components/RoutePlanner.jsx";
import RobotStatus from "../components/RobotStatus.jsx";
import SosModal from "../components/SosModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../services/api.js";
import { onRobotTelemetry, sendRobotCommand } from "../services/socket.js";

const FALLBACK_LOCATION = { lat: 9.0643305, lng: 7.4892974 };

export default function Dashboard() {
  const { user } = useAuth();
  const [userPos, setUserPos] = useState(null);
  const [address, setAddress] = useState("");
  const [robot, setRobot] = useState(null);
  const [route, setRoute] = useState(null);
  const [nearby, setNearby] = useState([]);
  const [stats, setStats] = useState(null);
  const [sosOpen, setSosOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const noticeTimer = useRef(null);

  // Live GPS position with graceful fallback.
  useEffect(() => {
    if (!navigator.geolocation) {
      setUserPos(FALLBACK_LOCATION);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setUserPos(FALLBACK_LOCATION),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  // Real-time robot telemetry over socket.io.
  useEffect(() => onRobotTelemetry(setRobot), []);

  // Platform stats for the dashboard header.
  useEffect(() => {
    api
      .stats()
      .then((d) => setStats(d.stats))
      .catch(() => {});
  }, []);

  // Reverse-geocode the user position once available.
  useEffect(() => {
    if (!userPos) return;
    api.gis
      .reverse(userPos.lat, userPos.lng)
      .then((d) => setAddress(d.address))
      .catch(() => {});
  }, [userPos]);

  const flash = useCallback(
    (msg) => {
      setNotice(msg);
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
      noticeTimer.current = setTimeout(() => setNotice(""), 6000);
    },
    []
  );

  const setActiveRoute = useCallback(
    async ({ route, destination }) => {
      setRoute({ route, destination });
      api.trips
        .save({
          origin: address || `${userPos.lat.toFixed(5)}, ${userPos.lng.toFixed(5)}`,
          destination: destination.display_name,
          start_lat: userPos.lat,
          start_lng: userPos.lng,
          end_lat: destination.lat,
          end_lng: destination.lng,
          distance_m: route.distance_m,
          duration_s: route.duration_s,
        })
        .catch(() => {});
    },
    [address, userPos]
  );

  const handleAssistantResult = useCallback(
    (result) => {
      switch (result.intent) {
        case "navigate":
          if (result.route) {
            setRoute({
              route: {
                distance_m: result.route.distance_m,
                duration_s: result.route.duration_s,
                steps: [],
                coordinates: result.route.geometry?.coordinates || [],
              },
              destination: {
                name: result.route.destination,
                lat: result.route.dest_lat,
                lng: result.route.dest_lng,
              },
            });
            flash("Route plotted on the map.");
          }
          break;
        case "nearby":
          if (result.nearby?.length) {
            setNearby(result.nearby);
            flash(`Found ${result.nearby.length} ${result.place_type}(s) nearby.`);
          }
          break;
        case "where_am_i":
          if (result.address) flash(`You are near ${result.address}`);
          break;
        case "sos":
          setSosOpen(true);
          break;
        case "robot":
          api.robot
            .command({ command: result.robot_command })
            .then(({ robot }) => {
              setRobot(robot);
              flash(`Robot: ${result.robot_command}`);
            })
            .catch((err) => flash(err.message));
          sendRobotCommand(result.robot_command);
          break;
        case "robot_status":
          api.robot
            .status()
            .then(({ robot }) => {
              setRobot(robot);
              flash(
                `Robot battery ${Math.round(robot.battery)}% · ${robot.connected ? "connected" : "offline"}`
              );
            })
            .catch((err) => flash(err.message));
          break;
        default:
          break;
      }
    },
    [flash]
  );

  const robotRoute = useMemo(() => route, [route]);

  return (
    <div className="dashboard">
      <Navbar />
      <div className="dashboard-toolbar">
        <div className="toolbar-left">
          <h1>Navigation dashboard</h1>
          <p className="muted">
            Welcome, {user?.full_name?.split(" ")[0] || "user"}
            {address ? ` — near ${address}` : ""}
          </p>
        </div>
        <div className="toolbar-right">
          {stats && (
            <div className="stat-chips">
              <span className="chip-stat" title="Registered users">👥 {stats.users}</span>
              <span className="chip-stat" title="SOS alerts">🚨 {stats.sos_alerts}</span>
              <span className="chip-stat" title="Trips planned">🗺️ {stats.trips}</span>
              <span className="chip-stat" title="Robot telemetry samples">🤖 {stats.telemetry_samples}</span>
            </div>
          )}
          <button type="button" className="btn btn-danger" onClick={() => setSosOpen(true)}>
            🚨 SOS
          </button>
        </div>
      </div>

      {notice && <div className="notice">{notice}</div>}

      <div className="dashboard-grid">
        <div className="map-column">
          <MapView
            userPos={userPos}
            robotPos={robot}
            route={robotRoute}
            nearby={nearby}
            destination={route?.destination}
          />
          {route && (
            <div className="map-overlay">
              <RouteSummary activeRoute={route} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRoute(null)}>
                Clear route
              </button>
            </div>
          )}
          {robot && <div className="map-overlay map-overlay-bottom"><RobotStatus robot={robot} /></div>}
        </div>

        <aside className="side-column">
          <AssistantChat location={userPos} onResult={handleAssistantResult} />
          <RoutePlanner userPos={userPos} onRoute={setActiveRoute} />
          <NearbySearch userPos={userPos} onPlaces={setNearby} />
        </aside>
      </div>

      {sosOpen && <SosModal location={userPos} onClose={() => setSosOpen(false)} />}
    </div>
  );
}
