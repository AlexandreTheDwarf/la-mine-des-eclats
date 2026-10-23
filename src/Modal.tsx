import { useEffect, useRef, type ReactNode } from "react";

/** Native modal dialogs make the page behind them inert and contain keyboard
 * focus. Required choices cannot be escaped; optional settings can be closed. */
export function Modal({ titleId, className, onClose, children }: {
  titleId: string; className: string; onClose?: () => void; children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => { dialog?.close(); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={ref} className={`game-dialog ${className}`} aria-labelledby={titleId}
    onCancel={(event) => { event.preventDefault(); onClose?.(); }}>
    {children}
  </dialog>;
}
