export const defaultAutosaveIntervalMs = 120_000;

export function parseAutosaveInterval(value: string | undefined) {
  const parsed = Number(value ?? defaultAutosaveIntervalMs);

  if (!Number.isFinite(parsed) || parsed < 1_000) {
    return defaultAutosaveIntervalMs;
  }

  return Math.min(parsed, 30 * 60_000);
}
