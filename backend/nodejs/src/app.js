import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { config } from "./config.js";
import authRoutes from "./routes/auth.js";
import gisRoutes from "./routes/gis.js";
import aiRoutes from "./routes/ai.js";
import emergencyRoutes from "./routes/emergency.js";
import userRoutes from "./routes/user.js";
import robotRoutes from "./routes/robot.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp(io) {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin: config.corsOrigin.split(",").map((o) => o.trim()),
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan(config.isProduction ? "combined" : "dev"));

  app.get("/api/health", (_req, res) => {
    res.json({ service: "joshrob-node-gateway", status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/gis", gisRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/emergency", emergencyRoutes);
  app.use("/api", userRoutes);
  app.use("/api/robot", robotRoutes(io));

  // Serve the built React app in production.
  const distPath = path.resolve(__dirname, "..", config.frontendDist);
  if (existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  // Central error handler.
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: err.message || "Internal server error." });
  });

  return app;
}
