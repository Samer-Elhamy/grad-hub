/* ════════════════════════════════════════
   Environment Config — Grad Projects Hub v3
   Centralized env access with validation
   ════════════════════════════════════════ */

export interface Environment {
  /** Base URL for REST API */
  API_BASE_URL: string;
  /** WebSocket stream URL */
  WS_URL: string;
  /** Current environment name */
  ENV: "development" | "production";
  /** Whether debug logging is enabled */
  DEBUG: boolean;
  /** API request timeout in milliseconds */
  API_TIMEOUT_MS: number;
  /** Maximum retries for 5xx errors */
  API_MAX_RETRIES: number;
  /** Card buffer threshold — fetch more when below this */
  CARD_BUFFER_MIN: number;
  /** Number of cards to pre-fetch */
  CARD_PREFETCH_COUNT: number;
}

function getEnvVar(key: string, fallback: string): string {
  // Vite exposes env vars via import.meta.env
  const value = (import.meta.env as Record<string, string | undefined>)[key];
  return value ?? fallback;
}

function getEnv(): Environment {
  const env = getEnvVar("VITE_APP_ENV", "development") as Environment["ENV"];
  const isDev = env === "development";

  return {
    ENV: env,
    API_BASE_URL: getEnvVar("VITE_API_BASE_URL", isDev ? "" : "http://localhost:3000"),
    WS_URL: getEnvVar("VITE_WS_URL", isDev ? "" : "ws://localhost:3000/ws/stream"),
    DEBUG: getEnvVar("VITE_APP_DEBUG", String(isDev)) === "true",
    API_TIMEOUT_MS: Number(getEnvVar("VITE_API_TIMEOUT_MS", "10000")),
    API_MAX_RETRIES: Number(getEnvVar("VITE_API_MAX_RETRIES", "1")),
    CARD_BUFFER_MIN: Number(getEnvVar("VITE_CARD_BUFFER_MIN", "3")),
    CARD_PREFETCH_COUNT: Number(getEnvVar("VITE_CARD_PREFETCH_COUNT", "5")),
  };
}

/** Global environment configuration singleton */
export const ENV = getEnv();

// Validate critical config on startup
if (ENV.ENV === "production") {
  const missing: string[] = [];
  if (!ENV.API_BASE_URL) missing.push("VITE_API_BASE_URL");
  if (!ENV.WS_URL) missing.push("VITE_WS_URL");
  if (missing.length > 0) {
    console.error(
      `[Environment] Missing required env vars in production: ${missing.join(", ")}`,
    );
  }
}
