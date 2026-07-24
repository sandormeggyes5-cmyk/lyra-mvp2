import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    practice: { create: vi.fn(), delete: vi.fn() },
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

// ── POST /api/v1/auth/register — Validierung ─────────────────────────────────

describe('POST /api/v1/auth/register — Eingabe-Validierung', () => {
  it('gibt 400 zurück wenn Pflichtfelder fehlen', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'test@test.com', password: 'passwort123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/erforderlich/i);
  });

  it('gibt 400 zurück wenn Passwort kürzer als 8 Zeichen ist', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ practiceName: 'Praxis X', adminName: 'Admin', email: 'a@b.de', password: '1234567' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/8 Zeichen/i);
  });

  it('gibt 409 zurück wenn E-Mail bereits registriert ist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'existing' } as any);

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ practiceName: 'Praxis X', adminName: 'Admin', email: 'exists@test.de', password: 'sicheresPasswort' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/bereits registriert/i);
  });
});

// ── POST /api/v1/auth/register — Erfolgsfall ─────────────────────────────────

describe('POST /api/v1/auth/register — Erfolgsfall', () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.practice.create).mockResolvedValue({ id: 'practice-1', name: 'Physio am Park' } as any);
    vi.mocked(auth.handler).mockResolvedValue(
      new Response(JSON.stringify({ user: { id: 'user-1' } }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': 'better-auth.session_token=tok; Path=/; HttpOnly',
        },
      }),
    );
    vi.mocked(prisma.user.update).mockResolvedValue({ id: 'user-1', practiceId: 'practice-1', role: 'admin' } as any);
  });

  it('gibt 201 mit User und Praxis zurück', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ practiceName: 'Physio am Park', adminName: 'Dr. Mayer', email: 'dr@physio.de', password: 'sicheresPasswort' });

    expect(res.status).toBe(201);
    expect(res.body.practice.name).toBe('Physio am Park');
    expect(res.body.user.role).toBe('admin');
    expect(res.body.user.email).toBe('dr@physio.de');
  });

  it('setzt practiceId und role=admin nach better-auth sign-up', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({ practiceName: 'Physio am Park', adminName: 'Dr. Mayer', email: 'dr@physio.de', password: 'sicheresPasswort' });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({ practiceId: 'practice-1', role: 'admin' }),
      }),
    );
  });

  it('löscht Praxis bei Fehler im better-auth sign-up (Rollback)', async () => {
    vi.mocked(auth.handler).mockResolvedValue(
      new Response(JSON.stringify({ message: 'User already exists' }), { status: 422 }),
    );

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ practiceName: 'Neue Praxis', adminName: 'Admin', email: 'neu@test.de', password: 'sicheresPasswort' });

    expect(res.status).toBe(422);
    expect(prisma.practice.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'practice-1' } }),
    );
  });

  it('leitet den Set-Cookie-Header von better-auth an den Client weiter', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ practiceName: 'Physio am Park', adminName: 'Dr. Mayer', email: 'dr@physio.de', password: 'sicheresPasswort' });

    const cookieHeader = res.headers['set-cookie'];
    expect(cookieHeader).toBeDefined();
    const cookieStr = Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader;
    expect(cookieStr).toContain('better-auth');
  });
});

// ── GET /api/v1/auth/me ───────────────────────────────────────────────────────

describe('GET /api/v1/auth/me — Session-Check', () => {
  it('gibt 401 zurück wenn keine Session vorhanden', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(401);
  });

  it('gibt 403 zurück wenn User keine practiceId hat (unvollständige Registrierung)', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: 'u1', email: 'x@x.de', name: 'X', practiceId: null, role: 'admin' },
      session: { token: 'tok' },
    } as any);

    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(403);
  });

  it('gibt User-Daten zurück bei gültiger Session', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: 'u1', email: 'dr@physio.de', name: 'Dr. Mayer', practiceId: 'p1', role: 'admin' },
      session: { token: 'tok' },
    } as any);

    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(200);
    expect(res.body.user.practiceId).toBe('p1');
    expect(res.body.user.role).toBe('admin');
  });
});
