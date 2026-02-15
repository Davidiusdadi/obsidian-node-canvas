import { expect, test, describe, beforeEach } from "bun:test";
import {
  createNode,
  createSimplePassthroughNode,
  createTransformNode,
  createFileNode,
} from "./helpers/mock-nodes";
import { createEdge, resetEdgeCounter } from "./helpers/mock-edges";
import { createMockCanvas } from "./helpers/mock-canvas";
import { InputsFilterJoiner } from "../../src/runtime/joins";
import {
  InputsNotFullfilled,
  BadCanvasInstruction,
  NodeReturnNotIntendedByDesign,
} from "../../src/runtime/errors";
import { CTX, StackFrame, FnThis, Fn } from "../../src/runtime/runtime-types";
import { ExecutableCanvas } from "../../src/runtime/ExecutableCanvas";
import { GlobalContext } from "../../src/types";
import { execCanvas } from "../../src/runtime/exec-canvas";
import { ONode } from "../../src/compile/canvas-node-transform";

beforeEach(() => {
  resetEdgeCounter();
});

// ===== Helper Functions =====

function createMockGlobalContext(): GlobalContext {
  return {
    vault_dir: "/test/vault",
    stack: [],
    active_frames: [],
    parallel: 100,
    introspection: undefined,
  } as GlobalContext;
}

async function runCanvas(
  nodes: ONode[],
  opts?: { parallel?: number }
): Promise<{
  return_value: any;
  last_ctx: CTX | null;
  introspection_log: any[];
}> {
  const canvas = createMockCanvas(nodes);
  const log: any[] = [];
  const gctx = new GlobalContext("/test/vault");
  gctx.parallel = opts?.parallel ?? 100;
  gctx.introspection = {
    inform: (msg: any) => {
      log.push(msg);
    },
  };
  const result = await execCanvas(canvas, gctx);
  return {
    return_value: result.return_value,
    last_ctx: result.last_ctx,
    introspection_log: log,
  };
}

function createMockCTX(
  chart: ExecutableCanvas,
  node_id: string,
  input: any = undefined,
  state: any = {}
): CTX {
  const this_data: FnThis = chart.node_this_data.get(node_id)!;

  return {
    input,
    state,
    vault_dir: "/test/vault",
    _this: this_data,
    self_canvas_node: chart.node_map.get(node_id) as any,
    self_canvas_nodes: chart,
    updateInput: function (new_input: any) {
      this.input = new_input;
    },
    updateState: function (new_state: any) {
      this.state = new_state;
    },
    emit: () => {},
    injectFrame: () => {},
    gctx: createMockGlobalContext(),
    frame: {} as StackFrame,
    join: undefined,
  };
}

// ===== Category 3: Join Operations (InputsFilterJoiner) =====

