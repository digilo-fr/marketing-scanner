import Link from "next/link";
import { getServerSession } from "next-auth";
import { Plus, FolderPlus, ExternalLink } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { listAudits, listProjects } from "@/lib/sheets-db";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AuditStatusPill } from "@/components/audit-status";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const email = session!.user!.email!;
  const firstName = (session!.user!.name ?? email).split(" ")[0];

  const [projects, audits] = await Promise.all([
    listProjects(email),
    listAudits(email),
  ]);

  const recentAudits = [...audits]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 10);

  const auditCounts = audits.reduce<Record<string, number>>((acc, a) => {
    acc[a.project_id] = (acc[a.project_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Bonjour {firstName}
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Tableau de bord — projets et audits récents.
          </p>
        </div>
        <Link href="/dashboard/audits/new">
          <Button size="lg">
            <Plus className="h-4 w-4" /> Nouvel audit
          </Button>
        </Link>
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tes projets</h2>
          <Link href="/dashboard/projects/new">
            <Button variant="secondary" size="sm">
              <FolderPlus className="h-4 w-4" /> Nouveau projet
            </Button>
          </Link>
        </div>

        {projects.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-neutral-600 dark:text-neutral-400">
              Aucun projet. Crée ton premier projet pour démarrer.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Card key={p.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle>{p.name}</CardTitle>
                    <Badge variant="outline">{p.type || "autre"}</Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {p.description || "Pas de description."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-600 dark:text-neutral-400">
                      {auditCounts[p.id] ?? 0} audit
                      {(auditCounts[p.id] ?? 0) > 1 ? "s" : ""}
                    </span>
                    <Link
                      href={`/dashboard/audits/new?project=${p.id}`}
                      className="text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      + Audit
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Audits récents</h2>
        {recentAudits.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-neutral-600 dark:text-neutral-400">
              Aucun audit lancé pour l'instant.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-neutral-200 dark:border-neutral-800 text-left text-xs uppercase text-neutral-500">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Projet</th>
                    <th className="px-4 py-3">URL</th>
                    <th className="px-4 py-3">Tier</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {recentAudits.map((a) => {
                    const project = projects.find((p) => p.id === a.project_id);
                    return (
                      <tr
                        key={a.id}
                        className="border-b border-neutral-100 dark:border-neutral-900 last:border-0"
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-neutral-600 dark:text-neutral-400">
                          {a.created_at
                            ? new Date(a.created_at).toLocaleDateString("fr-FR")
                            : "—"}
                        </td>
                        <td className="px-4 py-3">{project?.name ?? "—"}</td>
                        <td className="px-4 py-3 max-w-xs truncate">
                          {a.target_url}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="violet">{a.tier}</Badge>
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          {a.status === "completed"
                            ? `${a.overall_score} (${a.grade})`
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <AuditStatusPill status={a.status} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/dashboard/audits/${a.id}`}
                            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium"
                          >
                            Voir <ExternalLink className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}
