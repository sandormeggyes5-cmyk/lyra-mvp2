import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    exercise: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    exerciseAdaptation: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
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

const validatedExercise = {
  id: 'ex-bruecke',
  nameDe: 'Brücke',
  bodyRegion: 'Rücken',
  difficulty: 1,
  isValidated: true,
};

const unvalidatedExercise = {
  id: 'ex-entwurf',
  nameDe: 'Beckenkippung im Rückenliegen',
  bodyRegion: 'LWS',
  difficulty: 1,
  isValidated: false,
};

function mockSessionForRole(role: string) {
  vi.mocked(auth.api.getSession).mockResolvedValue({
    user: { id: 'user-1', email: 'u@practice.de', name: 'Nutzerin', practiceId: 'practice-1', role },
    session: { token: 'tok' },
  } as any);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSessionForRole('therapist');
});

describe('GET /api/v1/exercises — Sichtbarkeit fachlich nicht freigegebener Übungen', () => {
  it('liefert per Default nur validierte Übungen', async () => {
    vi.mocked(prisma.exercise.findMany).mockResolvedValue([validatedExercise] as any);

    const res = await request(app).get('/api/v1/exercises');

    expect(res.status).toBe(200);
    expect(res.body.exercises).toEqual([validatedExercise]);
    expect(prisma.exercise.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isValidated: true }) }),
    );
  });

  it('liefert mit includeUnvalidated=true auch unvalidierte Übungen, isValidated bleibt im Response', async () => {
    vi.mocked(prisma.exercise.findMany).mockResolvedValue([validatedExercise, unvalidatedExercise] as any);

    const res = await request(app).get('/api/v1/exercises?includeUnvalidated=true');

    expect(res.status).toBe(200);
    expect(res.body.exercises).toEqual([validatedExercise, unvalidatedExercise]);
    const [whereArg] = vi.mocked(prisma.exercise.findMany).mock.calls[0];
    expect((whereArg as any).where.isValidated).toBeUndefined();
  });
});

describe('GET /api/v1/exercises/:id — Sichtbarkeit fachlich nicht freigegebener Anpassungen', () => {
  beforeEach(() => {
    vi.mocked(prisma.exercise.findUnique).mockResolvedValue(validatedExercise as any);
  });

  it('filtert Anpassungen per Default auf isValidated: true', async () => {
    vi.mocked(prisma.exerciseAdaptation.findMany).mockResolvedValue([]);

    await request(app).get(`/api/v1/exercises/${validatedExercise.id}`);

    expect(prisma.exerciseAdaptation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isValidated: true }) }),
    );
  });

  it('lässt mit includeUnvalidated=true auch unvalidierte Anpassungen durch', async () => {
    vi.mocked(prisma.exerciseAdaptation.findMany).mockResolvedValue([]);

    await request(app).get(`/api/v1/exercises/${validatedExercise.id}?includeUnvalidated=true`);

    const [callArg] = vi.mocked(prisma.exerciseAdaptation.findMany).mock.calls[0];
    expect((callArg as any).where.isValidated).toBeUndefined();
  });
});

// ── Freigabe-Workflow: PUT .../validation — admin-only ──────────────────────

