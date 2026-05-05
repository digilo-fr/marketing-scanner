import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listProjects } from "@/lib/sheets-db";
import { NewAuditForm } from "./form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function NewAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const email = session!.user!.email!;
  const projects = await listProjects(email);
  const { project } = await searchParams;

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm text-neutral-500 hover:text-violet-600"
        >
          ← Retour au dashboard
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Nouvel audit</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Tu dois d'abord créer un projet.{" "}
              <Link
                href="/dashboard/projects/new"
                className="text-violet-600 hover:text-violet-700 font-medium"
              >
                Créer un projet →
              </Link>
            </p>
          ) : (
            <NewAuditForm projects={projects} initialProjectId={project ?? ""} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
