import { expect, test, describe, beforeEach } from "bun:test";
import {
  createNode,
  createSimplePassthroughNode,
} from "./helpers/mock-nodes";
import { createEdge, resetEdgeCounter } from "./helpers/mock-edges";
import { runCanvas } from "./helpers/test-utils";

beforeEach(() => {
  resetEdgeCounter();
});

describe("Frame Stack Management", () => {
  test("frame IDs increment sequentially", async () => {
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

    const steps = introspection_log.filter((m) => m.type === "frame-step");
    const completes = introspection_log.filter(
      (m) => m.type === "frame-complete" && m.was_invoked
    );

    expect(steps.length).toBeGreaterThanOrEqual(2);
    expect(completes.length).toBeGreaterThanOrEqual(2);
  });
});
