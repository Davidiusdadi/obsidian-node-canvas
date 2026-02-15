import { ONode } from "../../../src/compile/canvas-node-transform";
import { Fn } from "../../../src/runtime/runtime-types";
import { ZEdge } from "../../../src/compile/canvas-edge-transform";
import { z } from "zod";

export function createNode(
  id: string,
  type: "start" | "code" | "text",
  fn?: Fn,
  edges: z.output<typeof ZEdge>[] = []
): ONode {
  const baseFn: Fn = fn ?? ((ctx) => ctx.input);

  if (type === "start") {
    return {
      id,
      type: "start",
      edges,
      fn: baseFn,
      original: {} as any,
    } as ONode;
  }

  if (type === "code") {
    return {
      id,
      type: "code",
      code: "// mock code",
      lang: "ts",
      edges,
      fn: baseFn,
      original: {} as any,
      compiler: undefined,
    } as ONode;
  }

  // text/identity node
  return {
    id,
    type: "text",
    text: "",
    edges,
    fn: baseFn,
    original: {} as any,
  } as ONode;
}

export function createSimplePassthroughNode(
  id: string,
  edges: z.output<typeof ZEdge>[] = []
): ONode {
  return createNode(id, "code", (ctx) => ctx.input, edges);
}

export function createTransformNode(
  id: string,
  transform: (input: any) => any,
  edges: z.output<typeof ZEdge>[] = []
): ONode {
  return createNode(id, "code", (ctx) => transform(ctx.input), edges);
}

export function createFileNode(
  id: string,
  file: string,
  edges: z.output<typeof ZEdge>[] = [],
  fn?: Fn
): ONode {
  const baseFn: Fn = fn ?? ((ctx) => ctx.input);
  return {
    id,
    type: "file",
    file,
    edges,
    fn: baseFn,
    original: {} as any,
    canvas: undefined,
  } as ONode;
}
