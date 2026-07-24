import { PrismaClient } from '@prisma/client';

// Singleton — verhindert mehrere Verbindungspools in tsx watch (Hot Reload)
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
