# Aufgabe: Übungs-Anpassungen (ExerciseAdaptation)

## Vorbedingung
Lies zuerst `PROJECT_BRIEF.md` vollständig. Diese Datei erweitert Phase 1 um ein Feature und ersetzt nichts davon. Alle dort genannten Leitplanken gelten unverändert weiter.

## Warum dieses Feature

Patienten mit abweichenden Körpervoraussetzungen — ausgeprägtes Hohlkreuz, höheres Körpergewicht, eingeschränkte Gelenkbeweglichkeit, Zustand nach OP — können eine Standard-Übungsdemonstration oft nicht auf sich übertragen. Das senkt die Adhärenz beim Heimübungsprogramm.

Statt aufwändiger körpertyp-spezifischer 3D-Animationen (bewusst zurückgestellt) lösen wir das textuell: Pro Übung existieren mehrere kurze Anpassungshinweise. **Der Therapeut wählt bei der Verordnung aus, welche Hinweise für diesen konkreten Patienten gelten.**

## Regulatorisch entscheidend — bitte im Code sichtbar machen

Die klinische Entscheidung liegt ausschließlich beim Therapeuten. Das System schlägt niemals selbstständig eine Anpassung anhand von Patientenmerkmalen vor, empfiehlt nichts automatisch und leitet nichts aus Diagnosen ab. Es zeigt dem Therapeuten eine Auswahlliste; er entscheidet.

Konkret verboten:
- Keine Auto-Zuweisung von Anpassungen anhand von BMI, Alter, Diagnose oder sonstigen Patientendaten
- Kai darf Anpassungen **nur wiedergeben**, wenn der Therapeut sie zugewiesen hat — niemals selbst welche vorschlagen, erfinden oder abwandeln
- Kein Feld, in dem eine Diagnose erfasst wird

Setze diese Regeln als Kommentar über die betreffenden Funktionen, damit sie bei späteren Änderungen nicht versehentlich aufgeweicht werden.

## Datenmodell — Erweiterung

```prisma
model ExerciseAdaptation {
  id           String   @id @default(cuid())
  exerciseId   String
  exercise     Exercise @relation(fields: [exerciseId], references: [id])

  // Kurzlabel für die Therapeuten-Auswahlliste, z. B. "Hohlkreuz"
  labelDe      String

  // Der Hinweistext, den der Patient sieht
  instructionDe String

  // Gruppierung für die UI: "haltung" | "koerperbau" | "beweglichkeit" | "hilfsmittel" | "schonung"
  category     String

  // Optional: abweichendes Demo-Medium für diese Variante (Phase 3, vorerst null)
  videoUrl     String?

  // true = von uns geseedet, false = von der Praxis selbst angelegt
  isSystem     Boolean  @default(true)

  // Nur gesetzt bei praxiseigenen Anpassungen (isSystem = false)
  practiceId   String?
  practice     Practice? @relation(fields: [practiceId], references: [id])

  order        Int      @default(0)
  createdAt    DateTime @default(now())

  selections   ProgramExerciseAdaptation[]
}

// Verknüpfungstabelle: welche Anpassung hat der Therapeut für diese
// konkrete Übung in diesem konkreten Programm ausgewählt?
model ProgramExerciseAdaptation {
  id                String   @id @default(cuid())
  programExerciseId String
  programExercise   ProgramExercise    @relation(fields: [programExerciseId], references: [id], onDelete: Cascade)
  adaptationId      String
  adaptation        ExerciseAdaptation @relation(fields: [adaptationId], references: [id])
  createdAt         DateTime @default(now())

  @@unique([programExerciseId, adaptationId])
}
```

`ProgramExercise` bekommt zusätzlich:
```prisma
  adaptations ProgramExerciseAdaptation[]
  therapistNote String?  // freie Anmerkung des Therapeuten zu dieser Übung
```

Wichtig: `practiceId` auf `ExerciseAdaptation` ist der Mandantentrenner. Praxiseigene Anpassungen dürfen niemals in anderen Praxen auftauchen. Schreib dafür einen Test.

## Seed-Daten

