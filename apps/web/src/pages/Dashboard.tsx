import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuthStore } from "../lib/store";

interface Usage { plan: string; used: number; limit: number; remaining: number }
interface Employee { id: string; name: string; linkedin_url: string | null; location: string | null; enriched_at: string | null }

// Matches TEAM_LIMITS in apps/server/src/services/roster.ts and the pricing page.
const TEAM_LIMITS: Record<string, number> = { free: 25, pro: 150 };

export function Dashboard() {
  const isAdmin = useAuthStore((s) => s.claims?.role === "admin");
  const qc = useQueryClient();
  const usage = useQuery({ queryKey: ["usage"], queryFn: () => apiFetch<Usage>("/api/usage") });
  const roster = useQuery({ queryKey: ["employees"], queryFn: () => apiFetch<{ employees: Employee[] }>("/api/employees") });

  const reEnrich = useMutation({
    mutationFn: () => apiFetch("/api/employees/re-enrich", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });

  const employees = roster.data?.employees ?? [];
  const appUrl = window.location.origin;
  const mcpUrl = `${appUrl}/mcp`;

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Plan" value={usage.data?.plan ?? "-"} />
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
        <div className="overflow-hidden rounded-lg border border-gray-100 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-lavender">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Location</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr><td className="px-4 py-6 text-lavender" colSpan={3}>No team members yet - click “Import team” to add your roster.</td></tr>
              ) : (
                employees.map((e) => (
                  <tr key={e.id} className="border-t border-gray-100">
                    <td className="px-4 py-2">{e.name}</td>
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

function ConnectorCard({ mcpUrl, appUrl }: { mcpUrl: string; appUrl: string }) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const inviteMessage =
    `Join us on Commonality:\n` +
    `1. Sign up at ${appUrl} with your work email.\n` +
    `2. In Claude, go to Settings → Connectors → Add custom connector, and paste this URL: ${mcpUrl}\n` +
    `3. Sign in with your email when prompted, then ask Claude to find a warm path to a prospect.`;

  return (
    <section className="rounded-lg border border-gray-100 bg-white p-6">
      <h2 className="text-lg font-semibold text-ink">Connect to Claude</h2>
      <p className="mt-1 text-sm text-lavender">
        Add this URL as a custom connector in Claude → Settings → Connectors, then ask Claude to find a warm path.
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
          Copy a ready-to-send message with sign-up and connector setup steps for a teammate.
        </p>
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

const everyonePrompts = [
  "What's the best way for me to connect with [prospect LinkedIn URL]?",
  "What's our best way into Acme Corp?",
  "Add this person to our team: [LinkedIn profile URL].",
  "Find VPs of Sales at fintech companies in New York.",
  "Draft a LinkedIn message and email for reaching out to [prospect].",
  "Help me prep for a call with [prospect].",
  "Who's my prospect of the day?",
  "Push [prospect] to HubSpot with our findings.",
  "Hand this prospect to Sam - they have a stronger connection.",
  "Add my LinkedIn connections so they count as warm paths.",
  "Show our team's social capital - top schools, employers, and locations.",
  "How many searches do I have left this month?",
];

const adminPrompts = ["Invite jordan@acme.com to our workspace."];

function ExamplePromptsCard({ isAdmin }: { isAdmin: boolean }) {
  return (
    <section className="rounded-lg border border-gray-100 bg-white p-6">
      <h2 className="text-lg font-semibold text-ink">Try asking Claude</h2>
      <p className="mt-1 text-sm text-lavender">
        Once connected, here's what you can ask - no need to remember exact tool names.
      </p>

      <ul className="mt-4 space-y-2">
        {everyonePrompts.map((p) => (
          <PromptItem key={p} prompt={p} />
        ))}
      </ul>

      {isAdmin && (
        <div className="mt-5 border-t border-gray-100 pt-5">
          <h3 className="text-sm font-semibold text-ink">Admin only</h3>
          <ul className="mt-3 space-y-2">
            {adminPrompts.map((p) => (
              <PromptItem key={p} prompt={p} />
            ))}
          </ul>
        </div>
      )}
    </section>
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
