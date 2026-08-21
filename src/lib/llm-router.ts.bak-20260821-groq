import type {
  AuditTier,
  LlmCall,
  LlmProvider,
  LlmResponse,
} from "@/types";

// ============================================================
// Provider endpoints (OpenAI-compatible)
// ============================================================

interface ProviderConfig {
  endpoint: string;
  /** Returns the API key for the given agent index, allowing key rotation. */
  apiKey: (agentIndex: number) => string | undefined;
}

const PROVIDERS: Record<LlmProvider, ProviderConfig> = {
  groq: {
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    apiKey: () => process.env.GROQ_API_KEY,
  },
  cerebras: {
    endpoint: "https://api.cerebras.ai/v1/chat/completions",
    apiKey: (i) =>
      i % 2 === 0
        ? process.env.CEREBRAS_API_KEY
        : process.env.CEREBRAS_API_KEY_2 || process.env.CEREBRAS_API_KEY,
  },
  sambanova: {
    endpoint: "https://api.sambanova.ai/v1/chat/completions",
    apiKey: () => process.env.SAMBANOVA_API_KEY,
  },
  cloudflare: {
    // Workers AI OpenAI-compatible gateway.
    endpoint: process.env.CLOUDFLARE_ACCOUNT_ID
      ? `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1/chat/completions`
      : "",
    apiKey: () => process.env.CLOUDFLARE_API_TOKEN,
  },
};

export interface ProviderChoice {
  provider: LlmProvider;
  model: string;
}

// ============================================================
// Tier strategy
// ============================================================

const FULL_ROTATION: ProviderChoice[] = [
  { provider: "cerebras", model: "llama-4-scout-17b-16e-instruct" },
  { provider: "groq", model: "moonshotai/kimi-k2-instruct" },
  { provider: "sambanova", model: "Meta-Llama-3.3-70B-Instruct" },
  { provider: "cerebras", model: "llama-3.3-70b" },
  { provider: "groq", model: "llama-3.3-70b-versatile" },
];

const FALLBACK_VOTER: ProviderChoice = {
  provider: "groq",
  model: "llama-3.3-70b-versatile",
};

/**
 * Choose the LLM providers used by a given agent slot for a given tier.
 *
 * - `quick`  → 1 fast Groq model.
 * - `full`   → 1 provider per agent, rotated across vendors.
 * - `premium`→ 2 providers per agent (consensus voting).
 */
export function pickProvidersForTier(
  tier: AuditTier,
  agentIndex: number
): ProviderChoice[] {
  if (tier === "quick") {
    return [{ provider: "groq", model: "llama-3.3-70b-versatile" }];
  }

  const primary =
    FULL_ROTATION[((agentIndex % FULL_ROTATION.length) + FULL_ROTATION.length) %
      FULL_ROTATION.length];

  if (tier === "full") return [primary];

  // premium: primary + a Groq voter for consensus.
  if (
    primary.provider === FALLBACK_VOTER.provider &&
    primary.model === FALLBACK_VOTER.model
  ) {
    return [
      primary,
      { provider: "cerebras", model: "llama-3.3-70b" },
    ];
  }
  return [primary, FALLBACK_VOTER];
}

// ============================================================
// HTTP call with timeout + retry
// ============================================================

interface OpenAiChoice {
  message?: { content?: string };
}
interface OpenAiUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
}
interface OpenAiResponse {
  choices?: OpenAiChoice[];
  usage?: OpenAiUsage;
}

const DEFAULT_TIMEOUT_MS = 60_000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function doFetch(
  call: LlmCall,
  apiKey: string,
  endpoint: string
): Promise<{ status: number; body: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: call.model,
        messages: [
          { role: "system", content: call.system },
          { role: "user", content: call.user },
        ],
        temperature: call.temperature ?? 0.2,
        max_tokens: call.max_tokens ?? 4096,
      }),
    });
    const body = await res.text();
    return { status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Call any OpenAI-compatible LLM endpoint. Retries once on 429 or 5xx.
 * Always throws an Error annotated with provider+model on failure.
 */
export async function callLlm(call: LlmCall): Promise<LlmResponse> {
  const cfg = PROVIDERS[call.provider];
  if (!cfg || !cfg.endpoint) {
    throw new Error(
      `[llm-router] Provider "${call.provider}" not configured (missing endpoint).`
    );
  }
  const apiKey = cfg.apiKey(0);
  if (!apiKey) {
    throw new Error(
      `[llm-router] Missing API key for provider "${call.provider}".`
    );
  }

  const start = Date.now();
  let lastErr = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    let status = 0;
    let body = "";
    try {
      const r = await doFetch(call, apiKey, cfg.endpoint);
      status = r.status;
      body = r.body;
    } catch (err) {
      lastErr = (err as Error).message;
      if (attempt === 0) {
        await sleep(1000);
        continue;
      }
      throw new Error(
        `[llm-router] ${call.provider}/${call.model} network error: ${lastErr}`
      );
    }

    if (status >= 200 && status < 300) {
      let parsed: OpenAiResponse;
      try {
        parsed = JSON.parse(body) as OpenAiResponse;
      } catch (err) {
        throw new Error(
          `[llm-router] ${call.provider}/${call.model} returned non-JSON body: ${(err as Error).message}`
        );
      }
      const content = parsed.choices?.[0]?.message?.content ?? "";
      if (!content) {
        throw new Error(
          `[llm-router] ${call.provider}/${call.model} returned empty content.`
        );
      }
      return {
        provider: call.provider,
        model: call.model,
        content,
        duration_ms: Date.now() - start,
        tokens_in: parsed.usage?.prompt_tokens,
        tokens_out: parsed.usage?.completion_tokens,
      };
    }

    lastErr = `HTTP ${status}: ${body.slice(0, 500)}`;
    const retriable = status === 429 || (status >= 500 && status < 600);
    if (!retriable || attempt === 1) {
      throw new Error(
        `[llm-router] ${call.provider}/${call.model} failed: ${lastErr}`
      );
    }
    await sleep(1500);
  }

  throw new Error(
    `[llm-router] ${call.provider}/${call.model} failed after retries: ${lastErr}`
  );
}
