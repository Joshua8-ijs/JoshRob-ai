import { useEffect, useState } from "react";

import MapView from "../components/MapView.jsx";
import Navbar from "../components/Navbar.jsx";
import RobotStatus from "../components/RobotStatus.jsx";
import { api } from "../services/api.js";
import { onRobotTelemetry, sendRobotCommand } from "../services/socket.js";

const COMMANDS = [
  { key: "forward", label: "⬆️ Forward" },
  { key: "left", label: "⬅️ Left" },
  { key: "stop", label: "⏹️ Stop" },
  { key: "right", label: "➡️ Right" },
  { key: "backward", label: "⬇️ Backward" },
  { key: "scan", label: "🔍 Scan" },
  { key: "patrol", label: "🚨 Patrol" },
];

const FALLBACK_LOCATION = { lat: 9.0643305, lng: 7.4892974 };

export default function Robot() {
  const [robot, setRobot] = useState(null);
  const [commands, setCommands] = useState([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    api.robot
      .status()
      .then(({ robot }) => setRobot(robot))
      .catch(() => {});
    api.robot
      .commands()
      .then(({ commands }) => setCommands(commands))
      .catch(() => {});
    const unsub = onRobotTelemetry(setRobot);
    return unsub;
  }, []);

  async function run(command) {
    setNotice("");
    try {
      const { robot } = await api.robot.command({ command });
      setRobot(robot);
      setCommands((c) => [{ command, at: new Date().toISOString() }, ...c].slice(0, 20));
      setNotice(`Command sent: ${command}`);
    } catch (err) {
      setNotice(`Failed: ${err.message}`);
    }
    sendRobotCommand(command);
  }

  return (
    <div className="robot-page">
      <Navbar />
      <div className="dashboard-toolbar">
        <div className="toolbar-left">
          <h1>Robotics control</h1>
          <p className="muted">Drive the JoshRob unit and monitor its live telemetry.</p>
        </div>
        {notice && <div className="notice robot-notice">{notice}</div>}
      </div>

      <div className="robot-grid">
        <div className="robot-map">
          <MapView userPos={FALLBACK_LOCATION} robotPos={robot} />
        </div>

        <div className="robot-controls">
          <RobotStatus robot={robot} />
          <div className="pad">
            {COMMANDS.map((c) => (
              <button
                key={c.key}
                type="button"
                className={`pad-btn pad-${c.key} ${robot?.command === c.key ? "active" : ""}`}
                onClick={() => run(c.key)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {commands.length > 0 && (
        <div className="panel command-log">
          <h3>Command history</h3>
          <table>
            <thead>
              <tr>
                <th>Command</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {commands.map((c, i) => (
                <tr key={i}>
                  <td>
                    <code>{c.command}</code>
                  </td>
                  <td className="muted">{new Date(c.at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
