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

type ChatStreamEvent =
  | { type: "delta"; text: string }
  | { type: "tool_start" }
  | { type: "done" }
  | { type: "error"; message: string };

// The in-app chat panel streams its reply as newline-delimited JSON (see
// apps/server/src/api/chat.ts) instead of one JSON blob, so the UI can render
// text as it's generated - the same "typing" feel as Claude.ai - rather than
// popping the whole answer in at once.
export async function streamChat(
  messages: { role: "user" | "assistant"; content: string }[],
  onDelta: (text: string) => void,
  onToolStart: () => void,
): Promise<void> {
  const token = useAuthStore.getState().token;
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok || !res.body) {
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    throw new Error((body.error as string) || (body.message as string) || res.statusText);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as ChatStreamEvent;
      if (event.type === "delta") onDelta(event.text);
      else if (event.type === "tool_start") onToolStart();
      else if (event.type === "error") throw new Error(event.message);
      else if (event.type === "done") return;
    }
  }
}
