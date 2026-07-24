import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { auth } from '../lib/auth.js';
import { requireAuth, type AuthRequest } from '../middleware/requireAuth.js';

const router = Router();

// POST /api/v1/auth/register
// Legt Praxis + Admin-User in einem Schritt an.
// Flow: 1) Praxis anlegen 2) better-auth sign-up (erstellt User+Account+Session)
//        3) practiceId + role nachsetzen 4) Cookie weiterleiten
router.post('/register', async (req: Request, res: Response) => {
  const { practiceName, adminName, email, password } = req.body as {
    practiceName?: string;
    adminName?: string;
    email?: string;
    password?: string;
  };

  if (!practiceName || !adminName || !email || !password) {
    res.status(400).json({ error: 'Alle Felder sind erforderlich (practiceName, adminName, email, password)' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen haben' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'E-Mail-Adresse bereits registriert' });
    return;
  }

  // Praxis zuerst anlegen — bei Fehlern in den Folgeschritten wieder löschen
  const practice = await prisma.practice.create({
    data: { name: practiceName },
  });

  try {
    // better-auth sign-up über internen Request — erstellt User, Account und Session
    const signUpRequest = new Request(
      `http://internal/api/auth/sign-up/email`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: adminName, email, password }),
      },
    );

    const authResponse = await auth.handler(signUpRequest);

    if (!authResponse.ok) {
      await prisma.practice.delete({ where: { id: practice.id } });
      const errBody = await authResponse.json().catch(() => ({}));
      res.status(authResponse.status).json({ error: (errBody as { message?: string }).message ?? 'Registrierung fehlgeschlagen' });
      return;
    }

    const authData = await authResponse.json() as { user?: { id: string } };
    const userId = authData.user?.id;

    if (!userId) {
      await prisma.practice.delete({ where: { id: practice.id } });
      res.status(500).json({ error: 'Benutzer-ID nicht zurückgegeben' });
      return;
    }

    // practiceId und role setzen (better-auth kennt diese Felder nicht)
    await prisma.user.update({
      where: { id: userId },
      data: { practiceId: practice.id, role: 'admin' },
    });

    // Set-Cookie-Header von better-auth an den Client weiterleiten
    const setCookie = authResponse.headers.get('set-cookie');
    if (setCookie) {
      res.setHeader('Set-Cookie', setCookie);
    }

    res.status(201).json({
      user: { id: userId, email, name: adminName, role: 'admin', practiceId: practice.id },
      practice: { id: practice.id, name: practiceName },
    });
  } catch (err) {
    // Rollback: Praxis wieder löschen, damit keine verwaisten Praxen entstehen
    await prisma.practice.delete({ where: { id: practice.id } }).catch(() => undefined);
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Interner Serverfehler bei der Registrierung' });
  }
});

// GET /api/v1/auth/me — gibt den aktuell eingeloggten User zurück
router.get('/me', requireAuth, (req: Request, res: Response) => {
  const { authUser } = req as AuthRequest;
  res.json({ user: authUser });
});

export { router as practiceRouter };
