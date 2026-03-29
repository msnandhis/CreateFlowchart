import { FlowGraph, FlowGraphSchema } from "@createflowchart/core";

export interface AIProvider {
  name: string;
  model: string;
  generateFlow(prompt: string, context?: FlowGraph): Promise<FlowGraph>;
}

export class AIError extends Error {
  constructor(public provider: string, message: string, public cause?: any) {
    super(`[${provider}] ${message}`);
    this.name = "AIError";
  }
}

// ─── OpenRouter ───────────────────────────────────────────────────
export class OpenRouterProvier implements AIProvider {
  name = "OpenRouter";
  constructor(private apiKey: string, public model = "google/gemini-2.0-flash-001") {}

  async generateFlow(prompt: string, context?: FlowGraph): Promise<FlowGraph> {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://createflowchart.com",
        "X-Title": "CreateFlowchart",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: "system",
            content: `You are a flowchart expert. Generate a valid FlowGraph JSON based on the user prompt.
            The JSON MUST adhere to this Zod schema: ${JSON.stringify(FlowGraphSchema.description || "FlowGraphSchema")}.
            Respond ONLY with the JSON. NO MARKDOWN.`,
          },
          ...(context ? [{ role: "assistant", content: JSON.stringify(context) }] : []),
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      throw new AIError(this.name, `Failed to generate: ${response.statusText}`, await response.text());
    }

    const data = (await response.json()) as any;
    const content = data.choices?.[0]?.message?.content;

    try {
      return JSON.parse(content);
    } catch (e) {
      throw new AIError(this.name, "Invalid JSON response from provider", content);
    }
  }
}
// ─── OpenAI ───────────────────────────────────────────────────────
export class OpenAIProvider implements AIProvider {
  name = "OpenAI";
  constructor(private apiKey: string, public model = "gpt-4o") {}

  async generateFlow(prompt: string, context?: FlowGraph): Promise<FlowGraph> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: "system",
            content: "You are a flowchart expert. Respond only with valid JSON matching the FlowGraph schema.",
          },
          ...(context ? [{ role: "assistant", content: JSON.stringify(context) }] : []),
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      throw new AIError(this.name, `Failed: ${response.statusText}`, await response.text());
    }

    const data = (await response.json()) as any;
    return JSON.parse(data.choices?.[0]?.message?.content);
  }
}

// ─── Anthropic (Claude) ──────────────────────────────────────────
export class AnthropicProvider implements AIProvider {
  name = "Anthropic";
  constructor(private apiKey: string, public model = "claude-3-5-sonnet-20241022") {}

  async generateFlow(prompt: string, context?: FlowGraph): Promise<FlowGraph> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        messages: [
          ...(context ? [{ role: "assistant", content: JSON.stringify(context) }] : []),
          { role: "user", content: `${prompt}\n\nIMPORTANT: Respond ONLY with valid JSON. Do not include any text before or after.` },
        ],
        system: "You are a flowchart expert. Generate valid FlowGraph JSON.",
      }),
    });

    if (!response.ok) {
      throw new AIError(this.name, `Failed: ${response.statusText}`, await response.text());
    }

    const data = (await response.json()) as any;
    const content = data.content?.[0]?.text;
    return JSON.parse(content);
  }
}

// ─── xAI (Grok) ──────────────────────────────────────────────────
export class XAIProvider implements AIProvider {
  name = "xAI";
  constructor(private apiKey: string, public model = "grok-beta") {}

  async generateFlow(prompt: string, context?: FlowGraph): Promise<FlowGraph> {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: "You are a flowchart expert. Respond with JSON." },
          ...(context ? [{ role: "assistant", content: JSON.stringify(context) }] : []),
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      throw new AIError(this.name, `Failed: ${response.statusText}`, await response.text());
    }

    const data = (await response.json()) as any;
    return JSON.parse(data.choices?.[0]?.message?.content);
  }
}

// ─── Gateway Logic ───────────────────────────────────────────────
export class AIGateway {
  constructor(private providers: AIProvider[]) {}

  async generateFlow(prompt: string, context?: FlowGraph): Promise<{ flow: FlowGraph; provider: string }> {
    let lastError: any;

    for (const provider of this.providers) {
      try {
        console.log(`[AIGateway] Attempting generation with ${provider.name} (${provider.model})...`);
        const flow = await provider.generateFlow(prompt, context);
        return { flow, provider: provider.name };
      } catch (e) {
        console.warn(`[AIGateway] Provider ${provider.name} failed:`, e);
        lastError = e;
        continue;
      }
    }

    throw new Error(`[AIGateway] All providers failed. Last error: ${lastError?.message}`);
  }
}
