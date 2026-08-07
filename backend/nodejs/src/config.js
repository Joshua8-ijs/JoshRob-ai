import "dotenv/config";

const env = process.env;

export const config = {
  port: Number(env.PORT || 5000),
  pythonServiceUrl: env.PYTHON_SERVICE_URL || "http://127.0.0.1:5001",
  jwtSecret: env.JWT_SECRET || "joshrob-dev-secret-change-me",
  jwtExpiresIn: env.JWT_EXPIRES_IN || "7d",
  corsOrigin: env.CORS_ORIGIN || "http://localhost:5173",
  frontendDist: env.FRONTEND_DIST || "../../frontend/dist",
  robotBridgeUrl: env.ROBOT_BRIDGE_URL || "",
  isProduction: env.NODE_ENV === "production",
};
