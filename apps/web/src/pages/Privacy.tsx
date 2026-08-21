import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/clerk-react";
import { Link } from "react-router-dom";

interface Subprocessor {
  name: string;
  usedFor: string;
  dataShared: string;
}

interface Retention {
  name: string;
  what: string;
  scope: string;
}

const retentions: Retention[] = [
  {
    name: "Profile enrichment",
    what: "The structured profile fields returned by our enrichment service (name, title, company, schools, past employers) for up to 90 days.",
    scope: "Shared across all customers by LinkedIn URL, so a profile enriched once isn't re-scraped for every company. Raw scrape data beyond these fields isn't kept.",
  },
  {
    name: "Search & post lookups",
    what: "A short snapshot of what a search or recent-posts lookup returned (matched names/titles, or a preview of post text), so your admins can review what a lookup actually found.",
    scope: "Scoped to your own company only, visible only to your workspace's admins - never shared across companies.",
  },
];

const subprocessors: Subprocessor[] = [
  {
    name: "Profile enrichment service",
    usedFor: "Scraping and structuring LinkedIn profile data for your team and prospects.",
    dataShared: "LinkedIn profile URLs you or your team submit.",
  },
  {
    name: "Search service",
    usedFor: "Finding your company on LinkedIn during onboarding, pulling your team roster, and searching LinkedIn for prospects by title, location, company, or school.",
    dataShared: "Your company name/LinkedIn URL and the search filters you provide.",
  },
  {
    name: "AI research service",
    usedFor: "Auto-drafting your company description during signup, based on your website.",
    dataShared: "Your company's public website URL.",
  },
  {
    name: "Email service",
    usedFor: "Sending transactional email - password resets and workspace invites.",
    dataShared: "Recipient email address and the relevant message content (e.g. a reset link or invite).",
  },
  {
    name: "Payment processor",
    usedFor: "Billing and subscription management for paid plans.",
    dataShared: "Your billing email and payment details (handled entirely by our payment processor - Commonality never sees your card number).",
  },
  {
    name: "Website analytics service",
    usedFor: "Understanding how visitors use our public marketing site (theendurancegroup.com pages before you sign in) - page views, clicks, and session recordings, so we can improve the site.",
    dataShared: "Your browsing activity on our public marketing pages only. This never runs on the signed-in product - your team roster, prospect data, and usage logs are never seen by this service.",
  },
  {
    name: "In-app AI assistant",
    usedFor: "Powering the optional \"Try it here\" chat panel in your dashboard, so your team can ask Commonality questions without connecting it to your own AI first.",
    dataShared: "The messages you type into that chat panel, processed under our own account with this service - not yours. This is separate from using Commonality through your own AI (Claude, ChatGPT, Copilot), where your conversation stays entirely within your own AI subscription.",
  },
];

export function Privacy() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="mx-auto flex max-w-content items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center">
          <img src="/logo.png" alt="Commonality" className="h-7 w-auto" />
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/" className="text-lavender hover:text-ink">
            Home
          </Link>
          <SignedOut>
            <SignUpButton mode="modal">
              <button className="rounded-lg bg-brand px-4 py-2 font-medium text-white transition hover:bg-brand-dark">
                Try free
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <Link to="/dashboard" className="text-brand font-medium">
              Go to dashboard →
            </Link>
          </SignedIn>
          <span className="font-medium text-ink">Privacy</span>
        </div>
      </header>

      <section className="mx-auto max-w-content px-6 py-12">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Subprocessors &amp; data sharing</h1>

        <div className="mt-6 max-w-2xl rounded-lg border border-gray-200 bg-tint-accent p-6">
          <p className="font-medium text-ink">Your data is your own.</p>
          <p className="mt-2 text-sm text-ink">
            The Endurance Group never uses your team's LinkedIn connections or any other data you provide for our
            own purposes. We don't sell it, analyze it for our own benefit, use it to train models, or share it
            with anyone beyond what's needed to run the product for you. It's used only to power your own results
            inside your own workspace, via the subprocessors listed below.
          </p>
        </div>

        <p className="mt-6 max-w-2xl text-lavender">
          Commonality uses a small set of trusted third-party services to enrich LinkedIn profile data, research
          companies, send email, and process payments. This page lists each one, what it's used for, and what data
          it sees.
        </p>

        <div className="mt-10 space-y-4">
          {subprocessors.map((s) => (
            <div key={s.name} className="rounded-lg border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-ink">{s.name}</h2>
              <p className="mt-3 text-sm text-ink">
                <span className="font-medium">Used for:</span> {s.usedFor}
              </p>
              <p className="mt-2 text-sm text-lavender">
                <span className="font-medium text-ink">Data shared:</span> {s.dataShared}
              </p>
            </div>
          ))}
        </div>

        <h2 className="mt-12 text-xl font-bold text-ink">What we retain from lookups</h2>
        <p className="mt-2 max-w-2xl text-lavender">
          Beyond what's shared with the subprocessors above, we keep a small amount of what they return so your
          admins can see what a lookup found and audit your workspace's usage.
        </p>
        <div className="mt-6 space-y-4">
          {retentions.map((r) => (
            <div key={r.name} className="rounded-lg border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-ink">{r.name}</h3>
              <p className="mt-3 text-sm text-ink">{r.what}</p>
              <p className="mt-2 text-sm text-lavender">{r.scope}</p>
            </div>
          ))}
        </div>

        <p className="mt-10 text-sm text-lavender">
          Enterprise customers with additional data-handling or security requirements: these terms can be amended
          for your organization. Contact us to discuss.
        </p>

        <p className="mt-4 text-sm text-lavender">
          Questions about how your data is handled? Contact your account administrator or reach out to support.
        </p>
      </section>

      <footer className="bg-footer py-10 text-center text-sm text-white/60">
        <div className="mx-auto flex max-w-content flex-wrap items-center justify-center gap-2 px-6">
          <span>© {new Date().getFullYear()} Commonality</span>
          <span>·</span>
          <Link to="/" className="hover:text-white">
            Home
          </Link>
          <span>·</span>
          <Link to="/terms" className="hover:text-white">
            Terms
          </Link>
          <span>·</span>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="hover:text-white">Sign in</button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link to="/dashboard" className="hover:text-white">
              Dashboard
            </Link>
          </SignedIn>
        </div>
      </footer>
    </div>
  );
}
