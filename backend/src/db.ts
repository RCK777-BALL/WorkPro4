import PrismaPkg from '@prisma/client';

const { PrismaClient } = PrismaPkg;
type PrismaNamespace = typeof PrismaPkg.Prisma;
type PrismaOptions = PrismaNamespace['PrismaClientOptions'];

export function sanitizeDatabaseUrl(rawUrl: string | undefined) {
  if (!rawUrl) {
    return undefined;
  }

  const trimmedUrl = rawUrl.trim();

  const queryIndex = trimmedUrl.indexOf('?');

  if (queryIndex === -1) {
    return `${trimmedUrl}?directConnection=true`;
  }

  const base = trimmedUrl.slice(0, queryIndex);
  const query = trimmedUrl.slice(queryIndex + 1);
  const searchParams = new URLSearchParams(query);

  const hasReplicaSet = searchParams.has('replicaSet');
  const hasDirectConnection = searchParams.has('directConnection');

  if (!hasReplicaSet && !hasDirectConnection) {
    searchParams.set('directConnection', 'true');
    const rebuiltQuery = searchParams.toString();
    return `${base}?${rebuiltQuery}`;
  }

  return trimmedUrl;
}

function getPrismaClientOptions(): PrismaOptions | undefined {
  const databaseUrl = sanitizeDatabaseUrl(process.env.DATABASE_URL);

  if (!databaseUrl) {
    return undefined;
  }

  return {
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  };
}

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.prisma ??
  new PrismaClient(getPrismaClientOptions());

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export async function verifyDatabaseConnection() {
  await prisma.$connect();
  await prisma.$runCommandRaw({ ping: 1 });
}
