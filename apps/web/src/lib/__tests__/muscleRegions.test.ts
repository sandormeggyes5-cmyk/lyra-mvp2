import { describe, it, expect } from 'vitest';
import {
  MUSCLE_TO_REGIONS,
  MUSCLE_REGIONS,
  UNMAPPED_MUSCLES,
  regionsForMuscle,
  regionsForMuscles,
  muscleGroupsMatchRegion,
} from '../muscleRegions.ts';

// Snapshot der 69 Rohbezeichnungen aus `SELECT DISTINCT unnest("muscleGroups")
// FROM "Exercise"` (Live-DB, 83 Übungen, Stand der Phase-0-Recherche). Jede
// davon muss entweder genau einer Region zugeordnet sein oder bewusst in
// UNMAPPED_MUSCLES stehen — keine darf komplett fehlen oder in beiden landen.
const RAW_MUSCLE_NAMES = [
  'Adduktoren', 'Atemhilfsmuskulatur', 'Außenrotatoren der Hüfte', 'Bauchmuskeln',
  'Beckenboden', 'Brustwirbelsäulen-Extensoren', 'Brustwirbelsäulen-Rotatoren',
  'Deltoideus', 'Deltoideus (anterior)', 'Deltoideus (medial)', 'Erector spinae',
  'Fußsohlenmuskeln', 'Gastrocnemius', 'Gluteus', 'Gluteus maximus', 'Gluteus medius',
  'Gluteus minimus', 'Herz-Kreislauf', 'Hüftabduktoren', 'Hüftadduktoren', 'Hüftbeuger',
  'Iliopsoas', 'Infraspinatus', 'Ischiokrurale Muskulatur', 'Latissimus dorsi',
  'Lendenwirbelsäule', 'Levator scapulae', 'Mittlerer Trapezius', 'Multifidus',
  'Nackenstrecker', 'Oberer Trapezius', 'Oblique', 'Obliquus externus', 'Obliquus internus',
  'Pectoralis major', 'Peronealmuskeln', 'Piriformis', 'Quadratus lumborum', 'Quadrizeps',
  'Rectus abdominis', 'Rectus femoris', 'Rhomboidei', 'Rotatorenmanschette',
  'Rotatorenmanschette des Rumpfes', 'Rückenstrecker', 'Rumpfstabilisatoren',
  'Schultergelenkkapsel', 'Serratus anterior', 'Skaleni', 'Soleus', 'Sprunggelenkskapsel',
  'Sternocleidomastoideus', 'Subokzipitale Muskulatur', 'Subscapularis', 'Supraspinatus',
  'Tensor fasciae latae', 'Teres minor', 'Tibialis anterior', 'Tibialis posterior',
  'Tiefe Halsflexoren', 'Tractus iliotibialis', 'Transversus abdominis', 'Trapezius',
  'Triceps brachii', 'Unterer Trapezius', 'Vastus medialis (VMO)', 'Vorderer Deltoideus',
  'Wadenmuskulatur', 'Zwerchfell',
] as const;

describe('muscleRegions — Vollständigkeit des Mappings', () => {
  it('hat genau 69 Rohbezeichnungen im Test-Snapshot (Live-DB-Stand)', () => {
    expect(RAW_MUSCLE_NAMES.length).toBe(69);
  });

  it.each(RAW_MUSCLE_NAMES)('"%s" ist entweder gemappt oder bewusst unmapped — nie beides, nie keins', (name) => {
    const mapped = name in MUSCLE_TO_REGIONS;
    const unmapped = (UNMAPPED_MUSCLES as readonly string[]).includes(name);
    expect(mapped || unmapped).toBe(true);
    expect(mapped && unmapped).toBe(false);
  });

  it('jede Region in MUSCLE_TO_REGIONS existiert in MUSCLE_REGIONS', () => {
    const validIds = new Set(Object.keys(MUSCLE_REGIONS));
    for (const regions of Object.values(MUSCLE_TO_REGIONS)) {
      for (const region of regions) {
        expect(validIds.has(region)).toBe(true);
      }
    }
  });

  it('jede Rohbezeichnung in MUSCLE_TO_REGIONS hat mindestens eine Region', () => {
    for (const regions of Object.values(MUSCLE_TO_REGIONS)) {
      expect(regions.length).toBeGreaterThan(0);
    }
  });

  it('hat 18 Regionen (9 vorne + 9 hinten) — front-hipflexor entfernt, front-obliques + back-lowerback neu', () => {
    const ids = Object.keys(MUSCLE_REGIONS);
    expect(ids).toHaveLength(18);
    expect(ids).not.toContain('front-hipflexor');
    expect(ids).toContain('front-obliques');
    expect(ids).toContain('back-lowerback');
  });
});

