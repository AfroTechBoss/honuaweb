// When a map project runs, and whether it's on right now.
import React from "react";

export type ProjectPhase = "upcoming" | "live" | "ended" | "unscheduled";

// Projects from before end times existed (055) count as running for three
// hours from their start.
const DEFAULT_LENGTH_MS = 3 * 60 * 60 * 1000;

export function projectPhase(p: { startsAt?: string | null; endsAt?: string | null }, now = Date.now()): ProjectPhase {
  if (!p.startsAt) return "unscheduled";
  const start = Date.parse(p.startsAt);
  if (!Number.isFinite(start)) return "unscheduled";
  const parsedEnd = p.endsAt ? Date.parse(p.endsAt) : NaN;
  const end = Number.isFinite(parsedEnd) ? parsedEnd : start + DEFAULT_LENGTH_MS;
  if (now < start) return "upcoming";
  return now < end ? "live" : "ended";
}

const day = (d: Date) => d.toLocaleDateString("default", { weekday: "short", day: "numeric", month: "short" });
const time = (d: Date) => d.toLocaleTimeString("default", { hour: "2-digit", minute: "2-digit" });

// "Thu 15 Oct, 13:15 – 17:00", or with both dates when it runs past midnight.
export function projectWhen(startsAt?: string | null, endsAt?: string | null): string {
  if (!startsAt) return "Anytime";
  const s = new Date(startsAt);
  if (isNaN(s.getTime())) return "Anytime";
  const e = endsAt ? new Date(endsAt) : null;
  if (!e || isNaN(e.getTime())) return `${day(s)}, ${time(s)}`;
  return s.toDateString() === e.toDateString()
    ? `${day(s)}, ${time(s)} – ${time(e)}`
    : `${day(s)}, ${time(s)} – ${day(e)}, ${time(e)}`;
}

// Re-renders the caller every `ms` so a project flips to Live (or Past)
// on time without a reload.
export function useNow(ms = 30_000) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
