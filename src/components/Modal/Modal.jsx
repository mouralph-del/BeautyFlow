import { useEffect, useId, useRef } from "react";
import "./Modal.css";

function getFocusable(el) {
  if (!el) return [];
  return Array.from(el.querySelectorAll('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'));
}

export default function Modal({
  isOpen,
  onClose,
  title,
  ariaLabel,
  labelledBy,
  describedBy,
  children,
  className = "",
  overlayClassName = "",
  closeOnOverlayClick = true,
  closeOnEscape = true,
  initialFocusRef,
}) {
  const overlayRef = useRef(null);
  const previouslyFocused = useRef(null);
  const onCloseRef = useRef(onClose);
  const generatedTitleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    previouslyFocused.current = document.activeElement;
    const overlay = overlayRef.current;
    const dialog = overlay?.querySelector("[role=dialog]");
    const focusable = getFocusable(dialog);
    const focusDialog = () => {
      if (initialFocusRef?.current) initialFocusRef.current.focus();
      else if (focusable.length) focusable[0].focus();
      else dialog?.focus();
    };
    focusDialog();
    const focusFrame = window.requestAnimationFrame(focusDialog);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e) => {
      if (e.key === "Escape" && closeOnEscape) {
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }

      if (e.key !== "Tab") return;
      const items = getFocusable(dialog);
      if (!items.length) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (!dialog?.contains(document.activeElement)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    const keepFocusInside = (event) => {
      if (dialog && !dialog.contains(event.target)) {
        (getFocusable(dialog)[0] || dialog).focus();
      }
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", keepFocusInside);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", keepFocusInside);
      document.body.style.overflow = previousOverflow;
      try {
        previouslyFocused.current?.focus();
      } catch {
        // Ignore focus restoration failures in unsupported browsers.
      }
    };
  }, [closeOnEscape, initialFocusRef, isOpen]);

  if (!isOpen) return null;

  const labelId = labelledBy || (title ? `bf-modal-title-${generatedTitleId.replaceAll(":", "")}` : undefined);

  return (
    <div
      className={`bf-modal-overlay ${overlayClassName}`.trim()}
      ref={overlayRef}
      role="presentation"
      onMouseDown={(e) => {
        if (!closeOnOverlayClick) return;
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <section
        className={`bf-modal ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={labelId}
        aria-describedby={describedBy}
        tabIndex={-1}
      >
        {title && (
          <h2 id={labelId} className="bf-modal-title">
            {title}
          </h2>
        )}
        {children}
      </section>
    </div>
  );
}
