import { config } from "../config.js";

const COMMAND_SPEEDS = {
  forward: { speed: 1.4, heading: null, label: "Moving forward" },
  backward: { speed: -1.2, heading: null, label: "Moving backward" },
  left: { speed: 0, heading: -90, label: "Turning left" },
  right: { speed: 0, heading: 90, label: "Turning right" },
  stop: { speed: 0, heading: null, label: "Stopped" },
  scan: { speed: 0, heading: 0, label: "Scanning surroundings" },
  patrol: { speed: 0.9, heading: 0, label: "Patrolling perimeter" },
};

/**
 * RobotController keeps the canonical state of the physical robot.
 *
 * In a production deployment an ESP32 posts telemetry to
 * POST /api/robot/telemetry (or over a socket.io channel). When no
 * hardware is connected the controller runs a deterministic simulator so
 * the dashboard, AI assistant and SOS flows can be demoed end-to-end.
 */
export class RobotController {
  constructor() {
    this.reset();
    this._simulation = null;
    this._subscribers = new Set();
    this.commandLog = [];
  }

  reset() {
    this.state = {
      connected: false,
      source: "simulator",
      mode: "idle",
      command: "stop",
      battery: 82,
      speed: 0,
      heading: 0,
      lat: 9.0643305,
      lng: 7.4892974,
      temperature: 31,
      distance_cm: 12,
      obstacleDetected: false,
      lastSeen: null,
      lastCommand: null,
    };
  }

  subscribe(fn) {
    this._subscribers.add(fn);
    return () => this._subscribers.delete(fn);
  }

  emit() {
    for (const fn of this._subscribers) fn({ ...this.state, lastSeen: new Date().toISOString() });
  }

  /** Start simulated motion so the dashboard shows live telemetry. */
  startSimulation(intervalMs = 1500) {
    if (this._simulation) return;
    this.state.connected = true;
    this._simulation = setInterval(() => {
      if (!this.state.connected) return;
      this.tick();
      this.emit();
    }, intervalMs);
  }

  stopSimulation() {
    if (this._simulation) clearInterval(this._simulation);
    this._simulation = null;
  }

  tick() {
    const s = this.state;
    // Drift battery and heat over time.
    s.battery = Math.max(0, s.battery - 0.04);
    s.temperature = Math.min(70, s.temperature + 0.02);
    // Move along heading if there is velocity.
    const rad = (s.heading * Math.PI) / 180;
    s.lat += (s.speed * Math.cos(rad)) / 111320;
    s.lng += (s.speed * Math.sin(rad)) / (111320 * Math.cos((s.lat * Math.PI) / 180));
    s.distance_cm = Math.max(0, s.distance_cm + s.speed * 20 * Math.sign(s.speed));
  }

  applyCommand(command, userId = null) {
    const spec = COMMAND_SPEEDS[command];
    if (!spec) throw new Error(`Unknown robot command: ${command}`);

    const s = this.state;
    s.mode = command === "stop" ? "idle" : "manual";
    s.command = command;
    s.speed = spec.speed;
    if (spec.heading !== null) s.heading = (s.heading + spec.heading + 360) % 360;
    s.lastCommand = { command, at: new Date().toISOString(), by: userId };
    this.commandLog.push(s.lastCommand);
    if (this.commandLog.length > 100) this.commandLog.shift();
    this.emit();
    return { ...this.state, lastSeen: new Date().toISOString() };
  }

  applyTelemetry(sample) {
    const s = this.state;
    s.connected = true;
    s.source = "esp32";
    s.lat = sample.lat ?? s.lat;
    s.lng = sample.lng ?? s.lng;
    s.battery = sample.battery ?? s.battery;
    s.speed = sample.speed ?? s.speed;
    s.heading = sample.heading ?? s.heading;
    s.temperature = sample.temperature ?? s.temperature;
    s.distance_cm = sample.distance_cm ?? s.distance_cm;
    s.obstacleDetected = sample.obstacleDetected ?? s.obstacleDetected;
    s.lastSeen = new Date().toISOString();
    this.emit();
    return { ...s };
  }

  status() {
    return { ...this.state, lastSeen: this.state.lastSeen ?? new Date().toISOString() };
  }

  /** Forward a command to a live robot bridge if configured. */
  async dispatchToBridge(command) {
    if (!config.robotBridgeUrl) return { forwarded: false, reason: "no bridge configured" };
    try {
      const response = await fetch(`${config.robotBridgeUrl}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });
      return { forwarded: true, status: response.status };
    } catch (err) {
      return { forwarded: false, reason: err.message };
    }
  }
}

export const robotController = new RobotController();
