import { useEffect, useState } from "react";

export function useCountdown(targetIso: string | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!targetIso) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [targetIso]);

  if (!targetIso) return { totalMs: 0, isPast: true };

  const totalMs = new Date(targetIso).getTime() - now;
  return { totalMs, isPast: totalMs <= 0 };
}

export function formatHoursMinutes(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${minutes.toString().padStart(2, "0")}`;
}

export const COUNTDOWN_DISPLAY_THRESHOLD_MS = 72 * 60 * 60 * 1000;

export function formatShiftDateTime(iso: string): string {
  const date = new Date(iso);
  const weekday = date.toLocaleDateString(undefined, { weekday: "long" });
  const monthDay = date.toLocaleDateString(undefined, { month: "long", day: "numeric" });
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${weekday}, ${monthDay} ${time}`;
}