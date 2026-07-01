import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuthStore } from "../lib/store";

type Stage = "workspace" | "import" | "enriching" | "connections" | "connector";

const STAGE_ORDER: Stage[] = ["workspace", "import", "enriching", "connections", "connector"];
const STAGE_LABELS: Record<Stage, string> = {
  workspace: "Workspace",
  import: "Import",
  enriching: "Enrich",
  connections: "Connections",
  connector: "Connect",
};

const enrichingNotes = [
  "Pulling each teammate's profile - title, schools, employers, and location.",
  "Cross-referencing alma maters - checking whether any prospects share a degree program with your team.",
  "Reviewing past employers - flagging companies your team and target accounts have in common.",
  "Comparing locations - surfacing teammates based near your prospects.",
  "Scoring every path by strength, so the best connection always surfaces first.",
];

export function Onboarding() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const { needsOnboarding, setToken } = useAuthStore();
  const [stage, setStage] = useState<Stage>(needsOnboarding ? "workspace" : "import");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Stage 1 - create workspace
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

  // Stage 2 - import team
  const [companyUrl, setCompanyUrl] = useState("");
  const [pastedUrls, setPastedUrls] = useState("");

  async function importTeam() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const urls = pastedUrls.split(/\s+/).map((u) => u.trim()).filter(Boolean);
      const result = await apiFetch<{ imported: number; remaining: number; limit: number; trimmedByLimit: boolean }>(
        "/api/employees/import",
        {
          method: "POST",
          body: JSON.stringify(companyUrl ? { companyLinkedinUrl: companyUrl } : { urls }),
        },
      );
      if (result.trimmedByLimit) {
        setNotice(
          `Imported ${result.imported} team members - that's your plan's limit (${result.limit}). ` +
            "There are more people at this company; upgrade to Pro to add them.",
        );
      }
      setStage("enriching");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  // Stage 3 - enrichment progress
  const [progress, setProgress] = useState<{ total: number; enriched: number }>({ total: 0, enriched: 0 });
  useEffect(() => {
    if (stage !== "enriching") return;
    let active = true;
    const tick = async () => {
      try {
        const s = await apiFetch<{ total: number; enriched: number }>("/api/employees/enrichment-status");
        if (!active) return;
        setProgress(s);
        if (s.total > 0 && s.enriched >= s.total) setStage("connections");
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

  // Cross-fade between stages: briefly play a fade-out on the outgoing stage
  // before swapping to the incoming one, instead of an instant unmount.
  const [displayStage, setDisplayStage] = useState(stage);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (stage === displayStage) return;
    setLeaving(true);
    const t = setTimeout(() => {
      setDisplayStage(stage);
      setLeaving(false);
    }, 180);
    return () => clearTimeout(t);
  }, [stage, displayStage]);

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <Steps stage={stage} />
      {error && (
        <p className="animate-fade-up mt-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</p>
      )}
      {notice && (
        <p className="animate-fade-up mt-4 rounded-md bg-tint-brand p-3 text-sm text-brand">{notice}</p>
      )}

      <div key={displayStage} className={leaving ? "animate-fade-out" : "animate-fade-up"}>
        {displayStage === "workspace" && (
          <Card title="Create your workspace" subtitle="Just your company name - we'll use it to start building your team's social map.">
            <Field label="Company name">
              <input className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Inc." />
            </Field>
            <Field label="Email domain (optional - lets teammates auto-join)">
              <input className="input" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="acme.com" />
            </Field>
            <button className="btn-primary" disabled={busy || !companyName.trim()} onClick={createWorkspace}>
              {busy ? "Creating…" : "Create workspace"}
            </button>
          </Card>
        )}

        {displayStage === "import" && (
          <Card
            title="Import your team"
            subtitle="We'll pull every teammate's LinkedIn profile - schools, employers, and location - to map your team's social capital."
          >
            <p className="text-sm text-lavender">Paste your company's LinkedIn URL to pull the roster automatically…</p>
            <Field label="Company LinkedIn URL">
              <input className="input" value={companyUrl} onChange={(e) => setCompanyUrl(e.target.value)} placeholder="https://www.linkedin.com/company/acme" />
            </Field>
            <p className="text-sm text-lavender">…or paste individual profile URLs (one per line).</p>
            <Field label="Profile URLs">
              <textarea className="input h-28" value={pastedUrls} onChange={(e) => setPastedUrls(e.target.value)} />
            </Field>
            <button className="btn-primary" disabled={busy || (!companyUrl && !pastedUrls.trim())} onClick={importTeam}>
              {busy ? "Importing…" : "Import team"}
            </button>
          </Card>
        )}

        {displayStage === "enriching" && (
          <Card title="Mapping your team's social capital…">
            <EnrichingNotes />
            <div className="mt-5 h-3 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-brand transition-all duration-700 ease-out"
                style={{ width: `${progress.total ? Math.round((progress.enriched / progress.total) * 100) : 5}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-lavender">
              {progress.enriched} / {progress.total || "…"} teammates mapped
            </p>
            <button className="btn-link mt-3" onClick={() => setStage("connections")}>
              Skip ahead →
            </button>
          </Card>
        )}

        {displayStage === "connections" && <ConnectionsStep onContinue={() => setStage("connector")} />}

        {displayStage === "connector" && (
          <Card
            title="Add the Commonality connector in Claude"
            subtitle="One link to your AI, and you can start asking for warm paths immediately."
          >
            <ol className="list-decimal space-y-2 pl-5 text-sm text-lavender">
              <li>Open Claude → Settings → Connectors → Add custom connector.</li>
              <li>Paste this URL:</li>
            </ol>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 rounded-md bg-gray-100 px-3 py-2 text-sm">{mcpUrl}</code>
              <button className="btn-secondary" onClick={() => navigator.clipboard.writeText(mcpUrl)}>
                Copy
              </button>
            </div>
            <p className="mt-3 text-sm text-lavender">Sign in with your email when prompted, then ask Claude to find a warm path.</p>
            <button className="btn-primary mt-4" onClick={() => navigate("/dashboard")}>
              Go to dashboard
            </button>
          </Card>
        )}
      </div>
    </div>
  );
}

interface RosterEmployee { id: string; name: string }

function ConnectionsStep({ onContinue }: { onContinue: () => void }) {
  const roster = useQuery({
    queryKey: ["employees"],
    queryFn: () => apiFetch<{ employees: RosterEmployee[] }>("/api/employees"),
  });
  const employees = roster.data?.employees ?? [];

  const [employeeId, setEmployeeId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<{ name: string; saved: number }[]>([]);

  async function addAnother(): Promise<boolean> {
    if (!employeeId || !file) return false;
    setBusy(true);
    setError(null);
    try {
      const csv = await file.text();
      const { saved } = await apiFetch<{ saved: number }>(`/api/employees/${employeeId}/connections`, {
        method: "POST",
        body: JSON.stringify({ csv }),
      });
      const empName = employees.find((e) => e.id === employeeId)?.name ?? "Teammate";
      setAdded((a) => [...a, { name: empName, saved }]);
      setEmployeeId("");
      setFile(null);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that file");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    if (employeeId && file) {
      const ok = await addAnother();
      if (!ok) return; // stay on screen so the error is visible
    }
    onContinue();
  }

  return (
    <Card
      title="Add LinkedIn connections (optional)"
      subtitle="This is the single strongest signal Commonality can use - a 1st-degree LinkedIn connection beats any other path in. Totally optional."
    >
      <div>
        <p className="text-sm font-medium text-ink">How to export them from LinkedIn:</p>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-lavender">
          <li>On LinkedIn, click your profile photo → <span className="font-medium text-ink">Settings &amp; Privacy</span>.</li>
          <li>Go to the <span className="font-medium text-ink">Data privacy</span> tab → <span className="font-medium text-ink">Get a copy of your data</span>.</li>
          <li>Select <span className="font-medium text-ink">Connections</span>, then click <span className="font-medium text-ink">Request archive</span>.</li>
          <li>LinkedIn emails you a download link (usually within a few minutes) - download it and unzip it.</li>
          <li>Upload the <span className="font-medium text-ink">Connections.csv</span> file here, for yourself or any teammate.</li>
        </ol>
      </div>

      {added.length > 0 && (
        <div className="space-y-1.5">
          {added.map((a, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md bg-tint-brand px-3 py-2 text-sm text-brand">
              <span>✓</span>
              <span className="font-medium">{a.name}</span>
              <span className="text-lavender">- {a.saved} connections added</span>
            </div>
          ))}
        </div>
      )}

      <Field label="Whose connections is this?">
        <select className="input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
          <option value="">Select a teammate…</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </Field>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-lavender">Connections.csv</span>
        <input
          type="file"
          accept=".csv"
          className="input"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="rounded-lg bg-tint-accent p-4 text-sm text-ink">
        Some people aren't comfortable sharing this, and that's completely okay - it's optional
        and not required to use Commonality. You can always add it later if you or a teammate
        changes your mind.
      </div>

      <div className="flex flex-wrap gap-3">
        <button className="btn-secondary" disabled={busy || !employeeId || !file} onClick={addAnother}>
          {busy ? "Saving…" : "+ Add another person"}
        </button>
        <button className="btn-primary" disabled={busy} onClick={finish}>
          {busy ? "Saving…" : added.length > 0 ? "Continue" : "Upload & continue"}
        </button>
        <button className="btn-link" onClick={onContinue}>
          Skip for now
        </button>
      </div>
    </Card>
  );
}

function EnrichingNotes() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % enrichingNotes.length), 2800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex min-h-[64px] items-center rounded-lg bg-tint-brand p-4">
      <p key={idx} className="animate-fade-up text-sm font-medium text-ink">
        {enrichingNotes[idx]}
      </p>
    </div>
  );
}

function Steps({ stage }: { stage: Stage }) {
  const idx = STAGE_ORDER.indexOf(stage);
  return (
    <div className="relative flex items-start justify-between">
      <div className="absolute left-0 right-0 top-4 h-0.5 bg-gray-200" />
      <div
        className="absolute left-0 top-4 h-0.5 bg-brand transition-all duration-500 ease-out"
        style={{ width: `${(idx / (STAGE_ORDER.length - 1)) * 100}%` }}
      />
      {STAGE_ORDER.map((s, i) => {
        const status = i < idx ? "done" : i === idx ? "active" : "upcoming";
        return (
          <div key={s} className="relative z-10 flex flex-col items-center gap-1.5">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all duration-300 ${
                status === "done"
                  ? "border-brand bg-brand text-white"
                  : status === "active"
                    ? "border-brand bg-white text-brand"
                    : "border-gray-200 bg-white text-gray-300"
              }`}
            >
              {status === "done" ? "✓" : i + 1}
            </div>
            <span className={`text-xs ${status === "upcoming" ? "text-gray-300" : "font-medium text-ink"}`}>
              {STAGE_LABELS[s]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6 rounded-lg border border-gray-100 bg-white p-6">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-lavender">{subtitle}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-lavender">{label}</span>
      {children}
    </label>
  );
}
