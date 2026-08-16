import { NextRequest, NextResponse } from "next/server";
import {
  deleteFlag,
  updateFlag,
  type Environment,
  type FlagStatus,
  type UpdateFlagInput,
} from "@/lib/store";

const STATUSES: FlagStatus[] = ["on", "off"];
const ENVIRONMENTS: Environment[] = ["dev", "staging", "prod"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const { name, description, status, rolloutPct, environment, changedBy } =
    body ?? {};

  const input: UpdateFlagInput = {
    changedBy: typeof changedBy === "string" && changedBy ? changedBy : "admin",
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
    if (!STATUSES.includes(status)) {
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
    if (!ENVIRONMENTS.includes(environment)) {
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
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!deleteFlag(params.id)) {
    return NextResponse.json({ error: "flag not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
