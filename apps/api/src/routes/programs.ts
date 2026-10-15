import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthRequest } from '../middleware/requireAuth.js';
import { unvalidatedExercisesAllowed } from '../lib/featureFlags.js';
import { buildProgramSnapshotContent } from '../lib/programSnapshot.js';
import type { ProgramStatus, Prisma } from '@prisma/client';

const router = Router();
router.use(requireAuth);

type ProgramItemInput = {
  exerciseId: string;
  sets: number;
  reps: number;
  holdSeconds?: number | null;
  frequencyPerWeek: number;
  order?: number;
  adaptationIds?: string[];
  therapistNote?: string | null;
};

const itemsInclude = {
  orderBy: { order: 'asc' as const },
  include: {
    exercise: true,
    adaptations: { include: { adaptation: true } },
  },
};

const PROGRAM_STATUSES: ProgramStatus[] = ['active', 'paused', 'completed'];

// Mission-kritische Mandantenprüfung: eine adaptationId darf nur zugewiesen
// werden, wenn sie (a) zur gewählten Übung gehört UND (b) entweder eine
// System-Anpassung ist oder der anfragenden Praxis selbst gehört. Ohne diese
// Prüfung könnte eine Praxis eine ihr unbekannte, praxiseigene adaptationId
// einer anderen Praxis "erraten" und für eigene Patienten zuweisen.
// Wirft einen Error mit einer für den Client verständlichen Meldung.
async function assertAdaptationsAreAssignable(
  items: ProgramItemInput[],
  practiceId: string,
): Promise<void> {
  const allIds = [...new Set(items.flatMap(i => i.adaptationIds ?? []))];
  if (allIds.length === 0) return;

  const found = await prisma.exerciseAdaptation.findMany({
    where: { id: { in: allIds } },
    select: { id: true, exerciseId: true, isSystem: true, practiceId: true, isValidated: true, labelDe: true },
  });
  const byId = new Map(found.map(a => [a.id, a]));
  const skipValidationCheck = unvalidatedExercisesAllowed();

  for (const item of items) {
    for (const adaptationId of item.adaptationIds ?? []) {
      const adaptation = byId.get(adaptationId);
      if (!adaptation) {
        throw new Error(`Anpassung ${adaptationId} nicht gefunden`);
      }
      if (adaptation.exerciseId !== item.exerciseId) {
        throw new Error(`Anpassung ${adaptationId} gehört nicht zur Übung ${item.exerciseId}`);
      }
      const belongsToTenant = adaptation.isSystem || adaptation.practiceId === practiceId;
      if (!belongsToTenant) {
        throw new Error(`Anpassung ${adaptationId} gehört nicht zu dieser Praxis`);
      }
      if (!skipValidationCheck && !adaptation.isValidated) {
        throw new Error(`Anpassung "${adaptation.labelDe}" ist fachlich noch nicht freigegeben und kann nicht zugewiesen werden`);
      }
    }
  }
}

// Wirft einen Error, wenn eine der übergebenen Übungen fachlich noch nicht
// freigegeben ist (isValidated: false) — außer der Dev-Bypass ist aktiv.
function assertExercisesAreValidated(exercises: { nameDe: string; isValidated: boolean }[]): void {
  if (unvalidatedExercisesAllowed()) return;
  const unvalidated = exercises.filter(e => !e.isValidated);
  if (unvalidated.length > 0) {
    throw new Error(
      `Folgende Übungen sind fachlich noch nicht freigegeben und können nicht verordnet werden: ${unvalidated
        .map(e => e.nameDe)
        .join(', ')}`,
    );
  }
}

const SETS_REPS_FREQUENCY_MIN = 1;
const SETS_REPS_FREQUENCY_MAX = 100;
const HOLD_SECONDS_MIN = 1;
const HOLD_SECONDS_MAX = 600;
const THERAPIST_NOTE_MAX_LENGTH = 1000;

function isIntInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

// Validiert die pro Übung gesetzten Mengen/Angaben, bevor irgendetwas
// geschrieben wird. Gibt eine Fehlermeldung zurück oder null bei Erfolg.
function validateProgramItems(items: ProgramItemInput[]): string | null {
  for (const item of items) {
    if (!isIntInRange(item.sets, SETS_REPS_FREQUENCY_MIN, SETS_REPS_FREQUENCY_MAX)) {
      return `sets muss eine Ganzzahl zwischen ${SETS_REPS_FREQUENCY_MIN} und ${SETS_REPS_FREQUENCY_MAX} sein`;
    }
    if (!isIntInRange(item.reps, SETS_REPS_FREQUENCY_MIN, SETS_REPS_FREQUENCY_MAX)) {
      return `reps muss eine Ganzzahl zwischen ${SETS_REPS_FREQUENCY_MIN} und ${SETS_REPS_FREQUENCY_MAX} sein`;
    }
    if (!isIntInRange(item.frequencyPerWeek, SETS_REPS_FREQUENCY_MIN, SETS_REPS_FREQUENCY_MAX)) {
      return `frequencyPerWeek muss eine Ganzzahl zwischen ${SETS_REPS_FREQUENCY_MIN} und ${SETS_REPS_FREQUENCY_MAX} sein`;
    }
    if (item.holdSeconds != null && !isIntInRange(item.holdSeconds, HOLD_SECONDS_MIN, HOLD_SECONDS_MAX)) {
      return `holdSeconds muss eine Ganzzahl zwischen ${HOLD_SECONDS_MIN} und ${HOLD_SECONDS_MAX} sein (oder leer)`;
    }
    if (item.therapistNote != null && item.therapistNote.length > THERAPIST_NOTE_MAX_LENGTH) {
      return `therapistNote darf maximal ${THERAPIST_NOTE_MAX_LENGTH} Zeichen lang sein`;
    }
  }
  return null;
}

// Validiert startDate/endDate: endDate darf nicht vor startDate liegen.
// Gibt eine Fehlermeldung zurück oder null bei Erfolg.
function validateProgramDates(startDate: Date, endDate: Date | null): string | null {
  if (Number.isNaN(startDate.getTime())) {
    return 'startDate ist kein gültiges Datum';
  }
  if (endDate) {
    if (Number.isNaN(endDate.getTime())) {
      return 'endDate ist kein gültiges Datum';
    }
    if (endDate < startDate) {
      return 'endDate darf nicht vor startDate liegen';
    }
  }
  return null;
}

function programExerciseCreateData(items: ProgramItemInput[]) {
  return items.map((item, idx) => ({
    exerciseId: item.exerciseId,
    sets: item.sets,
    reps: item.reps,
    holdSeconds: item.holdSeconds ?? null,
    frequencyPerWeek: item.frequencyPerWeek,
    order: item.order ?? idx + 1,
    therapistNote: item.therapistNote?.trim() || null,
    adaptations: {
      create: (item.adaptationIds ?? []).map(adaptationId => ({ adaptationId })),
    },
  }));
}

