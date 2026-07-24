-- AlterTable
ALTER TABLE "ProgramExercise" ADD COLUMN     "therapistNote" TEXT;

-- CreateTable
CREATE TABLE "ExerciseAdaptation" (
    "id" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "labelDe" TEXT NOT NULL,
    "instructionDe" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "videoUrl" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "practiceId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExerciseAdaptation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramExerciseAdaptation" (
    "id" TEXT NOT NULL,
    "programExerciseId" TEXT NOT NULL,
    "adaptationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgramExerciseAdaptation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProgramExerciseAdaptation_programExerciseId_adaptationId_key" ON "ProgramExerciseAdaptation"("programExerciseId", "adaptationId");

-- AddForeignKey
ALTER TABLE "ExerciseAdaptation" ADD CONSTRAINT "ExerciseAdaptation_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseAdaptation" ADD CONSTRAINT "ExerciseAdaptation_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramExerciseAdaptation" ADD CONSTRAINT "ProgramExerciseAdaptation_programExerciseId_fkey" FOREIGN KEY ("programExerciseId") REFERENCES "ProgramExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramExerciseAdaptation" ADD CONSTRAINT "ProgramExerciseAdaptation_adaptationId_fkey" FOREIGN KEY ("adaptationId") REFERENCES "ExerciseAdaptation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
