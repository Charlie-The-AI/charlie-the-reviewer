import pc from "picocolors";
import { ProviderRegistry } from "../../providers/registry.js";

export function runProvidersListCommand(): void {
  const registered = ProviderRegistry.getRegisteredProviders();

  console.log();
  console.log(pc.bold(pc.cyan("=== Supported AI Providers ===")));
  console.log();

  console.log(pc.bold("1. OpenAI (`openai`)"));
  console.log(`   - Environment Variable: ${pc.green("OPENAI_API_KEY")}`);
  console.log(`   - Recommended Models:   gpt-4o, gpt-4o-mini, o3-mini`);
  console.log(
    `   - Features:             Structured JSON output, reasoning models, token tracking`
  );
  console.log();

  console.log(pc.bold("2. Google Gemini (`gemini`)"));
  console.log(`   - Environment Variable: ${pc.green("GEMINI_API_KEY")}`);
  console.log(`   - Recommended Models:   gemini-2.5-flash, gemini-2.5-pro, gemini-1.5-flash`);
  console.log(`   - Features:             High-speed JSON responses, expansive context window`);
  console.log();

  console.log(pc.bold("Registered Provider Keys:"));
  console.log(`   ${registered.map((p) => pc.green(p)).join(", ")}`);
  console.log();

  console.log(pc.bold("Extensibility:"));
  console.log(
    pc.gray(
      "   To add Anthropic Claude, Ollama, OpenRouter, or custom self-hosted endpoints, implement the `AIProvider` interface and register it with `ProviderRegistry.registerProvider('custom', CustomProvider)`."
    )
  );
  console.log();
}
