import { Fn } from "../runtime/runtime-types"

import {ExecutionContext} from "./types"
import {GlobalContext} from "../types"


export interface NodeCompiler {
    lang?: string,
    magic_word?: boolean,
    compile: (code: string, context: ExecutionContext, global_context: GlobalContext) => Promise<Fn>
}