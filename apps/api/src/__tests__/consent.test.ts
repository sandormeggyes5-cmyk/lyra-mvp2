import { describe, it, expect } from 'vitest';
import { hasValidConsent, hasValidConsentAt, isKnownConsentTextVersion, CONSENT_TEXT_VERSIONS } from '../lib/consent.js';
import type { PatientConsentEvent } from '@prisma/client';

function event(type: PatientConsentEvent['type'], occurredAt: string): PatientConsentEvent {
  return {
    id: `evt-${occurredAt}-${type}`,
    patientId: 'patient-1',
    type,
    occurredAt: new Date(occurredAt),
    textVersion: '2026-10',
    recordedById: 'therapist-1',
    createdAt: new Date(occurredAt),
  };
}

describe('isKnownConsentTextVersion', () => {
  it('akzeptiert eine bekannte Version', () => {
    expect(isKnownConsentTextVersion(CONSENT_TEXT_VERSIONS[0])).toBe(true);
  });

  it('lehnt eine unbekannte Version ab', () => {
    expect(isKnownConsentTextVersion('1999-01')).toBe(false);
  });
});

describe('hasValidConsent — Wahrheitstabelle über Event-Reihenfolgen', () => {
  it('liefert false für eine leere Historie', () => {
    expect(hasValidConsent([])).toBe(false);
  });

  it('liefert true, wenn granted das einzige Event ist', () => {
    expect(hasValidConsent([event('granted', '2026-01-01')])).toBe(true);
  });

  it('liefert false, wenn declined das letzte Event ist', () => {
    expect(hasValidConsent([event('declined', '2026-01-01')])).toBe(false);
  });

  it('liefert true für granted → revoked → granted (letztes Event entscheidet)', () => {
    const events = [
      event('granted', '2026-01-01'),
      event('revoked', '2026-02-01'),
      event('granted', '2026-03-01'),
    ];
    expect(hasValidConsent(events)).toBe(true);
  });

  it('liefert false für granted → revoked', () => {
    const events = [event('granted', '2026-01-01'), event('revoked', '2026-02-01')];
    expect(hasValidConsent(events)).toBe(false);
  });

  it('ist unabhängig von der Reihenfolge im Array — sortiert nach occurredAt, nicht Insert-Reihenfolge', () => {
    const events = [event('revoked', '2026-02-01'), event('granted', '2026-01-01')];
    expect(hasValidConsent(events)).toBe(false);
  });
});

describe('hasValidConsentAt — Status zu einem bestimmten historischen Zeitpunkt', () => {
  const events = [
    event('granted', '2026-01-01'),
    event('revoked', '2026-03-01'),
    event('granted', '2026-05-01'),
  ];

  it('liefert false für ein Datum vor dem ersten Event', () => {
    expect(hasValidConsentAt(events, new Date('2025-12-01'))).toBe(false);
  });

  it('liefert true für ein Datum zwischen granted und revoked', () => {
    expect(hasValidConsentAt(events, new Date('2026-02-01'))).toBe(true);
  });

  it('liefert false für ein Datum zwischen revoked und dem erneuten granted', () => {
    expect(hasValidConsentAt(events, new Date('2026-04-01'))).toBe(false);
  });

  it('liefert true für ein Datum nach dem erneuten granted', () => {
    expect(hasValidConsentAt(events, new Date('2026-06-01'))).toBe(true);
  });

  it('liefert false für eine leere Historie', () => {
    expect(hasValidConsentAt([], new Date())).toBe(false);
  });
});
