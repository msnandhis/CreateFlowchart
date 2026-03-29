export interface AIJobStatus {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  result?: unknown;
  error?: string;
}

export interface AIGenerateInput {
  prompt: string;
  nodeCount?: number;
}

export interface AIAnalyzeResult {
  score: number;
  issues: Array<{
    type: "error" | "warning" | "suggestion";
    message: string;
    nodeIds: string[];
  }>;
}

export interface AIImproveResult {
  changes: Array<{
    type: "add" | "remove" | "modify";
    description: string;
    before?: unknown;
    after?: unknown;
  }>;
  document: unknown;
  dsl: string;
  legacyFlowGraph?: unknown;
}

export interface AIExplainResult {
  summary: string;
  steps: Array<{
    nodeId: string;
    description: string;
  }>;
  dsl?: string;
}

export interface JobProgressEvent {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  result?: unknown;
  error?: string;
  timestamp: string;
}

interface AIWorkerEnvelope {
  success?: boolean;
  data?: unknown;
  error?: string;
}

type StatusListener = (status: AIJobStatus) => void;

class AIServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
  ) {
    super(message);
    this.name = "AIServiceError";
  }
}

class AIService {
  private statusListeners: Map<string, StatusListener[]> = new Map();
  private pollingIntervals: Map<string, ReturnType<typeof setInterval>> =
    new Map();
  private sseConnections: Map<string, EventSource> = new Map();

  private async fetchWithAuth(
    path: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    return response;
  }

