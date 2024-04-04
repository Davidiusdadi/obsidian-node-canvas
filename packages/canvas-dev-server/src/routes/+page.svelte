<script lang="ts">

    import {SvelteFlow, Background, Controls, MiniMap, type FitViewOptions} from '@xyflow/svelte';

    import '@xyflow/svelte/dist/style.css';

    import {nodes, edges} from '$lib/store';
    import FNode from "$lib/client/FNode.svelte"
    import {get} from "svelte/store"

    export const nodeTypes = {
        'FNode': FNode
    } as any


    $: fitViewOptions = {
        padding: 0.9,
        duration: 500,
        includeHiddenNodes: true,
        nodes: get(nodes).map(n => {
            return {
                id: n.id,
            }
        }),
    } satisfies FitViewOptions

</script>

<main>
    <SvelteFlow {nodeTypes} {nodes} {edges} fitView={true} {fitViewOptions}  >
        <Background patternColor="#aaa" gap={16} />
        <Controls />
        <MiniMap zoomable pannable height={120} />
    </SvelteFlow>
</main>

<style>
    main {
        height: 100vh;
    }
</style>
