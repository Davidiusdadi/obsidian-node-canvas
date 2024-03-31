import node_ts from "./node-ts"
import node_js from "./node-js"
import node_yaml from "./node-yaml"
import nodeInlineDecide from "./node-inline-decide"
import {NodeCompiler} from "./template"


export const code_node_compilers = [
    node_ts,
    node_js,
    node_yaml,
    nodeInlineDecide
] as NodeCompiler[]