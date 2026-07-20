import { useClerk } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { apiFetch } from "../lib/api";
import { useAuthStore } from "../lib/store";

interface Usage { plan: string; used: number; limit: number; remaining: number }
interface Employee {
  id: string;
  name: string;
  linkedin_url: string | null;
  location: string | null;
  schools: string[] | null;
  past_companies: string[] | null;
  enriched_at: string | null;
}
interface Company { adminEmail: string | null }

// Matches TEAM_LIMITS in apps/server/src/services/roster.ts and the pricing page.
const TEAM_LIMITS: Record<string, number> = { free: 25, pro: 150 };

export function Dashboard() {
  const isAdmin = useAuthStore((s) => s.claims?.role === "admin");
  const qc = useQueryClient();
  const usage = useQuery({ queryKey: ["usage"], queryFn: () => apiFetch<Usage>("/api/usage") });
  const roster = useQuery({ queryKey: ["employees"], queryFn: () => apiFetch<{ employees: Employee[] }>("/api/employees") });
  const company = useQuery({ queryKey: ["company"], queryFn: () => apiFetch<Company>("/api/companies/me") });

  const reEnrich = useMutation({
    mutationFn: () => apiFetch("/api/employees/re-enrich", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });
  const removeEmployee = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/employees/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });
  const addEmployee = useMutation({
    mutationFn: (linkedinUrl: string) =>
      apiFetch("/api/employees/import", { method: "POST", body: JSON.stringify({ urls: [linkedinUrl] }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      setNewPersonUrl("");
    },
  });
  const [newPersonUrl, setNewPersonUrl] = useState("");

  const employees = roster.data?.employees ?? [];
  const appUrl = window.location.origin;
  const mcpUrl = `${appUrl}/mcp`;
  const adminEmail = company.data?.adminEmail;

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Plan" value={usage.data ? usage.data.plan.charAt(0).toUpperCase() + usage.data.plan.slice(1) : "-"} />
        <Stat label="Credits used" value={usage.data ? `${usage.data.used} / ${usage.data.limit}` : "-"} />
        <Stat
          label="Team members"
          value={
            usage.data && TEAM_LIMITS[usage.data.plan]
              ? `${employees.length} / ${TEAM_LIMITS[usage.data.plan]}`
              : String(employees.length)
          }
        />
      </section>

      {!isAdmin && adminEmail && (
        <p className="text-sm text-lavender">
          Questions? Reach out to your admin, <span className="font-medium text-ink">{adminEmail}</span>.
        </p>
      )}

      <ConnectorCard mcpUrl={mcpUrl} />

      <ExamplePromptsCard isAdmin={isAdmin} />

      <ConnectionsCard />

      <CollapsibleCard
        title="Team roster"
        actions={
          isAdmin ? (
            <div className="flex gap-2">
              <Link to="/onboarding" className="btn-primary">
                Import team
              </Link>
              <button className="btn-secondary" disabled={reEnrich.isPending || employees.length === 0} onClick={() => reEnrich.mutate()}>
                {reEnrich.isPending ? "Re-enriching…" : "Re-enrich all"}
              </button>
            </div>
          ) : undefined
        }
      >
        {isAdmin ? (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              className="input flex-1"
              value={newPersonUrl}
              onChange={(e) => setNewPersonUrl(e.target.value)}
              placeholder="Add someone by LinkedIn profile URL…"
            />
            <button
              className="btn-secondary"
              disabled={addEmployee.isPending || !newPersonUrl.trim()}
              onClick={() => addEmployee.mutate(newPersonUrl.trim())}
            >
              {addEmployee.isPending ? "Adding…" : "Add"}
            </button>
          </div>
        ) : (
          <p className="mb-3 text-sm text-lavender">
            Someone missing? Someone not belong? Reach out to your admin so they can add or remove people
            {adminEmail ? ` (${adminEmail})` : ""}.
          </p>
        )}
        {addEmployee.isError && (
          <p className="mb-3 text-sm text-red-600">
            {addEmployee.error instanceof Error ? addEmployee.error.message : "Couldn't add that person"}
          </p>
        )}
        <div className="overflow-x-auto rounded-lg border border-gray-100 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-lavender">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Alma mater</th>
                <th className="px-4 py-2">Past companies</th>
                <th className="px-4 py-2">Location</th>
                <th className="px-4 py-2">Status</th>
                {isAdmin && <th className="px-4 py-2" />}
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr><td className="px-4 py-6 text-lavender" colSpan={isAdmin ? 6 : 5}>No team members yet - click “Import team” to add your roster.</td></tr>
              ) : (
                employees.map((e) => (
                  <tr key={e.id} className="border-t border-gray-100">
                    <td className="px-4 py-2">
                      {e.linkedin_url ? (
                        <a
                          href={e.linkedin_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand hover:underline"
                        >
                          {e.name}
                        </a>
                      ) : (
                        e.name
                      )}
                    </td>
                    <td className="px-4 py-2 text-lavender">{e.schools?.length ? e.schools.join(", ") : "-"}</td>
                    <td className="px-4 py-2 text-lavender">{e.past_companies?.length ? e.past_companies.join(", ") : "-"}</td>
                    <td className="px-4 py-2 text-lavender">{e.location ?? "-"}</td>
                    <td className="px-4 py-2">
                      <span className={e.enriched_at ? "text-accent" : "text-brand"}>
                        {e.enriched_at ? "Enriched" : "Pending"}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-2 text-right">
                        <button
                          className="text-lavender hover:text-red-600"
                          disabled={removeEmployee.isPending}
                          onClick={() => removeEmployee.mutate(e.id)}
                          aria-label={`Remove ${e.name}`}
                        >
                          ✕
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CollapsibleCard>

      <AccountCard />
    </div>
  );
}

// Shared shell for every major dashboard section - a bordered white card
// with a title/actions header that can collapse, so users can hide
// sections they don't care about instead of scrolling past them.
function CollapsibleCard({
  title,
  subtitle,
  actions,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section className="rounded-lg border border-gray-100 bg-white p-6">
      <div className="flex items-center justify-between gap-3">
        <button
          className="flex min-w-0 items-center gap-2 text-left"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <span className={`shrink-0 text-lavender transition-transform ${open ? "rotate-90" : ""}`}>›</span>
          <h2 className="truncate text-lg font-semibold text-ink">{title}</h2>
        </button>
        {actions}
      </div>
      {open && (
        <>
          {subtitle && <p className="mt-1 text-sm text-lavender">{subtitle}</p>}
          <div className="mt-4">{children}</div>
        </>
      )}
    </section>
  );
}

// ── AI provider logos ─────────────────────────────────────────────────────────

function ClaudeLogo() {
  return (
    // Anthropic "A" lettermark — Bootstrap Icons path, 16×16 coordinate space
    <svg width="32" height="32" viewBox="0 0 16 16" aria-hidden="true">
      <rect width="16" height="16" rx="3" fill="#CC785C" />
      <path
        d="M9.218 2h2.402L16 12.987h-2.402zM4.379 2h2.512l4.38 10.987H8.82l-.895-2.308h-4.58l-.896 2.307H0L4.38 2.001zm2.755 6.64L5.635 4.777 4.137 8.64z"
        fill="white"
      />
    </svg>
  );
}

function ChatGPTLogo() {
  return (
    // OpenAI bloom logo — Simple Icons path, 24×24 coordinate space, padded 4px inside 32×32 box
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#1A1A1A" />
      <path
        transform="translate(4,4)"
        d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"
        fill="white"
      />
    </svg>
  );
}

function GeminiLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#4285F4" />
      {/* Gemini 4-pointed star */}
      <path d="M16 6C16 6 18.2 13.8 24 16C18.2 18.2 16 26 16 26C16 26 13.8 18.2 8 16C13.8 13.8 16 6 16 6Z" fill="white" />
    </svg>
  );
}

function CopilotLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#F0F0F0" />
      {/* Microsoft 4-color grid */}
      <rect x="8" y="8" width="7" height="7" rx="1" fill="#F25022" />
      <rect x="17" y="8" width="7" height="7" rx="1" fill="#7FBA00" />
      <rect x="8" y="17" width="7" height="7" rx="1" fill="#00A4EF" />
      <rect x="17" y="17" width="7" height="7" rx="1" fill="#FFB900" />
    </svg>
  );
}

