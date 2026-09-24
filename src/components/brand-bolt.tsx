import { useId } from "react";

/** A smooth, rounded lightning bolt with a violet to pink gradient, used beside the home page heading. */
export function BrandBolt({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="6" y1="2" x2="18" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <path
        d="M13.2 2.6 4.6 13.4c-.5.6-.1 1.5.7 1.5h5.1l-1.1 6.1c-.2 1 1.1 1.5 1.7.7l8.6-10.8c.5-.6.1-1.5-.7-1.5h-5.1l1.1-6.1c.2-1-1.1-1.5-1.7-.7Z"
        fill={`url(#${id})`}
        stroke={`url(#${id})`}
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}
