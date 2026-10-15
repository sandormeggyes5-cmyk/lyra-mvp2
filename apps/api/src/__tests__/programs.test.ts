import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

const mockTx = {
  programExercise: { deleteMany: vi.fn() },
  exerciseProgram: { create: vi.fn(), update: vi.fn() },
  programSnapshot: { create: vi.fn() },
};

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    patient: { findFirst: vi.fn() },
    exercise: { findMany: vi.fn() },
    exerciseAdaptation: { findMany: vi.fn() },
    exerciseProgram: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(async (cb: (tx: typeof mockTx) => unknown) => cb(mockTx)),
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

const PRACTICE_ID = 'practice-1';
const DEFAULT_START_DATE = new Date('2026-01-01');

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
  isValidated: true,
  exerciseType: 'Kräftigung',
  position: 'Rückenlage',
  equipment: [],
};

const adaptationHohlkreuz = {
  id: 'adapt-hohlkreuz',
  exerciseId: exerciseBridge.id,
  labelDe: 'Hohlkreuz vermeiden',
  isSystem: true,
  practiceId: null,
  isValidated: true,
};

function validItem(overrides: Record<string, unknown> = {}) {
  return {
    exerciseId: exerciseBridge.id,
    sets: 3,
    reps: 12,
    frequencyPerWeek: 3,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue({
    user: { id: 'therapist-1', email: 't@practice.de', name: 'Therapeutin', practiceId: PRACTICE_ID, role: 'therapist' },
    session: { token: 'tok' },
  } as any);
  vi.mocked(prisma.patient.findFirst).mockResolvedValue({ id: 'patient-1', practiceId: PRACTICE_ID } as any);
  vi.mocked(prisma.exercise.findMany).mockResolvedValue([exerciseBridge] as any);
  vi.mocked(prisma.exerciseAdaptation.findMany).mockResolvedValue([]);
  mockTx.exerciseProgram.create.mockResolvedValue({
    id: 'prog-1', items: [], startDate: DEFAULT_START_DATE, endDate: null, status: 'active',
  } as any);
  vi.mocked(prisma.exerciseProgram.findFirst).mockResolvedValue({
    id: 'prog-1', patientId: 'patient-1', startDate: DEFAULT_START_DATE, endDate: null, status: 'active', items: [],
  } as any);
  mockTx.exerciseProgram.update.mockResolvedValue({
    id: 'prog-1', items: [], startDate: DEFAULT_START_DATE, endDate: null, status: 'active',
  } as any);
});

// ── POST /api/v1/programs — Mengen-Validierung ───────────────────────────────

describe('POST /api/v1/programs — Validierung von sets/reps/frequencyPerWeek/holdSeconds/therapistNote', () => {
  it.each([
    ['sets = 0', validItem({ sets: 0 }), /sets/],
    ['sets = 101', validItem({ sets: 101 }), /sets/],
    ['sets = 1.5 (nicht ganzzahlig)', validItem({ sets: 1.5 }), /sets/],
    ['reps = 0', validItem({ reps: 0 }), /reps/],
    ['reps = 101', validItem({ reps: 101 }), /reps/],
    ['frequencyPerWeek = 0', validItem({ frequencyPerWeek: 0 }), /frequencyPerWeek/],
    ['frequencyPerWeek = 101', validItem({ frequencyPerWeek: 101 }), /frequencyPerWeek/],
    ['holdSeconds = 0', validItem({ holdSeconds: 0 }), /holdSeconds/],
    ['holdSeconds = 601', validItem({ holdSeconds: 601 }), /holdSeconds/],
    ['therapistNote > 1000 Zeichen', validItem({ therapistNote: 'x'.repeat(1001) }), /therapistNote/],
  ])('lehnt %s ab', async (_label, item, errorPattern) => {
    const res = await request(app)
      .post('/api/v1/programs')
      .send({ patientId: 'patient-1', name: 'Testprogramm', items: [item] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(errorPattern);
    expect(mockTx.exerciseProgram.create).not.toHaveBeenCalled();
  });

  it('akzeptiert Grenzwerte (sets/reps/frequencyPerWeek = 1 und 100, holdSeconds = 1 und 600)', async () => {
    const resLow = await request(app)
      .post('/api/v1/programs')
      .send({
        patientId: 'patient-1',
        name: 'Testprogramm',
        items: [validItem({ sets: 1, reps: 1, frequencyPerWeek: 1, holdSeconds: 1 })],
      });
    expect(resLow.status).toBe(201);

    const resHigh = await request(app)
      .post('/api/v1/programs')
      .send({
        patientId: 'patient-1',
        name: 'Testprogramm',
        items: [validItem({ sets: 100, reps: 100, frequencyPerWeek: 100, holdSeconds: 600 })],
      });
    expect(resHigh.status).toBe(201);
  });

  it('akzeptiert therapistNote mit genau 1000 Zeichen und holdSeconds = null', async () => {
    const res = await request(app)
      .post('/api/v1/programs')
      .send({
        patientId: 'patient-1',
        name: 'Testprogramm',
        items: [validItem({ therapistNote: 'x'.repeat(1000), holdSeconds: null })],
      });

    expect(res.status).toBe(201);
  });
});

// ── PUT /api/v1/programs/:id/items — dieselbe Validierung ───────────────────

describe('PUT /api/v1/programs/:id/items — Mengen-Validierung', () => {
  it('lehnt ungültige Werte ab, ohne das Programm zu verändern', async () => {
    const res = await request(app)
      .put('/api/v1/programs/prog-1/items')
      .send({ items: [validItem({ sets: 0 })] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/sets/);
    expect(mockTx.programExercise.deleteMany).not.toHaveBeenCalled();
  });

  it('akzeptiert gültige Werte', async () => {
    const res = await request(app)
      .put('/api/v1/programs/prog-1/items')
      .send({ items: [validItem()] });

    expect(res.status).toBe(200);
  });

  it('erzeugt immer einen neuen ProgramSnapshot (Übungsliste/Häufigkeit zählt immer als Änderung)', async () => {
    const res = await request(app)
      .put('/api/v1/programs/prog-1/items')
      .send({ items: [validItem()] });

    expect(res.status).toBe(200);
    expect(mockTx.programSnapshot.create).toHaveBeenCalledTimes(1);
    expect(mockTx.programSnapshot.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ programId: 'prog-1', changedById: 'therapist-1' }) }),
    );
    expect(mockTx.exerciseProgram.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ updatedById: 'therapist-1' }) }),
    );
  });
});

