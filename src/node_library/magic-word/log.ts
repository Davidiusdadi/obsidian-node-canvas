import {NodeCompiler} from "../../compile/template"
import {nunjucks_env, template_render} from "../lang/yaml"


export default {
    magic_word: true,
    lang: 'log',
    compile: async (code) => {
        return (ctx) => {
            const render = template_render(code, ctx)
            console.log(render)
            return ctx.input
        }
    }
} satisfies NodeCompiler
