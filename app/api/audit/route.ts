import { NextRequest, NextResponse } from "next/server";
import { listAuditLog } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const flag = req.nextUrl.searchParams.get("flag");
  const action = req.nextUrl.searchParams.get("action");
  let entries = listAuditLog();
  if (flag) {
    entries = entries.filter(
      (e) => e.flagName === flag || e.flagId === flag
    );
  }
  if (action) {
    entries = entries.filter((e) => e.action === action);
  }
  return NextResponse.json(entries);
}
