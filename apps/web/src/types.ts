export interface User {
  id: string;
  email: string;
  name: string;
  practiceId: string;
  role: 'admin' | 'therapist';
}

export interface Patient {
  id: string;
  name: string;
  emailOrPhone?: string | null;
  dateOfBirth?: string | null;
  magicLinkToken: string;
  magicLink: string;
  magicLinkExpiresAt?: string | null;
  createdAt: string;
  _count?: { programs: number };
}

export interface Exercise {
  id: string;
  nameDe: string;
  descriptionDe: string;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  bodyRegion: string;
  muscleGroups: string[];
  difficulty: number;
  defaultSets: number;
  defaultReps: number;
  defaultHoldSeconds?: number | null;
}

export type AdaptationCategory = 'haltung' | 'koerperbau' | 'beweglichkeit' | 'hilfsmittel' | 'schonung';

// Vom Therapeuten manuell ausgewählte Anpassung — nie automatisch zugewiesen.
export interface ExerciseAdaptation {
  id: string;
  labelDe: string;
  instructionDe: string;
  category: AdaptationCategory;
  isSystem: boolean;
}

export interface ProgramItem {
  id: string;
  order: number;
  sets: number;
  reps: number;
  holdSeconds?: number | null;
  frequencyPerWeek: number;
  therapistNote?: string | null;
  adaptations: ExerciseAdaptation[];
  exercise: Exercise;
}

export interface Program {
  id: string;
  name: string;
  notes?: string | null;
  createdAt: string;
  therapist: { id: string; name: string };
  items: ProgramItem[];
  _count?: { logs: number };
}

export interface PatientDetail extends Patient {
  programs: Program[];
}
