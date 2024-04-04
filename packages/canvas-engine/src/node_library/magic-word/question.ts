import {NodeCompiler} from "../../compile/template"
import * as readline from 'readline';
import {template_render} from "../lang/yaml"

// Function to read a line from stdin
const readLineAsync = (query: string): Promise<string> => {
    const rl = readline.createInterface({
        input: process.stdin
    });

    return new Promise<string>((resolve) => {
        rl.question(query, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
};

export default {
    magic_word: true,
    lang: 'question',
    compile: async (code) => {
        return async (ctx) => {
            const render = template_render(code, ctx)
            process.stdout.write(render)
            return await readLineAsync(render)
        }
    }
} satisfies NodeCompiler
