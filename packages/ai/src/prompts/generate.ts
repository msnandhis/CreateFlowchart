export const SYSTEM_PROMPT = `You are an expert flowchart designer. Your task is to create clear, logical flowcharts based on user descriptions.

## Your Task
Generate a valid FlowGraph JSON that represents the process described by the user.

## FlowGraph Schema
{
  "nodes": [
    {
      "id": "unique_id",
      "type": "start" | "process" | "decision" | "action" | "end",
      "position": { "x": number, "y": number },
      "data": {
        "label": "Human readable label for this step",
        "confidence": 0.0-1.0, // How confident you are in this node's correctness
        "meta": {}, // Optional metadata
        "action": { // Only for action nodes
          "webhook_url": "https://...",
          "method": "GET" | "POST" | "PUT" | "DELETE",
          "headers": {},
          "payload_template": "{}"
        }
      }
    }
  ],
  "edges": [
    {
      "id": "edge_id",
      "source": "node_id",
      "target": "node_id",
      "label": "optional label like 'Yes' or 'No'",
      "confidence": 0.0-1.0
    }
  ],
  "meta": {
    "version": 1,
    "createdBy": "optional_user_id",
    "isSandbox": boolean
  }
}

## Node Type Guidelines
- **start**: Entry point. Exactly ONE per flowchart. Has green styling.
- **process**: A step or action. Blue rectangular node.
- **decision**: A branching point with Yes/No or similar paths. Diamond shape.
- **action**: An external API/webhook call. Orange rectangular node with icon.
- **end**: Exit point. Can have multiple. Red styling.

## Best Practices
1. Use clear, concise labels (2-5 words ideal)
2. Decision nodes should have clear branch labels (Yes/No, Pass/Fail, etc.)
3. Start with the trigger/event that initiates the flow
4. End with the final outcome or result
5. Keep flows linear where possible; use decisions for branching only
6. Assign confidence scores: 0.95+ for obvious steps, 0.7-0.9 for interpretation, <0.7 if uncertain

## Output Requirements
- Respond ONLY with valid JSON
- No markdown code blocks
- No explanations or commentary
- JSON must parse successfully
- All required fields must be present`;

export const EXAMPLE_FLOWS = [
  {
    description: "Simple user login flow",
    flow: {
      nodes: [
        {
          id: "start_1",
          type: "start",
          position: { x: 250, y: 0 },
          data: { label: "User Opens App", confidence: 0.99, meta: {} },
        },
        {
          id: "process_1",
          type: "process",
          position: { x: 250, y: 100 },
          data: { label: "Enter Credentials", confidence: 0.98, meta: {} },
        },
        {
          id: "decision_1",
          type: "decision",
          position: { x: 250, y: 200 },
          data: { label: "Credentials Valid?", confidence: 0.95, meta: {} },
        },
        {
          id: "process_2",
          type: "process",
          position: { x: 250, y: 300 },
          data: { label: "Show Dashboard", confidence: 0.97, meta: {} },
        },
        {
          id: "process_3",
          type: "process",
          position: { x: 100, y: 300 },
          data: { label: "Show Error", confidence: 0.95, meta: {} },
        },
        {
          id: "end_1",
          type: "end",
          position: { x: 250, y: 400 },
          data: { label: "Logout", confidence: 0.9, meta: {} },
        },
      ],
      edges: [
        { id: "e1", source: "start_1", target: "process_1", confidence: 0.99 },
        {
          id: "e2",
          source: "process_1",
          target: "decision_1",
          confidence: 0.98,
        },
        {
          id: "e3",
          source: "decision_1",
          target: "process_2",
          label: "Yes",
          confidence: 0.95,
        },
        {
          id: "e4",
          source: "decision_1",
          target: "process_3",
          label: "No",
          confidence: 0.95,
        },
        { id: "e5", source: "process_2", target: "end_1", confidence: 0.9 },
        {
          id: "e6",
          source: "process_3",
          target: "process_1",
          label: "Retry",
          confidence: 0.8,
        },
      ],
      meta: { version: 1, isSandbox: false },
    },
  },
];

export function buildGeneratePrompt(
  userPrompt: string,
  context?: object,
): string {
  let prompt = userPrompt;

  if (context) {
    prompt = `Based on this existing flowchart:\n${JSON.stringify(context, null, 2)}\n\nModify or extend it according to:\n${userPrompt}`;
  }

  return prompt;
}
