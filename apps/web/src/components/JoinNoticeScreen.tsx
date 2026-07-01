import { useEffect } from "react";
import { useAuthStore } from "../lib/store";

// Shown once, right after a user is auto-joined to a workspace they didn't
// create (via invite acceptance or email-domain match), so the auto-join
// isn't silent. Clears itself and continues on to the dashboard.
export function JoinNoticeScreen() {
  const joinNotice = useAuthStore((s) => s.joinNotice);
  const clearJoinNotice = useAuthStore((s) => s.clearJoinNotice);

  useEffect(() => {
    const t = setTimeout(clearJoinNotice, 2600);
    return () => clearTimeout(t);
  }, [clearJoinNotice]);

  if (!joinNotice) return null;

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="animate-fade-up max-w-md rounded-lg border border-gray-100 bg-white p-8 text-center shadow-sm">
        <p className="text-lg font-semibold text-ink">
          We see {joinNotice.companyName} already has an account.
        </p>
        <p className="mt-2 text-sm text-lavender">{joinNotice.adminEmail} is the admin.</p>
        <p className="mt-4 text-sm text-lavender">Taking you to your dashboard now…</p>
      </div>
    </div>
  );
}
