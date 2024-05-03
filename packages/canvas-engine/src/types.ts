import {ONode, ONodeFile} from "./compile/canvas-node-transform"
import {Introspection, StackFrame} from "./runtime/runtime-types"
import z from "zod"
import {zRFrameComplete} from "./runtime/inspection/protocol"

/** Parsed / Compiled canvas - ready for execution */
export type ParsedCanvas = Map<string, ONode>

export type InvocationResult = z.input<typeof zRFrameComplete> | { type: 'frame-pushback', frame: StackFrame }

export class GlobalContext {

    introspection?: Introspection
    loaded_files: {
        [file_path: string]: ONodeFile
    } = {}
    parallel?: number
    stack: StackFrame[] = []

    active_frames: {
        promise: Promise<InvocationResult>,
        frame: StackFrame
    }[] = []

    constructor(    public vault_dir: string,) {

    }
}

