

import {Plugin, unified} from "unified"
import remarkParse from "remark-parse"

let processor_md = unified()
    .use(remarkParse, {gfm: true})


export function parseDual(content: string) {
    return processor_md.parse(content)
}