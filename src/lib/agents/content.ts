import type {
  AgentResult,
  Category,
  ScrapedSite,
} from "@/types";
import { callLlm, type ProviderChoice } from "@/lib/llm-router";

// ============================================================
// Shared helpers (kept inline per-file to minimize cross-file deps)
// ============================================================

export function summarizeSiteForPrompt(site: ScrapedSite): string {
  const h = site.homepage;
  const headings = h.headings
    .slice(0, 20)
    .map((x) => `H${x.level}: ${x.text}`)
    .join("\n");
  const ctas = h.cta_buttons.slice(0, 25).join(" | ");
  const subPages = site.pages
    .map((p) => `- ${p.url} — "${p.title}" — ${p.meta_description.slice(0, 120)}`)
    .join("\n");

  return [
    `URL: ${h.url}`,
    `Title: ${h.title}`,
    `Meta description: ${h.meta_description}`,
    `Business type (heuristic): ${site.business_type}`,
    `Languages: ${site.detected_languages.join(", ")}`,
    `Has pricing page: ${site.has_pricing_page}`,
    `Has about page: ${site.has_about_page}`,
    `Has blog: ${site.has_blog}`,
    `Has contact form: ${site.has_contact_form}`,
    `Has chat widget: ${h.has_chat_widget}`,
    "",
    "Headings (homepage):",
    headings || "(none)",
    "",
    "CTAs (homepage):",
    ctas || "(none)",
    "",
    "Sub-pages discovered:",
    subPages || "(none)",
    "",
    "Homepage visible text (truncated to 3000 chars):",
    h.visible_text.slice(0, 3000),
  ].join("\n");
}

export function buildJsonSchemaInstruction(category: Category): string {
  return [
    "You MUST return ONLY a single valid JSON object — no prose, no markdown fences.",
    "Schema:",
    "{",
    `  "category": "${category}",`,
    '  "score": <integer 0-100>,',
    '  "strengths": [<string>],',
    '  "weaknesses": [<string>],',
    '  "findings": [ { "title": <string>, "severity": "critical"|"high"|"medium"|"low", "description": <string>, "evidence": <string> } ],',
    '  "recommendations": [ { "priority": "quick_win"|"strategic"|"long_term", "title": <string>, "description": <string>, "impact_estimate_min": <number EUR/month>, "impact_estimate_max": <number EUR/month>, "timeline": <string>, "confidence": "high"|"medium"|"low" } ],',
    '  "summary": <2-3 sentence string>',
    "}",
  ].join("\n");
}

export function tryParseAgentResult(
  raw: string,
  category: Category
): AgentResult {
  // Extract first {...} block defensively (some models wrap in fences).
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  let jsonText = cleaned;
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first >= 0 && last > first) jsonText = cleaned.slice(first, last + 1);

  let obj: unknown;
  try {
    obj = JSON.parse(jsonText);
  } catch (err) {
    throw new Error(
      `[agent:${category}] Could not parse JSON: ${(err as Error).message}. Raw head: ${raw.slice(0, 200)}`
    );
  }
  return normalizeAgentResult(obj, category);
}

