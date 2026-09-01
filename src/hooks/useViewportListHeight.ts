import { useEffect, useRef, useState } from "react";

/** Mantiene una lista extendida desde su posición actual hasta el borde inferior. */
export function useViewportListHeight<T extends HTMLElement>(enabled = true, bottomGap = 24) {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState<number>();

  useEffect(() => {
    if (!enabled) {
      setHeight(undefined);
      return;
    }

    const update = () => {
      const element = ref.current;
      if (!element) return;
      const top = element.getBoundingClientRect().top;
      setHeight(Math.max(240, Math.floor(window.innerHeight - top - bottomGap)));
    };

    update();
    const observer = new ResizeObserver(update);
    if (ref.current?.parentElement) observer.observe(ref.current.parentElement);
    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [bottomGap, enabled]);

  return { ref, height };
}