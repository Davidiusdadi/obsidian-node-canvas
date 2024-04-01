import node_ts from "./node-ts"
import node_js from "./node-js"
import node_yaml from "./node-yaml"

import {NodeCompiler} from "./template"
import nodes from '../../node_library'

export const code_node_compilers = [
    node_ts,
    node_js,
    node_yaml,
    ...nodes
] as NodeCompiler[]