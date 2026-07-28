import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Microsoft Clarity (session replay / heatmaps) - PUBLIC MARKETING PAGES ONLY.
// Deliberately never runs on the authenticated app (Dashboard, Billing,
// Onboarding, Invites, SuperAdmin) - Clarity's session recording would
// otherwise capture team rosters, prospect data, and usage logs, which cuts
// against this product's "your data is used only to power your own results"
// commitment. See Privacy.tsx for the corresponding subprocessor disclosure.

const CLARITY_PROJECT_ID = "xtmnxygfmu";
const PUBLIC_PATHS = new Set(["/", "/privacy", "/terms"]);

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

function loadClarityScript(): void {
  if (window.clarity) return;
  (function (c: Window, l: Document, a: string, r: string, i: string) {
    type ClarityFn = { (...args: unknown[]): void; q?: unknown[] };
    const w = c as unknown as Record<string, ClarityFn>;
    w[a] =
      w[a] ||
      ((...args: unknown[]) => {
        (w[a].q = w[a].q || []).push(args);
      });
    const t = l.createElement(r) as HTMLScriptElement;
    t.async = true;
    t.src = `https://www.clarity.ms/tag/${i}`;
    const y = l.getElementsByTagName(r)[0];
    y.parentNode?.insertBefore(t, y);
  })(window, document, "clarity", "script", CLARITY_PROJECT_ID);
}

export function ClarityTracking(): null {
  const location = useLocation();

  useEffect(() => {
    if (PUBLIC_PATHS.has(location.pathname)) {
      loadClarityScript();
      window.clarity?.("start");
    } else {
      // Script may already be loaded from an earlier public-page visit this
      // session - explicitly pause recording rather than relying on the
      // script simply not being present.
      window.clarity?.("stop");
    }
  }, [location.pathname]);

  return null;
}
