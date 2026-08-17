"use client";

import { useEffect, useMemo, useState } from "react";
import type { AuditAction, AuditEntry, FeatureFlag } from "@/lib/store";

const ACTIONS: AuditAction[] = ["create", "update", "delete"];

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
  const [flagFilter, setFlagFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [flagNames, setFlagNames] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (flagFilter) params.set("flag", flagFilter);
    if (actionFilter) params.set("action", actionFilter);
    const query = params.toString();
    fetch(`/api/audit${query ? `?${query}` : ""}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const data: AuditEntry[] = await res.json();
        if (cancelled) return;
        setEntries(data);
        setError(null);
        if (!query) {
          setFlagNames(
            Array.from(new Set(data.map((e) => e.flagName))).sort()
          );
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load audit log");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [flagFilter, actionFilter]);

  const filters = useMemo(
    () => (
      <div className="mb-3 flex items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          Flag
          <select
            className="rounded border border-gray-300 px-2 py-1"
            value={flagFilter}
            onChange={(e) => setFlagFilter(e.target.value)}
          >
            <option value="">All flags</option>
            {flagNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          Action
          <select
            className="rounded border border-gray-300 px-2 py-1"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">All actions</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        {(flagFilter || actionFilter) && (
          <button
            onClick={() => {
              setFlagFilter("");
              setActionFilter("");
            }}
            className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
          >
            Clear filters
          </button>
        )}
      </div>
    ),
    [flagFilter, actionFilter, flagNames]
  );

  if (loading) return <p className="text-gray-500">Loading audit log…</p>;
  if (error)
    return (
      <div>
        {filters}
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      </div>
    );
  if (entries.length === 0)
    return (
      <div>
        {filters}
        <div className="rounded border border-dashed border-gray-300 p-8 text-center text-gray-500">
          {flagFilter || actionFilter
            ? "No audit entries match the filters."
            : "No audit entries yet."}
        </div>
      </div>
    );

  return (
    <div className="overflow-x-auto">
      {filters}
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
