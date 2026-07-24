# Projekt: PhysioPilot — B2B-SaaS für Physiotherapie-Praxen

## Kontext und Ziel
Du arbeitest am bestehenden Lyra-Projekt unter `C:\Users\Vivien\lyra-mvp\` (React/Vite-Frontend, Express/Node.js-Backend mit Anthropic-API-Proxy). Wir bauen es um zu **PhysioPilot**, einer B2B-SaaS-Anwendung für deutsche Physiotherapie-Praxen. Therapeuten verordnen digitale Heimübungsprogramme; Patienten nutzen eine App mit Übungsvideos und einem KI-Assistenten "Kai" für Rückfragen zu Ausführung und Motivation.

**Zielnutzer:**
- Praxisinhaber (zahlender B2B-Kunde, geplant 30–100 €/Monat pro Praxis)
- Therapeuten (verordnen Programme im Praxis-Account)
- Patienten (nutzen App via Magic Link, ohne eigenes Konto)

**Konkurrenz, an der wir uns messen:** Physitrack, MediBird, PhysioFit, Onlot.

## Harte regulatorische Leitplanken (nicht verhandelbar)
- Wir bauen **kein Medizinprodukt** und beantragen keine DiGA-Zulassung für das MVP. Die App ist ein Workflow- und Compliance-Tool, keine Therapie.
- Kai gibt **niemals medizinische Ratschläge oder Diagnosen**. Bei jeder schmerz-, beschwerden- oder symptombezogenen Frage antwortet Kai standardisiert: "Bitte wende dich dazu an deine Therapeutin oder deinen Therapeuten." Dieser Hinweis ist im System-Prompt verankert und in der Patienten-UI dauerhaft sichtbar.
- DSGVO: EU-Hosting (Frankfurt), Patientendaten verschlüsselt at rest, AV-Vertrag-Template vorbereiten.
- Alle patientenseitigen Texte standardmäßig auf Deutsch.

## Tech-Stack (auf Lyra-Code aufbauen)
- Frontend: React + Vite + TypeScript + TailwindCSS
- Backend: Node.js + Express + TypeScript
- DB: PostgreSQL via Prisma ORM
- Auth: better-auth (Multi-Tenant; Praxis = Tenant)
- LLM: Anthropic Claude API (bestehenden Lyra-Proxy wiederverwenden)
- Zahlungen: Stripe (Subscriptions — in Phase 1 nur UI-Platzhalter)
- Hosting-Ziel: Vercel (Frontend), Railway oder Fly.io (Backend + Postgres), EU-Region

## Datenmodell (Prisma — Erstentwurf, gerne hinterfragen)

```prisma
model Practice {
  id                 String    @id @default(cuid())
  name               String
  subscriptionStatus String    @default("trial")
  createdAt          DateTime  @default(now())
  users              User[]
  patients           Patient[]
}

model User { // Therapeut oder Praxis-Admin
  id           String   @id @default(cuid())
  practiceId   String
  practice     Practice @relation(fields: [practiceId], references: [id])
  email        String   @unique
  passwordHash String
  name         String
  role         String   // "admin" | "therapist"
  createdAt    DateTime @default(now())
}

model Patient {
  id             String   @id @default(cuid())
  practiceId     String
  practice       Practice @relation(fields: [practiceId], references: [id])
  name           String
  emailOrPhone   String?
  dateOfBirth    DateTime?
  magicLinkToken String   @unique
  createdAt      DateTime @default(now())
  programs       ExerciseProgram[]
  chatMessages   ChatMessage[]
}

model Exercise { // Stamm-Bibliothek
  id                  String   @id @default(cuid())
  nameDe              String
  descriptionDe       String
  videoUrl            String?
  thumbnailUrl        String?
  muscleGroups        String[]
  bodyRegion          String   // "Rücken", "Knie", "Schulter", ...
  difficulty          Int      // 1–5
  defaultSets         Int
  defaultReps         Int
  defaultHoldSeconds  Int?
}

model ExerciseProgram {
  id          String   @id @default(cuid())
  patientId   String
  patient     Patient  @relation(fields: [patientId], references: [id])
  therapistId String
  name        String
  notes       String?
  createdAt   DateTime @default(now())
  items       ProgramExercise[]
  logs        SessionLog[]
}

model ProgramExercise {
  id               String   @id @default(cuid())
  programId        String
  program          ExerciseProgram @relation(fields: [programId], references: [id])
  exerciseId       String
  exercise         Exercise @relation(fields: [exerciseId], references: [id])
  sets             Int
  reps             Int
  holdSeconds      Int?
  frequencyPerWeek Int
  order            Int
}

model SessionLog {
  id          String   @id @default(cuid())
  programId   String
  program     ExerciseProgram @relation(fields: [programId], references: [id])
  exerciseId  String
  completedAt DateTime @default(now())
  painLevel   Int?     // 0–10, optional
  note        String?
}

