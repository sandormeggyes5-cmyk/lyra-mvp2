import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

// ── Einmaliges Backfill vor Migration B (pseudonymId → NOT NULL + UNIQUE) ──
// Jeder Patient ohne pseudonymId bekommt einen frischen, zufälligen Wert
// (128 Bit Entropie, unabhängig von id/magicLinkToken/Name — siehe
// Kommentar auf Patient.pseudonymId in schema.prisma). Idempotent: betrifft
// nur Zeilen mit pseudonymId IS NULL, erzeugt bei erneutem Lauf keine
// Duplikate.

function generatePseudonymId(): string {
  return randomBytes(16).toString('hex');
}

async function backfill() {
  console.log('Backfill pseudonymId für bestehende Patienten…');

  const patients = await prisma.patient.findMany({
    where: { pseudonymId: null },
    select: { id: true },
  });

  for (const patient of patients) {
    await prisma.patient.update({
      where: { id: patient.id },
      data: { pseudonymId: generatePseudonymId() },
    });
  }
  console.log(`✓ ${patients.length} Patient(en) mit pseudonymId versehen.`);

  const missing = await prisma.patient.count({ where: { pseudonymId: null } });
  if (missing > 0) {
    throw new Error(`${missing} Patient(en) haben nach dem Backfill kein pseudonymId.`);
  }
}

backfill()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
