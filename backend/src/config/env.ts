import dotenv from "dotenv";

dotenv.config();

const DEFAULT_INSECURE_JWT_SECRET = "bookleaf_portal_secure_jwt_secret_change_in_production";

const isProduction = process.env.NODE_ENV === "production";
const rawJwtSecret = process.env.JWT_SECRET?.trim();

if (isProduction) {
  if (!rawJwtSecret || rawJwtSecret === DEFAULT_INSECURE_JWT_SECRET) {
    throw new Error(
      "In production, JWT_SECRET must be configured with a secure, non-default secret in environment variables."
    );
  }
}

export const config = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL || "",
  jwtSecret: rawJwtSecret || DEFAULT_INSECURE_JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  aiMockMode: process.env.AI_MOCK_MODE === "true",
  aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS) || 15000,
};

if (!config.jwtSecret) {
  throw new Error("JWT_SECRET must be configured in environment variables.");
}

