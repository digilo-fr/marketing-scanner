import { NextResponse, type NextRequest } from "next/server";
import type { AuditStatusResponse } from "@/types";

import {
  getAudit,
  isUserAllowed,
  listRecommendations,
} from "@/lib/sheets-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveUserEmail(req: NextRequest): Promise<string | null> {
  try {
    const authPath = "@/lib/auth";
    const authMod = (await import(/* @vite-ignore */ authPath).catch(
      () => null
    )) as { authOptions?: unknown } | null;
    const nextAuthMod = (await import("next-auth").catch(() => null)) as
      | { getServerSession?: (opts?: unknown) => Promise<unknown> }
      | null;
    if (authMod?.authOptions && nextAuthMod?.getServerSession) {
      const session = (await nextAuthMod.getServerSession(authMod.authOptions)) as
        | { user?: { email?: string } }
        | null;
      const email = session?.user?.email;
      if (email) return email;
    }
  } catch {
    // ignore
  }
  const header = req.headers.get("x-user-email");
  return header ? header.trim() : null;
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

  const email = await resolveUserEmail(req);
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
