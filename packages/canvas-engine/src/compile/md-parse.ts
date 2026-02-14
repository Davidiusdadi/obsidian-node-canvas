import {unified, Processor} from "unified"
import remarkParse from "remark-parse"
import type {Root} from 'mdast'

export let processor_md: Processor<Root, undefined, undefined, undefined, undefined> = unified()
    .use(remarkParse, {gfm: true})

/** @returns ast */
export function parseMd(content: string): Root {
    return processor_md.parse(content)
}