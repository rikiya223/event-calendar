import { PrismaClient } from "@prisma/client";

// Next.js の開発時はホットリロードで何度も初期化されるため、
// グローバルに 1 インスタンスを保持して接続が増えすぎるのを防ぐ。
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
