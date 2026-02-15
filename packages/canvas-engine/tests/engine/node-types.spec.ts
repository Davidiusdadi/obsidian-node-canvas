import { expect, test, describe, beforeEach } from "bun:test";
import {
  createNode,
  createSimplePassthroughNode,
  createFileNode,
} from "./helpers/mock-nodes";
import { createEdge, resetEdgeCounter } from "./helpers/mock-edges";
import { NodeReturnNotIntendedByDesign } from "../../src/runtime/errors";
import { runCanvas } from "./helpers/test-utils";

beforeEach(() => {
  resetEdgeCounter();
});

describe("Node Type Specific Tests", () => {
  test("start node creates initial frame and executes", async () => {
    const nodeA = createNode("A", "start", () => "started");
    const { return_value } = await runCanvas([nodeA]);
    expect(return_value).toBe("started");
  });

  test("code node executes fn with correct CTX", async () => {
    const edge1 = createEdge("A", "B");

    let ctxSnapshot: any = null;

    const nodeA = createNode("A", "start", () => "test-input", [edge1]);
    const nodeB = createNode("B", "code", (ctx) => {
      ctxSnapshot = {
        hasInput: ctx.input !== undefined,
        inputValue: ctx.input,
        hasState: ctx.state !== undefined,
        hasThis: ctx._this !== undefined,
        hasEmit: typeof ctx.emit === "function",
        hasJoin: ctx.join !== undefined,
        hasFrame: ctx.frame !== undefined,
        hasGctx: ctx.gctx !== undefined,
      };
      return ctx.input;
    });

    await runCanvas([nodeA, nodeB]);

    expect(ctxSnapshot.hasInput).toBe(true);
    expect(ctxSnapshot.inputValue).toBe("test-input");
    expect(ctxSnapshot.hasState).toBe(true);
    expect(ctxSnapshot.hasThis).toBe(true);
    expect(ctxSnapshot.hasEmit).toBe(true);
    expect(ctxSnapshot.hasJoin).toBe(true);
    expect(ctxSnapshot.hasFrame).toBe(true);
    expect(ctxSnapshot.hasGctx).toBe(true);
  });

  test("identity node passes input through", async () => {
    const edge1 = createEdge("A", "B");

    const nodeA = createNode("A", "start", () => "passthrough-me", [edge1]);
    const nodeB = createSimplePassthroughNode("B");

    const { return_value } = await runCanvas([nodeA, nodeB]);
    expect(return_value).toBe("passthrough-me");
  });
});

describe("Canvas File Node Handling", () => {
  test("labeled edge to .canvas file node is treated as default edge", async () => {
    const labeledEdge = createEdge("A", "F", "myLabel");

    let fileNodeReceived: any = null;

    const nodeA = createNode("A", "start", () => "to-canvas", [labeledEdge]);
    const nodeF = createFileNode("F", "sub.canvas", [], (ctx) => {
      fileNodeReceived = ctx.input;
      throw new NodeReturnNotIntendedByDesign();
    });

    const { introspection_log } = await runCanvas([nodeA, nodeF]);

    expect(fileNodeReceived).toBe("to-canvas");
    const fComplete = introspection_log.find(
      (m: any) =>
        m.type === "frame-complete" && m.reason === "no-return-intended"
    );
    expect(fComplete).toBeDefined();
  });

  test("labeled edge to non-canvas file node does not receive return value", async () => {
    const labeledEdge = createEdge("A", "F", "label");

    let fileNodeReceived: any = "NOT_CALLED";

    const nodeA = createNode("A", "start", () => "value", [labeledEdge]);
    const nodeF = createFileNode("F", "data.json", [], (ctx) => {
      fileNodeReceived = ctx.input;
      return ctx.input;
    });

    await runCanvas([nodeA, nodeF]);

    expect(fileNodeReceived).toBe("NOT_CALLED");
  });
});
