import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marketing Scanner — Digilo",
  description:
    "Audit marketing complet par IA en 60 secondes. Score, recommandations, PDF client-ready.",
  metadataBase: new URL("https://audit.digilo.fr"),
  openGraph: {
    title: "Marketing Scanner — Digilo",
    description:
      "Audit marketing IA — score, recommandations actionnables, PDF prêt pour le client.",
    url: "https://audit.digilo.fr",
    siteName: "Marketing Scanner",
    locale: "fr_FR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
