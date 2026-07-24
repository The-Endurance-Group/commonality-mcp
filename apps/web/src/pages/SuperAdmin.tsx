import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { apiFetch } from "../lib/api";
import { ACTION_LABELS } from "./Billing";

interface ActionStat { action: string; count: number }
interface PlatformStats { total: number; byAction: ActionStat[] }

interface Company {
  id: string;
  name: string;
  domain: string | null;
  plan: "free" | "pro";
  created_at: string;
  user_count: number;
  credits_used: number;
  credits_limit: number;
}
interface CompanyUser {
  id: string;
  email: string;
  role: "admin" | "member";
  created_at: string;
}
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

export function SuperAdmin() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [eventsPage, setEventsPage] = useState(0);

  const companies = useQuery({
    queryKey: ["superadmin-companies"],
    queryFn: () => apiFetch<{ companies: Company[] }>("/api/superadmin/companies"),
  });

  const stats = useQuery({
    queryKey: ["superadmin-stats"],
    queryFn: () => apiFetch<PlatformStats>("/api/superadmin/stats"),
  });

  const users = useQuery({
    queryKey: ["superadmin-company-users", expanded],
    queryFn: () => apiFetch<{ users: CompanyUser[] }>(`/api/superadmin/companies/${expanded}/users`),
    enabled: !!expanded,
  });

  const usageEvents = useQuery({
    queryKey: ["superadmin-company-usage-events", expanded, eventsPage],
    queryFn: () =>
      apiFetch<CreditEventsResponse>(`/api/superadmin/companies/${expanded}/usage-events?page=${eventsPage}`),
    enabled: !!expanded,
  });

  function toggleExpanded(companyId: string) {
    setExpanded((e) => (e === companyId ? null : companyId));
    setEventsPage(0);
  }

  async function setPlan(companyId: string, plan: "free" | "pro") {
    setBusyId(companyId);
    try {
      await apiFetch(`/api/superadmin/companies/${companyId}/plan`, {
        method: "POST",
        body: JSON.stringify({ plan }),
      });
      await qc.invalidateQueries({ queryKey: ["superadmin-companies"] });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-ink">All accounts</h2>
        <p className="text-sm text-lavender">Every company workspace - team size, plan, and this month's credit usage.</p>
      </div>

      <div className="rounded-lg border border-gray-100 bg-white p-6">
        <div className="mb-1 text-sm font-medium text-ink">Platform-wide action breakdown</div>
        <p className="mb-4 text-sm text-lavender">Every credit event ever charged, across all companies, by type.</p>
        {stats.isLoading ? (
          <p className="text-sm text-lavender">Loading…</p>
        ) : !stats.data?.byAction.length ? (
          <p className="text-sm text-lavender">No credit events yet.</p>
        ) : (
          <div className="space-y-2">
            {stats.data.byAction.map((s, i) => {
              const pct = stats.data!.total ? Math.round((s.count / stats.data!.total) * 100) : 0;
              return (
                <div key={s.action} className="flex items-center gap-3">
                  <span className="w-48 shrink-0 truncate text-sm text-ink">
                    {i === 0 && <span className="mr-1" title="Most common">🏆</span>}
                    {ACTION_LABELS[s.action] ?? s.action}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-24 shrink-0 text-right text-sm text-lavender">
                    {s.count} ({pct}%)
                  </span>
                </div>
              );
            })}
            <p className="pt-1 text-xs text-lavender">{stats.data.total} total events</p>
          </div>
        )}
      </div>

      {companies.isLoading ? (
        <p className="text-sm text-lavender">Loading…</p>
      ) : !companies.data?.companies.length ? (
        <p className="text-sm text-lavender">No companies yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-100 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-lavender">
              <tr>
                <th className="px-4 py-2">Company</th>
                <th className="px-4 py-2">Domain</th>
                <th className="px-4 py-2">Plan</th>
                <th className="px-4 py-2">Users</th>
                <th className="px-4 py-2">Credits (month)</th>
                <th className="px-4 py-2">Created</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {companies.data.companies.map((c) => (
                <Fragment key={c.id}>
                  <tr className="border-t border-gray-100">
                    <td className="px-4 py-2">
                      <button className="font-medium text-brand hover:underline" onClick={() => toggleExpanded(c.id)}>
                        {c.name}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-lavender">{c.domain ?? "-"}</td>
                    <td className="px-4 py-2 text-ink capitalize">{c.plan}</td>
                    <td className="px-4 py-2 text-lavender">{c.user_count}</td>
                    <td className="px-4 py-2 text-lavender">
                      {c.credits_used} / {c.credits_limit}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-lavender">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-right">
                      {c.plan === "pro" ? (
                        <button
                          className="btn-secondary"
                          disabled={busyId === c.id}
                          onClick={() => setPlan(c.id, "free")}
                        >
                          {busyId === c.id ? "…" : "Downgrade to Free"}
                        </button>
                      ) : (
                        <button
                          className="btn-secondary"
                          disabled={busyId === c.id}
                          onClick={() => setPlan(c.id, "pro")}
                        >
                          {busyId === c.id ? "…" : "Upgrade to Pro"}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expanded === c.id && (
                    <tr className="border-t border-gray-100 bg-gray-50">
                      <td colSpan={7} className="px-4 py-3">
                        {users.isLoading ? (
                          <span className="text-sm text-lavender">Loading users…</span>
                        ) : !users.data?.users.length ? (
                          <span className="text-sm text-lavender">No users.</span>
                        ) : (
                          <ul className="space-y-1 text-sm">
                            {users.data.users.map((u) => (
                              <li key={u.id} className="flex items-center gap-3">
                                <span className="text-ink">{u.email}</span>
                                <span className="text-xs uppercase tracking-wide text-lavender">{u.role}</span>
                                <span className="text-xs text-lavender">joined {new Date(u.created_at).toLocaleDateString()}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        <div className="mt-4 border-t border-gray-200 pt-3">
                          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-lavender">Usage log</div>
                          {usageEvents.isLoading ? (
                            <span className="text-sm text-lavender">Loading usage…</span>
                          ) : !usageEvents.data?.events.length ? (
                            <span className="text-sm text-lavender">No credits used yet.</span>
                          ) : (
                            <>
                              <div className="overflow-x-auto rounded-lg border border-gray-100 bg-white">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-50 text-left text-lavender">
                                    <tr>
                                      <th className="px-3 py-1.5">Time</th>
                                      <th className="px-3 py-1.5">User</th>
                                      <th className="px-3 py-1.5">Action</th>
                                      <th className="px-3 py-1.5">Detail</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {usageEvents.data.events.map((e) => (
                                      <tr key={e.id} className="border-t border-gray-100">
                                        <td className="whitespace-nowrap px-3 py-1.5 text-lavender">
                                          {new Date(e.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-3 py-1.5 text-ink">{e.user_email ?? "-"}</td>
                                        <td className="px-3 py-1.5 text-ink">{ACTION_LABELS[e.action] ?? e.action}</td>
                                        <td className="max-w-xs truncate px-3 py-1.5 text-lavender" title={e.target ?? undefined}>
                                          {e.target ?? "-"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              <div className="mt-2 flex items-center justify-between text-xs">
                                <span className="text-lavender">
                                  {usageEvents.data.total === 0
                                    ? "0 events"
                                    : `${eventsPage * usageEvents.data.pageSize + 1}-${Math.min((eventsPage + 1) * usageEvents.data.pageSize, usageEvents.data.total)} of ${usageEvents.data.total}`}
                                </span>
                                <div className="flex gap-2">
                                  <button
                                    className="btn-secondary"
                                    disabled={eventsPage === 0}
                                    onClick={() => setEventsPage((p) => Math.max(0, p - 1))}
                                  >
                                    Previous
                                  </button>
                                  <button
                                    className="btn-secondary"
                                    disabled={(eventsPage + 1) * usageEvents.data.pageSize >= usageEvents.data.total}
                                    onClick={() => setEventsPage((p) => p + 1)}
                                  >
                                    Next
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
