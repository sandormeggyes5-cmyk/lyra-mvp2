import { PhysioPilotMark } from './BrandMarks.tsx';

interface Props {
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * PhysioPilot-Logo (Konzept A „Winkel-K“): Goniometer-Zeichen +
 * Wortmarke „Physio“ in Ink, „Pilot“ in Teal.
 */
export function Wordmark({ className = '', size = 'md' }: Props) {
  const markSize = size === 'sm' ? 28 : 36;
  const textSize = size === 'sm' ? 'text-[19px]' : 'text-[24px]';

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <PhysioPilotMark size={markSize} />
      <span className={`font-bold tracking-[-0.03em] leading-none ${textSize} text-[#0e2422]`}>
        Physio<span className="text-[#0f766e]">Pilot</span>
      </span>
    </div>
  );
}
