import type { Ref } from "vue";
import { AppError } from "@/lib/errors";

export type RuntimeErrorCategory = "validation" | "domain" | "infrastructure" | "unknown";

export type RuntimeError = {
  category: RuntimeErrorCategory;
  message: string;
  cause: unknown;
};

type RuntimeErrorOptions = {
  validationCodes?: readonly string[];
  domainCodes?: readonly string[];
  infrastructureCodes?: readonly string[];
};

export type RuntimeUiErrorState = {
  error: Ref<string | null>;
  errorCategory?: Ref<RuntimeErrorCategory | null>;
};

function matchesCode(code: string | null, whitelist?: readonly string[]) {
  if (!code || !whitelist?.length) {
    return false;
  }
  return whitelist.some((entry) => entry.toLowerCase() === code.toLowerCase());
}

function asCode(value: unknown): string | null {
  if (value instanceof AppError) {
    return value.code;
  }
  if (typeof value === "object" && value !== null && "code" in value) {
    const code = (value as { code?: unknown }).code;
    if (typeof code === "string" && code.trim()) {
      return code;
    }
  }
  return null;
}

/**
 * Normalizes normalize runtime error to a safe shape.
 */
export function normalizeRuntimeError(err: unknown, options?: RuntimeErrorOptions): RuntimeError {
  const code = asCode(err);
  const message = err instanceof Error ? err.message : String(err);
  const probe = `${code ?? ""} ${message}`.trim();

  if (
    matchesCode(code, options?.validationCodes) ||
    /(validation|invalid|required|empty)/i.test(probe)
  ) {
    return { category: "validation", message, cause: err };
  }

  if (
    matchesCode(code, options?.domainCodes) ||
    /(domain|not_found|conflict|state|missing)/i.test(probe)
  ) {
    return { category: "domain", message, cause: err };
  }

  if (
    matchesCode(code, options?.infrastructureCodes) ||
    err instanceof AppError ||
    /(ipc|io|network|timeout|unavailable|infra|filesystem)/i.test(probe)
  ) {
    return { category: "infrastructure", message, cause: err };
  }

  return { category: "unknown", message, cause: err };
}

/**
 * Implements clear runtime ui error behavior.
 */
export function clearRuntimeUiError(ui: RuntimeUiErrorState) {
  ui.error.value = null;
  if (ui.errorCategory) {
    ui.errorCategory.value = null;
  }
}

/**
 * Sets set runtime ui error in runtime state.
 */
export function setRuntimeUiError(
  ui: RuntimeUiErrorState,
  err: unknown,
  options?: RuntimeErrorOptions
) {
  const normalized = normalizeRuntimeError(err, options);
  ui.error.value = normalized.message;
  if (ui.errorCategory) {
    ui.errorCategory.value = normalized.category;
  }
  return normalized;
}
