import { useState } from 'react';
import { MUSCLE_REGIONS, regionsForMuscles, UNMAPPED_MUSCLES, type RegionId, type MuscleMapView } from '../lib/muscleRegions.ts';

interface Props {
  mode: 'interactive' | 'display';
  // display: rohe muscleGroups-Werte der aktuellen Übung. Alle werden
  // gleich stark hervorgehoben — die Daten haben kein primär/sekundär-Split.
  muscles?: string[];
  // interactive: ausgewählte Region (kontrolliert vom Elternteil)
  activeRegion?: RegionId | null;
  onRegionSelect?: (region: RegionId | null) => void;
  className?: string;
}

// Stilisierte, proportionale Körper-Silhouette mit klickbaren/hervorhebbaren
// Zonen — bewusst keine anatomisch exakten Muskelpfade (kein Medizinprodukt,
// siehe Plan), aber eckige, auf Körperproportionen abgestimmte Polygone statt
// Ellipsen/stark gerundeter Formen. viewBox gemeinsam für beide Ansichten.
// Die Silhouette (Kopf/Rumpf/Arme/Beine/Füße) ist für vorne/hinten identisch
// — nur die klickbaren Regionen unterscheiden sich pro Ansicht.
const VIEW_BOX = '0 0 200 400';
const MIRROR_AXIS = 100;

type Point = [number, number];

type RegionShape =
  | { kind: 'polygon'; points: Point[] }
  | { kind: 'rect'; x: number; y: number; width: number; height: number; rx: number };

// Linke/zentrale Form je Region. Für paarige Regionen (siehe PAIRED_REGIONS)
// wird die rechte Seite durch Spiegelung an MIRROR_AXIS erzeugt, nicht
// doppelt erfasst.
const REGION_SHAPES: Record<RegionId, RegionShape> = {
  'front-neck': { kind: 'rect', x: 86, y: 42, width: 28, height: 12, rx: 2 },
  'front-shoulder': { kind: 'rect', x: 46, y: 56, width: 22, height: 18, rx: 2 },
  'front-chest': { kind: 'polygon', points: [[68, 66], [132, 66], [124, 108], [76, 108]] },
  'front-abs': { kind: 'rect', x: 78, y: 110, width: 44, height: 50, rx: 3 },
  'front-hipflexor': { kind: 'rect', x: 66, y: 162, width: 68, height: 18, rx: 3 },
  'front-quad': { kind: 'polygon', points: [[66, 184], [92, 184], [88, 296], [70, 296]] },
  'front-adductor': { kind: 'polygon', points: [[92, 190], [108, 190], [104, 286], [96, 286]] },
  'front-shin': { kind: 'polygon', points: [[68, 302], [88, 302], [84, 356], [70, 356]] },
  'front-foot': { kind: 'polygon', points: [[58, 360], [96, 360], [100, 376], [54, 376]] },
  'back-neck': { kind: 'rect', x: 86, y: 42, width: 28, height: 12, rx: 2 },
  'back-trapezius': { kind: 'polygon', points: [[62, 54], [138, 54], [122, 104], [78, 104]] },
  'back-shoulder': { kind: 'rect', x: 44, y: 58, width: 20, height: 16, rx: 2 },
  'back-triceps': { kind: 'polygon', points: [[34, 68], [55, 68], [50, 168], [28, 168]] },
  'back-upperback': { kind: 'rect', x: 74, y: 106, width: 52, height: 76, rx: 3 },
  'back-glutes': { kind: 'rect', x: 66, y: 182, width: 68, height: 34, rx: 4 },
  'back-hamstring': { kind: 'polygon', points: [[64, 218], [96, 218], [92, 300], [68, 300]] },
  'back-calf': { kind: 'polygon', points: [[68, 302], [92, 302], [86, 356], [72, 356]] },
};

// Regionen, die paarweise links/rechts vorkommen (Spiegelung an MIRROR_AXIS).
// Alle übrigen Regionen sind zentrale Einzelformen (z.B. Bauch, Rücken, Gesäß).
const PAIRED_REGIONS = new Set<RegionId>([
  'front-shoulder', 'front-quad', 'front-shin', 'front-foot',
  'back-shoulder', 'back-triceps', 'back-hamstring', 'back-calf',
]);

function mirrorX(x: number): number {
  return 2 * MIRROR_AXIS - x;
}

function mirrorShape(shape: RegionShape): RegionShape {
  if (shape.kind === 'polygon') {
    return { kind: 'polygon', points: shape.points.map(([x, y]) => [mirrorX(x), y]) };
  }
  return { ...shape, x: mirrorX(shape.x + shape.width) };
}

function shapeCenter(shape: RegionShape): Point {
  if (shape.kind === 'rect') return [shape.x + shape.width / 2, shape.y + shape.height / 2];
  const n = shape.points.length;
  const cx = shape.points.reduce((sum, [x]) => sum + x, 0) / n;
  const cy = shape.points.reduce((sum, [, y]) => sum + y, 0) / n;
  return [cx, cy];
}

function RegionElement({ shape, ...props }: { shape: RegionShape } & React.SVGAttributes<SVGElement>) {
  if (shape.kind === 'polygon') {
    return <polygon points={shape.points.map(([x, y]) => `${x},${y}`).join(' ')} {...props} />;
  }
  return <rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.rx} {...props} />;
}

