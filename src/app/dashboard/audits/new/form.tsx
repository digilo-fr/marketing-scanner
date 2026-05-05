"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { AuditTier, Project, StartAuditResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProjectSelector } from "@/components/project-selector";

const TIERS: { value: AuditTier; label: string; desc: string }[] = [
  {
    value: "quick",
    label: "Quick",
    desc: "Audit express ~60s. Score + 3 quick wins.",
  },
  {
    value: "full",
    label: "Full",
    desc: "5 sous-agents parallèles. Recos quick wins + stratégiques.",
  },
  {
    value: "premium",
    label: "Premium",
    desc: "Benchmark concurrentiel + roadmap 90j.",
  },
];

interface Props {
  projects: Project[];
  initialProjectId: string;
}

export function NewAuditForm({ projects, initialProjectId }: Props) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(initialProjectId);
  const [url, setUrl] = useState("");
  const [tier, setTier] = useState<AuditTier>("full");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function isValidUrl(value: string): boolean {
    try {
      const u = new URL(value);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!projectId) return setError("Choisis un projet.");
    if (!isValidUrl(url)) return setError("URL invalide (http/https requis).");

    setSubmitting(true);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ project_id: projectId, target_url: url, tier }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as StartAuditResponse;
      router.push(`/dashboard/audits/${data.audit_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label htmlFor="project" className="block text-sm font-medium mb-1.5">
          Projet
        </label>
        <ProjectSelector
          projects={projects}
          value={projectId}
          onChange={setProjectId}
          required
        />
      </div>

      <div>
        <label htmlFor="url" className="block text-sm font-medium mb-1.5">
          URL à auditer
        </label>
        <Input
          id="url"
          name="url"
          type="url"
          required
          placeholder="https://exemple.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>

      <fieldset>
        <legend className="block text-sm font-medium mb-2">Tier</legend>
        <div className="space-y-2">
          {TIERS.map((t) => (
            <label
              key={t.value}
              className={
                "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition " +
                (tier === t.value
                  ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                  : "border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900")
              }
            >
              <input
                type="radio"
                name="tier"
                value={t.value}
                checked={tier === t.value}
                onChange={() => setTier(t.value)}
                className="mt-1"
              />
              <div>
                <div className="font-medium">{t.label}</div>
                <div className="text-xs text-neutral-600 dark:text-neutral-400">
                  {t.desc}
                </div>
              </div>
            </label>
          ))}
        </div>
      </fieldset>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Lancement…" : "Lancer l'audit"}
        </Button>
      </div>
    </form>
  );
}
