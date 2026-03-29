import {
  AIPipeline,
  OpenRouterProvider,
  OpenAIProvider,
  AnthropicProvider,
  XAIProvider,
  type AIProvider,
} from "@createflowchart/ai";

function createPipeline() {
  const providers: AIProvider[] = [];

  if (process.env.OPENROUTER_API_KEY) {
    const models = process.env.OPENROUTER_MODELS?.split(",") || [
      "google/gemini-2.0-flash-001",
    ];
    providers.push(
      new OpenRouterProvider(process.env.OPENROUTER_API_KEY, models[0]),
    );
  }

  if (process.env.OPENAI_API_KEY) {
    providers.push(
      new OpenAIProvider(
        process.env.OPENAI_API_KEY,
        process.env.OPENAI_MODELS?.split(",")[0] || "gpt-4o",
      ),
    );
  }

  if (process.env.ANTHROPIC_API_KEY) {
    providers.push(
      new AnthropicProvider(
        process.env.ANTHROPIC_API_KEY,
        process.env.ANTHROPIC_MODELS?.split(",")[0] ||
          "claude-3-5-sonnet-20241022",
      ),
    );
  }

  if (process.env.XAI_API_KEY) {
    providers.push(
      new XAIProvider(
        process.env.XAI_API_KEY,
        process.env.XAI_MODELS?.split(",")[0] || "grok-beta",
      ),
    );
  }

  return new AIPipeline(providers);
}

export const aiPipeline = createPipeline();
