import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  try {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    // Prisma v7 では driverAdapter を使ってDB接続する
    const adapter = new PrismaPg({ connectionString });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new PrismaClient({ adapter } as any);
  } catch {
    // ビルド時にDB URLが未設定の場合のフォールバック
    console.warn("PrismaClient の初期化に失敗しました（ビルド時は想定内です）");
    return new Proxy({} as PrismaClient, {
      get(_target, prop) {
        if (prop === "$disconnect") return () => Promise.resolve();
        return () => {
          throw new Error("PrismaClient is not initialized");
        };
      },
    });
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
