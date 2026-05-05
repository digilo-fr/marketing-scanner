import Link from "next/link";
import { AuditDetail } from "./detail";

export default async function AuditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm text-neutral-500 hover:text-violet-600"
        >
          ← Retour au dashboard
        </Link>
      </div>
      <AuditDetail id={id} />
    </div>
  );
}
