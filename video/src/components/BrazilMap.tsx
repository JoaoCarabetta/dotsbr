import { useEffect, useRef } from "react";
import { useVideoConfig } from "remotion";
import { DOTS } from "../lib/dots";
import { BG } from "../lib/theme";

type Props = {
  // 0–1 bloom of the coarse national plate.
  reveal: number;
  // 0–1 extra dots that stand in for a finer people-per-dot scale.
  detail: number;
  radius: number;
};

export const BrazilMap: React.FC<Props> = ({ reveal, detail, radius }) => {
  const { width, height } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.clearRect(0, 0, width, height);
    for (const dot of DOTS) {
      if (dot.detail > detail) {
        continue;
      }
      // Stagger the first appearance so Brazil "fills in" instead of popping.
      const local = (reveal - dot.delay * 0.72) / 0.28;
      const alpha = Math.max(0, Math.min(1, local));
      if (alpha <= 0) {
        continue;
      }
      ctx.globalAlpha = alpha;
      ctx.fillStyle = dot.color;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, [detail, height, radius, reveal, width]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        width,
        height,
        backgroundColor: BG,
        display: "block",
      }}
    />
  );
};
