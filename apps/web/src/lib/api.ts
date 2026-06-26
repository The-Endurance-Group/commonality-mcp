import { useAuthStore } from "./store";

// Fetch wrapper that attaches the Commonality JWT (obtained via the Clerk
// session exchange) to every /api request.
export async function apiFetch<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;
  const res = await fetch(path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error((body.error as string) || (body.message as string) || res.statusText);
  }
  return body as T;
}
