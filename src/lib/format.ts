const dateFmt = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Berlin" });
const longFmt = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" });
const dateTimeFmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });
const rel = new Intl.RelativeTimeFormat("de-DE", { numeric: "auto" });

/** "2026-11-09" → "9. Nov. 2026" */
export const formatDay = (iso: string | null, long = false) => (iso ? (long ? longFmt : dateFmt).format(new Date(`${iso}T12:00:00Z`)) : "");

export const formatDateTime = (d: Date | number) => dateTimeFmt.format(d);

/** "vor 5 Minuten", "gestern", sonst Datum. */
export function formatRelative(d: Date | number, now = Date.now()) {
  const diff = (typeof d === "number" ? d : d.getTime()) - now;
  const min = Math.round(diff / 60_000);
  if (Math.abs(min) < 1) return "gerade eben";
  if (Math.abs(min) < 60) return rel.format(min, "minute");
  const h = Math.round(min / 60);
  if (Math.abs(h) < 24) return rel.format(h, "hour");
  const days = Math.round(h / 24);
  if (Math.abs(days) < 7) return rel.format(days, "day");
  return dateFmt.format(d);
}
