import type { FlowGraph } from "@createflowchart/core";

export interface GenerateAttachment {
  type: "image";
  mimeType?: string;
  url: string;
}

export interface GenerateOptions {
  prompt: string;
  context?: FlowGraph;
  systemPrompt?: string;
  attachments?: GenerateAttachment[];
}

export interface AIProviderConfig {
  name: string;
  model: string;
  apiKey: string;
  baseUrl?: string;
}

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  readonly supportsAttachments?: boolean;

  generate(options: GenerateOptions): Promise<GenerateResponse>;
}

export interface GenerateResponse {
  content: string;
  raw: unknown;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class AIError extends Error {
  constructor(
    public provider: string,
    public message: string,
    public cause?: unknown,
    public statusCode?: number,
  ) {
    super(`[${provider}] ${message}`);
    this.name = "AIError";
  }
}

export function isAIError(err: unknown): err is AIError {
  return err instanceof AIError;
}
