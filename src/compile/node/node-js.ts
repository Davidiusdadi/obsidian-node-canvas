import {js_to_fn} from "../../runtime/js-block-to-fn"
import {NodeCompiler} from "./template"

export default {
    lang: 'js',
    compile: async (code) => {
        return js_to_fn(code)
    }
} satisfies NodeCompiler