export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-24">
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Powered by Digilo · Beta
        </div>

        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          Audit marketing complet,
          <br />
          <span className="text-violet-500">en 60 secondes.</span>
        </h1>

        <p className="max-w-2xl text-lg text-neutral-600 dark:text-neutral-400">
          Multi-LLM analysis (Groq · Cerebras · SambaNova). Scoring sur 6
          catégories. Quick wins, recos stratégiques, comparaison concurrents,
          PDF client-ready. 100 % gratuit.
        </p>

        <div className="flex gap-4 pt-4">
          <a
            href="/auth/signin"
            className="rounded-lg bg-violet-600 px-6 py-3 text-white font-medium hover:bg-violet-700 transition"
          >
            Lancer un audit →
          </a>
          <a
            href="#how"
            className="rounded-lg border border-border px-6 py-3 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-900 transition"
          >
            Comment ça marche
          </a>
        </div>

        <div className="grid grid-cols-3 gap-6 pt-12 text-center">
          <div>
            <div className="text-3xl font-bold">5</div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400">
              sous-agents parallèles
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold">6</div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400">
              catégories de scoring
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold">3</div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400">
              tiers (Quick / Full / Premium)
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-24 border-t border-border pt-8 text-sm text-neutral-500">
        Marketing Scanner · Outil interne Digilo · 2026
      </footer>
    </main>
  );
}
