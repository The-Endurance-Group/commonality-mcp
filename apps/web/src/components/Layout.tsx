import { UserButton } from "@clerk/clerk-react";
import { type ReactNode, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuthStore } from "../lib/store";

const tabs = [
  { to: "/dashboard", label: "Dashboard", adminOnly: false, superadminOnly: false },
  { to: "/invites", label: "Invites", adminOnly: true, superadminOnly: false },
  { to: "/billing", label: "Billing", adminOnly: true, superadminOnly: false },
  { to: "/superadmin", label: "All accounts", adminOnly: false, superadminOnly: true },
];

export function Layout({ children }: { children: ReactNode }) {
  const isAdmin = useAuthStore((s) => s.claims?.role === "admin");
  const isSuperadmin = useAuthStore((s) => s.claims?.is_superadmin ?? false);
  const visibleTabs = tabs.filter((t) => (!t.adminOnly || isAdmin) && (!t.superadminOnly || isSuperadmin));
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-content items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <img src="/logo.png" alt="Commonality" className="h-6 w-auto" />
            <nav className="hidden gap-4 text-sm sm:flex">
              {visibleTabs.map((t) => (
                <NavLink
                  key={t.to}
                  to={t.to}
                  className={({ isActive }) =>
                    isActive ? "text-brand font-medium" : "text-lavender hover:text-ink"
                  }
                >
                  {t.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <UserButton />
            <button
              className="flex h-8 w-8 items-center justify-center rounded-md text-lavender hover:bg-gray-50 sm:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {menuOpen ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="flex flex-col gap-1 border-t border-gray-100 px-6 py-3 text-sm sm:hidden">
            {visibleTabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `rounded-md px-2 py-2 ${isActive ? "text-brand font-medium" : "text-lavender hover:text-ink"}`
                }
              >
                {t.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-content px-6 py-8">{children}</main>
    </div>
  );
}
