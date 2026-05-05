import type {
  AgentResult,
  Audit,
  Category,
  CategoryScores,
  Grade,
  Recommendation,
  ScrapedSite,
} from "@/types";
import { CATEGORY_LABELS_FR, CATEGORY_WEIGHTS } from "@/types";

function gradeFromScore(score: number): Grade {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}

function categoryScoresFromResults(results: AgentResult[]): CategoryScores {
  const out: CategoryScores = {
    content: 0,
    conversion: 0,
    seo: 0,
    competitive: 0,
    brand: 0,
    growth: 0,
  };
  for (const r of results) {
    if (r.category in out) out[r.category] = r.score;
  }
  return out;
}

/**
 * Compute the weighted overall score (0-100) and matching grade A..F.
 *
 * Weights come from `CATEGORY_WEIGHTS`. Missing categories contribute zero
 * (i.e. a quick-tier audit with only one category will score low — desired).
 */
export function computeOverallScore(
  results: AgentResult[]
): { score: number; grade: Grade } {
  const scores = categoryScoresFromResults(results);
  let total = 0;
  for (const cat of Object.keys(CATEGORY_WEIGHTS) as Category[]) {
    total += scores[cat] * CATEGORY_WEIGHTS[cat];
  }
  const score = Math.max(0, Math.min(100, Math.round(total)));
  return { score, grade: gradeFromScore(score) };
}

function severityIcon(s: string): string {
  switch (s) {
    case "critical":
      return "🔴";
    case "high":
      return "🟠";
    case "medium":
      return "🟡";
    default:
      return "🟢";
  }
}

function priorityIcon(p: string): string {
  if (p === "quick_win") return "⚡";
  if (p === "strategic") return "🎯";
  return "🌱";
}

/**
 * Build the full Markdown report aggregating all agent outputs.
 *
 * Sections: exec summary, score breakdown table, quick wins, strategic recos,
 * long-term recos, detailed analysis per category, revenue impact, next steps.
 */
