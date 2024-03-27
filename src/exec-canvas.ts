import {CNode, ZEdge} from "./node/types"
import {CTX} from "./node/code_to_fn"
import z from "zod"
import {logger} from "./globals"
import {ParsedCanvas} from "./parse-canvas"


export async function execCanvas(node_data: ParsedCanvas) {
    const instr = [...node_data.values()]
    const start = instr.filter(ins => ins.type === 'start')
    if (start.length !== 1) {
        throw new Error(`no unique start node found: found ${start.length}`)
    }


    const stack: { node: CNode, input: any }[] = [{
        node: start[0],
        input: undefined
    }]

    const ctx: CTX = {
        emit: () => undefined,
        input: undefined
    }

    const stack_push = (edges: z.output<typeof ZEdge>[], value: any, back = false) => {
        const insert = edges.map(e => {
            const node = node_data.get(e.to)!
            return {
                node: node,
                input: value
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

        const {node, input} = frame


        const {fn, ...node_debug} = node
        logger.debug('executing node: ', {
            ...node_debug,
            edges: node_debug.edges.length
        })


        const edges_default_out = node.edges.filter((edge) => {
            return edge.direction === 'forward' && edge.from === node.id && (edge.label?.trim() || '').length === 0
        })


        if (node.fn) {
            ctx.input = input
            ctx.emit = (label: string, emission: any) => {
                console.log('emitting: ', label)
                const edges_label_out = node.edges.filter((edge) => {
                    return edge.direction === 'forward' && edge.from === node.id && edge.label?.trim() === label
                })

                stack_push(edges_label_out, emission)
            }
            return_value = await node.fn(ctx, input)
        }


        logger.debug(`following edges: ${edges_default_out.length}`)
        stack_push(edges_default_out, return_value)
    }
    console.log('execution complete')

}