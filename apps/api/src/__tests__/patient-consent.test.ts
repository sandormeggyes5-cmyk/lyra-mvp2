import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    patient: { findFirst: vi.fn(), create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    patientConsentEvent: { findMany: vi.fn(), create: vi.fn() },
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

function mockSessionForPractice(practiceId: string, therapistId = 'therapist-1') {
  vi.mocked(auth.api.getSession).mockResolvedValue({
    user: { id: therapistId, email: 't@practice.de', name: 'Therapeutin', practiceId, role: 'therapist' },
    session: { token: 'tok' },
  } as any);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/v1/patients/:id/consent', () => {
  beforeEach(() => mockSessionForPractice(PRACTICE_A));

  it('gibt 404 zurück, wenn der Patient nicht gefunden wird', async () => {
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);

    const res = await request(app).get('/api/v1/patients/patient-1/consent');

    expect(res.status).toBe(404);
  });

  it('gibt die vollständige Event-Historie und hasValidConsent zurück', async () => {
    vi.mocked(prisma.patient.findFirst).mockResolvedValue({ id: 'patient-1', practiceId: PRACTICE_A } as any);
    vi.mocked(prisma.patientConsentEvent.findMany).mockResolvedValue([
      {
        id: 'evt-2',
        type: 'revoked',
        occurredAt: new Date('2026-02-01'),
        textVersion: '2026-10',
        recordedBy: { id: 'therapist-1', name: 'Therapeutin' },
      },
      {
        id: 'evt-1',
        type: 'granted',
        occurredAt: new Date('2026-01-01'),
        textVersion: '2026-10',
        recordedBy: { id: 'therapist-1', name: 'Therapeutin' },
      },
    ] as any);

    const res = await request(app).get('/api/v1/patients/patient-1/consent');

    expect(res.status).toBe(200);
    expect(res.body.events).toHaveLength(2);
    expect(res.body.hasValidConsent).toBe(false); // letztes Event ist revoked
  });

  it('Mandantentrennung: Praxis B erhält 404 für einen Patienten aus Praxis A', async () => {
    mockSessionForPractice(PRACTICE_B);
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null); // findFirst mit practiceId=B findet nichts

    const res = await request(app).get('/api/v1/patients/patient-1/consent');

    expect(res.status).toBe(404);
    expect(prisma.patient.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'patient-1', practiceId: PRACTICE_B } }),
    );
    expect(prisma.patientConsentEvent.findMany).not.toHaveBeenCalled();
  });
});

describe('POST /api/v1/patients/:id/consent', () => {
  beforeEach(() => {
    mockSessionForPractice(PRACTICE_A);
    vi.mocked(prisma.patient.findFirst).mockResolvedValue({ id: 'patient-1', practiceId: PRACTICE_A } as any);
    vi.mocked(prisma.patientConsentEvent.create).mockResolvedValue({ id: 'evt-new' } as any);
  });

  it.each(['granted', 'declined', 'revoked'])('legt ein %s-Event an', async (type) => {
    const res = await request(app)
      .post('/api/v1/patients/patient-1/consent')
      .send({ type, textVersion: '2026-10' });

    expect(res.status).toBe(201);
    expect(prisma.patientConsentEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ patientId: 'patient-1', type, textVersion: '2026-10', recordedById: 'therapist-1' }),
      }),
    );
  });

  it('lehnt einen unbekannten type ab', async () => {
    const res = await request(app)
      .post('/api/v1/patients/patient-1/consent')
      .send({ type: 'maybe', textVersion: '2026-10' });

    expect(res.status).toBe(400);
    expect(prisma.patientConsentEvent.create).not.toHaveBeenCalled();
  });

  it('lehnt eine unbekannte textVersion ab', async () => {
    const res = await request(app)
      .post('/api/v1/patients/patient-1/consent')
      .send({ type: 'granted', textVersion: '1999-01' });

    expect(res.status).toBe(400);
    expect(prisma.patientConsentEvent.create).not.toHaveBeenCalled();
  });

  it('Mandantentrennung: Praxis B kann kein Consent-Event für einen Patienten aus Praxis A anhängen', async () => {
    mockSessionForPractice(PRACTICE_B);
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/patients/patient-1/consent')
      .send({ type: 'granted', textVersion: '2026-10' });

    expect(res.status).toBe(404);
    expect(prisma.patientConsentEvent.create).not.toHaveBeenCalled();
  });
});

// ── Pseudonym-ID (D13-Vorbereitung) ──────────────────────────────────────────

describe('POST /api/v1/patients — pseudonymId', () => {
  beforeEach(() => mockSessionForPractice(PRACTICE_A));

  it('vergibt jedem neuen Patienten automatisch eine pseudonymId', async () => {
    vi.mocked(prisma.patient.create).mockImplementation((({ data }: any) =>
      Promise.resolve({ id: 'patient-new', ...data })) as any);

    const res = await request(app)
      .post('/api/v1/patients')
      .send({ name: 'Neue Patientin' });

    expect(res.status).toBe(201);
    expect(res.body.patient.pseudonymId).toMatch(/^[0-9a-f]{32}$/);
  });

  it('vergibt zwei unterschiedlichen Patienten unterschiedliche pseudonymId-Werte', async () => {
    vi.mocked(prisma.patient.create).mockImplementation((({ data }: any) =>
      Promise.resolve({ id: 'patient-new', ...data })) as any);

    const res1 = await request(app).post('/api/v1/patients').send({ name: 'Patientin 1' });
    const res2 = await request(app).post('/api/v1/patients').send({ name: 'Patientin 2' });

    expect(res1.body.patient.pseudonymId).not.toBe(res2.body.patient.pseudonymId);
  });
});
