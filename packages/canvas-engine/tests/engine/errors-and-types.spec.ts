import { expect, test, describe, beforeEach } from "bun:test";
import { createNode } from "./helpers/mock-nodes";
import { createEdge, resetEdgeCounter } from "./helpers/mock-edges";
import { createMockCanvas } from "./helpers/mock-canvas";
import {
  InputsNotFullfilled,
  BadCanvasInstruction,
  NodeReturnNotIntendedByDesign,
} from "../../src/runtime/errors";

beforeEach(() => {
  resetEdgeCounter();
});

// ===== Error Types =====

describe("Error Handling", () => {
  test("InputsNotFullfilled with is_aggregating=false", () => {
    const error = new InputsNotFullfilled(false);
    expect(error.is_aggregating).toBe(false);
    expect(error).toBeInstanceOf(Error);
  });

  test("InputsNotFullfilled with is_aggregating=true", () => {
    const error = new InputsNotFullfilled(true);
    expect(error.is_aggregating).toBe(true);
  });

  test("BadCanvasInstruction is an Error", () => {
    const error = new BadCanvasInstruction("Test error");
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("Test error");
  });

  test("NodeReturnNotIntendedByDesign is an Error", () => {
    const error = new NodeReturnNotIntendedByDesign();
    expect(error).toBeInstanceOf(Error);
  });
});

// ===== Internal State Management =====

describe("Internal State Management - inject_return", () => {
  test("inject_return stack push and pop", () => {
    const internal_state = { inject_return: [] as any[] };

    const handler1 = () => console.log("handler1");
    const handler2 = () => console.log("handler2");

    internal_state.inject_return.push(handler1);
    internal_state.inject_return.push(handler2);

    expect(internal_state.inject_return).toHaveLength(2);

    const popped2 = internal_state.inject_return.pop();
    expect(popped2).toBe(handler2);

    const popped1 = internal_state.inject_return.pop();
    expect(popped1).toBe(handler1);

    expect(internal_state.inject_return).toHaveLength(0);
  });

  test("inject_return depth tracking", () => {
    const internal_state = { inject_return: [] as any[] };

    expect(internal_state.inject_return.length).toBe(0);

    internal_state.inject_return.push(() => {});
    expect(internal_state.inject_return.length).toBe(1);

    internal_state.inject_return.push(() => {});
    expect(internal_state.inject_return.length).toBe(2);

    internal_state.inject_return.push(() => {});
    expect(internal_state.inject_return.length).toBe(3);

    internal_state.inject_return.pop();
    internal_state.inject_return.pop();
    expect(internal_state.inject_return.length).toBe(1);
  });
});

// ===== FnThis and _invocations Tracking =====

describe("FnThis and _invocations", () => {
  test("_invocations initialized correctly", () => {
    const edge1 = createEdge("A", "B");
    const edge2 = createEdge("C", "B");

    const nodeA = createNode("A", "code", undefined, [edge1]);
    const nodeB = createNode("B", "code", undefined, []);
    const nodeC = createNode("C", "code", undefined, [edge2]);

    const canvas = createMockCanvas([nodeA, nodeB, nodeC]);
    const this_data = canvas.node_this_data.get("B")!;

    expect(this_data._invocations).toBeDefined();
    expect(this_data._invocations[edge1.id]).toBeDefined();
    expect(this_data._invocations[edge2.id]).toBeDefined();
    expect(this_data._invocations[edge1.id]).toEqual([]);
    expect(this_data._invocations[edge2.id]).toEqual([]);
  });

  test("_invocations structure has correct edge IDs", () => {
    const edge1 = createEdge("A", "B", "label1");
    const edge2 = createEdge("C", "B", "label2");

    const nodeA = createNode("A", "code", undefined, [edge1]);
    const nodeB = createNode("B", "code", undefined, []);
    const nodeC = createNode("C", "code", undefined, [edge2]);

    const canvas = createMockCanvas([nodeA, nodeB, nodeC]);
    const this_data = canvas.node_this_data.get("B")!;

    const edgeIds = Object.keys(this_data._invocations);
    expect(edgeIds).toContain(edge1.id);
    expect(edgeIds).toContain(edge2.id);
    expect(edgeIds).toHaveLength(2);
  });

  test("_invocations can store custom data in this", () => {
    const nodeA = createNode("A", "code");
    const canvas = createMockCanvas([nodeA]);

    const this_data = canvas.node_this_data.get("A")!;

    this_data.counter = 0;
    this_data.myData = { foo: "bar" };

    expect(this_data.counter).toBe(0);
    expect(this_data.myData).toEqual({ foo: "bar" });

    this_data.counter++;
    expect(this_data.counter).toBe(1);
  });
});

// ===== Ancestor Collection =====

describe("Ancestor Collection", () => {
  test("simple chain A -> B -> C", () => {
    const edge1 = createEdge("A", "B");
    const edge2 = createEdge("B", "C");

    const nodeA = createNode("A", "code", undefined, [edge1]);
    const nodeB = createNode("B", "code", undefined, [edge2]);
    const nodeC = createNode("C", "code", undefined, []);

    const canvas = createMockCanvas([nodeA, nodeB, nodeC]);

    const ancestorsC = canvas.node_ancestors.get("C")!;
    expect(ancestorsC.has("B")).toBe(true);
    expect(ancestorsC.has("A")).toBe(true);
    expect(ancestorsC.size).toBe(2);
  });

  test("diamond pattern A -> B -> D, A -> C -> D", () => {
    const edge1 = createEdge("A", "B");
    const edge2 = createEdge("B", "D");
    const edge3 = createEdge("A", "C");
    const edge4 = createEdge("C", "D");

    const nodeA = createNode("A", "code", undefined, [edge1, edge3]);
    const nodeB = createNode("B", "code", undefined, [edge2]);
    const nodeC = createNode("C", "code", undefined, [edge4]);
    const nodeD = createNode("D", "code", undefined, []);

    const canvas = createMockCanvas([nodeA, nodeB, nodeC, nodeD]);

    const ancestorsD = canvas.node_ancestors.get("D")!;
    expect(ancestorsD.has("A")).toBe(true);
    expect(ancestorsD.has("B")).toBe(true);
    expect(ancestorsD.has("C")).toBe(true);
    expect(ancestorsD.size).toBe(3);
  });

  test("node with no ancestors", () => {
    const nodeA = createNode("A", "start");
    const canvas = createMockCanvas([nodeA]);

    const ancestorsA = canvas.node_ancestors.get("A")!;
    expect(ancestorsA.size).toBe(0);
  });

  test("self-referential node doesn't cause infinite loop", () => {
    const edge1 = createEdge("A", "B");
    const edge2 = createEdge("B", "B");

    const nodeA = createNode("A", "code", undefined, [edge1]);
    const nodeB = createNode("B", "code", undefined, [edge2]);

    const canvas = createMockCanvas([nodeA, nodeB]);

    const ancestorsB = canvas.node_ancestors.get("B")!;
    expect(ancestorsB.has("A")).toBe(true);
    expect(ancestorsB.has("B")).toBe(true);
  });
});
