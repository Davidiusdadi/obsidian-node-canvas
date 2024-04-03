import {InputsFilterJoiner} from "./joins"
import z, {object} from "zod"
import _ from "lodash"
import {logger} from "../globals"

import {GlobalContext} from "../types"
import chalk from "chalk"
import {ZEdge} from "../compile/canvas-edge-transform"
import {CTX, StackFrame} from "./runtime-types"
import {InputsNotFullfilled} from "./errors"
import {ExecutableCanvas} from "./ExecutableCanvas"

/**
 * This holds the main execution loop.
 * It receives fully parsed and configured nodes ready for execution.
 **/
export async function execCanvas(inital_canvas: ExecutableCanvas, context: GlobalContext) {


    let stack: StackFrame[] = []

    const ctx: CTX = {
        emit: () => undefined,
        input: undefined,
        state: object,
        vault_dir: context.vault_dir,
        inputs: [undefined],
        _this: {} as any,  // _this will be set during node execution
        self_canvas_nodes: {} as any,  // will be set during node execution
        self_canvas_node: {} as any, // will be set during node execution
        updateInput: (input) => ctx.input = input,
        updateState: (state) => ctx.state = state,
        injectFrame: (frame: StackFrame) => stack.push(frame)
    }


    inital_canvas.nodes.filter((node) => node.type === 'start').forEach((node) => {
        ctx.injectFrame({
            node,
            input: undefined,
            state: {},
            edge: null,
            is_aggregating: false,
            chart: inital_canvas
        })
    })

    if (stack.length === 0) {
        throw new Error(`no start point for execution found in canvas`)
    }

    const stack_push = (source_frame: StackFrame, edges: z.output<typeof ZEdge>[], value: any) => {
        const insert = edges.map(e => {
            const node = source_frame.chart.node_map.get(e.to)!
            return {
                node: node,
                input: value,
                state: _.clone(ctx.state),
                edge: e,
                is_aggregating: false,
                chart: source_frame.chart
            } satisfies StackFrame
        })
        insert.forEach(frame => {
            source_frame.chart.node_this_data.get(frame.node.id)!._invocations[frame.edge.id!]!.push(frame)
            const already_aggregating = stack.some((sf) => sf.node === frame.node && sf.is_aggregating)
            if (!already_aggregating) {
                stack.push(frame)
            }
        })
    }

    while (true) {
        let return_value: any | undefined | null

        let frame: StackFrame | undefined


        const all_aggregations = stack.filter((frame) => frame.is_aggregating)
        const first_ready_aggregation = all_aggregations
            .find((frame) => {
                const ancestors = frame.chart.node_ancestors.get(frame.node.id)!
                return stack.every((frame) => !ancestors.has(frame.node.id))
            })


        if (first_ready_aggregation) {
            // finish off running aggregations first
            frame = first_ready_aggregation
            // remove this frame from stack
            // AND remove all other frames for that node (as they would also turn into aggregations)
            stack = stack.filter((f) => f !== first_ready_aggregation && f.node.id !== first_ready_aggregation.node.id)
        } else {
            // otherwise run non-aggregations aka normal emissions
            const non_aggregations = stack.filter((frame) => !frame.is_aggregating)
            frame = non_aggregations[0]
            stack.splice(stack.indexOf(frame), 1)
        }

        if (!frame && all_aggregations.length > 0) {
            throw new Error('aggregation deadlock')
        }

        if (!frame) {
            break // normal EOF program
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
            const this_data = frame.chart.node_this_data.get(node.id)!
            ctx._this = this_data
            ctx.state = state
            ctx.input = input
            ctx.self_canvas_node = node
            ctx.self_canvas_nodes = frame.chart
            this_data.join = InputsFilterJoiner.create(ctx, frame)
            ctx.emit = (label: string, emission: any) => {
                logger.debug('emitting: ', label, emission)
                const edges_label_out = node.edges.filter((edge) => {
                    return edge.direction === 'forward' && edge.from === node.id && edge.label?.trim() === label
                })

                stack_push(frame!, edges_label_out, emission)
            }

            frame.chart.node_this_data.set(node.id, this_data)
            try {
                return_value = await node.fn.call(this_data, ctx, input)
            } catch (e) {
                if (e instanceof InputsNotFullfilled) {
                    if (e.is_aggregating) {
                        frame.is_aggregating = true
                        stack.unshift(frame)
                    }
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
        stack_push(frame, edges_default_out, return_value)
    }

}


