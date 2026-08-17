import { NextRequest, NextResponse } from "next/server";
import {
  deleteFlag,
  getFlag,
  isEnvironment,
  isFlagStatus,
  isRole,
  updateFlag,
  type Role,
  type UpdateFlagInput,
} from "@/lib/store";

function requestRole(req: NextRequest): Role | null {
  const role = req.headers.get("x-role");
  return isRole(role) ? role : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const role = requestRole(req);
  if (!role) {
    return NextResponse.json(
      { error: "missing or invalid x-role header" },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const { name, description, status, rolloutPct, environment, changedBy } =
    (body ?? {}) as Record<string, unknown>;

  const existing = getFlag(params.id);
  if (!existing) {
    return NextResponse.json({ error: "flag not found" }, { status: 404 });
  }
  // RBAC: changes to prod flags (or moving a flag into prod) require Engineer.
  if (
    role !== "Engineer" &&
    (existing.environment === "prod" || environment === "prod")
  ) {
    return NextResponse.json(
      { error: "Only Engineers can change production flags." },
      { status: 403 }
    );
  }

  const input: UpdateFlagInput = {
    changedBy: typeof changedBy === "string" && changedBy ? changedBy : "admin",
    role,
  };

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "name must be a non-empty string" },
        { status: 400 }
      );
    }
    input.name = name.trim();
  }
  if (description !== undefined) {
    if (typeof description !== "string") {
      return NextResponse.json(
        { error: "description must be a string" },
        { status: 400 }
      );
    }
    input.description = description;
  }
  if (status !== undefined) {
    if (!isFlagStatus(status)) {
      return NextResponse.json(
        { error: "status must be 'on' or 'off'" },
        { status: 400 }
      );
    }
    input.status = status;
  }
  if (rolloutPct !== undefined) {
    if (
      typeof rolloutPct !== "number" ||
      !Number.isFinite(rolloutPct) ||
      rolloutPct < 0 ||
      rolloutPct > 100
    ) {
      return NextResponse.json(
        { error: "rolloutPct must be a number between 0 and 100" },
        { status: 400 }
      );
    }
    input.rolloutPct = rolloutPct;
  }
  if (environment !== undefined) {
    if (!isEnvironment(environment)) {
      return NextResponse.json(
        { error: "environment must be 'dev', 'staging', or 'prod'" },
        { status: 400 }
      );
    }
    input.environment = environment;
  }

  const flag = updateFlag(params.id, input);
  if (!flag) {
    return NextResponse.json({ error: "flag not found" }, { status: 404 });
  }
  return NextResponse.json(flag);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const role = requestRole(req);
  if (!role) {
    return NextResponse.json(
      { error: "missing or invalid x-role header" },
      { status: 400 }
    );
  }
  // RBAC: deleting a flag in any environment requires Engineer.
  if (role !== "Engineer") {
    return NextResponse.json(
      { error: "Only Engineers can delete flags." },
      { status: 403 }
    );
  }
  if (!deleteFlag(params.id, "admin", role)) {
    return NextResponse.json({ error: "flag not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
