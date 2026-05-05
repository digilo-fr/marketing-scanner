// ============================================================
// Marketing Scanner — Types canoniques (source de vérité)
// Tous les agents/lib doivent importer depuis ici
// ============================================================

export type AuditTier = "quick" | "full" | "premium";

export type AuditStatus =
  | "pending"
  | "scraping"
  | "analyzing"
  | "synthesizing"
  | "generating_pdf"
  | "notifying"
  | "completed"
  | "failed";

export type Grade = "A" | "B" | "C" | "D" | "F";

export type Severity = "critical" | "high" | "medium" | "low";

export type Category =
  | "content"
  | "conversion"
  | "seo"
  | "competitive"
  | "brand"
  | "growth";

export const CATEGORY_WEIGHTS: Record<Category, number> = {
  content: 0.25,
  conversion: 0.20,
  seo: 0.20,
  competitive: 0.15,
  brand: 0.10,
  growth: 0.10,
};

export const CATEGORY_LABELS_FR: Record<Category, string> = {
  content: "Content & Messaging",
  conversion: "Conversion Optimization",
  seo: "SEO & Discoverability",
  competitive: "Competitive Positioning",
  brand: "Brand & Trust",
  growth: "Growth & Strategy",
};

// ============================================================
// DB rows (Google Sheets)
// ============================================================

export interface User {
  email: string;
  name: string;
  role: "owner" | "collaborator";
  created_at: string;
  last_login: string;
}

export interface Project {
  id: string;
  owner_email: string;
  name: string;
  slug: string;
  type: string; // "agence_ia" | "saas" | "association" | "autre"
  description: string;
  created_at: string;
  updated_at: string;
}

export type CategoryScores = Record<Category, number>;

export interface Audit {
  id: string;
  project_id: string;
  owner_email: string;
  target_url: string;
  tier: AuditTier;
  status: AuditStatus;
  overall_score: number; // 0-100
  grade: Grade;
  scores_json: string; // JSON.stringify(CategoryScores)
  report_md_url: string; // Drive file URL or sheet URL
  pdf_url: string;
  llm_used: string; // "groq:llama-3.3-70b" or comma-separated
  duration_sec: number;
  error: string;
  created_at: string;
  completed_at: string;
}

export interface Recommendation {
  id: string;
  audit_id: string;
  category: Category;
  severity: Severity;
  priority: "quick_win" | "strategic" | "long_term";
  title: string;
  description: string;
  impact_estimate_min: number; // EUR/month
  impact_estimate_max: number;
  timeline: string; // "1 jour", "1 semaine", "1 mois"
  confidence: "high" | "medium" | "low";
}

// ============================================================
// Scraping output
// ============================================================

export interface ScrapedPage {
  url: string;
  title: string;
  meta_description: string;
  headings: { level: number; text: string }[];
  visible_text: string;
  cta_buttons: string[];
  images_count: number;
  has_form: boolean;
  has_chat_widget: boolean;
  external_links: string[];
}

export interface ScrapedSite {
  homepage: ScrapedPage;
  pages: ScrapedPage[]; // up to 5 sub-pages
  business_type:
    | "saas"
    | "ecommerce"
    | "agency"
    | "local"
    | "creator"
    | "marketplace"
    | "unknown";
  detected_languages: string[];
  has_pricing_page: boolean;
  has_about_page: boolean;
  has_blog: boolean;
  has_contact_form: boolean;
  raw_html_chars: number;
}

// ============================================================
// LLM router
// ============================================================

export type LlmProvider = "groq" | "cerebras" | "sambanova" | "cloudflare";

export interface LlmCall {
  provider: LlmProvider;
  model: string;
  system: string;
  user: string;
  temperature?: number;
  max_tokens?: number;
}

export interface LlmResponse {
  provider: LlmProvider;
  model: string;
  content: string;
  duration_ms: number;
  tokens_in?: number;
  tokens_out?: number;
}

// ============================================================
// Subagent output (shared shape)
// ============================================================

export interface AgentFinding {
  title: string;
  severity: Severity;
  description: string;
  evidence: string; // citation extracted from scraped content
}

export interface AgentRecommendation {
  priority: "quick_win" | "strategic" | "long_term";
  title: string;
  description: string;
  impact_estimate_min: number;
  impact_estimate_max: number;
  timeline: string;
  confidence: "high" | "medium" | "low";
}

export interface AgentResult {
  category: Category;
  score: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  findings: AgentFinding[];
  recommendations: AgentRecommendation[];
  summary: string; // 2-3 sentences
}

// ============================================================
// API contracts
// ============================================================

export interface StartAuditRequest {
  project_id: string;
  target_url: string;
  tier: AuditTier;
}

export interface StartAuditResponse {
  audit_id: string;
  status: AuditStatus;
  poll_url: string;
}

export interface AuditStatusResponse {
  audit: Audit;
  recommendations: Recommendation[];
  agent_results?: AgentResult[]; // present when completed
}

// ============================================================
// Notification payloads
// ============================================================

export interface NotificationPayload {
  audit_id: string;
  target_url: string;
  business_name: string;
  overall_score: number;
  grade: Grade;
  pdf_url: string;
  report_url: string;
  top_recommendations: { title: string; impact_estimate_max: number }[];
  recipient_email: string;
}
