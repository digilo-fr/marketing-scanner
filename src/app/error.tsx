"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center"
      style={{ backgroundColor: "#0a0a12", fontFamily: "Sora, sans-serif" }}
    >
      <p className="text-6xl font-extrabold" style={{ color: "#818cf8" }}>
        Oups
      </p>
      <h1 className="text-2xl font-semibold text-white">
        Une erreur est survenue
      </h1>
      <p className="max-w-md text-sm text-neutral-400">
        Quelque chose s&apos;est mal passé. Réessaie, ou reviens à l&apos;accueil.
        {error.digest ? ` (ref: ${error.digest})` : ""}
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          style={{ background: "linear-gradient(90deg, #6366f1, #22d3ee)" }}
        >
          Réessayer
        </button>
        <a
          href="/"
          className="rounded-lg border px-5 py-2.5 text-sm font-semibold transition hover:opacity-90"
          style={{ borderColor: "#818cf8", color: "#818cf8" }}
        >
          Accueil
        </a>
      </div>
    </main>
  );
}
