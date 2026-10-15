import { prisma } from './prisma.js';
import type { ExerciseProgram, ProgramExercise, ProgramExerciseAdaptation } from '@prisma/client';

// Append-only Snapshot-Log (siehe ProgramSnapshot in schema.prisma): bildet
// ab, "was galt wann" für ein Programm. Ein Snapshot entsteht bei
// Programmerstellung sowie bei jeder Änderung an Laufzeit, Status oder
// Übungsliste/Häufigkeit (siehe routes/programs.ts) — nicht bei reiner
// Name-/Notiz-Änderung.

export interface ProgramSnapshotItemContent {
  exerciseId: string;
  sets: number;
  reps: number;
  holdSeconds: number | null;
  frequencyPerWeek: number;
  order: number;
  therapistNote: string | null;
  adaptationIds: string[];
}

export interface ProgramSnapshotContent {
  startDate: string;
  endDate: string | null;
  status: string;
  items: ProgramSnapshotItemContent[];
}

type ProgramWithItemsForSnapshot = Pick<ExerciseProgram, 'startDate' | 'endDate' | 'status'> & {
  items: (Pick<ProgramExercise, 'exerciseId' | 'sets' | 'reps' | 'holdSeconds' | 'frequencyPerWeek' | 'order' | 'therapistNote'> & {
    adaptations: Pick<ProgramExerciseAdaptation, 'adaptationId'>[];
  })[];
};

// Reine, seiteneffektfreie Funktion — von routes/programs.ts (live) und
// backfill-program-snapshots.ts (einmalig) gleichermaßen genutzt, damit die
// Snapshot-Form garantiert konsistent bleibt.
export function buildProgramSnapshotContent(program: ProgramWithItemsForSnapshot): ProgramSnapshotContent {
  return {
    startDate: program.startDate.toISOString(),
    endDate: program.endDate ? program.endDate.toISOString() : null,
    status: program.status,
    items: program.items.map(item => ({
      exerciseId: item.exerciseId,
      sets: item.sets,
      reps: item.reps,
      holdSeconds: item.holdSeconds,
      frequencyPerWeek: item.frequencyPerWeek,
      order: item.order,
      therapistNote: item.therapistNote,
      adaptationIds: item.adaptations.map(a => a.adaptationId),
    })),
  };
}

// practiceId ist Pflichtparameter — löst das Programm nur auf, wenn es (über
// patient.practiceId) zur übergebenen Praxis gehört, sonst null. Reine
// Lese-Hilfsfunktion für spätere Batches (noch keine Adhärenzlogik),
// nirgends aus einer Route aufgerufen.
export async function getProgramStateAt(
  programId: string,
  practiceId: string,
  date: Date,
): Promise<ProgramSnapshotContent | null> {
  const program = await prisma.exerciseProgram.findFirst({
    where: { id: programId, patient: { practiceId } },
    select: { id: true },
  });
  if (!program) return null;

  const snapshot = await prisma.programSnapshot.findFirst({
    where: { programId, validFrom: { lte: date } },
    orderBy: { validFrom: 'desc' },
    select: { snapshot: true },
  });

  return (snapshot?.snapshot as unknown as ProgramSnapshotContent) ?? null;
}
