import express from "express";
import cors from "cors";
import helmet from "helmet";
import { fileURLToPath } from "url";
import { config } from "./config/env.js";
import authRoutes from "./routes/authRoutes.js";
import authorRoutes from "./routes/authorRoutes.js";
import ticketRoutes from "./routes/ticketRoutes.js";
import testAuthRoutes from "./routes/testAuthRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

export const app = express();
const PORT = config.port;

app.use(helmet());

app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  })
);

app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "BookLeaf API is running",
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/author", authorRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/test", testAuthRoutes);

// Error Handling Middleware
app.use(errorHandler);

const isMainModule =
  process.argv[1] &&
  (fileURLToPath(import.meta.url) === process.argv[1] ||
    process.argv[1].endsWith("server.ts") ||
    process.argv[1].endsWith("server.js"));

if (isMainModule) {
  app.listen(PORT, () => {
    console.log(`BookLeaf API running on port ${PORT}`);
  });
}