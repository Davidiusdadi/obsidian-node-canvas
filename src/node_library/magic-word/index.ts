import question from './question'
import nodeInlineDecide from './decide'
import log from './log'
import llmPrompt from './llm-prompt'
import canvasIo from "./canvas-io"

import {NodeCompiler} from "../../compile/template"


export default [
    nodeInlineDecide,
    question,
    log,
    llmPrompt,
    ...canvasIo
] as NodeCompiler[]