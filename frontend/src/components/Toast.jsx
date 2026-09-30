import { useCallback, useEffect, useState } from 'react';

export function useToast() {
  const [toast, setToast] = useState({ message: '', visible: false });
  const show = useCallback((message) => setToast({ message, visible: true, at: Date.now() }), []);

  useEffect(() => {
    if (!toast.visible) return undefined;
    const id = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  return [toast, show];
}

export function Toast({ toast }) {
  return (
    <div className={`toast px ${toast.visible ? 'show' : ''}`} role="status" aria-live="polite">
      {toast.message}
    </div>
  );
}
