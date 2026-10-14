import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  spin: number;
  color: string;
  life: number;
}

const COLORS = ["#e0a06a", "#d18a52", "#9bc2b3", "#f5f0e6", "#ffd166", "#ef6f6c", "#7ab8ff"];
const GRAVITY = 1400;
const DURATION_MS = 2600;

/** Fires a confetti burst each time `burst` changes to a value above zero. */
export function Confetti({
  burst,
  amount = 120,
  originY = 0.55,
}: {
  burst: number;
  amount?: number;
  originY?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!burst || !canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const particles: Particle[] = Array.from({ length: amount }, (_, i) => {
      const fromLeft = i % 2 === 0;
      const spread = (0.2 + Math.random() * 0.9) * (fromLeft ? 1 : -1);
      const angle = -Math.PI / 2 + spread;
      const speed = 650 + Math.random() * 750;
      return {
        x: width * (fromLeft ? 0.2 : 0.8),
        y: height * originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 6 + Math.random() * 7,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 14,
        color: COLORS[Math.floor(Math.random() * COLORS.length)] ?? "#fff",
        life: 0.75 + Math.random() * 0.25,
      };
    });

    let frame = 0;
    let last = performance.now();
    const start = last;

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const elapsed = now - start;
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.vy += GRAVITY * dt;
        p.vx *= 0.992;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotation += p.spin * dt;
        const fade = Math.max(0, 1 - Math.max(0, elapsed / DURATION_MS - p.life) / (1 - p.life));
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
      if (elapsed < DURATION_MS) frame = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, width, height);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      ctx.clearRect(0, 0, width, height);
    };
  }, [burst, amount, originY]);

  return <canvas ref={canvasRef} className="confetti" aria-hidden="true" />;
}
