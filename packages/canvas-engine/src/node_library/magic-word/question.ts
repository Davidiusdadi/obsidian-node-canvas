import {NodeCompiler} from "../../compile/template"
import * as readline from 'readline';
import {template_render} from "../lang/yaml"
import {RuntimeONode} from "../../compile/canvas-node-transform"
import {CTX} from "../../runtime/runtime-types"

// Function to read a line from stdin
const readLineAsync = (query: string): Promise<string> => {
    const rl = readline.createInterface({
        input: process.stdin,
        //output: process.stdout,
    });

    return new Promise<string>((resolve) => {
        rl.question(query, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
};

let one_at_a_time = Promise.resolve<string>('')

type Extras = { template: string }

export default {
    magic_word: true,
    lang: 'question',
    compile: async (code, {node: onode}) => {
        const node = onode as RuntimeONode<Extras>
        node.template = code
        return async (ctx: CTX<Extras>) => {
            one_at_a_time = one_at_a_time.then(() => {
                const render = template_render(ctx.self_canvas_node.template, ctx)
                process.stdout.write(render)
                return readLineAsync(render)
            })
            return one_at_a_time
        }
    }
} satisfies NodeCompiler
