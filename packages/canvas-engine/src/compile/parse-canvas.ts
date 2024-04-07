import path from "node:path"
import {ONode, preParseNode} from "./canvas-node-transform"
import {readFile} from "fs/promises"
import {GenericNode, GroupNode, JSONCanvas, LinkNode, TextNode} from '@trbn/jsoncanvas'
import {GlobalContext, ParsedCanvas} from "../types"
import {visit} from 'unist-util-visit'

import {logger} from "../globals"
import {ZEdge} from "./canvas-edge-transform"
import {parseMd} from "./md-parse"
import {ExecutionContext} from "./types"
import code_node_compilers from "../node_library"
import {loadFileNode} from "./file-loader"

/** @trbn/jsoncanvas types are not complete - these are:  */
export type JSONCanvasNode = (LinkNode | TextNode | GenericNode & {
    type: 'file'
    file: string
} | (GenericNode & GroupNode)) & {
    color?: undefined
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

    const magic_words = code_node_compilers.filter(c => c.magic_word).map(c => c.lang)
    const magic_word_regex = new RegExp(`^(\\s*[_*]+(${magic_words.join('|')}):?[_*]+:?\\s*).+`, 'i')
    for (const cnode of canvas_data.getNodes() as JSONCanvasNode[]) {
        let onode: ONode | undefined = undefined


        // some canvas nodes can be directly transformed
        // e.g. link, file, and some text nodes
        onode = preParseNode(cnode as any, context)

        if (onode.type === 'file') {
            const loaded_node = await loadFileNode(onode, context, config)
            if (loaded_node.type === 'text') {
                onode = preParseNode({
                    type: 'text',
                    id: loaded_node.id,
                    text: loaded_node.code
                }, context)
                onode.original = cnode
                // text nodes will be treated as in the next step
            } else {
                // canvas node goes through here
                onode = loaded_node
            }
        }


        if (onode && onode.type === 'text') { // obsidian will treat all text as markdown
            const magic_word_check = onode.code.match(magic_word_regex)
            if (magic_word_check) {
                const magic_word = magic_word_check[2].toLowerCase()
                const text = onode.code.substring(magic_word_check[1].length)

                logger.debug('magic word:', magic_word, 'text:', text)

                for (const comp of code_node_compilers) {
                    if (comp.magic_word && comp.lang === magic_word) {
                        onode = preParseNode({
                            type: 'code',
                            id: cnode.id,
                            lang: magic_word,
                            value: text
                        }, context)
                        break
                    }
                }
            } else {
                const md_html = parseMd(onode.code)
                let found_code = false
                // grab the first code block
                visit(md_html, 'code', (md_node, index, parent) => {
                    if (!found_code && md_node.type === 'code') {
                        //console.log('parsing code node: ', first_child)
                        onode = preParseNode({
                                ...md_node,
                                id: cnode.id
                            } as any // zod ensures a strict validation or will throw
                            , context)
                        found_code = true
                    }
                })
            }
        }


        if (onode?.type === 'code') {
            for (const comp of code_node_compilers) {
                if (comp.lang === onode.lang) {
                    onode.fn = await comp.compile(onode.code, context)
                    onode.compiler = comp
                    break
                }
            }
            if (!onode.fn) {
                logger.error(`no compiler found for ${onode.lang} node:`, onode.code)
            }
        }

        if (!onode) {
            logger.debug('ignoring node:', cnode)
            onode = {
                id: cnode.id,
                fn: (ctx) => ctx.input,
                type: 'text',
                code: cnode.type === 'text' ? cnode.text : '',
                edges: [],
                original: cnode,
                comment: 'this node is not executable'
            }
        }

        onode.original = cnode


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
    }
    return onode_data
}
