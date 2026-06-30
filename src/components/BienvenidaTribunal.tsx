import { Scale, Rocket, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import SubtleBackground from "@/components/SubtleBackground";

interface Props {
  onMigrar: () => void;
  onEmpezarDesdeCero: () => void;
}

export default function BienvenidaTribunal({ onMigrar, onEmpezarDesdeCero }: Props) {
  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden">
      <SubtleBackground />

      <div className="w-full max-w-3xl animate-fade-in text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-14 h-14 rounded-xl bg-gradient-gold flex items-center justify-center shadow-glow">
            <Scale className="w-7 h-7 text-primary-foreground" />
          </div>
        </div>

        <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground tracking-tight mb-4">
          Tu gestión de causas inteligente empieza acá
        </h1>
        <p className="text-lg text-muted-foreground mb-2">
          Bienvenido a IusTrack. Tu nuevo espacio de trabajo está listo. Ahora podés sumar tus causas al sistema.
        </p>
        <p className="text-sm text-muted-foreground max-w-2xl mx-auto mb-10">
          Si ya tenés tus causas en un Excel, Word, Google Sheets u otro formato, podés migrarlas automáticamente.
          Nuestra IA las leerá e interpretará por vos. Sino, podés cargarlas manualmente desde el panel.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch max-w-2xl mx-auto">
          <Button
            size="lg"
            onClick={onMigrar}
            className="flex-1 h-auto py-5 text-base shadow-glow"
          >
            <Rocket className="w-5 h-5 mr-2" />
            Migrar mis causas existentes
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={onEmpezarDesdeCero}
            className="flex-1 h-auto py-5 text-base"
          >
            Empezar desde cero
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-8">
          También podés migrar más tarde desde el item <span className="font-semibold">Migrar causas</span> del panel lateral.
        </p>
      </div>
    </div>
  );
}
