import {ONode} from "./canvas-node-transform"
import {ExecutionContext} from "./types"
import path from "node:path"
import {readFile} from "fs/promises"
import {parseCanvas} from "./parse-canvas"
import {execCanvas} from "../runtime/exec-canvas"
import {CTX, Fn} from "../runtime/runtime-types"

type FileNode = Extract<ONode, { type: 'file' }>

export async function loadFileNode(node: FileNode, ctx: ExecutionContext) {
    const file = path.parse(node.file)
    if (file.ext === '.canvas') {
        const canvas = await parseCanvas(node.file, ctx);
        const fn: Fn = async (ctx: CTX) => {
            if(!ctx._this._canvas_instance) {
                ctx._this._canvas_instance = canvas
            }
            throw new Error('not yet implemented')
        }
        return {
            ...node,
            fn,
            canvas
        }
    } else if (file.ext === '.md') {
        type TargetType = Extract<ONode, { type: 'text' }>
        const full_path = path.join(ctx.vault_dir, node.file)
        const contents = await readFile(full_path)
        return {
            ...node,
            type: 'text',
            code: contents.toString(),
        }  satisfies TargetType
    } else {
        return {
            ...node,
            comment: 'file type not supported'
        }
    }

}