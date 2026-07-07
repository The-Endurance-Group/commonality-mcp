import { Link } from "react-router-dom";

// Shown on every authenticated page (Layout-wrapped pages, plus Onboarding
// which renders outside Layout). Distinct from the public Marketing page's
// own footer.
export function AppFooter() {
  return (
    <footer className="border-t border-gray-100 py-6 text-center text-sm text-lavender">
      <div className="mx-auto flex max-w-content flex-wrap items-center justify-center gap-2 px-6">
        <Link to="/terms" className="hover:text-ink">
          Terms
        </Link>
        <span>·</span>
        <Link to="/privacy" className="hover:text-ink">
          Privacy
        </Link>
        <span>·</span>
        <span>
          Questions or concerns? Reach out to{" "}
          <a href="mailto:csullivan@theendurancegroup.com" className="text-brand hover:underline">
            csullivan@theendurancegroup.com
          </a>
        </span>
      </div>
    </footer>
  );
}
