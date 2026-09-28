import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BLOQUES, BloqueDef, BloqueId, Valores } from "@/lib/relevamientos";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nombre: string;
  valores: Partial<Record<BloqueId, Valores>>;
}

interface Palette {
  fondo: string;
  tarjeta: string;
  violeta: string;
  oro: string;
  suave: string;
  rosa: string;
}

interface DatoGrafico { label: string; value: number }

function usePalette(): Palette | null {
  const [palette, setPalette] = useState<Palette | null>(null);
  useEffect(() => {
    const css = getComputedStyle(document.documentElement);
    const color = (token: string) => `hsl(${css.getPropertyValue(token).trim()})`;
    setPalette({
      fondo: color("--metrics-background"), tarjeta: color("--metrics-card"),
      violeta: color("--metrics-accent"), oro: color("--metrics-gold"),
      suave: color("--metrics-chart-line"), rosa: color("--metrics-chart-4"),
    });
  }, []);
  return palette;
}

function datosDe(def: BloqueDef, valores: Valores): DatoGrafico[] {
  return def.filas.map((fila) => ({
    label: fila.label,
    value: def.columnas.reduce((sum, columna) => sum + (valores[`${fila.id}|${columna.id}`] ?? 0), 0),
  }));
}

function Barra({ x, z, value, max, color, forma = "box" }: {
  x: number; z: number; value: number; max: number; color: string; forma?: "box" | "cylinder" | "cone";
}) {
  const alto = value === 0 ? 0.08 : Math.max(0.28, (value / Math.max(max, 1)) * 4.5);
  const geometry = forma === "cylinder"
    ? <cylinderGeometry args={[0.42, 0.52, alto, 20]} />
    : forma === "cone" ? <coneGeometry args={[0.56, alto, 6]} /> : <boxGeometry args={[0.72, alto, 0.72]} />;
  return <mesh position={[x, alto / 2, z]} castShadow>{geometry}<meshStandardMaterial color={color} metalness={0.35} roughness={0.28} /></mesh>;
}

function BarrasAgrupadas({ datos, palette }: { datos: DatoGrafico[]; palette: Palette }) {
  const max = Math.max(...datos.map((d) => d.value), 1);
  const offset = (datos.length - 1) / 2;
  return <group>{datos.map((d, i) => <Barra key={d.label} x={(i - offset) * 1.05} z={0} value={d.value} max={max} color={i % 2 ? palette.oro : palette.violeta} />)}</group>;
}

function TorresResoluciones({ datos, palette }: { datos: DatoGrafico[]; palette: Palette }) {
  const max = Math.max(...datos.map((d) => d.value), 1);
  const offset = (datos.length - 1) / 2;
  return <group>{datos.map((d, i) => <Barra key={d.label} x={(i - offset) * 0.88} z={Math.abs(i - offset) * 0.12} value={d.value} max={max} color={i % 3 === 0 ? palette.oro : palette.suave} forma="cylinder" />)}</group>;
}

function AnillosHabeas({ datos, palette }: { datos: DatoGrafico[]; palette: Palette }) {
  const total = Math.max(datos.reduce((s, d) => s + d.value, 0), 1);
  let cursor = 0;
  return <group rotation-x={-Math.PI / 2}>{datos.map((d, i) => {
    const arc = Math.max(0.06, (d.value / total) * Math.PI * 2);
    const start = cursor;
    cursor += arc;
    return <mesh key={d.label} rotation-z={start}><torusGeometry args={[2.25, 0.28 + i * 0.018, 12, 32, arc]} /><meshStandardMaterial color={i % 2 ? palette.oro : palette.violeta} metalness={0.5} roughness={0.25} /></mesh>;
  })}</group>;
}

function PiramidesFlagrancia({ datos, palette }: { datos: DatoGrafico[]; palette: Palette }) {
  const max = Math.max(...datos.map((d) => d.value), 1);
  return <group>{datos.map((d, i) => <Barra key={d.label} x={(i - 0.5) * 2.2} z={0} value={d.value} max={max} color={i ? palette.oro : palette.rosa} forma="cone" />)}</group>;
}

