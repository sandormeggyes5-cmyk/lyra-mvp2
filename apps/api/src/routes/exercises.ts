import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();
router.use(requireAuth);

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
router.get('/:id', async (req: Request, res: Response) => {
  const exercise = await prisma.exercise.findUnique({ where: { id: req.params.id } });

  if (!exercise) {
    res.status(404).json({ error: 'Übung nicht gefunden' });
    return;
  }

  res.json({ exercise });
});

export { router as exercisesRouter };
