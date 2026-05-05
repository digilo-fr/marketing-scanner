import * as cheerio from "cheerio";
import type { ScrapedPage, ScrapedSite } from "@/types";

const USER_AGENT =
  "Mozilla/5.0 (compatible; MarketingScannerBot/1.0; +https://audit.digilo.fr/bot)";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_TEXT_CHARS = 8000;
const MAX_SUBPAGES = 5;

const PRIORITY_PATHS = [
  "pricing",
  "tarifs",
  "tarif",
  "price",
  "about",
  "a-propos",
  "qui-sommes-nous",
  "features",
  "fonctionnalites",
  "produits",
  "products",
  "contact",
  "blog",
  "actualites",
  "news",
];

const CHAT_WIDGET_HINTS = [
  "intercom",
  "crisp.chat",
  "drift.com",
  "tawk.to",
  "tidio",
  "livechatinc",
  "hubspot.com/usemessages",
];

interface FetchResult {
  url: string;
  html: string;
}

async function fetchHtml(url: string): Promise<FetchResult | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,*/*" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html") && !ct.includes("application/xhtml")) {
      return null;
    }
    const html = await res.text();
    return { url: res.url || url, html };
  } catch {
    return null;
  }
}

function normalizeUrl(href: string, base: string): string | null {
  try {
    const u = new URL(href, base);
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

function sameDomain(a: string, b: string): boolean {
  try {
    return new URL(a).hostname === new URL(b).hostname;
  } catch {
    return false;
  }
}

function parsePage(url: string, html: string): ScrapedPage {
  const $ = cheerio.load(html);

  const title = ($("title").first().text() || "").trim();
  const meta_description = ($('meta[name="description"]').attr("content") || "")
    .trim();

  const headings: { level: number; text: string }[] = [];
  for (const tag of ["h1", "h2", "h3"]) {
    $(tag).each((_, el) => {
      const text = $(el).text().replace(/\s+/g, " ").trim();
      if (text) headings.push({ level: Number(tag[1]), text });
    });
  }

  // Strip non-content nodes before extracting text.
  $("script, style, noscript, svg, iframe").remove();
  const visible_text = $("body")
    .text()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXT_CHARS);

  const cta_buttons: string[] = [];
  $("a, button, input[type=submit]").each((_, el) => {
    const node = $(el);
    const text =
      (node.text() || node.attr("value") || node.attr("aria-label") || "")
        .replace(/\s+/g, " ")
        .trim();
    if (text && text.length <= 60) cta_buttons.push(text);
  });

  const images_count = $("img").length;
  const has_form = $("form").length > 0;

  // Re-parse to inspect script srcs (we already stripped them above).
  const $raw = cheerio.load(html);
  const scriptHay = $raw("script")
    .map((_, el) => $raw(el).attr("src") || $raw(el).html() || "")
    .get()
    .join(" ")
    .toLowerCase();
  const has_chat_widget = CHAT_WIDGET_HINTS.some((h) => scriptHay.includes(h));

  const external_links: string[] = [];
  $raw("a[href]").each((_, el) => {
    const href = $raw(el).attr("href");
    if (!href) return;
    const abs = normalizeUrl(href, url);
    if (abs && !sameDomain(abs, url)) external_links.push(abs);
  });

  return {
    url,
    title,
    meta_description,
    headings: headings.slice(0, 50),
    visible_text,
    cta_buttons: Array.from(new Set(cta_buttons)).slice(0, 40),
    images_count,
    has_form,
    has_chat_widget,
    external_links: Array.from(new Set(external_links)).slice(0, 30),
  };
}

function discoverSubpages(homepageUrl: string, html: string): string[] {
  const $ = cheerio.load(html);
  const found = new Map<string, number>(); // url -> priority score (lower = better)

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const abs = normalizeUrl(href, homepageUrl);
    if (!abs || abs === homepageUrl) return;
    if (!sameDomain(abs, homepageUrl)) return;
    if (/\.(pdf|jpg|jpeg|png|gif|svg|webp|mp4|zip)$/i.test(abs)) return;

    const path = new URL(abs).pathname.toLowerCase();
    let score = 100;
    for (let i = 0; i < PRIORITY_PATHS.length; i++) {
      if (path.includes(PRIORITY_PATHS[i])) {
        score = i;
        break;
      }
    }
    const existing = found.get(abs);
    if (existing === undefined || score < existing) found.set(abs, score);
  });

  return [...found.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([u]) => u)
    .slice(0, MAX_SUBPAGES);
}

function detectBusinessType(
  homepage: ScrapedPage,
  pages: ScrapedPage[]
): ScrapedSite["business_type"] {
  const allText = [homepage, ...pages]
    .map((p) => `${p.title} ${p.meta_description} ${p.visible_text}`)
    .join(" ")
    .toLowerCase();

  const ctaText = [homepage, ...pages]
    .flatMap((p) => p.cta_buttons)
    .join(" ")
    .toLowerCase();

  const hay = `${allText} ${ctaText}`;

  if (
    /\b(add to cart|ajouter au panier|checkout|panier|sku|in stock|en stock)\b/.test(
      hay
    )
  ) {
    return "ecommerce";
  }
  if (
    /\b(free trial|essai gratuit|start free|sign up free|pricing tier|per seat|api key|saas)\b/.test(
      hay
    )
  ) {
    return "saas";
  }
  if (
    /\b(case stud(?:y|ies)|work with us|notre agence|portfolio|nos clients|book a call)\b/.test(
      hay
    )
  ) {
    return "agency";
  }
  if (
    /\b(course|formation|lead magnet|newsletter|podcast|coaching|masterclass|ebook)\b/.test(
      hay
    )
  ) {
    return "creator";
  }
  if (
    /\b(buyers?|sellers?|vendeurs?|acheteurs?|marketplace|commission)\b/.test(
      hay
    )
  ) {
    return "marketplace";
  }

  const hasAddress = /\b\d{1,4}\s+(rue|avenue|boulevard|street|st\.|ave)\b/i.test(
    allText
  );
  const hasPhone = /(\+?\d[\d\s().-]{7,}\d)/.test(allText);
  const hasHours = /\b(opening hours|horaires|monday|lundi|mardi|tuesday)\b/.test(
    allText
  );
  if (hasAddress && hasPhone && hasHours) return "local";

  return "unknown";
}

function detectLanguages(html: string): string[] {
  const $ = cheerio.load(html);
  const langs = new Set<string>();
  const htmlLang = $("html").attr("lang");
  if (htmlLang) langs.add(htmlLang.split("-")[0].toLowerCase());
  $("link[rel=alternate][hreflang]").each((_, el) => {
    const v = $(el).attr("hreflang");
    if (v && v !== "x-default") langs.add(v.split("-")[0].toLowerCase());
  });
  if (langs.size === 0) langs.add("unknown");
  return [...langs];
}

/**
 * Scrape a homepage and up to 5 priority sub-pages on the same domain.
 * Returns an aggregated ScrapedSite ready to feed to the agents.
 *
 * @throws when the homepage cannot be fetched.
 */
