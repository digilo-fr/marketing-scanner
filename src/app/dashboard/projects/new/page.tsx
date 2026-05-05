import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createProject } from "@/lib/sheets-db";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

async function createProjectAction(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/auth/signin");

  const name = String(formData.get("name") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const type = String(formData.get("type") ?? "autre").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name) {
    redirect("/dashboard/projects/new?error=name");
  }
  const slug = slugRaw ? slugify(slugRaw) : slugify(name);

  await createProject({
    owner_email: session!.user!.email!,
    name,
    slug,
    type,
    description,
  });

  redirect("/dashboard");
}

export default function NewProjectPage() {
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
          <CardTitle>Nouveau projet</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createProjectAction} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1.5">
                Nom du projet
              </label>
              <Input
                id="name"
                name="name"
                required
                placeholder="ex. Digilo Landing"
              />
            </div>

            <div>
              <label htmlFor="slug" className="block text-sm font-medium mb-1.5">
                Slug{" "}
                <span className="text-neutral-500 font-normal">
                  (auto si vide)
                </span>
              </label>
              <Input id="slug" name="slug" placeholder="digilo-landing" />
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium mb-1.5">
                Type
              </label>
              <Select id="type" name="type" defaultValue="agence_ia">
                <option value="agence_ia">Agence IA</option>
                <option value="saas">SaaS</option>
                <option value="association">Association</option>
                <option value="autre">Autre</option>
              </Select>
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium mb-1.5"
              >
                Description
              </label>
              <Textarea
                id="description"
                name="description"
                rows={4}
                placeholder="Quelques mots sur le projet…"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Link href="/dashboard">
                <Button type="button" variant="secondary">
                  Annuler
                </Button>
              </Link>
              <Button type="submit">Créer le projet</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
