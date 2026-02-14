import {NodeCompiler} from "../../compile/template"
import * as readline from 'readline';
import {logger} from "../../globals"

// Function to read a line from stdin
const readLineAsync = (query: string): Promise<string> => {
    const rl = readline.createInterface({
        input: process.stdin,
        //output: process.stdout
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
    lang: 'debug',
    compile: async (code) => {
        return async (ctx) => {
            logger.debug('debug input:', ctx.input)
            console.log('(debug) Press enter to resume...')
            await readLineAsync('no stdout configured')
            return ctx.input
        }
    }
} satisfies NodeCompiler
