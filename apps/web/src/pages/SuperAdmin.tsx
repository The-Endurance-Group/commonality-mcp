import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useMemo, useState } from "react";
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

type SortKey = "name" | "user_count" | "credits_used" | "created_at";
type SortDir = "asc" | "desc";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-5">
      <div className="text-sm text-lavender">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-ink">{value}</div>
    </div>
  );
}

function PlanBadge({ plan }: { plan: "free" | "pro" }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
        plan === "pro" ? "bg-brand/10 text-brand" : "bg-gray-100 text-lavender"
      }`}
    >
      {plan}
    </span>
  );
}

function SortHeader({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const active = sortKey === activeKey;
  return (
    <th className="px-4 py-2">
      <button
        className={`flex items-center gap-1 font-medium ${active ? "text-ink" : "text-lavender hover:text-ink"}`}
        onClick={() => onSort(sortKey)}
      >
        {label}
        <span className="text-xs">{active ? (dir === "asc" ? "▲" : "▼") : ""}</span>
      </button>
    </th>
  );
}

export function SuperAdmin() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [eventsPage, setEventsPage] = useState(0);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [statsOpen, setStatsOpen] = useState(false);

  const companies = useQuery({
    queryKey: ["superadmin-companies"],
    queryFn: () => apiFetch<{ companies: Company[] }>("/api/superadmin/companies"),
  });

  const stats = useQuery({
    queryKey: ["superadmin-stats"],
    queryFn: () => apiFetch<PlatformStats>("/api/superadmin/stats"),
    enabled: statsOpen,
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

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
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

  const allCompanies = companies.data?.companies ?? [];
  const totals = useMemo(
    () => ({
      companyCount: allCompanies.length,
      userCount: allCompanies.reduce((sum, c) => sum + c.user_count, 0),
      creditsUsed: allCompanies.reduce((sum, c) => sum + c.credits_used, 0),
      proCount: allCompanies.filter((c) => c.plan === "pro").length,
    }),
    [allCompanies],
  );

  const visibleCompanies = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? allCompanies.filter((c) => c.name.toLowerCase().includes(q) || (c.domain ?? "").toLowerCase().includes(q))
      : allCompanies;
    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "user_count") cmp = a.user_count - b.user_count;
      else if (sortKey === "credits_used") cmp = a.credits_used - b.credits_used;
      else cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [allCompanies, query, sortKey, sortDir]);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-ink">All accounts</h2>
        <p className="text-sm text-lavender">Every company workspace - team size, plan, and this month's credit usage.</p>
      </div>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Companies" value={companies.isLoading ? "…" : String(totals.companyCount)} />
        <Stat label="Users" value={companies.isLoading ? "…" : String(totals.userCount)} />
        <Stat label="Pro accounts" value={companies.isLoading ? "…" : String(totals.proCount)} />
        <Stat label="Credits used (month)" value={companies.isLoading ? "…" : String(totals.creditsUsed)} />
      </section>

      <div className="rounded-lg border border-gray-100 bg-white p-6">
        <button
          className="flex w-full items-center justify-between text-left"
          onClick={() => setStatsOpen((o) => !o)}
          aria-expanded={statsOpen}
        >
          <div>
            <div className="text-sm font-medium text-ink">Platform-wide action breakdown</div>
            <p className="mt-1 text-sm text-lavender">Every credit event ever charged, across all companies, by type.</p>
          </div>
          <span className={`shrink-0 text-lavender transition-transform ${statsOpen ? "rotate-180" : ""}`} aria-hidden="true">
            ▾
          </span>
        </button>
        {statsOpen &&
          (stats.isLoading ? (
            <p className="mt-4 text-sm text-lavender">Loading…</p>
          ) : !stats.data?.byAction.length ? (
            <p className="mt-4 text-sm text-lavender">No credit events yet.</p>
          ) : (
            <div className="mt-4 space-y-2">
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
          ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <input
          className="input max-w-xs"
          placeholder="Search by company or domain…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <span className="text-sm text-lavender">
            {visibleCompanies.length} of {allCompanies.length}
          </span>
        )}
      </div>

      {companies.isLoading ? (
        <p className="text-sm text-lavender">Loading…</p>
      ) : !allCompanies.length ? (
        <p className="text-sm text-lavender">No companies yet.</p>
      ) : !visibleCompanies.length ? (
        <p className="text-sm text-lavender">No companies match "{query}".</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-100 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-lavender">
              <tr>
                <SortHeader label="Company" sortKey="name" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <th className="px-4 py-2">Domain</th>
                <th className="px-4 py-2">Plan</th>
                <SortHeader label="Users" sortKey="user_count" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortHeader
                  label="Credits (month)"
                  sortKey="credits_used"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={toggleSort}
                />
                <SortHeader label="Created" sortKey="created_at" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {visibleCompanies.map((c) => (
                <Fragment key={c.id}>
                  <tr className="border-t border-gray-100">
                    <td className="px-4 py-2">
                      <button className="font-medium text-brand hover:underline" onClick={() => toggleExpanded(c.id)}>
                        {c.name}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-lavender">{c.domain ?? "-"}</td>
                    <td className="px-4 py-2">
                      <PlanBadge plan={c.plan} />
                    </td>
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
