import { describe, it, expect } from "vitest";
import { redactSecrets } from "../../src/utils/redaction.js";

describe("Secret Redaction", () => {
  it("redacts OpenAI API keys", () => {
    const raw = "const client = new OpenAI({ apiKey: 'sk-abcdef1234567890abcdef1234567890' });";
    const redacted = redactSecrets(raw);
    expect(redacted).not.toContain("sk-abcdef1234567890abcdef1234567890");
    expect(redacted).toContain("[REDACTED_OPENAI_KEY]");
  });

  it("redacts Google / Gemini API keys", () => {
    const raw = "const key = 'AIzaSyD-1234567890abcdef1234567890abcde';";
    const redacted = redactSecrets(raw);
    expect(redacted).not.toContain("AIzaSyD-1234567890abcdef1234567890abcde");
    expect(redacted).toContain("[REDACTED_GOOGLE_KEY]");
  });

  it("redacts GitHub tokens", () => {
    const raw = "export GITHUB_TOKEN=ghp_1234567890abcdef1234567890abcdef1234";
    const redacted = redactSecrets(raw);
    expect(redacted).not.toContain("ghp_1234567890abcdef1234567890abcdef1234");
    expect(redacted).toContain("[REDACTED_GITHUB_PAT]");
  });

  it("redacts Bearer tokens", () => {
    const raw = "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abcdefghij1234567890";
    const redacted = redactSecrets(raw);
    expect(redacted).not.toContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abcdefghij1234567890");
    expect(redacted).toContain("[REDACTED_BEARER_TOKEN]");
  });

  it("redacts generic secret assignments", () => {
    const raw = 'const config = { api_key: "super_secret_production_key_123" };';
    const redacted = redactSecrets(raw);
    expect(redacted).not.toContain("super_secret_production_key_123");
    expect(redacted).toContain("[REDACTED_SECRET]");
  });
});
