import {ONode} from "./canvas-node-transform"
import {ExecutionContext} from "./types"
import path from "node:path"
import {readFile} from "fs/promises"
import {parseCanvas} from "./parse-canvas"
import {CTX, Fn} from "../runtime/runtime-types"
import {ExecutableCanvas} from "../runtime/ExecutableCanvas"
import _ from "lodash"
import emitInput from "../node_library/magic-word/canvas-io/emit-input"
import {NodeReturnNotIntendedByDesign} from "../runtime/errors"
import emitState from "../node_library/magic-word/canvas-io/emit-state"
import {GlobalContext} from "../types"

type FileNode = Extract<ONode, { type: 'file' }>

export async function loadFileNode(node: FileNode, ectx: ExecutionContext, gctx: GlobalContext): Promise<ONode> {
    const file = path.parse(node.file)

    if (gctx.loaded_files[node.file]) {
        return gctx.loaded_files[node.file]
    }
    let result_node: ONode
    if (file.ext === '.canvas') {
        const canvas_blueprint = new ExecutableCanvas(node.file, await parseCanvas(node.file, gctx));
        const fn: Fn = async (top_ctx: CTX) => {
            let sub_canvas: ExecutableCanvas
            if (!top_ctx._this._canvas_instance) {
                sub_canvas = top_ctx._this._canvas_instance = _.cloneDeep(canvas_blueprint)
                sub_canvas.nodes.filter((node) => node.type === 'start').forEach((node) => {
                    top_ctx.injectFrame({
                        node,
                        input: undefined,
                        state: {},
                        edge: null,
                        is_aggregating: false,
                        chart: sub_canvas,
                        // id and ctx will be added by the engine later
                    })
                })

                sub_canvas.nodes.forEach((node) => {
                    if (node.type === 'code' &&
                        (
                            node.compiler?.lang === emitInput.lang
                            || node.compiler?.lang === emitState.lang
                        )
                    ) {
                        const sub_fn = node.fn
                        node.fn = function (sub_ctx) {
                            sub_fn.call(this, {
                                ...sub_ctx,
                                emit: (label, value) => {
                                    top_ctx.emit(label, value)
                                }
                            })
                        }
                    }
                })
            }
            throw new NodeReturnNotIntendedByDesign()
        }
        result_node = {
            ...node,
            fn,
            canvas: canvas_blueprint
        }
    } else if (file.ext === '.md') {
        type TargetType = Extract<ONode, { type: 'text' }>
        const full_path = path.join(ectx.vault_dir, node.file)
        const contents = await readFile(full_path)
        result_node = {
            ...node,
            type: 'text',
            code: contents.toString(),
        }  satisfies TargetType
    } else {
        result_node = {
            ...node,
            comment: 'file type not supported'
        }
    }

    gctx.loaded_files[node.file] = result_node
    return result_node

}