import { useEffect, useRef, useState } from 'react';

const C = '#1e40af';

function ln(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}
function circ(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
}
function setup(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = C; ctx.fillStyle = C;
  ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
}
function gnd(ctx: CanvasRenderingContext2D, w: number, y: number) {
  ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2.5;
  ln(ctx, 12, y, w - 12, y);
}

// ── Liegestütze ──────────────────────────────────────────────────────────────
function drawPushUp(ctx: CanvasRenderingContext2D, t: number) {
  const W = 200, H = 155, GY = 143;
  ctx.clearRect(0, 0, W, H);
  gnd(ctx, W, GY);
  setup(ctx);

  // 0 = oben (Arme gestreckt), 1 = unten (Brust nah am Boden)
  const drop = ((1 - Math.cos(t)) / 2) * 25;

  // Feste Punkte auf dem Boden
  const hx1 = 58, hx2 = 72, hy = GY;    // Hände
  const fx1 = 147, fx2 = 161, fy = GY;  // Füße

  // Bewegliche Körperpunkte (Person schaut links, Kopf rechts)
  const headX = 160, headY = 50 + drop;
  const shX = 145, shY = 63 + drop;
  const hipX = 72, hipY = 75 + drop;

  circ(ctx, headX, headY, 11);
  ln(ctx, headX - 5, headY + 10, shX, shY);
  ln(ctx, shX, shY, hipX, hipY);
  ln(ctx, shX, shY, hx1, hy);
  ln(ctx, shX - 10, shY + 3, hx2, hy);
  ln(ctx, hipX, hipY, fx1, fy);
  ln(ctx, hipX + 7, hipY + 2, fx2, fy);
}

// ── Joggen ───────────────────────────────────────────────────────────────────
function drawJogging(ctx: CanvasRenderingContext2D, t: number) {
  const W = 200, H = 170, GY = 155;
  ctx.clearRect(0, 0, W, H);
  gnd(ctx, W, GY);
  setup(ctx);

  const D = Math.PI / 180;
  const bx = 100;
  const bob = Math.sin(2 * t) * 2.5;

  circ(ctx, bx, 30 + bob, 11);
  ln(ctx, bx, 41 + bob, bx + 1, 55);
  ln(ctx, bx + 1, 55, bx + 2, 92);

  const aA = 38 * D, aL = 32, lA = 46 * D, lL = 54;

  // Linker Arm (vorwärts wenn rechtes Bein vorwärts)
  const la = aA * Math.sin(t);
  ln(ctx, bx - 5, 55, bx - 5 + aL * Math.sin(la), 55 + aL * Math.cos(la));
  // Rechter Arm (entgegengesetzt)
  const ra = -aA * Math.sin(t);
  ln(ctx, bx + 5, 55, bx + 5 + aL * Math.sin(ra), 55 + aL * Math.cos(ra));

  // Rechtes Bein (vorwärts)
  const rl = lA * Math.sin(t);
  const rfx = bx + 4 + lL * Math.sin(rl);
  const rfy = Math.min(92 + lL * Math.cos(rl), GY);
  ln(ctx, bx + 4, 92, rfx, rfy);

  // Linkes Bein (rückwärts)
  const ll = -lA * Math.sin(t);
  const lfx = bx - 4 + lL * Math.sin(ll);
  const lfy = Math.min(92 + lL * Math.cos(ll), GY);
  ln(ctx, bx - 4, 92, lfx, lfy);
}

// ── Plank ────────────────────────────────────────────────────────────────────
function drawPlank(ctx: CanvasRenderingContext2D, t: number) {
  const W = 220, H = 155, GY = 143;
  ctx.clearRect(0, 0, W, H);
  gnd(ctx, W, GY);
  setup(ctx);

  const breathe = Math.sin(t * 0.45) * 2.5;

  // Feste Punkte: Unterarme/Hände + Füße am Boden
  const hx1 = 65, hx2 = 80, hy = GY;
  const fx1 = 183, fx2 = 197, fy = GY;

  // Körper (fast horizontal, Person schaut rechts, Kopf links)
  const headX = 50, headY = 62 + breathe;
  const shX = 68, shY = 76 + breathe;
  const hipX = 158, hipY = 80 + breathe;

  circ(ctx, headX, headY, 11);
  ln(ctx, headX + 7, headY + 9, shX, shY);
  ln(ctx, shX, shY, hipX, hipY);
  ln(ctx, shX, shY, hx1, hy);
  ln(ctx, shX + 9, shY + 2, hx2, hy);
  ln(ctx, hipX, hipY, fx1, fy);
  ln(ctx, hipX + 5, hipY + 2, fx2, fy);
}

// ── Canvas-Hook ──────────────────────────────────────────────────────────────
type DrawFn = (ctx: CanvasRenderingContext2D, t: number) => void;

function AnimatedCanvas({
  draw, width, height, speed,
}: {
  draw: DrawFn; width: number; height: number; speed: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let id: number;
    let t = 0;
    function frame() {
      draw(ctx, t);
      t += speed;
      id = requestAnimationFrame(frame);
    }
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      className="w-full h-auto"
    />
  );
}

// ── Tips pro Übung ────────────────────────────────────────────────────────────
const TIPS: Record<string, string[]> = {
  liegestütz: ['Körper gerade wie ein Brett', 'Ellbogen nah am Körper', 'Bauch aktiv anspannen'],
  jogg: ['Aufrecht laufen, Blick voraus', 'Arme locker im 90°-Winkel', 'Weiche Landung mit Mittelfuß'],
  plank: ['Hüfte weder hängen noch heben', 'Gleichmäßig ein- und ausatmen', 'Blick zum Boden richten'],
};

function getTips(name: string): string[] {
  const n = name.toLowerCase();
  for (const [key, tips] of Object.entries(TIPS)) {
    if (n.includes(key)) return tips;
  }
  return [];
}

// ── Öffentliche Komponente ────────────────────────────────────────────────────
interface Props { exerciseName: string }

export function ExerciseAvatar({ exerciseName }: Props) {
  const [open, setOpen] = useState(false);
  const n = exerciseName.toLowerCase();

  const isLiegestuetz = n.includes('liegestütz') || n.includes('push');
  const isJogging = n.includes('jogg') || n.includes('laufen') || n.includes('joggen');
  const isPlank = n.includes('plank');

  if (!isLiegestuetz && !isJogging && !isPlank) return null;

  const tips = getTips(exerciseName);

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
        </svg>
        {open ? 'Ausführung ausblenden' : 'Ausführung ansehen'}
      </button>

      {open && (
        <div className="mt-3 bg-blue-50 rounded-xl p-3 border border-blue-100">
          <div className="rounded-lg overflow-hidden bg-white border border-blue-100 mb-3">
            {isLiegestuetz && (
              <AnimatedCanvas draw={drawPushUp} width={200} height={155} speed={0.04} />
            )}
            {isJogging && (
              <AnimatedCanvas draw={drawJogging} width={200} height={170} speed={0.07} />
            )}
            {isPlank && (
              <AnimatedCanvas draw={drawPlank} width={220} height={155} speed={0.015} />
            )}
          </div>
          {tips.length > 0 && (
            <ul className="space-y-1">
              {tips.map((tip) => (
                <li key={tip} className="flex items-start gap-1.5 text-xs text-blue-700">
                  <span className="mt-0.5 text-blue-400">✓</span>
                  {tip}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
