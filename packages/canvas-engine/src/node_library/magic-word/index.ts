import question from './question'
import nodeInlineDecide from './decide'
import log from './log'
import llmPrompt from './llm-prompt'
import canvasIo from "./canvas-io"
import llm from "./llm"

import {NodeCompiler} from "../../compile/template"


export default [
    nodeInlineDecide,
    question,
    log,
    llmPrompt,
    ...canvasIo,
    ...llm
] as NodeCompiler[]