/**
 * Defines canvas node transformations via zod.
 */
import {z} from 'zod'
import {Fn, js_to_fn} from "./code_to_fn"
import {ts_to_js} from "./ts_to_js"
import {yaml_to_fn} from "./yaml_to_fn"
import {logger} from "../../globals"


export interface ExecutionContext {
    vault_dir: string
    canvas_path: string
}


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

export const ZBaseNode = z.object({
    id: z.string(),
    edges: z.array(ZEdge).default([]),
    fn: z.undefined().optional()
        .transform((fn) => {
            return ((ctx, input) => input) satisfies Fn
        }),
})


export const ZNodeStart = ZBaseNode.extend({
    type: z.literal('text'),
    text: z.literal('start')
}).strip().transform((v) => {
    return {
        id: v.id,
        type: 'start' as const,
        edges: v.edges,
        fn: v.fn
    }
})

export const ZNodeUrl = ZBaseNode.extend({
    type: z.literal('link'),
    url: z.string().url()
}).strip().transform((v) => {
    return {
        id: v.id,
        type: 'url' as const,
        edges: v.edges,
        fn: () => {
            return v.url
        }
    }
})

export const ZEmpty = ZBaseNode.extend({
    id: z.string(),
    type: z.literal('text'),
    text: z.string().refine(s => s.trim().length === 0)
}).strip().transform((v) => {
    return {
        id: v.id,
        type: 'noop' as const,
        edges: v.edges,
        fn: v.fn
    }
})


export const ZGroup = ZBaseNode.extend({
    id: z.string(),
    type: z.literal('group'),

}).strip().transform((v) => {
    return {
        ...v
    }
})

export const ZCodeNode = ZBaseNode.extend({
    type: z.literal('code'),
    lang: z.enum(['js', 'ts', 'yaml', 'dataview', 'dataviewjs']),
    value: z.string()
}).strip().transform((v) => {

    return {
        type: 'code' as const,
        id: v.id,
        edges: v.edges,
        code: v.value,
        lang: v.lang,
        fn: v.fn
    }
})

// FIle
export const ZFile = ZBaseNode.extend({
    type: z.literal('file'),
    file: z.string(),
}).strip()

// https://bun.sh/docs/api/transpiler
// js / ts transpile

export const NodeVariant = z.union([
    ZNodeStart,
    ZNodeUrl,
    ZEmpty,
    ZCodeNode,
    ZGroup,
    ZFile
])

/// output node
export type ONode = z.output<typeof NodeVariant>

/** parse without finalizing .fn yet  - only do a pure zod transform */
export const preParseNode = (input: z.input<typeof NodeVariant>, context: ExecutionContext) => {
    try {
        return  NodeVariant.parse(input)
    } catch (e) {
        throw new Error('failed to parse a node')
    }
}

