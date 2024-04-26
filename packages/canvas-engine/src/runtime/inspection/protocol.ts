import type {ExecutableCanvas} from "../ExecutableCanvas"
import {z} from "zod"
import { zStackFrame} from "../runtime-types"
import {zz} from "../helper"




const zFrame = zStackFrame.transform((f) => {
    // strip all the deep local state
    return {
        ...f,
        node: f.node.id,
        chart: f.chart.file,
        ctx: undefined
    }
})

export type zRFrame = z.output<typeof zFrame>


const zRCanvas = z.object({
    type: z.literal('canvas'),
    canvas: zz<ExecutableCanvas>(),
    is_start_canvas: z.boolean().optional()
})

export const zRFrameNew = z.object({
    type: z.literal('frame-upsert'),
    frame: zFrame
})

export const zRFrameComplete = z.object({
    type: z.literal('frame-complete'),
    frame_id: z.number()
})

export const zRFrameStep = z.object({
    type: z.literal('frame-step'),
    frame_id: z.number()
})


export const zRLLMChunk = z.object({
    type: z.literal('llm-chunk'),
    chunk: z.string(),
    frame_id: z.number().optional()
})

export const zRLog = z.object({
    type: z.literal('log'),
    content: z.string(),
    frame_id: z.number().optional()
})

export const zRUpdate = z.union([zRLLMChunk, zRLog])

const zRRunnerState = z.object({
    type: z.literal('runner-state'),
    state: z.enum(['stepping', 'running'])
})

export type RRunnerState = z.output<typeof zRRunnerState>


const zIDebugAction = z.object({
    type: z.literal('debug-action'),
    action: z.enum(['step', 'fast-forward'])
})



export type DMsgCanvas = z.infer<typeof zRCanvas>


export const runner2inspector = z.union([
    zRCanvas,
    zRFrameNew,
    zRFrameComplete,
    zRFrameStep,
    zRRunnerState,
    zRUpdate
])

export const inspector2runner = zIDebugAction

export type MsgRunner2Inspector = z.output<typeof runner2inspector>
export type MsgInspector2Runner = z.output<typeof inspector2runner>