model ChatMessage {
  id        String   @id @default(cuid())
  patientId String
  patient   Patient  @relation(fields: [patientId], references: [id])
  role      String   // "user" | "assistant"
  content   String
  createdAt DateTime @default(now())
}
```

## MVP-Funktionsumfang — Phase 1

1. **Praxis-Anmeldung & Onboarding**
   - E-Mail + Passwort, Praxis wird angelegt, Registrierender wird Admin
   - Weitere Therapeuten per E-Mail einladen

2. **Therapeuten-Dashboard**
   - Patientenliste mit Suche
   - Patient anlegen (Name, optional E-Mail/Telefon, optional Geburtsdatum)
   - Magic Link generieren, kopierbar, optional per E-Mail versenden

3. **Übungs-Bibliothek (geseeded)**
   - 30–50 gängige Physio-Übungen seeden (Brücke, Vierfüßlerstand, Theraband-Außenrotation, Wandsitz, Dehnungen, Mobilisationen)
   - Für MVP Video-URLs als Platzhalter (Pexels-Stock oder lizenzfreie Quellen — Lizenz dokumentieren)
   - Filter nach Körperregion, Muskelgruppe, Schwierigkeit

4. **Programm-Verordnungs-Workflow**
   - Patient wählen → Übungen aus Bibliothek selektieren → pro Übung Sätze/Wiederholungen/Sekunden/Frequenz setzen → Notiz hinzufügen → speichern

5. **Patienten-Ansicht (Magic Link, kein Login)**
   - Heute-Übersicht
   - Übungsdetail mit Video, Beschreibung, Vorgaben
   - "Als erledigt markieren" mit optionalem Schmerz-Slider 0–10
   - Zugang zum Kai-Chat

6. **Kai-Chat (LLM)**
   - System-Prompt sinngemäß: "Du bist Kai, ein freundlicher Übungs-Assistent in einer Physiotherapie-App. Du hilfst bei Verständnis von Übungen, Motivation und Tagesplanung. Du gibst KEINE medizinischen Ratschläge, KEINE Diagnose, KEINE Therapieänderungen. Bei Schmerzen, neuen Symptomen oder Unsicherheit verweise IMMER an die Therapeutin/den Therapeuten der zuständigen Praxis."
   - Kontext im Prompt: aktuelles Programm, heutige Übungen, Praxisname
   - Rate Limit: max. 20 Nachrichten pro Patient pro Tag (Kostenkontrolle)
   - Model: claude-haiku-4-5 als Default (kostenoptimiert), Eskalation auf claude-sonnet-4-6 nur wenn nötig

7. **Praxis-Einstellungen (Admin)**
   - Praxis-Stammdaten
   - Therapeutenliste + Einladungen
   - Abo-Status (UI-Platzhalter, Stripe-Integration in Phase 2)

## Ausdrücklich NICHT Teil von Phase 1
- Kamera-basierte Bewegungsanalyse / Form-Check
- KI-generierte 3D-Avatar-Animationen (Phase 2 — vorerst Stock-Videos)
- Echte Stripe-Checkout-Integration
- Analytics-Dashboard
- Mehrsprachigkeit
- Native Mobile Apps (PWA-fähig reicht)
- DiGA-/MDR-Zertifizierung

## Code-Qualität
- TypeScript Strict Mode überall
- Monorepo: `apps/web/`, `apps/api/`, `packages/shared/` (gemeinsame Typen)
- Prisma-Migrationen versionieren, niemals destruktiv auf bestehenden Daten
- `.env.example` mitliefern
- Mindest-Testabdeckung mit Vitest: Auth-Flow, Programm-Erstellung, Magic-Link-Validierung, Kai-Guardrail
- API: REST unter `/api/v1/…`

## Arbeitsweise (zwingend einzuhalten)
1. **Erst Plan, dann Code.** Zeige mir den geplanten Schritt und warte auf meine Freigabe.
2. **Kleine, abgrenzbare Commits** pro Feature.
3. **Vor destruktiven Aktionen** (Schema-Resets, große Refaktorierungen) explizit nachfragen.
4. **Designentscheidungen kurz auf Deutsch begründen.**
5. **Keine stillen Annahmen.** Wenn du etwas nicht weißt, sag es explizit.

## Erste konkrete Aufgabe
Analysiere die bestehende `lyra-mvp/`-Struktur. Liste auf:
- Was behalten wir (Anthropic-Proxy, Express-Setup, Frontend-Skelett)?
- Was strukturieren wir um, was werfen wir weg?
- Welche Pakete sind veraltet?

Schlage einen Migrationsplan in den Monorepo-Aufbau vor, der den existierenden Code nicht zerstört. **Erst nach meiner Freigabe** beginnst du mit Schritt 2 (Prisma + Postgres Setup). Bitte keinerlei Dateien anfassen, bevor ich den Plan abgenickt habe.
