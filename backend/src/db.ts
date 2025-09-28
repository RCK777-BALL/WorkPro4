// /backend/src/db.ts
// Use named imports so the Prisma namespace is available for types
import { PrismaClient, Prisma } from "@prisma/client";
type PrismaNamespace = Prisma;
type PrismaClientType = PrismaClient;
type PrismaOptions = PrismaNamespace extends { PrismaClientOptions: infer O } ? O : any;

/**
 * Normalize Mongo connection strings for local dev so Prisma doesn't
 * require a replica set. We add ?directConnection=true when needed.
 */
export function sanitizeDatabaseUrl(rawUrl: string | undefined): string | undefined {
  if (!rawUrl) return undefined;
  const trimmed = rawUrl.trim();
  const qIdx = trimmed.indexOf("?");

  if (qIdx === -1) return `${trimmed}?directConnection=true`;

  const base = trimmed.slice(0, qIdx);
  const query = trimmed.slice(qIdx + 1);
  const params = new URLSearchParams(query);

  if (!params.has("replicaSet") && !params.has("directConnection")) {
    params.set("directConnection", "true");
  }
  return `${base}?${params.toString()}`;
}

function getPrismaClientOptions(): PrismaOptions | undefined {
  const url = sanitizeDatabaseUrl(process.env.DATABASE_URL);
  if (!url) return undefined;
  return { datasources: { db: { url } } } as PrismaOptions;
}

// Proper global singleton to survive hot reloads
declare global {
  // eslint-disable-next-line no-var
  var __workpro_prisma: PrismaClientType | undefined;
}

export const prisma: PrismaClientType =
  globalThis.__workpro_prisma ?? new PrismaClient(getPrismaClientOptions());

if (process.env.NODE_ENV !== "production") {
  globalThis.__workpro_prisma = prisma;
}

export async function verifyDatabaseConnection(): Promise<void> {
  try {
    await prisma.$connect();
    await prisma.$runCommandRaw({ ping: 1 });
    console.log("[db] ping ok");
  } catch (err: any) {
    const hint =
      "Check DATABASE_URL in /backend/.env. For local Mongo, try:\n" +
      '  DATABASE_URL="mongodb://127.0.0.1:27017/workpro4?directConnection=true"\n' +
      "If using a replica set, start mongod with --replSet and use ?replicaSet=rs0.";
    console.error("[db] connection failed:", err?.message || err);
    throw new Error(`${err?.message || "Database connection failed"}\n${hint}`);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  try { await prisma.$disconnect(); console.log("[db] disconnected (SIGINT)"); }
  finally { process.exit(0); }
});
process.on("SIGTERM", async () => {
  try { await prisma.$disconnect(); console.log("[db] disconnected (SIGTERM)"); }
  finally { process.exit(0); }
});
