import type { AIProvider, GenerateOptions, GenerateResponse } from "./base";
import { AIError } from "./base";

const DEFAULT_MODEL = "claude-3-5-sonnet-20241022";
const BASE_URL = "https://api.anthropic.com/v1";

export class AnthropicProvider implements AIProvider {
  readonly name = "Anthropic";
  readonly model: string;
  readonly supportsAttachments = true;

  constructor(
    private apiKey: string,
    model?: string,
    private baseUrl: string = BASE_URL,
  ) {
    this.model = model || DEFAULT_MODEL;
  }

  async generate(options: GenerateOptions): Promise<GenerateResponse> {
    const { prompt, context, systemPrompt, attachments } = options;

    const fallbackSystemPrompt = `You are a flowchart expert. Generate a valid FlowGraph JSON based on the user prompt.
The FlowGraph schema:
- nodes: array of { id, type: "start"|"process"|"decision"|"action"|"end", position: {x, y}, data: { label, confidence: 0-1, meta: {}, action?: { webhook_url, method, headers, payload_template } } }
- edges: array of { id, source, target, label?: string, confidence?: 0-1 }
- meta: { version: 1, createdBy?: string, isSandbox: boolean }

Respond ONLY with valid JSON. No markdown, no explanations.`;

    const messages: unknown[] = [];

    if (context) {
      messages.push({
        role: "assistant",
        content: JSON.stringify(context),
      });
    }

    const userContent: unknown = attachments?.length
      ? [
          {
            type: "text",
            text: `${prompt}\n\nIMPORTANT: Respond ONLY with valid JSON. Do not include any text before or after.`,
          },
          ...attachments.map((attachment) => ({
            type: "image",
            source: {
              type: "base64",
              media_type: attachment.mimeType || "image/png",
              data: attachment.url.replace(/^data:[^;]+;base64,/, ""),
            },
          })),
        ]
      : `${prompt}\n\nIMPORTANT: Respond ONLY with valid JSON. Do not include any text before or after.`;

    messages.push({
      role: "user",
      content: userContent,
    });

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: {
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 4096,
          system: systemPrompt || fallbackSystemPrompt,
          messages,
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
        content?: Array<{ text?: string }>;
        usage?: {
          input_tokens: number;
          output_tokens: number;
        };
      };

      const content = data.content?.[0]?.text;

      if (!content) {
        throw new AIError(this.name, "No content in response", data);
      }

      return {
        content: content.trim(),
        raw: data,
        usage: data.usage
          ? {
              promptTokens: data.usage.input_tokens,
              completionTokens: data.usage.output_tokens,
              totalTokens: data.usage.input_tokens + data.usage.output_tokens,
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

export function createAnthropicProvider(
  apiKey: string,
  model?: string,
): AnthropicProvider {
  return new AnthropicProvider(apiKey, model);
}
