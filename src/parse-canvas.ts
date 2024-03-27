import {parseDual} from "./md-parse"
import {type TransformedAstNode} from "./md-parse/NodeType"
import path from "node:path"
import {writeFileSync} from "node:fs"
import {CNode, ExecutionContext, parseNode, ZEdge} from "./node/types"
import {readFile} from "fs/promises"
import {GenericNode, GroupNode, JSONCanvas, LinkNode, TextNode} from '@trbn/jsoncanvas'
import {Fn} from "./node/code_to_fn"
import {GlobalContext} from "./globals"

/** @trbn/jsoncanvas types are not complete - these are:  */
type JSONCanvasNode = LinkNode | TextNode | GenericNode & {
    type: 'file'
    file: string
} | GroupNode & {
    id: string
}

/** Parsed / Compiled canvas - ready for execution */
export type ParsedCanvas = Map<string, CNode>


export async function parseCanvas(canvas_path: string, config: GlobalContext): Promise<ParsedCanvas> {
    let canvas_path_full = path.join(config.vault_dir, canvas_path)
    let file_contents = await readFile(canvas_path_full, 'utf8')
    const canvas_data = JSONCanvas.fromString(file_contents)

    const context: ExecutionContext = {
        vault_dir: config.vault_dir,
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
                    //console.log('parsing code node: ', first_child)
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
            //console.log('node with edges: ', node_with_edges)
        }

        if (node.type === 'file') {
            node.fn = ((ctx, input) => {


                const content = typeof input === 'object' ? JSON.stringify(input, null, 2) : input
                const target_path = path.join(config.vault_dir, node.file)
                console.log('writing file: ', target_path, content)
                writeFileSync(target_path, content)
                return input
            }) satisfies Fn
        }
    }
    return node_data
}
