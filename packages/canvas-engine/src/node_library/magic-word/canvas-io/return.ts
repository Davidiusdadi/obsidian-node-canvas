import {NodeCompiler} from "../../../compile/template"
import {NodeReturnNotIntendedByDesign} from "../../../runtime/errors"
import {Fn} from "../../../runtime/runtime-types"
import {logger} from "../../../globals"
import {ONode} from "../../../compile/canvas-node-transform"


export type InjectONode = ONode & {inject_name: string}

export default {
    magic_word: true,
    lang: 'return',
    compile: async (code, {node: orginal_onode}) => {
        const node = orginal_onode as InjectONode
        const fn: Fn = (ctx) => {
            logger.trace(`<frame ${ctx.frame.id}: inject return called: current depth: ${ctx.frame.internal_state.inject_return.length}>`)
            const inject_return = ctx.frame.internal_state.inject_return.pop()
            if (!inject_return) {
                throw new Error(`return called without a previous inject`)
            }
            inject_return(ctx)
            throw new NodeReturnNotIntendedByDesign()
        }
        node.inject_name = code.trim().toLowerCase()

        return fn
    }
} satisfies NodeCompiler
