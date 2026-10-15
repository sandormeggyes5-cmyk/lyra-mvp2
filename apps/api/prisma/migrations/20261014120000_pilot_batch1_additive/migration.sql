-- Pilot-Batch 1, Stufe 1 (additiv): neue Enums/Tabellen, neue Spalten
-- nullable bzw. mit Default, damit die Migration gegen bestehende Daten
-- läuft. startDate und pseudonymId werden nach dem jeweiligen Backfill in
-- einer separaten Migration auf NOT NULL gesetzt.

-- CreateEnum
CREATE TYPE "ConsentEventType" AS ENUM ('granted', 'declined', 'revoked');

-- CreateEnum
CREATE TYPE "ProgramStatus" AS ENUM ('active', 'paused', 'completed');

-- AlterTable: Patient — pseudonymId (Stufe 1: nullable)
ALTER TABLE "Patient" ADD COLUMN "pseudonymId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Patient_pseudonymId_key" ON "Patient"("pseudonymId");

-- AlterTable: ExerciseProgram — Laufzeit, Status, Änderungsnachvollziehbarkeit
-- startDate bleibt in dieser Stufe nullable (Backfill folgt).
ALTER TABLE "ExerciseProgram"
  ADD COLUMN "startDate" TIMESTAMP(3),
  ADD COLUMN "endDate" TIMESTAMP(3),
  ADD COLUMN "status" "ProgramStatus" NOT NULL DEFAULT 'active',
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedById" TEXT;

-- CreateTable
CREATE TABLE "PatientConsentEvent" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" "ConsentEventType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "textVersion" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientConsentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramSnapshot" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgramSnapshot_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PatientConsentEvent" ADD CONSTRAINT "PatientConsentEvent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientConsentEvent" ADD CONSTRAINT "PatientConsentEvent_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramSnapshot" ADD CONSTRAINT "ProgramSnapshot_programId_fkey" FOREIGN KEY ("programId") REFERENCES "ExerciseProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramSnapshot" ADD CONSTRAINT "ProgramSnapshot_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseProgram" ADD CONSTRAINT "ExerciseProgram_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
