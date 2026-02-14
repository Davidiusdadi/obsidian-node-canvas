import node_ts from "./node-ts"
import node_js from "./node-js"
import node_yaml from "./yaml"
import bash from "./bash"

import {NodeCompiler} from "../../compile/template"
import nodes from '../magic-word'

export default  [
    node_ts,
    node_js,
    node_yaml,
    ...nodes,
    bash
] as NodeCompiler[]