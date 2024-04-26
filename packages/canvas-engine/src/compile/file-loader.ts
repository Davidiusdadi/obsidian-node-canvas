import {ONode} from "./canvas-node-transform"
import {ExecutionContext} from "./types"
import path from "node:path"
import {readFile} from "fs/promises"
import {parseCanvas} from "./parse-canvas"
import {CTX, Fn} from "../runtime/runtime-types"
import {ExecutableCanvas} from "../runtime/ExecutableCanvas"
import _ from "lodash"
import emitInput from "../node_library/magic-word/canvas-io/emit-input"
import {NodeReturnNotIntendedByDesign} from "../runtime/errors"
import emitState from "../node_library/magic-word/canvas-io/emit-state"
import {GlobalContext} from "../types"
import {OEdge} from "./canvas-edge-transform"
import inject, {InjectFn} from "../node_library/magic-word/canvas-io/inject"
import {DMsgCanvas} from "../runtime/inspection/protocol"

type FileNode = Extract<ONode, { type: 'file' }>

export async function loadFileNode(node: FileNode, ectx: ExecutionContext, gctx: GlobalContext): Promise<ONode> {
    const file = path.parse(node.file)

    if (gctx.loaded_files[node.file]) {
        return gctx.loaded_files[node.file]
    }
    let result_node: ONode
    if (file.ext === '.canvas') {
        const canvas_blueprint = new ExecutableCanvas(node.file, await parseCanvas(node.file, gctx));

        gctx.introspection?.inform({
            type: 'canvas',
            canvas: canvas_blueprint
        } satisfies DMsgCanvas)

        const fn: Fn = async (top_ctx: CTX) => {
            let sub_canvas: ExecutableCanvas = top_ctx._this._canvas_instance
            if (!top_ctx._this._canvas_instance) {
                sub_canvas = top_ctx._this._canvas_instance = _.cloneDeep(canvas_blueprint)

                sub_canvas.nodes.filter((node) => node.type === 'start').forEach((node) => {
                    top_ctx.injectFrame({
                        node,
                        input: undefined,
                        state: {},
                        internal_state: _.clone(top_ctx.frame.internal_state),
                        edge: null,
                        is_aggregating: false,
                        chart: sub_canvas,
                        // id and ctx will be added by the engine later
                    })
                })


                let overloads: {
                    top_jank_node: ONode,
                    top_jank_edge: OEdge
                }[] = []

                top_ctx.self_canvas_nodes.nodes.forEach((n) => {
                    const matches = n.edges.forEach((edge) => {
                        if (edge.direction === 'none' && (
                            edge.from === n.id || edge.to === n.id
                        ) && n.id !== node.id) {
                            overloads.push({
                                top_jank_node: n,
                                top_jank_edge: edge
                            })
                        }
                    })
                })

                sub_canvas.nodes.forEach((node) => {
                    if (node.type === 'code'
                    ) {

                        if (node.compiler?.lang === emitInput.lang
                            || node.compiler?.lang === emitState.lang) {
                            const sub_fn = node.fn
                            node.fn = function (sub_ctx) {
                                sub_fn.call(this, {
                                    ...sub_ctx,
                                    emit: (label, value) => {
                                        top_ctx.state = sub_ctx.state
                                        top_ctx.frame.internal_state = sub_ctx.frame.internal_state
                                        top_ctx.emit(label, value)
                                    }
                                })
                            }
                        } else if (node.compiler?.lang === inject.lang) {

                            const sub_fn = node.fn as InjectFn

                            const node_overloads = overloads.filter((jank) => {
                                return jank.top_jank_edge.label?.trim().toLowerCase() === sub_fn.inject_name
                            })

                            node.fn = function (sub_ctx: CTX) {
                                node_overloads.forEach((jank) => {
                                    const internal_state = _.clone(sub_ctx.frame.internal_state)
                                    internal_state.inject_return.push((xtx: CTX) => {
                                        //logger.debug('performing inject return', sub_ctx.frame.node.original)
                                        sub_ctx.state = xtx.state
                                        return sub_ctx.emit(undefined, xtx.input)
                                    })
                                    top_ctx.injectFrame({
                                        node: jank.top_jank_node,
                                        input: sub_ctx.input,
                                        state: sub_ctx.state,
                                        internal_state,
                                        edge: sub_ctx.frame.edge,
                                        is_aggregating: false,
                                        chart: top_ctx.frame.chart,
                                        // id and ctx will be added by the engine later
                                    })
                                })
                                throw new NodeReturnNotIntendedByDesign()
                            }
                        }

                    }
                })

            }

            const label = top_ctx.frame.edge?.label
            if (label) {
                sub_canvas.nodes.filter((node) => {
                    return node.type === 'code' && node.lang === 'on'
                }).forEach((node) => {
                    top_ctx.injectFrame({
                        node,
                        input: top_ctx.input,
                        state: top_ctx.state,
                        edge: top_ctx.frame.edge, // pass top edge so that the on node can look at the label
                        internal_state: _.clone(top_ctx.frame.internal_state),
                        is_aggregating: false,
                        chart: sub_canvas,
                        // id and ctx will be added by the engine later
                    })
                })
            }


            throw new NodeReturnNotIntendedByDesign()
        }
        result_node = {
            ...node,
            fn,
            canvas: canvas_blueprint
        }
    } else if (file.ext === '.md') {
        type TargetType = Extract<ONode, { type: 'text' }>
        const full_path = path.join(ectx.vault_dir, node.file)
        const contents = await readFile(full_path)
        result_node = {
            ...node,
            type: 'text',
            code: contents.toString(),
        }  satisfies TargetType
    } else {
        result_node = {
            ...node,
            comment: 'file type not supported'
        }
    }

    gctx.loaded_files[node.file] = result_node
    return result_node

}