import question from './question'

import log from './log'

import canvasIo from "./canvas-io"
import llm from "./llm"
import debug from "./debug"

import {NodeCompiler} from "../../compile/template"


export default [

    question,
    log,
    debug,
    ...canvasIo,
    ...llm
] as NodeCompiler[]