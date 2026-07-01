import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

interface Invite { id: string; email: string; accepted: boolean; expires_at: string; created_at: string }
interface BulkSummary { invited: number; skipped: number; invalid: number }
interface Company { domain: string | null }

const MAX_BULK = 50;

/** Split a textarea blob into candidate emails by comma / whitespace / newline. */
function parseEmails(text: string): string[] {
  return Array.from(
    new Set(
      text
        .split(/[\s,;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

export function Invites() {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<BulkSummary | null>(null);

  const list = useQuery({ queryKey: ["invites"], queryFn: () => apiFetch<{ invites: Invite[] }>("/api/invites") });
  const company = useQuery({ queryKey: ["company"], queryFn: () => apiFetch<Company>("/api/companies/me") });

  const parsed = parseEmails(text);
  const overLimit = parsed.length > MAX_BULK;

  const invite = useMutation({
    mutationFn: (emails: string[]) =>
      apiFetch<{ summary: BulkSummary }>("/api/invites/bulk", {
        method: "POST",
        body: JSON.stringify({ emails }),
      }),
    onSuccess: (res) => {
      setText("");
      setError(null);
      setSummary(res.summary);
      qc.invalidateQueries({ queryKey: ["invites"] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Failed to invite"),
  });

  const invites = list.data?.invites ?? [];

  return (
    <div className="space-y-8">
      <DomainSection domain={company.data?.domain ?? null} />

      <section>
        <h2 className="text-lg font-semibold text-ink">Invite teammates</h2>
        <p className="mt-1 text-sm text-lavender">
          Paste up to {MAX_BULK} emails, separated by commas, spaces, or new lines.
        </p>
        <form
          className="mt-3 space-y-2"
          onSubmit={(ev) => {
            ev.preventDefault();
            if (parsed.length && !overLimit) invite.mutate(parsed);
          }}
        >
          <textarea
            className="input h-28"
            placeholder={"alex@company.com, sam@company.com\njordan@company.com"}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <span className={`text-sm ${overLimit ? "text-red-600" : "text-lavender"}`}>
              {parsed.length} email{parsed.length === 1 ? "" : "s"}
              {overLimit ? ` - over the ${MAX_BULK} limit` : ""}
            </span>
            <button className="btn-primary whitespace-nowrap" disabled={invite.isPending || parsed.length === 0 || overLimit}>
              {invite.isPending ? "Sending…" : `Send ${parsed.length || ""} invite${parsed.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </form>
        {summary && (
          <p className="mt-2 text-sm text-lavender">
            Invited {summary.invited} · Skipped {summary.skipped}
            {summary.invalid ? ` · Invalid ${summary.invalid}` : ""}
          </p>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">Invites</h2>
        <div className="overflow-hidden rounded-lg border border-gray-100 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-lavender">
              <tr>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {invites.length === 0 ? (
                <tr><td className="px-4 py-6 text-lavender" colSpan={2}>No invites yet.</td></tr>
              ) : (
                invites.map((i) => (
                  <tr key={i.id} className="border-t border-gray-100">
                    <td className="px-4 py-2">{i.email}</td>
                    <td className="px-4 py-2">
                      <span className={i.accepted ? "text-accent" : "text-lavender"}>
                        {i.accepted ? "Accepted" : "Pending"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function DomainSection({ domain }: { domain: string | null }) {
  const qc = useQueryClient();
  const [value, setValue] = useState(domain ?? "");
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Sync in the fetched value once it arrives, without clobbering an in-progress edit.
  useEffect(() => {
    if (!dirty && domain !== null) setValue(domain);
  }, [domain, dirty]);

  const save = useMutation({
    mutationFn: () =>
      apiFetch("/api/companies/me", {
        method: "PATCH",
        body: JSON.stringify({ domain: value.trim().toLowerCase() || null }),
      }),
    onSuccess: () => {
      setError(null);
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      qc.invalidateQueries({ queryKey: ["company"] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Failed to save"),
  });

  return (
    <section className="rounded-lg border border-gray-100 bg-white p-6">
      <h2 className="text-lg font-semibold text-ink">Company email domain</h2>
      <p className="mt-1 text-sm text-lavender">
        Anyone who signs up with this email domain automatically joins your workspace - no invite
        needed. Didn't set this during onboarding? Add or change it here.
      </p>
      <form
        className="mt-3 flex items-center gap-2"
        onSubmit={(ev) => {
          ev.preventDefault();
          save.mutate();
        }}
      >
        <input
          className="input"
          placeholder="acme.com"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setDirty(true);
          }}
        />
        <button className="btn-primary whitespace-nowrap" disabled={save.isPending}>
          {save.isPending ? "Saving…" : saved ? "Saved!" : "Save"}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}
