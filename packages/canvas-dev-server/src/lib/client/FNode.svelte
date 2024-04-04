<script lang="ts">
    import {Handle, type NodeProps, Position, type Node} from '@xyflow/svelte';
    import type {ONode} from "canvas-engine/src/compile/canvas-node-transform"
    import {mdToHtml} from "$lib/md-to-html"
    import {color} from "$lib/color"
    import Color from "color"


    //export let data: ONode;


    type $$Props = NodeProps<Node<ONode>>;

    export let id: $$Props['id'];
    id;
    export let data: ONode;
    export let dragHandle: $$Props['dragHandle'] = undefined;
    dragHandle;
    export let type: $$Props['type'] = undefined;
    type;
    export let selected: $$Props['selected'] = undefined;
    selected;
    export let isConnectable: $$Props['isConnectable'] = false;
    isConnectable;
    export let zIndex: $$Props['zIndex'] = undefined;
    zIndex;
    export let width: $$Props['width'] = undefined;
    width;
    export let height: $$Props['height'] = undefined;
    height;
    export let dragging: $$Props['dragging'];
    dragging;
    export let targetPosition: $$Props['targetPosition'] = undefined;
    targetPosition;
    export let sourcePosition: $$Props['sourcePosition'] = undefined;
    sourcePosition;
    export let positionAbsoluteX: any;
    export let positionAbsoluteY: any;


    $: Intededwidth = `${data.original.width}px`;
    $: Intededheight = `${data.original.height}px`;


    let text: string = ''

    $: {
        const onode = data.original

        if (onode.type === 'text') {
            text = mdToHtml(onode.text)
            console.log('text', text)
        }
    }


</script>

<div
    style:width={Intededwidth}
    style:height={Intededheight}
    class="border-2 border-gray rounded-lg bg-white overflow-y-auto"
    style:border-color={color(data.original.color)}
    style:background-color={Color(color(data.original.color)).lighten(0.74).hex()}
>

    <div class="prose p-4 whitespace-pre-wrap">

        {@html text}
    </div>

    <Handle type="source" style="opacity: 0;" id={`${id}-top-source`} position={Position.Top}/>
    <Handle type="source" style="opacity: 0;"  id={`${id}-right-source`} position={Position.Right}/>
    <Handle type="source" style="opacity: 0;"  id={`${id}-bottom-source`} position={Position.Bottom}/>
    <Handle type="source" style="opacity: 0;"  id={`${id}-left-source`} position={Position.Left}/>

    <Handle type="target" style="opacity: 0;"  id={`${id}-top-target`} position={Position.Top}/>
    <Handle type="target" style="opacity: 0;"  id={`${id}-right-target`} position={Position.Right}/>
    <Handle type="target" style="opacity: 0;"  id={`${id}-bottom-target`} position={Position.Bottom}/>
    <Handle type="target" style="opacity: 0;"  id={`${id}-left-target`} position={Position.Left}/>
</div>