export function buildReportMd(
  audit: Audit,
  site: ScrapedSite,
  results: AgentResult[]
): string {
  const { score, grade } = computeOverallScore(results);
  const scores = categoryScoresFromResults(results);
  const allRecos = results.flatMap((r) =>
    r.recommendations.map((reco) => ({ ...reco, category: r.category }))
  );
  const quickWins = allRecos.filter((r) => r.priority === "quick_win");
  const strategic = allRecos.filter((r) => r.priority === "strategic");
  const longTerm = allRecos.filter((r) => r.priority === "long_term");

  const totalImpactMin = allRecos.reduce(
    (s, r) => s + (r.impact_estimate_min || 0),
    0
  );
  const totalImpactMax = allRecos.reduce(
    (s, r) => s + (r.impact_estimate_max || 0),
    0
  );

  const lines: string[] = [];
  lines.push(`# Audit Marketing — ${site.homepage.title || audit.target_url}`);
  lines.push("");
  lines.push(`> URL : ${audit.target_url}`);
  lines.push(`> Tier : ${audit.tier}`);
  lines.push(`> Date : ${audit.created_at}`);
  lines.push(`> Type détecté : ${site.business_type}`);
  lines.push("");
  lines.push("## Synthèse exécutive");
  lines.push("");
  lines.push(`**Score global : ${score}/100 — Grade ${grade}**`);
  lines.push("");
  lines.push(
    `Impact revenu potentiel cumulé estimé : **${totalImpactMin.toLocaleString("fr-FR")} – ${totalImpactMax.toLocaleString("fr-FR")} € / mois**.`
  );
  lines.push("");

  lines.push("## Détail des scores");
  lines.push("");
  lines.push("| Catégorie | Score | Poids | Contribution |");
  lines.push("|---|---:|---:|---:|");
  for (const cat of Object.keys(CATEGORY_WEIGHTS) as Category[]) {
    const w = CATEGORY_WEIGHTS[cat];
    const s = scores[cat];
    lines.push(
      `| ${CATEGORY_LABELS_FR[cat]} | ${s}/100 | ${(w * 100).toFixed(0)}% | ${(s * w).toFixed(1)} |`
    );
  }
  lines.push("");

  if (quickWins.length > 0) {
    lines.push("## ⚡ Quick wins (action sous 7 jours)");
    lines.push("");
    for (const r of quickWins) {
      lines.push(
        `- **${r.title}** _(${CATEGORY_LABELS_FR[r.category]} · ${r.timeline} · confiance ${r.confidence})_`
      );
      lines.push(`  - ${r.description}`);
      lines.push(
        `  - Impact estimé : ${r.impact_estimate_min} – ${r.impact_estimate_max} € / mois`
      );
    }
    lines.push("");
  }

  if (strategic.length > 0) {
    lines.push("## 🎯 Recommandations stratégiques (1-3 mois)");
    lines.push("");
    for (const r of strategic) {
      lines.push(
        `- **${r.title}** _(${CATEGORY_LABELS_FR[r.category]} · ${r.timeline})_`
      );
      lines.push(`  - ${r.description}`);
      lines.push(
        `  - Impact estimé : ${r.impact_estimate_min} – ${r.impact_estimate_max} € / mois (confiance ${r.confidence})`
      );
    }
    lines.push("");
  }

  if (longTerm.length > 0) {
    lines.push("## 🌱 Chantiers long terme (3-12 mois)");
    lines.push("");
    for (const r of longTerm) {
      lines.push(
        `- **${r.title}** _(${CATEGORY_LABELS_FR[r.category]} · ${r.timeline})_`
      );
      lines.push(`  - ${r.description}`);
      lines.push(
        `  - Impact estimé : ${r.impact_estimate_min} – ${r.impact_estimate_max} € / mois`
      );
    }
    lines.push("");
  }

  lines.push("## Analyse détaillée par catégorie");
  lines.push("");
  for (const r of results) {
    lines.push(`### ${CATEGORY_LABELS_FR[r.category]} — ${r.score}/100`);
    lines.push("");
    lines.push(r.summary || "_(no summary)_");
    lines.push("");
    if (r.strengths.length > 0) {
      lines.push("**Forces**");
      for (const s of r.strengths) lines.push(`- ${s}`);
      lines.push("");
    }
    if (r.weaknesses.length > 0) {
      lines.push("**Faiblesses**");
      for (const s of r.weaknesses) lines.push(`- ${s}`);
      lines.push("");
    }
    if (r.findings.length > 0) {
      lines.push("**Constats**");
      for (const f of r.findings) {
        lines.push(`- ${severityIcon(f.severity)} **${f.title}** — ${f.description}`);
        if (f.evidence) lines.push(`  > ${f.evidence}`);
      }
      lines.push("");
    }
    if (r.recommendations.length > 0) {
      lines.push("**Recommandations de la catégorie**");
      for (const reco of r.recommendations) {
        lines.push(
          `- ${priorityIcon(reco.priority)} ${reco.title} — ${reco.description} (${reco.timeline})`
        );
      }
      lines.push("");
    }
  }

  lines.push("## Impact revenu — synthèse");
  lines.push("");
  lines.push(
    `Si toutes les recommandations sont mises en œuvre, l'impact cumulé est estimé à **${totalImpactMin.toLocaleString("fr-FR")} – ${totalImpactMax.toLocaleString("fr-FR")} € / mois** (${allRecos.length} actions).`
  );
  lines.push("");
  lines.push("## Prochaines étapes");
  lines.push("");
  lines.push("1. Traiter les ⚡ quick wins cette semaine.");
  lines.push("2. Planifier les 🎯 chantiers stratégiques sur le trimestre.");
  lines.push("3. Re-lancer un audit dans 30 jours pour mesurer la progression.");
  lines.push("");

  return lines.join("\n");
}

/**
 * Flatten all agent recommendations into DB-ready rows for `recommendations`.
 * Severity is inferred from priority + agent finding severities (heuristic).
 */
export function flattenRecommendations(
  auditId: string,
  results: AgentResult[]
): Omit<Recommendation, "id">[] {
  const out: Omit<Recommendation, "id">[] = [];
  for (const r of results) {
    // Pick the worst severity found in this agent as a heuristic floor.
    const severityRank = { low: 0, medium: 1, high: 2, critical: 3 } as const;
    type Sev = keyof typeof severityRank;
    let worst: Sev = "low";
    for (const f of r.findings) {
      if (severityRank[f.severity as Sev] > severityRank[worst]) {
        worst = f.severity as Sev;
      }
    }
    for (const reco of r.recommendations) {
      let sev: Sev;
      if (reco.priority === "quick_win") {
        sev = worst === "critical" ? "critical" : "high";
      } else if (reco.priority === "strategic") {
        sev = worst === "low" ? "medium" : worst;
      } else {
        sev = "medium";
      }
      out.push({
        audit_id: auditId,
        category: r.category,
        severity: sev,
        priority: reco.priority,
        title: reco.title,
        description: reco.description,
        impact_estimate_min: reco.impact_estimate_min,
        impact_estimate_max: reco.impact_estimate_max,
        timeline: reco.timeline,
        confidence: reco.confidence,
      });
    }
  }
  return out;
}
