/* ════════════════════════════════════════
   API Client — Grad Projects Hub v3
   Typed fetch wrapper for all endpoints
   ════════════════════════════════════════ */

import type {
  Idea,
  IdeaResponse,
  SwipeEvent,
  SwipeResponse,
  SwipeHistoryResponse,
  PreferenceVector,
  PreferenceResponse,
} from "../types/swipe";
import { mapIdea } from "./mapper";

const BASE_URL = "/api";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      body.message ?? body.error ?? `Request failed (${res.status})`,
    );
  }

  return res.json();
}

/** Fetch the next idea for the swipe stack */
export async function fetchNextIdea(excludeIds: string[] = []): Promise<Idea> {
  const params = new URLSearchParams();
  if (excludeIds.length > 0) params.set("exclude_ids", excludeIds.join(","));
  const path = params.toString() ? `/ideas/next?${params}` : "/ideas/next";
  const res = await request<IdeaResponse>(path);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mapIdea(res.data as any);
}

/** Fetch a single idea for detail pages */
export async function fetchIdeaById(id: string | number): Promise<Idea> {
  const res = await request<IdeaResponse>(`/ideas/${id}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mapIdea(res.data as any);
}

/** Submit a swipe event (like, dislike, superlike) */
export async function submitSwipe(event: SwipeEvent): Promise<SwipeResponse["data"]> {
  const res = await request<SwipeResponse>("/swipe", {
    method: "POST",
    body: JSON.stringify(event),
  });
  return res.data;
}

/** Get current preference vector */
export async function fetchPreferences(): Promise<PreferenceVector> {
  const res = await request<PreferenceResponse>("/preferences");
  return res.data;
}

/** Update preference vector */
export async function updatePreferences(
  prefs: Partial<PreferenceVector>,
): Promise<PreferenceVector> {
  const res = await request<PreferenceResponse>("/preferences", {
    method: "POST",
    body: JSON.stringify(prefs),
  });
  return res.data;
}

/** Get paginated swipe history */
export async function fetchHistory(
  page = 1,
  limit = 20,
  filter?: "liked" | "disliked" | "starred",
): Promise<SwipeHistoryResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (filter) params.set("filter", filter);

  const res = await request<
    Omit<SwipeHistoryResponse, "data"> & {
      data: SwipeHistoryResponse["data"] | { records?: SwipeHistoryResponse["data"] };
    }
  >(`/history?${params}`);

  const records = Array.isArray(res.data) ? res.data : (res.data.records ?? []);

  return {
    ...res,
    data: records.map((record) => ({
      ...record,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      idea: record.idea ? mapIdea(record.idea as any) : undefined,
    })),
  };
}

/** Delete one idea from swipe history */
export async function deleteHistoryItem(ideaId: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/history/${ideaId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      body.message ?? body.error ?? `Request failed (${res.status})`,
    );
  }
}
