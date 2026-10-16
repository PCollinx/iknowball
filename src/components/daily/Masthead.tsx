export function Masthead({ issue, right }: { issue: number; right: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-navy pt-3.5 pb-2">
      <span className="label">The Daily · No. {String(issue).padStart(3, "0")}</span>
      <span className="label">{right}</span>
    </div>
  );
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Thu 15 Oct" for a YYYY-MM-DD game date. Built by hand, not with
 * toLocaleDateString, so the server and the browser print the same text. */
export function shortDate(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}