Lege eine Migration mit Beispiel-Anpassungen an. **Alle geseedeten Texte sind Platzhalter und müssen vor Produktivbetrieb von einem Physiotherapeuten geprüft und freigegeben werden** — markiere das als TODO im Seed-File.

Struktur der Kategorien:
- `haltung` — z. B. Hohlkreuz, Rundrücken, Beckenkippung
- `koerperbau` — z. B. größerer Bauchumfang, große Körperhöhe
- `beweglichkeit` — z. B. eingeschränkte Hüft-, Schulter- oder Sprunggelenksbeweglichkeit
- `hilfsmittel` — z. B. Ausführung am Stuhl, an der Wand, mit Kissenunterlage
- `schonung` — z. B. reduzierter Bewegungsumfang, Ausführung ohne Bodenkontakt

Erzeuge pro Übung 2–5 plausible Anpassungen. Formuliere sie kurz (max. 2 Sätze), in Du-Form, ohne medizinische Fachbegriffe, ohne Wertung.

## UI — Therapeut

Im Verordnungs-Workflow, direkt beim Setzen von Sätzen/Wiederholungen:

- Aufklappbarer Bereich „Anpassungen für diesen Patienten"
- Checkbox-Liste, gruppiert nach Kategorie, mit Vorschautext
- Standardmäßig ist **nichts** ausgewählt
- Freitextfeld „Eigene Anmerkung" → `therapistNote`
- Button „Eigene Anpassung anlegen" → speichert mit `isSystem: false` und der eigenen `practiceId`, steht danach der ganzen Praxis zur Verfügung

Keine Empfehlungen, keine Hervorhebungen, keine Sortierung nach Wahrscheinlichkeit. Neutrale Liste.

## UI — Patient

In der Übungsdetailansicht, unterhalb von Video und Standardbeschreibung:

- Abschnitt „Für dich angepasst" — nur sichtbar, wenn Anpassungen zugewiesen sind
- Visuell klar abgesetzt (z. B. eigener Kartenhintergrund), damit erkennbar ist: das hat der Therapeut persönlich ausgewählt
- Darunter, falls vorhanden, `therapistNote` unter der Überschrift „Anmerkung deiner Praxis"

## Kai — Anpassung des System-Prompts

Ergänze den Kontext, der pro Nachricht mitgegeben wird, um die zugewiesenen Anpassungen der heutigen Übungen.

Ergänze den System-Prompt sinngemäß:

> Für einzelne Übungen hat die Therapeutin oder der Therapeut individuelle Anpassungen ausgewählt. Diese stehen dir im Kontext zur Verfügung. Wenn eine Frage dazu passt, gib den Hinweis **wortgetreu wieder** und erkläre ihn bei Bedarf in einfachen Worten. Du darfst niemals selbst eine Anpassung vorschlagen, erfinden oder eine bestehende inhaltlich abändern. Wenn die Patientin oder der Patient nach einer Anpassung fragt, die nicht zugewiesen wurde, antworte: "Das solltest du direkt mit deiner Therapeutin oder deinem Therapeuten besprechen>— sie oder er kann die Übung für dich anpassen."

Schreib einen Test, der prüft, dass Kai bei einer Anfrage nach einer nicht zugewiesenen Anpassung an die Praxis verweist.

## Ausdrücklich nicht Teil dieser Aufgabe
- Körpertyp-spezifische 3D-Avatare oder Animationen
- Separate Videos pro Anpassung (Feld ist vorbereitet, bleibt null)
- Automatische Vorschläge jeglicher Art
- Erfassung von Diagnosen oder Körpermaßen

## Arbeitsweise
Wie in `PROJECT_BRIEF.md`: erst Plan zeigen, auf Freigabe warten, dann in kleinen Commits umsetzen. Prisma-Migration additiv, keine bestehenden Daten zerstören.

## Erste Aufgabe
Zeig mir den Umsetzungsplan: welche Dateien du anlegst, welche du änderst, in welcher Reihenfolge, und wo du Risiken siehst. Fass noch nichts an, bevor ich zugestimmt habe.o
