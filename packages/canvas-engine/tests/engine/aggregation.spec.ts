import { expect, test, describe, beforeEach } from "bun:test";
import { createNode, createSimplePassthroughNode } from "./helpers/mock-nodes";
import { createEdge, resetEdgeCounter } from "./helpers/mock-edges";
import { FnThis } from "../../src/runtime/runtime-types";
import { runCanvas } from "./helpers/test-utils";

beforeEach(() => {
  resetEdgeCounter();
});

describe("Aggregation Logic (end-to-end)", () => {
  test("aggregate collects all inputs from fan-out", async () => {
    const edgeAB = createEdge("A", "B", "item");
    const edgeBC = createEdge("B", "C");

    const nodeA = createNode(
      "A",
      "start",
      (ctx) => {
        ctx.emit("item", 1);
        ctx.emit("item", 2);
        ctx.emit("item", 3);
        return undefined;
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

    const dIndex = executionOrder.indexOf("D");
    expect(dIndex).toBeGreaterThan(executionOrder.indexOf("B"));
    expect(dIndex).toBeGreaterThan(executionOrder.indexOf("C"));

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

    expect(thisData).not.toBeNull();
    const invocations = Object.values(thisData!._invocations);
    for (const arr of invocations) {
      expect(arr).toHaveLength(0);
    }
  });
});