export async function scrapeSite(url: string): Promise<ScrapedSite> {
  const homeRes = await fetchHtml(url);
  if (!homeRes) {
    throw new Error(`[scraper] Failed to fetch homepage: ${url}`);
  }
  const homepage = parsePage(homeRes.url, homeRes.html);
  const subUrls = discoverSubpages(homeRes.url, homeRes.html);

  const pages: ScrapedPage[] = [];
  for (const u of subUrls) {
    const r = await fetchHtml(u);
    if (r) pages.push(parsePage(r.url, r.html));
  }

  const allUrls = [homepage.url, ...pages.map((p) => p.url)].map((u) =>
    u.toLowerCase()
  );
  const has_pricing_page = allUrls.some((u) =>
    /(pricing|tarifs?|prix|price)/.test(u)
  );
  const has_about_page = allUrls.some((u) =>
    /(about|a-propos|qui-sommes)/.test(u)
  );
  const has_blog = allUrls.some((u) => /(blog|actualites|news)/.test(u));
  const has_contact_form =
    homepage.has_form ||
    pages.some(
      (p) => p.has_form || /contact/.test(p.url.toLowerCase())
    );

  return {
    homepage,
    pages,
    business_type: detectBusinessType(homepage, pages),
    detected_languages: detectLanguages(homeRes.html),
    has_pricing_page,
    has_about_page,
    has_blog,
    has_contact_form,
    raw_html_chars: homeRes.html.length,
  };
}
