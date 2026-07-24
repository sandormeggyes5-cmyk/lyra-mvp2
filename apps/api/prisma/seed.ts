import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Video-URLs: Platzhalter — vor Produktionsstart durch lizenzierte Quellen ersetzen.
// Geeignete lizenzfreie Quellen: Pexels (CC0), Pixabay (Pixabay License), eigene Produktionen.
const exercises = [
  // ── RÜCKEN ──────────────────────────────────────────────────────────────────
  {
    nameDe: 'Brücke',
    descriptionDe:
      'Lege dich auf den Rücken, Knie angewinkelt, Füße hüftbreit auf dem Boden. Spanne Bauch und Gesäß an und hebe die Hüfte, bis Schultern, Hüfte und Knie eine gerade Linie bilden. 2 Sekunden halten, dann langsam absenken.',
    bodyRegion: 'Rücken',
    muscleGroups: ['Gluteus maximus', 'Ischiokrurale Muskulatur', 'Rumpfstabilisatoren'],
    difficulty: 1,
    defaultSets: 3,
    defaultReps: 12,
    defaultHoldSeconds: 2,
  },
  {
    nameDe: 'Vierfüßlerstand – Arm-/Beinstreckung (Bird-Dog)',
    descriptionDe:
      'Starte im Vierfüßlerstand, Rücken gerade. Strecke gleichzeitig den rechten Arm und das linke Bein waagerecht aus. 3 Sekunden halten, dann wechseln. Bauch bleibt aktiv.',
    bodyRegion: 'Rücken',
    muscleGroups: ['Multifidus', 'Gluteus maximus', 'Rumpfstabilisatoren'],
    difficulty: 2,
    defaultSets: 3,
    defaultReps: 10,
    defaultHoldSeconds: 3,
  },
  {
    nameDe: 'Katze-Kuh (Mobilisation LWS)',
    descriptionDe:
      'Im Vierfüßlerstand: beim Einatmen Rücken nach oben runden (Katze), beim Ausatmen Rücken durchhängen lassen und Kopf heben (Kuh). Langsam und kontrolliert im Atemrhythmus bewegen.',
    bodyRegion: 'Rücken',
    muscleGroups: ['Erector spinae', 'Multifidus', 'Bauchmuskeln'],
    difficulty: 1,
    defaultSets: 2,
    defaultReps: 10,
    defaultHoldSeconds: null,
  },
  {
    nameDe: 'McKenzie-Extension (Prone Press-Up)',
    descriptionDe:
      'Lege dich auf den Bauch, Hände neben den Schultern. Stütze dich langsam auf die Arme, der Bauch bleibt auf der Matte, das Becken bleibt entspannt unten. Halte oben kurz an, dann langsam senken.',
    bodyRegion: 'Rücken',
    muscleGroups: ['Erector spinae', 'Rückenstrecker'],
    difficulty: 1,
    defaultSets: 3,
    defaultReps: 10,
    defaultHoldSeconds: 3,
  },
  {
    nameDe: 'Knie zur Brust',
    descriptionDe:
      'Im Rückenliegen ein Knie mit beiden Händen sanft zur Brust ziehen. Dehnung in der Lendenwirbelsäule spüren. 30 Sekunden halten, dann Seite wechseln.',
    bodyRegion: 'Rücken',
    muscleGroups: ['Lendenwirbelsäule', 'Gluteus'],
    difficulty: 1,
    defaultSets: 2,
    defaultReps: 1,
    defaultHoldSeconds: 30,
  },
  {
    nameDe: 'Rumpfrotation im Liegen',
    descriptionDe:
      'Rückenliege, Knie angewinkelt. Beide Knie gemeinsam langsam zur einen Seite senken, Schultern bleiben am Boden. 20 Sekunden halten, dann zur anderen Seite.',
    bodyRegion: 'Rücken',
    muscleGroups: ['Rotatorenmanschette des Rumpfes', 'Oblique'],
    difficulty: 1,
    defaultSets: 2,
    defaultReps: 1,
    defaultHoldSeconds: 20,
  },
  {
    nameDe: 'Hüftbeuger-Dehnung (Kniender Ausfallschritt)',
    descriptionDe:
      'Knie dich auf ein Knie, das andere Bein im 90°-Winkel nach vorne. Schiebe das Becken nach vorne und spüre die Dehnung an der Vorderseite der hinteren Hüfte. Aufrechte Haltung beibehalten.',
    bodyRegion: 'Rücken',
    muscleGroups: ['Iliopsoas', 'Rectus femoris'],
    difficulty: 1,
    defaultSets: 2,
    defaultReps: 1,
    defaultHoldSeconds: 30,
  },

  // ── KNIE ────────────────────────────────────────────────────────────────────
  {
    nameDe: 'Wandsitz',
    descriptionDe:
      'Lehne mit dem Rücken an einer Wand, gleite so weit herunter, bis Knie und Hüfte einen 90°-Winkel bilden. Rücken bleibt gerade an der Wand. Position halten.',
    bodyRegion: 'Knie',
    muscleGroups: ['Quadrizeps', 'Gluteus maximus'],
    difficulty: 2,
    defaultSets: 3,
    defaultReps: 1,
    defaultHoldSeconds: 30,
  },
  {
    nameDe: 'Mini-Squat',
    descriptionDe:
      'Im Stand, Füße hüftbreit. Knie leicht beugen (ca. 30°), Rücken gerade, Gewicht gleichmäßig auf beide Füße. Langsam wieder aufrichten.',
    bodyRegion: 'Knie',
    muscleGroups: ['Quadrizeps', 'Gluteus maximus'],
    difficulty: 1,
    defaultSets: 3,
    defaultReps: 15,
    defaultHoldSeconds: null,
  },
  {
    nameDe: 'Terminale Knieextension (TKE)',
    descriptionDe:
      'Stehe aufrecht, ein Theraband hinter dem Knie befestigt. Knie leicht gebeugt, dann vollständig strecken und VMO anspannen. Langsam zurück in Ausgangsstellung.',
    bodyRegion: 'Knie',
    muscleGroups: ['Vastus medialis (VMO)', 'Quadrizeps'],
    difficulty: 1,
    defaultSets: 3,
    defaultReps: 15,
    defaultHoldSeconds: null,
  },
  {
    nameDe: 'Gestrecktes Beinanheben (Straight Leg Raise)',
    descriptionDe:
      'Im Rückenliegen, ein Bein gestreckt, das andere angewinkelt. Das gestreckte Bein auf ca. 45° anheben, 2 Sekunden halten, langsam senken. Quadrizeps dabei angespannt halten.',
    bodyRegion: 'Knie',
    muscleGroups: ['Quadrizeps', 'Hüftbeuger'],
    difficulty: 1,
    defaultSets: 3,
    defaultReps: 12,
    defaultHoldSeconds: 2,
  },
  {
    nameDe: 'Kniebeuge',
    descriptionDe:
      'Füße schulterbreit, Zehen leicht nach außen. Hüfte zurück und Knie beugen, bis Oberschenkel waagerecht. Knie über den Zehen, Rücken gerade. Dann aufstehen.',
    bodyRegion: 'Knie',
    muscleGroups: ['Quadrizeps', 'Gluteus maximus', 'Ischiokrurale Muskulatur'],
    difficulty: 2,
    defaultSets: 3,
    defaultReps: 12,
    defaultHoldSeconds: null,
  },
  {
    nameDe: 'Step-Up',
    descriptionDe:
      'Stelle einen Fuß auf eine Stufe oder ein Step-Board. Drücke dich hoch, bis das Bein gestreckt ist, dann das andere Bein nachziehen. Kontrolliert wieder heruntersteigen.',
    bodyRegion: 'Knie',
    muscleGroups: ['Quadrizeps', 'Gluteus maximus', 'Wadenmuskulatur'],
    difficulty: 2,
    defaultSets: 3,
    defaultReps: 10,
    defaultHoldSeconds: null,
  },
  {
    nameDe: 'Oberschenkelrückseite dehnen (Hamstring-Stretch)',
    descriptionDe:
      'Im Rückenliegen ein Bein gestreckt anheben, Hände hinter dem Oberschenkel. Dehne die Rückseite des Oberschenkels, Knie möglichst gestreckt. Gleichmäßig atmen.',
    bodyRegion: 'Knie',
    muscleGroups: ['Ischiokrurale Muskulatur'],
    difficulty: 1,
    defaultSets: 2,
    defaultReps: 1,
    defaultHoldSeconds: 30,
  },
  {
    nameDe: 'Oberschenkelvorderseite dehnen',
    descriptionDe:
      'Im Stand an einer Wand abstützen. Knie anwinkeln und Fuß mit einer Hand zum Gesäß ziehen. Knie bleiben nebeneinander, aufrechte Haltung. Dehnung an der Oberschenkelvorderseite spüren.',
    bodyRegion: 'Knie',
    muscleGroups: ['Quadrizeps', 'Rectus femoris'],
    difficulty: 1,
    defaultSets: 2,
    defaultReps: 1,
    defaultHoldSeconds: 30,
  },

  // ── SCHULTER ────────────────────────────────────────────────────────────────
  {
    nameDe: 'Theraband Außenrotation',
    descriptionDe:
      'Sitze oder stehe, Ellenbogen 90° angewinkelt am Körper. Theraband in der Hand, Arm nach außen rotieren (Handrücken dreht nach außen). Langsam zurück in Ausgangsstellung.',
    bodyRegion: 'Schulter',
    muscleGroups: ['Infraspinatus', 'Teres minor', 'Rotatorenmanschette'],
    difficulty: 1,
    defaultSets: 3,
    defaultReps: 15,
    defaultHoldSeconds: null,
  },
  {
    nameDe: 'Theraband Innenrotation',
    descriptionDe:
      'Ellenbogen 90° angewinkelt, Theraband seitlich fixiert. Arm zur Körpermitte rotieren (Handfläche dreht nach innen). Kontrollierte Bewegung, nicht schwingen.',
    bodyRegion: 'Schulter',
    muscleGroups: ['Subscapularis', 'Rotatorenmanschette'],
    difficulty: 1,
    defaultSets: 3,
    defaultReps: 15,
    defaultHoldSeconds: null,
  },
  {
    nameDe: 'Schulterblatt-Retraktion',
    descriptionDe:
      'Sitze aufrecht oder stehe. Schulterblätter aktiv zusammenziehen, als würdest du einen Stift zwischen ihnen halten. 5 Sekunden halten, dann lösen.',
    bodyRegion: 'Schulter',
    muscleGroups: ['Rhomboidei', 'Mittlerer Trapezius'],
    difficulty: 1,
    defaultSets: 3,
    defaultReps: 12,
    defaultHoldSeconds: 5,
  },
  {
    nameDe: 'Pendeln (Codman-Pendel)',
    descriptionDe:
      'Leicht nach vorne beugen, betroffenen Arm locker herunterhängen lassen. Kleine kreisende Bewegungen aus der Schulter, ohne aktiven Muskeleinsatz — Schwerkraft arbeitet für dich.',
    bodyRegion: 'Schulter',
    muscleGroups: ['Schultergelenkkapsel', 'Rotatorenmanschette'],
    difficulty: 1,
    defaultSets: 2,
    defaultReps: 10,
    defaultHoldSeconds: null,
  },
  {
    nameDe: 'Seitliches Anheben (Lateral Raise)',
    descriptionDe:
      'Im Stand, Arme seitlich am Körper. Arme bis auf Schulterhöhe seitlich anheben, Ellenbogen leicht gebeugt. Langsam senken.',
    bodyRegion: 'Schulter',
    muscleGroups: ['Deltoideus (medial)', 'Supraspinatus'],
    difficulty: 2,
    defaultSets: 3,
    defaultReps: 12,
    defaultHoldSeconds: null,
  },
  {
    nameDe: 'Wand-Kriechgang',
    descriptionDe:
      'Stehe vor einer Wand. Finger auf Schulterhöhe gegen die Wand setzen und langsam nach oben kriechen, so weit es schmerzfrei geht. Dann wieder herunter.',
    bodyRegion: 'Schulter',
    muscleGroups: ['Deltoideus', 'Rotatorenmanschette', 'Schultergelenkkapsel'],
    difficulty: 1,
    defaultSets: 2,
    defaultReps: 10,
    defaultHoldSeconds: null,
  },
  {
    nameDe: 'Brustmuskeldehnung (Türrahmen-Stretch)',
    descriptionDe:
      'Im Türrahmen stehen, Unterarm senkrecht am Rahmen. Körper leicht nach vorne drehen, bis Dehnung in Brust und Schulter vorne spürbar ist.',
    bodyRegion: 'Schulter',
    muscleGroups: ['Pectoralis major', 'Vorderer Deltoideus'],
    difficulty: 1,
    defaultSets: 2,
    defaultReps: 1,
    defaultHoldSeconds: 30,
  },

  // ── HÜFTE ───────────────────────────────────────────────────────────────────
  {
    nameDe: 'Clamshell',
    descriptionDe:
      'Seitlage, Knie angewinkelt übereinander gelegt. Oberes Knie wie eine Muschel öffnen, ohne das Becken zu drehen. Langsam senken.',
    bodyRegion: 'Hüfte',
    muscleGroups: ['Gluteus medius', 'Gluteus minimus'],
    difficulty: 1,
    defaultSets: 3,
    defaultReps: 15,
    defaultHoldSeconds: null,
  },
  {
    nameDe: 'Seitliches Beinanheben',
    descriptionDe:
      'Seitlage, Beine gestreckt. Oberes Bein geradlinig zur Decke anheben (ca. 30–40°), kurz halten, kontrolliert senken. Becken stabil halten.',
    bodyRegion: 'Hüfte',
    muscleGroups: ['Gluteus medius', 'Tensor fasciae latae'],
    difficulty: 1,
    defaultSets: 3,
    defaultReps: 15,
    defaultHoldSeconds: 2,
  },
  {
    nameDe: 'Hüftextension im Stand',
    descriptionDe:
      'Im Stand an einer Wand abstützen. Bein gestreckt nach hinten anheben, ohne den Rücken zu hohlkreuzen. Gluteus kontrolliert anspannen. Langsam senken.',
    bodyRegion: 'Hüfte',
    muscleGroups: ['Gluteus maximus', 'Ischiokrurale Muskulatur'],
    difficulty: 1,
    defaultSets: 3,
    defaultReps: 12,
    defaultHoldSeconds: null,
  },
  {
    nameDe: 'Piriformis-Dehnung',
    descriptionDe:
      'Im Rückenliegen. Linkes Knie anwinkeln, rechten Knöchel auf den linken Oberschenkel legen. Linkes Knie sanft zur Brust ziehen, bis Dehnung im Gesäß rechts spürbar ist.',
    bodyRegion: 'Hüfte',
    muscleGroups: ['Piriformis', 'Außenrotatoren der Hüfte'],
    difficulty: 1,
    defaultSets: 2,
    defaultReps: 1,
    defaultHoldSeconds: 30,
  },
  {
    nameDe: 'IT-Band-Dehnung',
    descriptionDe:
      'Im Stand das rechte Bein hinter dem linken kreuzen. Hüfte nach rechts schieben, bis Dehnung an der Außenseite des rechten Oberschenkels spürbar ist.',
    bodyRegion: 'Hüfte',
    muscleGroups: ['Tractus iliotibialis', 'Tensor fasciae latae'],
    difficulty: 1,
    defaultSets: 2,
    defaultReps: 1,
    defaultHoldSeconds: 30,
  },

  // ── HWS / NACKEN ────────────────────────────────────────────────────────────
  {
    nameDe: 'Kinneinzug (Chin Tuck)',
    descriptionDe:
      'Sitze aufrecht. Kinn gerade nach hinten schieben (kein Nicken), als würdest du ein Doppelkinn machen. Kurz halten, dann lösen. Halswirbelsäule lang halten.',
    bodyRegion: 'HWS',
    muscleGroups: ['Tiefe Halsflexoren', 'Subokzipitale Muskulatur'],
    difficulty: 1,
    defaultSets: 3,
    defaultReps: 10,
    defaultHoldSeconds: 5,
  },
  {
    nameDe: 'HWS-Seitwärtsneigung',
    descriptionDe:
      'Sitze aufrecht, Schultern entspannt. Kopf langsam zur Seite neigen (Ohr zur Schulter), ohne die Schulter anzuheben. Dehnung auf der gegenüberliegenden Seite spüren.',
    bodyRegion: 'HWS',
    muscleGroups: ['Sternocleidomastoideus', 'Skaleni', 'Oberer Trapezius'],
    difficulty: 1,
    defaultSets: 2,
    defaultReps: 1,
    defaultHoldSeconds: 20,
  },
  {
    nameDe: 'HWS-Rotation',
    descriptionDe:
      'Sitze aufrecht. Kopf langsam nach rechts drehen, bis Dehnung spürbar (nicht über die Schmerzgrenze). 5 Sekunden halten, dann zur anderen Seite.',
    bodyRegion: 'HWS',
    muscleGroups: ['Sternocleidomastoideus', 'Subokzipitale Muskulatur'],
    difficulty: 1,
    defaultSets: 2,
    defaultReps: 5,
    defaultHoldSeconds: 5,
  },
  {
    nameDe: 'Schulterheben und -senken',
    descriptionDe:
      'Schultern langsam maximal nach oben ziehen (3 Sekunden), dann rasch fallen lassen und völlig entspannen. Spüre den Unterschied zwischen Anspannung und Entspannung.',
    bodyRegion: 'HWS',
    muscleGroups: ['Oberer Trapezius', 'Levator scapulae'],
    difficulty: 1,
    defaultSets: 3,
    defaultReps: 10,
    defaultHoldSeconds: 3,
  },
  {
    nameDe: 'Oberer Trapezius Dehnung',
    descriptionDe:
      'Sitze aufrecht, linke Hand hinter dem Rücken. Rechte Hand sanft auf den Kopf, Kopf langsam nach rechts und leicht nach vorne neigen. Dehnung links im Nacken spüren.',
    bodyRegion: 'HWS',
    muscleGroups: ['Oberer Trapezius', 'Levator scapulae'],
    difficulty: 1,
    defaultSets: 2,
    defaultReps: 1,
    defaultHoldSeconds: 30,
  },

  // ── SPRUNGGELENK / FUSS ─────────────────────────────────────────────────────
  {
    nameDe: 'Fersenstand (Calf Raise)',
    descriptionDe:
      'Im Stand, Füße hüftbreit. Auf die Zehenspitzen heben, Waden anspannen. Kurz oben halten, dann kontrolliert absenken. Optional an einer Wand abstützen.',
    bodyRegion: 'Sprunggelenk',
    muscleGroups: ['Gastrocnemius', 'Soleus'],
    difficulty: 1,
    defaultSets: 3,
    defaultReps: 15,
    defaultHoldSeconds: 2,
  },
  {
    nameDe: 'Sprunggelenk-Kreisen',
    descriptionDe:
      'Sitze oder liege. Hebe einen Fuß an und kreise das Sprunggelenk langsam in beide Richtungen. Bewegung kommt nur aus dem Gelenk, nicht aus dem Knie.',
    bodyRegion: 'Sprunggelenk',
    muscleGroups: ['Sprunggelenkskapsel', 'Peronealmuskeln', 'Tibialis anterior'],
    difficulty: 1,
    defaultSets: 2,
    defaultReps: 10,
    defaultHoldSeconds: null,
  },
  {
    nameDe: 'Zehenheben (Toe Raise)',
    descriptionDe:
      'Im Stand, Fersen am Boden. Zehen und Fußballen anheben, so weit wie möglich. Kurz halten, kontrolliert absetzen.',
    bodyRegion: 'Sprunggelenk',
    muscleGroups: ['Tibialis anterior'],
    difficulty: 1,
    defaultSets: 3,
    defaultReps: 15,
    defaultHoldSeconds: null,
  },
  {
    nameDe: 'Wadendehnung (stehend)',
    descriptionDe:
      'An einer Wand abstützen. Ein Bein nach hinten stellen, Ferse am Boden. Körper zur Wand lehnen, bis Dehnung in der Wade spürbar. Knie gestreckt halten.',
    bodyRegion: 'Sprunggelenk',
    muscleGroups: ['Gastrocnemius'],
    difficulty: 1,
    defaultSets: 2,
    defaultReps: 1,
    defaultHoldSeconds: 30,
  },
  {
    nameDe: 'Einbeinstand',
    descriptionDe:
      'Im Stand auf einem Bein balancieren. Blick auf einen festen Punkt. Optional: Augen schließen für mehr Herausforderung. Stabiles Standbein, Hüfte gerade.',
    bodyRegion: 'Sprunggelenk',
    muscleGroups: ['Peronealmuskeln', 'Tibialis anterior', 'Wadenmuskulatur', 'Fußsohlenmuskeln'],
    difficulty: 2,
    defaultSets: 3,
    defaultReps: 1,
    defaultHoldSeconds: 30,
  },

  // ── GANZKÖRPER / CARDIO ─────────────────────────────────────────────────────
  {
    nameDe: 'Liegestütze',
    descriptionDe:
      'Strecke dich in Bauchlage aus, Hände schulterbreit neben der Brust. Körper gerade wie ein Brett. Senke die Brust kontrolliert zum Boden, Ellbogen nah am Körper. Drücke dich vollständig hoch. Bauch bleibt die ganze Zeit aktiv.',
    bodyRegion: 'Ganzkörper',
    muscleGroups: ['Pectoralis major', 'Triceps brachii', 'Deltoideus (anterior)', 'Rumpfstabilisatoren'],
    difficulty: 2,
    defaultSets: 3,
    defaultReps: 10,
    defaultHoldSeconds: null,
  },
  {
    nameDe: 'Joggen',
    descriptionDe:
      'Laufe in einem gleichmäßigen, angenehmen Tempo. Aufrechte Haltung, Blick nach vorne. Arme locker im 90°-Winkel mitschwingen. Weiche Landung mit Mittelfuß, nicht auf der Ferse aufstampfen. Gleichmäßig atmen.',
    bodyRegion: 'Ganzkörper',
    muscleGroups: ['Quadrizeps', 'Ischiokrurale Muskulatur', 'Wadenmuskulatur', 'Gluteus maximus', 'Herz-Kreislauf'],
    difficulty: 2,
    defaultSets: 1,
    defaultReps: 1,
    defaultHoldSeconds: 600,
  },

  // ── CORE ────────────────────────────────────────────────────────────────────
  {
    nameDe: 'Planke',
    descriptionDe:
      'Unterarmstütz, Körper bildet eine gerade Linie von Kopf bis Ferse. Bauch aktiv anspannen, Po nicht zu hoch oder zu tief. Gleichmäßig atmen.',
    bodyRegion: 'Core',
    muscleGroups: ['Transversus abdominis', 'Rectus abdominis', 'Rumpfstabilisatoren'],
    difficulty: 2,
    defaultSets: 3,
    defaultReps: 1,
    defaultHoldSeconds: 20,
  },
  {
    nameDe: 'Seitstütz',
    descriptionDe:
      'Seitlage, Unterarm am Boden. Hüfte anheben, bis Körper eine gerade Linie bildet. Hüfte nicht absacken lassen. Gleichmäßig atmen.',
    bodyRegion: 'Core',
    muscleGroups: ['Obliquus externus', 'Obliquus internus', 'Quadratus lumborum'],
    difficulty: 2,
    defaultSets: 3,
    defaultReps: 1,
    defaultHoldSeconds: 20,
  },
  {
    nameDe: 'Dead Bug',
    descriptionDe:
      'Rückenliege, Arme senkrecht zur Decke, Knie 90° angewinkelt. Gleichzeitig rechten Arm und linkes Bein Richtung Boden strecken (ohne Boden zu berühren). Rücken bleibt flach. Seite wechseln.',
    bodyRegion: 'Core',
    muscleGroups: ['Transversus abdominis', 'Multifidus', 'Hüftbeuger'],
    difficulty: 2,
    defaultSets: 3,
    defaultReps: 8,
    defaultHoldSeconds: null,
  },
  {
    nameDe: 'Beckenbodenkontrolle',
    descriptionDe:
      'Sitze oder liege entspannt. Spanne die Beckenbodenmuskulatur an (wie wenn du den Urinstrahl anhältst). 5 Sekunden halten, dann vollständig lösen. Bauch und Gesäß entspannt lassen.',
    bodyRegion: 'Core',
    muscleGroups: ['Beckenboden', 'Transversus abdominis'],
    difficulty: 1,
    defaultSets: 3,
    defaultReps: 10,
    defaultHoldSeconds: 5,
  },
];

async function seed() {
  console.log('Seeding exercise library…');

  // Idempotent: bestehende Übungen löschen und neu anlegen.
  // Nur safe, weil Exercise keine User-Daten enthält.
  await prisma.programExercise.deleteMany();
  await prisma.sessionLog.deleteMany();
  await prisma.exercise.deleteMany();

  await prisma.exercise.createMany({ data: exercises });

  const count = await prisma.exercise.count();
  console.log(`✓ ${count} Übungen angelegt.`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
