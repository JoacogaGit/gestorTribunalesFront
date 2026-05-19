import { useEffect, useState } from "react";

export type ListZoom = "compacto" | "normal" | "expandido";

const KEY = "justrack_list_zoom";
const ORDER: ListZoom[] = ["compacto", "normal", "expandido"];
const listeners = new Set<() => void>();

function read(): ListZoom {
  if (typeof window === "undefined") return "normal";
  const v = localStorage.getItem(KEY) as ListZoom | null;
  return v && ORDER.includes(v) ? v : "normal";
}

function write(v: ListZoom) {
  localStorage.setItem(KEY, v);
  listeners.forEach((l) => l());
}

export function useListZoom() {
  const [zoom, setZoomState] = useState<ListZoom>(read);
  useEffect(() => {
    const l = () => setZoomState(read());
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);

  const setZoom = (z: ListZoom) => write(z);
  const stepZoom = (dir: 1 | -1) => {
    const i = ORDER.indexOf(zoom);
    const next = ORDER[Math.max(0, Math.min(ORDER.length - 1, i + dir))];
    write(next);
  };
  return { zoom, setZoom, stepZoom, canDecrease: zoom !== ORDER[0], canIncrease: zoom !== ORDER[ORDER.length - 1] };
}

export function zoomTableClass(z: ListZoom): string {
  if (z === "compacto") return "[&_td]:py-1 [&_td]:!text-[11px] [&_th]:py-1.5 [&_th]:!text-[9px]";
  if (z === "expandido") return "[&_td]:py-4 [&_td]:!text-[14px] [&_th]:py-3 [&_th]:!text-[11px]";
  return "";
}
