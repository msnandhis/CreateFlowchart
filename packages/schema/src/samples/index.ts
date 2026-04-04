import { createDiagramModel, createNode, createEdge } from "../model";

export const sample1 = createDiagramModel({
  meta: { family: "flowchart", title: "User Auth", kit: "core-flowchart", layoutAlgorithm: "layered-digraph", layoutDirection: "TB" },
  nodes: [
    createNode({ id: "n1", shape: "terminator-start", label: "Start", position: {x:0, y:0}, size: {width:100, height:40} }),
    createNode({ id: "n2", shape: "process", label: "Login", position: {x:0, y:100}, size: {width:100, height:40} }),
    createNode({ id: "n3", shape: "decision", label: "Valid?", position: {x:0, y:200}, size: {width:100, height:60} }),
    createNode({ id: "n4", shape: "terminator-end", label: "Success", position: {x:-80, y:300}, size: {width:100, height:40} }),
    createNode({ id: "n5", shape: "terminator-end", label: "Error", position: {x:80, y:300}, size: {width:100, height:40} }),
  ],
  edges: [
    createEdge({ id: "e1", source: "n1", target: "n2" }),
    createEdge({ id: "e2", source: "n2", target: "n3" }),
    createEdge({ id: "e3", source: "n3", target: "n4", label: "Yes" }),
    createEdge({ id: "e4", source: "n3", target: "n5", label: "No" }),
  ]
});
