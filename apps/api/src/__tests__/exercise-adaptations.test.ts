import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    patient: { findFirst: vi.fn() },
    exercise: { findMany: vi.fn(), findUnique: vi.fn() },
    exerciseAdaptation: { findMany: vi.fn(), create: vi.fn() },
    exerciseProgram: { create: vi.fn() },
  },
}));

vi.mock('../lib/auth.js', () => ({
  auth: {
    handler: vi.fn(),
    api: { getSession: vi.fn() },
  },
}));

vi.mock('better-auth/node', () => ({
  toNodeHandler: vi.fn(function () {
    return function (_req: unknown, _res: unknown, next?: () => void) {
      next?.();
    };
  }),
  fromNodeHeaders: vi.fn(function (h: unknown) { return h; }),
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(function (this: Record<string, unknown>) {
    this.messages = { create: vi.fn() };
  }),
}));

import { prisma } from '../lib/prisma.js';
import { auth } from '../lib/auth.js';
import { app } from '../app.js';

const PRACTICE_A = 'practice-A';
const PRACTICE_B = 'practice-B';

function mockSessionForPractice(practiceId: string) {
  vi.mocked(auth.api.getSession).mockResolvedValue({
    user: { id: 'therapist-1', email: 't@practice-a.de', name: 'Therapeutin A', practiceId, role: 'therapist' },
    session: { token: 'tok' },
  } as any);
}

const exerciseBridge = {
  id: 'ex-bruecke',
  nameDe: 'Brücke',
  descriptionDe: '…',
  videoUrl: null,
  thumbnailUrl: null,
  muscleGroups: [],
  bodyRegion: 'Rücken',
  difficulty: 1,
  defaultSets: 3,
  defaultReps: 12,
  defaultHoldSeconds: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Mission-kritisch: Cross-Tenant-Zuweisung einer Anpassung ─────────────────

describe('POST /api/v1/programs — Mandantentrennung bei ExerciseAdaptation (mission critical)', () => {
  beforeEach(() => {
    mockSessionForPractice(PRACTICE_A);
    vi.mocked(prisma.patient.findFirst).mockResolvedValue({ id: 'patient-1', practiceId: PRACTICE_A } as any);
    vi.mocked(prisma.exercise.findMany).mockResolvedValue([exerciseBridge] as any);
  });

  it('lehnt eine praxiseigene Anpassung von Praxis B ab, wenn Praxis A sie zuweisen will', async () => {
    // Anpassung existiert, gehört aber Praxis B, nicht der anfragenden Praxis A.
    vi.mocked(prisma.exerciseAdaptation.findMany).mockResolvedValue([
      { id: 'adapt-B', exerciseId: exerciseBridge.id, isSystem: false, practiceId: PRACTICE_B },
    ] as any);

    const res = await request(app)
      .post('/api/v1/programs')
      .send({
        patientId: 'patient-1',
        name: 'Rücken-Programm',
        items: [
          {
            exerciseId: exerciseBridge.id,
            sets: 3,
            reps: 12,
            frequencyPerWeek: 3,
            adaptationIds: ['adapt-B'],
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/gehört nicht zu dieser Praxis/i);
    // Am wichtigsten: das Programm darf in diesem Fall gar nicht erst angelegt werden.
    expect(prisma.exerciseProgram.create).not.toHaveBeenCalled();
  });

  it('erlaubt eine System-Anpassung (isSystem: true, keine Praxis)', async () => {
    vi.mocked(prisma.exerciseAdaptation.findMany).mockResolvedValue([
      { id: 'adapt-system', exerciseId: exerciseBridge.id, isSystem: true, practiceId: null },
    ] as any);
    vi.mocked(prisma.exerciseProgram.create).mockResolvedValue({ id: 'prog-1', items: [] } as any);

    const res = await request(app)
      .post('/api/v1/programs')
      .send({
        patientId: 'patient-1',
        name: 'Rücken-Programm',
        items: [
          { exerciseId: exerciseBridge.id, sets: 3, reps: 12, frequencyPerWeek: 3, adaptationIds: ['adapt-system'] },
        ],
      });

    expect(res.status).toBe(201);
    expect(prisma.exerciseProgram.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          items: {
            create: [
              expect.objectContaining({
                adaptations: { create: [{ adaptationId: 'adapt-system' }] },
              }),
            ],
          },
        }),
      }),
    );
  });

  it('erlaubt eine praxiseigene Anpassung der eigenen Praxis (isSystem: false, practiceId = eigene Praxis)', async () => {
    vi.mocked(prisma.exerciseAdaptation.findMany).mockResolvedValue([
      { id: 'adapt-own', exerciseId: exerciseBridge.id, isSystem: false, practiceId: PRACTICE_A },
    ] as any);
    vi.mocked(prisma.exerciseProgram.create).mockResolvedValue({ id: 'prog-1', items: [] } as any);

    const res = await request(app)
      .post('/api/v1/programs')
      .send({
        patientId: 'patient-1',
        name: 'Rücken-Programm',
        items: [
          { exerciseId: exerciseBridge.id, sets: 3, reps: 12, frequencyPerWeek: 3, adaptationIds: ['adapt-own'] },
        ],
      });

    expect(res.status).toBe(201);
    expect(prisma.exerciseProgram.create).toHaveBeenCalled();
  });

  it('lehnt eine adaptationId ab, die zu einer anderen Übung gehört', async () => {
    vi.mocked(prisma.exerciseAdaptation.findMany).mockResolvedValue([
      { id: 'adapt-wrong-exercise', exerciseId: 'ex-andere-uebung', isSystem: true, practiceId: null },
    ] as any);

    const res = await request(app)
      .post('/api/v1/programs')
      .send({
        patientId: 'patient-1',
        name: 'Rücken-Programm',
        items: [
          { exerciseId: exerciseBridge.id, sets: 3, reps: 12, frequencyPerWeek: 3, adaptationIds: ['adapt-wrong-exercise'] },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/gehört nicht zur Übung/i);
    expect(prisma.exerciseProgram.create).not.toHaveBeenCalled();
  });

  it('lehnt eine unbekannte adaptationId ab', async () => {
    vi.mocked(prisma.exerciseAdaptation.findMany).mockResolvedValue([]);

    const res = await request(app)
      .post('/api/v1/programs')
      .send({
        patientId: 'patient-1',
        name: 'Rücken-Programm',
        items: [
          { exerciseId: exerciseBridge.id, sets: 3, reps: 12, frequencyPerWeek: 3, adaptationIds: ['nicht-existent'] },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/nicht gefunden/i);
    expect(prisma.exerciseProgram.create).not.toHaveBeenCalled();
  });
});

// ── Mandantentrennung beim Lesen der verfügbaren Anpassungen ─────────────────

describe('GET /api/v1/exercises/:id — Mandantentrennung bei verfügbaren Anpassungen', () => {
  beforeEach(() => {
    mockSessionForPractice(PRACTICE_A);
    vi.mocked(prisma.exercise.findUnique).mockResolvedValue(exerciseBridge as any);
    vi.mocked(prisma.exerciseAdaptation.findMany).mockResolvedValue([]);
  });

  it('fragt Anpassungen nur für System-Anpassungen oder die eigene Praxis ab', async () => {
    await request(app).get(`/api/v1/exercises/${exerciseBridge.id}`);

    expect(prisma.exerciseAdaptation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          exerciseId: exerciseBridge.id,
          OR: [{ isSystem: true }, { practiceId: PRACTICE_A }],
        },
      }),
    );
  });
});
