import { useEffect, useState } from 'react';

/** useState that survives reloads. Object values are merged over `initial` so new keys get defaults. */
export function useLocalState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved === null) return initial;
      const parsed = JSON.parse(saved);
      return typeof initial === 'object' && initial !== null ? { ...initial, ...parsed } : parsed;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Private mode or storage full: preferences just won't persist.
    }
  }, [key, value]);

  return [value, setValue];
}
