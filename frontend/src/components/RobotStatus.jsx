export default function RobotStatus({ robot }) {
  if (!robot) return null;
  const pct = Math.max(0, Math.min(100, robot.battery ?? 0));
  return (
    <div className="robot-status-card">
      <div className="robot-status-head">
        <span className={`dot ${robot.connected ? "dot-on" : "dot-off"}`} />
        <strong>
          {robot.connected ? "Connected" : "Offline"} · {robot.source === "esp32" ? "ESP32 unit" : "Simulator"}
        </strong>
        <span className="muted">{robot.mode ?? "idle"}</span>
      </div>
      <div className="robot-gauges">
        <div className="gauge">
          <span className="gauge-value">{Math.round(pct)}%</span>
          <span className="gauge-label">Battery</span>
          <div className="bar">
            <div className="bar-fill" style={{ width: `${pct}%`, background: pct < 25 ? "#dc2626" : "#16a34a" }} />
          </div>
        </div>
        <div className="gauge">
          <span className="gauge-value">{robot.speed?.toFixed(1) ?? 0} m/s</span>
          <span className="gauge-label">Speed</span>
        </div>
        <div className="gauge">
          <span className="gauge-value">{Math.round(robot.heading ?? 0)}°</span>
          <span className="gauge-label">Heading</span>
        </div>
        <div className="gauge">
          <span className="gauge-value">{robot.temperature != null ? `${Math.round(robot.temperature)}°C` : "—"}</span>
          <span className="gauge-label">Temp</span>
        </div>
        <div className="gauge">
          <span className="gauge-value">{robot.distance_cm != null ? `${Math.round(robot.distance_cm)} cm` : "—"}</span>
          <span className="gauge-label">Obstacle</span>
        </div>
        <div className="gauge gauge-wide">
          <span className="gauge-value">
            {robot.lat != null && robot.lng != null
              ? `${robot.lat.toFixed(5)}, ${robot.lng.toFixed(5)}`
              : "—"}
          </span>
          <span className="gauge-label">GPS position</span>
        </div>
      </div>
      {robot.lastCommand && (
        <p className="muted">
          Last command: <strong>{robot.lastCommand.command}</strong> at{" "}
          {new Date(robot.lastCommand.at).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
