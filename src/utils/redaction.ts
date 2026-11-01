/**
 * Secret redaction utility to sanitize credentials before logging or transmitting context.
 */

const SECRET_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  // OpenAI API Key
  { name: "OPENAI_KEY", regex: /sk-[A-Za-z0-9_-]{20,}/g },
  // Google / Gemini API Key
  { name: "GOOGLE_KEY", regex: /AIza[0-9A-Za-z\-_]{35}/g },
  // GitHub Personal Access Token / Fine-grained token
  { name: "GITHUB_PAT", regex: /gh[pousr]_[A-Za-z0-9]{36,}/g },
  { name: "GITHUB_FINE_GRAINED", regex: /github_pat_[A-Za-z0-9_]{80,}/g },
  // Generic Private Key
  {
    name: "PRIVATE_KEY",
    regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  },
  // Bearer Token in headers or strings
  {
    name: "BEARER_TOKEN",
    regex: /(bearer\s+)([a-zA-Z0-9_\-.]{25,})/gi,
  },
  // Generic API Key assignment in code / config (ignoring already redacted tokens)
  {
    name: "GENERIC_SECRET_ASSIGNMENT",
    regex: /(api[_-]?key|secret|password|token)\s*[:=]\s*["'](?!\s*\[REDACTED_)([^"'\s]{8,})["']/gi,
  },
];

export function redactSecrets(text: string): string {
  if (!text || typeof text !== "string") {
    return text;
  }

  let sanitized = text;

  // Redact exact match environment values if present
  const sensitiveEnvVars = [
    process.env.OPENAI_API_KEY,
    process.env.GEMINI_API_KEY,
    process.env.GITHUB_TOKEN,
    process.env.GH_TOKEN,
  ].filter((v): v is string => Boolean(v && v.length >= 8));

  for (const envVal of sensitiveEnvVars) {
    sanitized = sanitized.replaceAll(envVal, "[REDACTED_SECRET]");
  }

  // Redact pattern matches
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.name === "BEARER_TOKEN") {
      sanitized = sanitized.replace(pattern.regex, "$1[REDACTED_BEARER_TOKEN]");
    } else if (pattern.name === "GENERIC_SECRET_ASSIGNMENT") {
      sanitized = sanitized.replace(pattern.regex, '$1: "[REDACTED_SECRET]"');
    } else {
      sanitized = sanitized.replace(pattern.regex, `[REDACTED_${pattern.name}]`);
    }
  }

  return sanitized;
}
