import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const isAccessDenied = error === "AccessDenied";

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300">
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>

        {isAccessDenied ? (
          <>
            <h1 className="text-2xl font-bold tracking-tight">
              Email non autorisé
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Ton compte Google n'est pas dans la liste blanche. Contacte
              l'administrateur pour demander l'accès.
            </p>
            <a
              href="mailto:driss.i@tantakcollectif.net"
              className="inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              driss.i@tantakcollectif.net
            </a>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight">
              Erreur de connexion
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {error
                ? `Erreur: ${error}`
                : "Une erreur inattendue est survenue."}
            </p>
          </>
        )}

        <Link
          href="/auth/signin"
          className="inline-block text-sm text-neutral-600 dark:text-neutral-400 underline hover:text-indigo-600"
        >
          Retour à la connexion
        </Link>
      </div>
    </main>
  );
}
