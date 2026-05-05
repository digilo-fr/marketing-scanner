import type { AgentResult, Category, ScrapedSite } from "@/types";
import type { ProviderChoice } from "@/lib/llm-router";
import {
  buildJsonSchemaInstruction,
  runAgentWithProviders,
  summarizeSiteForPrompt,
} from "./content";

const CATEGORY: Category = "conversion";

const SYSTEM = `You are a senior conversion rate optimization (CRO) auditor. Evaluate the website's CONVERSION OPTIMIZATION.

Scoring rubric (0-100):
- Presence and clarity of primary CTA above the fold
- CTA copy strength (action-oriented, specific, low friction)
- Lead capture mechanism (form, calendar, chat, phone)
- Friction in the funnel (form length, required steps, account creation)
- Trust signals near CTAs (badges, guarantees, testimonials, ratings)
- Pricing transparency (visible pricing? "contact us" only?)
- Mobile-friendliness signals (responsive copy, tap targets — infer from HTML)
- Page hierarchy (one clear next action vs. many competing CTAs)

Penalize: missing CTA, generic CTA ("Submit", "Click here"), no contact form, hidden pricing, dead-end pages, multiple competing primary actions.

Be SPECIFIC. Quote the exact CTA text in evidence when relevant.

${buildJsonSchemaInstruction(CATEGORY)}`;

/**
 * Run the conversion (CRO) agent against the scraped site.
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
