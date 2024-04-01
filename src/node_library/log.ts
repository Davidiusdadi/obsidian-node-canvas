import {NodeCompiler} from "../compile/node/template"
import {nunjucks_env, template_render} from "../compile/node/node-yaml"


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
