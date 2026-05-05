import type { AgentResult, Category, ScrapedSite } from "@/types";
import type { ProviderChoice } from "@/lib/llm-router";
import {
  buildJsonSchemaInstruction,
  runAgentWithProviders,
  summarizeSiteForPrompt,
} from "./content";
// project context type re-imported above
import type { ProjectContext } from "./content";

const CATEGORY: Category = "competitive";

const SYSTEM = `You are a senior competitive positioning analyst. Evaluate the website's COMPETITIVE POSITIONING.

Scoring rubric (0-100):
- Differentiation: is there a clear "why us vs. them"?
- Niche / target persona clarity (broad-everyone vs. focused)
- Unique mechanism, framework, or proprietary approach mentioned
- Comparison content (vs. X pages, alternative-to pages)
- Pricing positioning relative to inferred market (premium / mid / discount cues)
- Category creation vs. me-too positioning
- Defensibility cues (network effects, data, partnerships, integrations)
- Risk of being commodity/generic in the inferred sector

Use the inferred business_type to ground the analysis. Imagine plausible competitors for that vertical and call out where this site looks weaker or stronger than category norms. Be specific — name the missing positioning angles.

${buildJsonSchemaInstruction(CATEGORY)}`;

/**
 * Run the competitive positioning agent against the scraped site.
 */
export async function runAgent(
  site: ScrapedSite,
  providers: ProviderChoice[],
  project?: ProjectContext
): Promise<AgentResult> {
  return runAgentWithProviders(
    CATEGORY,
    SYSTEM,
    summarizeSiteForPrompt(site, project),
    providers
  );
}
