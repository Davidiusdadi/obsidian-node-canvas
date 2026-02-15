import { expect, test, describe, beforeEach } from "bun:test";
import { createNode } from "./helpers/mock-nodes";
import { createEdge, resetEdgeCounter } from "./helpers/mock-edges";
import { createMockCanvas } from "./helpers/mock-canvas";
import { InputsFilterJoiner } from "../../src/runtime/joins";
import {
  InputsNotFullfilled,
  BadCanvasInstruction,
} from "../../src/runtime/errors";
import { StackFrame } from "../../src/runtime/runtime-types";
import { createMockCTX } from "./helpers/test-utils";

beforeEach(() => {
  resetEdgeCounter();
});

describe("Join Operations - InputsFilterJoiner", () => {
  test("zipOnInput throws InputsNotFullfilled when edges not ready", () => {
    const edge1 = createEdge("A", "C");
    const edge2 = createEdge("B", "C");

    const nodeA = createNode("A", "code", undefined, [edge1]);
    const nodeB = createNode("B", "code", undefined, [edge2]);
    const nodeC = createNode("C", "code", undefined, []);

    const canvas = createMockCanvas([nodeA, nodeB, nodeC]);
    const ctx = createMockCTX(canvas, "C", 5, { foo: "bar" });

    const frame1: StackFrame = {
      id: 1,
      parent: -1,
      node: nodeC,
      input: 5,
      state: { foo: "bar" },
      internal_state: { inject_return: [] },
      edge: edge1,
      is_aggregating: false,
      chart: canvas,
      ctx,
    };

    ctx._this._invocations[edge1.id] = [frame1];
    ctx._this._invocations[edge2.id] = [];
    ctx.frame = frame1;

    const joiner = InputsFilterJoiner.create(ctx, frame1);
    expect(() => joiner.zipOnInput()).toThrow(InputsNotFullfilled);
  });

  test("zipOnInput succeeds when all edges have matching inputs", () => {
    const edge1 = createEdge("A", "C");
    const edge2 = createEdge("B", "C");

    const nodeA = createNode("A", "code", undefined, [edge1]);
    const nodeB = createNode("B", "code", undefined, [edge2]);
    const nodeC = createNode("C", "code", undefined, []);

    const canvas = createMockCanvas([nodeA, nodeB, nodeC]);
    const ctx = createMockCTX(canvas, "C", 42, {});

    const frame1: StackFrame = {
      id: 1,
      parent: -1,
      node: nodeC,
      input: 42,
      state: {},
      internal_state: { inject_return: [] },
      edge: edge1,
      is_aggregating: false,
      chart: canvas,
      ctx,
    };

    const frame2: StackFrame = {
      id: 2,
      parent: -1,
      node: nodeC,
      input: 42,
      state: {},
      internal_state: { inject_return: [] },
      edge: edge2,
      is_aggregating: false,
      chart: canvas,
      ctx,
    };

    ctx._this._invocations[edge1.id] = [frame1];
    ctx._this._invocations[edge2.id] = [frame2];
    ctx.frame = frame1;

    const joiner = InputsFilterJoiner.create(ctx, frame1);
    const result = joiner.zipOnInput();

    expect(result.list).toBeDefined();
    expect(result.list()).toEqual([42, 42]);
  });

  test("zipOnInput with field parameter matches on specific field", () => {
    const edge1 = createEdge("A", "C");
    const edge2 = createEdge("B", "C");

    const nodeA = createNode("A", "code", undefined, [edge1]);
    const nodeB = createNode("B", "code", undefined, [edge2]);
    const nodeC = createNode("C", "code", undefined, []);

    const canvas = createMockCanvas([nodeA, nodeB, nodeC]);
    const ctx = createMockCTX(canvas, "C", { id: "match", value: 1 }, {});

    const frame1: StackFrame = {
      id: 1,
      parent: -1,
      node: nodeC,
      input: { id: "match", value: 1 },
      state: {},
      internal_state: { inject_return: [] },
      edge: edge1,
      is_aggregating: false,
      chart: canvas,
      ctx,
    };

    const frame2: StackFrame = {
      id: 2,
      parent: -1,
      node: nodeC,
      input: { id: "match", value: 2 },
      state: {},
      internal_state: { inject_return: [] },
      edge: edge2,
      is_aggregating: false,
      chart: canvas,
      ctx,
    };

    ctx._this._invocations[edge1.id] = [frame1];
    ctx._this._invocations[edge2.id] = [frame2];
    ctx.frame = frame1;

    const joiner = InputsFilterJoiner.create(ctx, frame1);
    const result = joiner.zipOnInput("id");

    expect(result.list()).toHaveLength(2);
    expect(result.list()[0]).toEqual({ id: "match", value: 1 });
    expect(result.list()[1]).toEqual({ id: "match", value: 2 });
  });

  test("aggregate throws InputsNotFullfilled on first invocation", () => {
    const edge1 = createEdge("A", "C");
    const nodeA = createNode("A", "code", undefined, [edge1]);
    const nodeC = createNode("C", "code", undefined, []);

    const canvas = createMockCanvas([nodeA, nodeC]);
    const ctx = createMockCTX(canvas, "C", 1, {});

    const frame: StackFrame = {
      id: 1,
      parent: -1,
      node: nodeC,
      input: 1,
      state: {},
      internal_state: { inject_return: [] },
      edge: edge1,
      is_aggregating: false,
      chart: canvas,
      ctx,
    };

    ctx._this._invocations[edge1.id] = [frame];
    ctx.frame = frame;

    const joiner = InputsFilterJoiner.create(ctx, frame);

    try {
      joiner.aggregate();
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(InputsNotFullfilled);
      expect((e as InputsNotFullfilled).is_aggregating).toBe(true);
    }
  });

  test("aggregate collects all inputs when aggregating", () => {
    const edge1 = createEdge("A", "C");
    const edge2 = createEdge("B", "C");

    const nodeA = createNode("A", "code", undefined, [edge1]);
    const nodeB = createNode("B", "code", undefined, [edge2]);
    const nodeC = createNode("C", "code", undefined, []);

    const canvas = createMockCanvas([nodeA, nodeB, nodeC]);
    const ctx = createMockCTX(canvas, "C", undefined, {});

    const frame1: StackFrame = {
      id: 1,
      parent: -1,
      node: nodeC,
      input: 10,
      state: { a: 1 },
      internal_state: { inject_return: [] },
      edge: edge1,
      is_aggregating: true,
      chart: canvas,
      ctx,
    };

    const frame2: StackFrame = {
      id: 2,
      parent: -1,
      node: nodeC,
      input: 20,
      state: { b: 2 },
      internal_state: { inject_return: [] },
      edge: edge1,
      is_aggregating: true,
      chart: canvas,
      ctx,
    };

    const frame3: StackFrame = {
      id: 3,
      parent: -1,
      node: nodeC,
      input: 30,
      state: { c: 3 },
      internal_state: { inject_return: [] },
      edge: edge2,
      is_aggregating: true,
      chart: canvas,
      ctx,
    };

    ctx._this._invocations[edge1.id] = [frame1, frame2];
    ctx._this._invocations[edge2.id] = [frame3];
    ctx.frame = frame1;

    const joiner = InputsFilterJoiner.create(ctx, frame1);
    const result = joiner.aggregate();

    expect(ctx.input).toEqual([10, 20, 30]);
    expect(ctx.state).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);
    expect(ctx._this._invocations[edge1.id]).toHaveLength(0);
    expect(ctx._this._invocations[edge2.id]).toHaveLength(0);
  });

  test("join guard prevents multiple operations", () => {
    const edge1 = createEdge("A", "C");
    const edge2 = createEdge("B", "C");

    const nodeA = createNode("A", "code", undefined, [edge1]);
    const nodeB = createNode("B", "code", undefined, [edge2]);
    const nodeC = createNode("C", "code", undefined, []);

    const canvas = createMockCanvas([nodeA, nodeB, nodeC]);
    const ctx = createMockCTX(canvas, "C", 42, {});

    const frame1: StackFrame = {
      id: 1,
      parent: -1,
      node: nodeC,
      input: 42,
      state: {},
      internal_state: { inject_return: [] },
      edge: edge1,
      is_aggregating: false,
      chart: canvas,
      ctx,
    };

    const frame2: StackFrame = {
      id: 2,
      parent: -1,
      node: nodeC,
      input: 42,
      state: {},
      internal_state: { inject_return: [] },
      edge: edge2,
      is_aggregating: false,
      chart: canvas,
      ctx,
    };

    ctx._this._invocations[edge1.id] = [frame1];
    ctx._this._invocations[edge2.id] = [frame2];
    ctx.frame = frame1;

    const joiner = InputsFilterJoiner.create(ctx, frame1);
    joiner.zipOnInput();

    expect(() => {
      joiner.aggregate();
    }).toThrow(BadCanvasInstruction);
  });

  test("zipOnState works similar to zipOnInput", () => {
    const edge1 = createEdge("A", "C");
    const edge2 = createEdge("B", "C");

    const nodeA = createNode("A", "code", undefined, [edge1]);
    const nodeB = createNode("B", "code", undefined, [edge2]);
    const nodeC = createNode("C", "code", undefined, []);

    const canvas = createMockCanvas([nodeA, nodeB, nodeC]);
    const ctx = createMockCTX(canvas, "C", "input_value", {
      id: "state_match",
    });

    const frame1: StackFrame = {
      id: 1,
      parent: -1,
      node: nodeC,
      input: "input_value",
      state: { id: "state_match" },
      internal_state: { inject_return: [] },
      edge: edge1,
      is_aggregating: false,
      chart: canvas,
      ctx,
    };

    const frame2: StackFrame = {
      id: 2,
      parent: -1,
      node: nodeC,
      input: "different_input",
      state: { id: "state_match" },
      internal_state: { inject_return: [] },
      edge: edge2,
      is_aggregating: false,
      chart: canvas,
      ctx,
    };

    ctx._this._invocations[edge1.id] = [frame1];
    ctx._this._invocations[edge2.id] = [frame2];
    ctx.frame = frame1;

    const joiner = InputsFilterJoiner.create(ctx, frame1);
    const result = joiner.zipOnState("id");

    expect(result.list()).toHaveLength(2);
  });
});
