import {Fn} from "./runtime-types"
import chalk from "chalk"

export function js_to_fn(code: string): Fn {
    const instr_code = `
return (async () => {

let state = ctx.state;
let input = ctx.input;

// join and aggregate if used will update the state and input
ctx.updateInput = (new_input) => {
    input = new_input;
    ctx.input = new_input;
};
ctx.updateState = (new_state) => {
    state = new_state;
    ctx.state = new_state;
};

const zipOnState = this.join.zipOnState.bind(this.join);
const zipOnInput = this.join.zipOnInput.bind(this.join);
const aggregate = () => this.join.aggregate;


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
        const fn = new Function('ctx', instr_code) as Fn
        return fn
    } catch (e) {
        throw new Error(`Failed to compile code: ${chalk.blue(instr_code)}\n${e}`)
    }
}


