import {ONode} from "../compile/canvas-node-transform"
import {OEdge} from "../compile/canvas-edge-transform"
import {InputsFilterJoiner} from "./joins"
import {ExecutableCanvas} from "./ExecutableCanvas"
import {z} from "zod"
import {zz} from "./helper"
import {MsgRunner2Inspector, runner2inspector} from "./inspection/protocol"
import { GlobalContext } from "../types"

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
    gctx: GlobalContext,
    frame: StackFrame
} & Record<string, any>


export type Introspection = {
    inform: (msg: z.input<typeof runner2inspector>) => Promise<void> | void
    waitForInput(): Promise<any>

    installIntrospections: (canvas: ExecutableCanvas) => void
}

export const zStackFrame = z.object({
    id: z.optional(z.number()),
    node: zz<ONode>(),
    input: z.any(),
    state: z.any(),
    edge: z.nullable(zz<OEdge>()),
    is_aggregating: z.boolean(),
    chart: zz<ExecutableCanvas>(),
    ctx: zz<CTX>().optional()
})

export type StackFrame = z.output<typeof zStackFrame>

export type FnThis = {
    _invocations: Record<string, StackFrame[]>
    // join it will always be set during node execution
    join?: InputsFilterJoiner
} & Record<string, any>
export type Fn = (this: FnThis, ctx: CTX) => any | Promise<any>

