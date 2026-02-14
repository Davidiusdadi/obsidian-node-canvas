import {NodeCompiler} from "../../../compile/template"
import {NodeReturnNotIntendedByDesign} from "../../../runtime/errors"


export default {
    magic_word: true,
    lang: 'on',
    compile: async (code) => {
        return (ctx) => {
            if (ctx.frame.edge?.label?.trim() === code.trim()) {
                return ctx.input
            }
            throw new NodeReturnNotIntendedByDesign()
        }
    }
} satisfies NodeCompiler
