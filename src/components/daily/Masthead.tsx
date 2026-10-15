export function Masthead({ issue, right }: { issue: number; right: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-navy pt-3.5 pb-2">
      <span className="label">The Daily · No. {String(issue).padStart(3, "0")}</span>
      <span className="label">{right}</span>
    </div>
  );
}

/** "Thu 15 Oct" for a YYYY-MM-DD game date. */
export function shortDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
