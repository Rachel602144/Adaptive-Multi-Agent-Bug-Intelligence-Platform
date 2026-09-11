import type {
  BugInput,
  BugState,
  BugSummary,
  HealthResponse,
  StatsResponse,
  TeamsResponse,
} from "../types/bug";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch {
    throw new ApiError(0, `Could not reach the API at ${BASE_URL}. Is the backend running?`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, body || `Request failed with status ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<HealthResponse>("/health"),

  submitBug: (bug: BugInput) =>
    request<BugState>("/api/bugs", {
      method: "POST",
      body: JSON.stringify(bug),
    }),

  listBugs: () => request<BugSummary[]>("/api/bugs"),

  getBug: (id: number) => request<BugState>(`/api/bugs/${id}`),

  getStats: () => request<StatsResponse>("/api/stats"),

  getTeams: () => request<TeamsResponse>("/api/teams"),
};
