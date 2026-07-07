import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { apiFetch } from "../lib/api";

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

export function SuperAdmin() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const companies = useQuery({
    queryKey: ["superadmin-companies"],
    queryFn: () => apiFetch<{ companies: Company[] }>("/api/superadmin/companies"),
  });

  const users = useQuery({
    queryKey: ["superadmin-company-users", expanded],
    queryFn: () => apiFetch<{ users: CompanyUser[] }>(`/api/superadmin/companies/${expanded}/users`),
    enabled: !!expanded,
  });

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
                      <button className="font-medium text-brand hover:underline" onClick={() => setExpanded((e) => (e === c.id ? null : c.id))}>
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