  subscribeToJobSSE(jobId: string, onStatus: StatusListener): () => void {
    this.closeSSEConnection(jobId);

    const eventSource = new EventSource(`/api/ai/stream/${jobId}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as JobProgressEvent;
        const status: AIJobStatus = {
          id: data.jobId,
          status: data.status,
          progress: data.progress,
          result: unwrapWorkerResult(data.result),
          error: data.error ?? extractWorkerError(data.result),
        };
        this.setJobStatus(jobId, status);
        onStatus(status);

        if (data.status === "completed" || data.status === "failed") {
          this.closeSSEConnection(jobId);
        }
      } catch (err) {
        console.error(`[AIService] SSE parse error for job ${jobId}:`, err);
      }
    };

    eventSource.onerror = () => {
      console.error(`[AIService] SSE error for job ${jobId}`);
      this.closeSSEConnection(jobId);
      setTimeout(() => {
        this.startPolling(jobId, onStatus);
      }, 2000);
    };

    this.sseConnections.set(jobId, eventSource);

    return () => {
      this.closeSSEConnection(jobId);
    };
  }

  closeSSEConnection(jobId: string): void {
    const eventSource = this.sseConnections.get(jobId);
    if (eventSource) {
      eventSource.close();
      this.sseConnections.delete(jobId);
    }
  }

  async generate(input: AIGenerateInput): Promise<{ jobId: string }> {
    const response = await this.fetchWithAuth("/api/ai/generate", {
      method: "POST",
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new AIServiceError(
        "Failed to start generation job",
        response.status,
        "GENERATE_ERROR",
      );
    }

    const data = await response.json();
    return { jobId: data.jobId };
  }

  async analyze(document: unknown): Promise<{ jobId: string }> {
    const response = await this.fetchWithAuth("/api/ai/analyze", {
      method: "POST",
      body: JSON.stringify({ document }),
    });

    if (!response.ok) {
      throw new AIServiceError(
        "Failed to start analysis job",
        response.status,
        "ANALYZE_ERROR",
      );
    }

    const data = await response.json();
    return { jobId: data.jobId };
  }

  async improve(document: unknown, instruction: string): Promise<{ jobId: string }> {
    const response = await this.fetchWithAuth("/api/ai/improve", {
      method: "POST",
      body: JSON.stringify({ document, instruction }),
    });

    if (!response.ok) {
      throw new AIServiceError(
        "Failed to start improve job",
        response.status,
        "IMPROVE_ERROR",
      );
    }

    const data = await response.json();
    return { jobId: data.jobId };
  }

  async explain(document: unknown): Promise<{ jobId: string }> {
    const response = await this.fetchWithAuth("/api/ai/explain", {
      method: "POST",
      body: JSON.stringify({ document }),
    });

    if (!response.ok) {
      throw new AIServiceError(
        "Failed to start explain job",
        response.status,
        "EXPLAIN_ERROR",
      );
    }

    const data = await response.json();
    return { jobId: data.jobId };
  }

  getJobStatus(jobId: string): AIJobStatus | null {
    const stored = localStorage.getItem(`ai_job_${jobId}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  }

  private setJobStatus(jobId: string, status: AIJobStatus): void {
    localStorage.setItem(`ai_job_${jobId}`, JSON.stringify(status));
    const listeners = this.statusListeners.get(jobId) ?? [];
    listeners.forEach((listener) => listener(status));
  }

  subscribe(jobId: string, listener: StatusListener): () => void {
    const listeners = this.statusListeners.get(jobId) ?? [];
    this.statusListeners.set(jobId, [...listeners, listener]);

    const existing = this.getJobStatus(jobId);
    if (existing) {
      listener(existing);
    }

    return () => {
      const current = this.statusListeners.get(jobId) ?? [];
      this.statusListeners.set(
        jobId,
        current.filter((l) => l !== listener),
      );
    };
  }

  startPolling(jobId: string, onStatus: StatusListener): void {
    this.stopPolling(jobId);

    const poll = async () => {
      try {
        const response = await this.fetchWithAuth(`/api/ai/status/${jobId}`);
        if (response.ok) {
          const status: AIJobStatus = await response.json();
          const normalizedStatus: AIJobStatus = {
            ...status,
            result: unwrapWorkerResult(status.result),
            error: status.error ?? extractWorkerError(status.result),
          };
          this.setJobStatus(jobId, normalizedStatus);
          onStatus(normalizedStatus);

          if (
            normalizedStatus.status === "completed" ||
            normalizedStatus.status === "failed"
          ) {
            this.stopPolling(jobId);
          }
        }
      } catch (error) {
        console.error(`[AIService] Polling error for job ${jobId}:`, error);
      }
    };

    poll();
    const interval = setInterval(poll, 2000);
    this.pollingIntervals.set(jobId, interval);
  }

  stopPolling(jobId: string): void {
    const interval = this.pollingIntervals.get(jobId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(jobId);
    }
  }

  async waitForCompletion(
    jobId: string,
    onStatus: StatusListener,
    useSSE: boolean = true,
  ): Promise<AIJobStatus> {
    if (useSSE) {
      return new Promise((resolve) => {
        const unsubscribe = this.subscribeToJobSSE(jobId, (status) => {
          onStatus(status);
          if (status.status === "completed" || status.status === "failed") {
            unsubscribe();
            resolve(status);
          }
        });
      });
    }

    return new Promise((resolve) => {
      this.subscribe(jobId, (status) => {
        onStatus(status);
        if (status.status === "completed" || status.status === "failed") {
          resolve(status);
        }
      });
      this.startPolling(jobId, onStatus);
    });
  }

  cleanup(): void {
    this.pollingIntervals.forEach((interval) => clearInterval(interval));
    this.pollingIntervals.clear();
    this.statusListeners.clear();
    this.sseConnections.forEach((es) => es.close());
    this.sseConnections.clear();
  }
}

export const aiService = new AIService();
export { AIServiceError };

function unwrapWorkerResult(result: unknown): unknown {
  if (
    typeof result === "object" &&
    result !== null &&
    "data" in result &&
    ("success" in result || "action" in result)
  ) {
    return (result as AIWorkerEnvelope).data;
  }

  return result;
}

function extractWorkerError(result: unknown): string | undefined {
  if (
    typeof result === "object" &&
    result !== null &&
    "error" in result &&
    typeof (result as { error?: unknown }).error === "string"
  ) {
    return (result as { error: string }).error;
  }

  return undefined;
}
