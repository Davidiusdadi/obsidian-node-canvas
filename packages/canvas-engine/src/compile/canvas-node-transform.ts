/**
 * Defines canvas node transformations via zod.
 */
import {z} from 'zod'
import {ZEdge} from "./canvas-edge-transform"
import {Fn} from "../runtime/runtime-types"

import {ExecutionContext} from "./types"
import {NodeCompiler} from "./template"


const ZPlacement = z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number()
})

type Placement = z.output<typeof ZPlacement> & Record<string, any>

const ZBaseNode = z.object({
    id: z.string(),
    edges: z.array(ZEdge).default([]),
    fn: z.undefined().optional()
        .transform((fn) => {
            return ((ctx, input) => input) satisfies Fn
        }),

}).passthrough()

const ZNodeStart = ZBaseNode.extend({
    type: z.literal('text'),
    text: z.literal('start')
}).passthrough().transform((v) => {
    return {
        id: v.id,
        type: 'start' as const,
        edges: v.edges,
        fn: v.fn,
        original: v as any as Placement
    }
})

const ZCodeNode = ZBaseNode.extend({
    type: z.literal('code'),
    lang: z.string().default(''),
    value: z.string()
}).passthrough().transform((v) => {
    return {
        type: 'code' as const,
        id: v.id,
        edges: v.edges,
        code: v.value,
        lang: v.lang,
        fn: v.fn,
        original: v as any as Placement,
        compiler: undefined as NodeCompiler | undefined
    }
})

const ZNodeUrl = ZBaseNode.extend({
    type: z.literal('link'),
    url: z.string().url()
}).passthrough().transform((v) => {
    return {
        id: v.id,
        type: 'url' as const,
        edges: v.edges,
        fn: () => {
            return v.url
        },
        original: v as any as Placement
    }
})

const ZText = ZBaseNode.extend({
    id: z.string(),
    type: z.literal('text'),
    text: z.string().refine(s => s.trim() !== 'start')
}).passthrough().transform((v) => {
    return {
        id: v.id,
        type: 'text' as const,
        code: v.text,
        edges: v.edges,
        fn: v.fn,
        original: v as any as Placement
    }
})


const ZGroup = ZBaseNode.extend({
    id: z.string(),
    type: z.literal('group'),
}).passthrough().transform((v) => {
    return {
        id: v.id,
        type: 'group' as const,
        edges: v.edges,
        fn: v.fn,
        original: v as any as Placement,
    }
})


const ZFile = ZBaseNode.extend({
    type: z.literal('file'),
    file: z.string(),
}).passthrough().transform((v) => {
    return {
        id: v.id,
        type: 'file' as const,
        file: v.file,
        edges: v.edges,
        fn: v.fn,
        original: v as any as Placement
    }
})


export const NodeVariant = z.union([
    ZNodeStart,
    ZNodeUrl,
    ZText,
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

