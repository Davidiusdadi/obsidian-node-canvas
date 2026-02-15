import {ExecutableCanvas} from "../../../src/runtime/ExecutableCanvas"
import {ONode} from "../../../src/compile/canvas-node-transform"
import {ZEdge} from "../../../src/compile/canvas-edge-transform"
import {z} from "zod"

export function createMockCanvas(
    nodes: ONode[],
    file: string = 'test.canvas'
): ExecutableCanvas {
    // Build node map
    const nodeMap = new Map<string, ONode>()
    nodes.forEach(node => nodeMap.set(node.id, node))

    // Attach edges to nodes
    const allEdges: z.output<typeof ZEdge>[] = []
    nodes.forEach(node => {
        allEdges.push(...node.edges)
    })

    // Each node needs to have references to edges that connect to it
    nodes.forEach(node => {
        const incomingEdges = allEdges.filter(e => e.to === node.id && e.direction === 'forward')
        const outgoingEdges = allEdges.filter(e => e.from === node.id)
        node.edges = [...incomingEdges, ...outgoingEdges]
    })

    return new ExecutableCanvas(file, nodeMap)
}