// GET /api/v1/programs?patientId=...
router.get('/', async (req: Request, res: Response) => {
  const { practiceId } = (req as AuthRequest).authUser;
  const { patientId } = req.query as Record<string, string>;

  const programs = await prisma.exerciseProgram.findMany({
    where: {
      patient: { practiceId },
      ...(patientId ? { patientId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      patient: { select: { id: true, name: true } },
      therapist: { select: { id: true, name: true } },
      _count: { select: { items: true, logs: true } },
    },
  });

  res.json({ programs });
});

// GET /api/v1/programs/:id
router.get('/:id', async (req: Request, res: Response) => {
  const { practiceId } = (req as AuthRequest).authUser;

  const program = await prisma.exerciseProgram.findFirst({
    where: { id: req.params.id, patient: { practiceId } },
    include: {
      patient: { select: { id: true, name: true } },
      therapist: { select: { id: true, name: true } },
      items: itemsInclude,
      logs: {
        orderBy: { completedAt: 'desc' },
        take: 30,
        include: { exercise: { select: { nameDe: true } } },
      },
    },
  });

  if (!program) {
    res.status(404).json({ error: 'Programm nicht gefunden' });
    return;
  }

  res.json({ program });
});

// POST /api/v1/programs
router.post('/', async (req: Request, res: Response) => {
  const { id: therapistId, practiceId } = (req as AuthRequest).authUser;
  const { patientId, name, notes, items, startDate, endDate } = req.body as {
    patientId?: string;
    name?: string;
    notes?: string;
    items?: ProgramItemInput[];
    startDate?: string;
    endDate?: string;
  };

  if (!patientId || !name?.trim()) {
    res.status(400).json({ error: 'patientId und name sind erforderlich' });
    return;
  }

  // Tenant-Isolation: Patient muss zur selben Praxis gehören
  const patient = await prisma.patient.findFirst({ where: { id: patientId, practiceId } });
  if (!patient) {
    res.status(404).json({ error: 'Patient nicht gefunden' });
    return;
  }

  const resolvedStartDate = startDate ? new Date(startDate) : new Date();
  const resolvedEndDate = endDate ? new Date(endDate) : null;
  const dateError = validateProgramDates(resolvedStartDate, resolvedEndDate);
  if (dateError) {
    res.status(400).json({ error: dateError });
    return;
  }

  // Übungs-IDs gegen Bibliothek validieren
  const exerciseIds = (items ?? []).map(i => i.exerciseId);
  if (exerciseIds.length > 0) {
    const found = await prisma.exercise.findMany({ where: { id: { in: exerciseIds } } });
    if (found.length !== exerciseIds.length) {
      res.status(400).json({ error: 'Eine oder mehrere exerciseIds sind ungültig' });
      return;
    }
    try {
      assertExercisesAreValidated(found);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
      return;
    }
  }

  const itemsError = validateProgramItems(items ?? []);
  if (itemsError) {
    res.status(400).json({ error: itemsError });
    return;
  }

  try {
    await assertAdaptationsAreAssignable(items ?? [], practiceId);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
    return;
  }

  const program = await prisma.$transaction(async tx => {
    const created = await tx.exerciseProgram.create({
      data: {
        patientId,
        therapistId,
        name: name.trim(),
        notes: notes?.trim() || null,
        startDate: resolvedStartDate,
        endDate: resolvedEndDate,
        updatedById: therapistId,
        items: {
          create: programExerciseCreateData(items ?? []),
        },
      },
      include: {
        items: itemsInclude,
        patient: { select: { id: true, name: true } },
      },
    });

    await tx.programSnapshot.create({
      data: {
        programId: created.id,
        validFrom: created.startDate,
        snapshot: buildProgramSnapshotContent(created) as unknown as Prisma.InputJsonValue,
        changedById: therapistId,
      },
    });

    return created;
  });

  res.status(201).json({ program });
});

// PUT /api/v1/programs/:id — Name, Notizen, Laufzeit und Status aktualisieren
router.put('/:id', async (req: Request, res: Response) => {
  const { practiceId, id: updatedById } = (req as AuthRequest).authUser;
  const { name, notes, startDate, endDate, status } = req.body as {
    name?: string;
    notes?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
  };

  const existing = await prisma.exerciseProgram.findFirst({
    where: { id: req.params.id, patient: { practiceId } },
    include: { items: itemsInclude },
  });
  if (!existing) {
    res.status(404).json({ error: 'Programm nicht gefunden' });
    return;
  }

  if (status !== undefined && !PROGRAM_STATUSES.includes(status as ProgramStatus)) {
    res.status(400).json({ error: `status muss einer von ${PROGRAM_STATUSES.join(', ')} sein` });
    return;
  }

  const resolvedStartDate = startDate !== undefined ? new Date(startDate) : existing.startDate;
  const resolvedEndDate = endDate !== undefined ? (endDate ? new Date(endDate) : null) : existing.endDate;
  const dateError = validateProgramDates(resolvedStartDate, resolvedEndDate);
  if (dateError) {
    res.status(400).json({ error: dateError });
    return;
  }

  // Laufzeit/Status ändern sich? → neuer ProgramSnapshot (siehe
  // lib/programSnapshot.ts). Reine Name-/Notiz-Änderung erzeugt keinen.
  const resolvedStatus = (status as ProgramStatus | undefined) ?? existing.status;
  const durationOrStatusChanged =
    resolvedStartDate.getTime() !== existing.startDate.getTime() ||
    (resolvedEndDate?.getTime() ?? null) !== (existing.endDate?.getTime() ?? null) ||
    resolvedStatus !== existing.status;

  const updated = await prisma.$transaction(async tx => {
    const program = await tx.exerciseProgram.update({
      where: { id: existing.id },
      data: {
        ...(name?.trim() ? { name: name.trim() } : {}),
        ...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
        startDate: resolvedStartDate,
        endDate: resolvedEndDate,
        status: resolvedStatus,
        updatedById,
      },
      include: { items: itemsInclude },
    });

    if (durationOrStatusChanged) {
      await tx.programSnapshot.create({
        data: {
          programId: program.id,
          validFrom: new Date(),
          snapshot: buildProgramSnapshotContent(program) as unknown as Prisma.InputJsonValue,
          changedById: updatedById,
        },
      });
    }

    return program;
  });

  res.json({ program: updated });
});

// PUT /api/v1/programs/:id/items — Übungsliste vollständig ersetzen
// Bestehende SessionLogs bleiben erhalten (sie referenzieren Exercise direkt).
router.put('/:id/items', async (req: Request, res: Response) => {
  const { practiceId, id: updatedById } = (req as AuthRequest).authUser;
  const { items } = req.body as { items?: ProgramItemInput[] };

  const existing = await prisma.exerciseProgram.findFirst({
    where: { id: req.params.id, patient: { practiceId } },
  });
  if (!existing) {
    res.status(404).json({ error: 'Programm nicht gefunden' });
    return;
  }

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'items-Array ist erforderlich und darf nicht leer sein' });
    return;
  }

  // Übungs-IDs gegen Bibliothek validieren (gleiche Prüfung wie bei POST /)
  const exerciseIds = items.map(i => i.exerciseId);
  const found = await prisma.exercise.findMany({ where: { id: { in: exerciseIds } } });
  if (found.length !== new Set(exerciseIds).size) {
    res.status(400).json({ error: 'Eine oder mehrere exerciseIds sind ungültig' });
    return;
  }
  try {
    assertExercisesAreValidated(found);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
    return;
  }

  const itemsError = validateProgramItems(items);
  if (itemsError) {
    res.status(400).json({ error: itemsError });
    return;
  }

  try {
    await assertAdaptationsAreAssignable(items, practiceId);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
    return;
  }

  const updated = await prisma.$transaction(async tx => {
    await tx.programExercise.deleteMany({ where: { programId: existing.id } });
    const program = await tx.exerciseProgram.update({
      where: { id: existing.id },
      data: {
        updatedById,
        items: {
          create: programExerciseCreateData(items),
        },
      },
      include: { items: itemsInclude },
    });

    // Übungsliste/Häufigkeit geändert → immer ein neuer Snapshot.
    await tx.programSnapshot.create({
      data: {
        programId: program.id,
        validFrom: new Date(),
        snapshot: buildProgramSnapshotContent(program) as unknown as Prisma.InputJsonValue,
        changedById: updatedById,
      },
    });

    return program;
  });

  res.json({ program: updated });
});

export { router as programsRouter };
