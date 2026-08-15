import {InputsFilterJoiner} from "./joins"
import z from "zod"
import _ from "lodash"
import {logger} from "../globals"

import {GlobalContext, InvocationResult, MINT_LABEL} from "../types"
import chalk from "chalk"
import {ZEdge} from "../compile/canvas-edge-transform"
import {CTX, StackFrame} from "./runtime-types"
import {DeadlineExceeded, InputsNotFullfilled, NodeReturnNotIntendedByDesign} from "./errors"
import {ExecutableCanvas} from "./ExecutableCanvas"
import {zRFrameComplete, zRFrameNew} from "./inspection/protocol"

export type ExecCanvasOptions = {
    /** Seeds every start frame's `input`. Without this the only way anything
     *  reaches a start node is the `on-resource-event` tunnel, which makes a
     *  canvas un-parameterizable — a flow that takes arguments needs its
     *  arguments to BE the input. `current_event` stays untouched for compat. */
    initial_input?: any
}

/**
 * This holds the main execution loop.
 * It receives fully parsed and configured nodes ready for execution.
 **/
export async function execCanvas(inital_canvas: ExecutableCanvas, gctx: GlobalContext, options?: ExecCanvasOptions) {


    const stack = gctx.stack
    let frame_id = 0


    let active_frame_modified = promiseWithResolver<'modified'>()
    const active_frames = gctx.active_frames


    const push_frame = (frame: StackFrame) => {
        if (frame.id === undefined) {
            frame.id = ++frame_id
        }
        logger.trace(`<frame ${frame.id} created from frame ${frame.parent} >`)
        stack.push(frame)
        //logger.debug(`push_frame:  --[${frame.edge?.label ?? '-'}]-->`)
        gctx.introspection?.inform({
            type: 'frame-upsert',
            frame,
        } satisfies z.input<typeof zRFrameNew>)

        active_frame_modified.resolve('modified')

    }

    inital_canvas.nodes.filter((node) => node.type === 'start').forEach((node) => {
        push_frame({
            parent: -1,
            node,
            input: options?.initial_input,
            state: {},
            internal_state: {
                inject_return: []
            },
            edge: null,
            is_aggregating: false,
            chart: inital_canvas,
        })
    })

    if (stack.length === 0) {
        throw new Error(`no start point for execution found in canvas`)
    }

    const emit_along_edges = (source_frame: StackFrame, edges: z.output<typeof ZEdge>[], value: any) => {
        let emissions = 0
        const insert = edges.map(e => {
            const node = source_frame.chart.node_map.get(e.to)!
            return {
                id: ++frame_id,
                parent: source_frame.id!,
                node: node,
                input: value,
                state: _.clone(source_frame.ctx!.state),
                internal_state: _.clone(source_frame.internal_state),
                edge: e,
                is_aggregating: false,
                chart: source_frame.chart
            } satisfies StackFrame
        })
        insert.forEach(frame => {
            const already_aggregating = [
                ...active_frames.map(f => f.frame),
                ...stack
            ].some((sf) => sf.node === frame.node && sf.is_aggregating)
            if (!already_aggregating) {
                emissions++
                push_frame(frame)
            }
            source_frame.chart.node_this_data.get(frame.node.id)!._invocations[frame.edge.id!]!.push(frame)
        })
        return emissions
    }


    const pop_frame = () => {
        let frame: StackFrame | null = null


        const all_aggregations = stack.filter((frame) => frame.is_aggregating)
        const first_ready_aggregation = all_aggregations
            .find((frame) => {
                const ancestors = frame.chart.node_ancestors.get(frame.node.id)!
                const not_on_stack = stack.every((frame) => !ancestors.has(frame.node.id))
                const no_active_ancestors = active_frames
                    .every((f) => {
                        return f.frame === frame || !ancestors.has(f.frame.node.id)
                    })

                // Also check that no other frames for the SAME node are still executing
                // The aggregate should only complete when ALL frames for this node have finished their initial execution
                const no_sibling_frames = active_frames
                    .every((f) => {
                        return f.frame === frame || f.frame.node !== frame.node
                    })

                return not_on_stack && no_active_ancestors && no_sibling_frames
            })


        if (first_ready_aggregation) {
            // finish off running aggregations first
            frame = first_ready_aggregation
            // remove this frame from stack
            // AND remove all other frames for that node (as they would also turn into aggregations)
            //stack = stack.filter((f) => f !== first_ready_aggregation && f.node.id !== first_ready_aggregation.node.id)
            _.remove(stack, (f) => f.node.id === first_ready_aggregation.node.id).forEach((f) => {
                if (f !== frame) {
                    gctx.introspection?.inform({
                        type: 'frame-complete',
                        frame: f,
                        reason: 'aggregation',
                        was_invoked: false,
                        return_canceled: false,
                        return_emissions: 0
                    } satisfies z.input<typeof zRFrameComplete>)
                }
            })

        } else {
            // otherwise run non-aggregations aka normal emissions
            const non_aggregations = stack.filter((frame) => !frame.is_aggregating)
            frame = non_aggregations[0] ?? null
            stack.splice(stack.indexOf(frame), 1)
        }

        /* if (!frame && all_aggregations.length > 0) {
             throw new Error('aggregation deadlock')
         }*/

        return frame
    }

    const invoke_frame = async (frame: StackFrame): Promise<InvocationResult> => {
        const {input, state} = frame

        await gctx.introspection?.inform({
            type: 'frame-upsert',
            frame,
        } satisfies z.input<typeof zRFrameNew>)

        await gctx.introspection?.inform({
            type: 'frame-step',
            frame_id: frame.id!,
        })

        const edges_default_out = frame.node.edges.filter((edge) => {
            if (edge.direction !== 'forward') {
                return false
            }

            if (edge.from === frame.node.id && (edge.label?.trim() || '').length === 0) {
                return true
            }

            const target_node = frame!.chart.node_map.get(edge.to)
            if (!target_node) {
                return false
            }
            if (target_node.type === 'file' && target_node.file.endsWith('.canvas')) {
                return true
            }


            return false
        })


        const this_data = frame.chart.node_this_data.get(frame.node.id)!
        const ctx: CTX = {
            input: input,
            state: state,
            vault_dir: gctx.vault_dir,
            _this: this_data,
            self_canvas_nodes: frame.chart,  // will be set during node execution
            get self_canvas_node() {
                return frame.node
            }, // will be set during node execution
            updateInput: (input) => ctx.input = input,
            updateState: (state) => ctx.state = state,
            injectFrame: (frame: StackFrame) => push_frame(frame),
            emit: (label: string | undefined, emission: any) => {
                logger.trace(`<frame ${frame.id} emitting: [${label ?? '-'}] >`)
                logger.debug('emitting: ', label, emission)
                // The OUTPUT SINK. `mint` is collected regardless of wiring, so a
                // one-node canvas can produce results without an outgoing edge —
                // and it still travels the labelled edges below, so a canvas that
                // wants to post-process its own mints can.
                if (label === MINT_LABEL) {
                    gctx.minted.push(emission)
                }
                const edges_label_out = frame.node.edges.filter((edge) => {
                    return edge.direction === 'forward' && edge.from === frame.node.id && edge.label?.trim() === label
                })
                emit_along_edges(frame!, edges_label_out, emission)
            },
            gctx: gctx,
            frame
        }

        frame.ctx = ctx

        ctx.join = InputsFilterJoiner.create(ctx, frame)


        frame.chart.node_this_data.set(frame.node.id, this_data)

        logger.debug('exec frame:', `${frame.id}   --[${frame.edge?.label ?? '-'}]-->(${frame.node.type}: lang: ${(frame.node as any)?.lang}) :: ${chalk.gray((frame.node as any)?.code ?? '<no-code>')}`)

        try {
            const return_value = await frame.node.fn.call(this_data, ctx)
            const return_emissions = emit_along_edges(frame, edges_default_out, return_value)
            return {
                type: 'frame-complete',
                frame,
                return_emissions,
                reason: 'pass',
                return_canceled: false,
                was_invoked: true,
                return_value
            } satisfies z.input<typeof zRFrameComplete>
        } catch (e) {
            if (e instanceof NodeReturnNotIntendedByDesign) {
                return {
                    type: 'frame-complete',
                    frame,
                    return_canceled: true,
                    reason: 'no-return-intended',
                    was_invoked: true,
                    return_emissions: 0
                } satisfies z.input<typeof zRFrameComplete> // for some nodes a final return does not make sense
            } else if (e instanceof InputsNotFullfilled) {
                if (e.is_aggregating) {
                    frame.is_aggregating = true
                } else {
                    return {
                        type: 'frame-complete',
                        frame,
                        reason: 'not-ready',
                        return_canceled: false,
                        was_invoked: false,
                        return_emissions: 0
                    } satisfies z.input<typeof zRFrameComplete>
                }
                return {type: 'frame-pushback', frame} // not an error
            } else if (frame.node.type === 'code') {
                logger.error(`error running code-node [${chalk.greenBright(frame.node.lang)}]: \n': ${chalk.blue(frame.node.code)}`)
            } else {
                logger.error('error in node:', JSON.stringify(frame.node, null, 2))
            }
            console.error('(trace): input', frame.input)
            console.error('(trace): state', frame.state)
            // Tell the inspector WHICH node died before the throw unwinds past
            // every consumer. Without this, `reason: 'error'` was a shape nothing
            // ever emitted and a viewer could only report "the run failed".
            gctx.introspection?.inform({
                type: 'frame-complete',
                frame,
                reason: 'error',
                return_canceled: true,
                was_invoked: true,
                return_emissions: 0,
                return_value: e instanceof Error ? e.message : String(e)
            } satisfies z.input<typeof zRFrameComplete>)
            throw e
        }

    }

    // The deadline. Two mechanisms, because either alone leaks: the loop-top
    // check catches a run that is busy but overrunning, and the racing signal
    // catches a run parked on a node that will never resolve (the engine cannot
    // cancel user code — see DeadlineExceeded for what the caller is promised).
    let deadline_timer: ReturnType<typeof setTimeout> | undefined
    const deadline_signal: Promise<'deadline'> | null = gctx.deadline === undefined
        ? null
        : new Promise<'deadline'>((resolve) => {
            deadline_timer = setTimeout(() => resolve('deadline'), Math.max(0, gctx.deadline! - Date.now()))
            // Never hold the process open for a deadline that is only a backstop.
            ;(deadline_timer as any)?.unref?.()
        })
    const past_deadline = () => gctx.deadline !== undefined && Date.now() > gctx.deadline

    try {
        parallel_execution: {
            let last_ctx: CTX | null = null
            let last_return_value: any | undefined | null

            activity: while (true) {

                logger.trace(`<stats: active: ${active_frames.length}; queue: ${stack.length}>`)

                if (past_deadline()) {
                    throw new DeadlineExceeded(gctx.deadline!)
                }

                if (active_frames.length > 0) {
                    const activity_completed = await Promise.race([
                        ...active_frames.map(f => f.promise),
                        active_frame_modified.promise,
                        ...(deadline_signal ? [deadline_signal] : [])
                    ])

                    if (activity_completed === 'deadline') {
                        throw new DeadlineExceeded(gctx.deadline!)
                    } else if (activity_completed === 'modified') {
                        logger.trace('<modivied active active_frames>')
                        active_frame_modified = promiseWithResolver<'modified'>()
                        // go on and start a new frame if possible
                    } else if (activity_completed.type === 'frame-complete') {
                        logger.trace(`<frame: ${activity_completed.frame.id} fully complete >`)
                    } else if (activity_completed.type === 'frame-pushback') {
                        // nothing to do
                    } else {
                        logger.error('unexpected activity_completed', activity_completed)
                        throw new Error('unexpected activity_completed')
                    }

                }
                //await new Promise((resolve) => setTimeout(resolve, 1000))
                while (active_frames.length < (gctx.parallel ?? 100)) {
                    const frame = pop_frame()

                    if (frame === null) {
                        if (active_frames.length > 0 || stack.length > 0) {
                            continue activity;// wait for more frames to complete
                        } else {
                            break activity // end of execution
                        }
                    }
                    logger.trace(`<frame ${frame?.id} invoking>`)

                    const activity = invoke_frame(frame).then(ac => {
                        // avoiding a reassigning active_frames
                        let splice_index = active_frames.findIndex(({frame: f}) => f === frame)
                        if (splice_index !== -1) {
                            active_frames.splice(splice_index, 1)
                        }

                        if (ac.type === 'frame-pushback') {
                            logger.trace(`<frame ${ac.frame.id} pushback [${ac.frame.is_aggregating ? 'aggs' : 'zip'}]' >`)
                            if (ac.frame.is_aggregating) {
                                stack.unshift(frame)
                            }
                        }
                        if (ac.type === 'frame-complete') {
                            logger.trace(`<frame ${frame.id} complete>`)
                            gctx.introspection?.inform(ac)
                            last_ctx = ac.frame.ctx
                            last_return_value = ac.return_value
                        }
                        return ac
                    })

                    active_frames.push({
                        frame,
                        promise: activity
                    })
                }
            }

            return {
                /** Whichever frame finished LAST — a debugging convenience, not a
                 *  results contract. Anything that needs "what did this run produce"
                 *  reads `minted`. */
                return_value: last_return_value,
                last_ctx,
                /** The output sink: every `ctx.emit('mint', …)`, in emission order. */
                minted: gctx.minted,
                /** Whatever a node put on `gctx.summary` (run coordinates). */
                summary: gctx.summary
            }
        }
    } finally {
        if (deadline_timer !== undefined) clearTimeout(deadline_timer)
    }
}


function promiseWithResolver<T = unknown>() {
    let resolve: (value: T) => void
    const promise = new Promise<T>((_resolve, _reject) => {
        resolve = _resolve
    })
    return {
        promise,
        resolve: resolve!
    }
}