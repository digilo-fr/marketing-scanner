import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

export const maxDuration = 60;

import type {
  AgentResult,
  Audit,
  AuditTier,
  ScrapedSite,
  StartAuditResponse,
} from "@/types";
import {
  createAudit,
  createRecommendations,
  getProject,
  isUserAllowed,
  updateAudit,
} from "@/lib/sheets-db";
import { scrapeSite } from "@/lib/scraper";
import { pickProvidersForTier } from "@/lib/llm-router";
import { runAgent as runContent } from "@/lib/agents/content";
import { runAgent as runConversion } from "@/lib/agents/conversion";
import { runAgent as runSeo } from "@/lib/agents/seo";
import { runAgent as runCompetitive } from "@/lib/agents/competitive";
import { runBrandAgent, runGrowthAgent } from "@/lib/agents/strategy";
import {
  buildReportMd,
  computeOverallScore,
  flattenRecommendations,
} from "@/lib/synthesizer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const StartAuditSchema = z.object({
  project_id: z.string().min(1),
  target_url: z.string().url(),
  tier: z.enum(["quick", "full", "premium"]),
});

// ============================================================
// Auth resolution (NextAuth if available, x-user-email fallback)
// ============================================================

async function resolveUserEmail(req: NextRequest): Promise<string | null> {
  // Try NextAuth via dynamic import so the file remains buildable before
  // `src/lib/auth.ts` exists.
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
    // ignore — fall through to header
  }
  const header = req.headers.get("x-user-email");
  return header ? header.trim() : null;
}

// ============================================================
// Pipeline
// ============================================================

async function runAgentsParallel(
  site: ScrapedSite,
  tier: AuditTier
): Promise<{ results: AgentResult[]; llmUsed: string[] }> {
  // 6 agents in fixed order so the rotation in pickProvidersForTier is stable.
  const agentSpecs: {
    name: string;
    fn: (
      s: ScrapedSite,
      providers: ReturnType<typeof pickProvidersForTier>
    ) => Promise<AgentResult>;
  }[] = [
    { name: "content", fn: runContent },
    { name: "conversion", fn: runConversion },
    { name: "seo", fn: runSeo },
    { name: "competitive", fn: runCompetitive },
    { name: "brand", fn: runBrandAgent },
    { name: "growth", fn: runGrowthAgent },
  ];

  const llmUsed: string[] = [];

  if (tier === "quick") {
    // Only run content + conversion + seo to save budget; still fits the
    // CategoryScores shape (others remain 0).
    const quickSpecs = agentSpecs.slice(0, 3);
    const settled = await Promise.allSettled(
      quickSpecs.map((spec, i) => {
        const providers = pickProvidersForTier(tier, i);
        providers.forEach((p) => llmUsed.push(`${p.provider}:${p.model}`));
        return spec.fn(site, providers);
      })
    );
    const results: AgentResult[] = [];
    settled.forEach((r, i) => {
      if (r.status === "fulfilled") results.push(r.value);
      else console.error(`[audit] agent ${quickSpecs[i].name} failed:`, r.reason);
    });
    return { results, llmUsed };
  }

  const settled = await Promise.allSettled(
    agentSpecs.map((spec, i) => {
      const providers = pickProvidersForTier(tier, i);
      providers.forEach((p) => llmUsed.push(`${p.provider}:${p.model}`));
      return spec.fn(site, providers);
    })
  );
  const results: AgentResult[] = [];
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") results.push(r.value);
    else console.error(`[audit] agent ${agentSpecs[i].name} failed:`, r.reason);
  });
  return { results, llmUsed };
}

async function runPipeline(auditId: string, targetUrl: string, tier: AuditTier) {
  const startedAt = Date.now();
  try {
    await updateAudit(auditId, { status: "scraping" });
    const site = await scrapeSite(targetUrl);

    await updateAudit(auditId, { status: "analyzing" });
    const { results, llmUsed } = await runAgentsParallel(site, tier);
    if (results.length === 0) {
      throw new Error("All agents failed; no results to synthesize.");
    }

    await updateAudit(auditId, { status: "synthesizing" });
    const { score, grade } = computeOverallScore(results);
    const scoresMap: Record<string, number> = {};
    for (const r of results) scoresMap[r.category] = r.score;

    // We need the persisted audit for buildReportMd metadata.
    const auditForReport: Audit = {
      id: auditId,
      project_id: "",
      owner_email: "",
      target_url: targetUrl,
      tier,
      status: "synthesizing",
      overall_score: score,
      grade,
      scores_json: JSON.stringify(scoresMap),
      report_md_url: "",
      pdf_url: "",
      llm_used: llmUsed.join(","),
      duration_sec: 0,
      error: "",
      created_at: new Date(startedAt).toISOString(),
      completed_at: "",
    };
    const reportMd = buildReportMd(auditForReport, site, results);
    const recos = flattenRecommendations(auditId, results);
    if (recos.length > 0) await createRecommendations(recos);

    // Best-effort integrations (notion / gmail / whatsapp). Wrapped because
    // the modules may not exist yet.
    try {
      const dispatcherPath = "@/lib/integrations/dispatcher";
      const integrations = (await import(
        /* @vite-ignore */ dispatcherPath
      ).catch(() => null)) as
        | {
            dispatchAuditCompleted?: (
              auditId: string,
              reportMd: string
            ) => Promise<void>;
          }
        | null;
      if (integrations?.dispatchAuditCompleted) {
        await updateAudit(auditId, { status: "notifying" });
        await integrations.dispatchAuditCompleted(auditId, reportMd);
      }
    } catch (err) {
      console.error("[audit] integrations dispatch failed:", err);
    }

    const durationSec = Math.round((Date.now() - startedAt) / 1000);
    await updateAudit(auditId, {
      status: "completed",
      overall_score: score,
      grade,
      scores_json: JSON.stringify(scoresMap),
      report_md_url: "", // filled by integrations step if Drive sync added
      llm_used: llmUsed.join(","),
      duration_sec: durationSec,
      completed_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[audit] pipeline failed:", err);
    await updateAudit(auditId, {
      status: "failed",
      error: (err as Error).message.slice(0, 500),
      completed_at: new Date().toISOString(),
      duration_sec: Math.round((Date.now() - startedAt) / 1000),
    });
  }
}

// ============================================================
// POST /api/audit — start a new audit
// ============================================================

/**
 * Start a new audit. Returns the audit id immediately; the heavy pipeline
 * runs asynchronously.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = StartAuditSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const email = await resolveUserEmail(req);
  if (!email) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  if (!isUserAllowed(email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const project = await getProject(parsed.data.project_id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (project.owner_email !== email) {
    return NextResponse.json(
      { error: "Project does not belong to user" },
      { status: 403 }
    );
  }

  const audit = await createAudit({
    project_id: parsed.data.project_id,
    owner_email: email,
    target_url: parsed.data.target_url,
    tier: parsed.data.tier,
    status: "pending",
  });

  // Fire-and-forget pipeline. We intentionally do NOT await.
  void runPipeline(audit.id, audit.target_url, audit.tier);

  const resp: StartAuditResponse = {
    audit_id: audit.id,
    status: audit.status,
    poll_url: `/api/audit/${audit.id}`,
  };
  return NextResponse.json(resp, { status: 202 });
}
