import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  try {
    return new PrismaClient();
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
