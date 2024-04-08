import {js_to_fn} from "../../runtime/js-block-to-fn"
import {NodeCompiler} from "../../compile/template"

export default {
    lang: 'js',
    compile: async (code,context,global_context) => {
        return js_to_fn(code, global_context)
    }
} satisfies NodeCompiler