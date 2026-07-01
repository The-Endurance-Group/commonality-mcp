import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
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

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Team roster</h2>
          {isAdmin && (
            <div className="flex gap-2">
              <Link to="/onboarding" className="btn-primary">
                Import team
              </Link>
              <button className="btn-secondary" disabled={reEnrich.isPending || employees.length === 0} onClick={() => reEnrich.mutate()}>
                {reEnrich.isPending ? "Re-enriching…" : "Re-enrich all"}
              </button>
            </div>
          )}
        </div>
        <p className="mb-3 text-sm text-lavender">
          Someone missing? Someone not belong? Reach out to your admin so they can add or remove people
          {adminEmail && !isAdmin ? ` (${adminEmail})` : ""}.
        </p>
        <div className="overflow-x-auto rounded-lg border border-gray-100 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-lavender">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Alma mater</th>
                <th className="px-4 py-2">Past companies</th>
                <th className="px-4 py-2">Location</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr><td className="px-4 py-6 text-lavender" colSpan={5}>No team members yet - click “Import team” to add your roster.</td></tr>
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
    <section className="rounded-lg border border-gray-100 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">Connect to {clientLabel}</h2>
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
      </div>
      <p className="mt-1 text-sm text-lavender">
        Add this URL as a custom connector in {clientLabel} → Settings → Connectors, then ask {clientLabel} to find a warm path.
      </p>
      <div className="mt-3 flex items-center gap-2">
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
    </section>
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
    <section className="rounded-lg border border-gray-100 bg-white p-6">
      <h2 className="text-lg font-semibold text-ink">Try asking your AI</h2>
      <p className="mt-1 text-sm text-lavender">
        Once connected, here's what you can ask - no need to remember exact tool names.
      </p>

      <div className="mt-4 space-y-2">
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
    </section>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-5">
      <div className="text-sm text-lavender">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-ink">{value}</div>
    </div>
  );
}
