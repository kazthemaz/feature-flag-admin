"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/store";
import { ROLES, useRole } from "./RoleContext";

const NAV_LINKS = [
  { href: "/", label: "Feature Flags" },
  { href: "/audit", label: "Audit Log" },
];

export default function TopBar() {
  const { role, setRole } = useRole();
  const pathname = usePathname();

  return (
    <header className="flex items-center justify-between border-b border-gray-200 px-6 py-3">
      <div className="flex items-center gap-6">
        <span className="text-lg font-semibold">Feature Flag Admin</span>
        <nav className="flex items-center gap-4 text-sm">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "font-medium text-gray-900 underline underline-offset-4"
                    : "text-gray-500 hover:text-gray-900"
                }
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
      <label className="flex items-center gap-2 text-sm">
        Role
        <select
          className="rounded border border-gray-300 px-2 py-1"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
    </header>
  );
}
