/**
 * Defines canvas node transformations via zod.
 */
import {z} from 'zod'
import {ZEdge} from "./canvas-edge-transform"
import {Fn} from "../runtime/runtime-types"


export interface ExecutionContext {
    vault_dir: string
    canvas_path: string
}


const ZBaseNode = z.object({
    id: z.string(),
    edges: z.array(ZEdge).default([]),
    fn: z.undefined().optional()
        .transform((fn) => {
            return ((ctx, input) => input) satisfies Fn
        }),
})

const ZNodeStart = ZBaseNode.extend({
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

const ZCodeNode = ZBaseNode.extend({
    type: z.literal('code'),
    lang: z.string().default(''),
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

const ZNodeUrl = ZBaseNode.extend({
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

const ZEmpty = ZBaseNode.extend({
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


const ZGroup = ZBaseNode.extend({
    id: z.string(),
    type: z.literal('group'),

}).strip().transform((v) => {
    return {
        ...v
    }
})


const ZFile = ZBaseNode.extend({
    type: z.literal('file'),
    file: z.string(),
}).strip()


export const NodeVariant = z.union([
    ZNodeStart,
    ZNodeUrl,
    ZEmpty,
    ZCodeNode,
    ZGroup,
    ZFile
])

/// output node - aka instance of canvas node the final format used in the runtime
export type ONode = z.output<typeof NodeVariant>

/** parse without finalizing .fn yet  - only do a pure zod transform */
export const preParseNode = (input: z.input<typeof NodeVariant>, context: ExecutionContext) => {
    try {
        return NodeVariant.parse(input)
    } catch (e) {
        throw new Error('failed to parse a node')
    }
}