describe('PUT /api/v1/exercises/:id/validation', () => {
  beforeEach(() => {
    vi.mocked(prisma.exercise.findUnique).mockResolvedValue(unvalidatedExercise as any);
  });

  it('lehnt die Anfrage einer Therapeutin ab (403)', async () => {
    const res = await request(app)
      .put(`/api/v1/exercises/${unvalidatedExercise.id}/validation`)
      .send({ isValidated: true, validatedBy: 'Dr. Müller, Physiotherapeutin' });

    expect(res.status).toBe(403);
    expect(prisma.exercise.update).not.toHaveBeenCalled();
  });

  it('lehnt Freigabe ohne validatedBy ab (400)', async () => {
    mockSessionForRole('admin');

    const res = await request(app)
      .put(`/api/v1/exercises/${unvalidatedExercise.id}/validation`)
      .send({ isValidated: true });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/validatedBy/);
    expect(prisma.exercise.update).not.toHaveBeenCalled();
  });

  it('gibt eine Übung frei (Admin, mit validatedBy)', async () => {
    mockSessionForRole('admin');
    vi.mocked(prisma.exercise.update).mockResolvedValue({ ...unvalidatedExercise, isValidated: true } as any);

    const res = await request(app)
      .put(`/api/v1/exercises/${unvalidatedExercise.id}/validation`)
      .send({ isValidated: true, validatedBy: 'Dr. Müller, Physiotherapeutin' });

    expect(res.status).toBe(200);
    expect(prisma.exercise.update).toHaveBeenCalledWith({
      where: { id: unvalidatedExercise.id },
      data: expect.objectContaining({ isValidated: true, validatedBy: 'Dr. Müller, Physiotherapeutin' }),
    });
    const call = vi.mocked(prisma.exercise.update).mock.calls[0][0];
    expect((call.data as any).validatedAt).toBeInstanceOf(Date);
  });

  it('zieht eine Freigabe zurück (Admin, isValidated: false)', async () => {
    mockSessionForRole('admin');
    vi.mocked(prisma.exercise.findUnique).mockResolvedValue(validatedExercise as any);
    vi.mocked(prisma.exercise.update).mockResolvedValue({ ...validatedExercise, isValidated: false } as any);

    const res = await request(app)
      .put(`/api/v1/exercises/${validatedExercise.id}/validation`)
      .send({ isValidated: false });

    expect(res.status).toBe(200);
    expect(prisma.exercise.update).toHaveBeenCalledWith({
      where: { id: validatedExercise.id },
      data: { isValidated: false, validatedBy: null, validatedAt: null },
    });
  });

  it('liefert 404 für eine unbekannte Übung', async () => {
    mockSessionForRole('admin');
    vi.mocked(prisma.exercise.findUnique).mockResolvedValue(null);

    const res = await request(app)
      .put('/api/v1/exercises/nicht-existent/validation')
      .send({ isValidated: true, validatedBy: 'Dr. Müller' });

    expect(res.status).toBe(404);
  });
});

describe('PUT /api/v1/exercises/:exerciseId/adaptations/:adaptationId/validation', () => {
  const adaptation = { id: 'adapt-1', exerciseId: validatedExercise.id, isValidated: false };

  it('lehnt die Anfrage einer Therapeutin ab (403)', async () => {
    const res = await request(app)
      .put(`/api/v1/exercises/${validatedExercise.id}/adaptations/${adaptation.id}/validation`)
      .send({ isValidated: true, validatedBy: 'Dr. Müller' });

    expect(res.status).toBe(403);
  });

  it('gibt eine Anpassung frei (Admin, mit validatedBy)', async () => {
    mockSessionForRole('admin');
    vi.mocked(prisma.exerciseAdaptation.findUnique).mockResolvedValue(adaptation as any);
    vi.mocked(prisma.exerciseAdaptation.update).mockResolvedValue({ ...adaptation, isValidated: true } as any);

    const res = await request(app)
      .put(`/api/v1/exercises/${validatedExercise.id}/adaptations/${adaptation.id}/validation`)
      .send({ isValidated: true, validatedBy: 'Dr. Müller, Physiotherapeutin' });

    expect(res.status).toBe(200);
    expect(prisma.exerciseAdaptation.update).toHaveBeenCalledWith({
      where: { id: adaptation.id },
      data: expect.objectContaining({ isValidated: true, validatedBy: 'Dr. Müller, Physiotherapeutin' }),
    });
  });

  it('liefert 404, wenn die Anpassung nicht zur angegebenen exerciseId gehört', async () => {
    mockSessionForRole('admin');
    vi.mocked(prisma.exerciseAdaptation.findUnique).mockResolvedValue({ ...adaptation, exerciseId: 'andere-uebung' } as any);

    const res = await request(app)
      .put(`/api/v1/exercises/${validatedExercise.id}/adaptations/${adaptation.id}/validation`)
      .send({ isValidated: true, validatedBy: 'Dr. Müller' });

    expect(res.status).toBe(404);
    expect(prisma.exerciseAdaptation.update).not.toHaveBeenCalled();
  });
});
