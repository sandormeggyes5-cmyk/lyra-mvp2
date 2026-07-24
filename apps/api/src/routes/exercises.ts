import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthRequest } from '../middleware/requireAuth.js';

const router = Router();
router.use(requireAuth);

const ADAPTATION_CATEGORIES = ['haltung', 'koerperbau', 'beweglichkeit', 'hilfsmittel', 'schonung'];

// GET /api/v1/exercises?bodyRegion=Knie&difficulty=2
router.get('/', async (req: Request, res: Response) => {
  const { bodyRegion, difficulty } = req.query as Record<string, string>;

  const exercises = await prisma.exercise.findMany({
    where: {
      ...(bodyRegion ? { bodyRegion } : {}),
      ...(difficulty ? { difficulty: parseInt(difficulty) } : {}),
    },
    orderBy: [{ bodyRegion: 'asc' }, { difficulty: 'asc' }, { nameDe: 'asc' }],
  });

  // Alle verfügbaren Körperregionen für Filter zurückgeben
  const bodyRegions = await prisma.exercise.findMany({
    distinct: ['bodyRegion'],
    select: { bodyRegion: true },
    orderBy: { bodyRegion: 'asc' },
  });

  res.json({
    exercises,
    meta: { bodyRegions: bodyRegions.map(e => e.bodyRegion) },
  });
});

// GET /api/v1/exercises/:id
// Liefert die Übung inkl. verfügbarer Anpassungen für die Verordnung:
// System-Anpassungen (isSystem: true) + die eigenen praxiseigenen.
// Anpassungen anderer Praxen sind hier nie sichtbar (Mandantentrennung).
router.get('/:id', async (req: Request, res: Response) => {
  const { practiceId } = (req as AuthRequest).authUser;

  const exercise = await prisma.exercise.findUnique({ where: { id: req.params.id } });

  if (!exercise) {
    res.status(404).json({ error: 'Übung nicht gefunden' });
    return;
  }

  const adaptations = await prisma.exerciseAdaptation.findMany({
    where: {
      exerciseId: exercise.id,
      OR: [{ isSystem: true }, { practiceId }],
    },
    orderBy: [{ category: 'asc' }, { order: 'asc' }],
  });

  res.json({ exercise, adaptations });
});

// POST /api/v1/exercises/:id/adaptations — praxiseigene Anpassung anlegen.
//
// Regulatorisch verbindlich: Diese Route legt nur die Auswahlmöglichkeit an.
// Sie weist NICHTS automatisch zu, leitet nichts aus Diagnosen oder anderen
// Patientenmerkmalen ab. Die tatsächliche Zuweisung zu einem Patienten
// erfolgt ausschließlich manuell durch den Therapeuten in programs.ts.
router.post('/:id/adaptations', async (req: Request, res: Response) => {
  const { practiceId } = (req as AuthRequest).authUser;
  const { labelDe, instructionDe, category } = req.body as {
    labelDe?: string;
    instructionDe?: string;
    category?: string;
  };

  const exercise = await prisma.exercise.findUnique({ where: { id: req.params.id } });
  if (!exercise) {
    res.status(404).json({ error: 'Übung nicht gefunden' });
    return;
  }

  if (!labelDe?.trim() || !instructionDe?.trim()) {
    res.status(400).json({ error: 'labelDe und instructionDe sind erforderlich' });
    return;
  }

  if (!category || !ADAPTATION_CATEGORIES.includes(category)) {
    res.status(400).json({
      error: `category muss eine von: ${ADAPTATION_CATEGORIES.join(', ')} sein`,
    });
    return;
  }

  const adaptation = await prisma.exerciseAdaptation.create({
    data: {
      exerciseId: exercise.id,
      labelDe: labelDe.trim(),
      instructionDe: instructionDe.trim(),
      category,
      isSystem: false,
      practiceId,
    },
  });

  res.status(201).json({ adaptation });
});

export { router as exercisesRouter };
