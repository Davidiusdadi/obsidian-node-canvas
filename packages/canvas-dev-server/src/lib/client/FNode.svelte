<script lang="ts">
    import {Handle, type NodeProps, Position} from '@xyflow/svelte';
    import type {ONode} from "canvas-engine/src/compile/canvas-node-transform"
    import type {FNode} from "$lib/store"
    import {mdToHtml} from "$lib/md-to-html"


    //export let data: ONode;


    type $$Props = NodeProps<FNode>;

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
    style:maxWidth={Intededwidth}
    style:maxHeight={Intededheight}
    style="background: whitesmoke; overflow: hidden"
>

       {@html text}



    <Handle type="target" position={Position.Left}/>
    <Handle type="source" id={`${id}-top-source`} position={Position.Top}/>
    <Handle type="source" id={`${id}-right-source`} position={Position.Right}/>
    <Handle type="source" id={`${id}-bottom-source`} position={Position.Bottom}/>
    <Handle type="source" id={`${id}-left-source`} position={Position.Left}/>

    <Handle type="target" id={`${id}-top-target`} position={Position.Top}/>
    <Handle type="target" id={`${id}-right-target`} position={Position.Right}/>
    <Handle type="target" id={`${id}-bottom-target`} position={Position.Bottom}/>
    <Handle type="target" id={`${id}-left-target`} position={Position.Left}/>
</div>
