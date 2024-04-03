import question from './question'
import nodeInlineDecide from './decide'
import log from './log'
import llmPrompt from './llm-prompt'

import {NodeCompiler} from "../../compile/template"


export default [
    nodeInlineDecide,
    question,
    log,
    llmPrompt,
] as NodeCompiler[]