import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiFetch } from "../lib/api";

interface Invite { id: string; email: string; accepted: boolean; expires_at: string; created_at: string }

export function Invites() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const list = useQuery({ queryKey: ["invites"], queryFn: () => apiFetch<{ invites: Invite[] }>("/api/invites") });

  const invite = useMutation({
    mutationFn: (e: string) => apiFetch("/api/invites", { method: "POST", body: JSON.stringify({ email: e }) }),
    onSuccess: () => {
      setEmail("");
      setError(null);
      qc.invalidateQueries({ queryKey: ["invites"] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Failed to invite"),
  });

  const invites = list.data?.invites ?? [];

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-ink">Invite a teammate</h2>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(ev) => {
            ev.preventDefault();
            if (email.trim()) invite.mutate(email.trim());
          }}
        >
          <input className="input" type="email" placeholder="teammate@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn-primary whitespace-nowrap" disabled={invite.isPending}>
            {invite.isPending ? "Sending…" : "Send invite"}
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">Invites</h2>
        <div className="overflow-hidden rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {invites.length === 0 ? (
                <tr><td className="px-4 py-6 text-gray-400" colSpan={2}>No invites yet.</td></tr>
              ) : (
                invites.map((i) => (
                  <tr key={i.id} className="border-t">
                    <td className="px-4 py-2">{i.email}</td>
                    <td className="px-4 py-2">
                      <span className={i.accepted ? "text-green-600" : "text-gray-500"}>
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
