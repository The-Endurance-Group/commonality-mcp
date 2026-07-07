import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiFetch } from "../lib/api";

interface Company { plan: string }

interface CreditEvent {
  id: string;
  action: string;
  target: string | null;
  created_at: string;
  user_email: string | null;
}
interface CreditEventsResponse {
  events: CreditEvent[];
  page: number;
  pageSize: number;
  total: number;
}

const ACTION_LABELS: Record<string, string> = {
  analyze_prospect: "Analyzed a prospect",
  analyze_prospect_posts: "Fetched a prospect's posts",
  search_company_by_name: "Searched for a company",
  analyze_company_posts: "Fetched a company's posts",
  search_company_roles: "Searched a company's people by role",
  analyze_company_candidate: "Analyzed a company candidate",
  search_prospects: "Searched prospects",
};

export function Billing() {
  const [params] = useSearchParams();
  const status = params.get("status");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);

  const company = useQuery({ queryKey: ["company"], queryFn: () => apiFetch<Company>("/api/companies/me") });
  const isPro = company.data?.plan === "pro";
  const events = useQuery({
    queryKey: ["usage-events", page],
    queryFn: () => apiFetch<CreditEventsResponse>(`/api/usage/events?page=${page}`),
  });

  async function go(path: string) {
    setBusy(true);
    setError(null);
    try {
      const { url } = await apiFetch<{ url: string }>(path, { method: "POST" });
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Billing unavailable");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h2 className="text-lg font-semibold text-ink">Billing</h2>

      {status === "success" && (
        <p className="rounded-md bg-tint-accent p-3 text-sm text-accent">Thanks! Your subscription is active.</p>
      )}
      {status === "cancelled" && (
        <p className="rounded-md bg-gray-50 p-3 text-sm text-lavender">Checkout cancelled - no charge made.</p>
      )}

      <div className="rounded-lg border border-gray-100 bg-white p-6">
        <div className="text-sm text-lavender">Current plan</div>
        <div className="mt-1 text-2xl font-semibold text-ink capitalize">{company.data?.plan ?? "…"}</div>

        <div className="mt-5">
          {isPro ? (
            <button className="btn-secondary" disabled={busy} onClick={() => go("/api/billing/portal")}>
              {busy ? "Opening…" : "Manage subscription"}
            </button>
          ) : (
            <button className="btn-primary" disabled={busy} onClick={() => go("/api/billing/checkout")}>
              {busy ? "Redirecting…" : "Upgrade to Pro - $49/mo, 200 credits/mo"}
            </button>
          )}
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      <div className="rounded-lg border border-gray-100 bg-white p-6">
        <div className="mb-1 text-sm font-medium text-ink">Credit usage log</div>
        <p className="mb-4 text-sm text-lavender">Every credit charged to your workspace - who used it, when, and on what.</p>

        {events.isLoading ? (
          <p className="text-sm text-lavender">Loading…</p>
        ) : !events.data?.events.length ? (
          <p className="text-sm text-lavender">No credits used yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-lavender">
                  <tr>
                    <th className="px-4 py-2">Time</th>
                    <th className="px-4 py-2">User</th>
                    <th className="px-4 py-2">Action</th>
                    <th className="px-4 py-2">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {events.data.events.map((e) => (
                    <tr key={e.id} className="border-t border-gray-100">
                      <td className="whitespace-nowrap px-4 py-2 text-lavender">{new Date(e.created_at).toLocaleString()}</td>
                      <td className="px-4 py-2 text-ink">{e.user_email ?? "-"}</td>
                      <td className="px-4 py-2 text-ink">{ACTION_LABELS[e.action] ?? e.action}</td>
                      <td className="max-w-xs truncate px-4 py-2 text-lavender" title={e.target ?? undefined}>
                        {e.target ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-lavender">
                {events.data.total === 0
                  ? "0 events"
                  : `${page * events.data.pageSize + 1}-${Math.min((page + 1) * events.data.pageSize, events.data.total)} of ${events.data.total}`}
              </span>
              <div className="flex gap-2">
                <button className="btn-secondary" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                  Previous
                </button>
                <button
                  className="btn-secondary"
                  disabled={(page + 1) * events.data.pageSize >= events.data.total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
