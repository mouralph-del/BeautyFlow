import { useEffect, useRef } from "react";

const selector = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export default function useAccessibleDrawer(open, onClose, paused = false) {
  const drawerRef = useRef(null);
  const previousFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open || paused) return undefined;
    const drawer = drawerRef.current;
    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () => Array.from(drawer?.querySelectorAll(selector) || []);
    focusable()[0]?.focus();
    if (!focusable().length) drawer?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") { event.preventDefault(); onCloseRef.current?.(); return; }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) { event.preventDefault(); return; }
      const first = items[0]; const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); document.body.style.overflow = previousOverflow; previousFocusRef.current?.focus?.(); };
  }, [open, paused]);
  return drawerRef;
}
