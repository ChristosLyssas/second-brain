// ─── Calendar events: repeat rules and lookups ────────────────────────────────
// Event shape: { id, title, date:"YYYY-MM-DD", allDay, start:"HH:MM"|"", end:"HH:MM"|"",
//                location, notes, color, repeat:"none"|"weekly"|"monthly"|"yearly" }

export const EVENT_COLORS = ["#60a5fa", "#2dd4bf", "#34d399", "#fbbf24", "#fb923c", "#f87171", "#f472b6", "#a78bfa"];
export const REPEATS = ["none", "weekly", "monthly", "yearly"];

export function parseISODate(s) {
  const [y, m, d] = String(s || "").split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
}

const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// Does this event happen on `day`? (repeats start from the event's own date)
export function occursOn(ev, day) {
  const s = parseISODate(ev.date);
  if (!s) return false;
  const d = midnight(day);
  if (d < s) return false;
  switch (ev.repeat) {
    case "weekly":  return Math.round((d - s) / 86400000) % 7 === 0;   // round: DST-safe
    case "monthly": return d.getDate() === s.getDate();
    case "yearly":  return d.getDate() === s.getDate() && d.getMonth() === s.getMonth();
    default:        return d.getTime() === s.getTime();
  }
}

// All-day first, then by start time
const timeKey = (e) => (e.allDay || !e.start ? "" : e.start);
export const byTime = (a, b) => timeKey(a).localeCompare(timeKey(b)) || String(a.title).localeCompare(String(b.title));

export function eventsOn(events, day) {
  return events.filter((e) => occursOn(e, day)).sort(byTime);
}

// Next occurrences from `from` (inclusive) over `days` days → [{ ev, date }]
export function upcomingOccurrences(events, from = new Date(), days = 30, limit = 8) {
  const out = [];
  const start = midnight(from);
  for (let i = 0; i < days && out.length < limit; i++) {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    for (const ev of eventsOn(events, day)) {
      if (out.length >= limit) break;
      out.push({ ev, date: day });
    }
  }
  return out;
}

// "Ολοήμερο" / "20:30" / "20:30–23:00"
export function timeLabel(ev, t) {
  if (ev.allDay || !ev.start) return t.allDay;
  return ev.end ? `${ev.start}–${ev.end}` : ev.start;
}