function clampScore(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function asStringArray(x: unknown): string[] {
  if (!Array.isArray(x)) return [];
  return x.filter((v): v is string => typeof v === "string" && v.length > 0);
}

function normalizeAgentResult(obj: unknown, category: Category): AgentResult {
  const o = (obj ?? {}) as Record<string, unknown>;
  const findingsRaw = Array.isArray(o.findings) ? o.findings : [];
  const recsRaw = Array.isArray(o.recommendations) ? o.recommendations : [];

  return {
    category,
    score: clampScore(o.score),
    strengths: asStringArray(o.strengths),
    weaknesses: asStringArray(o.weaknesses),
    findings: findingsRaw.map((f) => {
      const fo = (f ?? {}) as Record<string, unknown>;
      const sev = String(fo.severity ?? "medium").toLowerCase();
      const severity =
        sev === "critical" || sev === "high" || sev === "medium" || sev === "low"
          ? (sev as "critical" | "high" | "medium" | "low")
          : "medium";
      return {
        title: String(fo.title ?? ""),
        severity,
        description: String(fo.description ?? ""),
        evidence: String(fo.evidence ?? ""),
      };
    }),
    recommendations: recsRaw.map((r) => {
      const ro = (r ?? {}) as Record<string, unknown>;
      const prio = String(ro.priority ?? "strategic").toLowerCase();
      const priority =
        prio === "quick_win" || prio === "strategic" || prio === "long_term"
          ? (prio as "quick_win" | "strategic" | "long_term")
          : "strategic";
      const conf = String(ro.confidence ?? "medium").toLowerCase();
      const confidence =
        conf === "high" || conf === "medium" || conf === "low"
          ? (conf as "high" | "medium" | "low")
          : "medium";
      return {
        priority,
        title: String(ro.title ?? ""),
        description: String(ro.description ?? ""),
        impact_estimate_min: Number(ro.impact_estimate_min ?? 0) || 0,
        impact_estimate_max: Number(ro.impact_estimate_max ?? 0) || 0,
        timeline: String(ro.timeline ?? ""),
        confidence,
      };
    }),
    summary: String(o.summary ?? ""),
  };
}

/**
 * Run a single category agent against multiple providers. When more than one
 * provider is given (premium tier), scores are averaged and findings/recos
 * merged & deduped by title.
 */
export async function runAgentWithProviders(
  category: Category,
  systemPrompt: string,
  userPrompt: string,
  providers: ProviderChoice[]
): Promise<AgentResult> {
  if (providers.length === 0) {
    throw new Error(`[agent:${category}] No providers supplied.`);
  }

  const results: AgentResult[] = [];
  for (const p of providers) {
    const resp = await callLlm({
      provider: p.provider,
      model: p.model,
      system: systemPrompt,
      user: userPrompt,
      temperature: 0.2,
      max_tokens: 3000,
    });
    results.push(tryParseAgentResult(resp.content, category));
  }

  if (results.length === 1) return results[0];

  // Consensus: average score, merge unique findings/recos by title.
  const avgScore = clampScore(
    results.reduce((s, r) => s + r.score, 0) / results.length
  );
  const seenF = new Set<string>();
  const seenR = new Set<string>();
  const merged: AgentResult = {
    category,
    score: avgScore,
    strengths: dedupe(results.flatMap((r) => r.strengths)),
    weaknesses: dedupe(results.flatMap((r) => r.weaknesses)),
    findings: results
      .flatMap((r) => r.findings)
      .filter((f) => {
        const k = f.title.trim().toLowerCase();
        if (!k || seenF.has(k)) return false;
        seenF.add(k);
        return true;
      }),
    recommendations: results
      .flatMap((r) => r.recommendations)
      .filter((r) => {
        const k = r.title.trim().toLowerCase();
        if (!k || seenR.has(k)) return false;
        seenR.add(k);
        return true;
      }),
    summary: results.map((r) => r.summary).join(" "),
  };
  return merged;
}

function dedupe(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of arr) {
    const k = s.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

// ============================================================
// Content agent
// ============================================================

const CATEGORY: Category = "content";

const SYSTEM = `You are a senior marketing content auditor. Evaluate the website's CONTENT & MESSAGING quality.

Scoring rubric (0-100):
- Clarity of value proposition (is it instantly clear what the business does + for whom?)
- Headline strength on the homepage (specificity, benefit, hook)
- Tone consistency and brand voice
- Content depth (does it answer buyer questions? blog/articles?)
- Use of social proof IN COPY (testimonials, stats, named customers)
- Readability (jargon level, sentence length, scannability)

Penalize: vague taglines ("we help businesses grow"), missing H1, walls of text, generic stock copy, untranslated content, broken benefit/feature framing.

Be SPECIFIC and CITE evidence verbatim from the scraped content in the "evidence" field of each finding.

${buildJsonSchemaInstruction(CATEGORY)}`;

/**
 * Run the content & messaging agent against the scraped site.
 */
export async function runAgent(
  site: ScrapedSite,
  providers: ProviderChoice[]
): Promise<AgentResult> {
  return runAgentWithProviders(
    CATEGORY,
    SYSTEM,
    summarizeSiteForPrompt(site),
    providers
  );
}
