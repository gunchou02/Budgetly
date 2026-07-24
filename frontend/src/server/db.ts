import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { requiredEnv } from '@/server/config';

const globalForPrisma = globalThis as unknown as {
  budgetlyPrisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const connectionString = requiredEnv('DATABASE_URL');

  if (connectionString.includes('.neon.tech')) {
    return new PrismaClient({
      adapter: new PrismaNeon({ connectionString }),
    });
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

export function getDb(): PrismaClient {
  if (!globalForPrisma.budgetlyPrisma) {
    globalForPrisma.budgetlyPrisma = createPrismaClient();
  }

  return globalForPrisma.budgetlyPrisma;
}