// ── Programmlaufzeit (A1) ────────────────────────────────────────────────────

describe('POST /api/v1/programs — Programmlaufzeit', () => {
  it('setzt startDate auf heute, wenn keins übergeben wird', async () => {
    const before = Date.now();
    const res = await request(app)
      .post('/api/v1/programs')
      .send({ patientId: 'patient-1', name: 'Testprogramm', items: [validItem()] });

    expect(res.status).toBe(201);
    const sentStartDate = (mockTx.exerciseProgram.create.mock.calls[0]![0] as any).data.startDate as Date;
    expect(sentStartDate.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('übernimmt ein übergebenes startDate/endDate', async () => {
    const res = await request(app)
      .post('/api/v1/programs')
      .send({
        patientId: 'patient-1',
        name: 'Testprogramm',
        startDate: '2026-02-01',
        endDate: '2026-08-01',
        items: [validItem()],
      });

    expect(res.status).toBe(201);
    expect(mockTx.exerciseProgram.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ startDate: new Date('2026-02-01'), endDate: new Date('2026-08-01') }),
      }),
    );
  });

  it('lehnt endDate vor startDate ab, ohne das Programm anzulegen', async () => {
    const res = await request(app)
      .post('/api/v1/programs')
      .send({
        patientId: 'patient-1',
        name: 'Testprogramm',
        startDate: '2026-08-01',
        endDate: '2026-02-01',
        items: [validItem()],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/endDate/);
    expect(mockTx.exerciseProgram.create).not.toHaveBeenCalled();
  });

  it('erzeugt bei der Programmerstellung einen initialen ProgramSnapshot mit validFrom = startDate', async () => {
    const res = await request(app)
      .post('/api/v1/programs')
      .send({ patientId: 'patient-1', name: 'Testprogramm', startDate: '2026-02-01', items: [validItem()] });

    expect(res.status).toBe(201);
    expect(mockTx.programSnapshot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ programId: 'prog-1', validFrom: DEFAULT_START_DATE, changedById: 'therapist-1' }),
      }),
    );
  });
});

