"use client";

import { useEffect, useState } from "react";
import { Download, Loader2, AlertCircle } from "lucide-react";
import type {
  AuditStatusResponse,
  Category,
  Recommendation,
} from "@/types";
import { CATEGORY_LABELS_FR } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScoreBar, gradeFor } from "@/components/score-bar";
import { AuditStatusPill } from "@/components/audit-status";
import { Badge } from "@/components/ui/badge";

const STATUS_STEPS: { key: string; label: string }[] = [
  { key: "pending", label: "En file d'attente…" },
  { key: "scraping", label: "Scraping de la page cible…" },
  { key: "analyzing", label: "Analyse multi-LLM (5 sous-agents)…" },
  { key: "synthesizing", label: "Synthèse des résultats…" },
  { key: "generating_pdf", label: "Génération du rapport PDF…" },
  { key: "notifying", label: "Envoi des notifications…" },
];

function parseScores(json: string): Partial<Record<Category, number>> {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

export function AuditDetail({ id }: { id: string }) {
  const [data, setData] = useState<AuditStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      try {
        const res = await fetch(`/api/audit/${id}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as AuditStatusResponse;
        if (cancelled) return;
        setData(json);
        setError(null);
        const status = json.audit.status;
        if (status !== "completed" && status !== "failed") {
          timer = setTimeout(tick, 3000);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erreur inconnue.");
        timer = setTimeout(tick, 5000);
      }
    }
    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  if (!data && !error) {
    return (
      <div className="flex items-center gap-2 text-neutral-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
      </div>
    );
  }
  if (error && !data) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertCircle className="mx-auto h-6 w-6 text-red-500" />
          <p className="mt-2 text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }
  if (!data) return null;

  const { audit, recommendations } = data;
  const scores = parseScores(audit.scores_json);
  const completed = audit.status === "completed";
  const failed = audit.status === "failed";

  const quickWins = recommendations
    .filter((r) => r.priority === "quick_win")
    .slice(0, 3);
  const strategic = recommendations
    .filter((r) => r.priority === "strategic")
    .slice(0, 3);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Audit</h1>
          <AuditStatusPill status={audit.status} />
        </div>

        {failed && (
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Audit en échec</CardTitle>
              <CardDescription>
                {audit.error || "Erreur inconnue lors du traitement."}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {!completed && !failed && (
          <Card>
            <CardHeader>
              <CardTitle>Traitement en cours…</CardTitle>
              <CardDescription>
                Cette page se met à jour automatiquement toutes les 3s.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {STATUS_STEPS.map((step) => {
                  const reached =
                    STATUS_STEPS.findIndex((s) => s.key === audit.status) >=
                    STATUS_STEPS.findIndex((s) => s.key === step.key);
                  const current = step.key === audit.status;
                  return (
                    <li
                      key={step.key}
                      className="flex items-center gap-2"
                      aria-current={current ? "step" : undefined}
                    >
                      <span
                        className={
                          "h-2 w-2 rounded-full " +
                          (current
                            ? "bg-violet-500 animate-pulse"
                            : reached
                              ? "bg-emerald-500"
                              : "bg-neutral-300 dark:bg-neutral-700")
                        }
                      />
                      <span
                        className={
                          reached
                            ? "text-neutral-900 dark:text-neutral-100"
                            : "text-neutral-500"
                        }
                      >
                        {step.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}

        {completed && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Score global</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-4">
                  <div className="text-6xl font-bold tabular-nums">
                    {audit.overall_score}
                  </div>
                  <div className="pb-2">
                    <div className="text-3xl font-semibold text-violet-600">
                      {audit.grade || gradeFor(audit.overall_score)}
                    </div>
                    <div className="text-xs text-neutral-500">/ 100</div>
                  </div>
                </div>
                <div className="mt-4">
                  <ScoreBar score={audit.overall_score} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Détail par catégorie</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(Object.keys(CATEGORY_LABELS_FR) as Category[]).map((cat) => (
                  <ScoreBar
                    key={cat}
                    label={CATEGORY_LABELS_FR[cat]}
                    score={scores[cat] ?? 0}
                    showGrade
                  />
                ))}
              </CardContent>
            </Card>

            <RecoSection
              title="Quick wins"
              description="Actions à fort impact, à mettre en place rapidement."
              items={quickWins}
            />
            <RecoSection
              title="Recommandations stratégiques"
              description="Chantiers à plus long terme."
              items={strategic}
            />
          </>
        )}
      </div>

      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Détails</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <DetailRow label="URL cible">
              <a
                href={audit.target_url}
                target="_blank"
                rel="noreferrer"
                className="text-violet-600 hover:text-violet-700 break-all"
              >
                {audit.target_url}
              </a>
            </DetailRow>
            <DetailRow label="Tier">
              <Badge variant="violet">{audit.tier}</Badge>
            </DetailRow>
            <DetailRow label="Créé le">
              {audit.created_at
                ? new Date(audit.created_at).toLocaleString("fr-FR")
                : "—"}
            </DetailRow>
            {completed && (
              <>
                <DetailRow label="Durée">{audit.duration_sec}s</DetailRow>
                <DetailRow label="LLM utilisés">
                  <span className="text-xs text-neutral-600 dark:text-neutral-400">
                    {audit.llm_used || "—"}
                  </span>
                </DetailRow>
              </>
            )}
          </CardContent>
        </Card>

        {completed && audit.pdf_url && (
          <a
            href={audit.pdf_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 text-white font-medium hover:bg-violet-700 transition"
          >
            <Download className="h-4 w-4" />
            Télécharger le PDF
          </a>
        )}
      </aside>
    </div>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs uppercase text-neutral-500 mb-0.5">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function RecoSection({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: Recommendation[];
}) {
  if (items.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((r) => (
          <div
            key={r.id}
            className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h4 className="font-medium">{r.title}</h4>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline">{r.category}</Badge>
                <Badge
                  variant={
                    r.severity === "critical" || r.severity === "high"
                      ? "danger"
                      : r.severity === "medium"
                        ? "warning"
                        : "default"
                  }
                >
                  {r.severity}
                </Badge>
              </div>
            </div>
            <p className="mt-1.5 text-sm text-neutral-600 dark:text-neutral-400">
              {r.description}
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-neutral-500">
              <span>⏱ {r.timeline}</span>
              {(r.impact_estimate_min > 0 || r.impact_estimate_max > 0) && (
                <span>
                  💰 {r.impact_estimate_min}–{r.impact_estimate_max} €/mois
                </span>
              )}
              <span>Confiance: {r.confidence}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
