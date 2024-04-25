import {NodeCompiler} from "../../../compile/template"
import {NodeReturnNotIntendedByDesign} from "../../../runtime/errors"
import {Fn} from "../../../runtime/runtime-types"


export type InjectFn = Fn & {
    inject_name: string
}

export default {
    magic_word: true,
    lang: 'return',
    compile: async (code) => {
        const fn: Fn = (ctx) => {
            const inject_return = ctx.frame.internal_state.inject_return.pop()
            if (!inject_return) {
                throw new Error(`return called without a previous inject`)
            }
            inject_return(ctx)
            throw new NodeReturnNotIntendedByDesign()
        }
        return Object.assign(fn, {
            inject_name: code.trim().toLowerCase()
        }) satisfies InjectFn
    }
} satisfies NodeCompiler
