import {ONode, ONodeFile} from "./compile/canvas-node-transform";
import {Introspection, StackFrame} from "./runtime/runtime-types";
import z from "zod";
import {zRFrameComplete} from "./runtime/inspection/protocol";
import {NodeCompiler} from "./compile/template";

/** Parsed / Compiled canvas - ready for execution */
export type ParsedCanvas = Map<string, ONode>;

export type InvocationResult =
	| z.input<typeof zRFrameComplete>
	| { type: "frame-pushback"; frame: StackFrame }


let default_import_override = (imp: string) => {
	return import(imp);
}

export class GlobalContext {
	introspection?: Introspection
	loaded_files: {
		[file_path: string]: ONodeFile
	} = {}
	parallel?: number
	stack: StackFrame[] = []

	active_frames: {
		promise: Promise<InvocationResult>
		frame: StackFrame
	}[] = []

	constructor(
		public vault_dir: string,
		public import_override: (imp: string) => any = default_import_override,
		public node_types_additions?: NodeCompiler[]
	) {
	}
}
