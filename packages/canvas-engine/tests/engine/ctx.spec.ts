import { expect, test, describe, beforeEach } from "bun:test";
import { createNode } from "./helpers/mock-nodes";
import { createEdge, resetEdgeCounter } from "./helpers/mock-edges";
import { FnThis } from "../../src/runtime/runtime-types";
import { runCanvas } from "./helpers/test-utils";

beforeEach(() => {
  resetEdgeCounter();
});

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
