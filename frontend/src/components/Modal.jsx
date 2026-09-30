import { useEffect, useRef } from 'react';
import { ICONS } from '../sprites';
import { Sprite } from './Sprite';

/** A native <dialog>: focus trapping, Esc to close and a backdrop for free. */
export function Modal({ title, onClose, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog.open) dialog.showModal();
    dialog.querySelector('[data-autofocus]')?.focus();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-label={title}
      // Esc closes the dialog natively; the guard ignores stray close events from dev-mode remounts.
      onClose={() => !ref.current?.open && onClose()}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-card px">
        <header className="modal-header">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Sprite rows={ICONS.close} className="icon-sm" />
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </dialog>
  );
}