function RadialViolencia({ datos, palette }: { datos: DatoGrafico[]; palette: Palette }) {
  const max = Math.max(...datos.map((d) => d.value), 1);
  return <group>{datos.map((d, i) => {
    const angle = (i / Math.max(datos.length, 1)) * Math.PI * 2;
    return <Barra key={d.label} x={Math.cos(angle) * 2.2} z={Math.sin(angle) * 2.2} value={d.value} max={max} color={i % 2 ? palette.oro : palette.violeta} forma="cylinder" />;
  })}</group>;
}

function Escena({ def, datos, palette }: { def: BloqueDef; datos: DatoGrafico[]; palette: Palette }) {
  const grafico = def.id === "causas" ? <BarrasAgrupadas datos={datos} palette={palette} />
    : def.id === "resoluciones" ? <TorresResoluciones datos={datos} palette={palette} />
      : def.id === "habeas" ? <AnillosHabeas datos={datos} palette={palette} />
        : def.id === "audiencias" ? <PiramidesFlagrancia datos={datos} palette={palette} />
          : <RadialViolencia datos={datos} palette={palette} />;
  return (
    <Canvas shadows dpr={[1, 1.5]} camera={{ position: [7, 6.5, 9], fov: 45 }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.75} />
      <directionalLight position={[5, 9, 6]} intensity={2.2} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[-5, 4, -3]} intensity={1.4} color={palette.oro} />
      <group position-y={-1}>{grafico}</group>
      <mesh rotation-x={-Math.PI / 2} position-y={-1.04} receiveShadow>
        <circleGeometry args={[5.5, 48]} />
        <meshStandardMaterial color={palette.tarjeta} roughness={0.78} metalness={0.08} />
      </mesh>
      <OrbitControls enablePan={false} minDistance={7} maxDistance={14} minPolarAngle={0.55} maxPolarAngle={1.38} autoRotate autoRotateSpeed={0.45} />
    </Canvas>
  );
}

export default function RelevamientoGraficos3D({ open, onOpenChange, nombre, valores }: Props) {
  const [activo, setActivo] = useState<BloqueId>("causas");
  const palette = usePalette();
  const def = BLOQUES.find((b) => b.id === activo) ?? BLOQUES[0];
  const datos = useMemo(() => datosDe(def, valores[def.id] ?? {}), [def, valores]);
  const total = datos.reduce((s, d) => s + d.value, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="metrics-section max-w-6xl border-metrics-border bg-metrics-background text-metrics-foreground">
        <DialogHeader><DialogTitle className="flex items-center gap-2 font-sans text-xl"><BarChart3 className="h-5 w-5 text-metrics-gold" /> Gráficos · {nombre}</DialogTitle></DialogHeader>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {BLOQUES.map((b) => <Button key={b.id} size="sm" variant={activo === b.id ? "default" : "outline"} onClick={() => setActivo(b.id)} className={activo === b.id ? "bg-metrics-gold text-metrics-gold-foreground hover:bg-metrics-gold/90" : "border-metrics-border bg-transparent text-metrics-muted hover:bg-metrics-card hover:text-metrics-foreground"}>{b.titulo}</Button>)}
        </div>
        <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="h-[430px] overflow-hidden rounded-md border border-metrics-border bg-metrics-card/60">
            {palette && <Escena def={def} datos={datos} palette={palette} />}
          </div>
          <aside className="max-h-[430px] overflow-y-auto rounded-md border border-metrics-border bg-metrics-card/55 p-4">
            <h3 className="text-center font-sans text-lg font-semibold">{def.titulo}</h3>
            <p className="mt-1 text-center text-xs text-metrics-muted">Total representado: <span className="font-semibold text-metrics-gold">{total}</span></p>
            <div className="mt-4 space-y-2">{datos.map((d, i) => <div key={d.label} className="flex items-start justify-between gap-3 border-b border-metrics-border/50 pb-2 text-sm"><span className="text-metrics-muted"><span className={i % 2 ? "text-metrics-gold" : "text-metrics-foreground"}>●</span> {d.label}</span><strong className="tabular-nums">{d.value}</strong></div>)}</div>
          </aside>
        </div>
        <p className="text-center text-xs text-metrics-muted">Arrastrá para rotar · Usá la rueda para acercar</p>
      </DialogContent>
    </Dialog>
  );
}