// One banner for the whole app when the API throttles us. It sits above the
// router (see App.tsx) rather than inside Layout, because /auth/google is rate
// limited too and the login page renders outside the layout.
//
// Individual callers still surface their own inline 429 message through
// ApiError.message — this is the ambient "you're being throttled, here's when it
// clears" signal that a per-form message can't give.
import { useEffect, useState } from "react";
import { setRateLimitedHandler } from "../api/client";

interface Throttle {
  detail: string;
  until: number; // epoch ms when the limit lifts
}

export default function RateLimitNotice() {
  const [throttle, setThrottle] = useState<Throttle | null>(null);
  // Ticking a clock rather than decrementing a counter: a background tab gets
  // its timers throttled, so a counter would drift and under-report the wait.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setRateLimitedHandler((detail, retryAfter) => {
      const until = Date.now() + retryAfter * 1000;
      // A later 429 with a longer wait wins; a shorter one shouldn't cut the
      // visible countdown short while the first limit is still in effect.
      setThrottle((current) =>
        current && current.until > until ? current : { detail, until },
      );
    });
    return () => setRateLimitedHandler(null);
  }, []);

  useEffect(() => {
    if (!throttle) return;

    const id = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= throttle.until) setThrottle(null); // also stops this interval
    }, 500);

    return () => clearInterval(id);
  }, [throttle]);

  if (!throttle) return null;
  const seconds = Math.max(0, Math.ceil((throttle.until - now) / 1000));

  return (
    <div className="rate-limit-notice" role="status" aria-live="polite">
      <div className="rate-limit-notice__text">
        <strong>Slow down a moment.</strong> {throttle.detail}
        {seconds > 0 && ` (${seconds}s)`}
      </div>
      <button
        type="button"
        className="rate-limit-notice__dismiss"
        onClick={() => setThrottle(null)}
        aria-label="Dismiss"
      >
        {"\u00D7"}
      </button>
    </div>
  );
}
