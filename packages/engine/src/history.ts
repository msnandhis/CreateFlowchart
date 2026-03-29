import type { EngineHistory, EngineSelection, EngineSnapshot, EngineState } from "./types";
import type { DiagramDocument } from "@createflowchart/schema";

export function createEmptySelection(): EngineSelection {
  return {
    nodeIds: [],
    edgeIds: [],
    containerIds: [],
    annotationIds: [],
  };
}

export function createEngineHistory(limit = 100): EngineHistory {
  return {
    past: [],
    future: [],
    limit,
  };
}

export function createEngineState(document: DiagramDocument, limit = 100): EngineState {
  return {
    document,
    selection: createEmptySelection(),
    history: createEngineHistory(limit),
  };
}

export function createSnapshot(
  document: DiagramDocument,
  selection: EngineSelection,
): EngineSnapshot {
  return {
    document,
    selection,
  };
}

export function pushHistory(state: EngineState): EngineHistory {
  const snapshot = createSnapshot(state.document, state.selection);
  const nextPast = [...state.history.past, snapshot];
  return {
    limit: state.history.limit,
    past: nextPast.slice(-state.history.limit),
    future: [],
  };
}

export function withCommittedChange(
  state: EngineState,
  nextDocument: DiagramDocument,
  nextSelection: EngineSelection = state.selection,
): EngineState {
  return {
    document: nextDocument,
    selection: nextSelection,
    history: pushHistory(state),
  };
}

export function undo(state: EngineState): EngineState {
  if (state.history.past.length === 0) return state;

  const previous = state.history.past[state.history.past.length - 1];
  const current = createSnapshot(state.document, state.selection);

  return {
    document: previous.document,
    selection: previous.selection,
    history: {
      limit: state.history.limit,
      past: state.history.past.slice(0, -1),
      future: [current, ...state.history.future],
    },
  };
}

export function redo(state: EngineState): EngineState {
  if (state.history.future.length === 0) return state;

  const next = state.history.future[0];
  const current = createSnapshot(state.document, state.selection);

  return {
    document: next.document,
    selection: next.selection,
    history: {
      limit: state.history.limit,
      past: [...state.history.past, current].slice(-state.history.limit),
      future: state.history.future.slice(1),
    },
  };
}