// ── AI providers accordion ────────────────────────────────────────────────────

interface AIProvider {
  id: string;
  name: string;
  requirement: string;
  description: string;
  guideUrl: string;
  color: string;
  Logo: () => ReactNode;
}

const AI_PROVIDERS: AIProvider[] = [
  {
    id: "claude",
    name: "Claude",
    requirement: "Works on every plan — Free, Pro, Max, Team, and Enterprise.",
    description: "The easiest way to get started. Follow Anthropic's official guide to add Commonality as a custom connector.",
    guideUrl: "https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp",
    color: "#CC785C",
    Logo: ClaudeLogo,
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    requirement: "Plus/Pro for read-only access; Business, Enterprise, or Edu (admin-enabled) for full actions.",
    description: "Connect via Developer Mode. Your account tier determines what level of access you get.",
    guideUrl: "https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt",
    color: "#10A37F",
    Logo: ChatGPTLogo,
  },
  {
    id: "gemini",
    name: "Gemini",
    requirement: "Requires Google AI Ultra ($100+/mo), a personal Google account, and is currently US-only.",
    description: "Connect through Gemini Spark. Note the subscription and geographic requirements before getting started.",
    guideUrl: "https://docs.cloud.google.com/gemini/enterprise/docs/connectors/custom-mcp-server/set-up-custom-mcp-server",
    color: "#4285F4",
    Logo: GeminiLogo,
  },
  {
    id: "copilot",
    name: "Microsoft Copilot Studio",
    requirement: "Separate from Microsoft 365 Copilot — requires its own Copilot Studio license.",
    description: "Connect your Copilot Studio agent to Commonality's MCP server using Microsoft's official guide.",
    guideUrl: "https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-add-existing-server-to-agent",
    color: "#0078D4",
    Logo: CopilotLogo,
  },
];

