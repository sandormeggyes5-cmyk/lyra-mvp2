import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// vi.hoisted: Variablen die im vi.mock-Factory gebraucht werden, müssen vor dem
// Hoisting verfügbar sein — vi.hoisted() garantiert das.
const mockAnthropicCreate = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: 'Mocked Kai response' }],
  }),
);

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    patient: { findUnique: vi.fn() },
    chatMessage: { count: vi.fn(), create: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock('@anthropic-ai/sdk', () => ({
  // Klasse statt Arrow-Function — Vitest 4 braucht function/class für new()
  default: vi.fn(function (this: Record<string, unknown>) {
    this.messages = { create: mockAnthropicCreate };
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

import { buildKaiPrompt, KAI_DAILY_LIMIT } from '../lib/kai.js';
import { prisma } from '../lib/prisma.js';
import { app } from '../app.js';

// ── Unit-Tests: System-Prompt-Inhalt ─────────────────────────────────────────

describe('buildKaiPrompt — regulatorische Pflichtinhalte', () => {
  const prompt = buildKaiPrompt('Praxis Müller', 'Max Muster', 'Brücke, Wandsitz');

  it('enthält das Verbot medizinischer Ratschläge', () => {
    expect(prompt).toContain('Keine medizinischen Ratschläge');
    expect(prompt).toContain('keine Diagnosen');
    expect(prompt).toContain('keine Therapieänderungen');
  });

  it('enthält die Weiterleitungsanweisung an den Therapeuten', () => {
    expect(prompt).toContain('Bitte wende dich dazu direkt an deine Therapeutin oder deinen Therapeuten');
  });

  it('enthält den Praxisnamen in der Weiterleitungsanweisung', () => {
    expect(prompt).toContain('Praxis Müller');
  });

  it('enthält den Patientennamen', () => {
    expect(prompt).toContain('Max Muster');
  });

  it('enthält die aktuellen Übungen als Kontext', () => {
    expect(prompt).toContain('Brücke, Wandsitz');
  });

  it('zeigt Fallback wenn keine Übungen vorhanden', () => {
    const fallback = buildKaiPrompt('Praxis X', 'Patient Y', '');
    expect(fallback).toContain('noch keine Übungen zugewiesen');
  });
});

// ── Integration-Tests: Rate-Limit ─────────────────────────────────────────────

const validPatient = {
  id: 'patient-1',
  name: 'Anna Muster',
  magicLinkToken: 'valid-token-abc',
  magicLinkExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
  practice: { name: 'Physiotherapie am Markt' },
  programs: [
    {
      id: 'prog-1',
      items: [
        { exercise: { nameDe: 'Brücke' }, adaptations: [] },
        { exercise: { nameDe: 'Wandsitz' }, adaptations: [] },
      ],
    },
  ],
};

const patientWithAdaptation = {
  ...validPatient,
  programs: [
    {
      id: 'prog-1',
      items: [
        {
          exercise: { nameDe: 'Brücke' },
          adaptations: [
            {
              adaptation: {
                labelDe: 'Hohlkreuz vermeiden',
                instructionDe: 'Hebe die Hüfte nur so weit, wie der untere Rücken flach bleibt.',
              },
            },
          ],
        },
        { exercise: { nameDe: 'Wandsitz' }, adaptations: [] },
      ],
    },
  ],
};

describe('POST /api/v1/p/:token/chat — Rate-Limit', () => {
  beforeEach(() => {
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(validPatient as any);
    vi.mocked(prisma.chatMessage.findMany).mockResolvedValue([]);
    vi.mocked(prisma.chatMessage.create).mockResolvedValue({} as any);
    mockAnthropicCreate.mockClear();
  });

  it(`gibt 429 zurück wenn Tageslimit (${KAI_DAILY_LIMIT}) erreicht ist`, async () => {
    vi.mocked(prisma.chatMessage.count).mockResolvedValue(KAI_DAILY_LIMIT);

    const res = await request(app)
      .post('/api/v1/p/valid-token-abc/chat')
      .send({ message: 'Wie führe ich die Brücke aus?' });

    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/Tageslimit/i);
    expect(res.body.resetAt).toBeDefined();
  });

  it('ruft Anthropic NICHT auf wenn das Tageslimit erreicht ist', async () => {
    vi.mocked(prisma.chatMessage.count).mockResolvedValue(KAI_DAILY_LIMIT);

    await request(app)
      .post('/api/v1/p/valid-token-abc/chat')
      .send({ message: 'Irgendeine Frage' });

    expect(mockAnthropicCreate).not.toHaveBeenCalled();
  });

  it('gibt remainingToday korrekt zurück', async () => {
    vi.mocked(prisma.chatMessage.count).mockResolvedValue(5);

    const res = await request(app)
      .post('/api/v1/p/valid-token-abc/chat')
      .send({ message: 'Wie lange soll ich die Übung halten?' });

    expect(res.status).toBe(200);
    expect(res.body.remainingToday).toBe(KAI_DAILY_LIMIT - 5 - 1);
  });

  it('gibt 400 zurück wenn message fehlt', async () => {
    const res = await request(app)
      .post('/api/v1/p/valid-token-abc/chat')
      .send({});

    expect(res.status).toBe(400);
  });
});

// ── Integration-Tests: System-Prompt an Anthropic ────────────────────────────

describe('POST /api/v1/p/:token/chat — Guardrail im System-Prompt', () => {
  beforeEach(() => {
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(validPatient as any);
    vi.mocked(prisma.chatMessage.count).mockResolvedValue(0);
    vi.mocked(prisma.chatMessage.findMany).mockResolvedValue([]);
    vi.mocked(prisma.chatMessage.create).mockResolvedValue({} as any);
    mockAnthropicCreate.mockClear();
  });

  it('übergibt System-Prompt mit medizinischen Guardrails an Anthropic', async () => {
    await request(app)
      .post('/api/v1/p/valid-token-abc/chat')
      .send({ message: 'Mein Knie schmerzt beim Wandsitz — was tun?' });

    expect(mockAnthropicCreate).toHaveBeenCalledOnce();
    const callArgs = mockAnthropicCreate.mock.calls[0]?.[0] as { system: string };
    expect(callArgs.system).toContain('Keine medizinischen Ratschläge');
    expect(callArgs.system).toContain('Bitte wende dich dazu direkt an deine Therapeutin oder deinen Therapeuten');
    expect(callArgs.system).toContain('Physiotherapie am Markt');
  });
});

// ── Integration-Tests: Zugewiesene Anpassungen im Kai-Kontext ────────────────

describe('POST /api/v1/p/:token/chat — Übungs-Anpassungen im Kontext', () => {
  beforeEach(() => {
    vi.mocked(prisma.chatMessage.count).mockResolvedValue(0);
    vi.mocked(prisma.chatMessage.findMany).mockResolvedValue([]);
    vi.mocked(prisma.chatMessage.create).mockResolvedValue({} as any);
    mockAnthropicCreate.mockClear();
  });

  it('gibt eine zugewiesene Anpassung wortgetreu im System-Prompt an Kai weiter', async () => {
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(patientWithAdaptation as any);

    await request(app)
      .post('/api/v1/p/valid-token-abc/chat')
      .send({ message: 'Wie mache ich die Brücke bei meinem Hohlkreuz?' });

    const callArgs = mockAnthropicCreate.mock.calls[0]?.[0] as { system: string };
    expect(callArgs.system).toContain('Hebe die Hüfte nur so weit, wie der untere Rücken flach bleibt.');
    expect(callArgs.system).toContain('wortgetreu wieder');
  });

  it('enthält die Weiterleitungs-Formulierung für nicht zugewiesene Anpassungen, wenn Anpassungen vorhanden sind', async () => {
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(patientWithAdaptation as any);

    await request(app)
      .post('/api/v1/p/valid-token-abc/chat')
      .send({ message: 'Gibt es eine Variante für meinen Wandsitz?' });

    const callArgs = mockAnthropicCreate.mock.calls[0]?.[0] as { system: string };
    expect(callArgs.system).toContain(
      'Das solltest du direkt mit deiner Therapeutin oder deinem Therapeuten besprechen — sie oder er kann die Übung für dich anpassen.',
    );
  });

  it('enthält keinen Anpassungs-Abschnitt, wenn keine Anpassungen zugewiesen sind', async () => {
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(validPatient as any);

    await request(app)
      .post('/api/v1/p/valid-token-abc/chat')
      .send({ message: 'Wie lange soll ich die Übung halten?' });

    const callArgs = mockAnthropicCreate.mock.calls[0]?.[0] as { system: string };
    expect(callArgs.system).not.toContain('individuelle Anpassungen ausgewählt');
  });
});
