import { Fn } from "../../runtime/runtime-types"
import type {ExecutionContext} from "../canvas-node-transform"


export interface NodeCompiler {
    lang: string,
    compile: (code: string, context: ExecutionContext) => Promise<Fn | null>
}