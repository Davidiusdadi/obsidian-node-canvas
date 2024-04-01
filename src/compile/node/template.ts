import { Fn } from "../../runtime/runtime-types"

import {ExecutionContext} from "../types"


export interface NodeCompiler {
    lang?: string,
    magic_word?: boolean,
    compile: (code: string, context: ExecutionContext) => Promise<Fn>
}