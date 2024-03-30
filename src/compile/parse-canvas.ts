import {parseMd} from "./md-parse"
import path from "node:path"
import {writeFileSync} from "node:fs"
import {ExecutionContext, ONode, preParseNode, ZEdge} from "./node/node-transform"
import {readFile} from "fs/promises"
import {GenericNode, GroupNode, JSONCanvas, LinkNode, TextNode} from '@trbn/jsoncanvas'
import {Fn, js_to_fn} from "./node/code_to_fn"
import {GlobalContext, ParsedCanvas} from "../types"
import {visit} from 'unist-util-visit'
import {yaml_to_fn} from "./node/yaml_to_fn"
import {ts_to_js} from "./node/ts_to_js"
import {logger} from "../globals"

/** @trbn/jsoncanvas types are not complete - these are:  */
type JSONCanvasNode = LinkNode | TextNode | GenericNode & {
    type: 'file'
    file: string
} | GroupNode & {
    id: string
}

/**
 * - parse a canvas file (cnodes)
 * - go from cnode to onode (out-nodes)
 * - finalize onode.fn
 * - assign onode.edges
 **/
export async function parseCanvas(canvas_path: string, config: GlobalContext): Promise<ParsedCanvas> {
    let canvas_path_full = path.join(config.vault_dir, canvas_path)
    let file_contents = await readFile(canvas_path_full, 'utf8')
    const canvas_data = JSONCanvas.fromString(file_contents)

    const context: ExecutionContext = {
        vault_dir: config.vault_dir,
        canvas_path: canvas_path_full
    }

    const onode_data = new Map<string, ONode>()


    for (const cnode of canvas_data.getNodes() as JSONCanvasNode[]) {
        let onode: ONode | undefined = undefined

        try {
            // some canvas nodes can be directly transformed
            // e.g. link, file, and some text nodes
            onode = preParseNode(cnode, context)
        } catch (e) {
            // extract the specific node type from the markdown ast
            if (cnode.type === 'text') { // obsidian will treat all text as markdown
                const md_html = parseMd(cnode.text)

                // grab the first code block
                visit(md_html, 'code', (md_node, index, parent) => {
                    if (!onode && md_node.type === 'code') {
                        //console.log('parsing code node: ', first_child)
                        onode = preParseNode({
                                ...md_node,
                                id: cnode.id
                            } as any // zod ensures a strict validation or will throw
                            , context)
                    }
                })


            }
        }


        if (onode?.type === 'code') {
            let fn: Fn
            if (onode.lang === 'dataview') {
                fn = (ctx, input) => {
                    return input
                }
            } else if (onode.lang === 'yaml') {
                fn = yaml_to_fn(onode.code, context)
            } else {
                let js_code = onode.code
                if (onode.lang === 'ts') {
                    js_code = await ts_to_js(onode.code)
                }
                fn = js_to_fn(js_code)
            }
            onode.fn = fn
        }

        if (!onode) {
            logger.debug('ignoring node:', cnode)
            onode = {
                id: cnode.id,
                fn: (ctx, input) => input,
                type: 'noop',
                edges: []
            }
        }


        onode_data.set(cnode.id, onode)

    }

    const all_edges = canvas_data.getEdges().map((edge) => {
        return ZEdge.parse(edge)
    })

    for (const node of onode_data.values()) {
        const node_edges = all_edges.filter(e => {
            return e.from === node.id || e.to === node.id
        })

        const node_with_edges = node as Extract<typeof node, { edges: any }>
        if (node_with_edges.edges !== undefined) {
            node_with_edges.edges = node_edges
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
    return onode_data
}
