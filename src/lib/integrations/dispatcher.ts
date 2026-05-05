import type {
  Audit,
  CategoryScores,
  NotificationPayload,
  Recommendation,
} from "@/types";
import { getAudit, getProject, listRecommendations, updateAudit } from "@/lib/sheets-db";
import { renderAuditPdf } from "@/lib/pdf-generator";
import { uploadPdfToDrive } from "@/lib/storage";
import { sendAuditEmail } from "./gmail";
import { sendWhatsAppNotification } from "./whatsapp-n8n";
import { createNotionAuditPage } from "./notion";

/**
 * Best-effort hostname extraction → human-readable business name.
 * "https://www.acme-corp.fr/about" → "Acme Corp"
 */
function businessNameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const root = host.split(".")[0] || host;
    return root
      .split(/[-_]+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  } catch {
    return url;
  }
}

function safeParseScores(json: string): CategoryScores {
  const empty: CategoryScores = {
    content: 0,
    conversion: 0,
    seo: 0,
    competitive: 0,
    brand: 0,
    growth: 0,
  };
  if (!json) return empty;
  try {
    const parsed = JSON.parse(json) as Partial<CategoryScores>;
    return { ...empty, ...parsed };
  } catch {
    return empty;
  }
}

function buildPayload(
  audit: Audit,
  recommendations: Recommendation[],
  pdfUrl: string,
  recipientEmail: string
): NotificationPayload {
  const businessName = businessNameFromUrl(audit.target_url);
  const top = [...recommendations]
    .sort((a, b) => b.impact_estimate_max - a.impact_estimate_max)
    .slice(0, 3)
    .map((r) => ({ title: r.title, impact_estimate_max: r.impact_estimate_max }));

  return {
    audit_id: audit.id,
    target_url: audit.target_url,
    business_name: businessName,
    overall_score: audit.overall_score,
    grade: audit.grade,
    pdf_url: pdfUrl,
    report_url: audit.report_md_url || pdfUrl,
    top_recommendations: top,
    recipient_email: recipientEmail,
  };
}

/**
 * Orchestrates post-audit notifications:
 *   1. Loads audit + recommendations + project
 *   2. Generates PDF
 *   3. Uploads PDF to Drive
 *   4. Updates the audit row with pdf_url
 *   5. Fans out Gmail + WhatsApp(n8n) + Notion in parallel (allSettled)
 *
 * Never throws — all errors are logged. The pipeline's job is done by the
 * time this is called; notifications are best-effort.
 */
export async function dispatchAuditCompleted(
  auditId: string,
  reportMd: string
): Promise<void> {
  try {
    const audit = await getAudit(auditId);
    if (!audit) {
      console.error(`[dispatcher] audit ${auditId} not found, aborting`);
      return;
    }

    const [recommendations, project] = await Promise.all([
      listRecommendations(auditId),
      getProject(audit.project_id),
    ]);

    const businessName =
      project?.name?.trim() || businessNameFromUrl(audit.target_url);
    const scores = safeParseScores(audit.scores_json);

    // 1. PDF
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await renderAuditPdf(audit, recommendations, scores, businessName);
    } catch (err) {
      console.error(
        `[dispatcher] PDF render failed for ${auditId}: ${(err as Error).message}`
      );
      return;
    }

    // 2. Upload to Drive
    let pdfUrl = "";
    try {
      const date = new Date().toISOString().slice(0, 10);
      const slug =
        businessName.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "audit";
      const fileName = `audit-${slug}-${date}.pdf`;
      const uploaded = await uploadPdfToDrive(pdfBuffer, fileName);
      pdfUrl = uploaded.fileUrl;
    } catch (err) {
      console.error(
        `[dispatcher] Drive upload failed for ${auditId}: ${(err as Error).message}`
      );
      // Continue: we can still email the PDF as attachment.
    }

    // 3. Persist URLs on the audit row.
    if (pdfUrl) {
      try {
        await updateAudit(auditId, {
          pdf_url: pdfUrl,
          report_md_url: audit.report_md_url || pdfUrl,
        });
      } catch (err) {
        console.warn(
          `[dispatcher] updateAudit failed: ${(err as Error).message}`
        );
      }
    }

    // 4. Build payload & fan out.
    const payload = buildPayload(
      { ...audit, pdf_url: pdfUrl || audit.pdf_url },
      recommendations,
      pdfUrl,
      audit.owner_email
    );

    const results = await Promise.allSettled([
      sendAuditEmail(payload, pdfBuffer, reportMd),
      sendWhatsAppNotification(payload),
      createNotionAuditPage(payload, reportMd),
    ]);

    const labels = ["gmail", "whatsapp-n8n", "notion"];
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        console.warn(
          `[dispatcher] ${labels[i]} failed: ${(r.reason as Error)?.message ?? r.reason}`
        );
      }
    });
  } catch (err) {
    console.error(
      `[dispatcher] unexpected failure for ${auditId}: ${(err as Error).message}`
    );
  }
}
