import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiFetch } from "../lib/api";

interface Company { plan: string }

export function Billing() {
  const [params] = useSearchParams();
  const status = params.get("status");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const company = useQuery({ queryKey: ["company"], queryFn: () => apiFetch<Company>("/api/companies/me") });
  const isPro = company.data?.plan === "pro";

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
    <div className="mx-auto max-w-lg space-y-6">
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
              {busy ? "Redirecting…" : "Upgrade to Pro - $50/mo, 200 credits/mo"}
            </button>
          )}
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
