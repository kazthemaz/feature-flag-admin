import { NextRequest, NextResponse } from "next/server";
import {
  createFlag,
  isEnvironment,
  isFlagStatus,
  isRole,
  listFlags,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listFlags());
}

export async function POST(req: NextRequest) {
  const role = req.headers.get("x-role");
  if (!isRole(role)) {
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

  if (typeof name !== "string" || name.trim() === "") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (typeof description !== "string") {
    return NextResponse.json(
      { error: "description is required" },
      { status: 400 }
    );
  }
  if (!isFlagStatus(status)) {
    return NextResponse.json(
      { error: "status must be 'on' or 'off'" },
      { status: 400 }
    );
  }
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
  if (!isEnvironment(environment)) {
    return NextResponse.json(
      { error: "environment must be 'dev', 'staging', or 'prod'" },
      { status: 400 }
    );
  }
  // RBAC: creating a prod flag requires Engineer.
  if (environment === "prod" && role !== "Engineer") {
    return NextResponse.json(
      { error: "Only Engineers can change production flags." },
      { status: 403 }
    );
  }

  const flag = createFlag({
    name: name.trim(),
    description,
    status,
    rolloutPct,
    environment,
    changedBy: typeof changedBy === "string" && changedBy ? changedBy : "admin",
    role,
  });
  return NextResponse.json(flag, { status: 201 });
}
