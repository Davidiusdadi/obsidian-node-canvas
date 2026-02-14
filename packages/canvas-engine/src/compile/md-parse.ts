import {unified} from "unified"
import remarkParse from "remark-parse"

export let processor_md = unified()
    .use(remarkParse, {gfm: true})

/** @returns ast */
export function parseMd(content: string) {
    return processor_md.parse(content)
}