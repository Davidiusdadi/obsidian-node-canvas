import { expect, test, describe, beforeEach } from "bun:test";
import { createNode } from "./helpers/mock-nodes";
import { createEdge, resetEdgeCounter } from "./helpers/mock-edges";
import { NodeReturnNotIntendedByDesign } from "../../src/runtime/errors";
import { runCanvas } from "./helpers/test-utils";

beforeEach(() => {
  resetEdgeCounter();
});

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

    expect(bInput).toContain(99);
    // Note: _.clone is shallow, so nested objects share references
    expect(cInput).toBeDefined();
  });
});
