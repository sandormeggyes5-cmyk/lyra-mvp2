import { PrismaClient } from '@prisma/client';
import { buildProgramSnapshotContent } from '../src/lib/programSnapshot.js';

const prisma = new PrismaClient();

// ── Einmaliges Backfill: initialer ProgramSnapshot pro bestehendem Programm ──
// Muss NACH backfill-program-startdate.ts laufen (braucht startDate).
// Bildet den Zustand zum Migrationszeitpunkt ab (aktuelle ProgramExercise-
// Zeilen), NICHT die tatsächliche Änderungshistorie davor — frühere
// Änderungen vor diesem Batch sind nicht rekonstruierbar. Idempotent:
// überspringt Programme, die bereits mindestens einen Snapshot haben.

async function backfill() {
  console.log('Backfill initiale ProgramSnapshots für bestehende Programme…');

  const programs = await prisma.exerciseProgram.findMany({
    where: { snapshots: { none: {} } },
    select: {
      id: true,
      therapistId: true,
      startDate: true,
      endDate: true,
      status: true,
      items: {
        orderBy: { order: 'asc' },
        select: {
          exerciseId: true,
          sets: true,
          reps: true,
          holdSeconds: true,
          frequencyPerWeek: true,
          order: true,
          therapistNote: true,
          adaptations: { select: { adaptationId: true } },
        },
      },
    },
  });

  for (const program of programs) {
    if (!program.startDate) {
      throw new Error(
        `Programm ${program.id} hat kein startDate — backfill-program-startdate.ts zuerst ausführen.`,
      );
    }
    await prisma.programSnapshot.create({
      data: {
        programId: program.id,
        validFrom: program.startDate,
        snapshot: buildProgramSnapshotContent(program as Parameters<typeof buildProgramSnapshotContent>[0]),
        changedById: program.therapistId,
      },
    });
  }
  console.log(`✓ ${programs.length} initiale(r) Snapshot(s) angelegt.`);
}

backfill()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
