// /backend/src/server.ts
import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import { connectMongo } from "./config/mongo";

// ---- Configuration ----
const PORT = Number(process.env.PORT || 5010);
const NODE_ENV = process.env.NODE_ENV || "development";
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

// ---- Create App ----
export const app = express();

// Basic middleware
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Dev request logging without extra deps
if (NODE_ENV !== "production") {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// ---- Health & Utility Routes ----
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    env: NODE_ENV,
    time: new Date().toISOString(),
    uptimeSec: Math.round(process.uptime()),
  });
});

app.get("/api/version", (_req, res) => {
  // If you want to pull this from package.json, enable resolveJsonModule and import it.
  res.json({ app: "WorkPro4 API", version: process.env.APP_VERSION ?? "0.1.0" });
});

// ---- Example API namespaces (plug in your routers here) ----
// import authRouter from "./routes/authRoutes";
// import workOrdersRouter from "./routes/workOrdersRoutes";
// app.use("/api/auth", authRouter);
// app.use("/api/work-orders", workOrdersRouter);

// ---- 404 for unknown API routes ----
app.use("/api", (_req, res) => {
  res.status(404).json({ error: { code: 404, message: "API route not found" } });
});

// ---- Error Handler (typed & safe) ----
interface HttpError extends Error {
  status?: number;
  statusCode?: number;
  details?: unknown;
}

app.use((err: HttpError, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status ?? err.statusCode ?? 500;
  const message = err.message || "Internal Server Error";
  const payload: { error: { code: number; message: string; details?: unknown } } = {
    error: { code: status, message },
  };
  if (err.details) payload.error.details = err.details;

  if (NODE_ENV !== "production") {
    console.error("[error]", err);
  }
  res.status(status).json(payload);
});

// ---- Bootstrapping ----
async function bootstrap() {
  try {
    // Connect to Mongo first
    await connectMongo();

    // Start server
    app.listen(PORT, () => {
      console.log(`API listening on http://localhost:${PORT}`);
      console.log(`CORS allowed origin: ${FRONTEND_ORIGIN}`);
    });
  } catch (err) {
    console.error("[bootstrap] failed to start server:", err);
    process.exit(1);
  }
}

// Global safety nets
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
});

bootstrap();
