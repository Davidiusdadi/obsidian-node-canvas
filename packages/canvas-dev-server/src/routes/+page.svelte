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
    import {color} from "$lib/color"
    import Color from "color"
    import Icon from "@iconify/svelte"
    import _ from 'lodash'
    import { Pane, Splitpanes } from 'svelte-splitpanes';
    import {mdToHtml} from "$lib/md-to-html"
    import { Tabs } from '@skeletonlabs/skeleton-svelte';

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

                <div class="flex flex-col">
                    <Tabs defaultValue="definition">
                        <Tabs.List>
                            <Tabs.Trigger value="definition">Definition</Tabs.Trigger>
                            <Tabs.Trigger value="logs">Logs</Tabs.Trigger>
                            <Tabs.Trigger value="input">Input</Tabs.Trigger>
                            <Tabs.Trigger value="files">Files</Tabs.Trigger>
                            <Tabs.Indicator />
                        </Tabs.List>

                        <Tabs.Content value="definition">
                            <div class="p-4">
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
                            </div>
                        </Tabs.Content>

                        <Tabs.Content value="logs">
                            <div class="p-4">
                                {#each $messages as msg}
                                    {#if msg.type === 'llm-chunk'}
                                        <span>{msg.chunk}</span>
                                    {/if}
                                {/each}
                            </div>
                        </Tabs.Content>

                        <Tabs.Content value="input">
                            <div class="p-4">
                                <h3>Input</h3>
                                {@html mdToHtml(`\`\`\`yaml\n${yaml.dump($this_step_frame?.input, {indent: 2})}\n\`\`\``)}

                                <h3>State</h3>
                                {@html mdToHtml(`\`\`\`yaml\n${yaml.dump($this_step_frame?.state, {indent: 2})}\n\`\`\``)}
                            </div>
                        </Tabs.Content>

                        <Tabs.Content value="files">
                            <div class="p-4">
                                <ul>
                                    {#each $chart_list as file}
                                        <li on:click={() => chart_path.set(file) }
                                        class:font-bold={file === $chart_path}
                                        >{file}</li>
                                    {/each}
                                </ul>
                            </div>
                        </Tabs.Content>
                    </Tabs>
                </div>
            </div>
        </Pane>


    </Splitpanes>
</main>

<style>
    main {
        height: 100vh;
    }
</style>
