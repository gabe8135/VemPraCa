import { useEffect } from "react";

// Versão simples: converte deltaY em scroll horizontal.
// Recomendado para listas com overflow-x-auto.
export default function useHorizontalWheelScroll(ref, options = {}) {
  const { step = 1, onlyWhenScrollable = true } = options;

  useEffect(() => {
    const el = ref?.current;
    if (!el) return;

    const onWheel = (e) => {
      if (e.deltaY === 0) return;
      if (onlyWhenScrollable && el.scrollWidth <= el.clientWidth) return;

      e.preventDefault();
      el.scrollLeft += e.deltaY * step;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [ref, step, onlyWhenScrollable]);
}