function AIProvidersSection() {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <div className="mt-5">
      <p className="mb-3 text-sm font-medium text-ink">Connect to your favorite AI:</p>
      <div className="space-y-2">
        {AI_PROVIDERS.map((provider) => (
          <AIProviderItem
            key={provider.id}
            provider={provider}
            open={openId === provider.id}
            onToggle={() => setOpenId((id) => (id === provider.id ? null : provider.id))}
          />
        ))}
      </div>
    </div>
  );
}

function AIProviderItem({ provider, open, onToggle }: { provider: AIProvider; open: boolean; onToggle: () => void }) {
  const [btnHovered, setBtnHovered] = useState(false);
  return (
    <div className="overflow-hidden rounded-lg border border-gray-100">
      <button
        className="flex w-full items-center justify-between bg-white px-4 py-3 text-left transition-colors hover:bg-gray-50"
        onClick={onToggle}
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <provider.Logo />
          <span className="text-sm font-semibold text-ink">{provider.name}</span>
        </div>
        <span
          className={`text-base text-lavender transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          ▾
        </span>
      </button>
      <div className={`overflow-hidden transition-all duration-200 ${open ? "max-h-60" : "max-h-0"}`}>
        <div className="border-t border-gray-100 px-4 pb-4 pt-3">
          <p className="mb-1 text-xs font-semibold" style={{ color: provider.color }}>
            {provider.requirement}
          </p>
          <p className="mb-3 text-sm text-lavender">{provider.description}</p>
          <a
            href={provider.guideUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              backgroundColor: provider.color,
              boxShadow: btnHovered ? "none" : "3px 3px 0 0 rgba(0,0,0,0.15)",
              transform: btnHovered ? "translate(3px, 3px)" : "translate(0, 0)",
            }}
            onMouseEnter={() => setBtnHovered(true)}
            onMouseLeave={() => setBtnHovered(false)}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all duration-150"
          >
            View connection guide →
          </a>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function ConnectorCard({ mcpUrl }: { mcpUrl: string }) {
  const [copiedUrl, setCopiedUrl] = useState(false);

  return (
    <CollapsibleCard
      title="Connect to your AI"
      subtitle="Add this URL as a custom connector in your AI, then ask it to find a warm path."
    >
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md bg-gray-100 px-3 py-2 text-sm">{mcpUrl}</code>
        <button
          className="btn-secondary"
          onClick={() => {
            navigator.clipboard.writeText(mcpUrl);
            setCopiedUrl(true);
            setTimeout(() => setCopiedUrl(false), 2000);
          }}
        >
          {copiedUrl ? "Copied!" : "Copy"}
        </button>
      </div>
      <p className="mt-2 text-sm text-lavender">
        Having trouble connecting?{" "}
        <a
          href="https://meetings.hubspot.com/conor-sullivan/commonality"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-brand hover:underline"
        >
          Set up a meeting with us today
        </a>
        .
      </p>

      <AIProvidersSection />
    </CollapsibleCard>
  );
}

interface RosterEmployee { id: string; name: string }

function ConnectionsCard() {
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
  const [deleting, setDeleting] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);

  async function upload() {
    if (!employeeId || !file) return;
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that file");
    } finally {
      setBusy(false);
    }
  }

  async function deleteConnections() {
    if (!employeeId) return;
    setDeleting(true);
    setError(null);
    setDeleteNotice(null);
    try {
      const empName = employees.find((e) => e.id === employeeId)?.name ?? "That teammate";
      const { removed } = await apiFetch<{ removed: number }>(`/api/employees/${employeeId}/connections`, {
        method: "DELETE",
      });
      setDeleteNotice(`Removed ${removed} connection${removed === 1 ? "" : "s"} for ${empName}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete connections");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <CollapsibleCard
      title="Add your LinkedIn connections"
      subtitle="1st-degree LinkedIn connections are the strongest warm-path signal Commonality has - add or delete yours or a teammate's here at any time."
    >
      <div>
        <p className="text-sm font-medium text-ink">How to export them from LinkedIn:</p>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-lavender">
          <li>On LinkedIn, click your profile photo → <span className="font-medium text-ink">Settings &amp; Privacy</span>.</li>
          <li>Go to the <span className="font-medium text-ink">Data privacy</span> tab → <span className="font-medium text-ink">Get a copy of your data</span>.</li>
          <li>Select <span className="font-medium text-ink">Connections</span>, then click <span className="font-medium text-ink">Request archive</span>.</li>
          <li>LinkedIn emails you a download link (usually within a few minutes) - download it and unzip it.</li>
          <li>Upload the <span className="font-medium text-ink">Connections.csv</span> file below.</li>
        </ol>
      </div>

      {added.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {added.map((a, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md bg-tint-brand px-3 py-2 text-sm text-brand">
              <span>✓</span>
              <span className="font-medium">{a.name}</span>
              <span className="text-lavender">- {a.saved} connections added</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-lavender">Whose connections is this?</span>
          <select className="input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">Select a teammate…</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-lavender">Connections.csv</span>
          <input
            type="file"
            accept=".csv"
            className="input"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {deleteNotice && <p className="mt-3 text-sm text-brand">{deleteNotice}</p>}

      <div className="mt-4 rounded-lg bg-tint-accent p-4 text-sm text-ink">
        Some people aren't comfortable sharing this, and that's completely okay - it's optional and
        not required to use Commonality. You can delete a teammate's uploaded connections at any
        time using the picker above.
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button className="btn-primary" disabled={busy || !employeeId || !file} onClick={upload}>
          {busy ? "Saving…" : "Upload"}
        </button>
        <button className="btn-secondary" disabled={deleting || !employeeId} onClick={deleteConnections}>
          {deleting ? "Deleting…" : "Delete their connections"}
        </button>
      </div>
    </CollapsibleCard>
  );
}

const promptCategories: { title: string; prompts: string[] }[] = [
  {
    title: "Find warm paths",
    prompts: [
      "What's the best way for me to connect with [prospect LinkedIn URL]?",
      "What's our best way into Acme Corp?",
      "Who should I reach out to at Acme Inc?",
      "Find VPs of Sales at fintech companies in New York.",
    ],
  },
  {
    title: "Research a person or company",
    prompts: [
      "Tell me about [prospect LinkedIn URL] - where did they go to school, and where have they worked?",
      "Show me [prospect]'s recent LinkedIn posts.",
      "What's Acme Corp been posting about lately?",
    ],
  },
  {
    title: "Team & network",
    prompts: [
      "Add my LinkedIn connections so they count as warm paths.",
      "Show our team's social capital - top schools, employers, and locations.",
    ],
  },
  {
    title: "Usage",
    prompts: ["How many credits do I have left this month?"],
  },
];

const adminPromptCategory = {
  title: "Admin only",
  prompts: [
    "Invite jordan@acme.com to our workspace.",
    "Add this person to our team: [LinkedIn profile URL].",
  ],
};

function ExamplePromptsCard({ isAdmin }: { isAdmin: boolean }) {
  const categories = isAdmin ? [...promptCategories, adminPromptCategory] : promptCategories;
  const [openTitle, setOpenTitle] = useState<string | null>(null);

  return (
    <CollapsibleCard
      title="Try asking your AI"
      subtitle="Once connected, here's what you can ask - no need to remember exact tool names."
    >
      <div className="space-y-2">
        {categories.map((cat) => (
          <PromptCategory
            key={cat.title}
            title={cat.title}
            prompts={cat.prompts}
            open={openTitle === cat.title}
            onToggle={() => setOpenTitle((t) => (t === cat.title ? null : cat.title))}
          />
        ))}
      </div>
    </CollapsibleCard>
  );
}

function PromptCategory({
  title,
  prompts,
  open,
  onToggle,
}: {
  title: string;
  prompts: string[];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-gray-100">
      <button
        className="flex w-full items-center justify-between bg-gray-50 px-3 py-2 text-left text-sm font-medium text-ink"
        onClick={onToggle}
      >
        {title}
        <span className="text-lavender">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <ul className="space-y-2 p-2">
          {prompts.map((p) => (
            <PromptItem key={p} prompt={p} />
          ))}
        </ul>
      )}
    </div>
  );
}

function PromptItem({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <li className="flex items-center justify-between gap-3 rounded-md bg-gray-50 px-3 py-2">
      <span className="text-sm text-ink">&ldquo;{prompt}&rdquo;</span>
      <button
        className="shrink-0 text-xs font-medium text-brand hover:underline"
        onClick={() => {
          navigator.clipboard.writeText(prompt);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </li>
  );
}

function AccountCard() {
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const roster = useQuery({
    queryKey: ["employees"],
    queryFn: () => apiFetch<{ employees: RosterEmployee[] }>("/api/employees"),
  });
  const employees = roster.data?.employees ?? [];

  const [employeeId, setEmployeeId] = useState("");
  const [leaveNotice, setLeaveNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const leaveTeam = useMutation({
    mutationFn: (id: string) => apiFetch("/api/employees/leave", { method: "POST", body: JSON.stringify({ employeeId: id }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      setLeaveNotice("You've been removed from the team roster.");
      setEmployeeId("");
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Couldn't remove you from the roster"),
  });

  const deleteAccount = useMutation({
    mutationFn: () => apiFetch("/api/users/me", { method: "DELETE" }),
    onSuccess: async () => {
      await signOut();
      navigate("/");
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Couldn't delete your account"),
  });

  function confirmLeaveTeam() {
    if (!employeeId) return;
    const name = employees.find((e) => e.id === employeeId)?.name ?? "you";
    if (!window.confirm(`Remove ${name} from the team roster? This can't be undone.`)) return;
    setError(null);
    leaveTeam.mutate(employeeId);
  }

  function confirmDeleteAccount() {
    if (!window.confirm("Delete your Commonality account? This can't be undone and you'll be signed out.")) return;
    setError(null);
    deleteAccount.mutate();
  }

  return (
    <CollapsibleCard title="Your account" subtitle="Manage your own membership - these actions only affect you.">
      <div>
        <h3 className="text-sm font-semibold text-ink">Leave the team roster</h3>
        <p className="mt-1 text-sm text-lavender">
          Remove yourself from your company's roster at any time. Pick your name below.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <select className="input flex-1" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">Select your name…</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          <button className="btn-secondary" disabled={leaveTeam.isPending || !employeeId} onClick={confirmLeaveTeam}>
            {leaveTeam.isPending ? "Removing…" : "Remove me"}
          </button>
        </div>
        {leaveNotice && <p className="mt-2 text-sm text-brand">{leaveNotice}</p>}
      </div>

      <div className="mt-5 border-t border-gray-100 pt-5">
        <h3 className="text-sm font-semibold text-ink">Delete your account</h3>
        <p className="mt-1 text-sm text-lavender">
          Permanently deletes your Commonality login. This doesn't remove you from the team
          roster - do that above first if you'd like.
        </p>
        <button
          className="btn-secondary mt-3 text-red-600"
          disabled={deleteAccount.isPending}
          onClick={confirmDeleteAccount}
        >
          {deleteAccount.isPending ? "Deleting…" : "Delete my account"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </CollapsibleCard>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-5">
      <div className="text-sm text-lavender">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-ink">{value}</div>
    </div>
  );
}
