"use client";

import { useCallback, useEffect, useState } from "react";
import type { Environment, FeatureFlag, FlagStatus } from "@/lib/store";

const ENVIRONMENTS: Environment[] = ["dev", "staging", "prod"];

const ENV_STYLES: Record<Environment, string> = {
  dev: "bg-blue-100 text-blue-800",
  staging: "bg-yellow-100 text-yellow-800",
  prod: "bg-red-100 text-red-800",
};

function EnvBadge({ env }: { env: Environment }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ENV_STYLES[env]}`}
    >
      {env}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

interface FormState {
  name: string;
  description: string;
  status: FlagStatus;
  rolloutPct: string;
  environment: Environment;
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  status: "off",
  rolloutPct: "0",
  environment: "dev",
};

export default function FlagsTable() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [rolloutDrafts, setRolloutDrafts] = useState<Record<string, string>>(
    {}
  );

  const refresh = useCallback(async () => {
    const res = await fetch("/api/flags");
    if (!res.ok) {
      setError("Failed to load flags");
      return;
    }
    setFlags(await res.json());
    setError(null);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  async function request(path: string, init: RequestInit) {
    const res = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Request failed");
      return false;
    }
    await refresh();
    return true;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const ok = await request("/api/flags", {
      method: "POST",
      body: JSON.stringify({
        name: form.name,
        description: form.description,
        status: form.status,
        rolloutPct: Number(form.rolloutPct),
        environment: form.environment,
      }),
    });
    if (ok) setForm(EMPTY_FORM);
  }

  function toggleStatus(flag: FeatureFlag) {
    request(`/api/flags/${flag.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: flag.status === "on" ? "off" : "on" }),
    });
  }

  function clearRolloutDraft(id: string) {
    setRolloutDrafts((d) => {
      const rest = { ...d };
      delete rest[id];
      return rest;
    });
  }

  function saveRollout(flag: FeatureFlag, value: string) {
    const pct = Number(value);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100 || pct === flag.rolloutPct) {
      clearRolloutDraft(flag.id);
      return;
    }
    request(`/api/flags/${flag.id}`, {
      method: "PATCH",
      body: JSON.stringify({ rolloutPct: pct }),
    }).then(() => clearRolloutDraft(flag.id));
  }

  function startEdit(flag: FeatureFlag) {
    setEditingId(flag.id);
    setEditForm({
      name: flag.name,
      description: flag.description,
      status: flag.status,
      rolloutPct: String(flag.rolloutPct),
      environment: flag.environment,
    });
  }

  async function saveEdit(id: string) {
    const ok = await request(`/api/flags/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: editForm.name,
        description: editForm.description,
        environment: editForm.environment,
      }),
    });
    if (ok) setEditingId(null);
  }

  function handleDelete(flag: FeatureFlag) {
    if (!window.confirm(`Delete flag "${flag.name}"?`)) return;
    request(`/api/flags/${flag.id}`, { method: "DELETE" });
  }

  if (loading) {
    return <p className="text-gray-500">Loading flags…</p>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <form
        onSubmit={handleCreate}
        className="flex flex-wrap items-end gap-3 rounded border border-gray-200 p-4"
      >
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input
            required
            className="rounded border border-gray-300 px-2 py-1"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Description
          <input
            className="w-64 rounded border border-gray-300 px-2 py-1"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Status
          <select
            className="rounded border border-gray-300 px-2 py-1"
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as FlagStatus })
            }
          >
            <option value="on">on</option>
            <option value="off">off</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Rollout %
          <input
            type="number"
            min={0}
            max={100}
            className="w-20 rounded border border-gray-300 px-2 py-1"
            value={form.rolloutPct}
            onChange={(e) => setForm({ ...form, rolloutPct: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Environment
          <select
            className="rounded border border-gray-300 px-2 py-1"
            value={form.environment}
            onChange={(e) =>
              setForm({ ...form, environment: e.target.value as Environment })
            }
          >
            {ENVIRONMENTS.map((env) => (
              <option key={env} value={env}>
                {env}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
        >
          Create flag
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-600">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Rollout %</th>
              <th className="px-3 py-2">Environment</th>
              <th className="px-3 py-2">Last changed</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {flags.map((flag) => {
              const editing = editingId === flag.id;
              return (
                <tr key={flag.id} className="border-b border-gray-100">
                  <td className="px-3 py-2 font-medium">
                    {editing ? (
                      <input
                        className="rounded border border-gray-300 px-2 py-1"
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                      />
                    ) : (
                      flag.name
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {editing ? (
                      <input
                        className="w-full rounded border border-gray-300 px-2 py-1"
                        value={editForm.description}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            description: e.target.value,
                          })
                        }
                      />
                    ) : (
                      flag.description
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      role="switch"
                      aria-checked={flag.status === "on"}
                      aria-label={`Toggle ${flag.name}`}
                      onClick={() => toggleStatus(flag)}
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        flag.status === "on" ? "bg-green-500" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                          flag.status === "on" ? "left-[22px]" : "left-0.5"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      aria-label={`Rollout percent for ${flag.name}`}
                      className="w-20 rounded border border-gray-300 px-2 py-1"
                      value={rolloutDrafts[flag.id] ?? String(flag.rolloutPct)}
                      onChange={(e) =>
                        setRolloutDrafts((d) => ({
                          ...d,
                          [flag.id]: e.target.value,
                        }))
                      }
                      onBlur={(e) => saveRollout(flag, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                    />
                  </td>
                  <td className="px-3 py-2">
                    {editing ? (
                      <select
                        className="rounded border border-gray-300 px-2 py-1"
                        value={editForm.environment}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            environment: e.target.value as Environment,
                          })
                        }
                      >
                        {ENVIRONMENTS.map((env) => (
                          <option key={env} value={env}>
                            {env}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <EnvBadge env={flag.environment} />
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    <div>{flag.lastChangedBy}</div>
                    <div className="text-xs text-gray-400">
                      {formatDate(flag.lastChangedAt)}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      {editing ? (
                        <>
                          <button
                            onClick={() => saveEdit(flag.id)}
                            className="rounded bg-gray-900 px-2 py-1 text-xs font-medium text-white hover:bg-gray-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(flag)}
                            className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(flag)}
                            className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {flags.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
                  No feature flags yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
