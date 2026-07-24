import express from 'express';
import cors from 'cors';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth.js';
import { chatRouter } from './routes/chat.js';
import { practiceRouter } from './routes/practice.js';
import { patientsRouter } from './routes/patients.js';
import { exercisesRouter } from './routes/exercises.js';
import { programsRouter } from './routes/programs.js';
import { patientPortalRouter } from './routes/patient-portal.js';

const trustedOrigins = (process.env.TRUSTED_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173').split(',');

export const app = express();

app.use(cors({ origin: trustedOrigins, credentials: true }));
app.all('/api/auth/*', toNodeHandler(auth));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'physiopilot-api' });
});

app.use('/api/v1/auth', practiceRouter);
app.use('/api/v1/patients', patientsRouter);
app.use('/api/v1/exercises', exercisesRouter);
app.use('/api/v1/programs', programsRouter);
app.use('/api/v1/p', patientPortalRouter);
app.use('/api/v1/chat', chatRouter);
