import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole, type AuthRequest } from '../middleware/requireAuth.js';

const router = Router();
router.use(requireAuth);

const ADAPTATION_CATEGORIES = ['haltung', 'koerperbau', 'beweglichkeit', 'hilfsmittel', 'schonung'];

// GET /api/v1/exercises?bodyRegion=Knie&difficulty=2&includeUnvalidated=true
//
// Fachlich nicht freigegebene Übungen (isValidated: false) werden per Default
// ausgeblendet — sie können ohnehin nicht verordnet werden (siehe
// programs.ts). Mit includeUnvalidated=true werden sie mitgeliefert, damit
// der Therapeut sie im UI bewusst einblenden kann (Toggle "Ungeprüfte
// anzeigen"). isValidated ist immer Teil der Response.
router.get('/', async (req: Request, res: Response) => {
  const { bodyRegion, difficulty, includeUnvalidated } = req.query as Record<string, string>;
  const validationFilter = includeUnvalidated === 'true' ? {} : { isValidated: true };

  const exercises = await prisma.exercise.findMany({
    where: {
      ...validationFilter,
      ...(bodyRegion ? { bodyRegion } : {}),
      ...(difficulty ? { difficulty: parseInt(difficulty) } : {}),
    },
    orderBy: [{ bodyRegion: 'asc' }, { difficulty: 'asc' }, { nameDe: 'asc' }],
  });

  // Alle verfügbaren Körperregionen für Filter zurückgeben (nur aus der
  // gerade sichtbaren Menge, damit die Auswahl keine leeren Regionen zeigt)
  const bodyRegions = await prisma.exercise.findMany({
    where: validationFilter,
    distinct: ['bodyRegion'],
    select: { bodyRegion: true },
    orderBy: { bodyRegion: 'asc' },
  });

  res.json({
    exercises,
    meta: { bodyRegions: bodyRegions.map(e => e.bodyRegion) },
  });
});

// GET /api/v1/exercises/:id?includeUnvalidated=true
// Liefert die Übung inkl. verfügbarer Anpassungen für die Verordnung:
// System-Anpassungen (isSystem: true) + die eigenen praxiseigenen.
// Anpassungen anderer Praxen sind hier nie sichtbar (Mandantentrennung).
// Fachlich nicht freigegebene Anpassungen werden wie bei der Übungsliste per
// Default ausgeblendet, außer includeUnvalidated=true ist gesetzt.
router.get('/:id', async (req: Request, res: Response) => {
  const { practiceId } = (req as AuthRequest).authUser;
  const { includeUnvalidated } = req.query as Record<string, string>;

  const exercise = await prisma.exercise.findUnique({ where: { id: req.params.id } });

  if (!exercise) {
    res.status(404).json({ error: 'Übung nicht gefunden' });
    return;
  }

  const adaptations = await prisma.exerciseAdaptation.findMany({
    where: {
      exerciseId: exercise.id,
      OR: [{ isSystem: true }, { practiceId }],
      ...(includeUnvalidated === 'true' ? {} : { isValidated: true }),
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

type ValidationBody = { isValidated?: boolean; validatedBy?: string };

// Gemeinsame Prüfung für die beiden Freigabe-Routen unten: liefert die
// Prisma-Update-Daten oder eine Fehlermeldung für den Client.
function parseValidationBody(body: ValidationBody): { data: Record<string, unknown> } | { error: string } {
  if (typeof body.isValidated !== 'boolean') {
    return { error: 'isValidated (boolean) ist erforderlich' };
  }
  if (body.isValidated) {
    if (!body.validatedBy?.trim()) {
      return { error: 'validatedBy ist beim Freigeben erforderlich (Name + Qualifikation der prüfenden Person)' };
    }
    return { data: { isValidated: true, validatedBy: body.validatedBy.trim(), validatedAt: new Date() } };
  }
  return { data: { isValidated: false, validatedBy: null, validatedAt: null } };
}

// PUT /api/v1/exercises/:id/validation — admin-only.
// Setzt/entzieht die fachliche Freigabe einer Übung. Erst danach kann sie
// laut programs.ts verordnet werden.
router.put('/:id/validation', requireRole('admin'), async (req: Request, res: Response) => {
  const exercise = await prisma.exercise.findUnique({ where: { id: req.params.id } });
  if (!exercise) {
    res.status(404).json({ error: 'Übung nicht gefunden' });
    return;
  }

  const result = parseValidationBody(req.body as ValidationBody);
  if ('error' in result) {
    res.status(400).json({ error: result.error });
    return;
  }

  const updated = await prisma.exercise.update({ where: { id: exercise.id }, data: result.data });
  res.json({ exercise: updated });
});

// PUT /api/v1/exercises/:exerciseId/adaptations/:adaptationId/validation — admin-only.
// Setzt/entzieht die fachliche Freigabe einer Anpassung.
router.put('/:exerciseId/adaptations/:adaptationId/validation', requireRole('admin'), async (req: Request, res: Response) => {
  const adaptation = await prisma.exerciseAdaptation.findUnique({ where: { id: req.params.adaptationId } });
  if (!adaptation || adaptation.exerciseId !== req.params.exerciseId) {
    res.status(404).json({ error: 'Anpassung nicht gefunden' });
    return;
  }

  const result = parseValidationBody(req.body as ValidationBody);
  if ('error' in result) {
    res.status(400).json({ error: result.error });
    return;
  }

  const updated = await prisma.exerciseAdaptation.update({ where: { id: adaptation.id }, data: result.data });
  res.json({ adaptation: updated });
});

export { router as exercisesRouter };