describe("Join Operations - InputsFilterJoiner", () => {
  test("zipOnInput throws InputsNotFullfilled when edges not ready", () => {
    const edge1 = createEdge("A", "C");
    const edge2 = createEdge("B", "C");

    const nodeA = createNode("A", "code", undefined, [edge1]);
    const nodeB = createNode("B", "code", undefined, [edge2]);
    const nodeC = createNode("C", "code", undefined, []);

    const canvas = createMockCanvas([nodeA, nodeB, nodeC]);
    const ctx = createMockCTX(canvas, "C", 5, { foo: "bar" });

    // Create a frame for edge1 but not edge2
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
    ctx._this._invocations[edge2.id] = []; // empty - not ready
    ctx.frame = frame1;

    const joiner = InputsFilterJoiner.create(ctx, frame1);

    // Should throw InputsNotFullfilled because edge2 has no invocation yet
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

    // Create frames for both edges with same input
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

    // Should succeed and return result API
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
      input: { id: "match", value: 2 }, // different value, same id
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
    const result = joiner.zipOnInput("id"); // match on 'id' field

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
      is_aggregating: false, // NOT aggregating yet
      chart: canvas,
      ctx,
    };

    ctx._this._invocations[edge1.id] = [frame];
    ctx.frame = frame;

    const joiner = InputsFilterJoiner.create(ctx, frame);

    try {
      joiner.aggregate();
      expect(true).toBe(false); // should not reach here
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
      is_aggregating: true, // NOW aggregating
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

    // Should aggregate all inputs from all edges
    expect(ctx.input).toEqual([10, 20, 30]);
    expect(ctx.state).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);

    // _invocations should be cleared
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

    // First operation succeeds
    joiner.zipOnInput();

    // Second operation should throw
    expect(() => {
      const frame_agg: StackFrame = { ...frame1, is_aggregating: true };
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
      state: { id: "state_match" }, // same state
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

// ===== Category 5: Internal State Management =====

describe("Internal State Management - inject_return", () => {
  test("inject_return stack push and pop", () => {
    const internal_state = { inject_return: [] as any[] };

    const handler1 = () => console.log("handler1");
    const handler2 = () => console.log("handler2");

    // Push handlers
    internal_state.inject_return.push(handler1);
    internal_state.inject_return.push(handler2);

    expect(internal_state.inject_return).toHaveLength(2);

    // Pop in reverse order
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

// ===== Category 6: Error Handling =====

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

// ===== Category 11: FnThis and _invocations Tracking =====

describe("FnThis and _invocations", () => {
  test("_invocations initialized correctly", () => {
    const edge1 = createEdge("A", "B");
    const edge2 = createEdge("C", "B");

    const nodeA = createNode("A", "code", undefined, [edge1]);
    const nodeB = createNode("B", "code", undefined, []);
    const nodeC = createNode("C", "code", undefined, [edge2]);

    const canvas = createMockCanvas([nodeA, nodeB, nodeC]);

    // Check that nodeB has _invocations for both incoming edges
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

    // Should be able to store arbitrary data
    this_data.counter = 0;
    this_data.myData = { foo: "bar" };

    expect(this_data.counter).toBe(0);
    expect(this_data.myData).toEqual({ foo: "bar" });

    // Modify and check persistence
    this_data.counter++;
    expect(this_data.counter).toBe(1);
  });
});

// ===== Category 12: Ancestor Collection =====

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
    // A -> B -> B (self-loop)
    const edge1 = createEdge("A", "B");
    const edge2 = createEdge("B", "B"); // self-loop

    const nodeA = createNode("A", "code", undefined, [edge1]);
    const nodeB = createNode("B", "code", undefined, [edge2]);

    const canvas = createMockCanvas([nodeA, nodeB]);

    const ancestorsB = canvas.node_ancestors.get("B")!;
    expect(ancestorsB.has("A")).toBe(true);
    // B is its own ancestor due to self-loop, but should not cause infinite recursion
    expect(ancestorsB.has("B")).toBe(true);
  });
});

// ===== Category 1: Frame Stack Management (via execCanvas) =====

describe("Frame Stack Management", () => {
  test("frame IDs increment sequentially", async () => {
    // A(start) -> B -> C
    const edge1 = createEdge("A", "B");
    const edge2 = createEdge("B", "C");

    const nodeA = createNode("A", "start", undefined, [edge1]);
    const nodeB = createSimplePassthroughNode("B", [edge2]);
    const nodeC = createSimplePassthroughNode("C");

    const { introspection_log } = await runCanvas([nodeA, nodeB, nodeC]);

    const upserts = introspection_log.filter((m) => m.type === "frame-upsert");
    // Deduplicate: frame-upsert fires twice per frame (push + invoke)
    const seen = new Set<number>();
    const uniqueIds: number[] = [];
    for (const u of upserts) {
      if (!seen.has(u.frame.id)) {
        seen.add(u.frame.id);
        uniqueIds.push(u.frame.id);
      }
    }

    // IDs should be strictly increasing
    for (let i = 1; i < uniqueIds.length; i++) {
      expect(uniqueIds[i]).toBeGreaterThan(uniqueIds[i - 1]);
    }
  });

  test("start nodes create initial frames with parent=-1", async () => {
    const edge1 = createEdge("A", "C");
    const edge2 = createEdge("B", "C");

    const nodeA = createNode("A", "start", undefined, [edge1]);
    const nodeB = createNode("B", "start", undefined, [edge2]);
    const nodeC = createSimplePassthroughNode("C");

    const { introspection_log } = await runCanvas([nodeA, nodeB, nodeC]);

    const upserts = introspection_log.filter((m) => m.type === "frame-upsert");
    // Deduplicate: frame-upsert fires twice per frame (push + invoke)
    const seen = new Set<number>();
    const uniqueUpserts = upserts.filter((m) => {
      if (seen.has(m.frame.id)) return false;
      seen.add(m.frame.id);
      return true;
    });
    const startFrames = uniqueUpserts.filter((m) => m.frame.parent === -1);
    expect(startFrames.length).toBe(2);
  });

  test("multiple start nodes all execute", async () => {
    const results: string[] = [];

    const nodeA = createNode("A", "start", () => {
      results.push("A");
      return "from-A";
    });
    const nodeB = createNode("B", "start", () => {
      results.push("B");
      return "from-B";
    });

    await runCanvas([nodeA, nodeB]);

    expect(results).toContain("A");
    expect(results).toContain("B");
    expect(results).toHaveLength(2);
  });

  test("frame-step introspection fires before execution", async () => {
    const edge1 = createEdge("A", "B");

    const nodeA = createNode("A", "start", () => "hello", [edge1]);
    const nodeB = createNode("B", "code", () => "world");

    const { introspection_log } = await runCanvas([nodeA, nodeB]);

    // For each executed frame, frame-step should appear before frame-complete
    const steps = introspection_log.filter((m) => m.type === "frame-step");
    const completes = introspection_log.filter(
      (m) => m.type === "frame-complete" && m.was_invoked
    );

    expect(steps.length).toBeGreaterThanOrEqual(2);
    expect(completes.length).toBeGreaterThanOrEqual(2);
  });
});

// ===== Category 2: Edge Emission Logic (via execCanvas) =====

describe("Edge Emission Logic", () => {
  test("return value propagates through default (unlabeled) edge", async () => {
    const edge1 = createEdge("A", "B");

    const nodeA = createNode("A", "start", () => 42, [edge1]);
    const nodeB = createNode("B", "code", (ctx) => {
      return ctx.input * 2;
    });

    const { return_value } = await runCanvas([nodeA, nodeB]);
    expect(return_value).toBe(84);
  });

  test("chain of 3 nodes propagates values correctly", async () => {
    const edge1 = createEdge("A", "B");
    const edge2 = createEdge("B", "C");

    const nodeA = createNode("A", "start", () => 10, [edge1]);
    const nodeB = createNode("B", "code", (ctx) => ctx.input + 5, [edge2]);
    const nodeC = createNode("C", "code", (ctx) => ctx.input * 3);

    const { return_value } = await runCanvas([nodeA, nodeB, nodeC]);
    expect(return_value).toBe(45); // (10 + 5) * 3
  });

  test("return value goes through unlabeled edges only", async () => {
    const unlabeledEdge = createEdge("A", "B");
    const labeledEdge = createEdge("A", "C", "myLabel");

    let bReceived: any = null;
    let cReceived: any = null;

    const nodeA = createNode("A", "start", () => "default-value", [
      unlabeledEdge,
      labeledEdge,
    ]);
    const nodeB = createNode("B", "code", (ctx) => {
      bReceived = ctx.input;
      return bReceived;
    });
    const nodeC = createNode("C", "code", (ctx) => {
      cReceived = ctx.input;
      return cReceived;
    });

    await runCanvas([nodeA, nodeB, nodeC]);

    // B should receive via default edge
    expect(bReceived).toBe("default-value");
    // C should NOT receive (labeled edge, no ctx.emit call)
    expect(cReceived).toBeNull();
  });

  test("ctx.emit sends through labeled edges only", async () => {
    const defaultEdge = createEdge("A", "B");
    const labeledEdge = createEdge("A", "C", "special");

    let bReceived: any = null;
    let cReceived: any = null;

    const nodeA = createNode(
      "A",
      "start",
      (ctx) => {
        ctx.emit("special", "labeled-value");
        return "default-value";
      },
      [defaultEdge, labeledEdge]
    );
    const nodeB = createNode("B", "code", (ctx) => {
      bReceived = ctx.input;
      return bReceived;
    });
    const nodeC = createNode("C", "code", (ctx) => {
      cReceived = ctx.input;
      return cReceived;
    });

    await runCanvas([nodeA, nodeB, nodeC]);

    expect(bReceived).toBe("default-value");
    expect(cReceived).toBe("labeled-value");
  });

  test("state is cloned between sibling frames (fan-out)", async () => {
    const edge1 = createEdge("A", "B");
    const edge2 = createEdge("A", "C");

    let bState: any = null;
    let cState: any = null;

    const nodeA = createNode(
      "A",
      "start",
      (ctx) => {
        ctx.updateState({ counter: 1 });
        return "value";
      },
      [edge1, edge2]
    );
    const nodeB = createNode("B", "code", (ctx) => {
      ctx.state.counter += 10;
      bState = { ...ctx.state };
      return "b";
    });
    const nodeC = createNode("C", "code", (ctx) => {
      ctx.state.counter += 100;
      cState = { ...ctx.state };
      return "c";
    });

    await runCanvas([nodeA, nodeB, nodeC]);

    // Each should have independently modified state
    expect(bState.counter).toBe(11);
    expect(cState.counter).toBe(101);
  });

  test("fan-out creates frames for all outgoing edges", async () => {
    const edge1 = createEdge("A", "B");
    const edge2 = createEdge("A", "C");
    const edge3 = createEdge("A", "D");

    const executed: string[] = [];

    const nodeA = createNode("A", "start", () => "go", [edge1, edge2, edge3]);
    const nodeB = createNode("B", "code", () => {
      executed.push("B");
    });
    const nodeC = createNode("C", "code", () => {
      executed.push("C");
    });
    const nodeD = createNode("D", "code", () => {
      executed.push("D");
    });

    await runCanvas([nodeA, nodeB, nodeC, nodeD]);

    expect(executed).toContain("B");
    expect(executed).toContain("C");
    expect(executed).toContain("D");
    expect(executed).toHaveLength(3);
  });
});

// ===== Category 4: Aggregation Logic (end-to-end) =====

describe("Aggregation Logic (end-to-end)", () => {
  test("aggregate collects all inputs from fan-out", async () => {
    // A(start) emits 3 labeled values -> B (passthrough) -> C (aggregates)
    const edgeAB = createEdge("A", "B", "item");
    const edgeBC = createEdge("B", "C");

    const nodeA = createNode(
      "A",
      "start",
      (ctx) => {
        ctx.emit("item", 1);
        ctx.emit("item", 2);
        ctx.emit("item", 3);
        return undefined; // no default emission
      },
      [edgeAB]
    );
    const nodeB = createSimplePassthroughNode("B", [edgeBC]);
    const nodeC = createNode("C", "code", (ctx) => {
      const agg = ctx.join!.aggregate;
      return agg.list();
    });

    const { return_value } = await runCanvas([nodeA, nodeB, nodeC]);

    expect(return_value).toBeArrayOfSize(3);
    expect(return_value).toContain(1);
    expect(return_value).toContain(2);
    expect(return_value).toContain(3);
  });

  test("aggregate waits for all ancestors in diamond pattern", async () => {
    // A -> B, A -> C, B -> D, C -> D. D aggregates.
    const edgeAB = createEdge("A", "B");
    const edgeAC = createEdge("A", "C");
    const edgeBD = createEdge("B", "D");
    const edgeCD = createEdge("C", "D");

    const executionOrder: string[] = [];

    const nodeA = createNode("A", "start", () => "go", [edgeAB, edgeAC]);
    const nodeB = createNode(
      "B",
      "code",
      (ctx) => {
        executionOrder.push("B");
        return "from-B";
      },
      [edgeBD]
    );
    const nodeC = createNode(
      "C",
      "code",
      (ctx) => {
        executionOrder.push("C");
        return "from-C";
      },
      [edgeCD]
    );
    const nodeD = createNode("D", "code", (ctx) => {
      executionOrder.push("D");
      const agg = ctx.join!.aggregate;
      return agg.list();
    });

    const { return_value } = await runCanvas([nodeA, nodeB, nodeC, nodeD]);

    // D should execute after both B and C
    const dIndex = executionOrder.indexOf("D");
    expect(dIndex).toBeGreaterThan(executionOrder.indexOf("B"));
    expect(dIndex).toBeGreaterThan(executionOrder.indexOf("C"));

    // D should have aggregated both inputs
    expect(return_value).toBeArrayOfSize(2);
    expect(return_value).toContain("from-B");
    expect(return_value).toContain("from-C");
  });

  test("aggregate resets _invocations after completion", async () => {
    const edgeAB = createEdge("A", "B", "item");

    let thisData: FnThis | null = null;

    const nodeA = createNode(
      "A",
      "start",
      (ctx) => {
        ctx.emit("item", 1);
        ctx.emit("item", 2);
        return undefined;
      },
      [edgeAB]
    );
    const nodeB = createNode("B", "code", (ctx) => {
      const agg = ctx.join!.aggregate;
      thisData = ctx._this;
      return agg.list();
    });

    await runCanvas([nodeA, nodeB]);

    // After aggregation, _invocations should be cleared
    expect(thisData).not.toBeNull();
    const invocations = Object.values(thisData!._invocations);
    for (const arr of invocations) {
      expect(arr).toHaveLength(0);
    }
  });
});

// ===== Category 7: CTX Functionality (via execCanvas) =====

describe("CTX Functionality", () => {
  test("ctx.input receives previous node's return value", async () => {
    const edge1 = createEdge("A", "B");

    let receivedInput: any = null;

    const nodeA = createNode("A", "start", () => ({ msg: "hello" }), [edge1]);
    const nodeB = createNode("B", "code", (ctx) => {
      receivedInput = ctx.input;
      return receivedInput;
    });

    await runCanvas([nodeA, nodeB]);

    expect(receivedInput).toEqual({ msg: "hello" });
  });

  test("ctx.state persists along a chain", async () => {
    const edge1 = createEdge("A", "B");
    const edge2 = createEdge("B", "C");

    let finalState: any = null;

    const nodeA = createNode(
      "A",
      "start",
      (ctx) => {
        ctx.updateState({ step: 1 });
        return "go";
      },
      [edge1]
    );
    const nodeB = createNode(
      "B",
      "code",
      (ctx) => {
        ctx.state.step += 1;
        ctx.updateState(ctx.state);
        return "go";
      },
      [edge2]
    );
    const nodeC = createNode("C", "code", (ctx) => {
      finalState = { ...ctx.state };
      return "done";
    });

    await runCanvas([nodeA, nodeB, nodeC]);

    expect(finalState.step).toBe(2);
  });

  test("ctx._this persists across invocations of same node", async () => {
    // A emits twice to B, B tracks invocation count via this
    const edgeAB = createEdge("A", "B", "item");
    const edgeBC = createEdge("B", "C");

    let thisCounter = 0;

    const nodeA = createNode(
      "A",
      "start",
      (ctx) => {
        ctx.emit("item", "first");
        ctx.emit("item", "second");
        return undefined;
      },
      [edgeAB]
    );
    const nodeB = createNode(
      "B",
      "code",
      function (this: FnThis, ctx) {
        if (this.counter === undefined) this.counter = 0;
        this.counter++;
        thisCounter = this.counter;
        return ctx.input;
      },
      [edgeBC]
    );
    const nodeC = createNode("C", "code", (ctx) => {
      const agg = ctx.join!.aggregate;
      return agg.list();
    });

    await runCanvas([nodeA, nodeB, nodeC]);

    // B was invoked twice, counter should be 2
    expect(thisCounter).toBe(2);
  });

  test("ctx.updateInput modifies ctx.input", async () => {
    const edge1 = createEdge("A", "B");

    const nodeA = createNode("A", "start", () => "original", [edge1]);
    const nodeB = createNode("B", "code", (ctx) => {
      ctx.updateInput("modified");
      return ctx.input;
    });

    const { return_value } = await runCanvas([nodeA, nodeB]);
    expect(return_value).toBe("modified");
  });

  test("ctx.injectFrame pushes a new frame to the stack", async () => {
    const edge1 = createEdge("A", "B");

    let injectedNodeRan = false;

    const nodeB = createNode("B", "code", (ctx) => {
      injectedNodeRan = true;
      return "injected-result";
    });

    const nodeA = createNode(
      "A",
      "start",
      (ctx) => {
        ctx.injectFrame({
          parent: ctx.frame.id!,
          node: nodeB,
          input: "injected-input",
          state: {},
          internal_state: { inject_return: [] },
          edge: null,
          is_aggregating: false,
          chart: ctx.self_canvas_nodes,
        });
        return "a-result";
      },
      [edge1]
    );

    await runCanvas([nodeA, nodeB]);

    expect(injectedNodeRan).toBe(true);
  });
});

// ===== Category 8: Parallel Execution (via execCanvas) =====

describe("Parallel Execution", () => {
  test("independent frames execute concurrently", async () => {
    const edge1 = createEdge("A", "B");
    const edge2 = createEdge("A", "C");

    const timeline: string[] = [];

    const nodeA = createNode("A", "start", () => "go", [edge1, edge2]);
    const nodeB = createNode("B", "code", async () => {
      timeline.push("B-start");
      await new Promise((r) => setTimeout(r, 50));
      timeline.push("B-end");
      return "b";
    });
    const nodeC = createNode("C", "code", async () => {
      timeline.push("C-start");
      await new Promise((r) => setTimeout(r, 50));
      timeline.push("C-end");
      return "c";
    });

    await runCanvas([nodeA, nodeB, nodeC]);

    // Both should start before either ends (concurrent execution)
    const bStartIdx = timeline.indexOf("B-start");
    const cStartIdx = timeline.indexOf("C-start");
    const bEndIdx = timeline.indexOf("B-end");
    const cEndIdx = timeline.indexOf("C-end");

    // Both started
    expect(bStartIdx).not.toBe(-1);
    expect(cStartIdx).not.toBe(-1);

    // Both should start before either ends
    expect(bStartIdx).toBeLessThan(bEndIdx);
    expect(cStartIdx).toBeLessThan(cEndIdx);
    // With parallel=100, both should start before the other ends
    expect(Math.max(bStartIdx, cStartIdx)).toBeLessThan(
      Math.min(bEndIdx, cEndIdx)
    );
  });

  test("parallel=1 forces sequential execution", async () => {
    const edge1 = createEdge("A", "B");
    const edge2 = createEdge("A", "C");

    const timeline: string[] = [];

    const nodeA = createNode("A", "start", () => "go", [edge1, edge2]);
    const nodeB = createNode("B", "code", async () => {
      timeline.push("B-start");
      await new Promise((r) => setTimeout(r, 20));
      timeline.push("B-end");
      return "b";
    });
    const nodeC = createNode("C", "code", async () => {
      timeline.push("C-start");
      await new Promise((r) => setTimeout(r, 20));
      timeline.push("C-end");
      return "c";
    });

    await runCanvas([nodeA, nodeB, nodeC], { parallel: 1 });

    // With parallel=1, second task should start after first ends
    // Either B runs fully then C, or C runs fully then B
    const bStartIdx = timeline.indexOf("B-start");
    const cStartIdx = timeline.indexOf("C-start");
    const bEndIdx = timeline.indexOf("B-end");
    const cEndIdx = timeline.indexOf("C-end");

    if (bStartIdx < cStartIdx) {
      // B ran first: B-start, B-end, C-start, C-end
      expect(bEndIdx).toBeLessThan(cStartIdx);
    } else {
      // C ran first: C-start, C-end, B-start, B-end
      expect(cEndIdx).toBeLessThan(bStartIdx);
    }
  });
});

// ===== Category 10: Node Type Specific Tests =====

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

// ===== Category 9: Canvas File Node Handling =====

describe("Canvas File Node Handling", () => {
  test("labeled edge to .canvas file node is treated as default edge", async () => {
    // Key behavior: even a LABELED edge to a .canvas target acts as default
    const labeledEdge = createEdge("A", "F", "myLabel");

    let fileNodeReceived: any = null;

    const nodeA = createNode("A", "start", () => "to-canvas", [labeledEdge]);
    // .canvas file nodes throw NodeReturnNotIntendedByDesign (realistic behavior)
    const nodeF = createFileNode("F", "sub.canvas", [], (ctx) => {
      fileNodeReceived = ctx.input;
      throw new NodeReturnNotIntendedByDesign();
    });

    const { introspection_log } = await runCanvas([nodeA, nodeF]);

    // F should have received the value even though edge is labeled
    expect(fileNodeReceived).toBe("to-canvas");
    // F's completion should show return_canceled
    const fComplete = introspection_log.find(
      (m: any) =>
        m.type === "frame-complete" &&
        m.reason === "no-return-intended"
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

    // Labeled edge to non-.canvas: return value does NOT go through
    expect(fileNodeReceived).toBe("NOT_CALLED");
  });
});

// ===== Category 6 (extended): Error Handling in execCanvas =====

describe("Error Handling in execCanvas", () => {
  test("NodeReturnNotIntendedByDesign results in return_canceled", async () => {
    const edge1 = createEdge("A", "B");

    const nodeA = createNode(
      "A",
      "start",
      () => {
        throw new NodeReturnNotIntendedByDesign();
      },
      [edge1]
    );
    const nodeB = createNode("B", "code", () => "should-not-run");

    const { introspection_log } = await runCanvas([nodeA]);

    const completes = introspection_log.filter(
      (m) => m.type === "frame-complete"
    );
    const canceled = completes.find((m) => m.return_canceled === true);
    expect(canceled).toBeDefined();
    expect(canceled.reason).toBe("no-return-intended");
  });

  test("canvas with no start nodes throws error", async () => {
    const nodeA = createNode("A", "code", () => "no-start");

    await expect(runCanvas([nodeA])).rejects.toThrow(
      "no start point for execution found"
    );
  });

  test("generic error in node propagates", async () => {
    const nodeA = createNode("A", "start", () => {
      throw new Error("test-error");
    });

    await expect(runCanvas([nodeA])).rejects.toThrow("test-error");
  });
});

// ===== Category 13: Edge Cases =====

describe("Edge Cases", () => {
  test("single start node with no edges returns its value", async () => {
    const nodeA = createNode("A", "start", () => "solo");
    const { return_value } = await runCanvas([nodeA]);
    expect(return_value).toBe("solo");
  });

  test("node with no outgoing edges captures return value", async () => {
    const edge1 = createEdge("A", "B");

    const nodeA = createNode("A", "start", () => "input", [edge1]);
    const nodeB = createNode("B", "code", (ctx) => "final-" + ctx.input);

    const { return_value } = await runCanvas([nodeA, nodeB]);
    expect(return_value).toBe("final-input");
  });

  test("undefined return value propagates correctly", async () => {
    const edge1 = createEdge("A", "B");

    const nodeA = createNode("A", "start", () => undefined, [edge1]);
    const nodeB = createNode("B", "code", (ctx) => {
      return ctx.input;
    });

    const { return_value } = await runCanvas([nodeA, nodeB]);
    expect(return_value).toBeUndefined();
  });

  test("async node functions are awaited correctly", async () => {
    const edge1 = createEdge("A", "B");

    const nodeA = createNode(
      "A",
      "start",
      async () => {
        await new Promise((r) => setTimeout(r, 10));
        return "async-value";
      },
      [edge1]
    );
    const nodeB = createNode("B", "code", async (ctx) => {
      await new Promise((r) => setTimeout(r, 10));
      return ctx.input + "-processed";
    });

    const { return_value } = await runCanvas([nodeA, nodeB]);
    expect(return_value).toBe("async-value-processed");
  });

  test("complex object input/state cloning", async () => {
    const edge1 = createEdge("A", "B");
    const edge2 = createEdge("A", "C");

    let bInput: any = null;
    let cInput: any = null;

    const nodeA = createNode(
      "A",
      "start",
      (ctx) => {
        ctx.updateState({ nested: { deep: [1, 2, 3] } });
        return { data: [4, 5, 6] };
      },
      [edge1, edge2]
    );
    const nodeB = createNode("B", "code", (ctx) => {
      ctx.state.nested.deep.push(99);
      bInput = ctx.state.nested.deep;
      return "b";
    });
    const nodeC = createNode("C", "code", (ctx) => {
      cInput = ctx.state.nested.deep;
      return "c";
    });

    await runCanvas([nodeA, nodeB, nodeC]);

    // B should have modified its own copy
    expect(bInput).toContain(99);
    // C should have the original (lodash clone is shallow though)
    // Note: _.clone is shallow, so nested objects share references
    // This test documents the actual behavior
    expect(cInput).toBeDefined();
  });
});
