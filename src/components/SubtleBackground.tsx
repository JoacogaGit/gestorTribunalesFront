import { useMemo } from "react";

/**
 * Capa de fondo sutil para pantallas pre-tribunal.
 * - Dos blobs radial-gradient que se desplazan muy lento.
 * - Una capa de partículas tipo "polvo" usando spans absolutos.
 * - Respeta tokens HSL (claro/oscuro) y se desactiva en móvil / reduced-motion.
 */
export default function SubtleBackground() {
  // Posiciones aleatorias estables para las partículas.
  const dust = useMemo(
    () =>
      Array.from({ length: 28 }).map((_, i) => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 1 + Math.random() * 2.5,
        delay: -Math.random() * 30,
        dur: 22 + Math.random() * 28,
        dx: (Math.random() - 0.5) * 60,
        dy: (Math.random() - 0.5) * 60,
        op: 0.25 + Math.random() * 0.45,
        key: i,
      })),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-gradient-surface">
      {/* Blobs lentos */}
      <div
        className="absolute -top-40 -left-32 w-[520px] h-[520px] rounded-full blur-3xl jt-blob-a"
        style={{
          background:
            "radial-gradient(circle at center, hsl(var(--primary) / 0.18), transparent 70%)",
        }}
      />
      <div
        className="absolute -bottom-48 -right-32 w-[560px] h-[560px] rounded-full blur-3xl jt-blob-b"
        style={{
          background:
            "radial-gradient(circle at center, hsl(var(--gold) / 0.18), transparent 70%)",
        }}
      />
      <div
        className="absolute top-1/3 left-1/2 w-[420px] h-[420px] rounded-full blur-3xl jt-blob-c"
        style={{
          background:
            "radial-gradient(circle at center, hsl(var(--primary) / 0.10), transparent 70%)",
        }}
      />

      {/* Polvo flotando — oculto en móvil y con reduced-motion */}
      <div className="absolute inset-0 hidden md:block motion-reduce:hidden">
        {dust.map((d) => (
          <span
            key={d.key}
            className="absolute rounded-full bg-foreground/30 jt-dust"
            style={
              {
                left: `${d.left}%`,
                top: `${d.top}%`,
                width: `${d.size}px`,
                height: `${d.size}px`,
                opacity: d.op,
                animationDelay: `${d.delay}s`,
                animationDuration: `${d.dur}s`,
                ["--jt-dx" as string]: `${d.dx}px`,
                ["--jt-dy" as string]: `${d.dy}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
