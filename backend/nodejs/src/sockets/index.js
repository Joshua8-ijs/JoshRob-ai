import { Server } from "socket.io";

/**
 * Real-time layer between the web dashboards, the Node gateway and the
 * robot controller. Also exposes a channel the ESP32 can connect to
 * directly for live telemetry.
 */
export function setupSockets(httpServer, robotController) {
  const io = new Server(httpServer, {
    cors: { origin: "*" },
    transports: ["websocket", "polling"],
  });

  robotController.startSimulation();

  io.on("connection", (socket) => {
    const unsubscribe = robotController.subscribe((state) => {
      socket.emit("robot:telemetry", state);
    });

    socket.emit("robot:telemetry", robotController.status());

    socket.on("robot:command", ({ command }) => {
      try {
        const state = robotController.applyCommand(command);
        io.emit("robot:telemetry", state);
      } catch (err) {
        socket.emit("robot:error", { error: err.message });
      }
    });

    // ESP32 hardware channel: `robot:telemetry` inbound from firmware.
    socket.on("esp32:telemetry", (sample) => {
      robotController.applyTelemetry(sample || {});
      io.emit("robot:telemetry", robotController.status());
    });

    socket.on("disconnect", () => unsubscribe());
  });

  return io;
}
