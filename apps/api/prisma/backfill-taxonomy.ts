import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Einmaliges Backfill vor Migration B (exerciseType/position → NOT NULL) ──
// Ordnet den 43 bestehenden Übungen (Platzhaltertexte, siehe seed.ts) eine
// Taxonomie zu und markiert sie zusammen mit den 129 ExerciseAdaptations
// explizit als unvalidiert (sourceNote dokumentiert die Herkunft).
//
// Zwei bewusste Vereinfachungen, weil die Taxonomie sie nicht sauber abbildet:
// - 'Joggen' ist eigentlich Ausdauer/Cardio, was exerciseType nicht kennt →
//   pragmatisch als 'Kräftigung' getaggt.
// - 'Planke' (Unterarmstütz) ist weder klassische Bauch- noch Rückenlage →
//   als 'Bauchlage' genähert.

type Taxonomy = { exerciseType: string; position: string };

const taxonomy: Record<string, Taxonomy> = {
  'Brücke': { exerciseType: 'Kräftigung', position: 'Rückenlage' },
  'Vierfüßlerstand – Arm-/Beinstreckung (Bird-Dog)': { exerciseType: 'Stabilisation', position: 'Vierfüßler' },
  'Katze-Kuh (Mobilisation LWS)': { exerciseType: 'Mobilisation', position: 'Vierfüßler' },
  'McKenzie-Extension (Prone Press-Up)': { exerciseType: 'Mobilisation', position: 'Bauchlage' },
  'Knie zur Brust': { exerciseType: 'Dehnung', position: 'Rückenlage' },
  'Rumpfrotation im Liegen': { exerciseType: 'Dehnung', position: 'Rückenlage' },
  'Hüftbeuger-Dehnung (Kniender Ausfallschritt)': { exerciseType: 'Dehnung', position: 'Stand' },
  'Wandsitz': { exerciseType: 'Kräftigung', position: 'Stand' },
  'Mini-Squat': { exerciseType: 'Kräftigung', position: 'Stand' },
  'Terminale Knieextension (TKE)': { exerciseType: 'Kräftigung', position: 'Stand' },
  'Gestrecktes Beinanheben (Straight Leg Raise)': { exerciseType: 'Kräftigung', position: 'Rückenlage' },
  'Kniebeuge': { exerciseType: 'Kräftigung', position: 'Stand' },
  'Step-Up': { exerciseType: 'Kräftigung', position: 'Stand' },
  'Oberschenkelrückseite dehnen (Hamstring-Stretch)': { exerciseType: 'Dehnung', position: 'Rückenlage' },
  'Oberschenkelvorderseite dehnen': { exerciseType: 'Dehnung', position: 'Stand' },
  'Theraband Außenrotation': { exerciseType: 'Kräftigung', position: 'Sitz' },
  'Theraband Innenrotation': { exerciseType: 'Kräftigung', position: 'Sitz' },
  'Schulterblatt-Retraktion': { exerciseType: 'Kräftigung', position: 'Sitz' },
  'Pendeln (Codman-Pendel)': { exerciseType: 'Mobilisation', position: 'Stand' },
  'Seitliches Anheben (Lateral Raise)': { exerciseType: 'Kräftigung', position: 'Stand' },
  'Wand-Kriechgang': { exerciseType: 'Mobilisation', position: 'Stand' },
  'Brustmuskeldehnung (Türrahmen-Stretch)': { exerciseType: 'Dehnung', position: 'Stand' },
  'Clamshell': { exerciseType: 'Kräftigung', position: 'Seitlage' },
  'Seitliches Beinanheben': { exerciseType: 'Kräftigung', position: 'Seitlage' },
  'Hüftextension im Stand': { exerciseType: 'Kräftigung', position: 'Stand' },
  'Piriformis-Dehnung': { exerciseType: 'Dehnung', position: 'Rückenlage' },
  'IT-Band-Dehnung': { exerciseType: 'Dehnung', position: 'Stand' },
  'Kinneinzug (Chin Tuck)': { exerciseType: 'Kräftigung', position: 'Sitz' },
  'HWS-Seitwärtsneigung': { exerciseType: 'Dehnung', position: 'Sitz' },
  'HWS-Rotation': { exerciseType: 'Mobilisation', position: 'Sitz' },
  'Schulterheben und -senken': { exerciseType: 'Mobilisation', position: 'Sitz' },
  'Oberer Trapezius Dehnung': { exerciseType: 'Dehnung', position: 'Sitz' },
  'Fersenstand (Calf Raise)': { exerciseType: 'Kräftigung', position: 'Stand' },
  'Sprunggelenk-Kreisen': { exerciseType: 'Mobilisation', position: 'Sitz' },
  'Zehenheben (Toe Raise)': { exerciseType: 'Kräftigung', position: 'Stand' },
  'Wadendehnung (stehend)': { exerciseType: 'Dehnung', position: 'Stand' },
  'Einbeinstand': { exerciseType: 'Koordination', position: 'Stand' },
  'Liegestütze': { exerciseType: 'Kräftigung', position: 'Bauchlage' },
  'Joggen': { exerciseType: 'Kräftigung', position: 'Stand' }, // siehe Hinweis oben
  'Planke': { exerciseType: 'Stabilisation', position: 'Bauchlage' }, // siehe Hinweis oben
  'Seitstütz': { exerciseType: 'Stabilisation', position: 'Seitlage' },
  'Dead Bug': { exerciseType: 'Stabilisation', position: 'Rückenlage' },
  'Beckenbodenkontrolle': { exerciseType: 'Stabilisation', position: 'Sitz' },
};

const SOURCE_NOTE = 'Bestandsdaten vor Validierungs-Tracking';

async function backfill() {
  console.log('Backfill Taxonomie + Validierungsstatus für bestehende Übungen…');

  let updated = 0;
  for (const [nameDe, { exerciseType, position }] of Object.entries(taxonomy)) {
    const result = await prisma.exercise.updateMany({
      where: { nameDe },
      data: { exerciseType, position, isValidated: false, sourceNote: SOURCE_NOTE },
    });
    updated += result.count;
  }
  console.log(`✓ ${updated} Übungen mit Taxonomie versehen.`);

  const missing = await prisma.exercise.count({ where: { exerciseType: null } });
  if (missing > 0) {
    throw new Error(
      `${missing} Übung(en) haben nach dem Backfill kein exerciseType — Taxonomie-Tabelle unvollständig.`,
    );
  }

  const adaptations = await prisma.exerciseAdaptation.updateMany({
    data: { isValidated: false, sourceNote: SOURCE_NOTE },
  });
  console.log(`✓ ${adaptations.count} Anpassungen als unvalidiert markiert.`);
}

backfill()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
