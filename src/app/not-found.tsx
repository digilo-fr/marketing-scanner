import Link from "next/link";

export default function NotFound() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center"
      style={{ backgroundColor: "#0a0a12", fontFamily: "Sora, sans-serif" }}
    >
      <p className="text-6xl font-extrabold" style={{ color: "#818cf8" }}>
        404
      </p>
      <h1 className="text-2xl font-semibold text-white">
        Page introuvable
      </h1>
      <p className="max-w-md text-sm text-neutral-400">
        La page que tu cherches n&apos;existe pas ou a été déplacée.
      </p>
      <Link
        href="/"
        className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        style={{
          background: "linear-gradient(90deg, #6366f1, #22d3ee)",
        }}
      >
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}
