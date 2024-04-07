<script lang="ts">
    // eslint-disable svelte/valid-compile

    import {Handle, type Node, type NodeProps, Position} from '@xyflow/svelte';
    import type {ONode} from "canvas-engine/src/compile/canvas-node-transform"
    import {color} from "$lib/color"
    import Color from "color"
    import NodeContent from "$lib/client/NodeContent.svelte"
    import {stack, this_step_frame} from "$lib/store"
    import Icon from "@iconify/svelte"

    type $$Props = NodeProps<Node<ONode>>;

    export let id: $$Props['id'];
    export let data: ONode;

    export let dragHandle: $$Props['dragHandle'] = undefined;
    export let type: $$Props['type'] = undefined;
    export let selected: $$Props['selected'] = undefined;
    export let isConnectable: $$Props['isConnectable'] = false;
    export let zIndex: $$Props['zIndex'] = undefined;
    export let width: $$Props['width'] = undefined;
    export let height: $$Props['height'] = undefined;
    export let dragging: $$Props['dragging'];
    export let targetPosition: $$Props['targetPosition'] = undefined;
    export let sourcePosition: $$Props['sourcePosition'] = undefined;
    export let positionAbsoluteX: any;
    export let positionAbsoluteY: any;


    $: Intededwidth = `${data.original.width}px`;
    $: Intededheight = `${data.original.height}px`;


    let on_stack = 0;
    stack.subscribe(stack => {
        on_stack = stack.filter(frame => frame.node === data.id).length
    });

    $: step_frame = $this_step_frame?.node === data.id;


</script>

<div
    style:width={Intededwidth}
    style:height={Intededheight}
    class="border-gray rounded-lg bg-white overflow-y-auto shadow-slate-300 box-content"
    style:border-color={color(data.original.color)}
    style:background-color={Color(color(data.original.color)).lighten(0.74).hex()
    }
    class:border-2={!step_frame}
    class:border-4={step_frame}
>
    <div class="absolute top-1 right-1 text-2xl" class:hidden={on_stack === 0}>
        <span
            class="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"
              class:hidden={!step_frame}>
        </span>
        <Icon icon="mdi:timer-sand-complete"/>
    </div>

    <NodeContent node={data}/>

    <Handle type="source" style="opacity: 0;" id={`${id}-top-source`} position={Position.Top}/>
    <Handle type="source" style="opacity: 0;" id={`${id}-right-source`} position={Position.Right}/>
    <Handle type="source" style="opacity: 0;" id={`${id}-bottom-source`} position={Position.Bottom}/>
    <Handle type="source" style="opacity: 0;" id={`${id}-left-source`} position={Position.Left}/>

    <Handle type="target" style="opacity: 0;" id={`${id}-top-target`} position={Position.Top}/>
    <Handle type="target" style="opacity: 0;" id={`${id}-right-target`} position={Position.Right}/>
    <Handle type="target" style="opacity: 0;" id={`${id}-bottom-target`} position={Position.Bottom}/>
    <Handle type="target" style="opacity: 0;" id={`${id}-left-target`} position={Position.Left}/>
</div>
