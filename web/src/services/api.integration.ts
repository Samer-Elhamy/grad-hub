/* ════════════════════════════════════════
   API Integration Service — Grad Projects Hub v3
   Enhanced fetch wrapper: timeout, retry, logging interceptor
   Extends the base api.ts with production-grade resilience
   ════════════════════════════════════════ */

import { ENV } from "../config/environment";
import type {
  Idea,
  IdeaResponse,
  SwipeEvent,
  SwipeResponse,
  SwipeHistoryResponse,
  PreferenceVector,
  PreferenceResponse,
} from "../types/swipe";

/* ─── Error Types ────────────────────────────────────────── */

export class ApiIntegrationError extends Error {
  constructor(
    public status: number,
    message: string,
    public isTimeout: boolean = false,
    public isRetryable: boolean = false,
  ) {
    super(message);
    this.name = "ApiIntegrationError";
  }
}

export class TimeoutError extends ApiIntegrationError {
  constructor(ms: number) {
    super(408, `Request timed out after ${ms}ms`, true, true);
    this.name = "TimeoutError";
  }
}

/* ─── Internal State ─────────────────────────────────────── */

let isOnline = navigator.onLine;

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    isOnline = true;
    logger("info", "Network status changed: online");
  });
  window.addEventListener("offline", () => {
    isOnline = false;
    logger("warn", "Network status changed: offline");
  });
}

/** Check if the browser believes it has network connectivity */
export function getIsOnline(): boolean {
  return isOnline;
}

/* ─── Logging Interceptor ────────────────────────────────── */

type LogLevel = "debug" | "info" | "warn" | "error";

function logger(level: LogLevel, message: string, data?: unknown): void {
  if (!ENV.DEBUG && level === "debug") return;

  const prefix = `[API:${level.toUpperCase()}]`;
  const timestamp = new Date().toISOString();
  const formatted = `${timestamp} ${prefix} ${message}`;

  switch (level) {
    case "debug":
      console.debug(formatted, data ?? "");
      break;
    case "info":
      console.info(formatted, data ?? "");
      break;
    case "warn":
      console.warn(formatted, data ?? "");
      break;
    case "error":
      console.error(formatted, data ?? "");
      break;
  }
}

/* ─── Timeout Wrapper ────────────────────────────────────── */

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      controller.signal.addEventListener("abort", () => {
        reject(new TimeoutError(ms));
      });
    }),
  ]).finally(() => clearTimeout(timer));
}

/* ─── Retry Logic ────────────────────────────────────────── */

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  onRetry?: (attempt: number, error: ApiIntegrationError) => void;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = { maxRetries: ENV.API_MAX_RETRIES, baseDelayMs: 500 },
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      // Only retry on 5xx or timeout
      const isRetryable =
        err instanceof ApiIntegrationError && err.isRetryable;

      if (!isRetryable || attempt >= config.maxRetries) {
        throw err;
      }

      const delay = config.baseDelayMs * Math.pow(2, attempt);
      logger("warn", `Retry attempt ${attempt + 1}/${config.maxRetries} after ${delay}ms`, {
        error: err instanceof Error ? err.message : String(err),
      });

      config.onRetry?.(attempt, err as ApiIntegrationError);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/* ─── Core Request ───────────────────────────────────────── */

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const baseUrl = ENV.API_BASE_URL || "";
  const url = `${baseUrl}${path}`;

  logger("debug", `→ ${options.method ?? "GET"} ${url}`);

  const startTime = performance.now();

  const response = await withTimeout(
    fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    }),
    ENV.API_TIMEOUT_MS,
  );

  const duration = Math.round(performance.now() - startTime);
  logger("debug", `← ${response.status} ${url} (${duration}ms)`);

  if (!response.ok) {
    let body: Record<string, unknown> = {};
    try {
      body = await response.json();
    } catch {
      // Non-JSON error body
    }

    const message =
      (body.message as string) ??
      (body.error as string) ??
      `Request failed (${response.status})`;

    const isRetryable = response.status >= 500 || response.status === 429;

    throw new ApiIntegrationError(
      response.status,
      message,
      false,
      isRetryable,
    );
  }

  return response.json();
}

function requestWithRetry<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  return withRetry(() => request<T>(path, options));
}

/* ─── API Methods ────────────────────────────────────────── */

/** Fetch the next idea for the swipe stack */
export async function getNextIdea(): Promise<Idea> {
  const res = await requestWithRetry<IdeaResponse>("/api/ideas/next");
  return res.data;
}

/** Fetch a single idea for detail pages */
export async function getIdeaById(id: string | number): Promise<Idea> {
  const res = await requestWithRetry<IdeaResponse>(`/api/ideas/${id}`);
  return res.data;
}

/** Submit a swipe event (like, dislike, superlike) */
export async function postSwipe(
  event: SwipeEvent,
): Promise<SwipeResponse["data"]> {
  const res = await requestWithRetry<SwipeResponse>("/api/swipe", {
    method: "POST",
    body: JSON.stringify(event),
  });
  return res.data;
}

/** Get current preference vector */
export async function getPreferences(): Promise<PreferenceVector> {
  const res = await requestWithRetry<PreferenceResponse>("/api/preferences");
  return res.data;
}

/** Update preference vector */
export async function updatePreferences(
  prefs: Partial<PreferenceVector>,
): Promise<PreferenceVector> {
  const res = await requestWithRetry<PreferenceResponse>("/api/preferences", {
    method: "POST",
    body: JSON.stringify(prefs),
  });
  return res.data;
}

/** Get paginated swipe history */
export async function getHistory(
  page = 1,
  limit = 20,
  filter?: "liked" | "disliked" | "starred",
): Promise<SwipeHistoryResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (filter) params.set("filter", filter);

  const res = await requestWithRetry<
    Omit<SwipeHistoryResponse, "data"> & {
      data: SwipeHistoryResponse["data"] | { records?: SwipeHistoryResponse["data"] };
    }
  >(
    `/api/history?${params}`,
  );

  return {
    ...res,
    data: Array.isArray(res.data) ? res.data : (res.data.records ?? []),
  };
}

/** Delete one idea from swipe history */
export async function deleteHistoryItem(ideaId: number): Promise<void> {
  await requestWithRetry<void>(`/api/history/${ideaId}`, {
    method: "DELETE",
  });
}

/** Check connectivity with a lightweight HEAD request */
export async function ping(): Promise<boolean> {
  try {
    await request<unknown>("/api/health", { method: "HEAD" });
    return true;
  } catch {
    return false;
  }
}
