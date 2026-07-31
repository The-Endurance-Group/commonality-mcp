import { type ReactNode, useEffect, useRef, useState } from "react";
import { streamChat } from "../lib/api";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

// Turns **bold** markers from the model's reply into real bold text (the
// model writes markdown; without this the asterisks show up literally).
// Everything else stays plain text - whitespace-pre-wrap on the bubble
// handles line breaks and numbered lists already.
function renderChatText(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

// The chat UI + streaming logic shared between the Dashboard's "Try it
// here" panel and the post-onboarding chat step - same conversation engine,
// different shells around it (CollapsibleCard vs. a plain onboarding Card).
export function ChatConversation({
  initialTurns = [],
  examplePrompts = [],
  placeholder = "Ask about a warm path, a prospect, or a company…",
  showUpsell = false,
  onTurnsChange,
  onReplyComplete,
}: {
  initialTurns?: ChatTurn[];
  examplePrompts?: string[];
  placeholder?: string;
  showUpsell?: boolean;
  onTurnsChange?: (turns: ChatTurn[]) => void;
  onReplyComplete?: (turns: ChatTurn[]) => void;
}) {
  const [turns, setTurns] = useState<ChatTurn[]>(initialTurns);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const turnsRef = useRef(turns);
  turnsRef.current = turns;

  const userTurnCount = turns.filter((t) => t.role === "user").length;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, busy, thinking]);

  useEffect(() => {
    onTurnsChange?.(turns);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turns]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const nextTurns = [...turns, { role: "user" as const, content: text }];
    setTurns(nextTurns);
    setInput("");
    setBusy(true);
    setThinking(true);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    // Stream the reply in as it's generated (like Claude.ai) rather than
    // waiting for the whole thing and popping it in at once. Appends a new
    // assistant turn on the first text chunk, then grows it in place.
    let started = false;
    let succeeded = false;
    try {
      await streamChat(
        nextTurns,
        (delta) => {
          setThinking(false);
          setTurns((t) => {
            if (!started) {
              started = true;
              return [...t, { role: "assistant", content: delta }];
            }
            const last = t[t.length - 1];
            return [...t.slice(0, -1), { role: "assistant" as const, content: last.content + delta }];
          });
        },
        () => setThinking(true),
        controller.signal,
      );
      succeeded = true;
    } catch (e) {
      // A user-initiated Stop aborts the fetch - that's not a failure, just
      // keep whatever text streamed in so far.
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
      setThinking(false);
    }
    if (succeeded) onReplyComplete?.(turnsRef.current);
  }

  function stop() {
    abortRef.current?.abort();
  }

  function fillPrompt(prompt: string) {
    setInput(prompt);
    textareaRef.current?.focus();
  }

  return (
    <>
      <div ref={scrollRef} className="flex max-h-96 flex-col gap-3 overflow-y-auto rounded-lg bg-gray-50 p-3">
        {turns.length === 0 ? (
          <p className="text-sm text-lavender">Try one of the example questions below, or ask your own.</p>
        ) : (
          turns.map((t, i) => (
            <div
              key={i}
              className={`max-w-[90%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm sm:max-w-[85%] ${
                t.role === "user" ? "ml-auto bg-tint-accent text-ink" : "bg-white text-ink shadow-sm"
              }`}
            >
              {t.role === "assistant" ? renderChatText(t.content) : t.content}
            </div>
          ))
        )}
        {thinking && <div className="max-w-[85%] rounded-lg bg-white px-3 py-2 text-sm text-lavender shadow-sm">Thinking…</div>}
      </div>

      {userTurnCount === 0 && examplePrompts.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {examplePrompts.map((prompt) => (
            <button
              key={prompt}
              className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-left text-xs font-medium text-ink hover:border-brand hover:text-brand"
              onClick={() => fillPrompt(prompt)}
              disabled={busy}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {showUpsell && userTurnCount >= 3 && (
        <p className="mt-3 rounded-md bg-tint-brand p-3 text-sm text-ink">
          Liking this? Connect Commonality to Claude, ChatGPT, or Copilot below for unlimited use, right in the
          AI you already work in.
        </p>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-3 flex flex-col gap-2">
        <textarea
          ref={textareaRef}
          className="input min-h-28 resize-y text-base"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={placeholder}
          disabled={busy}
        />
        {busy ? (
          <button className="btn-secondary w-full sm:w-auto sm:self-end" onClick={stop}>
            Stop
          </button>
        ) : (
          <button className="btn-primary w-full sm:w-auto sm:self-end" disabled={!input.trim()} onClick={send}>
            Send
          </button>
        )}
      </div>
    </>
  );
}
