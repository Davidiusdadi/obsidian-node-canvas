import {derived, get, writable,} from "svelte/store"
import {browser} from "$app/environment"
import _ from "lodash"
import type {ONode} from "canvas-engine/src/compile/canvas-node-transform"
import {type Edge, MarkerType, type Node} from "@xyflow/svelte"
import {color} from "$lib/color"
import {
    type MsgInspector2Runner,
    type MsgRunner2Inspector,
    type zRFrame
} from "canvas-engine/src/runtime/inspection/protocol"
import * as Flatted from 'flatted'

export const chart_path = writable<string>('')

type Chart = {
    nodes: Node<ONode>[],
    edges: Edge[],
    path: string
}

const charts = writable<Chart[]>([])


export const chart_list = derived(charts, ($charts) => {
    return $charts.map((c) => c.path)
})


export const nodes = writable<Node<ONode>[]>([]);
export const edges = writable<Edge[]>([]);


derived([charts, chart_path], (both) => {
    return both
}).subscribe(([charts, path]) => {
    const c = charts.find((c) => c.path === path)
    if (c) {
        nodes.set(c.nodes)
        edges.set(c.edges)
    }
})


export const stack = writable<zRFrame[]>([])
export const this_step_frame = writable<zRFrame | null>(null)
export const messages = writable<MsgRunner2Inspector[]>([])

let ws: WebSocket

export const sendToRunner = (msg: MsgInspector2Runner) => {
    console.log('Sending:', msg)
    ws.send(Flatted.stringify(msg))
}

export const last_message = writable<MsgRunner2Inspector>()

function startClient() {
    ws = new WebSocket('ws://localhost:9763');

    ws.onmessage = function (event) {
        const data: MsgRunner2Inspector = Flatted.parse(event.data);

        console.log('Received:', data)

        last_message.set(data)
        if (data.type !== 'canvas') {

            if (data.type === 'frame-upsert') {
                stack.update((s) => {
                    return [...s.filter(f => f.id !== data.frame.id), data.frame]
                })
            } else if (data.type === 'frame-complete') {
                stack.update((s) => s.filter((f) => f.id !== data.frame_id))
            } else if (data.type === 'runner-state') {
                console.log('Runner state:', data.state)
            } else if (data.type === 'frame-step') {
                this_step_frame.set(get(stack).find((f) => f.id === data.frame_id) || null)
            } else {
                // push on stack
                messages.update((s) => [...s, data])
            }

            return
        }

        if (data.type === 'canvas') {
            console.log('Canvas data:', data.canvas)
            let new_edges: Edge[] = []
            const new_nodes: Node<ONode>[] = data.canvas?.nodes.map((node) => {


                for (const edge of node.edges) {
                    const e: Edge = {
                        id: edge.id,
                        source: edge.from,
                        target: edge.to,
                        sourceHandle: `${edge.from}-${edge.orginal.fromSide!}-source`,
                        targetHandle: `${edge.to}-${edge.orginal.toSide!}-target`,
                        style: ` stroke-width: 2px; stroke: ${color(edge.orginal.color)};`,
                        label: edge.orginal.label,
                        labelStyle: 'font-size: 16px; background-color: white; padding: 2px; border-radius: 4px;',
                        deletable: false,
                        type: 'bezier',
                    }

                    if (edge.orginal.fromEnd === 'arrow') {
                        e.markerStart = {
                            type: MarkerType.ArrowClosed,
                            height: 15,
                            width: 15,
                            color: color(edge.orginal.color)

                        }
                    }
                    if (edge.orginal.toEnd === 'arrow') {
                        e.markerEnd = {
                            type: MarkerType.ArrowClosed,
                            height: 15,
                            width: 15,
                            color: color(edge.orginal.color)
                        }
                    }
                    new_edges.push(e)
                }
                return {
                    type: 'FNode',
                    id: node.id,
                    position: {x: node.original.x, y: node.original.y},
                    data: node,
                    draggable: false,
                    //origin: [ 0.5, 0.5],
                    deletable: false,
                    width: node.original.width,
                    height: node.original.height,
                } satisfies Node<ONode>
            })

            new_edges = _.uniqBy(new_edges, 'id')


            //nodes.set(new_nodes)
            //edges.set(new_edges)

            charts.update((charts: Chart[]) => {
                const existing = charts.findIndex((c) => c.path === data.canvas.file)
                if (existing === -1) {
                    charts.push({
                        nodes: new_nodes,
                        edges: new_edges,
                        path: data.canvas.file
                    })
                } else {
                    charts.splice(existing, 1, {
                        nodes: new_nodes,
                        edges: new_edges,
                        path: data.canvas.file
                    })
                }
                return charts

            })


            chart_path.update(p => {
                if (p) {
                    return p
                }
                if (data.is_start_canvas) {
                    return data.canvas.file
                }
                return p
            })

            console.log('edges:', new_edges)
        }


    };

    ws.onopen = function (event) {
        console.log('Connected to server')
    };

    ws.onclose = function (event) {
        console.log('Disconnected from server')
    }
    ws.onerror = function (event) {
        console.log('Websocket Error:', event)
    }
}

if (browser) {
    startClient()
}

