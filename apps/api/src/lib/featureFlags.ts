// Erlaubt das Verordnen fachlich ungeprüfter Übungen/Anpassungen nur
// außerhalb von production — selbst ein versehentlich gesetztes
// ALLOW_UNVALIDATED_EXERCISES in der Produktions-.env hebelt die Regel
// dadurch nicht aus.
export function unvalidatedExercisesAllowed(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.ALLOW_UNVALIDATED_EXERCISES === 'true';
}
