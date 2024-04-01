import {ONode} from "../compile/canvas-node-transform"
import {OEdge} from "../compile/canvas-edge-transform"
import {InputsFilterJoiner} from "./code_to_fn"

export type CTX = {
    emit: (label: string, value: any) => void
    input: any
    vault_dir: string
    _this: FnThis
    state: any,
    onode: ONode
    onodes: ONode[]
} & Record<string, any>

export interface StackFrame {
    node: ONode,
    input: any,
    state: any,
    edge: null | OEdge
    is_aggregating: boolean
}

export type FnThis = {
    _invocations: Record<string, StackFrame[]>
    // join it will always be set during node execution
    join?: InputsFilterJoiner
}
export type Fn = (this: FnThis, ctx: CTX, input: any) => any | Promise<any>