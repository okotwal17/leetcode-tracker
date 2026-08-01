import { useEffect, useState } from "react";

// Returns `value` only once it has stopped changing for `delay` ms. The cleanup
// cancelling the pending timer on every change is what makes this a debounce.
export function useDebounced<T>(value: T, delay = 300): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return settled;
}
