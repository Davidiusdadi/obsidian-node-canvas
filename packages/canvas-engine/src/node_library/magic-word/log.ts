import {NodeCompiler} from "../../compile/template"
import {template_render} from "../lang/yaml"
import {z} from "zod"
import {zRLog} from "../../runtime/inspection/protocol"


export default {
    magic_word: true,
    lang: 'log',
    compile: async (code) => {
        return (ctx) => {
            const render = template_render(code, ctx)
            console.log(render)

            ctx.gctx.introspection?.inform({
                type: 'log',
                content: render,
                frame_id: ctx.frame.id
            } satisfies z.input<typeof zRLog>)

            return ctx.input
        }
    }
} satisfies NodeCompiler
