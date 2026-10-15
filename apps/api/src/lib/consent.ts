import type { PatientConsentEvent } from '@prisma/client';

// Feste Liste bekannter Einwilligungstext-Versionen — kein Freitext. Server
// validiert jeden erfassten Consent-Event dagegen (siehe routes/patients.ts).
// Neue Textversion: hier ergänzen, alte Werte bleiben für historische Events
// gültig (append-only, nie rückwirkend geändert).
export const CONSENT_TEXT_VERSIONS = ['2026-10'] as const;
export type ConsentTextVersion = (typeof CONSENT_TEXT_VERSIONS)[number];

export function isKnownConsentTextVersion(value: string): value is ConsentTextVersion {
  return (CONSENT_TEXT_VERSIONS as readonly string[]).includes(value);
}

// Bewertet den aktuellen Einwilligungsstatus anhand des zeitlich letzten
// Events — unabhängig davon, in welcher Reihenfolge Events erfasst wurden
// (keine Zustandsmaschine/Übergangsvalidierung, siehe Plan).
export function hasValidConsent(events: PatientConsentEvent[]): boolean {
  const latest = latestEventAt(events, null);
  return latest?.type === 'granted';
}

// Wie hasValidConsent, aber zu einem bestimmten Zeitpunkt in der
// Vergangenheit — für spätere Auswertungen ("galt am Tag X eine gültige
// Einwilligung?"). Noch nirgends aus Export-/Adhärenzlogik aufgerufen.
export function hasValidConsentAt(events: PatientConsentEvent[], date: Date): boolean {
  const latest = latestEventAt(events, date);
  return latest?.type === 'granted';
}

function latestEventAt(events: PatientConsentEvent[], date: Date | null): PatientConsentEvent | undefined {
  return [...events]
    .filter(e => date === null || e.occurredAt <= date)
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())[0];
}
