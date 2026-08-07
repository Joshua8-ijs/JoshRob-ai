import { Router } from "express";
import { config } from "../config.js";
import { requireAuth } from "../middleware/auth.js";
import { python } from "../services/pythonClient.js";
import { robotController } from "../services/robotController.js";

const VALID_COMMANDS = ["forward", "backward", "left", "right", "stop", "scan", "patrol"];

/**
 * Robot routes. Factory receives the socket.io server so commands and
 * telemetry can be broadcast in real time to every connected dashboard.
 *
 * The ESP32 hardware bridge authenticates with the shared ROBOT_BRIDGE_KEY
 * (X-Bridge-Key header) so it can push telemetry without a user JWT, while
 * dashboard clients are still required to authenticate.
 */
export default function robotRoutes(io) {
  const router = Router();

  const bridgeOrAuth = (req, res, next) => {
    if (config.robotBridgeKey && req.headers["x-bridge-key"] === config.robotBridgeKey) {
      req.isBridge = true;
      return next();
    }
    return requireAuth(req, res, next);
  };
  router.use(bridgeOrAuth);

  const broadcast = (event, payload) => io.emit(event, payload);

  router.get("/status", (_req, res) => {
    res.json({ robot: robotController.status() });
  });

  router.get("/commands", (_req, res) => {
    res.json({ commands: robotController.commandLog.slice(-50).reverse() });
  });

  router.post("/command", async (req, res, next) => {
    const { command } = req.body || {};
    if (!VALID_COMMANDS.includes(command)) {
      return res.status(400).json({ error: `command must be one of: ${VALID_COMMANDS.join(", ")}` });
    }
    try {
      const state = robotController.applyCommand(command, req.user?.sub ?? null);
      broadcast("robot:telemetry", state);

      // Persist the command for auditing.
      python.telemetry
        .robot({
          lat: state.lat,
          lng: state.lng,
          battery: state.battery,
          speed: state.speed,
          distance_cm: state.distance_cm,
          temperature: state.temperature,
        })
        .catch(() => {});

      const bridge = await robotController.dispatchToBridge(command);
      res.json({ robot: state, bridge });
    } catch (err) {
      next(err);
    }
  });

  // Endpoint used by the ESP32 firmware / hardware bridge to push live telemetry.
  router.post("/telemetry", async (req, res) => {
    const state = robotController.applyTelemetry(req.body || {});
    broadcast("robot:telemetry", state);
    python.telemetry.robot(state).catch(() => {});
    res.status(202).json({ ok: true });
  });

  router.get("/telemetry/latest", async (_req, res, next) => {
    try {
      res.json(await python.telemetry.latest());
    } catch (err) {
      next(err);
    }
  });

  return router;
}
