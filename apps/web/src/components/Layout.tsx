import { UserButton } from "@clerk/clerk-react";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useAuthStore } from "../lib/store";

const tabs = [
  { to: "/dashboard", label: "Dashboard", adminOnly: false },
  { to: "/invites", label: "Invites", adminOnly: true },
  { to: "/billing", label: "Billing", adminOnly: true },
];

export function Layout({ children }: { children: ReactNode }) {
  const isAdmin = useAuthStore((s) => s.claims?.role === "admin");
  const visibleTabs = tabs.filter((t) => !t.adminOnly || isAdmin);

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-content items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <img src="/logo.png" alt="Commonality" className="h-6 w-auto" />
            <nav className="flex gap-4 text-sm">
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
          <UserButton />
        </div>
      </header>
      <main className="mx-auto max-w-content px-6 py-8">{children}</main>
    </div>
  );
}
