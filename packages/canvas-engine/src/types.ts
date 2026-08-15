import {ONode, ONodeFile} from "./compile/canvas-node-transform"
import {Introspection, StackFrame} from "./runtime/runtime-types"
import z from "zod"
import {zRFrameComplete} from "./runtime/inspection/protocol"
import {NodeCompiler} from "./compile/template"

/** Parsed / Compiled canvas - ready for execution */
export type ParsedCanvas = Map<string, ONode>

export type InvocationResult = z.input<typeof zRFrameComplete> | { type: 'frame-pushback', frame: StackFrame }

/**
 * The reserved emission label that feeds the OUTPUT SINK. `ctx.emit('mint', x)`
 * appends `x` to `gctx.minted` — and still travels along any `mint`-labelled
 * edge, so the sink works whether or not the author wired one. This is how a
 * run says "these are my results" independently of which frame happened to
 * finish last (`return_value` is a debugging convenience, never a contract).
 */
export const MINT_LABEL = 'mint'

export class GlobalContext {

    introspection?: Introspection
    nodeCompilers: NodeCompiler[] = []
    loaded_files: {
        [file_path: string]: ONodeFile
    } = {}
    parallel?: number
    stack: StackFrame[] = []

    /** Everything emitted on {@link MINT_LABEL}, in emission order. */
    minted: any[] = []
    /** A small run-level summary any node may set (`ctx.gctx.summary = …`).
     *  Distinct from `minted`: the summary is coordinates about the run, the
     *  mints are its results. */
    summary?: any
    /** Wall-clock epoch-ms after which the run aborts with
     *  {@link DeadlineExceeded}. Unset = no bound; a long-running canvas is the
     *  implementer's business, but an unattended caller should always set one. */
    deadline?: number

    active_frames: {
        promise: Promise<InvocationResult>,
        frame: StackFrame
    }[] = []

    constructor(    public vault_dir: string,) {

    }
}

