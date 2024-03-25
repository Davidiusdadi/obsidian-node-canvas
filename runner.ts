import yargs from 'yargs';
import {hideBin} from "yargs/helpers"
import {readFile} from "fs/promises"
import {GenericNode, GroupNode, JSONCanvas, LinkNode, TextNode} from '@trbn/jsoncanvas'
import {CNode, ExecutionContext, parseNode, ZEdge} from "./node/types"
import {parseDual} from "./md-parse"
import {type TransformedAstNode} from "./md-parse/NodeType"
import path from "node:path"
import {writeFileSync} from "node:fs"
import {CTX, Fn} from "./node/code_to_fn"
import z from "zod"


type JSONCanvasNode = LinkNode | TextNode | GenericNode & {
    type: 'file'
    file: string
} | GroupNode & {
    id: string
}


const args = yargs(hideBin(process.argv))
    .option('vault', {
        type: 'string',
        demandOption: true,
    })
    .option('canvas', {
        type: 'string',
        demandOption: true,
    }).parseSync()

const canvas_path = args.canvas
const vault_dir = args.vault

async function parseCanvas(): Promise<Map<string, CNode>> {
    let canvas_path_full = path.join(vault_dir, canvas_path)
    let file_contents = await readFile(canvas_path_full, 'utf8')
    const canvas_data = JSONCanvas.fromString(file_contents)

    const context: ExecutionContext = {
        vault_dir: vault_dir,
        canvas_path: canvas_path_full
    }

    const node_data = new Map<string, CNode>()

    for (const node of canvas_data.getNodes() as JSONCanvasNode[]) {
        let node_value: CNode | undefined = undefined

        try {
            // first try direct parse
            node_value = await parseNode(node, context)
        } catch (e) {
            if (node.type === 'text') {
                // fallback to md-html parsing
                const md_html = parseDual(node.text) as TransformedAstNode
                const first_child = md_html.children?.[0]

                if (first_child?.type === 'code') {
                    console.log('parsing code node: ', first_child)
                    node_value = await parseNode({
                        ...first_child,
                        id: node.id
                    }, context)
                } else {
                    throw new Error(`invalid ast ${first_child?.type} -- not code ; see: ${JSON.stringify(node, null, 2)}`)
                }
            }

        }

        if (node_value) {
            node_data.set(node.id, node_value)
        }
    }

    const all_edges = canvas_data.getEdges().map((edge) => {
        return ZEdge.parse(edge)
    })

    for (const node of node_data.values()) {
        const node_edges = all_edges.filter(e => {
            return e.from === node.id || e.to === node.id
        })

        const node_with_edges = node as Extract<typeof node, { edges: any }>
        if (node_with_edges.edges !== undefined) {
            node_with_edges.edges = node_edges
            console.log('node with edges: ', node_with_edges)
        }

        if (node.type === 'file') {
            node.fn = ((ctx, input) => {


                const content = typeof input === 'object' ? JSON.stringify(input, null, 2) : input
                const target_path = path.join(vault_dir, node.file)
                console.log('writing file: ', target_path, content)
                writeFileSync(target_path, content)
                return input
            }) satisfies Fn
        }
    }
    return node_data
}


(async () => {
    const node_data = await parseCanvas()

    console.log('node data: ', node_data.values())

    const instr = [...node_data.values()]
    const start = instr.find(ins => ins.type === 'start')
    if (!start) {
        throw new Error('no start node found')
    }


    const stack: { node: CNode, input: any }[] = [{
        node: start,
        input: undefined
    }]

    const ctx: CTX = {
        emit: () => undefined,
        input: undefined
    }

    const stack_push = (edges: z.output<typeof ZEdge>[], value: any, back=false) => {
        const insert = edges.map(e => {
            const node = node_data.get(e.to)!
            return {
                node: node,
                input: value
            }
        })
        if(back) {
            stack.push(...insert)
        } else {
            stack.unshift(...insert)
        }

    }

    while (true) {
        let return_value: any | undefined | null
        const frame = stack.shift()
        if (!frame) {
            break
        }

        const {node, input} = frame

        console.log('executing node: ', node)


        const edges_default_out = node.edges.filter((edge) => {
            return edge.direction === 'forward' && edge.from === node.id && (edge.label?.trim() || '').length === 0
        })



        if (node.type === 'start') {
            console.log('start node')
        } else if (node.fn) {
            ctx.input = input
            ctx.emit = (label: string, emission: any) => {
                console.log('emitting: ', label)
                const edges_label_out = node.edges.filter((edge) => {
                    return edge.direction === 'forward' && edge.from === node.id && edge.label?.trim() === label
                })

                stack_push(edges_label_out, emission)
            }
            return_value = await node.fn(ctx, input)
        }


        if (node.fn) {
            stack_push(edges_default_out, return_value)
        }


    }
    console.log('execution complete')
})()


