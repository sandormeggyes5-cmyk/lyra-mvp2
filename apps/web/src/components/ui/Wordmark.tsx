interface Props {
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Lyra/PhysioPilot-Wortmarke: kleines geometrisches Zeichen (zwei
 * überlappende Bögen — Fortschritt/Bewegung) + Serif-Schriftzug statt des
 * bisherigen reinen Fett-Text-Logos.
 */
export function Wordmark({ className = '', size = 'md' }: Props) {
  const markSize = size === 'sm' ? 22 : 28;
  const textClass = size === 'sm' ? 'text-subhead' : 'text-headline';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width={markSize} height={markSize} viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <circle cx="14" cy="14" r="13" stroke="currentColor" className="text-primary-200" strokeWidth="2" />
        <path
          d="M6 15.5c2.5 3 5.5 4.5 8 3.5s3.5-4.5 2-7.5-5-5-8-3.5"
          stroke="currentColor"
          className="text-primary-600"
          strokeWidth="2.25"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <span className={`font-display font-semibold ${textClass} text-neutral-900`}>PhysioPilot</span>
    </div>
  );
}
