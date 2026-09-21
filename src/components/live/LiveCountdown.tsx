'use client';

import { useEffect, useState } from 'react';

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function computeRemaining(targetIso: string) {
  const diff = new Date(targetIso).getTime() - Date.now();
  if (diff <= 0) return null;
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

export function LiveCountdown({
  scheduledStartAt,
  onExpire,
  className,
}: {
  scheduledStartAt: string;
  onExpire?: () => void;
  className?: string;
}) {
  const [remaining, setRemaining] = useState(() => computeRemaining(scheduledStartAt));

  useEffect(() => {
    const tick = () => {
      const next = computeRemaining(scheduledStartAt);
      setRemaining(next);
      if (!next) onExpire?.();
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [scheduledStartAt, onExpire]);

  if (!remaining) {
    return (
      <p className={className} role="status">
        Starting now…
      </p>
    );
  }

  return (
    <div
      className={className}
      role="timer"
      aria-live="polite"
      aria-label={`Starts in ${remaining.days} days, ${remaining.hours} hours, ${remaining.minutes} minutes, ${remaining.seconds} seconds`}
    >
      <div className="flex flex-wrap justify-center gap-3 text-center">
        {remaining.days > 0 ? (
          <div>
            <p className="text-2xl font-bold tabular-nums">{remaining.days}</p>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Days</p>
          </div>
        ) : null}
        <div>
          <p className="text-2xl font-bold tabular-nums">{pad(remaining.hours)}</p>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Hours</p>
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums">{pad(remaining.minutes)}</p>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Minutes</p>
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums">{pad(remaining.seconds)}</p>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Seconds</p>
        </div>
      </div>
    </div>
  );
}
