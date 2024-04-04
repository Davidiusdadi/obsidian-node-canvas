import {writable} from "svelte/store"
import {browser} from "$app/environment"
import type {DMsgCanvas} from "canvas-engine/src/runtime/dev-server/server"
import _ from "lodash"
import type {ONode} from "canvas-engine/src/compile/canvas-node-transform"

export type FNode = {
    type: 'FNode'
    id: string,
    position: { x: number, y: number },
    data: ONode
}

export type FEdge = { id: string, source: string, target: string, sourceHandle: string, targetHandle: string}

export const nodes = writable<FNode[]>([]);
export const edges = writable<FEdge[]>([]);


function startClient() {
    const ws = new WebSocket('ws://localhost:9763');

    ws.onmessage = function (event) {
        const data: DMsgCanvas = JSON.parse(event.data);
        console.log('Received:', data)
        if(!data.canvas) {
            console.log('No canvas data')
            return
        }

        console.log('Canvas data:', data.canvas)
        let new_edges: FEdge[] = []
        const new_nodes: FNode[] = data.canvas?.nodes.map((node) => {


            for(const edge of node.edges) {
                new_edges.push({
                    id: edge.id,
                    source: edge.from,
                    target: edge.to,
                    sourceHandle: `${edge.from}-${edge.orginal.fromSide!}-source`,
                    targetHandle: `${edge.to}-${edge.orginal.toSide!}-target`
                })
            }
            return {
                type: 'FNode',
                id: node.id,
                position: {x: node.original.x, y: node.original.y},
                data: node
            } satisfies FNode
        } )

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

if(browser) {
    startClient()
}

