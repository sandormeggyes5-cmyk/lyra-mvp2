// Mapping von den rohen `muscleGroups`-Bezeichnungen aus der Übungsdatenbank
// (apps/api/prisma/schema.prisma, Model Exercise) zu den 18 visuellen
// Körperregionen der <MuscleMap>-Komponente (vorne/hinten). Die Regionen
// entsprechen den Slugs des übernommenen Asset (siehe
// apps/web/src/assets/musclemap/, THIRD_PARTY_LICENSES.md) — kein eigenes
// Hüftbeuger-Feld im Asset (Näherung auf Quadrizeps), dafür feinere
// Bauch- (abs/obliques) und Rücken-Trennung (upper-/lower-back) als zuvor.
//
// Herkunft der Rohbezeichnungen: `SELECT DISTINCT unnest("muscleGroups")
// FROM "Exercise"` gegen die lokale Dev-DB (83 Übungen, Stand 2026-10).
// Die Daten stammen NICHT aus der Free Exercise DB und haben KEIN
// primär/sekundär-Split — jede Übung hat ein flaches muscleGroups-Array,
// alle Einträge werden in <MuscleMap mode="display"> gleich stark
// hervorgehoben (siehe Plan/Freigabe).

export type RegionId =
  // Vorderansicht
  | 'front-neck'
  | 'front-shoulder'
  | 'front-chest'
  | 'front-abs'
  | 'front-obliques'
  | 'front-quad'
  | 'front-adductor'
  | 'front-shin'
  | 'front-foot'
  // Rückansicht
  | 'back-neck'
  | 'back-trapezius'
  | 'back-shoulder'
  | 'back-triceps'
  | 'back-upperback'
  | 'back-lowerback'
  | 'back-glutes'
  | 'back-hamstring'
  | 'back-calf';

export type MuscleMapView = 'front' | 'back';

export const MUSCLE_REGIONS: Record<RegionId, { labelDe: string; view: MuscleMapView }> = {
  'front-neck': { labelDe: 'Hals (vorne)', view: 'front' },
  'front-shoulder': { labelDe: 'Schulter (vorne)', view: 'front' },
  'front-chest': { labelDe: 'Brust', view: 'front' },
  'front-abs': { labelDe: 'Bauch', view: 'front' },
  'front-obliques': { labelDe: 'Seitliche Bauchmuskeln', view: 'front' },
  'front-quad': { labelDe: 'Quadrizeps', view: 'front' },
  'front-adductor': { labelDe: 'Adduktoren', view: 'front' },
  'front-shin': { labelDe: 'Schienbein', view: 'front' },
  'front-foot': { labelDe: 'Fuß', view: 'front' },
  'back-neck': { labelDe: 'Nacken (hinten)', view: 'back' },
  'back-trapezius': { labelDe: 'Trapezius', view: 'back' },
  'back-shoulder': { labelDe: 'Schulter (hinten) / Rotatorenmanschette', view: 'back' },
  'back-triceps': { labelDe: 'Oberarm (hinten)', view: 'back' },
  'back-upperback': { labelDe: 'Oberer Rücken', view: 'back' },
  'back-lowerback': { labelDe: 'Unterer Rücken', view: 'back' },
  'back-glutes': { labelDe: 'Gesäß', view: 'back' },
  'back-hamstring': { labelDe: 'Oberschenkel (hinten)', view: 'back' },
  'back-calf': { labelDe: 'Wade', view: 'back' },
};

