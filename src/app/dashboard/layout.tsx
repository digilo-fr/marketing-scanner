import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/header";
import { AuthSessionProvider } from "@/components/session-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/auth/signin");
  }
  return (
    <AuthSessionProvider>
      <div className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </div>
    </AuthSessionProvider>
  );
}
