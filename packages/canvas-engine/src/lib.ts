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

type CreateCanvasEngineArgs = {
	vault_dir: string, canvas_path: string, introspection?: Introspection, import_override?: (imp: string) => any
}




export  function createCanvasEngine (vault_dir: string, canvas_path: string, introspection?: Introspection):  Promise<ReturnType<typeof execCanvas>>
export  function createCanvasEngine (args: CreateCanvasEngineArgs) :  Promise<ReturnType<typeof execCanvas>>
export async function createCanvasEngine    (...args: any[]): Promise<ReturnType<typeof execCanvas>> {
	let vault_dir: string | undefined = undefined
	let canvas_path: string | undefined = undefined
	let introspection: Introspection | undefined = undefined
	let import_override : (imp: string) => any = (imp) => import(imp)
	if(typeof args[0] === 'object') {
		vault_dir = args[0].vault_dir
		canvas_path = args[0].canvas_path
		introspection = args[0].introspection
		import_override = args[0].import_override ?? import_override
	} else  {
		vault_dir = args[0]
		canvas_path = args[1]
		introspection = args[2]
	}


	if(!vault_dir || !canvas_path) {
		console.log('Invalid arguments:', ...args)
		throw new Error("Invalid arguments: vault_dir and canvas_path are required")
	}


	let global_context = new GlobalContext(vault_dir, import_override)
	global_context.introspection = introspection
	let node_data = await parseCanvas(canvas_path, global_context)
	return await execCanvas(new ExecutableCanvas(canvas_path, node_data), global_context)
}

export default createCanvasEngine;


