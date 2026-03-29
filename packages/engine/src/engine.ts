import type { DiagramDocument } from "@createflowchart/schema";
import { createEngineState, redo, undo, withCommittedChange } from "./history";
import { basicDocumentValidator } from "./validators";
import type {
  EngineResult,
  EngineSelection,
  EngineState,
  EngineValidator,
} from "./types";

export interface CreateEngineOptions {
  document: DiagramDocument;
  validators?: EngineValidator[];
  maxHistoryEntries?: number;
}

export interface DiagramEngine {
  getState(): EngineState;
  getIssues(): ReturnType<EngineValidator>;
  replaceDocument(document: DiagramDocument): EngineResult;
  updateSelection(selection: EngineSelection): EngineResult;
  undo(): EngineResult;
  redo(): EngineResult;
}

export function createEngine(options: CreateEngineOptions): DiagramEngine {
  const validators = options.validators ?? [basicDocumentValidator];
  let state = createEngineState(
    options.document,
    options.maxHistoryEntries ?? 100,
  );
  let issues = runValidation(state.document, validators);

  function makeResult(nextState: EngineState, changed: boolean): EngineResult {
    state = nextState;
    issues = runValidation(nextState.document, validators);

    return {
      state,
      issues,
      changed,
    };
  }

  return {
    getState() {
      return state;
    },
    getIssues() {
      return issues;
    },
    replaceDocument(document: DiagramDocument) {
      return makeResult(withCommittedChange(state, document), true);
    },
    updateSelection(selection: EngineSelection) {
      const changed =
        JSON.stringify(selection) !== JSON.stringify(state.selection);

      return makeResult({ ...state, selection }, changed);
    },
    undo() {
      const next = undo(state);
      return makeResult(next, next !== state);
    },
    redo() {
      const next = redo(state);
      return makeResult(next, next !== state);
    },
  };
}

function runValidation(
  document: DiagramDocument,
  validators: EngineValidator[],
) {
  return validators.flatMap((validator) => validator(document));
}
