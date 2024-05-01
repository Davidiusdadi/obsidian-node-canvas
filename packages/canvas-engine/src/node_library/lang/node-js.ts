import {js_to_fn} from "../../runtime/js-block-to-fn"
import {NodeCompiler} from "../../compile/template"

export default {
    lang: 'js',
    compile: async (code, {gctx}) => {
        return js_to_fn(code, gctx)
    }
} satisfies NodeCompiler