import type { AgentResult, Category, ScrapedSite } from "@/types";
import type { ProviderChoice } from "@/lib/llm-router";
import {
  buildJsonSchemaInstruction,
  runAgentWithProviders,
  summarizeSiteForPrompt,
} from "./content";
import type { ProjectContext } from "./content";

const BRAND: Category = "brand";
const GROWTH: Category = "growth";

const BRAND_SYSTEM = `You are a senior brand & trust auditor. Evaluate the website's BRAND & TRUST.

Scoring rubric (0-100):
- Visual brand cohesion signals (consistent naming, taglines, capitalization)
- Trust signals: customer logos, testimonials, case studies, press, awards
- Team / about presence (real names, photos, founder story)
- Legal pages mentioned (privacy, terms, mentions légales for FR)
- Contact info (real address, phone, email — not just contact form)
- Social proof depth (named customers vs. anonymous "trusted by 100+")
- Voice consistency across pages
- Risk signals: stock-photo feel, generic copy, no human face, "lorem ipsum" residues

Penalize any sign of low credibility (no about page, no testimonials, no contact info).

${buildJsonSchemaInstruction(BRAND)}`;

const GROWTH_SYSTEM = `You are a senior growth strategist. Evaluate the website's GROWTH & STRATEGY potential.

Scoring rubric (0-100):
- Acquisition channel mix inferred (SEO content, paid hooks, social proof loops, referrals)
- Lead magnets / content upgrades / newsletter signup
- Product-led growth signals (free tier, demo, sandbox, calculator)
- Partnership / integration mentions
- Community / events / content marketing assets
- Retention hooks (login, dashboard, member area mentioned)
- Scalability of the offer (productized vs. bespoke)
- Monetization clarity (one offer vs. confusing multi-offer mess)

Recommendations should focus on the highest-leverage growth bets given the inferred business_type and current site state. Quantify expected revenue impact in EUR/month ranges.

${buildJsonSchemaInstruction(GROWTH)}`;

/**
 * Run the brand & trust agent.
 */
export async function runBrandAgent(
  site: ScrapedSite,
  providers: ProviderChoice[],
  project?: ProjectContext
): Promise<AgentResult> {
  return runAgentWithProviders(
    BRAND,
    BRAND_SYSTEM,
    summarizeSiteForPrompt(site, project),
    providers
  );
}

/**
 * Run the growth & strategy agent.
 */
export async function runGrowthAgent(
  site: ScrapedSite,
  providers: ProviderChoice[],
  project?: ProjectContext
): Promise<AgentResult> {
  return runAgentWithProviders(
    GROWTH,
    GROWTH_SYSTEM,
    summarizeSiteForPrompt(site, project),
    providers
  );
}
