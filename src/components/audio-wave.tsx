import { useEffect, useRef } from "react";
import { getAnalyser } from "@/lib/audioPlayer";

export function AudioWave({
  active,
  progress = 0,
  onSeek,
  barColor = "#94a3b8",
  playedColor = "#6366f1",
}: {
  active: boolean;
  progress?: number;
  onSeek?: (fraction: number) => void;
  barColor?: string;
  playedColor?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(progress);
  // Kept current via an effect, not during render, so the animation loop below can read the latest value without
  // re-running its whole canvas setup on every progress tick.
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let raf = 0;
    const barCount = 76;
    const idleBars = Array.from({ length: barCount }, (_, i) => 0.16 + 0.24 * Math.abs(Math.sin(i * 0.72)));

    function drawBars(values: number[]) {
      if (!ctx || !canvas) return;
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      const gap = 2.4;
      const barWidth = (width - gap * (values.length - 1)) / values.length;
      const radius = Math.min(barWidth / 2, 1.25);
      const playedUntil = progressRef.current * width;
      values.forEach((v, i) => {
        const h = Math.max(1.5, v * height * 0.78);
        const x = i * (barWidth + gap);
        const y = (height - h) / 2;
        ctx.fillStyle = x < playedUntil ? playedColor : barColor;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, barWidth, h, radius);
        else ctx.rect(x, y, barWidth, h);
        ctx.fill();
      });
    }

    if (!active) {
      drawBars(idleBars);
      return;
    }

    const analyser = getAnalyser();
    if (!analyser) {
      drawBars(idleBars);
      return;
    }

    const data = new Uint8Array(analyser.frequencyBinCount);
    const draw = () => {
      raf = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(data);
      const step = Math.floor(data.length / barCount) || 1;
      const values: number[] = [];
      for (let i = 0; i < barCount; i++) {
        values.push(Math.max(0.12, (data[i * step] || 0) / 255));
      }
      drawBars(values);
    };
    draw();

    return () => cancelAnimationFrame(raf);
  }, [active, barColor, playedColor]);

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onSeek((e.clientX - rect.left) / rect.width);
  }

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={20}
      onClick={handleClick}
      className={onSeek ? "w-full cursor-pointer" : "shrink-0"}
      style={onSeek ? { width: "100%", height: 20 } : undefined}
    />
  );
}
