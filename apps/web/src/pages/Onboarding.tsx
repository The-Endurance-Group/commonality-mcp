import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuthStore } from "../lib/store";

type Stage = "workspace" | "import" | "enriching" | "connector";

export function Onboarding() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const { needsOnboarding, setToken } = useAuthStore();
  const [stage, setStage] = useState<Stage>(needsOnboarding ? "workspace" : "import");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stage 1 — create workspace
  const [companyName, setCompanyName] = useState("");
  const [domain, setDomain] = useState("");

  async function createWorkspace() {
    setBusy(true);
    setError(null);
    try {
      const clerkToken = await getToken();
      const res = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${clerkToken}` },
        body: JSON.stringify({ companyName, domain: domain || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create workspace");
      setToken(data.access_token);
      setStage("import");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  // Stage 2 — import team
  const [companyUrl, setCompanyUrl] = useState("");
  const [pastedUrls, setPastedUrls] = useState("");

  async function importTeam() {
    setBusy(true);
    setError(null);
    try {
      const urls = pastedUrls.split(/\s+/).map((u) => u.trim()).filter(Boolean);
      await apiFetch("/api/employees/import", {
        method: "POST",
        body: JSON.stringify(
          companyUrl ? { companyLinkedinUrl: companyUrl } : { urls },
        ),
      });
      setStage("enriching");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  // Stage 3 — enrichment progress
  const [progress, setProgress] = useState<{ total: number; enriched: number }>({ total: 0, enriched: 0 });
  useEffect(() => {
    if (stage !== "enriching") return;
    let active = true;
    const tick = async () => {
      try {
        const s = await apiFetch<{ total: number; enriched: number }>("/api/employees/enrichment-status");
        if (!active) return;
        setProgress(s);
        if (s.total > 0 && s.enriched >= s.total) setStage("connector");
      } catch {
        /* keep polling */
      }
    };
    const id = setInterval(tick, 2000);
    void tick();
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [stage]);

  const mcpUrl = `${window.location.origin}/mcp`;

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <Steps stage={stage} />
      {error && <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      {stage === "workspace" && (
        <Card title="Create your workspace">
          <Field label="Company name">
            <input className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Inc." />
          </Field>
          <Field label="Email domain (optional — lets teammates auto-join)">
            <input className="input" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="acme.com" />
          </Field>
          <button className="btn-primary" disabled={busy || !companyName.trim()} onClick={createWorkspace}>
            {busy ? "Creating…" : "Create workspace"}
          </button>
        </Card>
      )}

      {stage === "import" && (
        <Card title="Import your team">
          <p className="text-sm text-gray-600">Paste your company's LinkedIn URL to pull the roster automatically…</p>
          <Field label="Company LinkedIn URL">
            <input className="input" value={companyUrl} onChange={(e) => setCompanyUrl(e.target.value)} placeholder="https://www.linkedin.com/company/acme" />
          </Field>
          <p className="text-sm text-gray-600">…or paste individual profile URLs (one per line).</p>
          <Field label="Profile URLs">
            <textarea className="input h-28" value={pastedUrls} onChange={(e) => setPastedUrls(e.target.value)} />
          </Field>
          <button className="btn-primary" disabled={busy || (!companyUrl && !pastedUrls.trim())} onClick={importTeam}>
            {busy ? "Importing…" : "Import team"}
          </button>
        </Card>
      )}

      {stage === "enriching" && (
        <Card title="Enriching profiles…">
          <p className="text-sm text-gray-600">
            We're pulling each team member's background. This runs in the background — you can wait here.
          </p>
          <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-brand transition-all"
              style={{ width: `${progress.total ? Math.round((progress.enriched / progress.total) * 100) : 5}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {progress.enriched} / {progress.total || "…"} enriched
          </p>
          <button className="btn-link mt-3" onClick={() => setStage("connector")}>
            Skip ahead to connector setup →
          </button>
        </Card>
      )}

      {stage === "connector" && (
        <Card title="Add the Commonality connector in Claude">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-gray-700">
            <li>Open Claude → Settings → Connectors → Add custom connector.</li>
            <li>Paste this URL:</li>
          </ol>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 rounded bg-gray-100 px-3 py-2 text-sm">{mcpUrl}</code>
            <button className="btn-secondary" onClick={() => navigator.clipboard.writeText(mcpUrl)}>
              Copy
            </button>
          </div>
          <p className="mt-3 text-sm text-gray-600">Sign in with your email when prompted, then ask Claude to find a warm path.</p>
          <button className="btn-primary mt-4" onClick={() => navigate("/dashboard")}>
            Go to dashboard
          </button>
        </Card>
      )}
    </div>
  );
}

function Steps({ stage }: { stage: Stage }) {
  const order: Stage[] = ["workspace", "import", "enriching", "connector"];
  const labels: Record<Stage, string> = {
    workspace: "Workspace",
    import: "Import",
    enriching: "Enrich",
    connector: "Connect",
  };
  const idx = order.indexOf(stage);
  return (
    <div className="flex gap-2 text-xs text-gray-500">
      {order.map((s, i) => (
        <span key={s} className={i <= idx ? "font-medium text-brand" : ""}>
          {labels[s]}
          {i < order.length - 1 ? " ›" : ""}
        </span>
      ))}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-xl border bg-white p-6">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}
