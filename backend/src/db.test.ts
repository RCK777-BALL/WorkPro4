import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@prisma/client", () => {
  class PrismaClientMock {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(..._args: unknown[]) {}
  }

  return {
    PrismaClient: PrismaClientMock,
    Prisma: {},
  };
});

let sanitizeDatabaseUrl: (rawUrl: string | undefined) => string | undefined;

beforeAll(async () => {
  ({ sanitizeDatabaseUrl } = await import("./db"));
});

describe("sanitizeDatabaseUrl", () => {
  it("adds directConnection for standalone mongodb URLs without query", () => {
    const result = sanitizeDatabaseUrl("mongodb://127.0.0.1:27017/workpro4");
    expect(result).toBe("mongodb://127.0.0.1:27017/workpro4?directConnection=true");
  });

  it("appends directConnection when query lacks replicaSet/directConnection", () => {
    const result = sanitizeDatabaseUrl("mongodb://127.0.0.1:27017/workpro4?authSource=admin");
    expect(result).toBe(
      "mongodb://127.0.0.1:27017/workpro4?authSource=admin&directConnection=true",
    );
  });

  it("keeps replica set URLs untouched", () => {
    const url = "mongodb://127.0.0.1:27017/workpro4?replicaSet=rs0";
    expect(sanitizeDatabaseUrl(url)).toBe(url);
  });

  it("keeps multi-host mongodb URLs untouched", () => {
    const url = "mongodb://user:pass@host1:27017,host2:27017/workpro4";
    expect(sanitizeDatabaseUrl(url)).toBe(url);
  });

  it("leaves mongodb+srv URLs untouched", () => {
    const url = "mongodb+srv://cluster0.mongodb.net/workpro4?retryWrites=true";
    expect(sanitizeDatabaseUrl(url)).toBe(url);
  });
});
