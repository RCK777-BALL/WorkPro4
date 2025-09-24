// /backend/src/config/mongo.ts
import mongoose from "mongoose";

/**
 * Connect to MongoDB using Mongoose.
 * Reads connection string from process.env.MONGO_URL
 * Example: MONGO_URL=mongodb://localhost:27017/workpro4
 */

const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  // Fail fast so you notice missing env early
  throw new Error("Missing MONGO_URL in environment. Add it to /backend/.env");
}

let connPromise: Promise<typeof mongoose> | null = null;

export async function connectMongo(): Promise<typeof mongoose> {
  if (connPromise) return connPromise;

  // Recommended flags for Mongoose 7+
  mongoose.set("strictQuery", true);

  connPromise = mongoose
    .connect(MONGO_URL!, {
      // You can add replica set / auth options here if needed
      // dbName: "workpro4", // optional if not baked into the URL
    })
    .then((conn) => {
      console.log("[mongo] connected:", conn.connection.name, "@", conn.connection.host);
      return conn;
    })
    .catch((err) => {
      console.error("[mongo] connection error:", err);
      // Re-throw so the app can decide to exit or retry
      throw err;
    });

  // Clean shutdown
  process.on("SIGINT", async () => {
    await mongoose.connection.close();
    console.log("[mongo] connection closed (SIGINT)");
    process.exit(0);
  });
  process.on("SIGTERM", async () => {
    await mongoose.connection.close();
    console.log("[mongo] connection closed (SIGTERM)");
    process.exit(0);
  });

  return connPromise;
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.connection.close();
  console.log("[mongo] disconnected");
}
