import { derived, get, writable } from 'svelte/store'
import { browser } from '$app/environment'
import _ from 'lodash'
import type { ONode } from 'canvas-engine/src/compile/canvas-node-transform'
import { type Edge, type Node } from '@xyflow/svelte'
import {
    type MsgInspector2Runner,
    type MsgRunner2Inspector,
    type zRFrame,
} from 'canvas-engine/src/runtime/inspection/protocol'
import * as Flatted from 'flatted'
import { canvasToFlow, rawCanvasToFlow } from '$lib/canvas-to-flow'

// ── Viewer state ────────────────────────────────────────────────────────────

export const viewer_vault = writable<string>(
    browser ? (localStorage.getItem('viewer_vault') ?? '') : ''
)

if (browser) {
    viewer_vault.subscribe((v) => localStorage.setItem('viewer_vault', v))
}

export const viewer_files = writable<string[]>([])

export async function loadVaultFiles(vaultPath?: string) {
    const params = vaultPath ? `?vault=${encodeURIComponent(vaultPath)}` : ''
    const res = await fetch(`/api/vault${params}`)
    if (!res.ok) return
    const data = await res.json()
    viewer_files.set(data.files ?? [])
    if (data.vault) viewer_vault.set(data.vault)
}

export async function loadViewerCanvas(relativePath: string) {
    const res = await fetch(`/api/vault/canvas?path=${encodeURIComponent(relativePath)}`)
    if (!res.ok) return
    const canvasJson = await res.json()
    const { nodes: new_nodes, edges: new_edges } = rawCanvasToFlow(canvasJson)

    charts.update((cs) => {
        const existing = cs.findIndex((c) => c.path === relativePath)
        if (existing === -1) {
            cs.push({ nodes: new_nodes, edges: new_edges, path: relativePath })
        } else {
            cs.splice(existing, 1, { nodes: new_nodes, edges: new_edges, path: relativePath })
        }
        return cs
    })

    chart_path.set(relativePath)
}

// ── Chart / graph state ─────────────────────────────────────────────────────

export const chart_path = writable<string>('')

type Chart = {
    nodes: Node<ONode>[]
    edges: Edge[]
    path: string
}

const charts = writable<Chart[]>([])

export const chart_list = derived(charts, ($charts) => $charts.map((c) => c.path))

export const nodes = writable<Node<ONode>[]>([])
export const edges = writable<Edge[]>([])

derived([charts, chart_path], (both) => both).subscribe(([cs, path]) => {
    const c = (cs as Chart[]).find((c) => c.path === path)
    if (c) {
        nodes.set(c.nodes)
        edges.set(c.edges)
    }
})

// ── Inspector / debug state ─────────────────────────────────────────────────

export const stack = writable<zRFrame[]>([])
export const this_step_frame = writable<zRFrame | null>(null)
export const messages = writable<MsgRunner2Inspector[]>([])
export const last_message = writable<MsgRunner2Inspector>()
export const ws_connected = writable<boolean>(false)
export const engine_canvas_path = writable<string>('')

// ── WebSocket ───────────────────────────────────────────────────────────────

let ws: WebSocket

export const sendToRunner = (msg: MsgInspector2Runner) => {
    console.log('Sending:', msg)
    ws.send(Flatted.stringify(msg))
}

function startClient() {
    ws = new WebSocket('ws://localhost:9763')

    ws.onopen = () => {
        console.log('Connected to server')
        ws_connected.set(true)
    }

    ws.onclose = () => {
        console.log('Disconnected from server')
        ws_connected.set(false)
        // Attempt reconnect after 3 s
        setTimeout(startClient, 3000)
    }

    ws.onerror = (event) => {
        console.log('Websocket Error:', event)
    }

    ws.onmessage = (event) => {
        const data: MsgRunner2Inspector = Flatted.parse(event.data)
        console.log('Received:', data)
        last_message.set(data)

        if (data.type === 'canvas') {
            const { nodes: new_nodes, edges: new_edges } = canvasToFlow(data.canvas.nodes)

            charts.update((cs) => {
                const existing = cs.findIndex((c) => c.path === data.canvas.file)
                if (existing === -1) {
                    cs.push({ nodes: new_nodes, edges: new_edges, path: data.canvas.file })
                } else {
                    cs.splice(existing, 1, {
                        nodes: new_nodes,
                        edges: new_edges,
                        path: data.canvas.file,
                    })
                }
                return cs
            })

            if (data.is_start_canvas) engine_canvas_path.set(data.canvas.file)

            chart_path.update((p) => {
                if (p) return p
                if (data.is_start_canvas) return data.canvas.file
                return p
            })

            console.log('edges:', new_edges)
            return
        }

        if (data.type === 'frame-upsert') {
            stack.update((s) => [...s.filter((f) => f.id !== data.frame.id), data.frame])
        } else if (data.type === 'frame-complete') {
            stack.update((s) => s.filter((f) => f.id !== data.frame_id))
        } else if (data.type === 'runner-state') {
            console.log('Runner state:', data.state)
        } else if (data.type === 'frame-step') {
            this_step_frame.set(get(stack).find((f) => f.id === data.frame_id) || null)
        } else {
            messages.update((s) => [...s, data])
        }
    }
}

if (browser) {
    startClient()
    loadVaultFiles()
}
