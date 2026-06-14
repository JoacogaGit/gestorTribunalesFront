/**
 * Capa de fondo sutil para pantallas pre-tribunal.
 * - Blobs radiales muy lentos (sin movimiento estridente).
 * - Haces de luz diagonales que cruzan lentamente la pantalla.
 * - Un grid finísimo casi imperceptible que "respira".
 * - Respeta tokens HSL (claro/oscuro) y se calma con prefers-reduced-motion.
 */
export default function SubtleBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-gradient-surface">
      {/* Grid finísimo que respira */}
      <div
        className="absolute inset-0 jt-grid opacity-[0.18] dark:opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(var(--foreground) / 0.06) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground) / 0.06) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse at center, black 40%, transparent 85%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 40%, transparent 85%)",
        }}
      />

      {/* Blobs lentos */}
      <div
        className="absolute -top-40 -left-32 w-[520px] h-[520px] rounded-full blur-3xl jt-blob-a"
        style={{
          background:
            "radial-gradient(circle at center, hsl(var(--primary) / 0.16), transparent 70%)",
        }}
      />
      <div
        className="absolute -bottom-48 -right-32 w-[560px] h-[560px] rounded-full blur-3xl jt-blob-b"
        style={{
          background:
            "radial-gradient(circle at center, hsl(var(--gold) / 0.16), transparent 70%)",
        }}
      />
      <div
        className="absolute top-1/3 left-1/2 w-[420px] h-[420px] rounded-full blur-3xl jt-blob-c"
        style={{
          background:
            "radial-gradient(circle at center, hsl(var(--primary) / 0.09), transparent 70%)",
        }}
      />

      {/* Haces de luz diagonales — muy lentos, sutiles */}
      <div className="absolute inset-0 hidden md:block motion-reduce:hidden overflow-hidden">
        <div className="jt-beam jt-beam-1" />
        <div className="jt-beam jt-beam-2" />
        <div className="jt-beam jt-beam-3" />
      </div>
    </div>
  );
}
