// Pfad-Datentyp für die aus react-native-body-highlighter übernommenen
// Muskel-Assets (siehe THIRD_PARTY_LICENSES.md). Bewusst schlanker als die
// Quelle — kein `color`-Feld, wir steuern Hervorhebungsfarben selbst in
// MuscleMap.tsx.
export interface MusclePathData {
  slug: string;
  path: {
    common?: string[];
    left?: string[];
    right?: string[];
  };
}
