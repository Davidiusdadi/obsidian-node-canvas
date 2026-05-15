import {GlobalContext} from "./types"
import {parseCanvas} from "./compile/parse-canvas"
import {execCanvas} from "./runtime/exec-canvas"
import {ExecutableCanvas} from "./runtime/ExecutableCanvas"
import {Introspection} from "./runtime/runtime-types"
import {NodeCompiler} from "./compile/template"
import _defaultCompilers from './node_library'
export type {ONode} from "./compile/canvas-node-transform"
export * from "./runtime/errors"
export type * from "./types"
export type {NodeCompiler} from "./compile/template"
export {ExecutableCanvas} from "./runtime/ExecutableCanvas"
export * from "./runtime/runtime-types"
export {execCanvas} from "./runtime/exec-canvas"

export const defaultCompilers: NodeCompiler[] = _defaultCompilers

export type EngineOptions = {
    introspection?: Introspection
    /** Fully replaces built-in compilers when provided */
    compilers?: NodeCompiler[]
    /** Merged after built-in compilers */
    extraCompilers?: NodeCompiler[]
}

export const createCanvasEngine = async (
    vault_dir: string,
    canvas_path: string,
    optionsOrIntrospection?: EngineOptions | Introspection
) => {
    let introspection: Introspection | undefined
    let compilers: NodeCompiler[]

    if (optionsOrIntrospection && 'inform' in optionsOrIntrospection) {
        // Backward compat: 3rd arg is Introspection directly
        introspection = optionsOrIntrospection as Introspection
        compilers = defaultCompilers
    } else {
        const opts = optionsOrIntrospection as EngineOptions | undefined
        introspection = opts?.introspection
        compilers = opts?.compilers ?? [...defaultCompilers, ...(opts?.extraCompilers ?? [])]
    }

    let global_context = new GlobalContext(vault_dir)
    global_context.introspection = introspection
    global_context.nodeCompilers = compilers
    let node_data = await parseCanvas(canvas_path, global_context)
    return await execCanvas(new ExecutableCanvas(canvas_path, node_data), global_context)
}

export default createCanvasEngine;