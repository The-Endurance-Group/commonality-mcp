import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

interface Usage { plan: string; used: number; limit: number; remaining: number }
interface Employee { id: string; name: string; linkedin_url: string | null; location: string | null; enriched_at: string | null }

export function Dashboard() {
  const qc = useQueryClient();
  const usage = useQuery({ queryKey: ["usage"], queryFn: () => apiFetch<Usage>("/api/usage") });
  const roster = useQuery({ queryKey: ["employees"], queryFn: () => apiFetch<{ employees: Employee[] }>("/api/employees") });

  const reEnrich = useMutation({
    mutationFn: () => apiFetch("/api/employees/re-enrich", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });

  const employees = roster.data?.employees ?? [];

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Plan" value={usage.data?.plan ?? "—"} />
        <Stat label="Searches used" value={usage.data ? `${usage.data.used} / ${usage.data.limit}` : "—"} />
        <Stat label="Team members" value={String(employees.length)} />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Team roster</h2>
          <button className="btn-secondary" disabled={reEnrich.isPending} onClick={() => reEnrich.mutate()}>
            {reEnrich.isPending ? "Re-enriching…" : "Re-enrich all"}
          </button>
        </div>
        <div className="overflow-hidden rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Location</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr><td className="px-4 py-6 text-gray-400" colSpan={3}>No team members yet.</td></tr>
              ) : (
                employees.map((e) => (
                  <tr key={e.id} className="border-t">
                    <td className="px-4 py-2">{e.name}</td>
                    <td className="px-4 py-2 text-gray-600">{e.location ?? "—"}</td>
                    <td className="px-4 py-2">
                      <span className={e.enriched_at ? "text-green-600" : "text-amber-600"}>
                        {e.enriched_at ? "Enriched" : "Pending"}
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-ink">{value}</div>
    </div>
  );
}
