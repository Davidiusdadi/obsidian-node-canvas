import {NodeCompiler} from "../../../compile/template"
import {NodeReturnNotIntendedByDesign} from "../../../runtime/errors"
import {Fn} from "../../../runtime/runtime-types"
import {InjectONode} from "./return"


export default {
    magic_word: true,
    lang: 'inject',
    compile: async (code, {node: onode}) => {

        const node = onode as InjectONode

        const fn: Fn = (ctx) => {
            throw new NodeReturnNotIntendedByDesign()
        }

        node.inject_name = code.trim().toLowerCase()

        return fn
    }
} satisfies NodeCompiler