describe('regionsForMuscle / regionsForMuscles', () => {
  it('liefert die Region für eine bekannte Bezeichnung', () => {
    expect(regionsForMuscle('Quadrizeps')).toEqual(['front-quad']);
  });

  it('liefert ein leeres Array für eine unmapped/unbekannte Bezeichnung', () => {
    expect(regionsForMuscle('Zwerchfell')).toEqual([]);
    expect(regionsForMuscle('Komplett unbekannt')).toEqual([]);
  });

  it('"Rumpfstabilisatoren" ist bewusst drei Regionen zugeordnet (Bauch + oberer + unterer Rücken)', () => {
    expect(regionsForMuscle('Rumpfstabilisatoren')).toEqual(
      expect.arrayContaining(['front-abs', 'back-upperback', 'back-lowerback']),
    );
    expect(regionsForMuscle('Rumpfstabilisatoren')).toHaveLength(3);
  });

  it('regionsForMuscles dedupliziert über mehrere Muskeln hinweg', () => {
    const regions = regionsForMuscles(['Gluteus maximus', 'Piriformis', 'Ischiokrurale Muskulatur']);
    expect(regions).toContain('back-glutes');
    expect(regions).toContain('back-hamstring');
    expect(regions.filter((r) => r === 'back-glutes')).toHaveLength(1);
  });

  // ── Änderungen durch die feinere Asset-Granularität (MuscleMap v2) ──────

  it('Iliopsoas/Hüftbeuger sind jetzt front-quad zugeordnet (kein Hüftbeuger-Feld im Asset)', () => {
    expect(regionsForMuscle('Iliopsoas')).toEqual(['front-quad']);
    expect(regionsForMuscle('Hüftbeuger')).toEqual(['front-quad']);
  });

  it('Obliquus externus/internus und Oblique sind front-obliques, nicht mehr front-abs', () => {
    expect(regionsForMuscle('Obliquus externus')).toEqual(['front-obliques']);
    expect(regionsForMuscle('Obliquus internus')).toEqual(['front-obliques']);
    expect(regionsForMuscle('Oblique')).toEqual(['front-obliques']);
  });

  it('Quadratus lumborum/Lendenwirbelsäule sind back-lowerback, nicht mehr back-upperback', () => {
    expect(regionsForMuscle('Quadratus lumborum')).toEqual(['back-lowerback']);
    expect(regionsForMuscle('Lendenwirbelsäule')).toEqual(['back-lowerback']);
  });

  it('Erector spinae/Rückenstrecker/Multifidus spannen beide Rücken-Regionen', () => {
    for (const muscle of ['Erector spinae', 'Rückenstrecker', 'Multifidus']) {
      expect(regionsForMuscle(muscle)).toEqual(
        expect.arrayContaining(['back-upperback', 'back-lowerback']),
      );
      expect(regionsForMuscle(muscle)).toHaveLength(2);
    }
  });
});

describe('muscleGroupsMatchRegion — Filterlogik des Programm-Builders', () => {
  it('trifft zu, wenn mindestens ein Muskel der Übung zur Region gehört', () => {
    expect(muscleGroupsMatchRegion(['Gluteus maximus', 'Ischiokrurale Muskulatur'], 'back-glutes')).toBe(true);
  });

  it('trifft nicht zu, wenn kein Muskel der Übung zur Region gehört', () => {
    expect(muscleGroupsMatchRegion(['Pectoralis major'], 'back-glutes')).toBe(false);
  });

  it('trifft nicht zu für ein leeres muscleGroups-Array', () => {
    expect(muscleGroupsMatchRegion([], 'front-quad')).toBe(false);
  });
});
