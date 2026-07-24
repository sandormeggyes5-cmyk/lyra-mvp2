import { Router, type Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../lib/prisma.js';
import { KAI_DAILY_LIMIT, buildKaiPrompt, type KaiAdaptationContext } from '../lib/kai.js';

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Prisma-Typ für Patient mit Kontext
type PatientWithContext = NonNullable<Awaited<ReturnType<typeof fetchPatient>>>;

async function fetchPatient(token: string) {
  return prisma.patient.findUnique({
    where: { magicLinkToken: token },
    include: {
      practice: { select: { name: true } },
      programs: {
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            orderBy: { order: 'asc' },
            include: {
              exercise: true,
              adaptations: { include: { adaptation: true } },
            },
          },
        },
      },
    },
  });
}

async function resolvePatient(token: string, res: Response): Promise<PatientWithContext | null> {
  const patient = await fetchPatient(token);

  if (!patient) {
    res.status(404).json({ error: 'Ungültiger Link' });
    return null;
  }

  if (patient.magicLinkExpiresAt && patient.magicLinkExpiresAt < new Date()) {
    res.status(410).json({
      error: 'Dieser Link ist abgelaufen. Bitte wende dich an deine Praxis für einen neuen Link.',
    });
    return null;
  }

  return patient;
}

// GET /api/v1/p/:token — Patientendaten für die App laden
router.get('/:token', async (req, res) => {
  const patient = await resolvePatient(req.params.token, res);
  if (!patient) return;

  res.json({
    patient: {
      id: patient.id,
      name: patient.name,
      practice: { name: patient.practice.name },
    },
    programs: patient.programs.map(p => ({
      id: p.id,
      name: p.name,
      notes: p.notes,
      createdAt: p.createdAt,
      items: p.items.map(i => ({
        id: i.id,
        order: i.order,
        sets: i.sets,
        reps: i.reps,
        holdSeconds: i.holdSeconds,
        frequencyPerWeek: i.frequencyPerWeek,
        therapistNote: i.therapistNote,
        // Vom Therapeuten zugewiesene Anpassungen — siehe kai.ts für die
        // Regel, dass Kai diese nur wortgetreu wiedergeben darf.
        adaptations: i.adaptations.map(a => ({
          id: a.adaptation.id,
          labelDe: a.adaptation.labelDe,
          instructionDe: a.adaptation.instructionDe,
          category: a.adaptation.category,
        })),
        exercise: {
          id: i.exercise.id,
          nameDe: i.exercise.nameDe,
          descriptionDe: i.exercise.descriptionDe,
          videoUrl: i.exercise.videoUrl,
          thumbnailUrl: i.exercise.thumbnailUrl,
          bodyRegion: i.exercise.bodyRegion,
          difficulty: i.exercise.difficulty,
        },
      })),
    })),
  });
});

// POST /api/v1/p/:token/log — Übung als erledigt markieren
router.post('/:token/log', async (req, res) => {
  const patient = await resolvePatient(req.params.token, res);
  if (!patient) return;

  const { programId, exerciseId, painLevel, note } = req.body as {
    programId?: string;
    exerciseId?: string;
    painLevel?: number;
    note?: string;
  };

  if (!programId || !exerciseId) {
    res.status(400).json({ error: 'programId und exerciseId sind erforderlich' });
    return;
  }

  // Sicherstellen, dass das Programm diesem Patienten gehört
  const programBelongsToPatient = patient.programs.some(p => p.id === programId);
  if (!programBelongsToPatient) {
    res.status(403).json({ error: 'Programm gehört nicht zu diesem Patienten' });
    return;
  }

  const log = await prisma.sessionLog.create({
    data: {
      programId,
      exerciseId,
      painLevel: painLevel != null
        ? Math.min(10, Math.max(0, Math.round(Number(painLevel))))
        : null,
      note: note?.trim() || null,
    },
  });

  res.status(201).json({ log });
});

// POST /api/v1/p/:token/chat — Kai-Chat
router.post('/:token/chat', async (req, res) => {
  const patient = await resolvePatient(req.params.token, res);
  if (!patient) return;

  const { message } = req.body as { message?: string };
  if (!message?.trim()) {
    res.status(400).json({ error: 'message ist erforderlich' });
    return;
  }

  // Tageslimit prüfen
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todayCount = await prisma.chatMessage.count({
    where: { patientId: patient.id, role: 'user', createdAt: { gte: startOfDay } },
  });

  if (todayCount >= KAI_DAILY_LIMIT) {
    res.status(429).json({
      error: `Tageslimit von ${KAI_DAILY_LIMIT} Nachrichten erreicht. Versuche es morgen wieder.`,
      resetAt: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    });
    return;
  }

  // Kai-Kontext aufbauen
  const exerciseNames = patient.programs
    .flatMap(p => p.items.map(i => i.exercise.nameDe))
    .join(', ');

  // Nur vom Therapeuten zugewiesene Anpassungen landen im Kontext — Kai darf
  // laut Prompt (kai.ts) nur diese wortgetreu wiedergeben, nie eigene erfinden.
  const adaptationsContext: KaiAdaptationContext[] = patient.programs.flatMap(p =>
    p.items.flatMap(i =>
      i.adaptations.map(a => ({
        exerciseName: i.exercise.nameDe,
        labelDe: a.adaptation.labelDe,
        instructionDe: a.adaptation.instructionDe,
      })),
    ),
  );

  // Letzten 10 Nachrichten als Verlauf laden
  const history = await prisma.chatMessage.findMany({
    where: { patientId: patient.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const historyMessages: Anthropic.MessageParam[] = history
    .reverse()
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  const messages: Anthropic.MessageParam[] = [
    ...historyMessages,
    { role: 'user', content: message.trim() },
  ];

  // User-Nachricht persistieren
  await prisma.chatMessage.create({
    data: { patientId: patient.id, role: 'user', content: message.trim() },
  });

  try {
    const aiResponse = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      system: buildKaiPrompt(patient.practice.name, patient.name, exerciseNames, adaptationsContext),
      messages,
    });

    const block = aiResponse.content[0];
    if (block.type !== 'text') {
      res.status(500).json({ error: 'Unerwartete Antwort von Kai' });
      return;
    }

    // Antwort persistieren
    await prisma.chatMessage.create({
      data: { patientId: patient.id, role: 'assistant', content: block.text },
    });

    res.json({
      content: block.text,
      remainingToday: KAI_DAILY_LIMIT - todayCount - 1,
    });
  } catch (err) {
    console.error('Kai error:', err);
    res.status(503).json({
      error: 'Kai ist gerade nicht erreichbar. Versuche es in ein paar Minuten.',
    });
  }
});

export { router as patientPortalRouter };