// Jede rohe Muskelbezeichnung → eine oder mehrere Regionen. Mehrfach-
// Zuordnung nur für "Rumpfstabilisatoren" (spannt Bauch + Rücken) — bewusste
// Entscheidung statt einer erfundenen Einzelzuordnung, siehe Plan.
export const MUSCLE_TO_REGIONS: Record<string, RegionId[]> = {
  // Vorne
  'Sternocleidomastoideus': ['front-neck'],
  'Skaleni': ['front-neck'],
  'Tiefe Halsflexoren': ['front-neck'],
  'Deltoideus': ['front-shoulder'],
  'Deltoideus (anterior)': ['front-shoulder'],
  'Vorderer Deltoideus': ['front-shoulder'],
  'Pectoralis major': ['front-chest'],
  'Rectus abdominis': ['front-abs'],
  'Bauchmuskeln': ['front-abs'],
  'Transversus abdominis': ['front-abs'],
  'Obliquus externus': ['front-obliques'],
  'Obliquus internus': ['front-obliques'],
  'Oblique': ['front-obliques'],
  // Kein eigenes Hüftbeuger-Feld im neuen Asset — Näherung auf Quadrizeps
  // (anatomisch angrenzend), siehe Freigabe.
  'Iliopsoas': ['front-quad'],
  'Hüftbeuger': ['front-quad'],
  'Quadrizeps': ['front-quad'],
  'Rectus femoris': ['front-quad'],
  'Vastus medialis (VMO)': ['front-quad'],
  'Adduktoren': ['front-adductor'],
  'Hüftadduktoren': ['front-adductor'],
  'Tibialis anterior': ['front-shin'],
  'Fußsohlenmuskeln': ['front-foot'], // Näherung: Fußsohle ist eigtl. Unterseite, hier vereinfacht vorne platziert

  // Hinten
  'Nackenstrecker': ['back-neck'],
  'Subokzipitale Muskulatur': ['back-neck'],
  'Levator scapulae': ['back-neck'],
  'Trapezius': ['back-trapezius'],
  'Oberer Trapezius': ['back-trapezius'],
  'Mittlerer Trapezius': ['back-trapezius'],
  'Unterer Trapezius': ['back-trapezius'],
  // Kein eigenes Rotatorenmanschetten-Feld im neuen Asset — Näherung auf die
  // hintere Schulter/Deltoideus-Region, siehe Freigabe.
  'Rotatorenmanschette': ['back-shoulder'],
  'Infraspinatus': ['back-shoulder'],
  'Supraspinatus': ['back-shoulder'],
  'Subscapularis': ['back-shoulder'],
  'Teres minor': ['back-shoulder'],
  'Deltoideus (medial)': ['back-shoulder'],
  'Triceps brachii': ['back-triceps'],
  'Latissimus dorsi': ['back-upperback'],
  'Rhomboidei': ['back-upperback'],
  'Serratus anterior': ['back-upperback'],
  'Brustwirbelsäulen-Extensoren': ['back-upperback'],
  'Brustwirbelsäulen-Rotatoren': ['back-upperback'],
  'Quadratus lumborum': ['back-lowerback'],
  'Lendenwirbelsäule': ['back-lowerback'],
  // Spannt die gesamte Wirbelsäule — Asset trennt nur oberen/unteren Rücken,
  // daher beide Regionen statt einer erfundenen Einzelzuordnung.
  'Erector spinae': ['back-upperback', 'back-lowerback'],
  'Rückenstrecker': ['back-upperback', 'back-lowerback'],
  'Multifidus': ['back-upperback', 'back-lowerback'],
  'Rumpfstabilisatoren': ['front-abs', 'back-upperback', 'back-lowerback'],
  'Gluteus': ['back-glutes'],
  'Gluteus maximus': ['back-glutes'],
  'Gluteus medius': ['back-glutes'],
  'Gluteus minimus': ['back-glutes'],
  'Piriformis': ['back-glutes'],
  'Außenrotatoren der Hüfte': ['back-glutes'],
  'Hüftabduktoren': ['back-glutes'],
  'Tensor fasciae latae': ['back-glutes'],
  'Tractus iliotibialis': ['back-glutes'],
  'Ischiokrurale Muskulatur': ['back-hamstring'],
  'Gastrocnemius': ['back-calf'],
  'Soleus': ['back-calf'],
  'Wadenmuskulatur': ['back-calf'],
  'Peronealmuskeln': ['back-calf'],
  'Tibialis posterior': ['back-calf'],
};

// Rohe Bezeichnungen, für die bewusst KEINE Kartenregion vergeben wird —
// entweder kein Muskel, innere/nicht an der Körperoberfläche sichtbare
// Muskulatur, oder zu diffus für eine einzelne Region. Diese Muskeln
// erscheinen in <MuscleMap mode="display"> nur im Begleittext, nicht auf
// der Karte. Nichts wird hier erfunden — bei Unsicherheit lieber keine
// Markierung als eine falsche.
export const UNMAPPED_MUSCLES = [
  'Herz-Kreislauf', // kein Muskel
  'Zwerchfell', // innere Muskulatur (Atmung), an der Oberfläche nicht darstellbar
  'Beckenboden', // innere Muskulatur, an der Oberfläche nicht darstellbar
  'Schultergelenkkapsel', // Gelenkkapsel, kein Muskel
  'Sprunggelenkskapsel', // Gelenkkapsel, kein Muskel
  'Atemhilfsmuskulatur', // diffus, überlappt Hals/Brust ohne eindeutige Einzelregion
  'Rotatorenmanschette des Rumpfes', // unübliche Terminologie, vermutlich Seed-Ungenauigkeit
] as const;

export function regionsForMuscle(muscle: string): RegionId[] {
  return MUSCLE_TO_REGIONS[muscle] ?? [];
}

export function regionsForMuscles(muscles: string[]): RegionId[] {
  const ids = new Set<RegionId>();
  for (const muscle of muscles) {
    for (const region of regionsForMuscle(muscle)) {
      ids.add(region);
    }
  }
  return [...ids];
}

// Reine Filter-Prädikat-Funktion für den Muskel-Filter im Programm-Builder
// (ExercisePicker.tsx) — separat exportiert, damit sie ohne Komponenten-
// Rendering testbar ist.
export function muscleGroupsMatchRegion(muscleGroups: string[], region: RegionId): boolean {
  return muscleGroups.some((m) => regionsForMuscle(m).includes(region));
}
