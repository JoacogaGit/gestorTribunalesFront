import CausaFormDialog from "@/components/forms/CausaFormDialog";
import { Causa } from "@/data/mockCausas";

interface Props {
  causa: Causa;
  onClose: () => void;
  /** Refetch tras crear/editar/borrar. */
  onMutated?: () => void;
  // Props legacy mantenidas para compatibilidad — ya no se usan.
  onUpdate?: (causa: Causa) => void;
  onDelete?: (id: string) => void;
}

export default function CausaDetail({ causa, onClose, onMutated }: Props) {
  return (
    <CausaFormDialog
      open
      onOpenChange={(o) => { if (!o) onClose(); }}
      mode="editar"
      causaId={causa.id}
      onMutated={onMutated}
    />
  );
}
