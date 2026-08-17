"use client";

import { useEffect, useState } from "react";
import type { AuditEntry, FeatureFlag } from "@/lib/store";

const ACTION_STYLES: Record<AuditEntry["action"], string> = {
  create: "bg-green-100 text-green-800",
  update: "bg-blue-100 text-blue-800",
  delete: "bg-red-100 text-red-800",
};

function summarizeChange(entry: AuditEntry): string {
  if (entry.action === "create") return "flag created";
  if (entry.action === "delete") return "flag deleted";
  const oldV = entry.oldValue;
  const newV = entry.newValue;
  if (!oldV || !newV) return "";
  const keys: (keyof FeatureFlag)[] = [
    "name",
    "description",
    "status",
    "rolloutPct",
    "environment",
  ];
  const changes = keys
    .filter((k) => oldV[k] !== newV[k])
    .map((k) => `${k}: ${String(oldV[k])} → ${String(newV[k])}`);
  return changes.length > 0 ? changes.join(", ") : "no field changes";
}

export default function AuditTable() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/audit", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        setEntries(await res.json());
      })
      .catch(() => setError("Failed to load audit log"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading audit log…</p>;
  if (error)
    return (
      <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {error}
      </p>
    );
  if (entries.length === 0)
    return (
      <div className="rounded border border-dashed border-gray-300 p-8 text-center text-gray-500">
        No audit entries yet.
      </div>
    );

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-600">
            <th className="px-3 py-2">Time</th>
            <th className="px-3 py-2">Action</th>
            <th className="px-3 py-2">Flag</th>
            <th className="px-3 py-2">Change</th>
            <th className="px-3 py-2">Actor</th>
            <th className="px-3 py-2">Role</th>
          </tr>
        </thead>
        <tbody>
          {[...entries].reverse().map((entry) => (
            <tr key={entry.id} className="border-b border-gray-100">
              <td className="px-3 py-2 text-gray-600">
                {new Date(entry.timestamp).toLocaleString()}
              </td>
              <td className="px-3 py-2">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_STYLES[entry.action]}`}
                >
                  {entry.action}
                </span>
              </td>
              <td className="px-3 py-2 font-medium">
                {entry.flagName}
                <span className="ml-1 text-xs text-gray-400">
                  ({entry.flagId})
                </span>
              </td>
              <td className="px-3 py-2 text-gray-600">
                {summarizeChange(entry)}
              </td>
              <td className="px-3 py-2 text-gray-600">{entry.actor}</td>
              <td className="px-3 py-2 text-gray-600">{entry.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
