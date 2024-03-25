import {z} from 'zod'
import {Fn, js_to_fn} from "./code_to_fn"
import {ts_to_js} from "./ts_to_js"
import {yaml_to_fn} from "./yaml_to_fn"


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

    console.log('zdirection: ', direction, v.fromEnd, v.toEnd, v)
    return {
        'type': 'arrow',
        from: v.fromNode,
        to: v.toNode,
        label: v.label,
        direction
    }
})

export const ZBaseNode = z.object({
    id: z.string(),
    edges: z.array(ZEdge).default([]),
    fn: z.function().optional().default((() => {
    }) as any).transform(((ctx, input) => input) satisfies Fn),
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
        type: 'start' as const,
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
}).strip().transform(async (v) => {

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


export const parseNode = async (input: any, context: ExecutionContext) => {
    let obj = input
    if (typeof input === 'string') {
        try {
            obj = JSON.parse(input)
        } catch (e) {
            // do nothing
        }
    }
    const node = await NodeVariant.parseAsync(obj)


    if (node.type === 'code') {
        let fn: Fn
        if (node.lang === 'dataview') {
            fn = (ctx, input) => {
                return input
            }
        } else if (node.lang === 'yaml') {
            fn = yaml_to_fn(node.code, context)
        } else {
            let js_code = node.code
            if (node.lang === 'ts') {
                js_code = await ts_to_js(node.code)
            }
            fn = js_to_fn(js_code)
        }
        node.fn = fn
    }


    return node
}

export type CNode = z.output<typeof NodeVariant>