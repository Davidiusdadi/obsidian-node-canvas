import {ONode, ZEdge} from "../compile/node/node-transform"
import {CTX} from "../compile/node/code_to_fn"
import z, {object} from "zod"
import _ from "lodash"
import {logger} from "../globals"

import {GlobalContext, ParsedCanvas} from "../types"


export async function execCanvas(node_data: ParsedCanvas, context: GlobalContext) {
    const instr = [...node_data.values()]
    const start = instr.filter(ins => ins.type === 'start')
    if (start.length !== 1) {
        throw new Error(`no unique start node found: found ${start.length}`)
    }


    const stack: { node: ONode, input: any,  state: object }[] = [{
        node: start[0],
        input: undefined,
        state: {}
    }]

    const node_this_data = new Map<string, object>()

    const ctx: CTX = {
        emit: () => undefined,
        input: undefined,
        state: object,
        vault_dir: context.vault_dir
    }

    const stack_push = (edges: z.output<typeof ZEdge>[], value: any, back = false) => {
        const insert = edges.map(e => {
            const node = node_data.get(e.to)!
            return {
                node: node,
                input: value,
                state: _.cloneDeep(ctx.state)
            }
        })
        if (back) {
            stack.push(...insert)
        } else {
            stack.unshift(...insert)
        }

    }

    while (true) {
        let return_value: any | undefined | null
        const frame = stack.shift()
        if (!frame) {
            break
        }

        const {node, input, state} = frame


        const {fn, ...node_debug} = node
        logger.debug('executing node: ', {
            ...node_debug,
            edges: node_debug.edges.length
        })


        const edges_default_out = node.edges.filter((edge) => {
            return edge.direction === 'forward' && edge.from === node.id && (edge.label?.trim() || '').length === 0
        })


        if (node.fn) {
            ctx.state = state
            ctx.input = input
            ctx.emit = (label: string, emission: any) => {
                console.log('emitting: ', label, emission)
                const edges_label_out = node.edges.filter((edge) => {
                    return edge.direction === 'forward' && edge.from === node.id && edge.label?.trim() === label
                })

                stack_push(edges_label_out, emission)
            }
            const this_data = node_this_data.get(node.id) ?? {}
            node_this_data.set(node.id,this_data)
            return_value = await node.fn.call(this_data, ctx, input)

        }


        logger.debug(`following edges: ${edges_default_out.length}`)
        stack_push(edges_default_out, return_value)
    }
    console.log('execution complete')

}