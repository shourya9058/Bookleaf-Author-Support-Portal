import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL || "",
  jwtSecret: process.env.JWT_SECRET || "bookleaf_portal_secure_jwt_secret_change_in_production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  aiMockMode: process.env.AI_MOCK_MODE === "true",
  aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS) || 15000,
};

if (!config.jwtSecret) {
  throw new Error("JWT_SECRET must be configured in environment variables");
}
