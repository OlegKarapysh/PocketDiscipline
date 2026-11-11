/**
 * The local calendar day of a moment as `YYYY-MM-DD`: the key every dated row is stored and
 * compared under. Built from the date's own parts so it never depends on locale data.
 */
export function toDateKey(date: Date): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
