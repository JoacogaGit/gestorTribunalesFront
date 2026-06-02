import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  /** Si es true, no muestra el botón "Volver al inicio" (útil para boundaries locales). */
  scope?: "global" | "local";
  /** Título y mensaje customizables para boundaries locales. */
  title?: string;
  message?: string;
}

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ info });
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleHome = () => {
    window.location.href = "/";
  };

  private handleReset = () => {
    this.setState({ error: null, info: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    const isDev = import.meta.env.DEV;
    const scope = this.props.scope ?? "global";
    const title = this.props.title ?? "Algo salió mal";
    const message =
      this.props.message ??
      "Ocurrió un error inesperado. Podés intentar recargar la página o volver al inicio.";

    return (
      <div className={scope === "global" ? "min-h-screen flex items-center justify-center p-6 bg-background" : "p-6"}>
        <Card className="max-w-2xl w-full p-6 border-alert-urgent/30 bg-alert-urgent/5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-alert-urgent/15 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-alert-urgent" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-xl font-bold mb-1">{title}</h2>
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
          </div>

          {isDev && (
            <div className="mt-4 rounded-md border border-border bg-muted/40 p-3 overflow-auto max-h-64">
              <p className="text-xs font-mono font-semibold mb-2 text-alert-urgent">
                {this.state.error.name}: {this.state.error.message}
              </p>
              {this.state.error.stack && (
                <pre className="text-[10px] font-mono whitespace-pre-wrap text-muted-foreground">
                  {this.state.error.stack}
                </pre>
              )}
              {this.state.info?.componentStack && (
                <pre className="text-[10px] font-mono whitespace-pre-wrap text-muted-foreground mt-2 pt-2 border-t border-border/50">
                  {this.state.info.componentStack}
                </pre>
              )}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2 justify-end">
            {scope === "local" && (
              <Button variant="outline" size="sm" onClick={this.handleReset}>
                <RotateCcw className="w-4 h-4 mr-1.5" /> Reintentar
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={this.handleReload}>
              <RotateCcw className="w-4 h-4 mr-1.5" /> Recargar página
            </Button>
            {scope === "global" && (
              <Button size="sm" onClick={this.handleHome}>
                <Home className="w-4 h-4 mr-1.5" /> Volver al inicio
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }
}
