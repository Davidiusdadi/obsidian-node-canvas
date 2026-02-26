import {z} from "zod"
import {ZEdge} from "../../../src/compile/canvas-edge-transform"

let edgeIdCounter = 0

export function createEdge(
    from: string,
    to: string,
    label?: string,
    direction: 'forward' | 'backward' | 'none' = 'forward'
): z.output<typeof ZEdge> {
    return {
        id: `edge_${++edgeIdCounter}`,
        type: 'arrow',
        from,
        to,
        label: label ?? '',
        direction,
        orginal: {} as any
    }
}

export function resetEdgeCounter() {
    edgeIdCounter = 0
}
