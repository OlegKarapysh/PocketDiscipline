/** True for a plain row object: not null, not an array. Untrusted backup data and stored rows are checked with it. */
export function isRow(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
