import {Fn} from "./runtime-types"
import chalk from "chalk"
import {GlobalContext} from "../types"

export function js_to_fn(code: string, context: GlobalContext): Fn {
    const instr_code = `

let state = ctx.state;    
    
return (async () => {
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

const zipOnState = ctx.join.zipOnState.bind(ctx.join);
const zipOnInput = ctx.join.zipOnInput.bind(ctx.join);
const aggregate = () => ctx.join.aggregate;


const emit = (...args) => {
    ctx.state = state;
    return ctx.emit(...args);
};

// provide easy to sleep function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// node code start
${code}
// node code end

})().finally(() => {
    ctx.state = state;
});
`
    try {
        const fn = new Function('ctx', instr_code) as Fn
        return fn
    } catch (e) {
        throw new Error(`Failed to compile code: ${chalk.blue(code)}\n${e}`)
    }
}


