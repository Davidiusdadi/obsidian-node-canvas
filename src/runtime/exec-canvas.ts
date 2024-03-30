import {OEdge, ONode, ZEdge} from "../compile/node/node-transform"
import {CTX, FnThis, InputsFilterJoiner, InputsNotFullfilled, StackFrame} from "../compile/node/code_to_fn"
import z, {object} from "zod"
import _ from "lodash"
import {logger} from "../globals"

import {GlobalContext, ParsedCanvas} from "../types"
import chalk from "chalk"


export async function execCanvas(node_data: ParsedCanvas, context: GlobalContext) {
    const instr = [...node_data.values()]
    const start = instr.filter(ins => ins.type === 'start')
    if (start.length !== 1) {
        throw new Error(`no unique start node found: found ${start.length}`)
    }





    const stack: StackFrame[] = [{
        node: start[0],
        input: undefined,
        state: {},
        edge: null
    }]

    const node_this_data = new Map<string, FnThis>()

    // use nodes this context to keep track of invocations
    // which is useful for joining flows
    instr.forEach(node => {
        const node_this_init = {
            _invocations: Object.assign({}, ...node.edges.filter((edge) => {
                return edge.direction === 'forward' && edge.to === node.id
            }).map((edge) => {
                return {
                    [edge.id]: [] as any[]
                }
            }))
        } satisfies FnThis
        node_this_data.set(node.id, node_this_init)
    })

    const ctx: CTX = {
        emit: () => undefined,
        input: undefined,
        state: object,
        vault_dir: context.vault_dir,
        inputs: [undefined]
    }

    const stack_push = (edges: z.output<typeof ZEdge>[], value: any) => {
        const insert = edges.map(e => {
            const node = node_data.get(e.to)!
            return {
                node: node,
                input: value,
                state: _.cloneDeep(ctx.state),
                edge: e
            } satisfies StackFrame
        })
        stack.unshift(...insert)
        insert.forEach(frame => {
            node_this_data.get(frame.node.id)!._invocations[frame.edge.id!]!.push(frame)
        })

    }

    while (true) {
        let return_value: any | undefined | null
        const frame = stack.shift()
        if (!frame) {
            break
        }

        const {node, input, state, edge} = frame


        const {fn, ...node_debug} = node
        logger.debug('executing node: ', {
            ...node_debug,
            edges: node_debug.edges.length
        })


        const edges_default_out = node.edges.filter((edge) => {
            return edge.direction === 'forward' && edge.from === node.id && (edge.label?.trim() || '').length === 0
        })


        if (node.fn) {
            const this_data = node_this_data.get(node.id)!
            ctx._this = this_data
            ctx.state = state
            ctx.input = input
            this_data.join =  new InputsFilterJoiner(ctx)
            ctx.emit = (label: string, emission: any) => {
                logger.debug('emitting: ', label, emission)
                const edges_label_out = node.edges.filter((edge) => {
                    return edge.direction === 'forward' && edge.from === node.id && edge.label?.trim() === label
                })

                stack_push(edges_label_out, emission)
            }

            node_this_data.set(node.id, this_data)
            try {
                return_value = await node.fn.call(this_data, ctx, input)
            } catch (e) {
                if( e instanceof InputsNotFullfilled) {
                    continue // not an error
                } else if (node.type === 'code') {
                    logger.error('error running code-node: \n', chalk.blue(node.code))
                } else {
                    logger.error('error in node:', JSON.stringify(node, null, 2))
                }
                throw e
            }
        }


        logger.debug(`following edges: ${edges_default_out.length}`)
        stack_push(edges_default_out, return_value)
    }
    console.log('execution complete')

}