const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Formats a naive "timestamp without time zone" value (e.g. "2026-08-13T14:00:00" or
 * "2026-08-13 14:00:00") as a wall-clock string, without letting Date perform any
 * timezone conversion. Stateside Deliveries operates in a single timezone (AST), so the
 * stored digits ARE the intended local time regardless of server/browser timezone.
 */
export function formatNaiveTimestamp(value: string): string {
  const match = value.match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!match) return value;
  const [, year, month, day, hour, minute] = match;
  const h = Number(hour);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${MONTHS[Number(month) - 1]} ${Number(day)}, ${year}, ${hour12}:${minute} ${period}`;
}
