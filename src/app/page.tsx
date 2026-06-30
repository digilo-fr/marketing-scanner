import Link from "next/link";
import {
  ArrowRight,
  Check,
  Link as LinkIcon,
  Sparkles,
  ListChecks,
  Zap,
} from "lucide-react";

const tiers = [
  {
    name: "Quick",
    price: "Gratuit",
    desc: "Audit express en moins d'une minute.",
    features: ["Scoring 6 catégories", "3 quick wins", "Rapport Markdown"],
    badge: null as string | null,
  },
  {
    name: "Full",
    price: "Inclus",
    desc: "Audit complet multi-LLM avec recos stratégiques.",
    features: [
      "5 sous-agents parallèles",
      "Recos quick wins + stratégiques",
      "PDF client-ready",
    ],
    badge: "Recommandé",
  },
  {
    name: "Premium",
    price: "Sur invitation",
    desc: "Comparaison concurrentielle approfondie.",
    features: [
      "Benchmark concurrents",
      "Roadmap 90 jours",
      "Notifications email + WhatsApp",
    ],
    badge: null,
  },
];

const steps = [
  {
    icon: ListChecks,
    title: "1. Choisis un projet",
    desc: "Sélectionne (ou crée) le projet à auditer en quelques secondes.",
  },
  {
    icon: LinkIcon,
    title: "2. Colle l'URL",
    desc: "On scrape la homepage et jusqu'à 5 sous-pages clés automatiquement.",
  },
  {
    icon: Zap,
    title: "3. Reçois ton audit",
    desc: "Score 0-100, recommandations actionnables, PDF prêt à partager.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto max-w-5xl px-6 pt-20 pb-24 sm:pt-28">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 dark:border-neutral-800 px-3 py-1 text-xs font-medium">
            <Sparkles className="h-3 w-3 text-indigo-500" />
            Powered by Digilo · Beta
          </div>

          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            Audit marketing complet,
            <br />
            <span className="text-indigo-500">en 60 secondes.</span>
          </h1>

          <p className="max-w-2xl text-lg text-neutral-600 dark:text-neutral-400">
            Multi-LLM analysis (Groq · Cerebras · SambaNova). Scoring sur 6
            catégories. Quick wins, recos stratégiques, comparaison concurrents,
            PDF client-ready.
          </p>

          <div className="flex flex-wrap gap-3 pt-4">
            <Link
              href="/auth/signin"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-white font-medium hover:bg-indigo-700 transition"
            >
              Se connecter <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#how"
              className="rounded-lg border border-neutral-200 dark:border-neutral-800 px-6 py-3 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-900 transition"
            >
              Comment ça marche
            </a>
          </div>
        </div>
      </section>

      <section
        id="how"
        className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950"
      >
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-3xl font-bold tracking-tight">Comment ça marche</h2>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            Trois étapes, zéro paramétrage compliqué.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-3xl font-bold tracking-tight">Tiers d'audit</h2>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            Du quick scan au benchmark concurrentiel approfondi.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {tiers.map((t) => (
              <div
                key={t.name}
                className="relative rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6"
              >
                {t.badge && (
                  <span className="absolute -top-3 right-4 rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-medium text-white">
                    {t.badge}
                  </span>
                )}
                <h3 className="text-lg font-semibold">{t.name}</h3>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                  {t.desc}
                </p>
                <p className="mt-4 text-2xl font-bold">{t.price}</p>
                <ul className="mt-4 space-y-2 text-sm">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 text-emerald-500 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-5xl px-6 py-8 text-sm text-neutral-500 flex flex-wrap items-center justify-between gap-3">
          <span>Marketing Scanner · Outil interne Digilo · 2026</span>
          <Link href="/auth/signin" className="hover:text-indigo-500">
            Se connecter →
          </Link>
        </div>
      </footer>
    </main>
  );
}
