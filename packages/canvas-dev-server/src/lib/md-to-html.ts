import {unified} from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypePrism from 'rehype-prism'
import rehypeStringify from 'rehype-stringify'

// you have to load css manual
//import 'prismjs/themes/prism-tomorrow.css'
import './prism-one-light.css'
//import 'prismjs/plugins/line-numbers/prism-line-numbers.css'

// load languages manual
// import 'prismjs/components/prism-{language}'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-yaml'
import 'prismjs/components/prism-bash'
import {rehype} from "rehype"

// parse markdown to html


// .processSync(/* markdown string */)

export const mdToHtml = (md: string) => {
   const ast  = unified()
        .use(remarkParse)
        .use(remarkRehype)
        // it should be after rehype
        .use(rehypePrism, {plugins: []})
        .use(rehypeStringify)
        .processSync(md).toString()

    return ast

    rehype()
        .use(rehypePrism)
        .use(rehypeStringify)
        .parse(/* html string */)
}

// parse code block in html string
// rehype()
//     .use(rehypePrism)
//     .use(rehypeStringify)
//     .parse(/* html string */)