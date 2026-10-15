/*
  Warnings:

  - Made the column `startDate` on table `ExerciseProgram` required. This step will fail if there are existing NULL values in that column — run db:backfill-program-startdate first.
  - Made the column `pseudonymId` on table `Patient` required. This step will fail if there are existing NULL values in that column — run db:backfill-pseudonym-id first.

*/
-- AlterTable
ALTER TABLE "ExerciseProgram" ALTER COLUMN "startDate" SET NOT NULL;

-- AlterTable
ALTER TABLE "Patient" ALTER COLUMN "pseudonymId" SET NOT NULL;
