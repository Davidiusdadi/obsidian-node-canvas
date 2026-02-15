import { expect, test, describe, beforeEach } from "bun:test";
import { createNode } from "./helpers/mock-nodes";
import { createEdge, resetEdgeCounter } from "./helpers/mock-edges";
import { runCanvas } from "./helpers/test-utils";

beforeEach(() => {
  resetEdgeCounter();
});

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

    const bStartIdx = timeline.indexOf("B-start");
    const cStartIdx = timeline.indexOf("C-start");
    const bEndIdx = timeline.indexOf("B-end");
    const cEndIdx = timeline.indexOf("C-end");

    expect(bStartIdx).not.toBe(-1);
    expect(cStartIdx).not.toBe(-1);

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

    const bStartIdx = timeline.indexOf("B-start");
    const cStartIdx = timeline.indexOf("C-start");
    const bEndIdx = timeline.indexOf("B-end");
    const cEndIdx = timeline.indexOf("C-end");

    if (bStartIdx < cStartIdx) {
      expect(bEndIdx).toBeLessThan(cStartIdx);
    } else {
      expect(cEndIdx).toBeLessThan(bStartIdx);
    }
  });
});
