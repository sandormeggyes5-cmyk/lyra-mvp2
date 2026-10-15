import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    exerciseProgram: { findFirst: vi.fn() },
    programSnapshot: { findFirst: vi.fn() },
  },
}));

import { prisma } from '../lib/prisma.js';
import { buildProgramSnapshotContent, getProgramStateAt } from '../lib/programSnapshot.js';

const PRACTICE_A = 'practice-A';
const PRACTICE_B = 'practice-B';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('buildProgramSnapshotContent', () => {
  it('bildet startDate/endDate/status/items korrekt ab', () => {
    const program = {
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-06-01'),
      status: 'active' as const,
      items: [
        {
          exerciseId: 'ex-1',
          sets: 3,
          reps: 12,
          holdSeconds: null,
          frequencyPerWeek: 3,
          order: 1,
          therapistNote: null,
          adaptations: [{ adaptationId: 'adapt-1' }],
        },
      ],
    };

    const content = buildProgramSnapshotContent(program);

    expect(content).toEqual({
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-06-01T00:00:00.000Z',
      status: 'active',
      items: [
        {
          exerciseId: 'ex-1',
          sets: 3,
          reps: 12,
          holdSeconds: null,
          frequencyPerWeek: 3,
          order: 1,
          therapistNote: null,
          adaptationIds: ['adapt-1'],
        },
      ],
    });
  });

  it('bildet endDate: null ab, wenn kein Enddatum gesetzt ist', () => {
    const content = buildProgramSnapshotContent({
      startDate: new Date('2026-01-01'),
      endDate: null,
      status: 'active' as const,
      items: [],
    });

    expect(content.endDate).toBeNull();
  });
});

describe('getProgramStateAt', () => {
  it('liefert null, wenn das Programm nicht zur übergebenen practiceId gehört (Cross-Tenant)', async () => {
    vi.mocked(prisma.exerciseProgram.findFirst).mockResolvedValue(null); // Praxis B findet Programm aus Praxis A nicht

    const result = await getProgramStateAt('prog-1', PRACTICE_B, new Date('2026-03-01'));

    expect(result).toBeNull();
    expect(prisma.exerciseProgram.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'prog-1', patient: { practiceId: PRACTICE_B } } }),
    );
    expect(prisma.programSnapshot.findFirst).not.toHaveBeenCalled();
  });

  it('liefert den Snapshot mit dem größten validFrom <= date', async () => {
    vi.mocked(prisma.exerciseProgram.findFirst).mockResolvedValue({ id: 'prog-1' } as any);
    vi.mocked(prisma.programSnapshot.findFirst).mockResolvedValue({
      snapshot: { startDate: '2026-02-01T00:00:00.000Z', endDate: null, status: 'active', items: [] },
    } as any);

    const result = await getProgramStateAt('prog-1', PRACTICE_A, new Date('2026-03-01'));

    expect(result).toEqual({ startDate: '2026-02-01T00:00:00.000Z', endDate: null, status: 'active', items: [] });
    expect(prisma.programSnapshot.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { programId: 'prog-1', validFrom: { lte: new Date('2026-03-01') } },
        orderBy: { validFrom: 'desc' },
      }),
    );
  });

  it('liefert null, wenn das Datum vor dem ersten Snapshot liegt', async () => {
    vi.mocked(prisma.exerciseProgram.findFirst).mockResolvedValue({ id: 'prog-1' } as any);
    vi.mocked(prisma.programSnapshot.findFirst).mockResolvedValue(null);

    const result = await getProgramStateAt('prog-1', PRACTICE_A, new Date('2020-01-01'));

    expect(result).toBeNull();
  });
});
