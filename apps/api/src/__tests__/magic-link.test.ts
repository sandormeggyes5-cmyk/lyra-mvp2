import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    patient: { findUnique: vi.fn() },
    sessionLog: { create: vi.fn() },
  },
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(function (this: Record<string, unknown>) {
    this.messages = { create: vi.fn() };
  }),
}));

vi.mock('better-auth/node', () => ({
  toNodeHandler: vi.fn(function () {
    return function (_req: unknown, _res: unknown, next?: () => void) {
      next?.();
    };
  }),
  fromNodeHeaders: vi.fn(function (h: unknown) { return h; }),
}));

vi.mock('../lib/auth.js', () => ({
  auth: {
    api: { getSession: vi.fn().mockResolvedValue(null) },
    handler: vi.fn(),
  },
}));

import { prisma } from '../lib/prisma.js';
import { app } from '../app.js';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const activePatient = {
  id: 'patient-1',
  name: 'Hans Muster',
  magicLinkToken: 'active-token',
  magicLinkExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
  practice: { name: 'Praxis Bergmann' },
  programs: [
    {
      id: 'prog-1',
      name: 'Rücken-Aufbau',
      notes: null,
      createdAt: new Date(),
      items: [
        {
          id: 'item-1',
          order: 1,
          sets: 3,
          reps: 12,
          holdSeconds: null,
          frequencyPerWeek: 3,
          exercise: {
            id: 'ex-1',
            nameDe: 'Brücke',
            descriptionDe: 'Lege dich auf den Rücken...',
            videoUrl: null,
            thumbnailUrl: null,
            bodyRegion: 'Rücken',
            difficulty: 1,
          },
        },
      ],
    },
  ],
};

const expiredPatient = {
  ...activePatient,
  magicLinkToken: 'expired-token',
  magicLinkExpiresAt: new Date(Date.now() - 1000 * 60 * 60), // 1 Stunde vergangen
};

// ── GET /api/v1/p/:token ──────────────────────────────────────────────────────

describe('GET /api/v1/p/:token — Token-Validierung', () => {
  beforeEach(() => vi.clearAllMocks());

  it('gibt 404 zurück für unbekanntes Token', async () => {
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(null);

    const res = await request(app).get('/api/v1/p/unknown-token');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/ungültig/i);
  });

  it('gibt 410 zurück für abgelaufenes Token', async () => {
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(expiredPatient as any);

    const res = await request(app).get('/api/v1/p/expired-token');

    expect(res.status).toBe(410);
    expect(res.body.error).toMatch(/abgelaufen/i);
  });

  it('gibt Patientendaten und Programme zurück für gültiges Token', async () => {
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(activePatient as any);

    const res = await request(app).get('/api/v1/p/active-token');

    expect(res.status).toBe(200);
    expect(res.body.patient.name).toBe('Hans Muster');
    expect(res.body.patient.practice.name).toBe('Praxis Bergmann');
    expect(res.body.programs).toHaveLength(1);
    expect(res.body.programs[0].items[0].exercise.nameDe).toBe('Brücke');
  });

  it('gibt keinen magicLinkToken in der Antwort zurück (kein Token-Leak)', async () => {
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(activePatient as any);

    const res = await request(app).get('/api/v1/p/active-token');

    expect(JSON.stringify(res.body)).not.toContain('magicLinkToken');
  });

  it('akzeptiert Token ohne Ablaufdatum (null)', async () => {
    vi.mocked(prisma.patient.findUnique).mockResolvedValue({
      ...activePatient,
      magicLinkExpiresAt: null,
    } as any);

    const res = await request(app).get('/api/v1/p/active-token');

    expect(res.status).toBe(200);
  });
});

// ── POST /api/v1/p/:token/log ─────────────────────────────────────────────────

describe('POST /api/v1/p/:token/log — Übung als erledigt markieren', () => {
  beforeEach(() => {
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(activePatient as any);
    vi.mocked(prisma.sessionLog.create).mockResolvedValue({ id: 'log-1' } as any);
  });

  it('gibt 400 zurück wenn programId fehlt', async () => {
    const res = await request(app)
      .post('/api/v1/p/active-token/log')
      .send({ exerciseId: 'ex-1' });

    expect(res.status).toBe(400);
  });

  it('gibt 403 zurück wenn Programm nicht zum Patient gehört', async () => {
    const res = await request(app)
      .post('/api/v1/p/active-token/log')
      .send({ programId: 'fremdes-programm-id', exerciseId: 'ex-1' });

    expect(res.status).toBe(403);
  });

  it('legt SessionLog an und gibt 201 zurück', async () => {
    const res = await request(app)
      .post('/api/v1/p/active-token/log')
      .send({ programId: 'prog-1', exerciseId: 'ex-1', painLevel: 2, note: 'Leicht gezogen' });

    expect(res.status).toBe(201);
    expect(prisma.sessionLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ programId: 'prog-1', exerciseId: 'ex-1', painLevel: 2 }),
      }),
    );
  });

  it('klemmt painLevel auf maximal 10', async () => {
    await request(app)
      .post('/api/v1/p/active-token/log')
      .send({ programId: 'prog-1', exerciseId: 'ex-1', painLevel: 999 });

    expect(prisma.sessionLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ painLevel: 10 }) }),
    );
  });

  it('klemmt painLevel auf minimal 0', async () => {
    await request(app)
      .post('/api/v1/p/active-token/log')
      .send({ programId: 'prog-1', exerciseId: 'ex-1', painLevel: -5 });

    expect(prisma.sessionLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ painLevel: 0 }) }),
    );
  });
});
