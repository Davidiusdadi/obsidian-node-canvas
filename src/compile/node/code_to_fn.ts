import chalk from "chalk"
import {OEdge, ONode} from "./node-transform"
import _ from "lodash"

export class InputsNotFullfilled extends Error {

}

export class InputsFilterJoiner {

    private _all = true;
    private edge_ids: string[] = []
    private inputs: Record<string, StackFrame[]>


    constructor(private ctx: CTX) {
        this.inputs = _.clone(this.ctx._this._invocations)
        this.edge_ids = Object.keys(this.inputs)

    }

    get inner() {
        this._all = true
        this.check()
        return this
    }

    state(field: string) {
        const state = this.ctx.state
        for (const edge_id of this.edge_ids) {
            this.inputs[edge_id] = this.inputs[edge_id].filter((invocation) => {
                return invocation.state[field] === state[field]
            })
        }
        this.check()
        return _.merge(
            Object.values(this.inputs)
                .map((invocations) => invocations.map((invocation) => invocation.state))
        )
    }

    input(field: string) {
        const input = this.ctx.input

        for (const edge_id of this.edge_ids) {
            this.inputs[edge_id] = this.inputs[edge_id].filter((invocation) => {
                return invocation.input[field] === input[field]
            })
        }
        this.check()

        const all = _.flatten(
            Object.values(this.inputs).map((invocations) => invocations.map((invocation) => invocation.input))
        )
        return _.merge({}, ...all)
    }

    private check() {
        Object.entries(this.inputs).forEach(([key, invocations]) => {
            if (this._all && invocations.length === 0) {
                // one edge is still not fullfilled
                throw new InputsNotFullfilled()
            }
        })
    }


}

export type CTX = {
    emit: (label: string, value: any) => void
    input: any
    vault_dir: string
    _this: FnThis
    state: any
} & Record<string, any>


export type StackFrame = { node: ONode, input: any, state: any, edge: null | OEdge }

export type FnThis = {
    _invocations: Record<string, StackFrame[]>
    join: InputsFilterJoiner
}

export type Fn = (this: FnThis, ctx: CTX, input: any) => any


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
