// A classic 11x13 lightning bolt, drawn row by row ('X' = a filled square).
const BOLT_ROWS = [
  "......XXXX.",
  ".....XXXX..",
  "....XXXX...",
  "...XXXX....",
  "..XXXXXXXX.",
  ".XXXXXXXX..",
  ".....XXXX..",
  "....XXXX...",
  "...XXXX....",
  "..XXXX.....",
  "..XXX......",
  "..XX.......",
  "..X........",
];

const BOLT: [number, number][] = BOLT_ROWS.flatMap((row, y) =>
  [...row].flatMap((cell, x) => (cell === "X" ? ([[x, y]] as [number, number][]) : [])),
);

// Synthwave gradient: violet at the top of the bolt to pink at the tip.
const TOP = [139, 92, 246];
const BOTTOM = [236, 72, 153];
const rowColor = (y: number): string => {
  const t = y / (BOLT_ROWS.length - 1);
  return `rgb(${TOP.map((c, i) => Math.round(c + (BOTTOM[i] - c) * t)).join(" ")})`;
};

/** An 8-bit lightning bolt from square pixels, violet to pink, blinking in two steps like the pixel heart. */
export function PixelBolt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 11 13"
      className={`animate-[pulse_1.2s_steps(2,end)_infinite] ${className ?? ""}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {BOLT.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={rowColor(y)} />
      ))}
    </svg>
  );
}
