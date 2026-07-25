# Aufgabe: Frontend-Component-Testing aufsetzen

## Vorbedingung

Lies zuerst `PROJECT_BRIEF.md` und `TASK_ADAPTATIONS.md`. Diese Datei beschreibt nur den *Umfang* eines Nachfolge-Tasks — **keine Umsetzung**. Sie entstand, weil beim Bau von `ProgramBuilderPage` und `AdaptationPicker` (siehe `apps/web/src/pages/ProgramBuilderPage.tsx`, `apps/web/src/components/program-builder/`) bewusst auf Component-Tests verzichtet wurde: `apps/web` hat zwar ein `test`-Script (`vitest run`), aber kein Test-Environment und keine einzige Testdatei.

## Warum zurückgestellt

`PROJECT_BRIEF.md` fordert „Mindest-Testabdeckung mit Vitest" für Backend-Flows (Auth, Programm-Erstellung, Magic-Link, Kai-Guardrail) — die sind abgedeckt. Für Frontend-Komponenten gibt es aktuell weder eine Vorgabe noch Tooling. Component-Tests für den Verordnungs-Workflow jetzt mit aufzubauen hätte den Scope der Adaptations-Aufgabe (siehe `TASK_ADAPTATIONS.md`) auf die Ersteinrichtung eines kompletten Test-Frameworks ausgeweitet — dafür dieser separate Task.

## Setup-Umfang

1. **Vitest-Environment auf jsdom umstellen**
   - `apps/web/vite.config.ts`: `test: { environment: 'jsdom', setupFiles: './src/test/setup.ts' }`
   - `jsdom` als devDependency ergänzen

2. **Testing Library installieren**
   - `@testing-library/react`
   - `@testing-library/jest-dom` (Matcher wie `toBeInTheDocument`)
   - `@testing-library/user-event` (realistische Klick-/Tastatur-Interaktionen, insbesondere für Checkbox-Listen und Formulare)
   - `src/test/setup.ts` anlegen: importiert `@testing-library/jest-dom` global

3. **Mocking-Strategie festlegen**
   - `api`-Client (`src/api/client.ts`) mocken statt echter `fetch`-Calls — Pattern analog zu den Backend-Tests (`vi.mock`), damit Tests nicht gegen eine laufende API laufen müssen

## Zu schreibende Tests (Auswahl, keine abschließende Liste)

### `AdaptationPicker`
- Rendert Checkbox-Liste gruppiert nach Kategorie, sobald Anpassungen geladen sind
- Unterscheidet sichtbar „lädt noch" vs. „keine Anpassungen vorhanden" (Regression gegen das in `TASK_ADAPTATIONS.md`-Nachfolge-Feedback geforderte Verhalten)
- Checkbox an-/abwählen aktualisiert die Auswahl-Pills und ruft `onChange` mit der korrekten ID-Liste auf
- Klick auf eine Pill entfernt genau diese Anpassung aus der Auswahl
- „Eigene Anpassung anlegen": Formular-Submit ruft `POST /exercises/:id/adaptations` auf, neue Anpassung erscheint in der Liste **und** ist automatisch ausgewählt (siehe Freigabe-Entscheidung in `TASK_ADAPTATIONS.md`-Historie: Therapeuten-Handlung, keine Auto-Zuweisung im regulatorischen Sinne)
- Standardmäßig ist bei einer frisch geladenen, noch nicht bearbeiteten Übung nichts ausgewählt

### `ProgramBuilderPage` — Submit-Verhalten
- Create-Modus: Submit ruft `POST /programs` mit korrekt geformtem `items`-Array auf (inkl. `adaptationIds`, `therapistNote`)
- Edit-Modus: vorbefüllte Felder aus `GET /programs/:id` entsprechen den zugewiesenen Anpassungen; Submit ruft `PUT /programs/:id/items` (und ggf. `PUT /programs/:id` bei geänderten Name/Notizen) auf
- Ungespeicherte-Änderungen-Guard: Verlassen der Seite über den Zurück-/Abbrechen-Button bei vorhandenen Änderungen löst eine Bestätigung aus; ohne Änderungen nicht
- Clientseitige Validierung (Wertebereiche identisch zu den Server-Grenzen aus `programs.ts`: sets/reps/frequencyPerWeek 1–100, holdSeconds 1–600, therapistNote ≤ 1000 Zeichen) verhindert Submit und zeigt Fehler an

## Ausdrücklich nicht Teil dieser Aufgabe

- E2E-Tests (Playwright/Cypress) — nur Component-Level
- Tests für `ExercisePicker` und `ProgramItemEditor` im Detail (können mitgezogen werden, sind aber nicht das primäre Risiko — die regulatorisch/fachlich heikle Logik steckt in `AdaptationPicker` und im Submit-Pfad)
- Visuelles Regressionstesting

## Arbeitsweise

Wie in `PROJECT_BRIEF.md`: Plan zeigen, auf Freigabe warten, dann in kleinen Commits umsetzen.
