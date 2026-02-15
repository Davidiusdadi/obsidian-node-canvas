import { expect, test, describe, beforeEach } from "bun:test";
import { createNode, createSimplePassthroughNode } from "./helpers/mock-nodes";
import { createEdge, resetEdgeCounter } from "./helpers/mock-edges";
import { runCanvas } from "./helpers/test-utils";

beforeEach(() => {
  resetEdgeCounter();
});

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

    expect(bReceived).toBe("default-value");
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
