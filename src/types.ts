import {ONode} from "./compile/canvas-node-transform"

/** Parsed / Compiled canvas - ready for execution */
export type ParsedCanvas = Map<string, ONode>

export interface GlobalContext {
    vault_dir: string
}

