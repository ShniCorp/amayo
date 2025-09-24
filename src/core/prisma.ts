// Prisma singleton para evitar múltiples instancias (especialmente en modo watch)
// y reducir consumo de memoria.
import { PrismaClient } from '@prisma/client';

// Contenedor global seguro para hot-reload / watch sin duplicar instancias
const globalForPrisma = globalThis as unknown as { __amayo_prisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.__amayo_prisma ?? new PrismaClient({
  log: process.env.PRISMA_LOG_QUERIES === '1' ? ['query', 'error', 'warn'] : ['error', 'warn']
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__amayo_prisma = prisma;
}

export async function ensurePrismaConnection() {
  // Evita múltiples $connect si ya está conectada (no hay API directa, usamos heurística)
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    await prisma.$connect();
  }
  return prisma;
}
