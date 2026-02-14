import {GlobalContext} from "./types"
import {parseCanvas} from "./compile/parse-canvas"
import {execCanvas} from "./runtime/exec-canvas"
import {ExecutableCanvas} from "./runtime/ExecutableCanvas"
import {Introspection} from "./runtime/runtime-types"
export type {ONode} from "./compile/canvas-node-transform"
export * from "./runtime/errors"
export type * from "./types"
export type {NodeCompiler} from "./compile/template"
export {ExecutableCanvas} from "./runtime/ExecutableCanvas"
export * from "./runtime/runtime-types"
export {execCanvas} from "./runtime/exec-canvas"

export const createCanvasEngine = async (vault_dir: string, canvas_path: string, introspection?: Introspection) => {
    let global_context = new GlobalContext(vault_dir)
    global_context.introspection = introspection
    let node_data = await parseCanvas(canvas_path, global_context)
    return await execCanvas(new ExecutableCanvas(canvas_path, node_data), global_context)
}

export default createCanvasEngine;