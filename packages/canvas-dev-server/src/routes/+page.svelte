<script lang="ts">

    import { SvelteFlow, Background, Controls } from '@xyflow/svelte';

    import '@xyflow/svelte/dist/style.css';

    import {nodes, edges} from '$lib/store';
    import FNode from "$lib/client/FNode.svelte"

    export const nodeTypes = {
        'FNode': FNode
    } as any

</script>

<main>
    <SvelteFlow {nodeTypes} {nodes} {edges}>
        <Background />
        <Controls />
    </SvelteFlow>
</main>

<style>
    main {
        height: 100vh;
    }
</style>
