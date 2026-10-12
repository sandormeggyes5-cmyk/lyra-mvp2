# Notiz: Validierungs-Tracking für Übungen/Anpassungen

Diese Aufgabe hat `Exercise` und `ExerciseAdaptation` um Validierungs-Felder
(`isValidated`, `validatedBy`, `validatedAt`, `sourceNote`) sowie `Exercise`
um eine Taxonomie (`exerciseType`, `position`, `equipment`) erweitert. Details
und Umsetzungsschritte siehe Plan-Historie; hier nur die offenen Folgeaufgaben.

## Kein Freigabe-Workflow (bewusst nicht Teil dieser Aufgabe)

`isValidated` kann aktuell **nur direkt in der Datenbank** (z. B. per Prisma
Studio oder Skript) auf `true` gesetzt werden, nachdem eine
Physiotherapeutin/ein Physiotherapeut die Übung bzw. Anpassung offline
geprüft hat. Es gibt noch keine UI oder API-Route, um eine Freigabe im
Programm selbst zu erteilen. Sobald ein echter Prüf-Workflow ansteht, gehört
dazu mindestens:
- eine Route, die `isValidated`, `validatedBy`, `validatedAt` setzt (nur für
  Admin-Rolle),
- eine Liste "Zu prüfende Übungen" im Praxis-Dashboard.

## Toggle "Ungeprüfte anzeigen" — Rollen-Einschränkung als Follow-up

Der Schalter in `ExercisePicker.tsx` und `AdaptationPicker.tsx` ist aktuell
für **jeden** Therapeuten sichtbar, unabhängig von der Rolle. Sobald echte
Praxen live sind, sollte er entweder auf die Admin-Rolle eingeschränkt oder
ganz entfernt werden (abhängig davon, ob Therapeuten weiterhin Einblick in
den Prüf-Status haben sollen). Bis dahin ist die deutliche Kennzeichnung
(Badge + reduzierte Deckkraft + Warnhinweis) der einzige Schutz dagegen, dass
ein ungeprüfter Text unbemerkt an einen Patienten weitergegeben wird — das
Server-Gate in `programs.ts` blockiert nur das *Verordnen*, nicht das Lesen.

## Seed-Mechanik bleibt destruktiv

`prisma/seed.ts` löscht bei jedem Lauf weiterhin alle `Exercise`-,
`ProgramExercise`- und `SessionLog`-Einträge und legt sie neu an. Das ist
aktuell unkritisch, weil noch keine echten Praxisdaten existieren — sobald
reale Verordnungen existieren, würde ein erneuter `db:seed`-Lauf sie
zerstören (und außerdem an der Fremdschlüssel-Beziehung zu
`ExerciseAdaptation` scheitern, siehe unten). Umstellung auf einen additiven,
idempotenten Seed (Muster: `seed-adaptations.ts`, Match über `nameDe`) ist
eine separate, spätere Aufgabe.

### Entdeckter Nebenbefund: `db:seed` bricht, sobald Anpassungen existieren

`seed.ts` löscht `Exercise`-Zeilen, ohne vorher abhängige
`ExerciseAdaptation`-Zeilen zu entfernen. Sobald `db:seed:adaptations`
gelaufen ist, schlägt ein erneuter `db:seed`-Lauf mit einem
Fremdschlüssel-Fehler fehl (`ExerciseAdaptation_exerciseId_fkey`). Das ist
unabhängig von dieser Aufgabe vorbestehend und wird durch die geplante
Umstellung auf additiven Seed mit gelöst.
