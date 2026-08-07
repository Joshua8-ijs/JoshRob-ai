import { io } from "socket.io-client";

import { getToken } from "./api.js";

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(window.location.origin, {
      transports: ["websocket", "polling"],
      auth: { token: getToken() },
      autoConnect: true,
    });
    socket.on("connect_error", () => {
      // Gateway may be briefly offline; socket.io reconnects automatically.
    });
  }
  return socket;
}

export function closeSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function onRobotTelemetry(callback) {
  const s = getSocket();
  s.on("robot:telemetry", callback);
  return () => s.off("robot:telemetry", callback);
}

export function sendRobotCommand(command) {
  getSocket().emit("robot:command", { command });
}

export default getSocket;
