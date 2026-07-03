import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/clerk-react";
import { Link } from "react-router-dom";

interface Subprocessor {
  name: string;
  usedFor: string;
  dataShared: string;
}

const subprocessors: Subprocessor[] = [
  {
    name: "Cassidy",
    usedFor: "Scraping and structuring LinkedIn profile data for your team and prospects.",
    dataShared: "LinkedIn profile URLs you or your team submit.",
  },
  {
    name: "Apify",
    usedFor: "Finding your company on LinkedIn during onboarding, pulling your team roster, and searching LinkedIn for prospects by title, location, company, or school.",
    dataShared: "Your company name/LinkedIn URL and the search filters you provide.",
  },
  {
    name: "Perplexity",
    usedFor: "Auto-drafting your company description during signup, based on your website.",
    dataShared: "Your company's public website URL.",
  },
  {
    name: "Resend",
    usedFor: "Sending transactional email - password resets and workspace invites.",
    dataShared: "Recipient email address and the relevant message content (e.g. a reset link or invite).",
  },
  {
    name: "Stripe",
    usedFor: "Billing and subscription management for paid plans.",
    dataShared: "Your billing email and payment details (handled entirely by Stripe - Commonality never sees your card number).",
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

        <p className="mt-10 text-sm text-lavender">
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
