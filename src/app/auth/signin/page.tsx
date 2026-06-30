"use client";

import { signIn } from "next-auth/react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300">
            <Sparkles className="h-6 w-6" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Marketing Scanner
          </h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Connecte-toi avec ton compte Google autorisé.
          </p>
        </div>
        <Button
          size="lg"
          className="w-full"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
            <path
              fill="currentColor"
              d="M21.35 11.1H12v3.2h5.35c-.23 1.4-1.66 4.1-5.35 4.1-3.22 0-5.85-2.66-5.85-5.95s2.63-5.95 5.85-5.95c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.66 3.92 14.55 3 12 3 6.99 3 2.95 7.03 2.95 12.05S6.99 21.1 12 21.1c6.93 0 9.2-4.86 9.2-7.4 0-.5-.05-.88-.12-1.6z"
            />
          </svg>
          Continuer avec Google
        </Button>
        <p className="text-xs text-neutral-500">
          Accès limité aux comptes whitelistés.
        </p>
      </div>
    </main>
  );
}
