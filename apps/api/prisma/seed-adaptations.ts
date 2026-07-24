import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── TODO vor Produktivbetrieb ─────────────────────────────────────────────────
// Alle Texte in diesem Seed sind Platzhalter und wurden NICHT von einer
// Physiotherapeutin oder einem Physiotherapeuten geprüft. Vor dem
// produktiven Einsatz müssen sie fachlich freigegeben werden.
//
// Isolation: Dieses Script legt ausschließlich System-Anpassungen an
// (isSystem: true, practiceId: null) und rührt praxiseigene Anpassungen
// (isSystem: false) niemals an. Es löscht auch nie bestehende
// System-Anpassungen — bereits zugewiesene Anpassungen (verknüpft über
// ProgramExerciseAdaptation) dürfen laut Projektvorgabe nicht destruktiv
// entfernt werden. Erneutes Ausführen aktualisiert vorhandene Einträge
// (Match über exerciseId + labelDe) und legt fehlende neu an.

type AdaptationSeed = {
  labelDe: string;
  instructionDe: string;
  category: 'haltung' | 'koerperbau' | 'beweglichkeit' | 'hilfsmittel' | 'schonung';
};

type ExerciseAdaptations = {
  exerciseName: string;
  adaptations: AdaptationSeed[];
};

const data: ExerciseAdaptations[] = [
  // ── RÜCKEN ──────────────────────────────────────────────────────────────────
  {
    exerciseName: 'Brücke',
    adaptations: [
      { labelDe: 'Hohlkreuz vermeiden', category: 'haltung', instructionDe: 'Hebe die Hüfte nur so weit, wie der untere Rücken flach bleibt. Lieber eine kleinere Bewegung als ins Hohlkreuz zu kommen.' },
      { labelDe: 'Breitere Fußstellung', category: 'koerperbau', instructionDe: 'Stell die Füße etwas weiter auseinander, wenn dir das mehr Stabilität gibt.' },
      { labelDe: 'Kissen unter dem Kopf', category: 'hilfsmittel', instructionDe: 'Leg dir ein flaches Kissen unter den Kopf, wenn das Liegen auf dem Boden unangenehm ist.' },
    ],
  },
  {
    exerciseName: 'Vierfüßlerstand – Arm-/Beinstreckung (Bird-Dog)',
    adaptations: [
      { labelDe: 'Eingeschränkte Schulterbeweglichkeit', category: 'beweglichkeit', instructionDe: 'Strecke den Arm nur bis auf Schulterhöhe, wenn eine volle Streckung nach vorne unangenehm ist.' },
      { labelDe: 'Am Stuhl abstützen', category: 'hilfsmittel', instructionDe: 'Führe die Übung im Stehen aus und stütz dich mit den Händen leicht an einer Stuhllehne ab.' },
      { labelDe: 'Reduzierter Bewegungsumfang', category: 'schonung', instructionDe: 'Hebe Arm und Bein nur wenige Zentimeter vom Boden ab, statt sie ganz zu strecken.' },
    ],
  },
  {
    exerciseName: 'Katze-Kuh (Mobilisation LWS)',
    adaptations: [
      { labelDe: 'Kleinere Bewegung', category: 'haltung', instructionDe: 'Runde und wölbe den Rücken nur in einem kleinen, angenehmen Ausmaß, statt die Bewegung voll auszureizen.' },
      { labelDe: 'Unterarmstütz', category: 'hilfsmittel', instructionDe: 'Stütz dich auf den Unterarmen statt auf den Händen ab, wenn deine Handgelenke das angenehmer finden.' },
      { labelDe: 'Breitere Kniestellung', category: 'koerperbau', instructionDe: 'Stell die Knie etwas weiter auseinander, wenn dir das mehr Halt im Vierfüßlerstand gibt.' },
    ],
  },
  {
    exerciseName: 'McKenzie-Extension (Prone Press-Up)',
    adaptations: [
      { labelDe: 'Nur auf Unterarmen', category: 'schonung', instructionDe: 'Stütz dich nur auf die Unterarme statt auf die gestreckten Arme, für eine sanftere Variante.' },
      { labelDe: 'Eingeschränkte Schulterbeweglichkeit', category: 'beweglichkeit', instructionDe: 'Drück dich nur so weit hoch, wie es ohne Ziehen in der Schulter möglich ist.' },
      { labelDe: 'Kissen unter dem Becken', category: 'hilfsmittel', instructionDe: 'Leg ein flaches Kissen unter dein Becken, wenn die Bauchlage sonst unangenehm ist.' },
    ],
  },
  {
    exerciseName: 'Knie zur Brust',
    adaptations: [
      { labelDe: 'Größerer Bauchumfang', category: 'koerperbau', instructionDe: 'Fasse das Knie seitlich statt von oben, wenn der Bauch beim Heranziehen im Weg ist.' },
      { labelDe: 'Mit Handtuch', category: 'hilfsmittel', instructionDe: 'Leg dir ein zusammengerolltes Handtuch um den Oberschenkel, falls du das Knie so nicht gut greifen kannst.' },
      { labelDe: 'Kürzere Haltezeit', category: 'schonung', instructionDe: 'Halte die Dehnung nur 10–15 Sekunden statt 30, wenn dir das angenehmer ist.' },
    ],
  },
  {
    exerciseName: 'Rumpfrotation im Liegen',
    adaptations: [
      { labelDe: 'Kleinere Rotation', category: 'haltung', instructionDe: 'Senke die Knie nur ein kleines Stück zur Seite, statt sie bis zum Boden zu bewegen.' },
      { labelDe: 'Kissen zwischen den Knien', category: 'hilfsmittel', instructionDe: 'Leg ein Kissen zwischen die Knie, das macht die Bewegung kontrollierter.' },
      { labelDe: 'Eingeschränkte Hüftbeweglichkeit', category: 'beweglichkeit', instructionDe: 'Beweg die Knie nur so weit, wie es ohne Ziehen in der Hüfte geht.' },
    ],
  },
  {
    exerciseName: 'Hüftbeuger-Dehnung (Kniender Ausfallschritt)',
    adaptations: [
      { labelDe: 'Kissenunterlage fürs Knie', category: 'hilfsmittel', instructionDe: 'Leg ein Kissen oder eine gefaltete Decke unter das hintere Knie, wenn der Boden zu hart ist.' },
      { labelDe: 'Eingeschränkte Kniebeweglichkeit', category: 'beweglichkeit', instructionDe: 'Stell das vordere Bein etwas weiter nach vorne, wenn ein 90°-Winkel im Knie unangenehm ist.' },
      { labelDe: 'Ohne Vorschieben des Beckens', category: 'schonung', instructionDe: 'Spüre die Dehnung schon in der Ausgangsstellung, ohne das Becken zusätzlich nach vorne zu schieben.' },
    ],
  },

  // ── KNIE ────────────────────────────────────────────────────────────────────
  {
    exerciseName: 'Wandsitz',
    adaptations: [
      { labelDe: 'Kleinerer Kniewinkel', category: 'haltung', instructionDe: 'Gleite nur so weit herunter, bis die Knie einen Winkel von etwa 120° statt 90° bilden.' },
      { labelDe: 'Größerer Fußabstand', category: 'koerperbau', instructionDe: 'Stell die Füße etwas weiter von der Wand weg, wenn dir das mehr Stabilität gibt.' },
      { labelDe: 'Mit Gymnastikball', category: 'hilfsmittel', instructionDe: 'Leg einen großen Ball zwischen Rücken und Wand, das macht die Position für manche angenehmer.' },
    ],
  },
  {
    exerciseName: 'Mini-Squat',
    adaptations: [
      { labelDe: 'Am Stuhl abstützen', category: 'hilfsmittel', instructionDe: 'Halte dich mit beiden Händen an einer Stuhllehne oder Ablage fest.' },
      { labelDe: 'Kleinerer Bewegungsumfang', category: 'schonung', instructionDe: 'Beuge die Knie nur ganz leicht (ca. 15°) statt der vollen 30°.' },
      { labelDe: 'Eingeschränkte Sprunggelenksbeweglichkeit', category: 'beweglichkeit', instructionDe: 'Stell die Füße etwas weiter auseinander, wenn die Fersen sonst vom Boden abheben.' },
    ],
  },
  {
    exerciseName: 'Terminale Knieextension (TKE)',
    adaptations: [
      { labelDe: 'Im Sitzen', category: 'hilfsmittel', instructionDe: 'Führe die Übung im Sitzen statt im Stehen aus, wenn dir das mehr Sicherheit gibt.' },
      { labelDe: 'Ohne Theraband', category: 'schonung', instructionDe: 'Strecke das Knie zunächst ohne Widerstand, nur gegen das eigene Körpergewicht.' },
      { labelDe: 'Geringere Vorspannung', category: 'haltung', instructionDe: 'Spann das Theraband weniger stark vor, wenn die Übung sonst zu intensiv ist.' },
    ],
  },
  {
    exerciseName: 'Gestrecktes Beinanheben (Straight Leg Raise)',
    adaptations: [
      { labelDe: 'Größerer Bauchumfang', category: 'koerperbau', instructionDe: 'Stütz dich mit den Händen seitlich neben dem Körper ab, das erleichtert die Ausgangsposition.' },
      { labelDe: 'Geringere Hubhöhe', category: 'schonung', instructionDe: 'Hebe das Bein nur wenige Zentimeter an, statt bis auf 45°.' },
      { labelDe: 'Eingeschränkte Hüftbeweglichkeit', category: 'beweglichkeit', instructionDe: 'Winkel auch das angehobene Bein leicht an, wenn eine komplette Streckung nicht angenehm ist.' },
    ],
  },
  {
    exerciseName: 'Kniebeuge',
    adaptations: [
      { labelDe: 'Am Türrahmen festhalten', category: 'hilfsmittel', instructionDe: 'Halte dich leicht an einem Türrahmen oder einer stabilen Kante fest, für mehr Balance.' },
      { labelDe: 'Kleinerer Beugewinkel', category: 'haltung', instructionDe: 'Beuge die Knie nur bis zur Hälfte, statt bis die Oberschenkel waagerecht sind.' },
      { labelDe: 'Eingeschränkte Sprunggelenksbeweglichkeit', category: 'beweglichkeit', instructionDe: 'Leg ein flaches Kissen unter die Fersen, wenn du sonst nach hinten kippst.' },
    ],
  },
  {
    exerciseName: 'Step-Up',
    adaptations: [
      { labelDe: 'Niedrigere Stufe', category: 'hilfsmittel', instructionDe: 'Verwende eine niedrigere Stufe oder ein flaches Step-Board statt einer hohen Stufe.' },
      { labelDe: 'Mit Geländer', category: 'schonung', instructionDe: 'Halte dich beim Hoch- und Runtersteigen an einem Geländer oder Handlauf fest.' },
      { labelDe: 'Eingeschränkte Hüftbeweglichkeit', category: 'beweglichkeit', instructionDe: 'Wähl eine Stufenhöhe, bei der das Knie beim Hochsteigen nicht über 90° gebeugt wird.' },
    ],
  },
  {
    exerciseName: 'Oberschenkelrückseite dehnen (Hamstring-Stretch)',
    adaptations: [
      { labelDe: 'Mit Handtuch', category: 'hilfsmittel', instructionDe: 'Leg dir ein Handtuch um die Fußsohle und zieh das Bein damit sanft zu dir heran, statt es mit den Händen zu fassen.' },
      { labelDe: 'Angewinkeltes Standbein', category: 'koerperbau', instructionDe: 'Winkel das nicht gedehnte Bein stärker an, wenn du dadurch bequemer liegst.' },
      { labelDe: 'Eingeschränkte Kniebeweglichkeit', category: 'beweglichkeit', instructionDe: 'Lass das Knie des gedehnten Beins leicht gebeugt, statt es ganz zu strecken.' },
    ],
  },
  {
    exerciseName: 'Oberschenkelvorderseite dehnen',
    adaptations: [
      { labelDe: 'Im Liegen', category: 'hilfsmittel', instructionDe: 'Führe die Dehnung in Seitenlage statt im Stehen aus, wenn dir das mehr Halt gibt.' },
      { labelDe: 'Eingeschränkte Kniebeweglichkeit', category: 'beweglichkeit', instructionDe: 'Zieh den Fuß nur so weit heran, wie es ohne Ziehen im Knie angenehm ist.' },
      { labelDe: 'Kürzere Haltezeit', category: 'schonung', instructionDe: 'Halte die Dehnung 10–15 Sekunden statt 30, wenn dir das angenehmer ist.' },
    ],
  },

  // ── SCHULTER ────────────────────────────────────────────────────────────────
  {
    exerciseName: 'Theraband Außenrotation',
    adaptations: [
      { labelDe: 'Im Sitzen', category: 'hilfsmittel', instructionDe: 'Führe die Übung im Sitzen aus, wenn dir das mehr Stabilität gibt.' },
      { labelDe: 'Leichteres Theraband', category: 'schonung', instructionDe: 'Nimm ein Theraband mit geringerem Widerstand, wenn die Bewegung sonst zu intensiv ist.' },
      { labelDe: 'Eingeschränkte Schulterbeweglichkeit', category: 'beweglichkeit', instructionDe: 'Rotiere nur so weit, wie es ohne Ziehen in der Schulter möglich ist.' },
    ],
  },
  {
    exerciseName: 'Theraband Innenrotation',
    adaptations: [
      { labelDe: 'Im Sitzen', category: 'hilfsmittel', instructionDe: 'Führe die Übung im Sitzen aus, wenn dir das mehr Stabilität gibt.' },
      { labelDe: 'Leichteres Theraband', category: 'schonung', instructionDe: 'Nimm ein Theraband mit geringerem Widerstand, wenn die Bewegung sonst zu intensiv ist.' },
      { labelDe: 'Eingeschränkte Schulterbeweglichkeit', category: 'beweglichkeit', instructionDe: 'Reduziere den Rotationsweg, wenn die volle Bewegung unangenehm ist.' },
    ],
  },
  {
    exerciseName: 'Schulterblatt-Retraktion',
    adaptations: [
      { labelDe: 'Im Liegen', category: 'hilfsmittel', instructionDe: 'Führe die Übung im Liegen auf dem Bauch aus, wenn dir das leichter fällt.' },
      { labelDe: 'Kürzere Haltezeit', category: 'schonung', instructionDe: 'Halte die Anspannung nur 2–3 Sekunden statt 5.' },
      { labelDe: 'Arme locker hängend', category: 'koerperbau', instructionDe: 'Nimm die Arme locker seitlich herunterhängend, wenn Verschränken vor der Brust unbequem ist.' },
    ],
  },
  {
    exerciseName: 'Pendeln (Codman-Pendel)',
    adaptations: [
      { labelDe: 'Am Tisch abstützen', category: 'hilfsmittel', instructionDe: 'Stütz dich mit der freien Hand auf einem Tisch oder einer Stuhllehne ab.' },
      { labelDe: 'Kleinere Kreise', category: 'schonung', instructionDe: 'Mach nur ganz kleine, langsame Kreise statt großer Bewegungen.' },
      { labelDe: 'Eingeschränkte Rumpfbeugung', category: 'beweglichkeit', instructionDe: 'Beug dich nur leicht nach vorne, statt dich weit vorzubeugen.' },
    ],
  },
  {
    exerciseName: 'Seitliches Anheben (Lateral Raise)',
    adaptations: [
      { labelDe: 'Ohne Zusatzgewicht', category: 'hilfsmittel', instructionDe: 'Führe die Bewegung zunächst ganz ohne Gewicht aus, nur gegen die Schwerkraft.' },
      { labelDe: 'Geringere Hubhöhe', category: 'haltung', instructionDe: 'Hebe die Arme nur bis auf Brusthöhe, statt bis auf Schulterhöhe.' },
      { labelDe: 'Eingeschränkte Schulterbeweglichkeit', category: 'beweglichkeit', instructionDe: 'Hebe die Arme leicht vor dem Körper statt seitlich, wenn das angenehmer ist.' },
    ],
  },
  {
    exerciseName: 'Wand-Kriechgang',
    adaptations: [
      { labelDe: 'Kürzere Strecke', category: 'schonung', instructionDe: 'Krieche nur ein kurzes Stück nach oben, statt so weit wie möglich zu gehen.' },
      { labelDe: 'Im Sitzen vor der Wand', category: 'hilfsmittel', instructionDe: 'Führe die Übung im Sitzen vor der Wand aus, wenn längeres Stehen unangenehm ist.' },
      { labelDe: 'Eingeschränkte Schulterbeweglichkeit', category: 'beweglichkeit', instructionDe: 'Stopp die Bewegung schon deutlich unterhalb der Schmerzgrenze.' },
    ],
  },
  {
    exerciseName: 'Brustmuskeldehnung (Türrahmen-Stretch)',
    adaptations: [
      { labelDe: 'Geringere Drehung', category: 'haltung', instructionDe: 'Dreh den Körper nur leicht vom Türrahmen weg, statt die Drehung voll auszunutzen.' },
      { labelDe: 'Tieferer Armanschlag', category: 'koerperbau', instructionDe: 'Positioniere den Unterarm etwas tiefer am Türrahmen, wenn Schulterhöhe unbequem ist.' },
      { labelDe: 'Kürzere Haltezeit', category: 'schonung', instructionDe: 'Halte die Dehnung 10–15 Sekunden statt 30, wenn dir das angenehmer ist.' },
    ],
  },

  // ── HÜFTE ───────────────────────────────────────────────────────────────────
  {
    exerciseName: 'Clamshell',
    adaptations: [
      { labelDe: 'Kissen unter dem Kopf', category: 'hilfsmittel', instructionDe: 'Leg dir ein Kissen unter den Kopf, wenn die Seitlage sonst unbequem ist.' },
      { labelDe: 'Kleinerer Öffnungswinkel', category: 'schonung', instructionDe: 'Öffne das obere Knie nur ein kleines Stück, statt es weit zu öffnen.' },
      { labelDe: 'Stärker angewinkelte Knie', category: 'koerperbau', instructionDe: 'Winkel die Knie etwas stärker an, wenn dir das mehr Kontrolle gibt.' },
    ],
  },
  {
    exerciseName: 'Seitliches Beinanheben',
    adaptations: [
      { labelDe: 'Kissen unter dem Kopf', category: 'hilfsmittel', instructionDe: 'Leg dir ein Kissen unter den Kopf, wenn die Seitlage sonst unbequem ist.' },
      { labelDe: 'Geringere Hubhöhe', category: 'schonung', instructionDe: 'Hebe das Bein nur wenige Zentimeter an, statt auf 30–40°.' },
      { labelDe: 'Angewinkeltes unteres Bein', category: 'koerperbau', instructionDe: 'Winkel das untere Bein leicht an, wenn dir das mehr Stabilität in der Seitlage gibt.' },
    ],
  },
  {
    exerciseName: 'Hüftextension im Stand',
    adaptations: [
      { labelDe: 'Am Stuhl abstützen', category: 'hilfsmittel', instructionDe: 'Stütz dich mit beiden Händen auf einer Stuhllehne ab, statt nur an der Wand.' },
      { labelDe: 'Geringere Hubhöhe', category: 'haltung', instructionDe: 'Hebe das Bein nur wenige Zentimeter nach hinten, statt weit.' },
      { labelDe: 'Eingeschränkte Hüftbeweglichkeit', category: 'beweglichkeit', instructionDe: 'Achte darauf, die Bewegung schon vor dem Punkt zu stoppen, an dem sich der Rücken mitbewegt.' },
    ],
  },
  {
    exerciseName: 'Piriformis-Dehnung',
    adaptations: [
      { labelDe: 'Mit Handtuch', category: 'hilfsmittel', instructionDe: 'Leg dir ein zusammengerolltes Handtuch um den Oberschenkel, wenn du das Knie so nicht gut greifen kannst.' },
      { labelDe: 'Größerer Bauchumfang', category: 'koerperbau', instructionDe: 'Zieh das Knie seitlich statt frontal zur Brust, wenn der Bauch im Weg ist.' },
      { labelDe: 'Kürzere Haltezeit', category: 'schonung', instructionDe: 'Halte die Dehnung 10–15 Sekunden statt 30, wenn dir das angenehmer ist.' },
    ],
  },
  {
    exerciseName: 'IT-Band-Dehnung',
    adaptations: [
      { labelDe: 'An der Wand abstützen', category: 'hilfsmittel', instructionDe: 'Stütz dich zusätzlich mit einer Hand an einer Wand ab, für mehr Balance.' },
      { labelDe: 'Geringere Kreuzung', category: 'haltung', instructionDe: 'Kreuze das Bein nur leicht hinter dem anderen, statt weit zu kreuzen.' },
      { labelDe: 'Eingeschränkte Hüftbeweglichkeit', category: 'beweglichkeit', instructionDe: 'Schieb die Hüfte nur so weit zur Seite, wie es ohne Ziehen angenehm ist.' },
    ],
  },

  // ── HWS / NACKEN ────────────────────────────────────────────────────────────
  {
    exerciseName: 'Kinneinzug (Chin Tuck)',
    adaptations: [
      { labelDe: 'Im Liegen', category: 'hilfsmittel', instructionDe: 'Führe die Übung im Rückenliegen aus, wenn dir das leichter fällt als im Sitzen.' },
      { labelDe: 'Kürzere Haltezeit', category: 'schonung', instructionDe: 'Halte die Position nur 2–3 Sekunden statt 5.' },
      { labelDe: 'Kleinere Bewegung', category: 'haltung', instructionDe: 'Schieb das Kinn nur ganz leicht zurück, statt die Bewegung voll auszunutzen.' },
    ],
  },
  {
    exerciseName: 'HWS-Seitwärtsneigung',
    adaptations: [
      { labelDe: 'Kürzere Haltezeit', category: 'schonung', instructionDe: 'Halte die Dehnung 10 Sekunden statt 20, wenn dir das angenehmer ist.' },
      { labelDe: 'Mit Rückenlehne', category: 'hilfsmittel', instructionDe: 'Setz dich an eine Stuhllehne, die deinen Rücken stützt, während du den Kopf neigst.' },
      { labelDe: 'Eingeschränkte HWS-Beweglichkeit', category: 'beweglichkeit', instructionDe: 'Neige den Kopf nur ein kleines Stück zur Seite, statt bis zur vollen Dehnung.' },
    ],
  },
  {
    exerciseName: 'HWS-Rotation',
    adaptations: [
      { labelDe: 'Kürzere Haltezeit', category: 'schonung', instructionDe: 'Halte die Position nur 2–3 Sekunden statt 5.' },
      { labelDe: 'Eingeschränkte HWS-Beweglichkeit', category: 'beweglichkeit', instructionDe: 'Dreh den Kopf nur so weit, wie es ganz ohne Ziehen möglich ist.' },
      { labelDe: 'Mit Rückenlehne', category: 'hilfsmittel', instructionDe: 'Setz dich an eine Stuhllehne, die deinen Rücken stützt, während du den Kopf drehst.' },
    ],
  },
  {
    exerciseName: 'Schulterheben und -senken',
    adaptations: [
      { labelDe: 'Kürzere Anspannung', category: 'schonung', instructionDe: 'Spann die Schultern nur 1–2 Sekunden an, statt 3.' },
      { labelDe: 'Mit Armlehnen', category: 'hilfsmittel', instructionDe: 'Leg die Unterarme während der Übung auf Armlehnen ab, wenn dir das mehr Ruhe gibt.' },
      { labelDe: 'Kleinere Bewegung', category: 'haltung', instructionDe: 'Zieh die Schultern nur ein kleines Stück nach oben, statt maximal.' },
    ],
  },
  {
    exerciseName: 'Oberer Trapezius Dehnung',
    adaptations: [
      { labelDe: 'Kürzere Haltezeit', category: 'schonung', instructionDe: 'Halte die Dehnung 10–15 Sekunden statt 30, wenn dir das angenehmer ist.' },
      { labelDe: 'Ohne Handunterstützung', category: 'hilfsmittel', instructionDe: 'Neige den Kopf zunächst nur mit dem eigenen Gewicht, ganz ohne die Hand zur Unterstützung.' },
      { labelDe: 'Eingeschränkte HWS-Beweglichkeit', category: 'beweglichkeit', instructionDe: 'Neige den Kopf nur ein kleines Stück, statt bis zur vollen Dehnung.' },
    ],
  },

  // ── SPRUNGGELENK / FUSS ─────────────────────────────────────────────────────
  {
    exerciseName: 'Fersenstand (Calf Raise)',
    adaptations: [
      { labelDe: 'An der Wand abstützen', category: 'hilfsmittel', instructionDe: 'Stütz dich mit beiden Händen an einer Wand oder Stuhllehne ab.' },
      { labelDe: 'Geringere Hubhöhe', category: 'schonung', instructionDe: 'Heb die Fersen nur ein kleines Stück an, statt ganz auf die Zehenspitzen zu gehen.' },
      { labelDe: 'Beidbeinig statt einbeinig', category: 'koerperbau', instructionDe: 'Führe die Übung immer beidbeinig aus, statt sie später einbeinig zu steigern.' },
    ],
  },
  {
    exerciseName: 'Sprunggelenk-Kreisen',
    adaptations: [
      { labelDe: 'Kleinere Kreise', category: 'schonung', instructionDe: 'Mach nur kleine, langsame Kreise statt großer Bewegungen.' },
      { labelDe: 'Im Sitzen', category: 'hilfsmittel', instructionDe: 'Führe die Übung im Sitzen auf einem Stuhl statt im Liegen aus, wenn dir das angenehmer ist.' },
      { labelDe: 'Eingeschränkte Sprunggelenksbeweglichkeit', category: 'beweglichkeit', instructionDe: 'Kreise nur so weit, wie es ganz ohne Ziehen möglich ist.' },
    ],
  },
  {
    exerciseName: 'Zehenheben (Toe Raise)',
    adaptations: [
      { labelDe: 'An der Wand abstützen', category: 'hilfsmittel', instructionDe: 'Stütz dich mit einer Hand an einer Wand oder Stuhllehne ab.' },
      { labelDe: 'Geringere Hubhöhe', category: 'schonung', instructionDe: 'Heb die Zehen nur ein kleines Stück an, statt so weit wie möglich.' },
      { labelDe: 'Eingeschränkte Sprunggelenksbeweglichkeit', category: 'beweglichkeit', instructionDe: 'Heb Zehen und Fußballen nur so weit an, wie es ohne Ziehen im Fußgelenk geht.' },
    ],
  },
  {
    exerciseName: 'Wadendehnung (stehend)',
    adaptations: [
      { labelDe: 'Mit beiden Händen an der Wand', category: 'hilfsmittel', instructionDe: 'Stütz dich mit beiden Händen fest an der Wand ab, für mehr Sicherheit.' },
      { labelDe: 'Kürzere Haltezeit', category: 'schonung', instructionDe: 'Halte die Dehnung 10–15 Sekunden statt 30, wenn dir das angenehmer ist.' },
      { labelDe: 'Eingeschränkte Kniebeweglichkeit', category: 'beweglichkeit', instructionDe: 'Lass das hintere Knie leicht gebeugt, statt es ganz zu strecken.' },
    ],
  },
  {
    exerciseName: 'Einbeinstand',
    adaptations: [
      { labelDe: 'An der Wand oder am Stuhl', category: 'hilfsmittel', instructionDe: 'Stell dich neben eine Wand oder einen Stuhl, den du bei Bedarf jederzeit greifen kannst.' },
      { labelDe: 'Kürzere Standzeit', category: 'schonung', instructionDe: 'Halte die Position nur 10–15 Sekunden statt 30.' },
      { labelDe: 'Augen geöffnet lassen', category: 'haltung', instructionDe: 'Lass die Augen immer geöffnet, verzichte auf die erschwerte Variante mit geschlossenen Augen.' },
    ],
  },

  // ── GANZKÖRPER / CARDIO ─────────────────────────────────────────────────────
  {
    exerciseName: 'Liegestütze',
    adaptations: [
      { labelDe: 'An der Wand oder Ablage', category: 'hilfsmittel', instructionDe: 'Führe die Übung im Stehen gegen eine Wand oder mit den Händen auf einer erhöhten Ablage aus, statt am Boden.' },
      { labelDe: 'Auf den Knien', category: 'koerperbau', instructionDe: 'Stütz dich zusätzlich auf den Knien statt auf den Zehenspitzen ab, für mehr Stabilität.' },
      { labelDe: 'Geringere Absenktiefe', category: 'schonung', instructionDe: 'Senke die Brust nur ein kleines Stück ab, statt so tief wie möglich zu gehen.' },
    ],
  },
  {
    exerciseName: 'Joggen',
    adaptations: [
      { labelDe: 'Kürzere Dauer', category: 'schonung', instructionDe: 'Lauf nur wenige Minuten am Stück, statt die volle Zeit durchzuhalten.' },
      { labelDe: 'Gehen statt Laufen', category: 'koerperbau', instructionDe: 'Ersetze das Joggen durch zügiges Gehen, wenn dir das angenehmer ist.' },
      { labelDe: 'Auf weichem Untergrund', category: 'hilfsmittel', instructionDe: 'Lauf auf einem weichen Untergrund wie Waldboden oder einer Tartanbahn statt auf Asphalt.' },
    ],
  },

  // ── CORE ────────────────────────────────────────────────────────────────────
  {
    exerciseName: 'Planke',
    adaptations: [
      { labelDe: 'Auf den Knien', category: 'hilfsmittel', instructionDe: 'Stütz dich zusätzlich auf den Knien statt auf den Zehenspitzen ab.' },
      { labelDe: 'Kürzere Haltezeit', category: 'schonung', instructionDe: 'Halte die Position 10 Sekunden statt 20, wenn dir das angenehmer ist.' },
      { labelDe: 'Höhere Ausgangsposition', category: 'koerperbau', instructionDe: 'Stütz dich mit den Unterarmen auf einer erhöhten Ablage statt auf dem Boden ab.' },
    ],
  },
  {
    exerciseName: 'Seitstütz',
    adaptations: [
      { labelDe: 'Angewinkeltes unteres Bein', category: 'hilfsmittel', instructionDe: 'Winkel das untere Bein an, statt beide Beine gestreckt zu lassen — das gibt mehr Stabilität.' },
      { labelDe: 'Kürzere Haltezeit', category: 'schonung', instructionDe: 'Halte die Position 10 Sekunden statt 20, wenn dir das angenehmer ist.' },
      { labelDe: 'Höhere Ausgangsposition', category: 'koerperbau', instructionDe: 'Stütz dich auf einer erhöhten Ablage statt auf dem Boden ab.' },
    ],
  },
  {
    exerciseName: 'Dead Bug',
    adaptations: [
      { labelDe: 'Größerer Bauchumfang', category: 'koerperbau', instructionDe: 'Winkel Arme und Beine stärker an, statt sie weit Richtung Boden zu strecken.' },
      { labelDe: 'Kleinerer Bewegungsumfang', category: 'schonung', instructionDe: 'Beweg Arm und Bein nur ein kleines Stück Richtung Boden, statt so weit wie möglich.' },
      { labelDe: 'Kissen im Rücken', category: 'hilfsmittel', instructionDe: 'Leg ein flaches Kissen unter den unteren Rücken, wenn der Kontakt zum Boden sonst fehlt.' },
    ],
  },
  {
    exerciseName: 'Beckenbodenkontrolle',
    adaptations: [
      { labelDe: 'Im Liegen', category: 'hilfsmittel', instructionDe: 'Führe die Übung im Liegen statt im Sitzen aus, wenn dir das leichter fällt.' },
      { labelDe: 'Kürzere Haltezeit', category: 'schonung', instructionDe: 'Halte die Anspannung nur 2–3 Sekunden statt 5.' },
      { labelDe: 'Geringere Intensität', category: 'haltung', instructionDe: 'Spann nur ganz sanft an, etwa auf halber Kraft, statt maximal.' },
    ],
  },
];

