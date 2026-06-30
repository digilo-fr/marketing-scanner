"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { LogOut, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  const { data: session } = useSession();
  const user = session?.user;
  const initial = (user?.name ?? user?.email ?? "?").charAt(0).toUpperCase();

  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-950/70 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-5 w-5 text-indigo-500" />
          Marketing Scanner
        </Link>
        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt={user.name ?? user.email ?? "Avatar"}
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <div
                  aria-hidden
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white text-sm font-semibold"
                >
                  {initial}
                </div>
              )}
              <span className="hidden sm:inline text-sm text-neutral-700 dark:text-neutral-300">
                {user.email}
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/" })}
            aria-label="Se déconnecter"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Se déconnecter</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
