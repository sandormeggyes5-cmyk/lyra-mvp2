import type { Request, Response, NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../lib/auth.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  practiceId: string;
  role: string;
}

// Erweitert Express Request um typisierte auth-Felder
export interface AuthRequest extends Request {
  authUser: AuthenticatedUser;
  sessionToken: string;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session?.user) {
    res.status(401).json({ error: 'Nicht authentifiziert' });
    return;
  }

  const user = session.user as AuthenticatedUser & { practiceId?: string };

  // Schutz gegen unvollständige Registrierung
  if (!user.practiceId) {
    res.status(403).json({ error: 'Kein Praxis-Account zugeordnet' });
    return;
  }

  (req as AuthRequest).authUser = user as AuthenticatedUser;
  (req as AuthRequest).sessionToken = session.session.token;
  next();
}

export function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await requireAuth(req, res, () => {
      const authReq = req as AuthRequest;
      if (!roles.includes(authReq.authUser?.role)) {
        res.status(403).json({ error: 'Keine Berechtigung' });
        return;
      }
      next();
    });
  };
}
