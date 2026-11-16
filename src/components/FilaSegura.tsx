import { Component, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  modo: "fila" | "tarjeta";
  colSpan?: number;
  numero?: string;
}

/** Aísla errores de una sola causa: muestra un aviso en su fila sin tumbar la lista. */
export default class FilaSegura extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error("[FilaSegura]", this.props.numero, error);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const aviso = (
      <span className="flex items-center gap-2 text-xs text-alert-urgent">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        No se pudo mostrar la causa {this.props.numero || ""} ({error.message}).
        <button type="button" className="underline" onClick={() => this.setState({ error: null })}>Reintentar</button>
      </span>
    );
    if (this.props.modo === "fila") {
      return (
        <tr className="bg-alert-urgent/5">
          <td colSpan={this.props.colSpan ?? 1} className="px-3 py-2">{aviso}</td>
        </tr>
      );
    }
    return <div className="rounded-xl p-3 border border-alert-urgent/30 bg-alert-urgent/5">{aviso}</div>;
  }
}
