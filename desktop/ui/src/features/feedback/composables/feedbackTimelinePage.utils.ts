/**
 * Implements to error behavior.
 */
export function toError(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Formats values for format date time.
 */
export function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

/**
 * Implements score tone class behavior.
 */
export function scoreToneClass(score: number): "success" | "neutral" | "error" {
  if (score >= 80) {
    return "success";
  }
  if (score >= 60) {
    return "neutral";
  }
  return "error";
}