describe('PUT /api/v1/programs/:id — Laufzeit, Status, updatedAt/updatedById, Änderungsregel (C9)', () => {
  it('lehnt endDate vor startDate ab', async () => {
    const res = await request(app)
      .put('/api/v1/programs/prog-1')
      .send({ startDate: '2026-08-01', endDate: '2026-02-01' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/endDate/);
    expect(mockTx.exerciseProgram.update).not.toHaveBeenCalled();
  });

  it('lehnt einen unbekannten status ab', async () => {
    const res = await request(app)
      .put('/api/v1/programs/prog-1')
      .send({ status: 'erledigt' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/status/);
    expect(mockTx.exerciseProgram.update).not.toHaveBeenCalled();
  });

  it('setzt updatedById bei jedem Aufruf, auch bei reiner Name-Änderung', async () => {
    const res = await request(app)
      .put('/api/v1/programs/prog-1')
      .send({ name: 'Neuer Name' });

    expect(res.status).toBe(200);
    expect(mockTx.exerciseProgram.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ updatedById: 'therapist-1' }) }),
    );
  });

  it('erzeugt KEINEN Snapshot bei reiner Name-/Notiz-Änderung', async () => {
    const res = await request(app)
      .put('/api/v1/programs/prog-1')
      .send({ name: 'Neuer Name', notes: 'Neue Notiz' });

    expect(res.status).toBe(200);
    expect(mockTx.programSnapshot.create).not.toHaveBeenCalled();
  });

  it('erzeugt einen Snapshot, wenn sich startDate ändert', async () => {
    const res = await request(app)
      .put('/api/v1/programs/prog-1')
      .send({ startDate: '2026-03-01' });

    expect(res.status).toBe(200);
    expect(mockTx.programSnapshot.create).toHaveBeenCalledTimes(1);
  });

  it('erzeugt einen Snapshot, wenn sich status ändert (Pause verändert das Soll)', async () => {
    const res = await request(app)
      .put('/api/v1/programs/prog-1')
      .send({ status: 'paused' });

    expect(res.status).toBe(200);
    expect(mockTx.programSnapshot.create).toHaveBeenCalledTimes(1);
    expect(mockTx.exerciseProgram.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'paused' }) }),
    );
  });

  it('erzeugt einen Snapshot, wenn sich endDate ändert', async () => {
    const res = await request(app)
      .put('/api/v1/programs/prog-1')
      .send({ endDate: '2026-12-01' });

    expect(res.status).toBe(200);
    expect(mockTx.programSnapshot.create).toHaveBeenCalledTimes(1);
  });

  it('Mandantentrennung: 404 für ein Programm aus einer anderen Praxis', async () => {
    vi.mocked(prisma.exerciseProgram.findFirst).mockResolvedValue(null);

    const res = await request(app)
      .put('/api/v1/programs/fremdes-programm')
      .send({ status: 'paused' });

    expect(res.status).toBe(404);
    expect(mockTx.exerciseProgram.update).not.toHaveBeenCalled();
  });
});

// ── Fachliche Freigabe: unvalidierte Übungen/Anpassungen dürfen nicht ──────
// verordnet werden, außer über den Dev-only Bypass (ALLOW_UNVALIDATED_EXERCISES).

describe('Verordnung von fachlich nicht freigegebenen Übungen/Anpassungen', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('POST /api/v1/programs lehnt eine unvalidierte Übung ab', async () => {
    vi.mocked(prisma.exercise.findMany).mockResolvedValue([{ ...exerciseBridge, isValidated: false }] as any);

    const res = await request(app)
      .post('/api/v1/programs')
      .send({ patientId: 'patient-1', name: 'Testprogramm', items: [validItem()] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/nicht freigegeben/);
    expect(mockTx.exerciseProgram.create).not.toHaveBeenCalled();
  });

  it('POST /api/v1/programs erlaubt eine unvalidierte Übung mit aktivem Dev-Bypass', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('ALLOW_UNVALIDATED_EXERCISES', 'true');
    vi.mocked(prisma.exercise.findMany).mockResolvedValue([{ ...exerciseBridge, isValidated: false }] as any);

    const res = await request(app)
      .post('/api/v1/programs')
      .send({ patientId: 'patient-1', name: 'Testprogramm', items: [validItem()] });

    expect(res.status).toBe(201);
  });

  it('POST /api/v1/programs ignoriert den Dev-Bypass in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ALLOW_UNVALIDATED_EXERCISES', 'true');
    vi.mocked(prisma.exercise.findMany).mockResolvedValue([{ ...exerciseBridge, isValidated: false }] as any);

    const res = await request(app)
      .post('/api/v1/programs')
      .send({ patientId: 'patient-1', name: 'Testprogramm', items: [validItem()] });

    expect(res.status).toBe(400);
  });

  it('PUT /api/v1/programs/:id/items lehnt eine unvalidierte Übung ab', async () => {
    vi.mocked(prisma.exercise.findMany).mockResolvedValue([{ ...exerciseBridge, isValidated: false }] as any);

    const res = await request(app)
      .put('/api/v1/programs/prog-1/items')
      .send({ items: [validItem()] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/nicht freigegeben/);
    expect(mockTx.programExercise.deleteMany).not.toHaveBeenCalled();
  });

  it('POST /api/v1/programs lehnt eine unvalidierte Anpassung ab', async () => {
    vi.mocked(prisma.exerciseAdaptation.findMany).mockResolvedValue([
      { ...adaptationHohlkreuz, isValidated: false },
    ] as any);

    const res = await request(app)
      .post('/api/v1/programs')
      .send({
        patientId: 'patient-1',
        name: 'Testprogramm',
        items: [validItem({ adaptationIds: [adaptationHohlkreuz.id] })],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/nicht freigegeben/);
    expect(mockTx.exerciseProgram.create).not.toHaveBeenCalled();
  });

  it('POST /api/v1/programs akzeptiert eine validierte Anpassung', async () => {
    vi.mocked(prisma.exerciseAdaptation.findMany).mockResolvedValue([adaptationHohlkreuz] as any);

    const res = await request(app)
      .post('/api/v1/programs')
      .send({
        patientId: 'patient-1',
        name: 'Testprogramm',
        items: [validItem({ adaptationIds: [adaptationHohlkreuz.id] })],
      });

    expect(res.status).toBe(201);
  });
});
