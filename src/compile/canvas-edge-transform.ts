import {z} from "zod"

const zEdgeEnd = z.enum(['none', 'arrow'])
export const ZEdge = z.object({
    id: z.string(),
    fromNode: z.string(),
    //fromSide: zEdgeSide.optional(),
    fromEnd: zEdgeEnd.default('none'),
    toNode: z.string(),
    //toSide: zEdgeSide.optional(),
    toEnd: zEdgeEnd.default('arrow'),
    //color: z.string().optional(),
    label: z.string().optional()
}).strip().transform((v) => {
    let direction: 'forward' | 'backward' | 'none' | 'bi' = 'none'
    if (v.fromEnd === 'arrow' && v.toEnd === 'none') {
        direction = 'backward'
    } else if (v.fromEnd === 'none' && v.toEnd === 'arrow') {
        direction = 'forward'
    } else if (v.fromEnd === 'arrow' && v.toEnd === 'arrow') {
        direction = 'bi'
    }

    return {
        id: v.id,
        'type': 'arrow',
        from: v.fromNode,
        to: v.toNode,
        label: v.label,
        direction
    }
})
export type OEdge = z.output<typeof ZEdge>