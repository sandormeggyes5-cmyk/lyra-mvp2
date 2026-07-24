import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from './prisma.js';

const trustedOrigins = (process.env.TRUSTED_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173').split(',');

export const auth = betterAuth({
  basePath: '/api/auth',
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  trustedOrigins,

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,  // 7 Tage
    updateAge: 60 * 60 * 24,       // täglich erneuern wenn aktiv
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,              // 5 Minuten Client-Cache
    },
  },

  // practiceId und role werden NICHT über sign-up vom Client gesetzt.
  // Die /api/v1/auth/register-Route setzt sie nach der Erstellung via Prisma.
  user: {
    additionalFields: {
      practiceId: {
        type: 'string',
        required: false,
        input: false,
      },
      role: {
        type: 'string',
        required: false,
        defaultValue: 'therapist',
        input: false,
      },
    },
  },
});

export type Auth = typeof auth;
