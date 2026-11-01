# AI Providers Reference

`@thesonofman/ai-code-reviewer` employs a provider-agnostic architecture. The core review engine never depends on provider SDKs directly; it interacts with providers through the standardized `AIProvider` interface.

---

## 1. Supported Providers

### OpenAI (`openai`)

- **Official SDK:** `openai`
- **Authentication:** `OPENAI_API_KEY`
- **Dashboard:** [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Recommended Models:**
  - `gpt-4o`: High reasoning, balanced latency, comprehensive reviews.
  - `gpt-4o-mini`: Fast, cost-effective for high-frequency CI runs.
  - `o3-mini`: Deep reasoning for maximum strictness security and architecture checks.

#### Configuration Example

```yaml
ai:
  provider: openai
  model: gpt-4o
  temperature: 0.1
  max_output_tokens: 4000
```

---

### Google Gemini (`gemini`)

- **Official SDK:** `@google/genai`
- **Authentication:** `GEMINI_API_KEY`
- **Dashboard:** [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
- **Recommended Models:**
  - `gemini-2.5-flash`: Exceptionally fast, large context window, cost-effective.
  - `gemini-2.5-pro`: Deep analytical reasoning for complex refactoring.
  - `gemini-1.5-flash`: Legacy high-speed fallback.

#### Configuration Example

```yaml
ai:
  provider: gemini
  model: gemini-2.5-flash
  max_output_tokens: 4000
```

---

## 2. Automatic Fallback Provider

To ensure uninterrupted CI workflows when a provider experiences transient outages or rate limits, configure an automated fallback provider:

```yaml
ai:
  provider: openai
  model: gpt-4o

  fallback:
    enabled: true
    provider: gemini
    model: gemini-2.5-flash
```

### Fallback Behavior Rules

1. **Retryable Failures Only:** Fallback triggers only on HTTP `429 Too Many Requests`, HTTP `5xx` gateway/server errors, and network connection drops.
2. **Never for Auth or Config Errors:** Invalid credentials (401/403) or malformed requests fail immediately and will never trigger silent provider switching.
3. **Observability:** The review summary and check run explicitly state which provider and model performed the review.

---

## 3. Extending With Custom Providers

You can register additional providers (e.g. Anthropic Claude, Ollama, OpenRouter) programmatically:

```typescript
import {
  ProviderRegistry,
  type AIProvider,
  type AIReviewRequest,
  type AIReviewResponse,
} from "@thesonofman/ai-code-reviewer";

class CustomClaudeProvider implements AIProvider {
  readonly name = "claude";

  async review(request: AIReviewRequest): Promise<AIReviewResponse> {
    // Implement Anthropic API call here
    return {
      summary: "Claude review complete",
      findings: [],
    };
  }

  async validateConfiguration(): Promise<void> {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("Missing ANTHROPIC_API_KEY");
    }
  }
}

// Register the provider
ProviderRegistry.registerProvider("claude", CustomClaudeProvider);
```
