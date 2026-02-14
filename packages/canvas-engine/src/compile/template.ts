import { Fn } from "../runtime/runtime-types"

import {ExecutionContext} from "./types"
import {GlobalContext} from "../types"
import type {ONode} from "./canvas-node-transform"


export type CompilationContext = {
    node: ONode,
    ectx: ExecutionContext,
    gctx: GlobalContext
}

export interface NodeCompiler {
    lang?: string,
    magic_word?: boolean,
    compile: (code: string, cctx: CompilationContext) => Promise<Fn>
}