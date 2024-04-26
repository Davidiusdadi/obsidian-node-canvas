<script lang="ts">

    import {Background, Controls, type FitViewOptions, MiniMap, type Node, SvelteFlow} from '@xyflow/svelte';
    import '@xyflow/svelte/dist/style.css';
    import yaml from 'js-yaml';

    import {
        chart_list,
        chart_path,
        edges,
        last_message,
        messages,
        nodes,
        sendToRunner,
        stack,
        this_step_frame
    } from '$lib/store';
    import FNode from "$lib/client/FNode.svelte"
    import {get} from "svelte/store"
    import type {ONode} from "canvas-engine/src/compile/canvas-node-transform"
    import NodeContent from "$lib/client/NodeContent.svelte"
    import {Tab, TabGroup} from "@skeletonlabs/skeleton"
    import {color} from "$lib/color"
    import Color from "color"
    import Icon from "@iconify/svelte"
    import _ from 'lodash'
    import { Pane, Splitpanes } from 'svelte-splitpanes';
    import {mdToHtml} from "$lib/md-to-html"

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


    let tabSet: number = 1;
    let selectedNode: Node<ONode> | null = null
    const nodeclick = (e: CustomEvent<{ event: MouseEvent | TouchEvent; node: Node<ONode> }>) => {
        selectedNode = e.detail.node
        console.log(selectedNode)
    }


    function debug_action_play() {
        sendToRunner({
            type: 'debug-action',
            action: 'fast-forward'
        })
    }

</script>

<main class="flex bg-surface-100">
    <Splitpanes style="height: 100vh" >
        <Pane minSize={20}>

            <SvelteFlow
                {nodeTypes}
                {nodes}
                {edges}
                fitView={true}
                {fitViewOptions}

                on:nodeclick={nodeclick}
            >
                <Background patternColor="#aaa" gap={16}/>
                <Controls/>
                <MiniMap zoomable pannable height={120}/>
            </SvelteFlow>
        </Pane>
        <Pane>
            <div class="w-[500px] origin-top-left">

                <div class="absolute left-1.5 top-1.5">
                    <div class="btn-group variant-filled">
                        <!--
                                   <button> <Icon icon="material-symbols:fast-forward-rounded" /></button>
                                   <button> <Icon icon="material-symbols:pause" /></button>-->
                        <button
                            on:click={() =>  sendToRunner({
                        type: 'debug-action',
                        action: 'fast-forward'
                    })}
                        >
                            <Icon icon="mdi:play"/>
                        </button>
                        <button
                            on:click={() =>  sendToRunner({
                        type: 'debug-action',
                        action: 'step'
                    })}
                        >
                            <Icon icon="material-symbols:step-over-rounded"/>
                        </button>
                    </div>
                </div>

                <TabGroup>
                    <Tab bind:group={tabSet} name="tab2" value={1}>Definition</Tab>
                    <Tab bind:group={tabSet} name="tab3" value={2}>Logs</Tab>
                    <Tab bind:group={tabSet} name="tab3" value={3}>Input</Tab>
                    <Tab bind:group={tabSet} name="tab3" value={4}>Files</Tab>
                    <svelte:fragment slot="panel">
                        {#if tabSet === 1}
                            {#if selectedNode}
                                {@const data = selectedNode.data}
                                <div
                                    class="border-2 border-gray rounded-lg bg-white overflow-y-auto"
                                    style:border-color={color(data.original.color)}
                                    style:background-color={Color(color(data.original.color)).lighten(0.74).hex()}
                                    style="zoom: 0.7"
                                >
                                    <NodeContent node={data }/>
                                </div>

                            {:else}
                                <p>Select a node</p>
                            {/if}
                        {:else if tabSet === 2}
                            <div class="">
                                {#each $messages as msg}
                                    {#if msg.type === 'llm-chunk'}
                                        <span>{msg.chunk}</span>
                                    {/if}
                                {/each}
                            </div>
                        {:else if tabSet === 3}
                            <h3>Input</h3>
                            {@html mdToHtml(`\`\`\`yaml\n${yaml.dump($this_step_frame?.input, {indent: 2})}\n\`\`\``)}


                        {:else if tabSet === 4}
                            <ul>
                                {#each $chart_list as file}
                                    <li on:click={() => chart_path.set(file) }
                                    class:font-bold={file === $chart_path}
                                    >{file}</li>
                                {/each}
                            </ul>
                        {/if}
                    </svelte:fragment>
                </TabGroup>
            </div>
        </Pane>


    </Splitpanes>
</main>

<style>
    main {
        height: 100vh;
    }
</style>
