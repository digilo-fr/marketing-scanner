import { Badge } from "@/components/ui/badge";
import type { AuditStatus } from "@/types";

const LABELS: Record<AuditStatus, string> = {
  pending: "En attente",
  scraping: "Analyse du site",
  analyzing: "Analyse IA",
  synthesizing: "Synthèse",
  generating_pdf: "Génération PDF",
  notifying: "Notifications",
  completed: "Terminé",
  failed: "Échec",
};

const VARIANTS: Record<
  AuditStatus,
  "default" | "violet" | "success" | "warning" | "danger" | "outline"
> = {
  pending: "outline",
  scraping: "violet",
  analyzing: "violet",
  synthesizing: "violet",
  generating_pdf: "violet",
  notifying: "violet",
  completed: "success",
  failed: "danger",
};

const ACTIVE: AuditStatus[] = [
  "pending",
  "scraping",
  "analyzing",
  "synthesizing",
  "generating_pdf",
  "notifying",
];

export function AuditStatusPill({ status }: { status: AuditStatus }) {
  const animated = ACTIVE.includes(status);
  return (
    <Badge variant={VARIANTS[status]} className="gap-1.5">
      <span
        className={
          "h-1.5 w-1.5 rounded-full " +
          (status === "completed"
            ? "bg-emerald-500"
            : status === "failed"
              ? "bg-red-500"
              : "bg-indigo-500") +
          (animated ? " animate-pulse" : "")
        }
      />
      {LABELS[status]}
    </Badge>
  );
}
