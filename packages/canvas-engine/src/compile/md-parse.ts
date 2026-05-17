import {unified} from "unified"
import remarkParse from "remark-parse"
import type {Root} from "mdast"

// `processor_md` is internal (used only by parseMd below). Keeping it
// non-exported avoids TS2742: when this package is consumed via a pnpm
// workspace symlink, tsc can't write a portable type for the exported
// Processor<Root,...> — `.pnpm/@types+mdast@.../...` isn't portable.
// parseMd is explicitly annotated with `Root` (imported by name), which
// gives tsc a portable reference for the emitted .d.ts.
const processor_md = unified()
    .use(remarkParse, {gfm: true})

/** @returns ast */
export function parseMd(content: string): Root {
    return processor_md.parse(content) as Root
}