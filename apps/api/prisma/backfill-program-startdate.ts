import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Einmaliges Backfill vor Migration B (startDate → NOT NULL) ──
// Bestehende Programme haben kein echtes "Startdatum" — createdAt ist die
// beste verfügbare Näherung, kein Datenverlust, keine erfundene Annahme.
// Idempotent: betrifft nur Zeilen mit startDate IS NULL.

async function backfill() {
  console.log('Backfill startDate (= createdAt) für bestehende Programme…');

  const result = await prisma.$executeRaw`
    UPDATE "ExerciseProgram" SET "startDate" = "createdAt" WHERE "startDate" IS NULL
  `;
  console.log(`✓ ${result} Programm(e) mit startDate versehen.`);

  const missing = await prisma.exerciseProgram.count({ where: { startDate: null } });
  if (missing > 0) {
    throw new Error(`${missing} Programm(e) haben nach dem Backfill kein startDate.`);
  }
}

backfill()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
