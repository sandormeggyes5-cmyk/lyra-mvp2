/**
 * Markenzeichen Konzept A „Winkel-K“ (Nov. 2026) — gleiche Geometrie wie in
 * der Kai-App (Ordner lyra-app) `src/brand/Logos.jsx`; bei Änderungen beide Stellen synchron halten.
 * PhysioPilot (Dachmarke): Goniometer im abgerundeten Quadrat.
 * Kai (Untermarke): das K als Goniometer im Kreis.
 */
type Variant = 'primary' | 'inverse' | 'mono';

const FARBEN: Record<Variant, { box: string; fg: string; acc: string; accOpacity: number }> = {
  primary: { box: '#0f766e', fg: '#ffffff', acc: '#ff7a3d', accOpacity: 1 },
  inverse: { box: '#ffffff', fg: '#0f766e', acc: '#ff7a3d', accOpacity: 1 },
  mono: { box: '#0e2422', fg: '#ffffff', acc: '#ffffff', accOpacity: 0.35 },
};

interface MarkProps {
  size?: number;
  variant?: Variant;
  title?: string;
}

function a11y(title?: string) {
  return title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true as const };
}

export function PhysioPilotMark({ size = 32, variant = 'primary', title }: MarkProps) {
  const c = FARBEN[variant];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className="block flex-shrink-0" {...a11y(title)}>
      <rect width="64" height="64" rx="16" fill={c.box} />
      <g transform="translate(-2.5 1)">
        <path d="M22 42 L40 42 A18 18 0 0 0 32.32 27.26 Z" fill={c.acc} fillOpacity={c.accOpacity} />
        <path d="M22 42 H50 M22 42 L39.2 17.4" stroke={c.fg} strokeWidth="5.5" strokeLinecap="round" fill="none" />
        <circle cx="22" cy="42" r="5.5" fill={c.fg} />
        {size >= 24 && <circle cx="22" cy="42" r="2" fill={c.box} />}
      </g>
    </svg>
  );
}

export function KaiMark({ size = 32, variant = 'primary', title }: MarkProps) {
  const c = FARBEN[variant];
  const klein = size < 24;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className="block flex-shrink-0" {...a11y(title)}>
      <circle cx="32" cy="32" r="32" fill={c.box} />
      <g transform="translate(-1 0)">
        <path d="M22 34 L31.7 41.05 A12 12 0 0 0 30.88 25.92 Z" fill={c.acc} fillOpacity={c.accOpacity} />
        <path
          d="M22 14 V50 M22 34 L44 14 M22 34 L44 50"
          stroke={c.fg}
          strokeWidth={klein ? 6.5 : 5.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {!klein && (
          <>
            <circle cx="22" cy="34" r="5.5" fill={c.fg} />
            <circle cx="22" cy="34" r="2" fill={c.box} />
          </>
        )}
      </g>
    </svg>
  );
}
