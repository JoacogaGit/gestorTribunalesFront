/**
 * Capa de fondo sutil para pantallas pre-tribunal.
 * Estilo: trazos finos de luz que recorren la pantalla muy lentamente y se desvanecen.
 * Etéreo, elegante, minimalista. Respeta tokens HSL (claro/oscuro), prefers-reduced-motion
 * y se oculta en móviles (≤ md) para preservar rendimiento.
 */
export default function SubtleBackground() {
  // Trazos: ángulos, posición vertical, largo, duración, delay, opacidad.
  const strokes = [
    { y: 12, rot: -8,  w: 38, dur: 22, delay: 0,   op: 0.55, color: "primary" },
    { y: 28, rot:  6,  w: 30, dur: 28, delay: -6,  op: 0.40, color: "gold" },
    { y: 44, rot: -4,  w: 44, dur: 34, delay: -14, op: 0.50, color: "primary" },
    { y: 60, rot:  10, w: 26, dur: 26, delay: -20, op: 0.35, color: "gold" },
    { y: 74, rot: -12, w: 40, dur: 32, delay: -8,  op: 0.45, color: "primary" },
    { y: 88, rot:  4,  w: 34, dur: 30, delay: -18, op: 0.38, color: "gold" },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-gradient-surface">
      {/* Halo central muy suave para dar profundidad sin nubes ni neblina. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 40%, hsl(var(--primary) / 0.05), transparent 70%)",
        }}
      />

      {/* Trazos de luz — solo desktop, se desactivan con prefers-reduced-motion */}
      <div className="absolute inset-0 hidden md:block motion-reduce:hidden">
        {strokes.map((s, i) => (
          <div
            key={i}
            className="jt-stroke"
            style={{
              top: `${s.y}%`,
              width: `${s.w}vw`,
              transform: `rotate(${s.rot}deg)`,
              animationDuration: `${s.dur}s`,
              animationDelay: `${s.delay}s`,
              ["--jt-stroke-op" as string]: s.op,
              ["--jt-stroke-color" as string]:
                s.color === "gold"
                  ? "hsl(var(--gold) / 0.7)"
                  : "hsl(var(--primary) / 0.7)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
