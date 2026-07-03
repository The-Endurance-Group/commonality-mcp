import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/clerk-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface Section {
  title: string;
  body: ReactNode;
}

const sections: Section[] = [
  {
    title: "1. Agreement to these Terms",
    body: (
      <>
        <p>
          These Terms of Service ("Terms") are a binding agreement between The Endurance Group ("TEG," "Commonality,"
          "we," "us," or "our") and the company or individual using Commonality ("you," "your," or "Customer"). By
          creating a workspace, connecting Commonality to your AI assistant, or otherwise using the service, you
          agree to these Terms on behalf of yourself and, if applicable, the company you represent.
        </p>
        <p className="mt-3">
          If you don't agree to these Terms, don't use Commonality. If you're accepting on behalf of a company, you
          confirm you have authority to bind that company to this agreement.
        </p>
      </>
    ),
  },
  {
    title: "2. The Service",
    body: (
      <p>
        Commonality is a sales-intelligence tool that maps shared connections, schools, employers, and locations
        between your team and your prospects, and surfaces that information to you through a connector in Claude
        (or another AI assistant you connect it to) and a web app used for account setup, billing, and team
        management. Commonality relies on a small set of third-party subprocessors to do this - see our{" "}
        <Link to="/privacy" className="font-medium text-brand hover:underline">
          Privacy &amp; subprocessors page
        </Link>{" "}
        for the full list and what each one sees.
      </p>
    ),
  },
  {
    title: "3. Accounts & workspaces",
    body: (
      <>
        <p>
          You sign up with a work email and either create a new workspace (making you its admin) or join an
          existing workspace tied to your company's email domain. Workspace admins are responsible for the accuracy
          of the company information they provide, for managing who has access to the workspace, and for their
          team members' compliance with these Terms.
        </p>
        <p className="mt-3">
          You're responsible for keeping your account credentials secure and for all activity that happens under
          your account. Tell us right away if you suspect unauthorized access.
        </p>
      </>
    ),
  },
  {
    title: "4. Plans, billing & cancellation",
    body: (
      <>
        <p>
          Commonality offers a Free plan (50 credits/month, up to 25 team members), a Pro plan ($49/month, 200
          credits/month, up to 150 team members), and custom Enterprise plans. Current plan details and pricing are
          posted on our{" "}
          <Link to="/" className="font-medium text-brand hover:underline">
            pricing page
          </Link>{" "}
          and may change from time to time; we'll give existing customers reasonable notice before a price change
          takes effect on their next billing cycle.
        </p>
        <p className="mt-3">
          Paid plans are billed in advance on a recurring monthly basis via Stripe and automatically renew until
          canceled. You can cancel anytime from your workspace's billing settings; cancellation takes effect at the
          end of your current billing period, and we don't provide prorated refunds for partial billing periods
          except where required by law. You're responsible for all applicable taxes.
        </p>
        <p className="mt-3">
          If a payment fails, we may suspend access to paid features until the balance is resolved. Credit limits
          reset monthly according to the terms shown in-product; unused credits don't roll over or carry a cash
          value.
        </p>
      </>
    ),
  },
  {
    title: "5. Acceptable use",
    body: (
      <>
        <p>You agree not to, and not to let anyone else using your workspace:</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>Use Commonality to harass, stalk, or discriminate against any individual;</li>
          <li>
            Attempt to reverse-engineer, scrape, or extract Commonality's matching algorithm, underlying data
            sources, or software;
          </li>
          <li>Resell, sublicense, or provide Commonality's functionality to third parties as a competing service;</li>
          <li>
            Upload or submit data (including team rosters or LinkedIn connections) that you don't have the right to
            share, or that violates a third party's privacy or contractual rights (including LinkedIn's own terms of
            use);
          </li>
          <li>Use the service to send unsolicited bulk communications (spam) or in violation of applicable law;</li>
          <li>
            Attempt to circumvent usage limits, quotas, or access controls, or interfere with the service's normal
            operation.
          </li>
        </ul>
        <p className="mt-3">
          We may suspend or terminate access for a violation of this section, with notice where practical.
        </p>
      </>
    ),
  },
  {
    title: "6. Your data",
    body: (
      <>
        <p>
          You own the data you and your team submit to Commonality - team rosters, LinkedIn connections, company
          information, and prospect data. You grant us a limited license to use that data solely to provide the
          service to you (matching, enrichment, outreach drafting, etc.), as described in our{" "}
          <Link to="/privacy" className="font-medium text-brand hover:underline">
            Privacy page
          </Link>
          . We do not sell your data, use it for our own analysis or benefit, or use it to train models, and we
          never will.
        </p>
        <p className="mt-3">
          You represent that you have the right to submit any data you provide (including any teammate's LinkedIn
          connections uploaded on their behalf) and that doing so doesn't violate any agreement or law that applies
          to you.
        </p>
      </>
    ),
  },
  {
    title: "7. Intellectual property",
    body: (
      <p>
        Commonality, including its software, matching algorithm, branding, and documentation, is owned by TEG and
        protected by intellectual property law. These Terms give you a limited, non-exclusive, non-transferable
        right to use the service for your own business purposes - nothing here transfers ownership of our
        technology to you. Feedback you give us about the product may be used by us without restriction or
        compensation to you.
      </p>
    ),
  },
  {
    title: "8. Disclaimers",
    body: (
      <p>
        Commonality is provided "as is" and "as available." Warm-path suggestions, enrichment data, and AI-drafted
        outreach are generated from third-party and user-submitted data and may be incomplete, outdated, or
        inaccurate - you're responsible for verifying any information and outreach before acting on it. To the
        maximum extent permitted by law, we disclaim all warranties, express or implied, including merchantability,
        fitness for a particular purpose, and non-infringement. We don't guarantee the service will be uninterrupted,
        error-free, or that any particular business outcome (like a successful introduction or meeting) will result
        from using it.
      </p>
    ),
  },
  {
    title: "9. Limitation of liability",
    body: (
      <p>
        To the maximum extent permitted by law, TEG will not be liable for any indirect, incidental, special,
        consequential, or punitive damages, or for lost profits or revenue, arising from your use of Commonality,
        even if we've been advised of the possibility of those damages. Our total liability to you for any claim
        arising from these Terms or the service is limited to the amount you paid us in the 12 months before the
        claim arose, or $100 if you're on the Free plan. Some jurisdictions don't allow these limitations, so they
        may not fully apply to you.
      </p>
    ),
  },
  {
    title: "10. Indemnification",
    body: (
      <p>
        You agree to indemnify and hold TEG harmless from any claim, loss, or damage (including reasonable legal
        fees) arising from your violation of these Terms, your misuse of the service, or data you submit that
        infringes someone else's rights or violates the law.
      </p>
    ),
  },
  {
    title: "11. Termination",
    body: (
      <>
        <p>
          You can stop using Commonality and delete your workspace or your own account at any time from your
          dashboard. We may suspend or terminate your access if you materially breach these Terms (including
          Section 5) and don't cure the breach within a reasonable time after notice, or immediately for severe
          violations (e.g. abuse, fraud, or legal risk to us or others).
        </p>
        <p className="mt-3">
          On termination, your right to use the service ends; sections of these Terms that by their nature should
          survive (ownership, disclaimers, limitation of liability, indemnification) continue to apply.
        </p>
      </>
    ),
  },
  {
    title: "12. Changes to these Terms",
    body: (
      <p>
        We may update these Terms from time to time. If we make a material change, we'll provide reasonable notice
        (for example, by email or an in-product notice) before it takes effect. Continuing to use Commonality after
        a change takes effect means you accept the updated Terms.
      </p>
    ),
  },
  {
    title: "13. Governing law",
    body: (
      <p>
        These Terms are governed by the laws of the State of Maine, without regard to conflict-of-law principles.
        Any dispute not resolved informally will be brought in the state or federal courts located in Maine, and
        both parties consent to that jurisdiction.
      </p>
    ),
  },
  {
    title: "14. Contact",
    body: (
      <p>
        Questions about these Terms? Reach out to your account administrator or{" "}
        <a href="mailto:hello@theendurancegroup.com" className="font-medium text-brand hover:underline">
          hello@theendurancegroup.com
        </a>
        .
      </p>
    ),
  },
];

export function Terms() {
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
          <span className="font-medium text-ink">Terms</span>
        </div>
      </header>

      <section className="mx-auto max-w-content px-6 py-12">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Terms of Service</h1>
        <p className="mt-2 text-sm text-lavender">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

        <div className="mt-10 max-w-2xl space-y-8">
          {sections.map((s) => (
            <div key={s.title}>
              <h2 className="text-lg font-semibold text-ink">{s.title}</h2>
              <div className="mt-2 text-sm leading-relaxed text-lavender [&_a]:text-brand [&_li]:text-lavender [&_p]:text-lavender">
                {s.body}
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="bg-footer py-10 text-center text-sm text-white/60">
        <div className="mx-auto flex max-w-content flex-wrap items-center justify-center gap-2 px-6">
          <span>© {new Date().getFullYear()} Commonality</span>
          <span>·</span>
          <Link to="/" className="hover:text-white">
            Home
          </Link>
          <span>·</span>
          <Link to="/privacy" className="hover:text-white">
            Privacy
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
