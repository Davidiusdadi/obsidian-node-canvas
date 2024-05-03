<script lang="ts">
    import type {ONode} from "canvas-engine/src/compile/canvas-node-transform"
    import {mdToHtml} from "$lib/md-to-html"

    export let node: ONode

    let html: string

    $: {
        const onode = node.original

        if (onode.type === 'text') {
            html = mdToHtml(onode.text)
        } else if (onode.type === 'file') {
            const file_name = onode.file.match(/(.+\/)?([^/]+?\..+)$/)
            html = `<div class="flex items-center justify-center">
<div>
<b class="text-orange-600">file-ref</b>
<code>${file_name?.[2]}</code>
in <span class="opacity-50">
    <code>${file_name?.[1]}</code>
</span>
</div>
</div>`
        } else if (onode.type === 'group') {
            html = `
            <div class="absolute top-[-1.5em]">${onode.label}</div>
            `
        } else {
            html = onode.type
        }
    }
</script>


<div class="prose p-3.5 whitespace-wrap">
    {@html html}
</div>