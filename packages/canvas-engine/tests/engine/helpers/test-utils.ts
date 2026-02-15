import { createMockCanvas } from "./mock-canvas";
import { CTX, StackFrame, FnThis } from "../../../src/runtime/runtime-types";
import { ExecutableCanvas } from "../../../src/runtime/ExecutableCanvas";
import { GlobalContext } from "../../../src/types";
import { execCanvas } from "../../../src/runtime/exec-canvas";
import { ONode } from "../../../src/compile/canvas-node-transform";

export function createMockGlobalContext(): GlobalContext {
  return {
    vault_dir: "/test/vault",
    stack: [],
    active_frames: [],
    parallel: 100,
    introspection: undefined,
    loaded_files: {},
  } as GlobalContext;
}

export async function runCanvas(
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

export function createMockCTX(
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
