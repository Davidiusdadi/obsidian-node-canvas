import {NodeCompiler} from "../../../compile/template"
import {NodeReturnNotIntendedByDesign} from "../../../runtime/errors"
import {Fn} from "../../../runtime/runtime-types"


export type InjectFn = Fn & {
    inject_name: string
}

export default {
    magic_word: true,
    lang: 'inject',
    compile: async (code) => {
        const fn: Fn = (ctx) => {
            throw new NodeReturnNotIntendedByDesign()
        }
        return Object.assign(fn, {
            inject_name: code.trim().toLowerCase()
        }) satisfies InjectFn
    }
} satisfies NodeCompiler
