// Core domain types — shared between apps/api and apps/web

export interface Practice {
  id: string;
  name: string;
  subscriptionStatus: 'trial' | 'active' | 'cancelled';
  createdAt: Date;
}

export interface User {
  id: string;
  practiceId: string;
  email: string;
  name: string;
  role: 'admin' | 'therapist';
  createdAt: Date;
}

export interface Patient {
  id: string;
  practiceId: string;
  name: string;
  emailOrPhone?: string;
  dateOfBirth?: Date;
  magicLinkToken: string;
  createdAt: Date;
}

export interface Exercise {
  id: string;
  nameDe: string;
  descriptionDe: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  muscleGroups: string[];
  bodyRegion: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  defaultSets: number;
  defaultReps: number;
  defaultHoldSeconds?: number;
}

export interface ExerciseProgram {
  id: string;
  patientId: string;
  therapistId: string;
  name: string;
  notes?: string;
  createdAt: Date;
  items?: ProgramExercise[];
}

export interface ProgramExercise {
  id: string;
  programId: string;
  exerciseId: string;
  exercise?: Exercise;
  sets: number;
  reps: number;
  holdSeconds?: number;
  frequencyPerWeek: number;
  order: number;
}

export interface SessionLog {
  id: string;
  programId: string;
  exerciseId: string;
  completedAt: Date;
  painLevel?: number; // 0–10
  note?: string;
}

export interface ChatMessage {
  id: string;
  patientId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

// API request/response shapes
export interface ChatRequest {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  patientId?: string;
}

export interface ChatResponse {
  content: string;
}
