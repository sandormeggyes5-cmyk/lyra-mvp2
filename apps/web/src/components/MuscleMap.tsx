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

// Stilisierte, geometrisch einfache Körper-Silhouette mit klickbaren/
// hervorhebbaren Zonen — bewusst keine anatomisch exakten Muskelpfade
// (kein Medizinprodukt, siehe Plan). viewBox gemeinsam für beide Ansichten.
const VIEW_BOX = '0 0 200 400';

type RegionShape =
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { kind: 'rect'; x: number; y: number; width: number; height: number; rx: number };

const REGION_SHAPES: Record<RegionId, RegionShape> = {
  'front-neck': { kind: 'ellipse', cx: 100, cy: 58, rx: 14, ry: 10 },
  'front-shoulder': { kind: 'ellipse', cx: 60, cy: 85, rx: 18, ry: 14 },
  'front-chest': { kind: 'ellipse', cx: 100, cy: 110, rx: 32, ry: 22 },
  'front-abs': { kind: 'rect', x: 75, y: 134, width: 50, height: 44, rx: 10 },
  'front-hipflexor': { kind: 'ellipse', cx: 100, cy: 190, rx: 36, ry: 13 },
  'front-quad': { kind: 'ellipse', cx: 70, cy: 232, rx: 18, ry: 42 },
  'front-adductor': { kind: 'ellipse', cx: 100, cy: 235, rx: 11, ry: 38 },
  'front-shin': { kind: 'ellipse', cx: 72, cy: 305, rx: 12, ry: 36 },
  'front-foot': { kind: 'ellipse', cx: 72, cy: 352, rx: 15, ry: 10 },
  'back-neck': { kind: 'ellipse', cx: 100, cy: 58, rx: 14, ry: 10 },
  'back-trapezius': { kind: 'ellipse', cx: 100, cy: 85, rx: 30, ry: 18 },
  'back-shoulder': { kind: 'ellipse', cx: 50, cy: 92, rx: 15, ry: 13 },
  'back-triceps': { kind: 'ellipse', cx: 38, cy: 132, rx: 12, ry: 32 },
  'back-upperback': { kind: 'rect', x: 72, y: 108, width: 56, height: 76, rx: 14 },
  'back-glutes': { kind: 'ellipse', cx: 100, cy: 202, rx: 38, ry: 22 },
  'back-hamstring': { kind: 'ellipse', cx: 72, cy: 252, rx: 18, ry: 38 },
  'back-calf': { kind: 'ellipse', cx: 72, cy: 322, rx: 14, ry: 32 },
};

// Spiegelbild der linken Körperhälfte für die rechte Seite (Schultern,
// Oberarme, Oberschenkel, Unterschenkel, Füße kommen paarweise vor).
const MIRRORED_X: Partial<Record<RegionId, number>> = {
  'front-shoulder': 140,
  'front-quad': 130,
  'front-shin': 128,
  'front-foot': 128,
  'back-shoulder': 150,
  'back-triceps': 162,
  'back-hamstring': 128,
  'back-calf': 128,
};

function renderShape(shape: RegionShape, cxOverride: number | undefined, props: React.SVGAttributes<SVGElement>) {
  if (shape.kind === 'ellipse') {
    return <ellipse cx={cxOverride ?? shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} {...props} />;
  }
  const dx = cxOverride !== undefined ? cxOverride - shape.x - shape.width / 2 : 0;
  return <rect x={shape.x + dx} y={shape.y} width={shape.width} height={shape.height} rx={shape.rx} {...props} />;
}

function BodySilhouette({ view }: { view: MuscleMapView }) {
  return (
    <g aria-hidden="true">
      <circle cx={100} cy={30} r={20} className="fill-neutral-100 stroke-neutral-300" strokeWidth={1.5} />
      <rect x={62} y={66} width={76} height={128} rx={24} className="fill-neutral-100 stroke-neutral-300" strokeWidth={1.5} />
      <rect x={50} y={190} width={24} height={110} rx={12} className="fill-neutral-100 stroke-neutral-300" strokeWidth={1.5} />
      <rect x={126} y={190} width={24} height={110} rx={12} className="fill-neutral-100 stroke-neutral-300" strokeWidth={1.5} />
      {view === 'back' && (
        <>
          <rect x={30} y={100} width={18} height={70} rx={9} className="fill-neutral-100 stroke-neutral-300" strokeWidth={1.5} />
          <rect x={152} y={100} width={18} height={70} rx={9} className="fill-neutral-100 stroke-neutral-300" strokeWidth={1.5} />
        </>
      )}
    </g>
  );
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
        <BodySilhouette view={view} />
        {regionsForView.map((id) => {
          const shape = REGION_SHAPES[id];
          const isActive = highlighted.has(id);
          const label = MUSCLE_REGIONS[id].labelDe;
          const isSecondarySide = id in MIRRORED_X;
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
              {renderShape(shape, undefined, common)}
              {isActive && shape.kind === 'ellipse' && (
                <circle cx={shape.cx} cy={shape.cy} r={3} className="fill-white" aria-hidden="true" />
              )}
              {isSecondarySide && renderShape(shape, MIRRORED_X[id], { ...common, 'aria-label': `${label} (rechts)${isActive ? ' (ausgewählt)' : ''}` })}
              {isSecondarySide && isActive && shape.kind === 'ellipse' && (
                <circle cx={MIRRORED_X[id]} cy={shape.cy} r={3} className="fill-white" aria-hidden="true" />
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
