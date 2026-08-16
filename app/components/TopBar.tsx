"use client";

import type { Role } from "@/lib/store";
import { ROLES, useRole } from "./RoleContext";

export default function TopBar() {
  const { role, setRole } = useRole();

  return (
    <header className="flex items-center justify-between border-b border-gray-200 px-6 py-3">
      <span className="text-lg font-semibold">Feature Flag Admin</span>
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
