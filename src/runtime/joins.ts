import _ from "lodash"
import {CTX, StackFrame} from "./runtime-types"
import {BadCanvasInstruction, InputsNotFullfilled} from "./errors"


interface JoinerState {
    ctx: CTX
    frame: StackFrame
    inputs: Record<string, StackFrame[]>
}

export class InputsFilterJoiner {
    private ctx: CTX
    private frame: StackFrame
    private inputs: Record<string, StackFrame[]>

    // track join or aggregate completion to prevent more than one operation
    private completed: string | null = null


    static create(ctx: CTX, frame: StackFrame) {
        const inputs = _.clone(ctx._this._invocations)
        return new InputsFilterJoiner({
            ctx,
            frame,
            inputs,
        })
    }

    protected constructor(state: JoinerState) {
        this.ctx = state.ctx
        this.frame = state.frame
        this.inputs = state.inputs
    }

    guardJoinOrAggregateStillPossible() {
        if (this.completed) {
            throw new BadCanvasInstruction(`You can't aggregate or join after having already used ${this.completed}.`)
        }
    }

    get aggregate() {
        this.guardJoinOrAggregateStillPossible()
        if (!this.frame.is_aggregating) {
            throw new InputsNotFullfilled(true)
        }
        const new_inputs = _.flatten(
            Object.values(this.inputs).map((invocations) => invocations.map((invocation) => invocation.input))
        )
        const new_state = _.flatten(
            Object.values(this.inputs).map((invocations) => invocations.map((invocation) => invocation.state))
        )

        // reset inputs
        for (const edge_id of Object.keys(this.inputs)) {
            this.inputs[edge_id] = []
        }

        this.ctx.updateInput(new_inputs)
        this.ctx.updateState(new_state)
        this.completed = 'aggregate'
        const res =  Object.assign(() => this.ctx.input, this.resultAPI('input'))
        return res
    }

    private innerJoinFilter(field: 'state' | 'input', join_on_field: string | null | undefined) {
        if (join_on_field === null) {
            throw new BadCanvasInstruction(`You can't join using null.`)
        }

        const first_edge_match: {
            [edge: string]: StackFrame
        } = {}

        for (const edge_id of Object.keys(this.inputs)) {
            const match = this.inputs[edge_id].find((frame) => {
                let side_a = frame[field]
                let side_b = this.ctx[field]

                if (join_on_field !== undefined) {
                    side_a = frame[field]?.[join_on_field]
                    side_b = this.ctx[field]?.[join_on_field]
                }

                return side_a === side_b
            })
            if (match === undefined) {
                throw new InputsNotFullfilled(false)
            }
            first_edge_match[edge_id] = match
        }

        for (const edge_id of Object.keys(this.inputs)) {
            const index = this.ctx._this._invocations[edge_id].indexOf(first_edge_match[edge_id])
            if(index === -1) {
                continue
            }
            this.ctx._this._invocations[edge_id].splice(index, 1)
        }

        this.ctx.input = Object.values(first_edge_match).map((frame) => frame.input)
        this.ctx.state = Object.values(first_edge_match).map((frame) => frame.state)

        this.ctx.updateInput(this.ctx.input)
        this.ctx.updateState(this.ctx.state)
        this.completed = field === 'state' ? 'joinOnState' : 'joinOnInput'
        return this.resultAPI(field)
    }

    zipOnState(field?: string) {
        this.guardJoinOrAggregateStillPossible()
        this.guardInnerJoinReady()
        return this.innerJoinFilter('state', field)
    }

    zipOnInput(field?: string) {
        this.guardJoinOrAggregateStillPossible()
        this.guardInnerJoinReady()
        return this.innerJoinFilter('input', field)
    }

    private guardInnerJoinReady() {
        Object.entries(this.inputs).forEach(([key, invocations]) => {
            if (invocations.length === 0) {
                // one edge is still not fullfilled
                throw new InputsNotFullfilled(false)
            }
        })
    }


    get inner() {
        return {
            input: (value: any) => {
                this.zipOnInput(value)
                return this.resultAPI('input')
            },
            state: (value: any) => {
                this.zipOnState(value)
                return this.resultAPI('state')

            },
        }
    }

    private resultAPI(field: 'state' | 'input') {
        const $this = this.ctx
        return {
            list() {
                return $this[field]
            },
            merge() {
                return _.merge({}, ...$this[field])
            }
        }
    }
}