// Dekorative, nicht anklickbare Grundsilhouette — identisch für Vorder- und
// Rückansicht. Eckige Polygone statt Ellipsen/stark gerundeter Formen, an
// groben menschlichen Proportionen ausgerichtet (Schultern breiter als
// Taille, Taille schmaler als Hüfte, verjüngte Gliedmaßen).
function BodySilhouette() {
  const silhouetteProps = { className: 'fill-neutral-100 stroke-neutral-300', strokeWidth: 1.5 };
  return (
    <g aria-hidden="true">
      <circle cx={100} cy={26} r={18} {...silhouetteProps} />
      <rect x={88} y={40} width={24} height={14} rx={2} {...silhouetteProps} />
      <polygon points="56,52 144,52 128,140 138,180 62,180 72,140" {...silhouetteProps} />
      <polygon points="54,58 34,66 26,170 22,256 40,256 46,170 56,70" {...silhouetteProps} />
      <polygon points={mirrorPolygonString('54,58 34,66 26,170 22,256 40,256 46,170 56,70')} {...silhouetteProps} />
      <polygon points="64,182 96,182 90,360 66,360" {...silhouetteProps} />
      <polygon points={mirrorPolygonString('64,182 96,182 90,360 66,360')} {...silhouetteProps} />
      <polygon points="58,360 96,360 100,378 54,378" {...silhouetteProps} />
      <polygon points={mirrorPolygonString('58,360 96,360 100,378 54,378')} {...silhouetteProps} />
    </g>
  );
}

function mirrorPolygonString(points: string): string {
  return points
    .split(' ')
    .map((pair) => {
      const [x, y] = pair.split(',').map(Number);
      return `${mirrorX(x)},${y}`;
    })
    .join(' ');
}

export function MuscleMap({ mode, muscles, activeRegion, onRegionSelect, className = '' }: Props) {
  const [view, setView] = useState<MuscleMapView>('front');

  const highlighted = new Set<RegionId>(mode === 'display' ? regionsForMuscles(muscles ?? []) : activeRegion ? [activeRegion] : []);
  const unmappedPresent = (muscles ?? []).filter((m) => (UNMAPPED_MUSCLES as readonly string[]).includes(m));

  const regionsForView = (Object.keys(MUSCLE_REGIONS) as RegionId[]).filter((id) => MUSCLE_REGIONS[id].view === view);

  function handleSelect(region: RegionId) {
    if (mode !== 'interactive' || !onRegionSelect) return;
    onRegionSelect(activeRegion === region ? null : region);
  }

  function handleKeyDown(e: React.KeyboardEvent, region: RegionId) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(region);
    }
  }

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex gap-1 self-start rounded-md bg-neutral-100 p-1">
        {(['front', 'back'] as MuscleMapView[]).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            aria-pressed={view === v}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
              view === v ? 'bg-white text-primary-700 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {v === 'front' ? 'Vorderseite' : 'Rückseite'}
          </button>
        ))}
      </div>

      <svg viewBox={VIEW_BOX} className="h-56 w-auto mx-auto" role="img" aria-label={`Körperkarte, ${view === 'front' ? 'Vorderseite' : 'Rückseite'}`}>
        <BodySilhouette />
        {regionsForView.map((id) => {
          const shape = REGION_SHAPES[id];
          const isActive = highlighted.has(id);
          const label = MUSCLE_REGIONS[id].labelDe;
          const isPaired = PAIRED_REGIONS.has(id);
          const [cx, cy] = shapeCenter(shape);

          const common = {
            className: `transition-colors ${
              isActive ? 'fill-primary-500 stroke-primary-700' : 'fill-neutral-200 stroke-neutral-300 hover:fill-neutral-300'
            } ${mode === 'interactive' ? 'cursor-pointer outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600' : ''}`,
            strokeWidth: isActive ? 2.5 : 1.5,
            tabIndex: mode === 'interactive' ? 0 : undefined,
            role: mode === 'interactive' ? 'button' : undefined,
            'aria-pressed': mode === 'interactive' ? isActive : undefined,
            'aria-label': `${label}${isActive ? ' (ausgewählt)' : ''}`,
            onClick: mode === 'interactive' ? () => handleSelect(id) : undefined,
            onKeyDown: mode === 'interactive' ? (e: React.KeyboardEvent) => handleKeyDown(e, id) : undefined,
          } as React.SVGAttributes<SVGElement>;

          return (
            <g key={id}>
              <RegionElement shape={shape} {...common} />
              {isActive && <circle cx={cx} cy={cy} r={3} className="fill-white" aria-hidden="true" />}
              {isPaired && (
                <>
                  <RegionElement
                    shape={mirrorShape(shape)}
                    {...common}
                    aria-label={`${label} (rechts)${isActive ? ' (ausgewählt)' : ''}`}
                  />
                  {isActive && <circle cx={mirrorX(cx)} cy={cy} r={3} className="fill-white" aria-hidden="true" />}
                </>
              )}
            </g>
          );
        })}
      </svg>

      {mode === 'interactive' && (
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-neutral-500">
            {activeRegion ? `Gefiltert: ${MUSCLE_REGIONS[activeRegion].labelDe}` : 'Keine Region ausgewählt'}
          </span>
          <button
            type="button"
            onClick={() => onRegionSelect?.(null)}
            disabled={!activeRegion}
            className="font-medium text-primary-700 underline disabled:text-neutral-300 disabled:no-underline"
          >
            Auswahl zurücksetzen
          </button>
        </div>
      )}

      {mode === 'display' && (muscles?.length ?? 0) > 0 && (
        <p className="text-xs text-neutral-600">
          Trainiert: {muscles!.join(', ')}
          {unmappedPresent.length > 0 && (
            <span className="text-neutral-400"> (auf der Karte nicht darstellbar: {unmappedPresent.join(', ')})</span>
          )}
        </p>
      )}
    </div>
  );
}
