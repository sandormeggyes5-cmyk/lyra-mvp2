import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthRequest } from '../middleware/requireAuth.js';

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
    select: { id: true, exerciseId: true, isSystem: true, practiceId: true },
  });
  const byId = new Map(found.map(a => [a.id, a]));

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
    }
  }
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
  const { patientId, name, notes, items } = req.body as {
    patientId?: string;
    name?: string;
    notes?: string;
    items?: ProgramItemInput[];
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

  // Übungs-IDs gegen Bibliothek validieren
  const exerciseIds = (items ?? []).map(i => i.exerciseId);
  if (exerciseIds.length > 0) {
    const found = await prisma.exercise.findMany({ where: { id: { in: exerciseIds } } });
    if (found.length !== exerciseIds.length) {
      res.status(400).json({ error: 'Eine oder mehrere exerciseIds sind ungültig' });
      return;
    }
  }

  try {
    await assertAdaptationsAreAssignable(items ?? [], practiceId);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
    return;
  }

  const program = await prisma.exerciseProgram.create({
    data: {
      patientId,
      therapistId,
      name: name.trim(),
      notes: notes?.trim() || null,
      items: {
        create: programExerciseCreateData(items ?? []),
      },
    },
    include: {
      items: itemsInclude,
      patient: { select: { id: true, name: true } },
    },
  });

  res.status(201).json({ program });
});

// PUT /api/v1/programs/:id — Name und Notizen aktualisieren
router.put('/:id', async (req: Request, res: Response) => {
  const { practiceId } = (req as AuthRequest).authUser;
  const { name, notes } = req.body as { name?: string; notes?: string };

  const existing = await prisma.exerciseProgram.findFirst({
    where: { id: req.params.id, patient: { practiceId } },
  });
  if (!existing) {
    res.status(404).json({ error: 'Programm nicht gefunden' });
    return;
  }

  const updated = await prisma.exerciseProgram.update({
    where: { id: existing.id },
    data: {
      ...(name?.trim() ? { name: name.trim() } : {}),
      ...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
    },
    include: {
      items: itemsInclude,
    },
  });

  res.json({ program: updated });
});

// PUT /api/v1/programs/:id/items — Übungsliste vollständig ersetzen
// Bestehende SessionLogs bleiben erhalten (sie referenzieren Exercise direkt).
router.put('/:id/items', async (req: Request, res: Response) => {
  const { practiceId } = (req as AuthRequest).authUser;
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
    await assertAdaptationsAreAssignable(items, practiceId);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
    return;
  }

  const updated = await prisma.$transaction(async tx => {
    await tx.programExercise.deleteMany({ where: { programId: existing.id } });
    return tx.exerciseProgram.update({
      where: { id: existing.id },
      data: {
        items: {
          create: programExerciseCreateData(items),
        },
      },
      include: { items: itemsInclude },
    });
  });

  res.json({ program: updated });
});

export { router as programsRouter };
