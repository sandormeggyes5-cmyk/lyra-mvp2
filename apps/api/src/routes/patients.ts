import { Router, type Request, type Response } from 'express';
import { randomBytes } from 'crypto';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthRequest } from '../middleware/requireAuth.js';

const router = Router();
router.use(requireAuth);

const MAGIC_LINK_EXPIRY_DAYS = 90;

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

function magicLinkUrl(token: string): string {
  return `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/p/${token}`;
}

// GET /api/v1/patients
router.get('/', async (req: Request, res: Response) => {
  const { practiceId } = (req as AuthRequest).authUser;
  const { search, page = '1', limit = '20' } = req.query as Record<string, string>;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where = {
    practiceId,
    ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
  };

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
      select: {
        id: true,
        name: true,
        emailOrPhone: true,
        dateOfBirth: true,
        magicLinkToken: true,
        magicLinkExpiresAt: true,
        createdAt: true,
        _count: { select: { programs: true } },
      },
    }),
    prisma.patient.count({ where }),
  ]);

  res.json({
    patients: patients.map(p => ({ ...p, magicLink: magicLinkUrl(p.magicLinkToken) })),
    total,
    page: parseInt(page),
    limit: parseInt(limit),
  });
});

// GET /api/v1/patients/:id
router.get('/:id', async (req: Request, res: Response) => {
  const { practiceId } = (req as AuthRequest).authUser;

  const patient = await prisma.patient.findFirst({
    where: { id: req.params.id, practiceId },
    include: {
      programs: {
        orderBy: { createdAt: 'desc' },
        include: {
          therapist: { select: { id: true, name: true } },
          items: {
            orderBy: { order: 'asc' },
            include: { exercise: true },
          },
          _count: { select: { logs: true } },
        },
      },
    },
  });

  if (!patient) {
    res.status(404).json({ error: 'Patient nicht gefunden' });
    return;
  }

  res.json({ patient: { ...patient, magicLink: magicLinkUrl(patient.magicLinkToken) } });
});

// POST /api/v1/patients
router.post('/', async (req: Request, res: Response) => {
  const { practiceId } = (req as AuthRequest).authUser;
  const { name, emailOrPhone, dateOfBirth } = req.body as {
    name?: string;
    emailOrPhone?: string;
    dateOfBirth?: string;
  };

  if (!name?.trim()) {
    res.status(400).json({ error: 'Name ist erforderlich' });
    return;
  }

  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + MAGIC_LINK_EXPIRY_DAYS);

  const patient = await prisma.patient.create({
    data: {
      practiceId,
      name: name.trim(),
      emailOrPhone: emailOrPhone?.trim() || null,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      magicLinkToken: token,
      magicLinkExpiresAt: expiresAt,
    },
  });

  res.status(201).json({ patient: { ...patient, magicLink: magicLinkUrl(patient.magicLinkToken) } });
});

// POST /api/v1/patients/:id/magic-link — Token erneuern
router.post('/:id/magic-link', async (req: Request, res: Response) => {
  const { practiceId } = (req as AuthRequest).authUser;

  const patient = await prisma.patient.findFirst({
    where: { id: req.params.id, practiceId },
  });

  if (!patient) {
    res.status(404).json({ error: 'Patient nicht gefunden' });
    return;
  }

  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + MAGIC_LINK_EXPIRY_DAYS);

  const updated = await prisma.patient.update({
    where: { id: patient.id },
    data: { magicLinkToken: token, magicLinkExpiresAt: expiresAt },
  });

  res.json({
    magicLinkToken: token,
    magicLink: magicLinkUrl(updated.magicLinkToken),
    magicLinkExpiresAt: updated.magicLinkExpiresAt,
  });
});

export { router as patientsRouter };
