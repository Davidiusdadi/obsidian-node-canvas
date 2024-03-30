import {ONode, ZEdge} from "../compile/node/node-transform"
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


    let stack: StackFrame[] = [{
        node: start[0],
        input: undefined,
        state: {},
        edge: null,
        is_aggregating: false
    }]

    const node_this_data = new Map<string, FnThis>()
    const node_ancestors = new Map<string, Set<string>>()

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

        const ancestors = collect_ancestor(instr, node)
        node_ancestors.set(node.id, ancestors)
    })

    const ctx: CTX = {
        emit: () => undefined,
        input: undefined,
        state: object,
        vault_dir: context.vault_dir,
        inputs: [undefined],
        // _this will be set during node execution
        _this: {} as any,
        onodes: instr,
        onode: {} as any // will be set during node execution
    }

    const stack_push = (edges: z.output<typeof ZEdge>[], value: any) => {
        const insert = edges.map(e => {
            const node = node_data.get(e.to)!
            return {
                node: node,
                input: value,
                state: _.cloneDeep(ctx.state),
                edge: e,
                is_aggregating: false
            } satisfies StackFrame
        })
        insert.forEach(frame => {
            node_this_data.get(frame.node.id)!._invocations[frame.edge.id!]!.push(frame)
            const already_aggregating = stack.some((sf) => sf.node === frame.node && sf.is_aggregating)
            if (!already_aggregating) {
                stack.unshift(frame)
            }
        })


    }

    while (true) {
        let return_value: any | undefined | null

        let frame: StackFrame | undefined


        const all_aggregations = stack.filter((frame) => frame.is_aggregating)
        const first_ready_aggregation = all_aggregations
            .find((frame) => {
                const ancestors = node_ancestors.get(frame.node.id)!
                return stack.every((frame) => !ancestors.has(frame.node.id))
            })


        if(first_ready_aggregation ) {
            // finish off running aggregations first
            frame = first_ready_aggregation
            // remove this frame from stack
            // AND remove all other frames for that node (as they would also turn into aggregations)
            stack = stack.filter((f) => f !== first_ready_aggregation && f.node.id !== first_ready_aggregation.node.id)
        } else {
            // otherwise run non-aggregations aka normal emissions
            const non_aggregations = stack.filter((frame) => !frame.is_aggregating)
            frame = stack.shift()
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
            const this_data = node_this_data.get(node.id)!
            ctx._this = this_data
            ctx.state = state
            ctx.input = input
            ctx.onode = node
            this_data.join = InputsFilterJoiner.create(ctx, frame)
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
        stack_push(edges_default_out, return_value)
    }
    console.log('execution complete')

}


/** collects and returns ancestor_node_ids */
function collect_ancestor(all_nodes: ONode[], node: ONode, ancestor_node_ids: Set<string> = new Set<string>()) {

    if (ancestor_node_ids.has(node.id)) {
        return ancestor_node_ids
    }

    const edges_in = node.edges
        .filter((edge) => {
            return edge.direction === 'forward' && edge.to === node.id
        }).map(e => e.from)

    const parents = all_nodes.filter(n => edges_in.includes(n.id))

    for (const parent of parents) {
        ancestor_node_ids.add(parent.id)
    }

    for (const parent of parents) {
        collect_ancestor(all_nodes, parent, ancestor_node_ids)
    }

    return ancestor_node_ids

}