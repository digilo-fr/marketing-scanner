import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import type { AuditStatusResponse } from "@/types";

import { authOptions } from "@/lib/auth";
import {
  getAudit,
  isUserAllowed,
  listRecommendations,
} from "@/lib/sheets-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// NextAuth session only — the unauthenticated x-user-email header
// fallback was removed (it let anyone impersonate a user).
async function resolveUserEmail(): Promise<string | null> {
  try {
    const session = (await getServerSession(authOptions)) as
      | { user?: { email?: string } }
      | null;
    const email = session?.user?.email;
    if (email) return email;
  } catch (err) {
    console.warn("[audit/get] getServerSession failed:", (err as Error).message);
  }
  return null;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/audit/[id] — return audit status + recommendations.
 *
 * Requires the caller to own the audit (matched by email).
 */
export async function GET(
  req: NextRequest,
  ctx: RouteContext
): Promise<NextResponse> {
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Missing audit id" }, { status: 400 });
  }

  const email = await resolveUserEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  if (!isUserAllowed(email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const audit = await getAudit(id);
  if (!audit) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }
  if (audit.owner_email !== email) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const recommendations =
    audit.status === "completed" ? await listRecommendations(id) : [];

  const resp: AuditStatusResponse = {
    audit,
    recommendations,
  };
  return NextResponse.json(resp);
}
