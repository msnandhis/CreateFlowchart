import { AIGateway, OpenRouterProvier, OpenAIProvider, AnthropicProvider, XAIProvider, AIProvider } from "@createflowchart/ai";

/**
 * Shared AI Gateway instance for the Next.js app.
 * Configures providers based on environment variables with a prioritized failover order.
 */
function createGateway() {
  const providers: AIProvider[] = [];

  // P1: OpenRouter (Primary Aggregator)
  if (process.env.OPENROUTER_API_KEY) {
    const models = process.env.OPENROUTER_MODELS?.split(",") || ["google/gemini-2.0-flash-001"];
    providers.push(new OpenRouterProvier(process.env.OPENROUTER_API_KEY, models[0]));
  }

  // P2: OpenAI (Direct Fallback)
  if (process.env.OPENAI_API_KEY) {
    providers.push(new OpenAIProvider(process.env.OPENAI_API_KEY, process.env.OPENAI_MODELS?.split(",")[0] || "gpt-4o"));
  }

  // P3: Anthropic (Direct Fallback)
  if (process.env.ANTHROPIC_API_KEY) {
    providers.push(new AnthropicProvider(process.env.ANTHROPIC_API_KEY, process.env.ANTHROPIC_MODELS?.split(",")[0] || "claude-3-5-sonnet-20241022"));
  }

  // P4: xAI / Grok (Direct Fallback)
  if (process.env.XAI_API_KEY) {
    providers.push(new XAIProvider(process.env.XAI_API_KEY, process.env.XAI_MODELS?.split(",")[0] || "grok-beta"));
  }

  return new AIGateway(providers);
}

export const aiGateway = createGateway();
