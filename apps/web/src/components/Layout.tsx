import { UserButton } from "@clerk/clerk-react";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/invites", label: "Invites" },
  { to: "/billing", label: "Billing" },
];

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-ink">Commonality</span>
            <nav className="flex gap-4 text-sm">
              {tabs.map((t) => (
                <NavLink
                  key={t.to}
                  to={t.to}
                  className={({ isActive }) =>
                    isActive ? "text-brand font-medium" : "text-gray-500 hover:text-ink"
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
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
