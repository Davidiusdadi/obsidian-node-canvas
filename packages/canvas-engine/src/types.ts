import type {ONode} from "./compile/canvas-node-transform"
import type {Introspection} from "./runtime/runtime-types"

/** Parsed / Compiled canvas - ready for execution */
export type ParsedCanvas = Map<string, ONode>

export interface GlobalContext {
    vault_dir: string,
    introspection?: Introspection
    loaded_files: {
        [file_path: string]: ONode
    },
    parallel?: number
}

