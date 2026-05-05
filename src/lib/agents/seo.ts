import type { AgentResult, Category, ScrapedSite } from "@/types";
import type { ProviderChoice } from "@/lib/llm-router";
import {
  buildJsonSchemaInstruction,
  runAgentWithProviders,
  summarizeSiteForPrompt,
} from "./content";

const CATEGORY: Category = "seo";

const SYSTEM = `You are a senior technical and on-page SEO auditor. Evaluate the website's SEO & DISCOVERABILITY.

Scoring rubric (0-100):
- <title> tag quality (length 30-65, keyword presence, uniqueness)
- Meta description quality (length 120-160, compelling, keyword present)
- H1 presence and uniqueness (exactly one descriptive H1)
- Heading hierarchy (H1 > H2 > H3, no skipping levels)
- Keyword strategy inferred from copy (primary keyword evident? long tail?)
- Content depth & topic authority (blog/articles present?)
- Internal linking (sub-pages discovered, navigation breadth)
- Multilingual setup (hreflang, lang attribute) when relevant
- Structured data hints (mentions of schema, JSON-LD — infer from text only)

Penalize: missing/duplicate title, missing meta description, missing H1, multiple H1s, thin content (<300 words homepage), keyword stuffing.

Use evidence quotes from the title/headings/meta when calling out issues.

${buildJsonSchemaInstruction(CATEGORY)}`;

/**
 * Run the SEO agent against the scraped site.
 */
export async function runAgent(
  site: ScrapedSite,
  providers: ProviderChoice[]
): Promise<AgentResult> {
  return runAgentWithProviders(
    CATEGORY,
    SYSTEM,
    summarizeSiteForPrompt(site),
    providers
  );
}
