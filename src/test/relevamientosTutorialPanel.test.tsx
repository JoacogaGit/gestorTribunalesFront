import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RelevamientosPanel from "@/components/metricas/RelevamientosPanel";
import { mostrarTutorialRelevamiento } from "@/lib/tutorialRelevamientos";

const { update, insert } = vi.hoisted(() => ({ update: vi.fn(), insert: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({
  select: () => ({ order: () => ({ eq: async () => ({ data: [] }) }) }), update, insert,
}) } }));
vi.mock("@/components/metricas/RelevamientoGraficos3D", () => ({ default: ({ inline }: { inline?: boolean }) => inline ? <div>Gráficos de ejemplo</div> : null }));

afterEach(() => { cleanup(); mostrarTutorialRelevamiento(null); });
describe("Panel de ejemplo del tutorial", () => {
  it("muestra creación, carpetas, bloques y ajustes sin escribir datos", async () => {
    mostrarTutorialRelevamiento("crear");
    const { container } = render(<RelevamientosPanel vocaliaId="espacio" tribunalId={null} vocaliasTribunal={[]} />);
    expect(screen.getByText("Nombre")).toBeInTheDocument();
    expect(screen.getByText("Desde")).toBeInTheDocument();
    expect(screen.getByText("Hasta")).toBeInTheDocument();
    act(() => mostrarTutorialRelevamiento("carpetas"));
    expect(screen.getByText("Cerrado · datos congelados")).toBeInTheDocument();
    expect(screen.getByText("Borrador · recalcula en vivo")).toBeInTheDocument();
    act(() => mostrarTutorialRelevamiento("automaticos"));
    expect(screen.getByText("Resoluciones adoptadas")).toBeInTheDocument();
    expect(screen.getByText("Violencia de género")).toBeInTheDocument();
    act(() => mostrarTutorialRelevamiento("ajustes"));
    await waitFor(() => expect(screen.getAllByRole("spinbutton").length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByRole("button", { name: /^Sumar uno/ })[0]);
    expect(screen.getByText(/ajuste \+1/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch", { name: "Automático" }));
    expect(screen.getByRole("switch")).toHaveAttribute("data-state", "unchecked");
    act(() => mostrarTutorialRelevamiento("manuales"));
    expect(screen.getByText("Hábeas corpus")).toBeInTheDocument();
    expect(screen.getByText("Audiencias virtuales y presenciales")).toBeInTheDocument();
    act(() => mostrarTutorialRelevamiento("graficos"));
    expect(screen.getByText("Gráficos de ejemplo")).toBeInTheDocument();
    act(() => mostrarTutorialRelevamiento("exportar"));
    expect(screen.getByRole("button", { name: "Exportar a Excel" })).toBeInTheDocument();
    act(() => mostrarTutorialRelevamiento(null));
    expect(container.querySelector('[data-tour="relevamientos-detalle"]')).toBeNull();
    expect(update).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });
});