import {writable} from "svelte/store"
import {browser} from "$app/environment"
import type {DMsgCanvas} from "canvas-engine/src/runtime/dev-server/server"
import _ from "lodash"
import type {ONode} from "canvas-engine/src/compile/canvas-node-transform"
import type {Edge, Node} from "@xyflow/svelte"
import {MarkerType} from "@xyflow/svelte"


export const nodes = writable<Node<ONode>[]>([]);
export const edges = writable<Edge[]>([]);


function startClient() {
    const ws = new WebSocket('ws://localhost:9763');

    ws.onmessage = function (event) {
        const data: DMsgCanvas = JSON.parse(event.data);
        console.log('Received:', data)
        if (!data.canvas) {
            console.log('No canvas data')
            return
        }

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
                    style: ' stroke-width: 1px; ',
                    label: edge.orginal.label,
                    labelStyle: 'font-size: 16px; background-color: white; padding: 2px; border-radius: 4px;',
                    deletable: false,
                    type: 'bezier',
                }

                if(edge.orginal.fromEnd === 'arrow') {
                    e.markerStart = {
                        type: MarkerType.Arrow,
                        height: 10,
                        width: 10,
                        strokeWidth: 40,
                        color: 'black'

                    }
                }
                if(edge.orginal.toEnd === 'arrow') {
                    e.markerEnd = {
                        type: MarkerType.Arrow,
                        height: 30,
                        width: 30,
                        strokeWidth: 2,

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
                deletable: false
            } satisfies Node<ONode>
        })

        new_edges = _.uniqBy(new_edges, 'id')


        nodes.set(new_nodes)
        edges.set(new_edges)

        console.log('edges:', new_edges)


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

