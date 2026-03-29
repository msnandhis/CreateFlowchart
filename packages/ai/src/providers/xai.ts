import type { AIProvider, GenerateOptions, GenerateResponse } from "./base";
import { AIError } from "./base";

const DEFAULT_MODEL = "grok-beta";
const BASE_URL = "https://api.x.ai/v1";

export class XAIProvider implements AIProvider {
  readonly name = "xAI";
  readonly model: string;
  readonly supportsAttachments = false;

  constructor(
    private apiKey: string,
    model?: string,
    private baseUrl: string = BASE_URL,
  ) {
    this.model = model || DEFAULT_MODEL;
  }

  async generate(options: GenerateOptions): Promise<GenerateResponse> {
    const { prompt, context, systemPrompt, attachments } = options;

    if (attachments?.length) {
      throw new AIError(this.name, "Image attachments are not supported by this provider");
    }

    const messages: Array<{ role: string; content: string }> = [
      {
        role: "system",
        content: systemPrompt || `You are a flowchart expert. Generate a valid FlowGraph JSON based on the user prompt.
The FlowGraph schema:
- nodes: array of { id, type: "start"|"process"|"decision"|"action"|"end", position: {x, y}, data: { label, confidence: 0-1, meta: {}, action?: { webhook_url, method, headers, payload_template } } }
- edges: array of { id, source, target, label?: string, confidence?: 0-1 }
- meta: { version: 1, createdBy?: string, isSandbox: boolean }

Respond ONLY with valid JSON. No markdown, no explanations.`,
      },
    ];

    if (context) {
      messages.push({
        role: "assistant",
        content: JSON.stringify(context),
      });
    }

    messages.push({ role: "user", content: prompt });

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new AIError(
          this.name,
          `Request failed: ${response.status} ${response.statusText}`,
          errorText,
          response.status,
        );
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: {
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
        };
      };

      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new AIError(this.name, "No content in response", data);
      }

      return {
        content: content.trim(),
        raw: data,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
      };
    } catch (err) {
      if (err instanceof AIError) throw err;
      throw new AIError(
        this.name,
        `Generation failed: ${(err as Error).message}`,
        err,
      );
    }
  }
}

export function createXAIProvider(apiKey: string, model?: string): XAIProvider {
  return new XAIProvider(apiKey, model);
}
