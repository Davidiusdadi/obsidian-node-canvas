/**
 * Defines canvas node transformations via zod.
 */
import {z} from 'zod'
import {ZEdge} from "./canvas-edge-transform"
import {Fn} from "../runtime/runtime-types"

import {ExecutionContext} from "./types"
import {NodeCompiler} from "./template"
import {JSONCanvasNode} from "./parse-canvas"
import {ExecutableCanvas} from "../runtime/ExecutableCanvas"
import _ from "lodash"


type Placement = JSONCanvasNode

export const node_non_unique_fields = [
    'id', 'x', 'y', 'color', 'width', 'height'
]

const ZBaseNode = z.object({
    id: z.string(),
    edges: z.array(ZEdge).default([]),
    fn: z.undefined().optional()
        .transform((fn) => {
            return ((ctx) => ctx.input) satisfies Fn
        }),
    comment: z.string().optional()

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
        comment: v.comment,
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
        comment: v.comment,
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
        comment: v.comment,
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
        comment: v.comment,
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
        comment: v.comment,
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
        comment: v.comment,
        fn: v.fn,
        original: v as any as Placement,
        canvas:  undefined as ExecutableCanvas | undefined
    }
})


export type ONodeFile = z.output<typeof ZFile> | z.output<typeof ZText>

export const NodeVariant = z.union([
    ZNodeStart,
    ZNodeUrl,
    ZText,
    ZCodeNode,
    ZGroup,
    ZFile
]).transform((v) => {
    return v
} )

/// output node - aka instance of canvas node the final format used in the runtime
export type ONode = z.output<typeof NodeVariant>

export type RuntimeONode<T extends object = {}> = ONode & {
    fn_original?: Fn
} & T

/** parse without finalizing .fn yet  - only do a pure zod transform */
export const preParseNode = (input: z.input<typeof NodeVariant>, context: ExecutionContext) => {
    try {
        return NodeVariant.parse(input)
    } catch (e) {
        throw new Error('failed to parse a node')
    }
}

