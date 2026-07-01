import { useClerk } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ConnectorDemo } from "../components/ConnectorDemo";
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
        <Stat label="Searches used" value={usage.data ? `${usage.data.used} / ${usage.data.limit}` : "-"} />
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

      <ConnectorCard mcpUrl={mcpUrl} appUrl={appUrl} />

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

type AiClient = "claude" | "chatgpt";
const AI_CLIENT_LABELS: Record<AiClient, string> = { claude: "Claude", chatgpt: "ChatGPT" };

function defaultInviteMessage(aiClient: AiClient, appUrl: string, mcpUrl: string): string {
  const clientLabel = AI_CLIENT_LABELS[aiClient];
  return (
    `Join us on Commonality - it finds the warmest way in to any prospect or company by mapping ` +
    `our team's shared schools, past employers, and connections:\n` +
    `1. Sign up at ${appUrl} with your work email.\n` +
    `2. In ${clientLabel}, go to Settings → Connectors → Add ${aiClient === "claude" ? "custom " : ""}connector, and paste this URL: ${mcpUrl}\n` +
    `3. Sign in with your email when prompted, then ask ${clientLabel} to find a warm path to a prospect.`
  );
}

function ConnectorCard({ mcpUrl, appUrl }: { mcpUrl: string; appUrl: string }) {
  const [aiClient, setAiClient] = useState<AiClient>("claude");
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [inviteMessage, setInviteMessage] = useState(() => defaultInviteMessage("claude", appUrl, mcpUrl));
  const [inviteEdited, setInviteEdited] = useState(false);

  const clientLabel = AI_CLIENT_LABELS[aiClient];

  function selectAiClient(c: AiClient) {
    setAiClient(c);
    // Only replace the message with the new client's default if the user
    // hasn't customized it themselves - don't clobber their edits.
    if (!inviteEdited) setInviteMessage(defaultInviteMessage(c, appUrl, mcpUrl));
  }

  return (
    <CollapsibleCard
      title={`Connect to ${clientLabel}`}
      subtitle={`Add this URL as a custom connector in ${clientLabel} → Settings → Connectors, then ask ${clientLabel} to find a warm path.`}
      actions={
        <div className="flex gap-1.5">
          {(Object.keys(AI_CLIENT_LABELS) as AiClient[]).map((c) => (
            <button
              key={c}
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                aiClient === c ? "bg-tint-brand text-brand" : "text-lavender hover:bg-gray-50"
              }`}
              onClick={() => selectAiClient(c)}
            >
              {AI_CLIENT_LABELS[c]}
            </button>
          ))}
        </div>
      }
    >
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded-md bg-gray-100 px-3 py-2 text-sm">{mcpUrl}</code>
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

      {aiClient === "claude" && (
        <div className="mt-5">
          <p className="mb-3 text-sm font-medium text-ink">Watch how it's done:</p>
          <ConnectorDemo />
        </div>
      )}

      <div className="mt-5 border-t border-gray-100 pt-5">
        <h3 className="text-sm font-semibold text-ink">Invite a teammate</h3>
        <p className="mt-1 text-sm text-lavender">
          Edit the message below if you'd like, then copy it for a teammate.
        </p>
        <textarea
          className="input mt-3 h-28 font-mono text-xs"
          value={inviteMessage}
          onChange={(e) => {
            setInviteMessage(e.target.value);
            setInviteEdited(true);
          }}
        />
        <button
          className="btn-secondary mt-3"
          onClick={() => {
            navigator.clipboard.writeText(inviteMessage);
            setCopiedInvite(true);
            setTimeout(() => setCopiedInvite(false), 2000);
          }}
        >
          {copiedInvite ? "Copied!" : "Copy invite message"}
        </button>
      </div>
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
      "Find VPs of Sales at fintech companies in New York.",
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
    prompts: ["How many searches do I have left this month?"],
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
