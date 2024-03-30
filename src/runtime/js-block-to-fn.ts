import {Fn} from "./runtime-types"
import chalk from "chalk"

export function js_to_fn(code: string): Fn {
    const instr_code = `
return (async () => {
let state = ctx.state;
const inputs = ctx.inputs;

const emit = (...args) => {
    ctx.state = state;
    return ctx.emit(...args);
};
// provide easy to sleep function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
${code}

ctx.state = state;
})()
`
    try {
        const fn = new Function('ctx', 'input', instr_code) as Fn
        return fn
    } catch (e) {
        throw new Error(`Failed to compile code: ${chalk.blue(instr_code)}\n${e}`)
    }
}