async function seedAdaptations() {
  console.log('Seeding Übungs-Anpassungen (System)…');

  const exercises = await prisma.exercise.findMany({ select: { id: true, nameDe: true } });
  const exerciseIdByName = new Map(exercises.map(e => [e.nameDe, e.id]));

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const entry of data) {
    const exerciseId = exerciseIdByName.get(entry.exerciseName);
    if (!exerciseId) {
      console.warn(`⚠ Übung "${entry.exerciseName}" nicht gefunden — Anpassungen übersprungen. Erst \`db:seed\` für die Übungs-Bibliothek ausführen.`);
      skipped += entry.adaptations.length;
      continue;
    }

    for (const [index, item] of entry.adaptations.entries()) {
      // Match nur gegen System-Anpassungen (isSystem: true) — praxiseigene
      // Anpassungen (isSystem: false) haben denselben Namensraum, werden hier
      // aber nie gelesen oder verändert.
      const existing = await prisma.exerciseAdaptation.findFirst({
        where: { exerciseId, labelDe: item.labelDe, isSystem: true },
      });

      if (existing) {
        await prisma.exerciseAdaptation.update({
          where: { id: existing.id },
          data: { instructionDe: item.instructionDe, category: item.category, order: index },
        });
        updated += 1;
      } else {
        await prisma.exerciseAdaptation.create({
          data: {
            exerciseId,
            labelDe: item.labelDe,
            instructionDe: item.instructionDe,
            category: item.category,
            order: index,
            isSystem: true,
          },
        });
        created += 1;
      }
    }
  }

  console.log(`✓ ${created} Anpassungen angelegt, ${updated} aktualisiert${skipped ? `, ${skipped} übersprungen (Übung fehlt)` : ''}.`);
}

seedAdaptations()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
