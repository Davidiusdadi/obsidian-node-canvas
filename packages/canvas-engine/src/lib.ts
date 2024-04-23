import {GlobalContext} from "./types"
import {parseCanvas} from "./compile/parse-canvas"
import {execCanvas} from "./runtime/exec-canvas"
import {ExecutableCanvas} from "./runtime/ExecutableCanvas"
import {Introspection} from "./runtime/runtime-types"


export const createCanvasEngine = async (vault_dir: string, canvas_path: string, introspection?: Introspection) => {
    let global_context: GlobalContext = {
        vault_dir,
        loaded_files: {}
    }
    global_context.introspection = introspection
    let node_data = await parseCanvas(canvas_path, global_context)
    return await execCanvas(new ExecutableCanvas(canvas_path, node_data), global_context)
}