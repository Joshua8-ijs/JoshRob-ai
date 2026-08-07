import http from "node:http";

import { createApp } from "./src/app.js";
import { config } from "./src/config.js";
import { robotController } from "./src/services/robotController.js";
import { setupSockets } from "./src/sockets/index.js";

const server = http.createServer();
const io = setupSockets(server, robotController);
const app = createApp(io);
server.on("request", app);

server.listen(config.port, () => {
  console.log(`[joshrob] Node gateway listening on http://0.0.0.0:${config.port}`);
  console.log(`[joshrob] Python service: ${config.pythonServiceUrl}`);
  console.log(`[joshrob] Robot source: ${config.robotBridgeUrl || "built-in simulator"}`);
});
