import _ from "lodash"
import {CTX, StackFrame} from "./runtime-types"
import {BadCanvasInstruction, InputsNotFullfilled} from "./errors"


interface JoinerState {
    ctx: CTX
    frame: StackFrame
    inputs: Record<string, StackFrame[]>
    _inner_join: boolean
    get_field?: 'state' | 'input'
}

export class InputsFilterJoiner {
    private ctx: CTX
    private frame: StackFrame
    private inputs: Record<string, StackFrame[]>
    private edge_ids: string[] = []
    private _inner_join = false
    private get_field?: 'state' | 'input'

    private getState() {
        return {
            ctx: this.ctx,
            frame: this.frame,
            inputs: this.inputs,
            _inner_join: this._inner_join,
            get_field: this.get_field
        } satisfies JoinerState
    }


    static create(ctx: CTX, frame: StackFrame) {
        const inputs = _.clone(ctx._this._invocations)
        return new InputsFilterJoiner({
            ctx,
            frame,
            inputs,
            get_field: 'input',
            _inner_join: false
        })
    }

    protected constructor(state: JoinerState) {
        this.ctx = state.ctx
        this.frame = state.frame
        this.inputs = state.inputs
        this._inner_join = state._inner_join
        this.get_field = state.get_field
        this.edge_ids = Object.keys(this.inputs)
    }

    get aggregate() {
        if (this._inner_join) {
            throw new BadCanvasInstruction(`You can't use join via .inner and .aggregate at the same time.`)
        }
        if (this.frame.is_aggregating) {
            return this // aggregating is not fullfilled
        } else {
            throw new InputsNotFullfilled(true)
        }
    }

    get inner() {
        if (this.frame.is_aggregating) {
            throw new BadCanvasInstruction(`You can't use join via .inner and .aggregate at the same time.`)
        }
        this._inner_join = true
        this.check()
        return this
    }


    protected filter(field: 'state' | 'input', value: any) {
        let inputs = _.clone(this.inputs)
        if (value !== undefined) {
            for (const edge_id of this.edge_ids) {
                inputs[edge_id] = inputs[edge_id].filter((invocation) => {
                    return invocation[field] === value
                })
            }
            this.check()
        }
        return new InputsFilterJoiner({
            ...this.getState(),
            inputs,
            get_field: field
        })
    }

    state(field?: string) {
        return this.filter('state', field)
    }

    private get invocations_by_field() {
        if (!this.get_field) {
            throw new BadCanvasInstruction(`You can't use .merge without calling .state('<field>') or .state('<input>') . first`)
        }
        return _.flatten(
            Object.values(this.inputs)
                .map((invocations) => invocations.map((invocation) => invocation[this.get_field!]))
        )
    }

    merge() {
        return _.merge({}, this.invocations_by_field)
    }

    list() {
        return this.invocations_by_field
    }

    input(field?: string) {
        return this.filter('input', field)
    }

    private check() {
        Object.entries(this.inputs).forEach(([key, invocations]) => {
            if (this._inner_join && invocations.length === 0) {
                // one edge is still not fullfilled
                throw new InputsNotFullfilled(false)
            }
        })
    }


}


