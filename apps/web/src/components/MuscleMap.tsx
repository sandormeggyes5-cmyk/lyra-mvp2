import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MUSCLE_REGIONS, regionsForMuscles, UNMAPPED_MUSCLES, type RegionId, type MuscleMapView } from '../lib/muscleRegions.ts';
import { BODY_OUTLINE_PATH, BODY_OUTLINE_VIEWBOX, type MuscleMapGender } from '../assets/musclemap/bodyOutlines.ts';
import { muscleFront } from '../assets/musclemap/muscleFront.ts';
import { muscleBack } from '../assets/musclemap/muscleBack.ts';
import { muscleFrontFemale } from '../assets/musclemap/muscleFrontFemale.ts';
import { muscleBackFemale } from '../assets/musclemap/muscleBackFemale.ts';
import type { MusclePathData } from '../assets/musclemap/types.ts';

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

// Welcher Asset-Slug (aus den übernommenen react-native-body-highlighter-
// Pfaddaten, siehe THIRD_PARTY_LICENSES.md) zu welcher Region gehört. Die
// Zuordnung von Rohmuskel → RegionId bleibt in muscleRegions.ts — hier nur
// RegionId → Asset-Slug für die Darstellung.
const REGION_SLUGS: Record<RegionId, string> = {
  'front-neck': 'neck',
  'front-shoulder': 'deltoids',
  'front-chest': 'chest',
  'front-abs': 'abs',
  'front-obliques': 'obliques',
  'front-quad': 'quadriceps',
  'front-adductor': 'adductors',
  'front-shin': 'tibialis',
  'front-foot': 'feet',
  'back-neck': 'neck',
  'back-trapezius': 'trapezius',
  'back-shoulder': 'deltoids',
  'back-triceps': 'triceps',
  'back-upperback': 'upper-back',
  'back-lowerback': 'lower-back',
  'back-glutes': 'gluteal',
  'back-hamstring': 'hamstring',
  'back-calf': 'calves',
};

function getMuscleData(view: MuscleMapView, gender: MuscleMapGender, slug: string): MusclePathData | undefined {
  const dataset =
    view === 'front'
      ? gender === 'male' ? muscleFront : muscleFrontFemale
      : gender === 'male' ? muscleBack : muscleBackFemale;
  return dataset.find((entry) => entry.slug === slug);
}

function allPaths(data: MusclePathData | undefined): string[] {
  if (!data) return [];
  return [...(data.path.common ?? []), ...(data.path.left ?? []), ...(data.path.right ?? [])];
}

export function MuscleMap({ mode, muscles, activeRegion, onRegionSelect, className = '' }: Props) {
  const [view, setView] = useState<MuscleMapView>('front');
  const [gender, setGender] = useState<MuscleMapGender>('male');
  const [visible, setVisible] = useState(true);
  const groupRefs = useRef<Partial<Record<RegionId, SVGGElement | null>>>({});
  const [markers, setMarkers] = useState<Partial<Record<RegionId, [number, number]>>>({});

  // Weicher Übergang bei Wechsel der Ansicht/des Geschlechts (respektiert
  // prefers-reduced-motion über motion-safe:, siehe Klassen unten).
  useEffect(() => {
    setVisible(false);
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [view, gender]);

  const highlighted = new Set<RegionId>(mode === 'display' ? regionsForMuscles(muscles ?? []) : activeRegion ? [activeRegion] : []);
  const unmappedPresent = (muscles ?? []).filter((m) => (UNMAPPED_MUSCLES as readonly string[]).includes(m));

  const regionsForView = (Object.keys(MUSCLE_REGIONS) as RegionId[]).filter((id) => MUSCLE_REGIONS[id].view === view);

  // Mittelpunkt je Region für den Hervorhebungs-Marker (zusätzliches Signal
  // neben Farbe/Kontur) — per getBBox() aus den tatsächlich gerenderten
  // Pfaden ermittelt, da die anatomischen Pfade keine einfache Geometrie
  // haben, aus der sich ein Zentrum berechnen ließe.
  useLayoutEffect(() => {
    const next: Partial<Record<RegionId, [number, number]>> = {};
    for (const id of regionsForView) {
      const el = groupRefs.current[id];
      if (!el) continue;
      try {
        const box = el.getBBox();
        next[id] = [box.x + box.width / 2, box.y + box.height / 2];
      } catch {
        // getBBox kann vor dem ersten Paint fehlschlagen — Marker bleibt
        // in diesem Fall einfach aus, kein Rendering-Fehler.
      }
    }
    setMarkers(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, gender]);

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

  const viewBox = BODY_OUTLINE_VIEWBOX[gender][view];
  const outlinePath = BODY_OUTLINE_PATH[gender][view];

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 self-start rounded-md bg-neutral-100 p-1">
          {(['front', 'back'] as MuscleMapView[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                view === v
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {v === 'front' ? 'Vorderseite' : 'Rückseite'}
            </button>
          ))}
        </div>

        <div className="flex gap-1 self-start rounded-md bg-neutral-100 p-1">
          {(['male', 'female'] as MuscleMapGender[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGender(g)}
              aria-pressed={gender === g}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                gender === g
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {g === 'male' ? 'Männlich' : 'Weiblich'}
            </button>
          ))}
        </div>
      </div>

      <svg
        viewBox={viewBox}
        className={`h-64 w-auto mx-auto motion-safe:transition-opacity motion-safe:duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
        role="img"
        aria-label={`Körperkarte, ${view === 'front' ? 'Vorderseite' : 'Rückseite'}, ${gender === 'male' ? 'männlich' : 'weiblich'}`}
      >
        <path
          d={outlinePath}
          className="fill-neutral-100 stroke-neutral-300"
          strokeWidth={2}
          aria-hidden="true"
        />
        {regionsForView.map((id) => {
          const slug = REGION_SLUGS[id];
          const data = getMuscleData(view, gender, slug);
          const paths = allPaths(data);
          if (paths.length === 0) return null;

          const isActive = highlighted.has(id);
          const label = MUSCLE_REGIONS[id].labelDe;
          const marker = markers[id];

          return (
            <g
              key={id}
              ref={(el) => { groupRefs.current[id] = el; }}
              className={`motion-safe:transition-[fill,stroke] motion-safe:duration-200 ${
                isActive
                  ? 'fill-primary-500 stroke-primary-700'
                  : 'fill-neutral-200 stroke-neutral-300'
              } ${mode === 'interactive' ? 'cursor-pointer outline-none hover:fill-neutral-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600' : ''}`}
              strokeWidth={isActive ? 2.5 : 1.5}
              tabIndex={mode === 'interactive' ? 0 : undefined}
              role={mode === 'interactive' ? 'button' : undefined}
              aria-pressed={mode === 'interactive' ? isActive : undefined}
              aria-label={`${label}${isActive ? ' (ausgewählt)' : ''}`}
              onClick={mode === 'interactive' ? () => handleSelect(id) : undefined}
              onKeyDown={mode === 'interactive' ? (e) => handleKeyDown(e, id) : undefined}
            >
              {paths.map((d) => (
                <path key={d} d={d} />
              ))}
              {isActive && marker && (
                <circle cx={marker[0]} cy={marker[1]} r={8} className="fill-white" aria-hidden="true" />
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
