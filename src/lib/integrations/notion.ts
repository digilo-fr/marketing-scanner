import type { NotificationPayload } from "@/types";

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

type NotionBlock = Record<string, unknown>;

/**
 * Convert a Markdown string into a flat list of Notion blocks.
 * Supports: H1/H2/H3, bullet/numbered lists, plain paragraphs.
 * Keeps things shallow (no nesting) to stay robust.
 */
function markdownToBlocks(md: string): NotionBlock[] {
  const lines = md.split("\n");
  const blocks: NotionBlock[] = [];

  const text = (s: string) => [{ type: "text", text: { content: s.slice(0, 1900) } }];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;

    if (line.startsWith("### ")) {
      blocks.push({
        object: "block",
        type: "heading_3",
        heading_3: { rich_text: text(line.slice(4)) },
      });
    } else if (line.startsWith("## ")) {
      blocks.push({
        object: "block",
        type: "heading_2",
        heading_2: { rich_text: text(line.slice(3)) },
      });
    } else if (line.startsWith("# ")) {
      blocks.push({
        object: "block",
        type: "heading_1",
        heading_1: { rich_text: text(line.slice(2)) },
      });
    } else if (/^\s*[-*]\s+/.test(line)) {
      blocks.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: { rich_text: text(line.replace(/^\s*[-*]\s+/, "")) },
      });
    } else if (/^\s*\d+\.\s+/.test(line)) {
      blocks.push({
        object: "block",
        type: "numbered_list_item",
        numbered_list_item: { rich_text: text(line.replace(/^\s*\d+\.\s+/, "")) },
      });
    } else {
      blocks.push({
        object: "block",
        type: "paragraph",
        paragraph: { rich_text: text(line) },
      });
    }

    // Notion API caps children at 100 blocks per request.
    if (blocks.length >= 95) break;
  }

  return blocks;
}

/**
 * Create a page in the "Marketing Scanner Audits" Notion database.
 *
 * Returns the created page URL on success, or `null` if NOTION_AUDITS_DATABASE_ID
 * is not configured (graceful no-op). All errors are caught and logged.
 *
 * Expected DB schema:
 *   - Name (title)
 *   - Score (number)
 *   - Grade (select)
 *   - URL (url)
 *   - PDF (url)
 *   - Date (date)
 */
export async function createNotionAuditPage(
  payload: NotificationPayload,
  reportMd: string
): Promise<string | null> {
  const token = process.env.NOTION_TOKEN;
  const dbId = process.env.NOTION_AUDITS_DATABASE_ID;

  if (!token) {
    console.warn("[notion] NOTION_TOKEN missing, skipping Notion page creation");
    return null;
  }
  if (!dbId) {
    console.warn(
      "[notion] NOTION_AUDITS_DATABASE_ID empty, skipping Notion page creation"
    );
    return null;
  }

  const today = new Date().toISOString().slice(0, 10);
  const blocks = markdownToBlocks(reportMd);

  const body = {
    parent: { database_id: dbId },
    properties: {
      Name: { title: [{ text: { content: payload.business_name } }] },
      Score: { number: payload.overall_score },
      Grade: { select: { name: payload.grade } },
      URL: { url: payload.target_url },
      PDF: { url: payload.pdf_url || null },
      Date: { date: { start: today } },
    },
    children: blocks,
  };

  try {
    const res = await fetch(`${NOTION_API}/pages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(
        `[notion] page creation failed (${res.status}): ${errText.slice(0, 300)}`
      );
      return null;
    }

    const data = (await res.json()) as { url?: string; id?: string };
    return data.url ?? null;
  } catch (err) {
    console.warn(
      `[notion] page creation error: ${(err as Error).message}`
    );
    return null;
  }
}
