import {ONode} from "../compile/canvas-node-transform"
import {OEdge} from "../compile/canvas-edge-transform"
import {InputsFilterJoiner} from "./joins"
import {ParsedCanvas} from "../types"
import {ExecutableCanvas} from "./ExecutableCanvas"

export type CTX = {
    emit: (label: string, value: any) => void
    input: any
    vault_dir: string
    _this: FnThis
    state: any,
    self_canvas_node: ONode
    self_canvas_nodes: ExecutableCanvas
    updateInput: (new_input: any) => void
    updateState: (new_state: any) => void,
    injectFrame: (frame: StackFrame) => void
} & Record<string, any>

export interface StackFrame {
    node: ONode,
    input: any,
    state: any,
    edge: null | OEdge
    is_aggregating: boolean
    chart: ExecutableCanvas
}

export type FnThis = {
    _invocations: Record<string, StackFrame[]>
    // join it will always be set during node execution
    join?: InputsFilterJoiner
} & Record<string, any>
export type Fn = (this: FnThis, ctx: CTX, input: any) => any | Promise<any>

